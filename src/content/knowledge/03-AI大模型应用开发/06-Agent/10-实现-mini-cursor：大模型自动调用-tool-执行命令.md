# Agent（10） - 实现 mini cursor：大模型自动调用 tool 执行命令

> 读完你能：把读文件升级成“读、判断、执行命令、观察结果”的 mini coding agent，并理解命令执行为什么必须收紧。

# 一、本篇定位

这是从单工具到多步工具循环的过渡篇。它解释 Cursor 类产品为什么不是一次模型调用，而是一个可中断、可审计的行动循环。

# 二、一个真实场景

用户说“帮我跑一下这个项目的测试并修掉错误”。模型需要先读 package.json，判断测试命令，再执行 npm test，看报错，再决定读哪个文件。这里的核心不是会不会跑命令，而是每一步都要在工具结果基础上继续决策。

# 三、核心拆解

- mini cursor 至少需要三个工具：读文件、列目录、执行安全命令。模型通过多轮 tool call 把任务拆成小步。
- 执行命令是高风险工具，必须做白名单、工作目录限制、超时、输出截断和用户确认。
- 循环要有停止条件。达到最大步数、连续失败、命令超时、输出异常时都要停下来，让用户接管。

# 四、工程链路

- 读取项目清单。
- 选择低风险命令，比如 npm test 或 npm run build。
- 执行命令并收集 stdout、stderr、exitCode。
- 根据报错定位文件。
- 给出修改建议或进入下一轮工具调用。

# 五、落地建议

- 命令工具先只允许读类和验证类命令。
- 输出超过阈值时只保留头尾和错误摘要。
- 每次命令调用都记录 command、cwd、duration、exitCode，方便复盘。

# 六、常见坑

- 允许模型执行任意 shell。
- 没有超时，命令卡住导致整个 Agent 卡死。
- 把一大坨日志完整塞回模型，造成上下文污染。

# 七、和已有主线的关系

54 解决单个工具调用；55 引入多步循环和命令执行安全，是 30 多工具 Agent 的进阶实践。

# 八、复述答法

> mini cursor 的本质是 tool loop：模型读文件、选命令、看结果、再决定下一步。真正危险的是命令执行，所以后端必须白名单、限目录、限时、截断输出，并设置最大步数和失败停止条件。

# 九、总结

- **核心拆解**：mini cursor 至少需要三个工具：读文件、列目录、执行安全命令。
- **工程链路**：选择低风险命令，比如 npm test 或 npm run build。
- **常见坑**：没有超时，命令卡住导致整个 Agent 卡死。
- **本篇定位**：这是从单工具到多步工具循环的过渡篇。

## 十、最小可运行示例：命令 Tool 白名单

~~~text
# requirements.txt
# Python 3.10+ 标准库，无第三方依赖。
~~~

~~~python
from __future__ import annotations

import subprocess
from pathlib import Path


# 模型只允许选择完整参数模板，不能提交任意 shell 字符串。
ALLOWED_COMMANDS = {
    "git_status": ["git", "status", "--short"],
    "list_files": ["rg", "--files"],
}
# 每次命令最长执行秒数。
COMMAND_TIMEOUT_SECONDS = 5


def run_command(command_name: str, workspace: Path) -> str:
    """执行白名单命令；command_name 是稳定动作名，workspace 是受控目录。"""

    # 白名单返回参数数组，避免经过 shell 解析。
    command = ALLOWED_COMMANDS.get(command_name)
    if command is None:
        raise PermissionError("command is not allowed")
    # 子进程结果限制超时并捕获输出，不使用 shell=True。
    result = subprocess.run(
        command,
        cwd=workspace.resolve(strict=True),
        capture_output=True,
        text=True,
        timeout=COMMAND_TIMEOUT_SECONDS,
        check=False,
    )
    return (result.stdout + result.stderr)[:20_000]
~~~

写入、删除、网络访问和包安装不应默认开放。涉及副作用的动作增加人工确认、幂等键、资源限额与审计记录。

## 参考资料

- [LangChain Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [LangGraph 文档](https://docs.langchain.com/oss/python/langgraph/overview)
