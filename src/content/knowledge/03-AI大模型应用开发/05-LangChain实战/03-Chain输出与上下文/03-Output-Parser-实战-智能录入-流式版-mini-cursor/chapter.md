# LangChain 实战（65）- Output Parser 实战：智能录入 + 流式版 mini cursor

> 读完你能：用结构化输出解决智能录入，并理解流式输出下解析状态如何管理。

# 一、本篇定位

这是 64 的实战篇，把 parser 放进真实交互：一边生成，一边展示，一边最终校验。

# 二、一个真实场景

用户输入“明天下午三点提醒我给小王发合同”，系统要抽取时间、对象、动作、备注，并填进表单。体验上用户希望马上看到模型在处理，工程上你又必须等完整结构化结果校验通过后才能真正创建任务。

# 三、核心拆解

- 智能录入不是把用户原话塞进一个字段，而是把自然语言转成业务表单。字段缺失、歧义和非法值都要处理。
- 流式输出适合展示推理进度或草稿，但结构化提交必须以最终完整 JSON 为准。
- parser 的职责是把模型输出转成 typed data，业务层再决定是否自动填充、提示确认或要求补充信息。

# 四、工程链路

- 前端收到用户自然语言。
- 后端请求模型按 schema 抽取字段。
- 流式阶段展示“正在识别时间/对象/动作”。
- 最终 JSON 到达后 parser 校验。
- 字段完整则填表并等待用户确认。
- 字段缺失则追问。

# 五、落地建议

- 所有自动写入前都要显示给用户确认。
- 时间字段要标准化成 timezone-aware 时间。
- 解析失败时保留原文，方便用户手动改。

# 六、常见坑

- 边流式边执行动作，JSON 还没完整就创建任务。
- 模型抽取到“明天”却没有结合用户时区。
- 字段缺失时硬猜，导致错误录入。

# 七、和已有主线的关系

64 讲 parser/tool 取舍；65 落到智能录入和流式交互，是 13 流式响应和 12 结构化输出的组合实践。

# 八、复述答法

> 智能录入要把自然语言变成业务字段。流式阶段可以提升体感，但最终执行必须等完整 JSON 解析和业务校验通过。字段完整后也应让用户确认，字段缺失就追问，而不是让模型硬猜。

# 九、总结

- **核心拆解**：智能录入不是把用户原话塞进一个字段，而是把自然语言转成业务表单。
- **工程链路**：后端请求模型按 schema 抽取字段。
- **常见坑**：边流式边执行动作，JSON 还没完整就创建任务。
- **本篇定位**：这是 64 的实战篇，把 parser 放进真实交互：一边生成，一边展示，一边最终校验。

## 十、最小可运行示例：解析流式 JSONL

~~~text
# requirements.txt
pydantic>=2,<3
~~~

~~~python
from __future__ import annotations

import json
from collections.abc import Iterable
from typing import Literal

from pydantic import BaseModel


class StreamEvent(BaseModel):
    """定义前后端共享的流事件契约。"""

    # 事件类型决定 UI 的增量更新方式。
    event: Literal["delta", "citation", "done", "error"]
    # 当前事件负载保持为结构化字典。
    data: dict[str, object]


def parse_jsonl(chunks: Iterable[bytes]) -> list[StreamEvent]:
    """解析任意边界的字节块；chunks 是网络层分段数据。"""

    # 未形成完整行的字节缓冲区。
    buffer = b""
    # 已通过 Schema 校验的事件列表。
    events: list[StreamEvent] = []
    for chunk in chunks:
        buffer += chunk
        while b"\n" in buffer:
            # 一行是一个独立 JSON 事件，剩余数据继续留在缓冲区。
            line, buffer = buffer.split(b"\n", 1)
            if line:
                events.append(StreamEvent.model_validate(json.loads(line)))
    if buffer.strip():
        raise ValueError("stream ended with an incomplete JSON line")
    return events
~~~

不要把网络 chunk 当作完整 JSON。客户端按协议事件边界增量解析，错误事件也使用同一 Schema，才能恢复重试并保留已接收内容。
