# Python（14）- FastAPI 入门

> 读完你能：围绕“FastAPI 入门”理解“先给锚点：FastAPI 路由 ≈ Express 路由”与“边界一：装饰器即路由（@app.get 到底是什么）”，并结合正文示例完成实践与排障。

> 你在 Node 端写过 `app.get('/users', handler)`，用 Express 撸过几十个接口。FastAPI 的路由长得几乎一样——但它把「参数校验」「类型转换」「接口文档」这些你在 Express 里要手写或装一堆中间件才能搞定的事，靠 Python 的类型注解直接内置了。本篇帮你把 Express 的心智模型平移过来，并立刻划清三处关键差异：装饰器即路由、函数签名即参数、返回 dict 即响应。

# 一、先给锚点：FastAPI 路由 ≈ Express 路由

最小可跑的一个接口，左边 Express、右边 FastAPI 并排看：

```javascript
// Express (Node)
const express = require('express')
const app = express()

// 注册一个 GET 路由，第一个参数是路径，第二个是处理函数
app.get('/', (req, res) => {
  res.json({ message: 'hello' })   // 手动调 res.json 序列化
})

app.listen(3000)   // 监听 3000 端口
```

```python
# FastAPI (Python)
from fastapi import FastAPI

app = FastAPI()   # app：FastAPI 应用实例，相当于 Express 的 app

# @app.get(...) 是装饰器（详见第 10 篇），作用等价于 app.get('/', handler)
# 路径作为装饰器参数，被装饰的函数 root 就是处理函数
@app.get("/")
def root():
    # 直接 return 一个 dict，FastAPI 自动序列化成 JSON 并设好 Content-Type
    return {"message": "hello"}
```

启动它（FastAPI 自己不带服务器，靠 uvicorn 这个 ASGI 服务器跑，详见第 13 篇）：

```bash
# 安装：fastapi 是框架，uvicorn 是跑它的服务器（类比 node 直接内置了 http server，Python 要单独装）
pip install "fastapi[standard]" uvicorn

# 启动：main 是文件名(main.py)，app 是上面那个实例名，--reload 类似 nodemon 热重载
uvicorn main:app --reload
```

第一组对照表，先建立直觉：

| Express (Node) | FastAPI (Python) | 说明 |
|----------------|------------------|------|
| `const app = express()` | `app = FastAPI()` | 创建应用实例 |
| `app.get('/x', fn)` | `@app.get("/x")` | 注册路由（FastAPI 用装饰器） |
| `app.post / put / delete` | `@app.post / .put / .delete` | HTTP 方法一一对应 |
| `req` / `res` 对象 | 函数参数 / `return` 值 | 关键差异，见第三节 |
| `app.listen(3000)` | `uvicorn main:app` | 启动方式（外部服务器） |
| 手动 `res.json(obj)` | 直接 `return dict` | 自动序列化 |

---

# 二、边界一：装饰器即路由（@app.get 到底是什么）

Express 里注册路由是「调函数」：`app.get(path, fn)`，把 fn 当参数传进去。FastAPI 里是「贴装饰器」：`@app.get(path)` 写在函数头顶上。两者效果一样，但写法不同，别被 `@` 吓到。

> 装饰器机制详见第 10 篇。这里只需记住一个心智模型：`@app.get("/")` 就是「把下面这个函数登记到 app 的路由表里，绑定到 GET /」。如果你写过 Angular/TS 的 `@Component`、`@Get()`（NestJS），这个语法你已经见过了——长得一模一样。

```python
from fastapi import FastAPI

app = FastAPI()   # app：FastAPI 应用实例

# 每个装饰器 = 一条路由登记。同一个路径配不同 HTTP 方法 = 不同装饰器
@app.get("/users")        # 查列表
def list_users():
    return [{"id": 1, "name": "Tom"}]

@app.post("/users")       # 新建
def create_user():
    return {"ok": True}

@app.delete("/users/{user_id}")   # 删除，{user_id} 是路径参数，见下一节
def delete_user(user_id: int):
    return {"deleted": user_id}
```

