# Python（19）- 文件与 IO 操作

> 读完你能：围绕“文件与 IO 操作”理解“先给锚点：读文件的心智模型”与“open 的两个核心参数：mode 和 encoding”，并结合正文示例完成实践与排障。

> 你在 Node 里读写文件靠 `fs.readFileSync` / `fs.promises.readFile`，解析 JSON 靠 `JSON.parse`，处理 CSV 还得装个 `papaparse`。到了数据处理阶段，读文件这件事会变得很频繁——读训练数据、读配置、把分析结果写回磁盘。本篇解决三个最常见的落地问题：**怎么用 Python 安全地读写文本文件、怎么读写 JSON、怎么读写 CSV**。好消息是 Python 把 JSON 和 CSV 都做进了标准库，连库都不用装。

# 一、先给锚点：读文件的心智模型

Node 读文件你大概率写过这两种：

```javascript
// JS / Node：同步读
const fs = require("fs")
const content = fs.readFileSync("data.txt", "utf-8")   // 一次性读成字符串

// JS / Node：Promise 异步读
const content = await fs.promises.readFile("data.txt", "utf-8")
```

Python 的标准写法只有一种姿势——`with open(...)`，你在第 9 篇（异常处理与上下文管理）已经见过：

```python
# Python：with open 自动关闭文件，是标准姿势
with open("data.txt", "r", encoding="utf-8") as f:   # f：打开的文件对象
    content = f.read()                                # content：整个文件的文本内容
# 缩进结束，文件已自动关闭，不用手写 f.close()
```

先用对照表建立直觉：

| JS / Node | Python | 说明 |
|-----------|--------|------|
| `fs.readFileSync(path, "utf-8")` | `open(path).read()` | 一次性读成字符串 |
| `fs.writeFileSync(path, data)` | `open(path, "w").write(data)` | 覆盖写 |
| `fs.appendFileSync(path, data)` | `open(path, "a").write(data)` | 追加写 |
| `JSON.parse(str)` | `json.loads(str)` | 字符串 → 对象 |
| `JSON.stringify(obj)` | `json.dumps(obj)` | 对象 → 字符串 |
| `papaparse`(第三方) | `import csv`(标准库) | CSV 读写 |
| `path.join(a, b)` | `Path(a) / b` | 拼路径 |

> 关键边界：Python 默认**没有"异步读文件"这个日常选项**。Node 里大家习惯 `await readFile`，但 Python 标准库的 `open` 就是同步的，而且这在数据处理脚本里完全够用、也是惯例。异步文件 IO（`aiofiles` 等）是 Web 框架里的特殊需求，不是本篇重点。

---

# 二、open 的两个核心参数：mode 和 encoding

`open` 最常用就两个参数：**第二个 `mode`（怎么打开）和 `encoding`（按什么编码解码文本）**。

## 2.1 mode：读 / 写 / 追加 / 二进制

```python
# mode 的几种常见取值：
open("a.txt", "r")    # r：只读（默认）。文件不存在会抛 FileNotFoundError
open("a.txt", "w")    # w：写。⚠️ 会先清空文件！不存在则新建
open("a.txt", "a")    # a：追加。在文件末尾续写，不清空，不存在则新建
open("a.txt", "rb")   # rb：以二进制只读（读图片、模型权重等非文本文件）
open("a.txt", "x")    # x：新建写，文件已存在会报错（防覆盖）
```

对照 Node 的 flag，其实是一回事，只是 Python 的字母更短：

| Python mode | Node flag | 含义 |
|-------------|-----------|------|
| `"r"` | `"r"` | 只读 |
| `"w"` | `"w"` | 覆盖写（清空） |
| `"a"` | `"a"` | 追加写 |
| `"rb"` / `"wb"` | `"r"` 配 buffer | 二进制读 / 写 |

> ⚠️ 头号坑：`"w"` 模式一打开就**立即清空整个文件**，哪怕你后面一个字都没写。想保留原内容续写，用 `"a"`。这和 Node 的 `"w"` flag 行为一致，但前端同学常忘。

## 2.2 encoding：中文乱码的罪魁祸首

```python
# 读写文本文件请永远显式写 encoding="utf-8"
with open("中文.txt", "w", encoding="utf-8") as f:
    f.write("你好，世界")
```

