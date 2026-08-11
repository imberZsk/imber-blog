# Python（29）- 自动化脚本

> 你在前端早就写过自动化脚本了——`node build.js` 批量压缩图片、写个 `fs` 脚本把一堆文件改名、配 `node-cron` 半夜跑构建。Python 干的是同一件事，而且因为它"自带电池"（标准库极全）、又是系统胶水语言，写这类脚本比 Node 更顺手。本篇解决三个问题：怎么用 `pathlib` 优雅地批处理文件（对标 Node 的 `path` + `fs`）；怎么调用外部命令（对标 `child_process`）；怎么让脚本定时跑起来（对标 `node-cron` / 系统 crontab）。

# 一、先建立前端锚点

写自动化脚本，你在 Node 里用过的那套，Python 几乎都有对应物：

| 你在 Node 里这么做 | Python 对应 | 干什么 |
|--------------------|-------------|--------|
| `require('path')` 拼路径 | `pathlib.Path` | 路径操作（面向对象） |
| `fs.readFileSync` / `fs.writeFile` | `Path.read_text()` / `open()` | 读写文件 |
| `fs.copyFile` / `fs.rename` / `fs-extra` | `shutil` 模块 | 复制/移动/压缩 |
| `glob` 包找文件 | `Path.glob()` / `Path.rglob()` | 通配符批量找文件 |
| `child_process.exec/spawn` | `subprocess.run()` | 调用外部命令 |
| `process.argv` / `commander` / `yargs` | `argparse` 模块 | 解析命令行参数 |
| `node-cron` / `setInterval` | `schedule` 库 / 系统 crontab | 定时任务 |

核心切入点：**自动化脚本 ≈ Node 脚本，但标准库更全，路径处理是面向对象的 `Path` 对象而不是字符串拼接**。下面逐个讲透。

---

# 二、pathlib：path + fs 的合体（面向对象）

Node 里路径是字符串，你得 `path.join(a, b)` 再 `fs.readFileSync` 分两步。Python 的 `pathlib.Path` 把"路径"和"对这个路径的文件操作"合在一个对象上。

## 2.1 构造路径与拼接

```python
from pathlib import Path

# base：项目根目录的 Path 对象。Path(".") 表示当前目录
base = Path(".")
# 用 / 运算符拼路径（重载了除法），跨平台自动用正确的分隔符
# 等价于 Node 的 path.join("logs", "app.log")
log_file = base / "logs" / "app.log"   # log_file：日志文件的 Path 对象

print(log_file)          # logs/app.log（在 Windows 上自动变 logs\app.log）
print(log_file.name)     # app.log    —— 文件名（含扩展名）
print(log_file.stem)     # app        —— 文件名（不含扩展名）
print(log_file.suffix)   # .log       —— 扩展名
print(log_file.parent)   # logs       —— 父目录
```

并排看 Node：

```javascript
const path = require('path')
const logFile = path.join('logs', 'app.log')
path.basename(logFile)            // app.log
path.basename(logFile, '.log')    // app
path.extname(logFile)             // .log
path.dirname(logFile)             // logs
```

`Path` 用 `/` 拼路径是它最讨喜的设计：一眼能看出层级，而且自动处理 Windows 的 `\` 和 Posix 的 `/`，**别再手动用字符串 `+ "/" +` 拼路径**。

## 2.2 读写文件（小文件直接一行）

```python
config = Path("config.txt")    # config：配置文件路径

# read_text：一次性把整个文件读成字符串。务必显式指定 encoding，
# WHY：Windows 默认编码是 gbk，不指定就会在跨平台时乱码
content = config.read_text(encoding="utf-8")  # content：文件全文字符串

# write_text：一次性写入字符串，文件不存在会创建，存在会覆盖
config.write_text("新内容", encoding="utf-8")
```

```javascript
const fs = require('fs')
const content = fs.readFileSync('config.txt', 'utf-8')
fs.writeFileSync('config.txt', '新内容')
```

> 大文件别用 `read_text` 一次性读，会吃满内存——用 `with open(...) as f: for line in f` 逐行流式读（详见第 06 篇生成器、第 09 篇上下文管理）。

## 2.3 glob：批量找文件（自动化脚本的灵魂）

批处理的第一步永远是"先把要处理的文件捞出来"。`glob` 用通配符匹配：

```python
src = Path("images")           # src：图片目录

# glob：只在当前层匹配，* 匹配任意文件名。返回的是惰性生成器
# 业务场景：找出 images/ 下所有 png（不含子目录）
pngs = src.glob("*.png")       # pngs：匹配到的 Path 对象生成器

