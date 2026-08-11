# Agent 工程（82）- DeepAgents：开箱即用的 skill、上下文压缩等 middleware

> 读完你能：理解 DeepAgents 这类高层框架封装了哪些 Agent 常见能力，以及何时适合使用。
> 来源：`吃透 AI Agent 开发` 截图目录第 30 篇，2026/05/23
> 导入与重写日期：2026/07/07

# 一、本篇定位

这是框架回看篇：在学过 Tool、Memory、RAG、Graph 后，再看高层封装才不容易被名词带跑。

# 二、一个真实场景

你想做一个深度研究 Agent，不想从零实现任务拆解、文件工作区、上下文压缩、技能加载和多轮执行。DeepAgents 这类框架把常见 middleware 打包好，让你更快搭出复杂 Agent。

# 三、核心拆解

- Skill 是可复用能力包，通常包含说明、示例、工具和领域知识。它让 Agent 在需要时加载特定能力，而不是把所有知识塞进 system prompt。
- 上下文压缩 middleware 负责在历史变长时保留关键状态，减少 token 和上下文污染。
- 高层框架的价值是快，但代价是黑盒。你仍要知道底层 tool、memory、state、trace 如何工作，才能排查问题。

# 四、工程链路

- 选定任务类型。
- 加载相关 skills。
- 配置可用工具和权限。
- 启用上下文压缩。
- 运行 Agent 并观察 trace。
- 把稳定能力沉淀成自定义 skill。

# 五、落地建议

- 先用框架跑通探索版，再把关键链路拆出来理解。
- 高风险工具不要因为框架封装就默认放开。
- 压缩前后的上下文要可查看，避免重要信息被吃掉。

# 六、常见坑

- 只会调用框架，不知道出错在哪层。
- 把所有 skill 都加载进去，反而干扰模型。
- 上下文压缩不可观测，压坏了也不知道。

# 七、和已有主线的关系

82 是对前面能力的高层封装观察，83 会用它做多 Agent 调研助手。

# 八、复述答法

> DeepAgents 这类框架把 skill、上下文压缩、工具执行等 Agent 常见能力封装好，适合快速搭复杂任务。但它不是替代底层理解，权限、trace、压缩效果和工具边界仍要自己检查。

# 九、总结

- **核心拆解**：Skill 是可复用能力包，通常包含说明、示例、工具和领域知识。
- **工程链路**：运行 Agent 并观察 trace。
- **常见坑**：只会调用框架，不知道出错在哪层。
- **本篇定位**：这是框架回看篇：在学过 Tool、Memory、RAG、Graph 后，再看高层封装才不容易被名词带跑。

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“Agent 工程（82）- DeepAgents：开箱即用的 skill、上下文压缩等 middleware”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。

## 十、最小可运行示例：上下文压缩中间件

~~~text
# requirements.txt
# Python 3.10+ 标准库，无第三方依赖。
~~~

~~~python
from __future__ import annotations

from dataclasses import dataclass


# 压缩后保留的最近消息数量。
RECENT_MESSAGE_LIMIT = 6


@dataclass(frozen=True)
class Message:
    """保存一条角色消息。"""

    role: str
    content: str


def compress_context(messages: list[Message], summary: str) -> list[Message]:
    """组合历史摘要和最近窗口；messages 是全量消息，summary 是可信摘要。"""

    # 最近窗口保留工具结果与用户纠正，不做二次生成。
    recent_messages = messages[-RECENT_MESSAGE_LIMIT:]
    # 摘要作为系统可识别的上下文，不伪装成用户原话。
    summary_message = Message(role="system", content=f"历史摘要：{summary}")
    return [summary_message, *recent_messages]
~~~

压缩前保存可审计原始记录，摘要标注模型版本和来源区间。权限、未完成工具调用和用户最新纠正不能被摘要吞掉；压缩质量要进入长对话回归集。
