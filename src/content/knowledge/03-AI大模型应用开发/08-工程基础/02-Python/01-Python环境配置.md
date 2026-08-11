# 工程基础（4）- Python 环境配置

> 读完你能：在自己机器上准备好一个干净、隔离、可复现的 Python 运行环境，跑通一个「环境体检」脚本，并说清楚虚拟环境和 API Key 该怎么管。

# 一、一个真实场景

你照着教程写了第一个 AI 脚本，本地跑得好好的。提交给同事，对方 `python3 main.py` 一跑：`ModuleNotFoundError`。你装了 `openai`，他没装；你用的是 Python 3.12，他系统里是 3.9，f-string 的新写法直接报错。

这类问题不是代码错了，是环境没对齐。AI 项目尤其明显：它依赖模型 SDK、Web 框架、文档解析库、向量库客户端，版本一多，「在我机器上能跑」就成了团队最常见的笑话。这一篇就解决一件事：让你的环境从一开始就是隔离的、可复现的、能交付给别人的。

# 二、Python 和前端的环境心智对照

你在前端管理环境的那套，几乎能一对一搬过来：

| 前端 | Python | 作用 |
|---|---|---|
| `node_modules/`（每个项目独立） | `.venv/` 虚拟环境 | 项目依赖互相隔离，不污染全局 |
| `package.json` | `requirements.txt` / `pyproject.toml` | 声明项目需要哪些包 |
| `npm install` | `pip install -r requirements.txt` | 按声明装齐依赖 |
| `.nvmrc` 锁 Node 版本 | `python3 --version` 对齐解释器 | 保证大家用同一个版本 |
| `.env`（前端构建变量） | `.env` + 环境变量 | 存 API Key 这类敏感配置，不进仓库 |

最大的差异是：前端 `npm install` 默认就装进项目本地的 `node_modules`，而 Python 的 `pip install` **默认装进全局**。你必须先手动建并激活虚拟环境，后续的 `pip install` 才会落到项目里。漏掉这一步，是新手最常踩的坑。

# 三、四个动作，把环境立起来

**1. 确认版本**

```bash
python3 --version    # 建议 3.10 以上，类型标注和 f-string 新写法才稳定
```

**2. 建虚拟环境并激活**

```bash
python3 -m venv .venv          # 在项目里造一个隔离的 .venv 目录
source .venv/bin/activate      # 激活（Windows 是 .venv\Scripts\activate）
```

激活后命令行前面会出现 `(.venv)`。这是判断「我到底在不在虚拟环境里」最直观的信号。从这一刻起，`pip install` 才会装进项目本地。

**3. 装依赖、冻结依赖**

```bash
python -m pip install fastapi uvicorn    # 装包
python -m pip freeze > requirements.txt  # 把当前装了什么、什么版本，写进清单
```

`requirements.txt` 就是你的 `package.json`：别人 `pip install -r requirements.txt` 就能复现一模一样的环境。

**4. 管好 API Key**

模型 Key 绝不写进代码。用环境变量传，代码里 `os.getenv("OPENAI_API_KEY")` 读：

```python
import os
api_key = os.getenv("OPENAI_API_KEY")  # 没设置时返回 None，代码可以据此走 mock
```

仓库里只提交 `.env.example`（写明需要哪些变量名，但不填值），真正的 `.env` 加进 `.gitignore`。

# 五、工程上真正会踩的坑

- **`python` 和 `python3` 指向不同版本**：很多 mac 上 `python` 还是老的 2.x 或另一个 3.x。统一用 `python3`，或在激活的 venv 里用 `python`，避免「我这跑得通你那跑不通」。
- **忘了激活就 `pip install`**：包装到全局去了，项目里反而找不到。看命令行有没有 `(.venv)` 前缀再装。
- **把 `.env` 提交进仓库**：API Key 一旦进了 git 历史，删文件也没用，必须去平台重置 Key。从第一次提交就把 `.env` 写进 `.gitignore`。
- **`.venv` 被提交进仓库**：它体积大且和机器绑定，和前端不提交 `node_modules` 一个道理，也要加进 `.gitignore`。
- **跨平台激活命令不同**：mac/Linux 是 `source .venv/bin/activate`，Windows 是 `.venv\Scripts\activate`。README 里两个都写上。

# 六、一句话面试答法

**问：为什么 Python 项目一定要用虚拟环境？**

> 因为 pip 默认装全局，多个项目共用一套依赖迟早版本打架。虚拟环境给每个项目一个独立的依赖空间，等价于前端每个项目独立的 node_modules，配合 requirements.txt 就能让任何人一条命令复现环境。

# 八、总结

- **工程上真正会踩的坑**：python 和 python3 指向不同版本：很多 mac 上 python 还是老的 2.x 或另一个 3.x。
- **Python 和前端的环境心智对照**：你在前端管理环境的那套，几乎能一对一搬过来：
- **四个动作，把环境立起来**：激活后命令行前面会出现 (.venv)。
- **一个真实场景**：你照着教程写了第一个 AI 脚本，本地跑得好好的。

<!-- knowledge-lab-merged -->

# 动手实践：04 Python 环境配置

一个「环境体检」脚本：不装任何东西，只把 Python、pip、虚拟环境、标准库、API Key 的真实状态打印出来，给你一个「现在能不能开始写 AI 脚本」的明确结论。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库。

## 预期输出

在系统全局环境（没激活 venv）下跑，会看到虚拟环境那一项给警告：

```
================================================
 Python 环境体检
================================================
[OK] Python 版本：当前 3.14.5，要求 >= 3.10
[OK] python3 命令：python3 -> /Library/Frameworks/Python.framework/Versions/3.14/bin/python3
[OK] pip 包管理：pip 可用，能安装依赖
[!!] 虚拟环境：未在虚拟环境，依赖会装到全局，建议先 python3 -m venv .venv
[OK] 标准库模块：已就绪：json, os, pathlib, venv
[OK] 模型 API Key：未设置 OPENAI_API_KEY，demo 会走本地 mock（这是预期内的，不影响学习）
------------------------------------------------
结论：以下项需要先处理：虚拟环境
```

具体路径和版本号会随你的机器变化。如果你先 `python3 -m venv .venv && source .venv/bin/activate` 再跑，虚拟环境那一项就会变成 `[OK]`，结论变成「环境就绪」。

## 代码对应文章的哪些点

| 文章里的概念 | 在 main.py 哪里 |
|---|---|
| 版本要 >= 3.10 | `check_python_version()` |
| python3 在 PATH 上，别人才跑得动 | `check_python3_on_path()` |
| pip 能装依赖 | `check_pip()` |
| 虚拟环境隔离 | `check_in_venv()`（用 `sys.prefix != sys.base_prefix` 判断） |
| 依赖自检 | `check_stdlib_modules()` |
| API Key 走环境变量、不写死、不打印 | `check_api_key()`（只看有没有，绝不打印值） |

## 动手改

- 把 `check_stdlib_modules` 的列表换成 `["fastapi", "uvicorn"]`，没装时会看到 `[!!]`，体会「依赖缺失」长什么样。
- 先激活虚拟环境再跑，对比虚拟环境那一项从 `[!!]` 变 `[OK]`。
- 临时 `export OPENAI_API_KEY=xxx` 再跑，确认脚本只说「已设置」、不回显你的 Key。