```javascript
// Express 对照：同路径不同方法，链式或分开注册
app.get('/users', (req, res) => res.json([{ id: 1, name: 'Tom' }]))
app.post('/users', (req, res) => res.json({ ok: true }))
app.delete('/users/:user_id', (req, res) => res.json({ deleted: req.params.user_id }))
```

> 路径参数写法差异：Express 用冒号 `:user_id`，FastAPI 用花括号 `{user_id}`。仅此而已。

---

# 三、边界二：没有 req/res——参数靠函数签名，响应靠 return

这是从 Express 转过来**最大的认知转变**，务必吃透。

Express 里，所有输入都从 `req` 这个大对象里掏（`req.params` / `req.query` / `req.body`），所有输出都往 `res` 上写（`res.json` / `res.status`）。FastAPI 反过来：**你想要什么参数，就在函数签名里声明什么**，FastAPI 看类型注解自动从对的位置取值、自动转类型。

```python
from fastapi import FastAPI

app = FastAPI()   # app：FastAPI 应用实例

# 一个函数同时拿三种参数，FastAPI 靠「参数怎么声明」来区分它们从哪来：
# - user_id：出现在路径 {user_id} 里 → 路径参数（对应 Express req.params）
# - q：没在路径里、是简单类型 → 查询参数（对应 req.query）；给了默认值 "" 表示选填
# - limit：同上，查询参数，默认 10（同样因有默认值而选填）
@app.get("/users/{user_id}")
def get_user(user_id: int, q: str = "", limit: int = 10):
    # user_id 已被自动从字符串转成 int（URL 里一切都是字符串，FastAPI 按注解转）
    # q、limit 同理。若转换失败（如 user_id 传了 abc），FastAPI 自动返回 422，不进函数体
    return {"user_id": user_id, "q": q, "limit": limit}
```

```javascript
// Express 对照：全从 req 掏，且全是字符串，要自己转类型
app.get('/users/:user_id', (req, res) => {
  const userId = parseInt(req.params.user_id)   // 手动转 int
  const q = req.query.q || ''                    // 手动取 query、给默认值
  const limit = parseInt(req.query.limit) || 10  // 手动转 + 默认
  res.json({ user_id: userId, q, limit })
})
```

FastAPI 区分参数来源的规则（先记住前两条，body 见第四节）：

| 参数特征 | FastAPI 判定为 | 对应 Express | 例子 |
|----------|---------------|-------------|------|
| 出现在路径 `{xxx}` 里 | 路径参数 | `req.params.xxx` | `/users/{user_id}` |
| 简单类型、不在路径里 | 查询参数 | `req.query.xxx` | `?q=tom&limit=5` |
| 类型是 Pydantic 模型 | 请求体 | `req.body` | 见第四节 |

> ✅ 这套「声明即获取」最大的好处：类型注解（详见第 11 篇）不再只是给编辑器看的提示，FastAPI 把它**当成运行时的校验与转换规则**。Express 里你写 `req.query.limit` 永远是 string，要自己 `parseInt`；FastAPI 写 `limit: int` 就真的拿到 int，转不动直接 422。这相当于 Express 里你得手动装 + 配一堆校验中间件才有的能力。

---

# 四、请求体：Pydantic 模型 ≈ TS interface + zod 二合一

POST/PUT 要收 JSON body 时，Express 里你装 `body-parser`、从 `req.body` 掏、再自己写校验。FastAPI 让你**先定义一个 Pydantic 模型类**，把它写进函数签名，body 的接收、解析、校验一步到位。

> Pydantic 是 FastAPI 的数据校验基石，本篇只给最小用法，完整的字段约束、嵌套模型详见第 15 篇。