为什么必须显式写？因为 Python 的 `open` 不指定 `encoding` 时，会用**操作系统默认编码**：Linux/Mac 通常是 utf-8（碰巧没事），但 **Windows 默认是 GBK**，读写中文就会乱码或直接抛 `UnicodeDecodeError`。Node 里你习惯了第二个参数传 `"utf-8"`，Python 这边对应的就是 `encoding="utf-8"`，养成肌肉记忆。

---

# 三、四种读取方式：什么时候读全部，什么时候逐行

Node 里你基本就是 `readFile` 一次性读完。Python 给了更细的粒度，**核心区别在"小文件全读" vs "大文件逐行流式读"**：

```python
with open("data.txt", "r", encoding="utf-8") as f:
    text = f.read()        # 读全部，返回一个大字符串。适合小文件
```

```python
with open("data.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()  # 读全部，返回"每行一个元素"的列表（含行尾的 \n）
```

```python
with open("data.txt", "r", encoding="utf-8") as f:
    first = f.readline()   # 只读一行（含行尾 \n），再调一次读下一行
```

最推荐、也是最 Python 的写法——**直接把文件对象当成可迭代对象，一行一行流式遍历**：

```python
# 大文件首选：逐行迭代，任何时刻内存里只有"当前这一行"，不会爆内存
with open("huge.log", "r", encoding="utf-8") as f:
    for line in f:                  # line：当前行的文本（含行尾 \n）
        clean = line.rstrip("\n")   # clean：去掉行尾换行后的内容
        # 业务场景：逐行处理几个 G 的日志，绝不能 f.read() 一次性塞进内存
        print(clean)
```

这正对应 Node 里"小文件 `readFile`、大文件用 stream"的取舍：

```javascript
// Node 大文件要手动上 stream，写法明显更重
const rl = readline.createInterface({ input: fs.createReadStream("huge.log") })
for await (const line of rl) {
  console.log(line)
}
```

Python 这边一个 `for line in f` 就达到了同样的"流式、省内存"效果，是它比 Node 顺手的地方。

> 记忆：`read()` 全读成一个字符串，`readlines()` 全读成一个列表，`for line in f` 逐行流式（大文件用这个）。

---

# 四、写文件：write 与 writelines

```python
with open("out.txt", "w", encoding="utf-8") as f:
    f.write("第一行\n")        # write：写入一个字符串，⚠️ 不会自动加换行，要自己写 \n
    f.write("第二行\n")

# 一次写多行：传一个字符串列表
lines = ["a\n", "b\n", "c\n"]   # lines：待写入的多行文本，注意每个元素得自带 \n
with open("out.txt", "w", encoding="utf-8") as f:
    f.writelines(lines)          # writelines：把列表里每个字符串依次写入，同样不自动加换行
```

> ⚠️ 坑：`write` / `writelines` **都不会帮你加换行符**，需要换行得自己在字符串里写 `\n`。这和 Node 的 `fs.writeFile` 一样，但容易和 `print`（默认带换行）搞混。

---

# 五、JSON：标准库自带，但要分清 4 个函数

前端处理 JSON 就两个函数：`JSON.parse` 和 `JSON.stringify`。Python 的 `json` 模块（标准库，不用装）也是这个思路，但**多了一组带文件的版本**，新手最容易混。

记住一个规律：**带 `s` 的处理"字符串"（string），不带 `s` 的直接处理"文件对象"**。

| 我要做的事 | JS | Python | 记忆 |
|-----------|-----|--------|------|
| JSON 字符串 → 对象 | `JSON.parse(str)` | `json.loads(str)` | loads = load **s**tring |
| 对象 → JSON 字符串 | `JSON.stringify(obj)` | `json.dumps(obj)` | dumps = dump **s**tring |
| 直接从文件读成对象 | 先 readFile 再 parse | `json.load(f)` | load 接文件对象 |
| 对象直接写进文件 | 先 stringify 再 writeFile | `json.dump(obj, f)` | dump 接文件对象 |

## 5.1 字符串版：loads / dumps

```python
import json

# loads：把 JSON 字符串解析成 Python 对象（dict / list）。对应 JSON.parse
raw = '{"name": "imber", "age": 30, "skills": ["js", "py"]}'   # raw：一段 JSON 文本
data = json.loads(raw)        # data：解析后的 dict
print(data["name"])           # imber

# dumps：把 Python 对象序列化成 JSON 字符串。对应 JSON.stringify
obj = {"name": "imber", "tags": ["前端", "Python"]}   # obj：待序列化的字典
text = json.dumps(obj, ensure_ascii=False, indent=2)  # text：格式化后的 JSON 字符串
print(text)
```

