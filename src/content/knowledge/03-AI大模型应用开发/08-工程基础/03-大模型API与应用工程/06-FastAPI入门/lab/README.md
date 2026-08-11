# 15 FastAPI 入门 demo

用 Python 标准库 `http.server` 写一个最小问答接口，讲清任何 Web 框架都绕不开的四件事：**路由、请求体解析、稳定的响应结构、错误处理**。这些概念和具体框架无关，所以这里用零依赖的标准库实现，README 末尾给了等价的 FastAPI 写法对照。

## 运行

第一步，启动服务：

```bash
python3 main.py
```

第二步，**另开一个终端**测试：

```bash
curl -X POST http://127.0.0.1:8015/api/chat -d '{"message":"报销要几天"}'
curl http://127.0.0.1:8015/health
```

零依赖，纯标准库。

## 预期输出

启动后终端显示：

```
服务已启动：http://127.0.0.1:8015
测试命令：
  curl -X POST http://127.0.0.1:8015/api/chat -d '{"message":"报销要几天"}'
  curl http://127.0.0.1:8015/health
Ctrl+C 停止
```

四种请求的响应（依次为：正常、缺字段、非法 JSON、健康检查、404）：

```
{"answer": "报销需在费用产生后 30 天内提交。", "message": "报销要几天", "error": null}
{"error": "missing_field", "detail": "message 不能为空"}
{"error": "invalid_json", "detail": "请求体不是合法 JSON"}
{"status": "ok"}
{"error": "not_found", "path": "/foo"}
```

服务端打印的访问日志：

```
  [访问] POST /api/chat -> 200
  [访问] GET /health -> 200
```

## 代码↔概念对应

| 概念 | 在 main.py 哪里 | FastAPI 里对应 |
|---|---|---|
| 路由分发（按 path） | `do_GET` / `do_POST` 里的 `if self.path` | `@app.get` / `@app.post` 装饰器 |
| 请求体解析 | `do_POST` 里读 `Content-Length` + `json.loads` | Pydantic 模型自动解析 |
| 稳定响应结构 | `_send_json` | `response_model` |
| 错误处理（400/404） | `invalid_json` / `missing_field` 分支 | `HTTPException` |
| 健康检查 | `/health` 接口 | 同样写个 `@app.get("/health")` |
| 业务逻辑 | `answer_question` | 一样，框架无关 |

## 如果你想用 FastAPI

标准库版是为了零依赖、一条命令跑通。生产项目通常用 FastAPI，它把请求体解析、校验、文档生成都自动化了。安装：

```bash
pip install fastapi uvicorn
```

等价实现：

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class ChatRequest(BaseModel):          # 请求体模型，自动解析 + 校验
    message: str

@app.post("/api/chat")
def chat(req: ChatRequest):
    msg = req.message.strip()
    if not msg:
        raise HTTPException(400, "message 不能为空")   # 自动返回 400
    return {"answer": answer_question(msg), "message": msg, "error": None}

@app.get("/health")
def health():
    return {"status": "ok"}
```

启动：`uvicorn main:app --reload --port 8015`，并且自动有交互式文档 `http://127.0.0.1:8015/docs`。对比就能看出 FastAPI 帮你省了哪些手写代码：请求体解析、字段校验、错误码、接口文档全是自动的。

## 动手改

- 给标准库版加一个 `POST /api/echo` 接口，原样返回收到的 message，练习路由分发。
- 把 `answer_question` 换成第 14 篇的多轮对话逻辑，让接口支持 sessionId。

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“15 FastAPI 入门 demo”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