```python
from fastapi import FastAPI
from pydantic import BaseModel   # Pydantic 的模型基类

app = FastAPI()   # app：FastAPI 应用实例

# 定义请求体的「形状」：继承 BaseModel，用类型注解声明每个字段
# 这个类同时扮演两个角色：TS interface（定义结构）+ zod schema（运行时校验）
class UserIn(BaseModel):
    name: str              # 必填字段：用户名，缺了或类型不对直接 422
    age: int               # 必填：年龄，传 "abc" 会被拒
    email: str = ""        # 选填：给了默认值就变成可选，默认空串

# 参数 user 的类型是 Pydantic 模型 → FastAPI 判定它来自请求体(req.body)
@app.post("/users")
def create_user(user: UserIn):
    # 进到函数体时，user 已是校验通过、类型正确的对象，直接点属性用
    # user.name / user.age 都是对的类型，无需任何手动校验
    return {"created": user.name, "age": user.age}
```

```typescript
// Express + TS 对照：interface 只在编译期存在，运行时校验得另写（或上 zod）
interface UserIn {
  name: string
  age: number
  email?: string
}
app.post('/users', (req, res) => {
  const user = req.body as UserIn   // 仅类型断言，运行时 body 可能根本不符！
  // 想要真正的运行时校验，得手写 if，或引入 zod 单独定义 schema
  if (typeof user.name !== 'string' || typeof user.age !== 'number') {
    return res.status(422).json({ error: '参数不合法' })
  }
  res.json({ created: user.name, age: user.age })
})
```

> ⚠️ 关键差异：TS 的 interface 编译后就**消失了**，运行时拦不住一个乱传的 body——这是前端最容易误以为「类型已经保我了」的坑。Pydantic 模型是**真实存在于运行时的对象**，FastAPI 用它在请求进函数前就把关。所以 FastAPI 里你几乎不用写「参数校验 if」，这部分逻辑被模型吃掉了。

---

# 五、白送的接口文档：/docs（Express 要装 Swagger 才有）

把服务跑起来后，浏览器打开 `http://127.0.0.1:8000/docs`，你会看到一个**自动生成的、可交互的 Swagger UI**——所有路由、参数类型、请求体结构、能直接点「Try it out」发请求。

这不是额外配置出来的。FastAPI 把你写的类型注解 + Pydantic 模型，自动转成了 OpenAPI 规范并渲染成文档。

| 能力 | Express | FastAPI |
|------|---------|---------|
| 接口文档 | 装 `swagger-jsdoc` + 手写注释 | 内置，零配置，`/docs` 直接看 |
| 文档与代码同步 | 容易写完忘了更新 | 文档由代码生成，天然同步 |
| 在线调试 | 另开 Postman | `/docs` 里直接 Try it out |

> 对前端的实际价值：你转后端后写的接口，前端同学（或未来的你）打开 `/docs` 就能看清参数和返回结构，不用再追着问「这个接口要传啥」。另有 `http://127.0.0.1:8000/redoc` 是另一种风格的只读文档。

---

# 六、async：语法和 JS 一模一样（机制差异留到后面）

FastAPI 的处理函数既可以是普通 `def`，也可以是 `async def`。如果你的函数里要 `await` 别的异步操作（查数据库、调外部 API），就写 `async def`。

```python
import httpx   # 一个支持 async 的 HTTP 客户端，类比 JS 的 fetch/axios

# async def 声明异步处理函数；await 等待异步结果——和 JS 的 async/await 心智模型高度一致
@app.get("/proxy")
async def proxy():
    # async with：异步上下文管理（详见第 09 篇），这里管理 client 的生命周期
    async with httpx.AsyncClient() as client:
        # await 一个网络请求，期间不阻塞其他请求的处理——和 JS 事件循环一个感觉
        resp = await client.get("https://httpbin.org/get")
        return resp.json()
```

```javascript
// JS 对照：几乎逐行映射
app.get('/proxy', async (req, res) => {
  const resp = await fetch('https://httpbin.org/get')
  res.json(await resp.json())
})
```

