# 04 Python 环境配置 demo

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

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“04 Python 环境配置 demo”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
