# 13 - Web后端概览

> 你在 node 里 `app.listen(3000)` 一行就既起了服务器又跑了框架，从没分过家。进了 Python 后端世界，第一件要拧过来的事是：**「Web 服务器」和「你的应用框架」是两个东西，中间靠一份叫 WSGI/ASGI 的「接口契约」对接**。这篇先把这套地基讲清，再帮你在 Flask / Django / FastAPI 三选一里站好队——后面阶段三全程会用 FastAPI。

## 一、先建直觉：node 把服务器和框架揉成了一坨

在前端/node 的世界里，Express 给你的体感是「框架即服务器」：

```javascript
// node + Express：一份代码，既是框架又是服务器
const express = require('express')
const app = express()

// 注册一个路由处理函数
app.get('/hello', (req, res) => {
  res.send('Hello')
})

// app.listen 直接监听端口——服务器也是它起的
app.listen(3000)
```

你从没分过「谁负责监听端口、解析 HTTP 报文」和「谁负责跑业务路由」。因为 node 自带的 `http` 模块就是服务器，Express 只是在它上面包了一层，两者天然长在一起。

**边界（这里和 node 不一样）**：Python 后端世界里，这两件事是**刻意分开**的：

- **Web 服务器**（也叫应用服务器）：负责监听端口、收发 TCP、把原始 HTTP 报文解析成结构化数据，再把响应写回去。代表：`gunicorn`、`uvicorn`、`uWSGI`。
- **Web 框架**：负责路由、参数解析、业务逻辑、生成响应。代表：`Flask`、`Django`、`FastAPI`。

两者之间需要一份**标准接口契约**来对接，这份契约就是 **WSGI / ASGI**。框架按契约暴露一个「应用对象」，服务器按契约去调用它。

```
【node 心智模型】                    【Python 心智模型】
┌───────────────────┐               ┌──────────┐   WSGI/ASGI   ┌──────────┐
│  Express           │               │ gunicorn │ ←──契约对接──→ │  Flask   │
│ (服务器+框架一体)  │               │ /uvicorn │               │ /FastAPI │
└───────────────────┘               │ (服务器)  │               │ (框架)    │
                                     └──────────┘               └──────────┘
```

> 为什么要拆？因为这样**框架和服务器可以自由组合、各自独立演进**。你写的 Flask 应用，开发时用 Flask 自带的简易服务器跑，上线时换成性能更强的 gunicorn 跑——业务代码一行不用改。这正是「接口契约」解耦带来的好处，和 JS 里「面向接口编程」是同一种思想。

---

## 二、WSGI：同步时代的「请求处理函数签名」

**WSGI**（Web Server Gateway Interface）是 Python **同步**时代的接口标准。说白了它就规定了一件事：**框架要暴露一个长成固定样子的「可调用对象」，服务器照着这个样子去调它。**

**类比**：就像 node 约定了 `(req, res) => {}` 这个回调签名，WSGI 约定了 Python 这边的「请求处理函数」长什么样：

```python
# 一个最朴素的、不依赖任何框架的 WSGI 应用
# environ：字典，存这次请求的所有信息（请求头、路径、方法等），≈ node 的 req
# start_response：服务器传进来的回调，用来「先发状态码和响应头」，≈ res.writeHead
def application(environ, start_response):
    # 业务场景：拼装响应状态行
    status = "200 OK"                                  # HTTP 状态码字符串
    # 响应头列表，每个头是 (名, 值) 的元组
    headers = [("Content-Type", "text/plain; charset=utf-8")]
    # 先把状态码和响应头交给服务器（这一步必须在返回 body 之前）
    start_response(status, headers)
    # 返回值是一个「字节串的可迭代对象」，里面是响应体 body
    return [b"Hello WSGI"]
```

并排看等价的 node 裸 http：

```javascript
// node 裸 http：与 WSGI 一一对应
const http = require('http')

http.createServer((req, res) => {
  // 对应 start_response：先写状态码和响应头
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  // 对应 return [b'...']：写响应体
  res.end('Hello')
}).listen(3000)
```

你平时写 Flask 时**不会手写这个函数**——框架帮你把路由层封装好了，但它内部最终就是向服务器暴露这么一个 WSGI 可调用对象。

