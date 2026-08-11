# Python（12）- 虚拟环境与依赖管理

> 前端世界里你几乎不操心环境隔离：每个项目一个 `node_modules`，天然互不干扰。Python 不是这样——默认所有项目共用一套全局解释器和全局包，A 项目要 Django 3、B 项目要 Django 5，全局只能装一个，立刻打架。这篇把「虚拟环境」这件 Python 必修课讲透，并把三套主流工具（venv / poetry / uv）和你熟悉的 npm 生态一一对上号。

# 一、先建立直觉：虚拟环境 ≈ 项目专属的 node_modules

**类比**：node 里你从不会想「这个包装到哪了」——因为它就在当前项目的 `node_modules/`，每个项目一份，互相隔离。Python 的**虚拟环境（virtual environment）** 就是手动给项目造一个这样的隔离盒子：里面有一份独立的包目录（`site-packages`，角色 ≈ `node_modules`），还顺带带一个指向某个 Python 解释器的副本。

```bash
# 在项目根目录建一个虚拟环境，生成一个 .venv 目录
# 这个目录 ≈ 项目专属的 node_modules + 一份 node 运行时
python -m venv .venv
```

建完之后，目录里大致是这样：

```
myproject/
├── .venv/                   # 隔离盒子（角色 ≈ node_modules + node 本体）
│   ├── bin/                 # 里面有这个环境专属的 python、pip（Windows 在 Scripts/）
│   └── lib/.../site-packages/   # 装进来的第三方包都在这（≈ node_modules 里的包）
├── main.py
└── requirements.txt         # 依赖清单（≈ package.json 的 dependencies）
```

**边界（这里和 node 不一样）**：`node_modules` 是**自动**按目录隔离的，你装包时 npm 自己就放对地方，你几乎无感。而 Python 的虚拟环境要你**手动建、而且手动「激活」**——不激活的话，`pip install` 会装到全局环境去，污染所有项目。这是前端转 Python 第一个反直觉的点：隔离不是默认的，是你自己开的。

---

# 二、为什么非要虚拟环境？（不像 node 可以省）

一句话：**Python 全局只有一套包目录，没有项目级隔离这个概念**。

| 场景 | node / npm | Python（不用虚拟环境） |
|------|-----------|----------------------|
| A 项目要 Django 3，B 要 Django 5 | 各自 `node_modules`，互不影响 | 全局只能装一个版本，必冲突 |
| 装了个测试用的包想删干净 | 删项目 `node_modules` 即可 | 全局 `pip install` 散落各处，难清理 |
| 给同事复现环境 | `npm install` 按 `package.json` 还原 | 全局环境混了无关包，说不清装了啥 |

所以在 Python 里，**「进任何项目先建/进虚拟环境」是和 `npm install` 同级的肌肉记忆**，不是可选项。

---

# 三、方案一：venv + pip（标准库自带，最基础）

`venv` 是 Python 3 内置模块，`pip` 是默认装包工具。这套组合**不用额外安装**，是最低保真的方案，对应 npm 最朴素的用法。

```bash
# 1. 建虚拟环境（.venv 是社区约定的目录名，类似默认就叫 node_modules）
python -m venv .venv

# 2. 激活：之后这个终端里的 python / pip 都指向 .venv 内部那一份
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows（PowerShell / CMD）

# 激活成功后，命令行提示符前会出现 (.venv) 字样

# 3. 装包，等价于 npm install lodash
pip install requests

# 4. 导出依赖清单（关键一步，等价于让 package.json 记下 dependencies）
pip freeze > requirements.txt

# 5. 退出虚拟环境（回到全局环境）
deactivate
```

别人拿到你的项目后，复现环境的流程（≈ `npm install`）：

```bash
python -m venv .venv                    # 先建自己的隔离盒子
source .venv/bin/activate               # 激活
pip install -r requirements.txt         # 按清单一键还原所有依赖
```

