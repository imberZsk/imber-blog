# 工程基础（15）- FastAPI 入门

> 读完你能：用 Python 写出一个带路由、请求体解析、错误处理的最小问答接口，说清 FastAPI 帮你自动化了哪些事，并跑通一个 curl 能调通的后端 demo。

# 一、一个真实场景

前面几篇你写的都是「跑在终端里的函数」：调模型、管上下文、解析 JSON。但前端没法 import 你的 Python 函数。前端只会发 HTTP 请求。

所以你得把这些能力包成 HTTP 接口——前端 `fetch('/api/chat', {body: ...})`，你的后端收到、跑逻辑、返回 JSON。这一篇就是讲怎么把 Python 函数变成前端能调的接口。

作为前端，你对「接口」并不陌生：你天天调别人的接口。现在只是换到出题方，自己定义路由、请求体、响应结构。概念是相通的。

# 二、一个 HTTP 接口的四个要件

不管用什么框架，写一个接口都绕不开这四件事。先用标准库 `http.server` 看清它们的本质（不藏在框架魔法后面）：

## 2.1 路由：按 path 分发

一个服务有多个接口，靠 URL 路径区分。`POST /api/chat` 是问答，`GET /health` 是探活：

```python
def do_POST(self):
    if self.path == "/api/chat":     # 按路径分发到对应处理逻辑
        ...
    else:
        self._send_json(404, {"error": "not_found"})
```

## 2.2 请求体解析：拿到前端发来的数据

前端 POST 过来的 JSON，要先读出来再 parse。这步框架通常帮你做，标准库里得手动：

```python
length = int(self.headers.get("Content-Length", 0))
raw = self.rfile.read(length).decode("utf-8")
data = json.loads(raw)               # 解析成 dict
```

## 2.3 稳定的响应结构

前端依赖你的返回结构。所有接口的响应字段最好统一，别这个接口返回 `{answer}`、那个返回 `{result}`。把响应出口收在一个函数里：

```python
def _send_json(self, status, payload):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type", "application/json; charset=utf-8")
    self.end_headers()
    self.wfile.write(body)
```

## 2.4 错误处理：用对状态码

请求体不是 JSON、缺字段，这些是**客户端错误**，该返回 400 而不是让服务崩掉返回 500。状态码是前端判断「该重试还是该改请求」的依据：

```python
try:
    data = json.loads(raw)
except json.JSONDecodeError:
    self._send_json(400, {"error": "invalid_json"})   # 客户端错误用 4xx
    return
if not data.get("message", "").strip():
    self._send_json(400, {"error": "missing_field"})
    return
```

# 三、FastAPI 帮你省了什么

上面四件事，FastAPI 把后三件自动化了。同样的接口，FastAPI 写法：

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class ChatRequest(BaseModel):       # 声明请求体结构，自动解析 + 校验类型
    message: str

@app.post("/api/chat")              # 路由用装饰器声明，直观
def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(400, "message 不能为空")   # 一行返回 400
    return {"answer": answer_question(req.message)}    # 自动序列化成 JSON
```

对照标准库版，FastAPI 的价值很清楚：

| 要件 | 标准库 | FastAPI |
|---|---|---|
| 请求体解析 | 手动读 Content-Length + json.loads | Pydantic 模型自动解析 |
| 字段校验 | 手写 if 判断 | 模型声明类型，自动校验 |
| 错误码 | 手动 `_send_json(400, ...)` | `raise HTTPException(400)` |
| 接口文档 | 自己写 | 自动生成 `/docs` 交互文档 |

启动也简单：`uvicorn main:app --reload`，还附带一个能点着调的交互式文档页面，联调时前端同学直接打开 `/docs` 就行。

# 五、工程上真正会踩的坑

- **客户端错误返回 500**。请求体格式不对是客户端的问题，该返 400。乱返 500 会让前端以为是服务挂了去重试，越重试越错。
- **没有健康检查接口**。部署后负载均衡、k8s 探针都要靠 `/health` 判断服务活没活。一行的事，别省。
- **AI 接口照搬普通接口的超时**。模型调用可能要好几秒，默认超时（有的网关 30 秒甚至更短）容易把长回答掐断。AI 接口的超时要单独放宽，长回答更该上流式（第 13 篇）。
- **响应结构每个接口一个样**。前端要为每个接口写不同的解析逻辑。统一成固定字段（answer/error 等），前端一套逻辑通吃。

# 六、一句话面试答法

> **用 Python 写 AI 后端接口要注意什么？** 一个接口无非四件事：路由分发、请求体解析、稳定响应结构、错误处理。我一般用 FastAPI，它用 Pydantic 模型自动解析和校验请求体、自动生成接口文档，比手写省很多。要点是：客户端错误用 4xx 别用 5xx，要有 health 健康检查接口，AI 接口因为模型调用慢要单独放宽超时、长回答走流式，响应结构统一成固定字段方便前端。

# 八、总结

- **工程上真正会踩的坑**：客户端错误返回 500。
- **一个 HTTP 接口的四个要件**：不管用什么框架，写一个接口都绕不开这四件事。
- **FastAPI 帮你省了什么**：上面四件事，FastAPI 把后三件自动化了。
- **一个真实场景**：前面几篇你写的都是「跑在终端里的函数」：调模型、管上下文、解析 JSON。

<!-- knowledge-lab-merged -->

# 动手实践：15 FastAPI 入门

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

## 参考资料

- [OWASP LLM Top 10](https://genai.owasp.org/llm-top-10/)
- [Google SRE Workbook](https://sre.google/workbook/table-of-contents/)