**WSGI 的关键限制**：它是**同步**模型。一次请求进来，处理函数从头跑到尾、返回结果，期间这个工作进程/线程被占住。要扛并发，只能靠「多开进程 / 多开线程」（这正是 gunicorn 默认干的事）。它**天生不支持 `async/await`、WebSocket、SSE 这类长连接**。

| 概念 | node | WSGI |
|------|------|------|
| 请求处理签名 | `(req, res) => {}` | `def app(environ, start_response)` |
| 请求信息从哪拿 | `req` 对象 | `environ` 字典 |
| 怎么发响应头 | `res.writeHead()` | `start_response()` |
| 怎么发响应体 | `res.end(body)` | `return [b"..."]` |
| 并发模型 | 单线程事件循环（天生异步） | 同步，多进程/多线程扛并发 |

---

## 三、ASGI：异步时代的接口，补上了 WSGI 的短板

随着 WebSocket、SSE、`async/await` 流行，同步的 WSGI 不够用了，社区推出了 **ASGI**（Asynchronous Server Gateway Interface），是 WSGI 的「异步升级版」。

> ASGI 应用是一个 `async` 函数。关于 `async/await` 的完整心智模型——它和 JS 单线程事件循环高度相似——**详见第 17 篇《异步与并发》**，这里只需先眼熟它长什么样。

```python
# 一个最朴素的 ASGI 应用，注意整体是 async def
# scope：字典，存这次连接的元信息（类型/路径/方法等），生命周期内不变
# receive：可 await 的函数，用来「收」客户端发来的事件（如请求体分片）
# send：可 await 的函数，用来「发」响应事件给客户端
async def app(scope, receive, send):
    # 业务场景：先发响应「开头」事件——状态码 + 响应头
    await send({
        "type": "http.response.start",                 # 事件类型：响应开始
        "status": 200,                                  # HTTP 状态码（整数）
        "headers": [(b"content-type", b"text/plain")],  # 响应头，注意是 bytes
    })
    # 再发响应「体」事件——真正的 body 内容
    await send({
        "type": "http.response.body",                   # 事件类型：响应体
        "body": b"Hello ASGI",                          # 响应体字节串
    })
```

你同样**不会手写**这个——FastAPI 帮你全封装了。但理解「FastAPI 是个 ASGI 应用、所以天生支持 async 和长连接」这件事很重要。

**WSGI vs ASGI 一句话总结**：

| 维度 | WSGI（旧/同步） | ASGI（新/异步） |
|------|----------------|----------------|
| 函数形态 | 普通 `def` | `async def` |
| 并发模型 | 同步，靠多进程/线程 | 异步事件循环，单进程扛大量 IO 并发 |
| 长连接 | ❌ 不支持 WebSocket/SSE | ✅ 原生支持 |
| 代表服务器 | gunicorn、uWSGI | uvicorn、hypercorn |
| 代表框架 | Flask、老版 Django | FastAPI、Starlette、新版 Django |
| node 类比 | 多进程 PM2 跑同步代码 | node 原生事件循环 |

> **关键澄清（防止套用 JS 心智模型踩坑）**：Python 的 `async` 和 JS 一样是「单线程事件循环」，**它擅长的是 IO 密集型并发**（等数据库、等网络），不是靠多核并行算 CPU。Python 还有个 GIL（全局解释器锁）的话题，会限制多线程的 CPU 并行——但那是另一个机制层面的话题，和 async 不是一回事，这里先不展开。记住一句：**async 解决的是「等待时别干站着」，不是「用满 CPU 多核」**。

---

## 四、三大框架选型：Flask / Django / FastAPI

这是本篇的实战落点。三个框架对应前端世界三种你熟悉的形态：

| 框架 | 一句话定位 | 前端类比 | 接口标准 |
|------|-----------|----------|----------|
| **Flask** | 极简微框架，给你路由和请求对象，其余自己拼 | **Express**（minimal，啥都自己装） | WSGI（同步为主） |
| **Django** | 全家桶大而全，自带 ORM/后台/认证/模板 | **Nest.js / Rails**（约定优于配置的重型框架） | WSGI（新版支持 ASGI） |
| **FastAPI** | 现代异步框架，类型驱动、自动生成文档 | **Express + zod + Swagger 自动化** | ASGI（原生异步） |

