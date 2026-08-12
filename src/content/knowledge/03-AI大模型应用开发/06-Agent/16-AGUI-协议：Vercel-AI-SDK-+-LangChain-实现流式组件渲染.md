# Agent（16） - AGUI 协议：Vercel AI SDK + LangChain 实现流式组件渲染

> 读完你能：理解 Agent 不只能流式输出文字，也可以流式驱动前端组件状态。

# 一、本篇定位

这是前端 AI 交互进阶篇，把 46 前端 AI Copilot 组件推到更结构化的协议层。

# 二、一个真实场景

用户让 Agent “帮我生成一张订单分析看板”。如果只输出文字，前端还要猜怎么渲染。更好的方式是模型/后端流式发出结构化 UI 事件：创建卡片、更新图表数据、标记加载完成。AGUI 类协议解决的就是文本和组件之间的桥。

# 三、核心拆解

- 传统 stream 是 token 流；组件渲染需要事件流。事件可以是 text_delta、component_open、props_patch、tool_status、done。
- Vercel AI SDK 擅长前端流式消费和状态管理，LangChain 负责后端 chain/tool 编排，二者之间需要统一事件协议。
- 组件事件必须有 schema。前端只接受白名单组件和字段，不能让模型随意生成可执行代码。

# 四、工程链路

- 用户发起请求。
- 后端 chain 生成文本和工具事件。
- 事件转换成 AGUI 风格消息。
- 前端按事件更新组件树。
- 工具结果到达后 patch props。
- done 后锁定最终状态。

# 五、落地建议

- 只允许渲染预置组件，如表格、图表、表单、状态卡。
- 组件 props 要做类型校验。
- 事件流要能重放，方便调试 UI 生成过程。

# 六、常见坑

- 让模型直接生成 HTML/JS。
- 事件没有版本，前后端一改就不兼容。
- 组件状态和文本回答分离，用户看不懂发生了什么。

# 七、和已有主线的关系

46 是前端 Copilot 基础，74 讲协议化组件流，是更接近产品形态的 Agent UI。

# 八、复述答法

> AGUI 类思路是把 AI 输出从 token 流升级成事件流：文本、工具状态、组件创建、props 更新都结构化传给前端。前端只渲染白名单组件并校验 props，不能让模型直接输出任意代码。

# 九、总结

- **核心拆解**：传统 stream 是 token 流；
- **工程链路**：后端 chain 生成文本和工具事件。
- **常见坑**：让模型直接生成 HTML/JS。
- **本篇定位**：这是前端 AI 交互进阶篇，把 46 前端 AI Copilot 组件推到更结构化的协议层。

## 十、最小可运行示例：AG-UI 事件生成器

~~~text
# requirements.txt
pydantic>=2,<3
~~~

~~~python
from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Literal

from pydantic import BaseModel


class AgentEvent(BaseModel):
    """定义 Agent 后端与 UI 之间的稳定事件。"""

    # 事件类型决定前端更新消息、工具或状态组件。
    event: Literal["run_started", "text_delta", "tool_started", "tool_finished", "run_finished"]
    # 事件负载使用结构化对象，不在字符串中私定义分隔符。
    data: dict[str, object]


def stream_run() -> Iterator[str]:
    """输出换行分隔 JSON 事件，可接入 SSE 或 WebSocket。"""

    # 教学事件序列覆盖运行、工具和结束状态。
    events = [
        AgentEvent(event="run_started", data={"run_id": "run-1"}),
        AgentEvent(event="tool_started", data={"tool": "search", "call_id": "call-1"}),
        AgentEvent(event="tool_finished", data={"call_id": "call-1", "status": "ok"}),
        AgentEvent(event="text_delta", data={"text": "已找到资料"}),
        AgentEvent(event="run_finished", data={"status": "completed"}),
    ]
    for event in events:
        yield json.dumps(event.model_dump(), ensure_ascii=False) + "\n"
~~~

前端只根据事件 Schema 渲染，不能猜模型文本含义。事件必须带 run_id、call_id、顺序号和可恢复状态；重连后从最后确认序号继续，避免重复工具卡片。

## 参考资料

- [LangChain Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [LangGraph 文档](https://docs.langchain.com/oss/python/langgraph/overview)
