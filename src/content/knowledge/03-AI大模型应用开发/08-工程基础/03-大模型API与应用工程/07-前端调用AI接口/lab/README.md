# 16 前端调用 AI 接口 demo

浏览器里用原生 JS 调一个 AI 问答接口。重点不是「发一次 fetch」，而是**把调用 AI 接口当成一组 UI 状态来管**：loading、成功、客户端错误、服务端错误、网络异常，每种都要有对应的界面表现和恢复入口。配一个最小 Python 后端。

## 运行

```bash
python3 server.py
```

然后浏览器打开 **http://127.0.0.1:8016**，在输入框里试：

- 输入「报销」「请假」→ 看正常问答（有 0.6 秒 loading 态）
- 输入「报错」→ 触发服务端 500，看错误提示和「重试」按钮

零依赖，纯标准库。

## 预期输出

启动后终端：

```
服务已启动，浏览器打开：http://127.0.0.1:8016
试试输入「报销」「请假」，或输入「报错」看错误态。Ctrl+C 停止
```

后端接口的几种响应（也是前端要分别处理的几种情况）：

```
GET  /                              -> 200 返回 index.html
POST /api/chat {"message":"报销.."} -> 200 {"answer": "报销需在费用产生后 30 天内提交，附发票和审批单。", "error": null}
POST /api/chat {"message":"报错"}    -> 500 {"error": "model_unavailable", "answer": null}
POST /api/chat {"message":""}       -> 400 {"error": "missing_field", "answer": null}
```

服务端访问日志：

```
  [访问] GET / -> 200
  [访问] POST /api/chat -> 200
  [访问] POST /api/chat -> 500
  [访问] POST /api/chat -> 400
```

浏览器里的表现：发送时按钮变「生成中…」并禁用、显示「助手思考中…」占位；成功后占位被答案替换；输入「报错」则显示红色错误条 + 「重试」按钮，点重试自动复用上一条问题。

## 代码↔概念对应

| 概念 | 在哪里 |
|---|---|
| 用 state 集中管理请求状态 | index.html `const state` |
| loading 态（禁用按钮、显示占位） | `syncUI`、`sendMessage` 里的 `thinking` |
| 区分 HTTP 错误（4xx/5xx） | `sendMessage` 里 `if (!res.ok)` |
| 区分网络层异常 | `sendMessage` 的 `catch` 块 |
| 错误态 + 重试入口 | `showError` |
| 后端故意延迟让 loading 可见 | server.py `time.sleep(0.6)` |
| 后端模拟服务端错误 | server.py `if message == "报错"` |

## 动手改

- 把 `sendMessage` 里的 `fetch` 改成第 13 篇的 SSE 流式调用（`new EventSource`），体验打字机效果。
- 给 loading 态加一个「停止」按钮，用 `AbortController` 中断 fetch。
- 故意把后端关掉，在页面发消息，看 `catch` 块的「网络异常」提示——这就是前端必须处理网络层失败的原因。

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“16 前端调用 AI 接口 demo”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。