## 3.1 `requirements.txt` ≈ 半个 package.json

`pip freeze` 导出的清单长这样，一行一个包，`==` 锁死版本：

```text
requests==2.31.0
urllib3==2.1.0
certifi==2023.11.17
```

**边界（重要差异）**：`requirements.txt` 比 `package.json` 简陋很多。

| 能力 | package.json + package-lock.json | requirements.txt |
|------|----------------------------------|------------------|
| 区分「直接依赖」和「被依赖」 | 能（dependencies 只列你装的） | **不能**，`pip freeze` 把所有间接依赖也一锅端列出来 |
| 区分生产 / 开发依赖 | 能（dependencies vs devDependencies） | **原生不能**，得自己拆成两个文件 |
| 锁文件保证可复现 | 有 `package-lock.json` 自动维护 | 没有专门锁文件，`requirements.txt` 既当清单又当锁，手动维护 |

这正是 poetry / uv 出现的原因——它们补齐了 npm 早就有的这些能力。

---

# 四、方案二：poetry（≈ npm/yarn，统一管理）

`venv + pip` 的痛点：装包、记依赖、建环境是三件分开的事，还得手动 `pip freeze`。**poetry** 把它们合一，体验非常接近 `npm` / `yarn`：一个 `pyproject.toml` 当 `package.json`，一个 `poetry.lock` 当 `package-lock.json`，而且自动帮你管虚拟环境。

```bash
# 安装 poetry（一次性，装到全局工具链）
# 官方推荐用独立安装脚本，这里只示意命令存在，具体见官网
pip install poetry

# 在现有项目里初始化，交互式生成 pyproject.toml（≈ npm init）
poetry init

# 装包：自动建虚拟环境 + 装包 + 写进 pyproject.toml + 更新 poetry.lock
# 一条命令干完 venv 那边四条命令的活（≈ npm install requests）
poetry add requests

# 装开发依赖（≈ npm install --save-dev jest），单独归到 dev 组
poetry add --group dev pytest

# 按 lock 文件还原全部依赖（≈ npm install / npm ci）
poetry install

# 在虚拟环境里跑命令，不用手动 activate（≈ npx / npm run）
poetry run python main.py
```

`pyproject.toml` 里依赖部分长这样，和 `package.json` 神似：

```toml
[tool.poetry.dependencies]
python = "^3.11"          # 约束 Python 版本，类似 package.json 的 engines
requests = "^2.31.0"      # ^ 的语义和 npm 完全一致：允许小版本升级，锁住大版本

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"         # 开发依赖，类比 devDependencies
```

**对照表（poetry vs npm，几乎一一对应）**：

| npm / yarn | poetry | 说明 |
|-----------|--------|------|
| `package.json` | `pyproject.toml` | 项目 + 依赖清单 |
| `package-lock.json` | `poetry.lock` | 锁定确切版本，保证可复现 |
| `npm install x` | `poetry add x` | 加依赖 |
| `npm install -D x` | `poetry add --group dev x` | 加开发依赖 |
| `npm install` / `npm ci` | `poetry install` | 还原依赖 |
| `npm run` / `npx` | `poetry run` | 在环境里执行命令 |
| `^1.2.3` 版本语义 | `^1.2.3`（一模一样） | 都遵循 semver |

**边界**：poetry 自带版本求解器（resolver），会算出一组互相兼容的版本再写进 `poetry.lock`——这点和 npm 一样。但它历史上**求解速度偏慢**（依赖多时初次 install 可能等几十秒甚至更久），这也是下面 uv 的卖点。

---

# 五、方案三：uv（新一代，主打一个快）

**uv** 是用 Rust 写的新工具（来自 Astral，就是做 ruff 那家），目标是「一个工具搞定 venv + pip + poetry 全部职责」，最大特点是**快得离谱**（依赖求解和安装常比 pip/poetry 快一个数量级）。前端类比：你可以把它理解成 Python 界的 **pnpm/bun**——后来者，把前辈的活干得更快、体验更整合。

