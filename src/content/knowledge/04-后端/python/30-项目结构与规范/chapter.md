# 30 - 项目结构与规范

> 前端项目你闭着眼都能搭：`src/` 放代码、`package.json` 管依赖、`.env` 放配置、出问题翻控制台。Python 这套东西全都有，但叫法和习惯不一样——目录怎么分层、配置往哪放、密钥怎么不进 git、日志为什么不能用 `print`。这篇把「一个像样的 Python 项目长什么样」讲清楚，让你写出来的代码别人接手不骂街。

## 一、先建立直觉：Python 项目 ≈ 前端项目的目录组织

**类比**：你脑子里前端项目的样子——根目录一堆配置文件（`package.json`、`.env`、`.gitignore`），源码全塞 `src/`，依赖装进 `node_modules/`——这套心智模型几乎可以原样搬到 Python。每一块都有对应物：

| 前端 | Python | 作用 |
|------|--------|------|
| `src/` | `src/包名/` 或 `包名/` | 源码主目录 |
| `package.json` | `pyproject.toml` | 项目元信息 + 依赖声明 |
| `node_modules/` | `venv/`（虚拟环境） | 第三方依赖装这里 |
| `.env` | `.env` | 环境变量 / 密钥 |
| `.gitignore` | `.gitignore` | 忽略不进库的文件 |
| `index.js`（入口） | `main.py` / `__main__.py` | 程序入口 |
| `console.log` | `logging` 模块 | 日志输出 |
| `tests/` | `tests/` | 测试代码（见第 31 篇） |
| `README.md` | `README.md` | 项目说明 |

**边界（这里和前端不一样）**：前端的「依赖隔离」是自动的——每个项目自带 `node_modules`，你几乎不用操心。Python 默认所有项目**共用一套全局解释器**，不手动建虚拟环境就会版本打架（详见第 12 篇）。所以 Python 项目的「规范」第一条永远是：**进项目先激活 venv**。这点心智负担是前端没有的。

---

## 二、目录组织：一个标准 Python 项目长什么样

新手最容易把所有 `.py` 文件平铺在根目录，跑是能跑，但项目一大就乱。社区有约定俗成的结构。先看一个典型的中小项目（以 FastAPI 后端为例）：

```
myproject/
├── pyproject.toml          # 项目元信息 + 依赖（≈ package.json）
├── README.md               # 项目说明
├── .gitignore              # git 忽略清单
├── .env                    # 本地配置/密钥（绝不进 git）
├── .env.example            # 配置模板（进 git，标明需要哪些变量，但不填真值）
│
├── src/                    # 源码根（src layout，下面解释为什么用它）
│   └── myproject/          # 真正的包，包名 = 项目名
│       ├── __init__.py     # 让 myproject 成为一个包（≈ index 入口）
│       ├── main.py         # 程序入口
│       ├── config.py       # 配置集中管理
│       ├── api/            # 路由层（子包）
│       │   ├── __init__.py
│       │   └── users.py
│       ├── services/       # 业务逻辑层
│       │   └── __init__.py
│       ├── models/         # 数据模型
│       │   └── __init__.py
│       └── utils/          # 工具函数
│           └── __init__.py
│
├── tests/                  # 测试（和 src 平级，见第 31 篇）
│   └── test_users.py
│
└── logs/                   # 日志输出目录（一般 gitignore 掉）
```

这套分层（`api / services / models`）和你在后端见过的 MVC 三层是一个思路：路由只管收发请求，业务逻辑收在 `services`，数据结构放 `models`。

### src layout vs flat layout

你会看到两种摆法，区别只在「包要不要再套一层 `src/`」：

```
# flat layout（扁平）—— 包直接放根目录
myproject/
├── pyproject.toml
└── myproject/          # 包和配置文件同级
    └── __init__.py

# src layout（推荐）—— 包放进 src/
myproject/
├── pyproject.toml
└── src/
    └── myproject/      # 包多套一层 src
        └── __init__.py
```

**为什么推荐 src layout（讲 WHY 而非 WHAT）**：flat 布局下，你在根目录运行测试时，Python 会因为「当前目录在 `sys.path` 里」（详见第 8 篇）而**直接 import 到源码目录**，哪怕你根本没安装这个包。这会掩盖「忘了声明某个依赖」之类的打包问题——本地跑得好好的，装到别人机器上就崩。src layout 强制你把包**真正安装一遍**（`pip install -e .`，类似前端的 `npm link`）才能 import，测的就是「用户实际拿到的东西」，把问题暴露在自己机器上。

