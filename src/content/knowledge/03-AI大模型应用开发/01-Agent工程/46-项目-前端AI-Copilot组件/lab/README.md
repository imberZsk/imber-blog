# 46 前端 AI Copilot 组件 demo

把 AI 助手嵌进一个真实的「订单详情」业务页面：右下角悬浮按钮唤起抽屉式 Copilot，它能读取**当前页面上下文**解释订单、展示执行过程 trace、写操作前弹**人工确认**。前端用原生 HTML/JS，后端用 Python 标准库 `http.server`。

## 运行

```bash
python3 server.py
```

然后浏览器打开 http://localhost:8046 ，点右下角蓝色 AI 按钮。

零依赖，纯标准库。

## 预期效果

页面是一个订单详情页（订单 O-2026-0520，状态退款中，标了"异常"）。点开 Copilot 后：

- 问"这个订单为什么异常" → 回答会结合页面上下文和订单数据，并展示 trace。
- 让它"建个工单" → 弹出黄色确认区域，点"确认创建"才执行，写操作不自动跑。

命令行也能验证后端接口：

```bash
curl -X POST http://localhost:8046/api/copilot -H "Content-Type: application/json" \
  -d '{"message":"这个订单为什么异常","pageContext":{"selectedOrderId":"O-2026-0520","idCard":"310101199001011234"}}'
```

预期返回（注意：传进去的 `idCard` 被后端脱敏丢弃，没参与处理）：

```json
{"reply": "订单 O-2026-0520 状态为「退款中」，金额 89 元，处于退款流程，属于需要关注的异常订单。",
 "trace": ["读取页面上下文 selectedOrderId=O-2026-0520", "命中订单数据，判定为异常订单"]}
```

## 代码对应文章的哪些点

| 概念 | 在哪里 |
|---|---|
| 收集页面上下文 | `index.html` 的 `getPageContext` |
| 上下文脱敏（白名单字段） | `server.py` 的 `sanitize_context` |
| 结合上下文回答 | `server.py` 的 `handle_copilot` |
| 写操作返回 needs_confirmation | `handle_copilot` + 前端 `appendConfirm` |
| 展示执行过程 trace | 前端 `appendMsg` 渲染 trace |
| 失败不影响主页面 | `send` 的 try/catch |

## 动手改

- 在 `getPageContext` 里加一个敏感字段（如 `phone`），确认后端 `sanitize_context` 把它丢掉了。
- 把 `handle_copilot` 换成真实模型调用，pageContext 拼进 system prompt。
- 给确认按钮接一个真正的 `/api/ticket` 写接口，体会"前端确认 → 后端执行"的完整链路。
