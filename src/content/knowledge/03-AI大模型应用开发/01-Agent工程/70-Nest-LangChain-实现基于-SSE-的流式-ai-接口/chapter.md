# Nest + LangChain 实现基于 SSE 的流式 ai 接口

> 读完你能：把 LangChain chain 接进 Nest 后端，并用 SSE 给前端提供流式响应。
> 来源：`吃透 AI Agent 开发` 截图目录第 18 篇，2026/03/08，可试读 8%
> 导入与重写日期：2026/07/07

## 本篇定位

这是前后端工程化篇，衔接 13 流式响应、16 前端调用 AI 接口和 35 LangChain。

## 一个真实场景

AI 接口一次性等完整回答再返回，用户会觉得卡。SSE 可以让首 token 先出来，前端边收边展示。Nest 负责 HTTP 层，LangChain 负责模型/chain 层，两者组合就是企业项目里常见的 AI 后端形态。

## 核心拆解

- SSE 是服务端持续向浏览器推送文本事件的协议，适合模型流式 token。它比 WebSocket 简单，问答类场景通常足够。
- Nest Controller 负责设置响应头和事件格式，Service 负责调用 LangChain 的 stream 接口。
- 流式接口也要处理错误、取消、超时和结束事件，不能只顾正常 token。

## 工程链路

- 前端发起提问。
- Nest 建立 SSE 响应。
- Service 调用 chain.stream。
- 每个 chunk 转成 data 事件推给前端。
- 结束时发送 done 事件。
- 异常时发送 error 事件并关闭连接。

## 落地建议

- 事件类型建议分 token、metadata、error、done。
- 请求里带 conversationId，方便服务端关联上下文。
- 用户取消时要中断模型调用，避免后台继续烧 token。

## 常见坑

- 只推 token，不推结束事件，前端 loading 一直转。
- 错误直接断连，前端不知道发生什么。
- SSE 后面挂了代理却没关闭缓冲，导致不再实时。

## 和已有主线的关系

13 讲流式原理，16 讲前端调用；70 把它们放进 Nest + LangChain 的实际接口。

## 复述答法

> Nest + LangChain 的流式接口通常用 SSE：Controller 建连接，Service 调 chain.stream，把 token、error、done 分事件推给前端。工程上要处理取消、超时、代理缓冲和结束事件，否则体验会卡或 loading 不收尾。