**边界**：小脚本、一次性项目用 flat 完全没问题，别上来就搞 src 把自己绕晕。要发布成库、或者项目会长期维护，再上 src layout。

---

## 三、配置管理：别把配置写死在代码里

前端你早就知道「配置和代码分离」：API 地址、密钥放 `.env`，用 `import.meta.env` 或 `process.env` 读。Python 完全一样的思路，工具不同而已。

### 1. 项目元信息：pyproject.toml（≈ package.json）

现代 Python 项目的「中央配置文件」，声明项目名、版本、依赖，连各种工具（格式化、测试）的配置都能塞进去：

```toml
# pyproject.toml —— 角色等于前端的 package.json
[project]
name = "myproject"              # 项目名
version = "0.1.0"               # 版本号（≈ package.json 的 version）
requires-python = ">=3.10"      # 要求的 Python 版本（≈ engines.node）
dependencies = [                # 运行时依赖（≈ dependencies）
    "fastapi>=0.110",
    "pydantic-settings>=2.0",
    "python-dotenv>=1.0",
]

[project.optional-dependencies]
dev = ["pytest>=8.0", "ruff"]   # 开发依赖（≈ devDependencies）
```

**边界**：`pyproject.toml` 用的是 TOML 格式，不是 JSON——别习惯性写大括号和逗号。它和老式的 `requirements.txt` 不冲突：`requirements.txt` 是「锁死的扁平清单」（≈ lockfile 的简化版），`pyproject.toml` 是「带元信息的依赖声明」（≈ package.json 本体）。详见第 12 篇。

### 2. 环境变量与密钥：.env + python-dotenv

和前端一模一样：敏感信息（数据库密码、API key）放 `.env`，**`.env` 进 `.gitignore`，只把不含真值的 `.env.example` 提交**。

```bash
# .env —— 本地真实配置，绝不进 git
DATABASE_URL=postgresql://user:secret@localhost/mydb
OPENAI_API_KEY=sk-真实密钥
DEBUG=true
```

读取方式有两种。最朴素的是 `python-dotenv` + `os.getenv`，几乎是前端 `dotenv` 的翻版：

```python
import os                              # 标准库：读环境变量、操作系统接口
from dotenv import load_dotenv         # 第三方库 python-dotenv，把 .env 加载进环境变量

# load_dotenv 读取 .env 文件，把里面的键值对塞进 os.environ（进程的环境变量表）
# 业务场景：程序启动最开始调一次，之后任何地方都能用 os.getenv 取到
load_dotenv()

# db_url 存数据库连接串，从环境变量读；第二个参数是取不到时的默认值（避免 None 崩溃）
db_url = os.getenv("DATABASE_URL", "sqlite:///./local.db")
```

并排看前端，思路完全一致：

```javascript
// 前端 / node
import 'dotenv/config'                 // 加载 .env 到 process.env
const dbUrl = process.env.DATABASE_URL ?? 'sqlite:///./local.db'
```

### 3. 推荐做法：用 pydantic-settings 做「类型安全的配置」

`os.getenv` 的毛病你在前端也踩过：取出来全是字符串，`"true"` 不是布尔，少配一个变量要运行到那行才报错。Python 的 `pydantic-settings` 能把配置变成一个**带类型校验的配置对象**（类似你用 zod 校验过的 config），启动时就把类型转好、缺失项报出来。

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

# Settings 是配置类：每个字段对应一个配置项，类型注解就是「期望的类型」
# 业务场景：启动时自动从 .env / 环境变量读取并按类型转换，缺必填项直接报错
class Settings(BaseSettings):
    # 告诉 pydantic-settings 去读哪个 .env 文件、忽略多余的变量
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str                  # 数据库连接串，必填（没配会启动即报错）
    openai_api_key: str                # 大模型密钥，必填
    debug: bool = False                # 是否调试模式，字段名自动匹配 DEBUG，"true" 会被转成 True
    port: int = 8000                   # 端口，自动把字符串 "8000" 转成 int

# settings 是全局唯一的配置实例，整个项目从这里取配置，而不是到处 os.getenv
settings = Settings()
```

```python
# 别的文件里这样用，IDE 有补全、类型明确
from myproject.config import settings