### Flask：Express 式的极简

```python
# Flask：和 Express 几乎一模一样的轻量手感
from flask import Flask

app = Flask(__name__)  # 创建应用实例，≈ const app = express()

# 用装饰器注册路由（装饰器 ≈ TS 的 @Get 装饰器，详见第 10 篇）
@app.route("/hello")
def hello():           # 处理函数：返回字符串即响应体
    return "Hello Flask"
```

```javascript
// 等价的 Express
const app = express()
app.get('/hello', (req, res) => res.send('Hello Express'))
```

特点：核心极小，数据库、表单校验、认证都靠装第三方扩展自己搭。**自由度高，但啥都得自己选型拼装**——和 Express 生态一个味道。

### Django：Nest.js 式的全家桶

Django 是「一站式」框架，自带 ORM、管理后台、用户认证、模板引擎、表单系统。你不用东拼西凑，但要接受它的「约定」和较陡的入门曲线。

```python
# Django 的路由集中在 urls.py 里登记（不是就近装饰器风格）
from django.urls import path
from . import views

# urlpatterns：路由表列表，存「路径 → 处理函数」的映射
urlpatterns = [
    path("hello/", views.hello),  # 访问 /hello/ 时交给 views.hello 处理
]
```

特点：**功能齐全、约定强、适合内容型/管理型大项目**（博客、CMS、后台系统）。自带的 Admin 后台是杀手锏——几行配置就有一个能增删改查的管理界面。类比 Nest.js 那种「模块化、约定优于配置」的重量级体验。

### FastAPI：现代异步 + 类型驱动 + 自动文档

FastAPI 是这条学习线的主角。它把「类型注解」用到了极致：你用类型声明参数，它就自动帮你做**参数校验**、**数据序列化**、**生成交互式 API 文档**。

```python
# FastAPI：类型即契约
from fastapi import FastAPI
from pydantic import BaseModel  # 数据模型基类，详见第 15 篇

app = FastAPI()  # 创建应用实例

# 定义请求体模型，≈ TS 的 interface / zod schema（详见第 15 篇）
class Item(BaseModel):
    name: str        # 字段：商品名，类型 str
    price: float      # 字段：价格，类型 float

# async def 路由：详见第 17 篇异步篇；这里先眼熟它能直接写 async
@app.post("/items")
async def create_item(item: Item):  # item 参数标了类型，FastAPI 自动校验请求体
    # 返回 dict，FastAPI 自动序列化成 JSON 响应
    return {"name": item.name, "price": item.price}
```

并排看前端你会做的等价事：

```typescript
// 等价的 Express + zod：你要手动校验、手动写文档
import { z } from 'zod'
const ItemSchema = z.object({ name: z.string(), price: z.number() })

app.post('/items', (req, res) => {
  const item = ItemSchema.parse(req.body)  // 手动校验
  res.json({ name: item.name, price: item.price })
})
// Swagger 文档？还得另外装插件、写注解……
```

FastAPI 的核心爽点：上面那段 Python，**校验自动做了，OpenAPI/Swagger 文档自动生成了**（启动后访问 `/docs` 就有一个能点能调的交互页面），全靠类型注解驱动。这对前端工程师极友好——它把你熟悉的「类型即文档、类型即校验」哲学做进了框架。

---

## 五、怎么选？给前端新手的决策建议

| 你的场景 | 推荐 | 理由 |
|----------|------|------|
| 学习 / 现代 API 服务 / AI 应用后端 | **FastAPI** | 异步、类型驱动、自动文档，前端心智最顺滑 |
| 内容/管理型大站、要自带后台和 ORM | **Django** | 全家桶省事，Admin 后台是杀手锏 |
| 极简脚本级 Web 服务、想完全自己掌控 | **Flask** | 轻、灵活、生态成熟 |
| 需要 WebSocket / SSE / 高 IO 并发 | **FastAPI** | ASGI 原生支持长连接与异步 |

