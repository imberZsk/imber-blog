# LangChain 实战（70）- Nest + LangChain 实现基于 SSE 的流式 ai 接口

> 读完你能：把 LangChain chain 接进 Nest 后端，并用 SSE 给前端提供流式响应。

# 一、本篇定位

这是前后端工程化篇，衔接 13 流式响应、16 前端调用 AI 接口和 35 LangChain。

# 二、一个真实场景

AI 接口一次性等完整回答再返回，用户会觉得卡。SSE 可以让首 token 先出来，前端边收边展示。Nest 负责 HTTP 层，LangChain 负责模型/chain 层，两者组合就是企业项目里常见的 AI 后端形态。

# 三、核心拆解

- SSE 是服务端持续向浏览器推送文本事件的协议，适合模型流式 token。它比 WebSocket 简单，问答类场景通常足够。
- Nest Controller 负责设置响应头和事件格式，Service 负责调用 LangChain 的 stream 接口。
- 流式接口也要处理错误、取消、超时和结束事件，不能只顾正常 token。

# 四、工程链路

- 前端发起提问。
- Nest 建立 SSE 响应。
- Service 调用 chain.stream。
- 每个 chunk 转成 data 事件推给前端。
- 结束时发送 done 事件。
- 异常时发送 error 事件并关闭连接。

# 五、落地建议

- 事件类型建议分 token、metadata、error、done。
- 请求里带 conversationId，方便服务端关联上下文。
- 用户取消时要中断模型调用，避免后台继续烧 token。

# 六、常见坑

- 只推 token，不推结束事件，前端 loading 一直转。
- 错误直接断连，前端不知道发生什么。
- SSE 后面挂了代理却没关闭缓冲，导致不再实时。

# 七、和已有主线的关系

13 讲流式原理，16 讲前端调用；70 把它们放进 Nest + LangChain 的实际接口。

# 八、复述答法

> Nest + LangChain 的流式接口通常用 SSE：Controller 建连接，Service 调 chain.stream，把 token、error、done 分事件推给前端。工程上要处理取消、超时、代理缓冲和结束事件，否则体验会卡或 loading 不收尾。

# 九、总结

- **核心拆解**：SSE 是服务端持续向浏览器推送文本事件的协议，适合模型流式 token。
- **工程链路**：Service 调用 chain.stream。
- **常见坑**：只推 token，不推结束事件，前端 loading 一直转。
- **本篇定位**：这是前后端工程化篇，衔接 13 流式响应、16 前端调用 AI 接口和 35 LangChain。

## 十、最小可运行示例：SSE 流式接口契约

~~~text
# requirements.txt
fastapi
uvicorn
~~~

~~~python
from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.responses import StreamingResponse


# FastAPI 应用用于演示与 Nest 相同的 SSE 协议边界。
app = FastAPI()


async def generate_events() -> AsyncIterator[str]:
    """生成结构化 SSE；每条事件都有显式类型。"""

    # 教学增量模拟模型流输出。
    deltas = ["退款", "三日", "到账"]
    for delta in deltas:
        # SSE data 使用 JSON，前端不解析自由文本协议。
        payload = json.dumps({"event": "delta", "text": delta}, ensure_ascii=False)
        yield f"data: {payload}\n\n"
        await asyncio.sleep(0.05)
    # done 事件让前端可靠结束加载态。
    done_payload = json.dumps({"event": "done"})
    yield f"data: {done_payload}\n\n"


@app.get("/chat")
async def chat() -> StreamingResponse:
    """返回 SSE 响应；断连取消应在真实模型适配器中继续下传。"""

    return StreamingResponse(generate_events(), media_type="text/event-stream")
~~~

运行 uvicorn app:app --reload。Nest 实现应保持相同的事件 Schema、心跳、错误事件和取消语义；不要只把 Token 字符串直接拼到响应里。

## 参考资料

- [LangChain 文档](https://docs.langchain.com/oss/python/langchain/overview)
- [Dify 文档](https://docs.dify.ai/)