print(settings.database_url)           # str
print(settings.debug)                  # bool，不是字符串 "true"
```

**为什么比裸 `os.getenv` 好**：配置项集中在一个类里一目了然；类型自动转换（`"8000"`→`8000`、`"true"`→`True`）；**必填项缺失会在启动瞬间报错**，而不是跑到用它的那行才崩——这正是你用 TS/zod 想要的「尽早暴露问题」。

**边界**：字段名默认**不区分大小写**地匹配环境变量（`database_url` 字段匹配 `DATABASE_URL`），这点和你手写 `os.getenv("DATABASE_URL")` 大小写敏感不同，别被绕到。

---

## 四、日志：为什么不能用 print

新手最大的坏习惯：调试全靠 `print`。前端你早就从 `console.log` 进化到分级日志（`console.warn` / `console.error`，或者 pino / winston）了，Python 也有标准的 `logging` 模块，**生产代码一律用它，别用 print**。

### print 和 logging 的差别（讲 WHY）

`print` 的问题不是「不能用」，而是：不能分级别（没法只看错误、屏蔽调试信息）、没有时间戳/来源、不能统一改输出去向（控制台 / 文件 / 远程）、上线后想关掉得逐个删。`logging` 把这些全解决了——这和你不会在生产代码里留一堆 `console.log` 是同一个道理。

| console（前端） | Python logging | 级别含义 |
|----------------|----------------|---------|
| `console.debug` | `logger.debug()` | 最啰嗦的调试细节 |
| `console.log` / `info` | `logger.info()` | 正常流程信息 |
| `console.warn` | `logger.warning()` | 警告，没崩但要注意 |
| `console.error` | `logger.error()` | 出错了 |
| （无） | `logger.critical()` | 致命错误 |

### 基本用法

```python
import logging                         # 标准库：日志

# basicConfig 配置「根日志器」：输出级别、格式
# level=INFO 表示 INFO 及以上（INFO/WARNING/ERROR/CRITICAL）才输出，DEBUG 被过滤掉
# format 里的占位符：时间 / 日志器名 / 级别 / 消息
# 注意：basicConfig 只在「根日志器还没被配置过」时生效一次，重复调用默认无效（见下方边界）
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

# logger 是当前模块专属的日志器，习惯用 __name__（模块名）命名
# WHY 用 __name__：日志里能看出消息来自哪个模块，且能按模块单独调级别
logger = logging.getLogger(__name__)

def create_user(name):                 # 用途：创建用户的示例函数
    # name 存待创建用户的名字
    logger.info("开始创建用户: %s", name)   # 用 %s 占位而非 f-string，见下方边界
    if not name:                       # 业务场景：名字为空属于非法输入，记一条警告
        logger.warning("用户名为空，已拒绝")
        return None
    logger.info("用户创建成功: %s", name)
    return {"name": name}
```

输出长这样（自带时间、来源、级别，print 给不了）：

```
2026-06-11 10:30:00,123 [myproject.api.users] INFO: 开始创建用户: imber
2026-06-11 10:30:00,124 [myproject.api.users] INFO: 用户创建成功: imber
```

### 写到文件 / 滚动日志

生产环境日志要落盘，且要防止单文件无限变大。用 `logging.handlers`：

```python
import logging
from logging.handlers import RotatingFileHandler   # 标准库：按大小滚动的文件处理器

# handler 决定「日志往哪写」。RotatingFileHandler：写文件，超过大小就切割旧文件
# maxBytes 单文件上限（这里 5MB），backupCount 最多保留几个历史文件
handler = RotatingFileHandler(
    "logs/app.log", maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
)
# formatter 决定每条日志「长什么样」，挂到 handler 上
handler.setFormatter(
    logging.Formatter("%(asctime)s [%(name)s] %(levelname)s: %(message)s")
)

logger = logging.getLogger("myproject")   # 取项目根日志器
logger.setLevel(logging.INFO)             # 设置最低输出级别
logger.addHandler(handler)                # 把文件处理器挂上去（可同时挂多个，如再加控制台）
```

**边界 1（高频踩坑）**：`logging.basicConfig` **只在根日志器尚未配置时生效一次**，第二次调用默认被忽略。很多人「日志配置没生效」就是因为别处（或某个库）已经先配过了。要么集中在程序入口配一次，要么用 `force=True` 强制覆盖。

**边界 2**：日志参数用 `logger.info("用户 %s 登录", name)` 这种**占位符 + 参数**的写法，别用 f-string（`f"用户 {name} 登录"`）。WHY：占位符写法只有在该级别真要输出时才做字符串拼接，DEBUG 级别被过滤时省掉拼接开销；这是 logging 的设计约定，和 print 直接传字符串不同。

---

## 五、入口文件：让项目「能被跑起来」

前端 `package.json` 里 `"main": "index.js"` 或 `scripts` 指定入口。Python 常见两种：

```python
# 方式一：src/myproject/main.py —— 普通入口脚本
def main():                            # 用途：程序真正的启动逻辑
    print("应用启动")

