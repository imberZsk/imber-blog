# 01 - Python环境配置

> 前端装好 node 就能 `npm i` 干活，Python 也差不多——但有一个你绝对想不到的坑：**pip 默认装到全局**。本篇解决「装什么、怎么隔离、用什么 IDE」三件事，并把每一步对回 node/npm 的心智模型。

## 一、先建立总类比

Python 这套工具链，几乎能和前端一一对上号：

| 前端 (JS/TS) | Python | 作用 |
|------|------|------|
| Node.js 运行时 | Python 解释器 (`python3`) | 跑代码 |
| `node app.js` | `python3 app.py` | 运行脚本 |
| npm / yarn / pnpm | pip | 装第三方包 |
| `package.json` | `requirements.txt` / `pyproject.toml` | 声明依赖 |
| `node_modules/`（项目内隔离） | `venv/`（虚拟环境，项目内隔离） | 存依赖、互不污染 |
| nvm | pyenv | 管理多个语言版本 |
| `npm registry` | PyPI (pypi.org) | 包的中央仓库 |

记住一句话就够入门：**Python解释器 ≈ node，pip ≈ npm，venv ≈ node_modules，pyenv ≈ nvm。**

> ⚠️ 边界（哪里不一样）：上面是「建立直觉」，但 **pip 和 npm 有一个致命差异**——npm 默认装到当前项目的 `node_modules`（本地隔离），而 **pip 默认装到全局**。这是前端转 Python 最大的坑，第三节专门讲。

---

## 二、Python 解释器：装哪个版本

### 2.1 只认 Python 3，别碰 Python 2

Python 2 已于 2020 年彻底停止维护，**学习和新项目一律用 Python 3**（推荐 3.10 及以上）。

类比：就像现在没人写 `var` 一样，Python 2 是历史包袱，直接忽略。

### 2.2 `python` 还是 `python3`？（第一个坑）

macOS / Linux 上，命令名很可能是 `python3` 而不是 `python`：

```bash
# 查看版本，确认装的是 3.x
python3 --version    # 输出类似 Python 3.12.3
pip3 --version       # pip 也常带 3 后缀
```

| 你以为 | 实际可能是 | 说明 |
|------|------|------|
| `python` | `python3` | 老系统里 `python` 可能指向 Python 2 或不存在 |
| `pip` | `pip3` | 同上 |

> WHY：很多系统为了兼容历史脚本，把 `python` 这个名字留给了 Python 2。所以**养成习惯敲 `python3` / `pip3` 最稳**。进了虚拟环境后（见第三节），`python` 才会稳定指向你的 Python 3。

### 2.3 pyenv：管理多版本（类比 nvm）

如果你需要在多个 Python 版本间切换（不同项目要求不同版本），用 `pyenv`，心智模型和 nvm 完全一致：

| 前端 | Python | 作用 |
|------|------|------|
| `nvm install 18` | `pyenv install 3.12.3` | 装一个版本 |
| `nvm use 18` | `pyenv shell 3.12.3` | 当前终端切换 |
| `nvm alias default 18` | `pyenv global 3.12.3` | 设为全局默认 |
| `.nvmrc` | `.python-version` | 项目锁定版本的文件 |

> ⚠️ 边界：pyenv 管的是「Python **解释器版本**」，venv 管的是「某个项目的**依赖隔离**」。两者职责不同、可叠加使用——pyenv 选版本，venv 在该版本下开一个干净的依赖空间。别把它俩搞混。

---

## 三、venv 虚拟环境：最重要的一节

### 3.1 为什么必须用 venv（pip 全局污染问题）

前端的 `npm install lodash` 默认装进**当前项目**的 `node_modules`，项目之间天然隔离。Python 的 `pip install` 默认装到**全局**（系统级或用户级），结果是：

- 项目 A 要 `requests==2.25`，项目 B 要 `requests==2.31` → 直接冲突，互相覆盖
- 全局环境越装越乱，最后没人知道哪个包是哪个项目要的

`venv`（virtual environment，标准库自带，无需安装）就是来解决这个的：**给每个项目开一个独立的依赖目录，等价于前端每个项目都有自己的 `node_modules`。**