`dumps` 有两个**前端一定要记的参数**：

- `ensure_ascii=False`：不写它（默认 `True`），中文会被转成 `\uXXXX` 形式的 Unicode 转义码——比如 `"你好"` 会被序列化成 `"\u4f60\u597d"`。要正常显示中文**必须**加这句。这是 Python 特有的坑，JS 的 `JSON.stringify` 不会干这事。
- `indent=2`：美化缩进，等价于 JS 的 `JSON.stringify(obj, null, 2)`。

## 5.2 文件版：load / dump（不带 s，直接接文件）

```python
import json

# 写：把对象直接 dump 进文件，省掉"先 stringify 再 writeFile"两步
config = {"port": 8000, "debug": True, "名称": "服务"}   # config：要持久化的配置字典
with open("config.json", "w", encoding="utf-8") as f:
    # dump 第一个参数是对象，第二个是文件对象；ensure_ascii=False 保中文
    json.dump(config, f, ensure_ascii=False, indent=2)

# 读：直接从文件 load 成对象，省掉"先 readFile 再 parse"两步
with open("config.json", "r", encoding="utf-8") as f:
    loaded = json.load(f)        # loaded：从文件解析出来的 dict
print(loaded["名称"])            # 服务
```

对照 Node，你会发现 Python 的文件版少写一步：

```javascript
// Node：读 JSON 得两步——先 readFile 拿字符串，再 parse
const loaded = JSON.parse(fs.readFileSync("config.json", "utf-8"))
// 写也是两步——先 stringify，再 writeFile
fs.writeFileSync("config.json", JSON.stringify(config, null, 2))
```

> ⚠️ 类型映射边界：JSON 的 `true/false/null` 解析成 Python 的 `True/False/None`（首字母大写、`null` 变 `None`）；反过来 Python 的 `None` 会序列化成 JSON 的 `null`。另外 Python 的 `dict` 键如果是数字，`dumps` 后会变成字符串键——和 JS 对象一样，JSON 的键永远是字符串。

---

# 六、CSV：标准库 csv 模块

CSV（逗号分隔的表格文本）在数据处理里到处都是。前端通常装 `papaparse`，Python 直接 `import csv` 即可。

## 6.1 读 CSV

最常用 `csv.DictReader`——**把每一行读成字典，用表头当 key**，比按下标取值清晰得多：

```python
import csv

# newline="" 是官方要求的固定写法，WHY：避免 csv 模块和系统换行符冲突导致出现空行
with open("users.csv", "r", encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)     # reader：把每行变成 dict 的读取器，自动拿第一行当表头
    for row in reader:             # row：当前行的字典，如 {"name": "imber", "age": "30"}
        # ⚠️ 注意：CSV 读出来的值全是字符串，数字要自己转
        print(row["name"], int(row["age"]))
```

如果不想用表头、就要原始的每行列表，用 `csv.reader`：

```python
import csv

with open("users.csv", "r", encoding="utf-8", newline="") as f:
    reader = csv.reader(f)         # reader：每行返回一个字符串列表
    header = next(reader)          # header：第一行（表头），next 取出并跳过它
    for row in reader:             # row：当前行的字段列表，如 ["imber", "30"]
        print(row[0], row[1])
```

## 6.2 写 CSV

```python
import csv

# rows：要写入的数据，每个元素是一行（字典）
rows = [
    {"name": "imber", "age": 30},
    {"name": "alice", "age": 25},
]

with open("out.csv", "w", encoding="utf-8", newline="") as f:
    # fieldnames：列的顺序和表头名称，必须显式给出
    writer = csv.DictWriter(f, fieldnames=["name", "age"])
    writer.writeheader()           # 先写表头行（name,age）
    writer.writerows(rows)         # 一次性写入所有数据行
```

> ⚠️ CSV 三大坑（前端高频）：
> 1. **读出来的值全是字符串**——`row["age"]` 是 `"30"` 不是 `30`，要算数得先 `int()` / `float()`。
> 2. **`newline=""` 不能省**——Python 官方文档明确要求写 CSV 时加它，否则 Windows 下每行之间会多出空行。
> 3. CSV 是纯文本、没有类型和嵌套结构。真要做表格分析（筛选、分组、聚合），别用 `csv` 硬撸，下一阶段的 **Pandas** 才是正解（`pd.read_csv` 一行搞定，详见第 21 篇）。`csv` 模块适合简单的逐行读写。

