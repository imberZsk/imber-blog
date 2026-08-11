# 10 大模型 API 基础 demo

用一个离线的 mock chat API 讲清三件事：**message 的角色结构**、**token 怎么估算**、**多轮上下文为什么越聊越贵**。没有真实模型，无需 API Key。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库。

## 预期输出

```
=== 场景 1：单轮问答（system + user） ===
  [system   ] 你是某公司的内部制度助手，只依据公司资料回答。
  [user     ] 你是谁？
  -> 模型回复：我是某公司的内部制度助手，可以回答公司制度相关问题。（低 temperature：回答更确定、可复现）
  -> token 账单：{"input_tokens": 26, "output_tokens": 38, "total_tokens": 64}

=== 场景 2：带历史的多轮（上下文累加，token 变多） ===
  [system   ] 你是某公司的内部制度助手，只依据公司资料回答。
  [user     ] 你是谁？
  [assistant] 我是某公司的内部制度助手，可以回答公司制度相关问题。（低 temperature：回答更确定、可复现）
  [user     ] 报销要几天内提交？
  -> 模型回复：报销需在费用产生后 30 天内提交，附发票和审批单。（低 temperature：回答更确定、可复现）
  -> token 账单：{"input_tokens": 73, "output_tokens": 35, "total_tokens": 108}

=== 场景 3：高 temperature（输出更发散，无稳定性提示） ===
  [system   ] 你是某公司的内部制度助手，只依据公司资料回答。
  [user     ] 报销要几天内提交？
  -> 模型回复：报销需在费用产生后 30 天内提交，附发票和审批单。
  -> token 账单：{"input_tokens": 31, "output_tokens": 22, "total_tokens": 53}

=== 调用日志汇总（接口层应记录这些字段）===
  第1次：{"model": "mock-chat-1", "temperature": 0.2, "input_tokens": 26, "output_tokens": 38, "latency_ms": 5}
  第2次：{"model": "mock-chat-1", "temperature": 0.2, "input_tokens": 73, "output_tokens": 35, "latency_ms": 5}
  第3次：{"model": "mock-chat-1", "temperature": 0.9, "input_tokens": 31, "output_tokens": 22, "latency_ms": 5}
  累计 token：225（输入随轮数累加，是省钱的第一个抓手）
```

对比场景 1（input 26）和场景 2（input 73）：只是多聊了一轮，发给模型的 token 就翻了快 3 倍。这就是「上下文越长越贵」的来源——每一轮都要把全部历史重新发一遍。

## 代码↔概念对应

| 概念 | 在 main.py 哪里 |
|---|---|
| message 的 system / user / assistant 角色 | `main` 里构造 `messages` |
| 上下文是「手动累加历史」 | 场景 2 里 `messages.append(...)` |
| token 估算（中文 1 字≈1，英文 4 字符≈1） | `estimate_tokens` |
| 整段上下文的 token 之和 | `count_messages_tokens` |
| 模拟模型调用 + 返回 usage | `mock_chat` |
| temperature 影响输出风格 | `mock_chat` 里 `if temperature <= 0.2` |
| 接口层该记录的字段 | `call_log` 和汇总打印 |

## 动手改

- 把 `mock_chat` 换成真实模型 HTTP 调用（OpenAI / 通义），保留 `usage` 字段结构不变，上层代码一行不用改。
- 在场景 2 后面再追加两轮对话，观察 `input_tokens` 怎么持续涨——这就是下一篇「上下文管理」要解决的问题。
- 把 `estimate_tokens` 的英文系数从 4 改成 3，看看估算差多少；真实项目应换成模型自带的分词器。

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“10 大模型 API 基础 demo”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