```bash
# 初始化项目（生成 pyproject.toml，≈ npm init / bun init）
uv init myproject

# 加依赖：自动建 .venv + 求解 + 安装 + 写 pyproject.toml + 更新 uv.lock
# 速度是这套流程最大的爽点（≈ pnpm add）
uv add requests

# 加开发依赖
uv add --dev pytest

# 按 uv.lock 还原全部依赖（≈ npm ci，确定性安装）
uv sync

# 在环境里跑脚本，无需手动激活（≈ npx）
uv run python main.py
```

uv 也用标准的 `pyproject.toml`，依赖声明遵循 PEP 621 标准格式：

```toml
[project]
name = "myproject"
version = "0.1.0"
requires-python = ">=3.11"     # 约束 Python 版本
dependencies = [
    "requests>=2.31.0",        # 运行时依赖
]
```

**对照表（uv vs 前端工具）**：

| 前端 | uv | 说明 |
|------|-----|------|
| `pnpm install` / `bun install` | `uv sync` | 确定性还原依赖 |
| `pnpm add x` | `uv add x` | 加依赖（自动更新 lock） |
| `npx cmd` | `uv run cmd` | 环境内执行 |
| 自动管理 node 版本（如 Volta） | `uv python install 3.12` | uv 还能直接帮你装/切 Python 版本 |
| `uv.lock` | （≈ pnpm-lock.yaml） | 锁文件 |

**边界**：uv 很新、迭代很快，部分老项目/老教程仍是 pip 或 poetry 的世界，遇到别人的项目要按对方用的工具来。但**新开项目**，社区现在普遍推荐直接上 uv——它把「建环境、装包、锁版本、管 Python 版本」全合并了，体验最顺。

---

# 六、三套方案怎么选？

| 维度 | venv + pip | poetry | uv |
|------|-----------|--------|-----|
| 是否要额外装工具 | 否（标准库自带） | 是 | 是 |
| 自动管虚拟环境 | 否（手动建+激活） | 是 | 是 |
| 有锁文件保证可复现 | 弱（手动 freeze） | 是（poetry.lock） | 是（uv.lock） |
| 区分生产/开发依赖 | 手动拆文件 | 是 | 是 |
| 速度 | pip 一般 | 偏慢 | 极快 |
| 前端类比 | 最朴素的 npm | npm / yarn | pnpm / bun |

**给前端新手的实用建议**：
- **看懂别人项目**：先认 venv + pip，因为存量项目最多，`requirements.txt` 满地都是。
- **自己开新项目**：直接上 **uv**，体验最接近你熟悉的现代前端工具链，少踩坑。
- poetry 处在中间，了解即可——很多公司存量项目在用，但新项目正被 uv 取代。

---

# 七、激活到底改了什么？（揭开「activate」的神秘面纱）

新手最懵的就是 `source .venv/bin/activate` 这行——它看起来像魔法。其实原理很朴素，理解了就不慌。

**类比**：你在 node 里敲 `node` 或 `npx`，shell 是顺着环境变量 `PATH` 去找可执行文件的。`activate` 干的事，就是**临时把虚拟环境的 `bin` 目录塞到 `PATH` 最前面**。

```bash
source .venv/bin/activate

# 激活后验证：python 和 pip 都指向了 .venv 内部那一份
which python        # 输出类似 /你的项目/.venv/bin/python（不再是全局的）
which pip           # 同理指向 .venv 内部
```

所以「激活」= 让这个终端窗口的 `python` / `pip` 临时改指向隔离环境内部那一份。`deactivate` 就是把 `PATH` 改回去。**它只影响当前这个终端会话**——开个新终端就得重新激活。

**边界（高频踩坑）**：忘了激活就 `pip install`，包会装到**全局**，然后你在项目里 `import` 却时灵时不灵（取决于你在哪个终端运行）。判断标准很简单：命令行提示符前**有没有 `(.venv)` 前缀**。没有就是没激活。