# rglob：递归匹配所有子目录（r = recursive），等价于 glob("**/*.png")
# 业务场景：连同子文件夹一起，把所有 png 都揪出来
all_pngs = src.rglob("*.png")  # all_pngs：递归匹配的生成器

# 遍历处理。glob 返回生成器，要 list() 才能拿到列表或多次遍历（详见第 06 篇）
for p in src.glob("*.png"):    # p：当前匹配到的图片 Path
    print(p.name, p.stat().st_size)  # 打印文件名和字节大小
```

```javascript
const { glob } = require('glob')
const pngs = await glob('images/*.png')        // 当前层
const allPngs = await glob('images/**/*.png')  // 递归
```

对照表：

| Node glob | Python |
|-----------|--------|
| `glob('*.png')` | `Path('.').glob('*.png')` |
| `glob('**/*.png')` 递归 | `Path('.').rglob('*.png')` |
| 返回数组 | 返回惰性生成器（需要列表就 `list(...)`） |

---

# 三、shutil：高级文件操作（fs-extra 的角色）

`Path` 管单个文件的读写，**复制、移动、整目录删除、打压缩包**这些"重活"交给 `shutil`，它对标 Node 社区的 `fs-extra`。

```python
import shutil
from pathlib import Path

# copy：复制单个文件到目标路径（保留内容，不保留全部元数据）
shutil.copy("a.txt", "backup/a.txt")

# copytree：递归复制整个目录树，等价于 fs-extra 的 copySync(dir)
# dirs_exist_ok=True：目标目录已存在也不报错（Python 3.8+）
shutil.copytree("src", "dist", dirs_exist_ok=True)

# move：移动/重命名文件或目录（跨磁盘也能用，比 Path.rename 更稳）
shutil.move("old.txt", "new.txt")

# rmtree：递归删除整个目录！⚠️ 不可逆，等价于 rm -rf，用前务必确认路径
shutil.rmtree("temp_dir")

# make_archive：打压缩包。第一参是输出名(不含后缀)，第二参是格式，第三参是要打包的目录
# 业务场景：把 logs 目录打成 backup.zip，常用于定时备份
shutil.make_archive("backup", "zip", "logs")   # 生成 backup.zip
```

```javascript
const fse = require('fs-extra')
fse.copySync('a.txt', 'backup/a.txt')
fse.copySync('src', 'dist')
fse.moveSync('old.txt', 'new.txt')
fse.removeSync('temp_dir')   // 对应 rmtree
```

> ⚠️ `shutil.rmtree` 和 Node 的 `rm -rf` 一样危险，删错路径无法找回。脚本里务必先校验路径、或先打印将要删除的内容确认。

---

# 四、批量重命名实战（串起 pathlib + 推导式）

把前面两节串起来——一个高频需求：把目录下所有图片按 `照片_001.jpg` 顺序重命名。

```python
from pathlib import Path

# batch_rename：批量重命名目录下指定后缀的文件
# 参数 folder：目标目录路径字符串；prefix：新文件名前缀
def batch_rename(folder, prefix="照片"):
    src = Path(folder)                       # src：目标目录 Path
    # sorted 保证顺序稳定，否则 glob 的顺序不保证（业务上需要可预期的编号）
    files = sorted(src.glob("*.jpg"))        # files：排好序的图片列表
    # enumerate(start=1)：带序号遍历，序号从 1 开始（≈ JS 的 forEach((f,i)=>)）
    for index, old_path in enumerate(files, start=1):
        # f-string 格式化：:03d 表示补零到 3 位（1 → 001），等价于 padStart
        new_name = f"{prefix}_{index:03d}{old_path.suffix}"  # new_name：新文件名
        new_path = old_path.with_name(new_name)  # with_name：替换文件名、保留所在目录
        old_path.rename(new_path)                # 执行重命名
        print(f"{old_path.name} -> {new_name}")

batch_rename("photos")
```

并排看 Node：

```javascript
const fs = require('fs')
const path = require('path')
function batchRename(folder, prefix = '照片') {
  const files = fs.readdirSync(folder).filter(f => f.endsWith('.jpg')).sort()
  files.forEach((old, i) => {
    const newName = `${prefix}_${String(i + 1).padStart(3, '0')}${path.extname(old)}`
    fs.renameSync(path.join(folder, old), path.join(folder, newName))
  })
}
```

两点 Python 更顺手：`glob` 直接带过滤、`f"{index:03d}"` 内建补零（不用 `padStart`）。

---

# 五、subprocess：调用外部命令（child_process 的角色）

自动化脚本经常要"喊别的程序干活"——压缩视频喊 `ffmpeg`、提交代码喊 `git`。Node 用 `child_process`，Python 用 `subprocess`。

```python
import subprocess

