# 39 模型部署与本地调用 demo

一个兼容 OpenAI 接口格式的 mock 本地模型服务（标准库 `http.server`），加一段对「mock / 真实 OpenAI / Ollama」通用的客户端代码。一条命令自动起服务 + 调用 + 打印结果。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库，离线可跑。自动起 mock 模型服务、用客户端调两次、打印结果后自动关闭。

## 预期输出

```
mock 模型服务已启动：http://localhost:8039/v1/chat/completions

请求：你好
回答：你好，我是本地 mock 模型，接口和 OpenAI 完全兼容。
用量：{'prompt_tokens': 2, 'completion_tokens': 32, 'total_tokens': 34}

请求：请帮我总结一下 RAG 是什么
回答：我收到了你的问题：「请帮我总结一下 RAG 是什么」。这是 mock 模型的回答。
用量：{'prompt_tokens': 15, 'completion_tokens': 41, 'total_tokens': 56}
```

## 代码 ↔ 概念对应

| 概念 | 在 main.py 哪里 |
|---|---|
| OpenAI 兼容接口路径 | `MockModelHandler.do_POST` 里 `/v1/chat/completions` |
| OpenAI 请求结构（model + messages） | `chat` 里构造的 `req_body` |
| OpenAI 响应结构（choices/message/usage） | 服务端返回的 `response` |
| 模型推理（真实模型在这做） | `_fake_infer` |
| 通用客户端（换 BASE_URL 即可切换） | `chat` |
| token 用量统计 | `response["usage"]` |

## 核心认知

无论模型是 OpenAI 云端、还是你用 vLLM / Ollama / LMStudio 自部署在本地，只要都暴露「OpenAI 兼容接口」（`POST /v1/chat/completions`，请求/响应结构一致），**客户端代码一行不改就能切换**。

```
本地 mock     → BASE_URL = http://localhost:8039
Ollama 本地   → BASE_URL = http://localhost:11434/v1
真实 OpenAI   → BASE_URL = https://api.openai.com/v1  + 真实 API Key
vLLM 自部署   → BASE_URL = http://你的服务器:8000/v1
```

`chat` 函数对这四种情况通用。这就是为什么业界都往「OpenAI 兼容」上靠。

## 动手改

- 把 `_fake_infer` 改聪明一点，加更多规则回答。
- 装了 Ollama 的话，把 `BASE_URL` 改成 `http://localhost:11434/v1`、`model` 改成 `llama3`，`chat` 函数直接能调真实本地模型。
- 给服务加一个 `/v1/models` 接口（OpenAI 也有），返回可用模型列表。

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“39 模型部署与本地调用 demo”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