**本学习线选 FastAPI**，原因有三：① 它是 ASGI，契合 AI 时代大量「等模型返回」的 IO 密集场景（流式输出、SSE）；② 类型驱动 + 自动文档，前端工程师上手几乎零摩擦；③ 后面阶段五调大模型、做 RAG/Agent，配 FastAPI 起服务是社区主流组合。

> **前向索引（消除悬空感）**：从第 14 篇起进入 FastAPI 实操——第 14 篇路由与请求响应（对比 Express），第 15 篇用 Pydantic 做参数校验（≈ zod/TS interface），第 16 篇 SQLAlchemy 操作数据库，第 17 篇讲清 `async/await` 的完整机制。本篇出现的 `async def`、`BaseModel` 现在只需眼熟，不必深究。

---

## 六、前端新手最易踩的坑

1. **以为框架 = 服务器**：在 node 里 `app.listen` 一把梭，到 Python 会找不到「listen 在哪」。正解：**业务代码里没有 listen，启动靠单独的服务器命令**。比如 FastAPI 用 `uvicorn main:app`，Flask 上线用 `gunicorn`。开发框架和运行服务器是两层。

   ```bash
   # 启动 FastAPI 应用：用 uvicorn 这个 ASGI 服务器去跑 main.py 里的 app 对象
   # main:app —— 冒号前是模块名(main.py)，冒号后是应用实例变量名(app)
   uvicorn main:app --reload   # --reload：改代码自动重启，≈ nodemon

   # 生产环境常见组合：gunicorn 管多进程，uvicorn 作为 worker 跑 ASGI
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

2. **把 async 当成「自动变快/多核并行」**：async 只在「有等待」（IO）时才省时间；在 `async def` 里写一段纯 CPU 死循环，照样把事件循环卡死。机制详见第 17 篇。

3. **在 async 路由里调同步阻塞代码**：比如在 FastAPI 的 `async def` 里直接调一个会阻塞的老式数据库驱动或 `time.sleep`，会卡住整个事件循环——和 node 里在主线程跑同步重活阻塞所有请求是同一个道理。要么用异步库，要么把阻塞活儿丢到线程池。

4. **选型时无脑上 Django**：Django 大而全，但它的 ORM、项目结构是强约定，学习曲线陡。只是想撸个 API，Django 的「全家桶」反而是负担——这种场景 FastAPI 更轻更顺。

5. **混淆 WSGI 服务器跑 ASGI 应用**：用 `gunicorn main:app` 直接跑 FastAPI（ASGI 应用）会报错，因为 gunicorn 默认是 WSGI 服务器。要么用 uvicorn，要么给 gunicorn 指定 `-k uvicorn.workers.UvicornWorker` 这个 ASGI worker。

---

## 小结

Python 后端的第一课不是某个框架，而是**「服务器 / 框架分家、靠 WSGI/ASGI 契约对接」**这个心智切换——这和 node 把两者揉一坨的体感完全不同。WSGI 是同步时代的接口（Flask、老 Django 用），ASGI 是异步升级版（FastAPI 用，原生支持 async 和长连接）。框架三选一里，Flask≈Express（极简）、Django≈Nest.js/Rails（全家桶）、FastAPI≈Express+zod+Swagger（现代类型驱动），本学习线选 **FastAPI**。

✅ **该掌握**
- 服务器（uvicorn/gunicorn）和框架（FastAPI/Flask）是两层，靠 WSGI/ASGI 契约对接
- WSGI = 同步接口（普通 `def`）；ASGI = 异步接口（`async def`），后者支持 WebSocket/SSE
- 三框架定位与前端类比；本线为何选 FastAPI（异步 + 类型驱动 + 自动文档）
- 启动用 `uvicorn main:app`，业务代码里没有 `listen`

⚠️ **易混淆**
- 框架 ≠ 服务器：别在业务代码里找 `app.listen`
- async ≠ 自动多核变快：它只省「等待 IO」的时间，CPU 密集照样卡（详见第 17 篇）
- 别用 WSGI 服务器（裸 gunicorn）直接跑 ASGI 应用（FastAPI），需指定 uvicorn worker
- Django 全家桶虽强，但只撸 API 时是负担，按场景选而非无脑上重型框架