# run：执行外部命令并等它跑完（阻塞）。
# 第一参用「列表」而非字符串，每个参数一个元素——
# WHY：这样不经过 shell 解析，从根上杜绝命令注入（见下方坑点）
# capture_output=True 捕获 stdout/stderr；text=True 让输出是字符串而非 bytes
result = subprocess.run(
    ["git", "status", "--short"],   # 命令与参数列表
    capture_output=True,            # 捕获输出而不是直接打到终端
    text=True,                      # 输出解码成字符串（否则是 bytes）
)

print(result.returncode)   # 退出码，0 表示成功（≈ shell 的 $?）
print(result.stdout)       # 标准输出字符串
print(result.stderr)       # 标准错误字符串

# check=True：命令返回非 0 时直接抛 CalledProcessError 异常
# 业务场景：构建脚本里命令失败必须中断，别带着错误往下跑
subprocess.run(["npm", "run", "build"], check=True)
```

并排看 Node：

```javascript
const { execFileSync } = require('child_process')
// execFile 同样推荐传参数数组，避免 shell 注入（对应 subprocess 的列表写法）
const out = execFileSync('git', ['status', '--short'], { encoding: 'utf-8' })
console.log(out)
```

对照表：

| Node | Python | 说明 |
|------|--------|------|
| `execFileSync(cmd, args)` | `subprocess.run([cmd, *args])` | 同步执行 |
| `spawn` 流式 | `subprocess.Popen` | 需要实时读输出时 |
| `{ encoding: 'utf-8' }` | `text=True` | 输出转字符串 |
| 非 0 退出抛错 | `check=True` | 失败即中断 |

> ⚠️ **千万别传 `shell=True` + 拼接的字符串命令**。`subprocess.run(f"rm {user_input}", shell=True)` 一旦 `user_input` 是 `; rm -rf /` 就是灾难（命令注入）。默认用列表形式，参数自动转义，安全。

---

# 六、argparse：解析命令行参数（commander 的角色）

脚本要复用就得能传参，比如 `python backup.py --src logs --dest /tmp`。Node 用 `commander`/`yargs`，Python 标准库自带 `argparse`。

```python
import argparse

# build_parser：构造参数解析器，集中声明这个脚本接受哪些参数
def build_parser():
    # description 会显示在 --help 里
    parser = argparse.ArgumentParser(description="目录备份脚本")
    # 位置参数：必填，按顺序传，如 python backup.py logs
    parser.add_argument("src", help="要备份的源目录")
    # 可选参数（带 --）：default 是缺省值，不传就用它
    parser.add_argument("--dest", default="./backup", help="备份输出目录")
    # action="store_true"：布尔开关，出现即 True，不出现即 False（≈ --verbose 这种 flag）
    parser.add_argument("--zip", action="store_true", help="是否打成 zip")
    return parser

parser = build_parser()         # parser：参数解析器对象
args = parser.parse_args()      # args：解析后的参数对象，属性名 = 参数名

print(args.src)    # 位置参数的值
print(args.dest)   # 可选参数的值（含默认值）
print(args.zip)    # 布尔开关 True / False
```

命令行运行：`python backup.py logs --dest /tmp/bak --zip`

并排看 Node（commander）：

```javascript
const { program } = require('commander')
program
  .argument('<src>', '要备份的源目录')
  .option('--dest <path>', '备份输出目录', './backup')
  .option('--zip', '是否打成 zip')
  .parse()
const opts = program.opts()
```

`argparse` 是标准库、零依赖，还自动生成 `-h/--help` 帮助文档，写个人脚本完全够用，不必装第三方库。

---

# 七、定时任务：三种方式按场景选

让脚本"到点自动跑"，有三档方案，从轻到重：

## 7.1 schedule 库（最像 node-cron，进程常驻）

第三方库 `schedule`（`pip install schedule`），API 极直白，适合脚本自己常驻跑：

```python
import schedule
import time

# do_backup：要被定时执行的任务函数
def do_backup():
    print("执行备份...")   # 这里放真实备份逻辑

# 注册任务：每 10 分钟跑一次。链式 API 读起来像自然语言
schedule.every(10).minutes.do(do_backup)
# 每天 02:30 跑一次（字符串是 24 小时制 HH:MM）
schedule.every().day.at("02:30").do(do_backup)

# WHY 要写这个 while 循环：schedule 本身不开线程，
# 它只是"到点了就执行已注册的任务"，必须自己驱动这个轮询循环
while True:
    schedule.run_pending()  # 检查有没有到点该跑的任务，有就跑
    time.sleep(1)           # 睡 1 秒再查，避免空转吃满 CPU