---

# 七、路径处理：用 pathlib 代替字符串拼接

前端拼路径用 `path.join("a", "b")`，避免手写 `/` 在不同系统出错。Python 现代写法是 `pathlib.Path`，**它把路径做成对象，用 `/` 运算符拼接**，很优雅：

```python
from pathlib import Path

# Path：把字符串变成路径对象。__file__ 是当前脚本路径
base = Path(__file__).parent        # base：当前脚本所在目录
data_file = base / "data" / "users.csv"   # 用 / 拼路径，自动适配系统分隔符

print(data_file.exists())           # 文件是否存在（对应 fs.existsSync）
print(data_file.suffix)             # .csv，扩展名（对应 path.extname）
print(data_file.name)               # users.csv，文件名（对应 path.basename）

# Path 对象可以直接传给 open，也能直接读写：
text = data_file.read_text(encoding="utf-8")    # 一行读全部文本，比 open 还省事
data_file.write_text("内容", encoding="utf-8")   # 一行覆盖写
```

对照 Node：

| Node | Python (pathlib) |
|------|------------------|
| `path.join(a, b)` | `Path(a) / b` |
| `path.extname(p)` | `p.suffix` |
| `path.basename(p)` | `p.name` |
| `fs.existsSync(p)` | `p.exists()` |
| `__dirname` | `Path(__file__).parent` |

> ⚠️ 相对路径坑（前后端通病）：`open("data.txt")` 里的相对路径，是相对于**运行脚本时所在的工作目录（cwd）**，不是脚本文件本身的位置。在不同目录下 `python xxx.py` 启动，可能就找不到文件。稳妥做法：用 `Path(__file__).parent / "data.txt"` 锚定到脚本自身位置。

---

# 八、最容易踩的坑（前端视角汇总）

1. **`"w"` 模式一开就清空文件**——想续写用 `"a"`。
2. **不写 `encoding="utf-8"`**——Windows 下默认 GBK，中文乱码或报 `UnicodeDecodeError`。读写文本永远显式带上。
3. **`json.dumps` 中文变 `\uXXXX`**——加 `ensure_ascii=False` 才正常显示中文。
4. **`load`/`loads` 分不清**——带 `s` 的吃字符串，不带 `s` 的吃文件对象。
5. **CSV 值全是字符串**——数字要手动 `int()`/`float()`；写 CSV 别忘 `newline=""`。
6. **相对路径相对的是 cwd 不是脚本**——用 `Path(__file__).parent` 锚定。
7. **大文件别 `f.read()` 一次性读**——用 `for line in f` 流式逐行，不然爆内存。

---

# 九、总结

Python 的文件 IO 心智模型很简单：**`with open(mode, encoding)` 一把梭，自动关闭**。读小文件用 `read()`，读大文件用 `for line in f` 流式。JSON 和 CSV 都在标准库里：`json` 模块记住"带 s 吃字符串、不带 s 吃文件"，`csv` 模块用 `DictReader`/`DictWriter` 按表头读写。路径用 `pathlib.Path` 配 `/` 拼接最稳。

✅ 该掌握
- `with open(path, mode, encoding="utf-8")` 标准姿势，分清 `r`/`w`/`a`
- 大文件用 `for line in f` 流式逐行，小文件 `f.read()`
- JSON 四件套：`loads`/`dumps`（字符串）、`load`/`dump`（文件），中文加 `ensure_ascii=False`
- CSV 用 `csv.DictReader` / `csv.DictWriter` 按表头读写，`newline=""` 不能省
- 路径用 `pathlib.Path`，相对路径锚定到 `Path(__file__).parent`

⚠️ 易混淆
- `"w"` 会清空文件，续写用 `"a"`
- 不写 `encoding` 在 Windows 必乱码
- `dumps` 中文默认转义，要 `ensure_ascii=False`
- `load`(文件) vs `loads`(字符串)、`dump` vs `dumps` 别搞反
- CSV 读出来全是字符串，要自己转类型；复杂表格分析交给下阶段的 Pandas

下一篇：20 - NumPy 基础（ndarray ≈ 开了挂的"超级 Array"，向量化运算替代 for 循环）。
