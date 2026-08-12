# Agent 工程（54）- 从 Tool 开始：让大模型自动调用工具读文件

> 读完你能：理解 Tool Calling 的最小闭环，并知道为什么读文件这类简单工具也必须做边界控制。

# 一、本篇定位

这是工具系统的第一篇，目标不是炫技，而是把“模型提出调用，后端执行工具”的边界刻进脑子里。

# 二、一个真实场景

用户说“帮我总结这个项目的 README”，模型本身不能直接访问你的磁盘。如果你把文件读取能力封装成工具，模型就可以先判断需要读哪个文件，再让后端执行读取，最后基于文件内容总结。这个过程看似简单，却已经包含 Agent 工具系统的全部骨架。

# 三、核心拆解

- Tool 的本质是一个带名字、描述和参数 schema 的后端函数。模型看到 schema 后，只能生成“我想调用 read_file，参数是 path=README.md”这样的调用意图。
- 真正的文件读取永远发生在后端。后端要校验路径是否在允许目录内、文件是否存在、大小是否超过限制、内容是否能安全返回。
- 工具结果要回填给模型，作为新的上下文。模型基于观察结果继续生成总结，而不是凭空猜文件内容。

# 四、工程链路

- 定义工具：read_file(path)。
- 把工具名、用途、参数格式传给模型。
- 模型返回工具调用意图。
- 后端校验路径和权限后读取文件。
- 把读取结果作为 tool result 放回 messages。
- 模型输出面向用户的总结。

# 五、落地建议

- 文件工具要默认只读，先别给写入和删除能力。
- 路径参数要做规范化，避免 ../../ 逃逸到项目外。
- 大文件要截断或分页读取，防止一次塞爆上下文。

# 六、常见坑

- 让模型直接决定真实路径并无校验执行。
- 工具描述太含糊，导致模型不知道什么时候该用。
- 把文件全文无脑塞给模型，既贵又容易淹没重点。

# 七、和已有主线的关系

28 讲 Function Calling 基础；54 用“读文件”把它落成可执行的最小 Agent 动作。

# 八、复述答法

> Tool Calling 的关键边界是：模型只提出调用意图，后端负责校验和执行。读文件工具也要限制目录、限制大小、记录 trace，执行结果再回填给模型。这样模型才是真的基于文件回答，而不是假装看过文件。

# 九、总结

- **核心拆解**：Tool 的本质是一个带名字、描述和参数 schema 的后端函数。
- **工程链路**：定义工具：readfile(path)。
- **常见坑**：让模型直接决定真实路径并无校验执行。
- **本篇定位**：这是工具系统的第一篇，目标不是炫技，而是把“模型提出调用，后端执行工具”的边界刻进脑子里。

## 十、最小可运行示例：受限文件 Tool

~~~text
# requirements.txt
# Python 3.10+ 标准库，无第三方依赖。
~~~

~~~python
from __future__ import annotations

from pathlib import Path


# Tool 只能访问此目录，生产值应由服务端配置。
WORKSPACE_ROOT = Path("docs").resolve()
# 单次读取上限，避免文件撑爆模型上下文。
MAX_FILE_BYTES = 128 * 1024


def read_file(relative_path: str) -> str:
    """读取工作区内文本；relative_path 是模型提交的相对路径。"""

    # 解析符号链接和父目录后得到真实目标路径。
    target_path = (WORKSPACE_ROOT / relative_path).resolve(strict=True)
    if target_path.parent != WORKSPACE_ROOT or target_path.suffix not in {".md", ".txt"}:
        raise PermissionError("path is outside the allowed text workspace")
    # 文件大小在读取前检查，避免一次分配过多内存。
    file_size = target_path.stat().st_size
    if file_size > MAX_FILE_BYTES:
        raise ValueError("file is too large")
    return target_path.read_text(encoding="utf-8", errors="strict")
~~~

验收时覆盖正常文件、相对路径逃逸、绝对路径、符号链接、超大文件和非法后缀。模型只能提交相对路径，用户权限仍需在服务端映射到允许的文档集合。