```text
前端：每个项目自带 node_modules    →  天生隔离
Python：默认全局，必须手动 venv 隔离  →  不开 venv 就会互相污染
```

### 3.2 创建并激活 venv

```bash
# 1. 在项目根目录创建虚拟环境，目录名约定叫 venv
#    python3 -m venv 表示「运行标准库的 venv 模块」，最后的 venv 是要生成的目录名
python3 -m venv venv

# 2. 激活（macOS / Linux）。激活后命令行前面会出现 (venv) 前缀
source venv/bin/activate

# Windows 是另一条命令（PowerShell）：
# venv\Scripts\Activate.ps1

# 3. 退出虚拟环境
deactivate
```

激活后，`python` 和 `pip` 会**自动指向这个 venv 内部**的版本，此时 `pip install` 装的东西只进 `venv/` 目录，不再污染全局。

> 💡 类比：`source venv/bin/activate` ≈ 「进入这个项目的 node_modules 上下文」。激活状态下敲 `pip install`，就像在项目目录里敲 `npm install`——只影响当前项目。

### 3.3 把 venv 加进 .gitignore

和 `node_modules` 一样，`venv/` 目录**不提交到 git**：

```gitignore
# .gitignore
venv/
__pycache__/      # Python 缓存目录，类似构建产物，也不提交
*.pyc             # 编译后的字节码缓存
```

---

## 四、pip：装包与依赖清单

### 4.1 常用命令对照

| 前端 (npm) | Python (pip) | 作用 |
|------|------|------|
| `npm install requests` | `pip install requests` | 装一个包 |
| `npm install requests@2.31.0` | `pip install requests==2.31.0` | 装指定版本（注意是 `==`） |
| `npm uninstall requests` | `pip uninstall requests` | 卸载 |
| `npm list` | `pip list` | 列出已装的包 |
| `npm install`（按 package.json 装） | `pip install -r requirements.txt` | 按清单批量安装 |

> ⚠️ 易混淆：指定版本前端用 `@`（`requests@2.31.0`），pip 用 `==`（`requests==2.31.0`）。别写错。

### 4.2 requirements.txt（类比 package.json 的依赖区）

Python 最经典的依赖清单是 `requirements.txt`，一行一个包：

```text
# requirements.txt（每行一个依赖，== 锁定版本）
fastapi==0.111.0
requests==2.31.0
pydantic==2.7.1
```

生成和安装：

```bash
# 把当前 venv 里所有已装的包导出成清单（类似手动维护 dependencies）
pip freeze > requirements.txt

# 别人拿到项目后，按清单一键还原所有依赖（类比 npm install）
pip install -r requirements.txt
```

> 💡 标准工作流：进项目 → 建并激活 venv → `pip install -r requirements.txt` → 开干。和前端「克隆项目 → `npm install`」是同一个动作，只是多了「先激活 venv」这一步。

> 📌 补充（了解即可，本篇不展开）：现代 Python 项目越来越多用 `pyproject.toml` + Poetry / uv 这类工具统一管理依赖，角色更接近 `package.json`（声明依赖 + 项目元信息 + 锁版本）。新手先掌握 `venv + requirements.txt` 这条最稳的主线即可，工具链选型后续遇到再说。

---

## 五、IDE：用 VS Code 或 PyCharm

| 选项 | 类比 | 适合谁 |
|------|------|------|
| VS Code + Python 扩展 | 你大概率已经在用的编辑器 | 前端转过来的人，零迁移成本，**首选** |
| PyCharm | 类比 WebStorm（JetBrains 全家桶） | 想要开箱即用的重度 IDE |

前端基本都在用 VS Code，直接装官方 **Python 扩展**（Microsoft 出品）即可，关键能力：语法高亮、智能补全、调试、自动识别 venv。

### 5.1 让 VS Code 用对 venv（关键一步）

装好扩展后，VS Code 通常会自动检测到项目里的 `venv/`。如果没有，手动选：

> 按 `Cmd+Shift+P` → 输入 `Python: Select Interpreter` → 选中带 `venv` 字样的那个解释器（路径里通常含 `./venv/bin/python`）。

