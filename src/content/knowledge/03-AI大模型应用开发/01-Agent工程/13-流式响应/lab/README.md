# 13 流式响应 demo

用 Python 生成器模拟大模型的 token 流，做出打字机效果，并展示 SSE 事件的真实报文格式、以及「停止生成」怎么中断。终端里能直接看到字一个个蹦出来。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库。终端运行时场景 1 和 3 有逐字动画，下面是去掉动画后的最终输出。

## 预期输出

```
=== 场景 1：打字机效果（逐 token 显示）===
助手：报销需在费用产生后 30 天内提交，附发票和审批单。
（流结束，后端拿到完整答案落库：报销需在费用产生后 30 天内提交，附发票和审批单。）

=== 场景 2：底层 SSE 事件长什么样（前 3 个 token + done）===
'event: token\ndata: 报\n\n'
'event: token\ndata: 销\n\n'
'event: token\ndata: 需\n\n'
'event: done\ndata: {"finish_reason":"stop"}\n\n'

=== 场景 3：中途停止生成（用户不想等了）===
助手：报销需在费用产生 [用户点击停止生成]
（已生成部分被保留：报销需在费用产生）
```

场景 2 用 `repr` 把换行符显出来，能看清 SSE 的格式：`event:` 一行、`data:` 一行、空行收尾。前端 `EventSource` 就靠这个结构分发事件。

## 代码↔概念对应

| 概念 | 在 main.py 哪里 |
|---|---|
| 用生成器模拟 token 流（边生成边产出） | `stream_tokens` |
| SSE 事件格式（event/data/空行） | `to_sse_event` |
| 打字机渲染：收到一个 token 就追加显示 | `typewriter` |
| 流结束后拼成完整答案（落库） | `typewriter` 的返回值 |
| 中途停止生成 + 保留已生成部分 | `stream_with_stop` |

## 动手改

- 把 `stream_tokens` 的 `delay` 调大到 0.2，打字机效果更明显；调成 0 就是「秒回」。
- 把 `FULL_ANSWER` 换成多行长文本，观察打字机怎么逐行铺开。
- 真实项目里 `stream_tokens` 换成模型 API 的 `stream=True` 返回的迭代器，`to_sse_event` 那套格式原样可用，前端代码不用动。