> 边界提醒：现在你只需把 `async/await` 当成「和 JS 写法一样」来用即可——能 `await` 的就 `async def`，纯 CPU 计算或同步代码用普通 `def`（FastAPI 会自动用线程池跑普通 def，不会卡住）。**至于「Python 有 GIL、async 到底怎么并发的、和 Node 单线程有何不同」这些机制层面的东西，详见第 17 篇**，本篇不展开，先建立「写法照搬 JS」的直觉就够了。

---

# 七、把一个 CRUD 接口串起来

综合前面所有要点，写一个最小但完整的用户接口（内存存储，数据库版详见第 16 篇）：

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()   # app：FastAPI 应用实例

# 请求体模型：新建用户时前端要传的字段
class UserIn(BaseModel):
    name: str    # 用户名
    age: int     # 年龄

# fake_db：用一个 dict 模拟数据库，key 是 user_id，value 是用户数据
fake_db: dict[int, dict] = {}
# next_id：自增主键计数器，存下一个要分配的 id
next_id = 1

# 查列表：GET，无参数，返回所有用户
@app.get("/users")
def list_users():
    return list(fake_db.values())

# 查单个：GET + 路径参数 user_id（自动转 int）
@app.get("/users/{user_id}")
def get_user(user_id: int):
    # 业务分支：id 不存在时，主动抛 HTTPException 返回 404
    # 对应 Express 的 res.status(404).json(...)，但这里用「抛异常」表达
    if user_id not in fake_db:
        raise HTTPException(status_code=404, detail="用户不存在")
    return fake_db[user_id]

# 新建：POST + 请求体 UserIn（自动校验）
@app.post("/users")
def create_user(user: UserIn):
    global next_id                          # 要修改外层的计数器，需声明 global
    record = {"id": next_id, "name": user.name, "age": user.age}  # 组装入库记录
    fake_db[next_id] = record               # 存进「数据库」
    next_id += 1                            # 主键自增
    return record

# 删除：DELETE + 路径参数
@app.delete("/users/{user_id}")
def delete_user(user_id: int):
    # 业务分支：删不存在的 id 同样报 404，避免静默成功误导前端
    if user_id not in fake_db:
        raise HTTPException(status_code=404, detail="用户不存在")
    del fake_db[user_id]                    # 从 dict 移除
    return {"deleted": user_id}
```

四个接口跑起来后，去 `/docs` 就能直接点着测——这就是阶段三要求你能独立撸出的 CRUD 雏形。

---

# 八、总结

FastAPI 的路由壳子和 Express 几乎一样，但它用 Python 的类型注解把「参数解析 + 校验 + 文档」全自动化了，写法更声明式、更省样板。

✅ 该掌握
- `@app.get/post/...` 装饰器注册路由，路径参数用 `{xxx}`（Express 是 `:xxx`）
- 没有 req/res：**参数写进函数签名**（按类型自动判定路径/查询/请求体），**响应直接 return dict**
- 请求体用 **Pydantic 模型**（`BaseModel`）声明，进函数前自动校验，省掉手写校验 if
- `async def` + `await` 写法照搬 JS；`/docs` 白送可交互接口文档

⚠️ 易混淆
- FastAPI 用类型注解做**运行时**校验/转换，这和 TS interface（编译后即消失）本质不同——别以为 `req.body as UserIn` 那套在这也只是「提示」
- 路径参数 `{}` vs 查询参数：在路径里出现的才是路径参数，简单类型 + 不在路径里 = 查询参数
- `async/await` 写法虽像 JS，但底层并发机制（GIL/ASGI）不同，机制层面详见第 17 篇
- 报错别去手动拼 res，用 `raise HTTPException(status_code=..., detail=...)` 表达

下一篇：15 - 请求参数与数据校验（Pydantic 模型进阶：字段约束、嵌套模型、自定义校验，对比 zod / TS interface）。

## 参考资料

- [Python 3 文档](https://docs.python.org/3/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