> 顺带说一句：poetry 和 uv 用 `poetry run` / `uv run` 时**不需要手动激活**——它们临时帮你切好环境再执行命令，类似 `npx` 的体验。这也是它们比裸 venv 省心的地方。

---

# 八、和「全局工具」的关系（别把项目依赖装全局）

前端有个区分：项目依赖装进 `node_modules`，而像 `create-react-app`、`vercel` 这种**命令行工具**你可能 `npm install -g` 装全局。Python 也有类似区分，但有个专门工具值得一提。

```bash
# 反例：把命令行工具直接 pip install 到全局或某个项目环境
# 问题：不同工具的依赖可能互相打架，污染环境（类似全局 npm 包版本冲突）

# 正解：用 pipx 装「全局可用的命令行工具」，它给每个工具单独建隔离环境
# 角色 ≈ npm install -g，但每个工具互不干扰
pipx install ruff       # 装代码检查工具 ruff，全局可用又互相隔离
```

记住一条原则：**项目用到的库 → 装进项目虚拟环境；纯命令行工具 → 用 pipx（或 uv tool）装全局**。别把项目依赖塞全局，也别把全局工具塞进每个项目。

---

# 九、常见踩坑清单

1. **忘激活就装包**：包装到全局，项目里时而能 import 时而不能。先看提示符有没有 `(.venv)`。
2. **把 `.venv/` 提交进 Git**：它是本地生成物（≈ `node_modules`），**必须写进 `.gitignore`**，只提交 `requirements.txt` / `pyproject.toml` + lock 文件。
3. **`requirements.txt` 没区分直接/间接依赖**：`pip freeze` 会列出一长串间接依赖，看不出你到底主动装了啥。想要清晰区分就上 poetry/uv。
4. **换台机器版本对不上**：只有 `requirements.txt` 用 `==` 锁死、或有 lock 文件，才能严格复现；松散的版本范围在新机器上可能装到新版本而出问题。
5. **混用工具**：一个项目又 `pip install` 又 `poetry add`，会导致清单和实际装的对不上。一个项目认准一套工具用到底。
6. **以为 venv 隔离了 Python 版本本身**：`python -m venv` 用的是你**当前那个** python 建的环境，它不帮你装新版本 Python。要切 Python 版本得靠 pyenv，或直接用 uv（`uv python install`）。

---

# 十、总结

Python 没有 node 那种「每个项目自动隔离」的福利，所以**虚拟环境是必修而非可选**：它就是项目专属的 `node_modules`，但要你手动建、手动激活。工具链有三档——`venv + pip`（标准库自带，最朴素的 npm）、`poetry`（≈ npm/yarn，统一管理 + lock）、`uv`（≈ pnpm/bun，最快最整合）。新项目直接上 uv，存量项目认 venv + pip。

✅ **该掌握**
- 为什么必须用虚拟环境：Python 全局只有一套包目录，没有项目级隔离
- venv 三连：`python -m venv .venv` → `source .venv/bin/activate` → `pip install`
- `requirements.txt` / `pyproject.toml` 对应 `package.json`；lock 文件对应 `package-lock.json`
- poetry / uv 命令与 npm/pnpm 的一一对应（add / install / run / sync）
- 激活的本质：临时改 `PATH`，让 `python`/`pip` 指向环境内部那一份

⚠️ **易混淆**
- 虚拟环境隔离的是**包**，不是 **Python 版本本身**（换版本要 pyenv / uv）
- `requirements.txt` ≠ `package.json`：不区分直接/间接依赖，原生不分生产/开发
- `.venv/` 是本地生成物，**绝不提交 Git**（和 `node_modules` 一样进 `.gitignore`）
- 项目依赖装进虚拟环境；命令行工具用 pipx / uv tool 装全局，别混

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“Python（12）- 虚拟环境与依赖管理”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。