```

```javascript
const cron = require('node-cron')
// node-cron 用 crontab 表达式；进程同样要常驻
cron.schedule('*/10 * * * *', () => console.log('执行备份...'))
```

**边界（哪里不一样）**：`node-cron` 注册完回调，事件循环自己会在后台触发；`schedule` 没有后台线程，**必须你自己写 `while True` 轮询**，否则注册了也不会跑。这是从 Node 过来最容易愣住的点。

## 7.2 系统 crontab（Linux/Mac，脚本跑完就退出）

更省资源的做法：脚本写成"跑一次就退出"的普通脚本，把"定时"交给操作系统。这才是生产环境主流。

```bash
# 编辑当前用户的定时任务表
crontab -e

# 五个字段：分 时 日 月 周。下面表示「每天 02:30 执行」
# 务必用 python 的绝对路径和脚本绝对路径，WHY：cron 的环境变量极简，
# 不带你 shell 里的 PATH，写 python 而非绝对路径常常找不到解释器
30 2 * * * /usr/bin/python3 /home/imber/backup.py >> /home/imber/backup.log 2>&1
```

对前端来说，这就是把 `node-cron` 的表达式搬到了系统层；脚本本身不再常驻，到点由系统拉起、跑完即退，更省内存也更稳。Windows 上对应的是「任务计划程序」。

## 7.3 该选哪个

| 场景 | 选择 |
|------|------|
| 临时脚本、想一份代码搞定调度 | `schedule`（进程常驻） |
| 服务器上长期定时任务 | 系统 crontab（脚本跑完退出） |
| 已经在用 FastAPI/异步服务 | `APScheduler`（能跑在事件循环里） |

> 真实后端项目里的重型分布式定时任务（多机、可视化、失败重试）会用 xxl-job 这类调度中心——对照 Java 笔记第 28 篇。个人脚本用不到那么重。

---

# 八、最容易踩的坑

1. **手动用字符串拼路径**。`"logs" + "/" + name` 在 Windows 上分隔符不对。永远用 `Path("logs") / name`，跨平台自动正确。

2. **`read_text` 不写 encoding**。Mac/Linux 默认 UTF-8 没事，到 Windows 默认 gbk 直接乱码或报错。**所有读写文本都显式 `encoding="utf-8"`**。

3. **`subprocess` 用 `shell=True` + 字符串拼接**。命令注入重灾区。默认用列表形式 `["git", "status"]`，参数自动转义、不过 shell。

4. **`shutil.rmtree` 删错目录**。等价 `rm -rf`，不可逆。删之前先打印将删除的路径确认。

5. **`schedule` 注册了却不跑**。忘了写 `while True: schedule.run_pending(); time.sleep(1)` 驱动循环——它不像 `node-cron` 有后台线程，必须自己轮询。

6. **`glob` 当成列表反复用**。它返回的是惰性生成器，遍历一次就空了（详见第 06 篇）。需要多次用就 `list(...)` 固化。

7. **cron 里直接写 `python xxx.py`**。cron 环境的 PATH 极简，往往找不到解释器或脚本。用绝对路径，并把日志重定向到文件方便排查。

---

# 九、总结

自动化脚本就是把你写 Node 脚本的那套搬到 Python：`pathlib.Path` 用 `/` 拼路径、面向对象地读写（对标 `path`+`fs`）；`shutil` 管复制/移动/压缩/删目录（对标 `fs-extra`）；`glob`/`rglob` 通配符批量找文件；`subprocess.run([...])` 调外部命令（对标 `child_process`，务必用列表防注入）；`argparse` 解析命令行参数（标准库，对标 `commander`）；定时任务轻量用 `schedule`、生产用系统 `crontab`。

✅ 该掌握
- `Path("a") / "b"` 拼路径、`.name/.stem/.suffix/.parent` 取部件
- `glob`(当前层) / `rglob`(递归) 批量找文件，记得它是惰性生成器
- `shutil` 的 copy/move/copytree/make_archive/rmtree
- `subprocess.run([cmd, *args], check=True, text=True)` 调外部命令
- `argparse` 加位置参数 / `--可选参数` / `action="store_true"` 开关
- `schedule` 要配 `while True` 轮询；生产环境优先系统 crontab

⚠️ 易混淆
- 路径用 `/` 运算符，别字符串拼接（跨平台分隔符问题）
- 读写文本必写 `encoding="utf-8"`（Windows 默认 gbk 会坑）
- `subprocess` 默认列表形式，`shell=True`+拼接是注入漏洞
- `schedule` 没有后台线程，不写轮询循环就不会触发（不像 node-cron）
- `glob` 是生成器，消费一次即空，复用要 `list()`
- `rmtree` = `rm -rf`，不可逆，删前确认路径

下一篇：项目结构与规范（目录组织、配置管理、日志）

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“Python（29）- 自动化脚本”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。