> WHY：选对解释器后，VS Code 的补全、报错检查、运行调试才会基于「这个 venv 里实际装的包」。否则你装了 `fastapi`，编辑器却一直报「找不到模块」——因为它在看全局环境而不是你的 venv。这是新手最常见的「装了包还是红线报错」问题的根因。

---

## 六、最小上手验证（5 分钟跑通）

```bash
# 1. 建项目目录并进入
mkdir hello-py && cd hello-py

# 2. 创建并激活虚拟环境
python3 -m venv venv
source venv/bin/activate          # 激活后命令行出现 (venv) 前缀

# 3. 装一个第三方包验证 pip 与隔离生效
pip install requests

# 4. 把已装依赖导出成清单
pip freeze > requirements.txt
```

新建 `app.py`：

```python
# app.py —— 验证解释器与第三方包都正常工作的最小脚本
import requests   # 导入刚装的第三方库，验证 venv 隔离生效

# 定义入口函数：发一个 GET 请求，打印返回的状态码，确认环境通了
def main():
    # resp 变量：存储 HTTP 响应对象（GitHub API 的返回）
    resp = requests.get("https://api.github.com")
    # status 变量：存储响应的 HTTP 状态码（200 表示成功）
    status = resp.status_code
    print("状态码:", status)

# Python 的「程序入口」惯用写法：只有被直接运行时才执行 main()
# 类比 node 里没有强制入口，但这行约等于「只有作为主模块运行才执行」
if __name__ == "__main__":
    main()
```

对照 JS 版本（帮你建立映射）：

```javascript
// app.js —— Node 等价版本
// 定义入口函数：发一个 GET 请求，打印返回的状态码，确认环境通了
const main = async () => {
  // resp 变量：存储 fetch 返回的响应对象
  const resp = await fetch("https://api.github.com");
  // status 变量：存储 HTTP 状态码
  const status = resp.status;
  console.log("状态码:", status);
};

main();
```

运行：

```bash
python3 app.py     # 输出：状态码: 200
```

> 💡 注意上面那行 `if __name__ == "__main__":`——它是 Python 的入口惯例，含义是「这个文件被直接运行时才执行，被别的文件 import 时不执行」。前端没有完全对应物，先记住「这是 Python 写可执行脚本的标准开头」，后续讲模块时再展开。

---

## 七、踩坑速查

| 现象 | 原因 | 解决 |
|------|------|------|
| `command not found: python` | 系统只有 `python3` | 敲 `python3`，或在 venv 内用 `python` |
| 装了包但编辑器一直红线报错 | VS Code 没选对 venv 解释器 | `Python: Select Interpreter` 选 venv |
| 两个项目依赖版本打架 | 没用 venv，全装全局了 | 每个项目都建独立 venv |
| `pip install` 报权限错误 | 在往全局系统目录写 | 先激活 venv，别往全局装 |
| 命令行没有 `(venv)` 前缀 | 忘了激活 | `source venv/bin/activate` |

---

## 八、小结

环境配置本质就一句话：**装 Python 3 解释器 → 每个项目建并激活 venv → 在 venv 里用 pip 装包 → VS Code 选对 venv 解释器。** 和前端「装 node → 项目里 npm install → 编辑器自动认 node_modules」是同一套流程，唯一要刻进肌肉记忆的差异是：**pip 默认全局，必须靠 venv 手动隔离。**

✅ 该掌握
- 三组核心类比：**解释器≈node、pip≈npm、venv≈node_modules、pyenv≈nvm**
- venv 的「建 → 激活 → 装包 → deactivate」完整循环
- `requirements.txt` 与 `pip freeze` / `pip install -r` 的导出与还原
- VS Code 里 `Python: Select Interpreter` 选对 venv

⚠️ 易混淆
- **pip 默认装全局**（npm 默认装本地）——这是最大的认知差
- 指定版本：npm 用 `@`，pip 用 `==`
- `python` vs `python3`：venv 外敲 `python3` 最稳，venv 内 `python` 才稳定指向 3.x
- pyenv（管版本）≠ venv（管依赖隔离），职责不同、可叠加

下一篇：写第一个 Python 程序，把语法和 JS 逐行对上号。