# 详见第 8 篇：只有「直接运行本文件」时 __name__ 才等于 "__main__"
# 业务场景：被别的模块 import 时不应自动跑起来，所以用这个判断包住
if __name__ == "__main__":
    main()
```

```python
# 方式二：src/myproject/__main__.py —— 让整个包可以用 python -m 运行
# WHY 用 __main__.py：放了它之后，python -m myproject 就会执行这里，
# 相当于给包定义了一个标准启动入口（类似 npm start 的约定入口）
from myproject.main import main

if __name__ == "__main__":
    main()
```

```bash
# 对应两种运行方式
python src/myproject/main.py      # 直接跑脚本
python -m myproject               # 以模块方式跑包（推荐，包路径解析更可靠，详见第 8 篇）
```

---

## 六、.gitignore：哪些东西绝不能进 git

前端你知道不提交 `node_modules` 和 `.env`。Python 要忽略的东西类似，但多了些 Python 特有的：

```gitignore
# 虚拟环境（≈ node_modules，体积大、可重建，绝不进库）
venv/
.venv/

# Python 编译缓存（运行时自动生成的字节码，无需提交）
__pycache__/
*.pyc

# 配置与密钥（≈ 前端的 .env，含敏感信息）
.env

# 日志、本地数据库
logs/
*.log
*.sqlite3

# IDE / 测试缓存
.idea/
.pytest_cache/
```

**边界**：`__pycache__/` 和 `.pyc` 是 Python 运行时自动生成的字节码缓存（CPython 把 `.py` 编译成字节码缓存下来加速下次启动），前端没有完全对应物——别看到陌生就去提交它，加进 `.gitignore` 忽略即可。

---

## 七、常见踩坑清单

1. **所有 `.py` 平铺在根目录**：小脚本无所谓，项目一大必乱。按 `api / services / models / utils` 分层，每个目录记得放 `__init__.py`（详见第 8 篇）。
2. **密钥硬编码进代码、甚至提交进 git**：API key、数据库密码一律走 `.env`，`.env` 必须 `.gitignore`，只提交 `.env.example` 模板。已经误提交的密钥要当作泄露处理（改掉它）。
3. **生产代码用 print 当日志**：换成 `logging`，分级别、带时间来源、可统一改去向。
4. **`logging.basicConfig` 配了没生效**：它只生效一次。集中在入口配，或用 `force=True`。
5. **配置散落各处 `os.getenv`**：集中到一个 `config.py` 的 `Settings` 类（pydantic-settings），类型安全、缺失早报错。
6. **src layout 下 import 不到自己的包**：src 布局需要先 `pip install -e .` 把包装成可编辑模式（≈ `npm link`）才能 import，这是它的特性不是 bug。

---

## 小结

把前端那套「配置和代码分离、源码进 `src/`、密钥进 `.env` 且不入库、用分级日志而非 console」的工程直觉原样搬到 Python 就对了八成。剩下两成是 Python 特有的拧劲：**依赖隔离要手动建 venv**、**配置文件是 TOML 格式的 `pyproject.toml`**、**日志用标准库 `logging` 且 `basicConfig` 只生效一次**、**src layout 要装包才能 import**。

✅ **该掌握**
- 标准目录分层（`src/包名/` + `api/services/models/utils`）和 `pyproject.toml` 的角色（≈ package.json）
- `.env` + `pydantic-settings` 做类型安全的集中配置，密钥不进 git
- `logging` 的级别、`getLogger(__name__)`、写文件用 `RotatingFileHandler`
- `if __name__ == "__main__":` 与 `__main__.py` + `python -m 包` 两种入口

⚠️ **易混淆**
- `pyproject.toml` 是 TOML 不是 JSON，别写大括号
- `logging.basicConfig` 只在根日志器未配置时生效一次，重复调用默认无效
- 日志用 `logger.info("%s", x)` 占位符而非 f-string（按级别延迟拼接）
- src layout 比 flat 更稳（暴露打包问题），但需先 `pip install -e .` 才能 import
