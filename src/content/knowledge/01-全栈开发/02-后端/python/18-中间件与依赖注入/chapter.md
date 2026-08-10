# 第 18 课：中间件与依赖注入

> 每个接口都要校验登录、都要记日志、都要处理跨域——这些「横切关注点」你不想在每个路由里复制粘贴一遍。在 Express 里你用中间件解决，在 FastAPI 里你有**两件武器**：沿用你熟悉的「中间件（洋葱模型）」，外加一个更趁手的新东西——**依赖注入 `Depends`**。这篇讲清两者各管什么、认证怎么做、跨域（CORS）怎么配，并帮你避开「把 `Depends(fn)` 写成 `Depends(fn())`」这类前端直觉陷阱。

## 一、先建直觉：你早就用过「中间件」了

在 Express/Koa 里，中间件是你每天都在写的东西——一个个函数串成「洋葱」，请求进来层层穿过，响应出去再层层穿回：

```javascript
// Express：经典中间件，层层包裹
const app = express()

// 全局中间件：每个请求都先过这里（记日志）
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()  // 关键：调用 next() 把控制权交给下一层，不调就卡死
})

// 业务路由
app.get('/users', (req, res) => res.json([]))
```

FastAPI 的 HTTP 中间件几乎是一对一翻译：

```python
# FastAPI：等价的全局中间件
from fastapi import FastAPI, Request

app = FastAPI()

# @app.middleware("http")：注册一个对所有 HTTP 请求生效的中间件
# request：本次请求对象，≈ Express 的 req
# call_next：可 await 的函数，把请求传给「下一层」并拿回 response，≈ Express 的 next()
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"{request.method} {request.url.path}")  # 进入业务前：记日志
    response = await call_next(request)             # 交给下一层处理，拿回响应
    return response                                 # 必须把 response 返回出去
```

**类比成立的地方**：洋葱模型、`call_next` ≈ `next()`、可以在「进业务前」和「出业务后」两个时机插入逻辑——这些和 Express/Koa 一模一样。

**边界（这里和 Express 不一样）**：

1. **FastAPI 中间件必须 `return response`**，而不是像 Express 那样调 `next()` 就完事——它更像 **Koa** 的 `async (ctx, next) => { await next() }` 风格（拿到下游结果再返回）。
2. **`call_next` 返回的是一个 `Response` 对象**，FastAPI 已经帮你把业务返回值序列化好了，你拿到的是成品响应，不是裸数据。
3. 真正的重头戏不是中间件，而是下面这个 Express 里没有的东西——**依赖注入 `Depends`**。FastAPI 官方更推荐用 `Depends` 处理认证、取数据库连接等大部分场景，中间件只留给「真正全局、跟具体路由无关」的逻辑。

---

## 二、依赖注入 `Depends`：把「准备工作」抽成可复用的函数

很多接口都要做同一件「准备工作」：解析当前登录用户、拿一个数据库会话、校验分页参数……在 Express 里你会写一串中间件挂上去，但中间件有个痛点——**它把结果塞进 `req` 上，靠约定取值，没有类型、容易写错 key**。

FastAPI 的解法是**依赖注入（Dependency Injection，DI）**：你把「准备工作」写成一个普通函数，路由函数在参数里用 `Depends(那个函数)` 声明「我需要它的结果」，FastAPI 会在调用路由前**自动执行依赖函数、把返回值作为参数注入进来**。

> **前端类比**：这和 **React 的自定义 Hook** 神似——`useAuth()` 帮你把「取当前用户」的逻辑封装成可复用单元，组件里调一下就拿到结果，不关心内部怎么实现。`Depends(get_current_user)` 就是后端版的 `const user = useAuth()`：声明式地「要一个东西」，框架负责把它准备好递过来。如果你用过 Angular/Nest.js，那它就是你熟悉的构造器注入，只不过 FastAPI 是「按函数参数注入」。

```python
# FastAPI 依赖注入最小例子
from fastapi import FastAPI, Depends

app = FastAPI()

# 这是一个「依赖函数」：负责解析并返回分页参数
# 它本身长得和普通路由函数一样，能声明查询参数（详见第 14 篇）
# skip：跳过多少条，默认 0；limit：取多少条，默认 10
def pagination_params(skip: int = 0, limit: int = 10):
    # 返回一个 dict，作为「准备好的结果」交给需要它的路由
    return {"skip": skip, "limit": limit}

# 路由函数：参数 page 用 Depends 声明「我要 pagination_params 的结果」
# FastAPI 会先调 pagination_params(解析 ?skip=&limit=)，再把返回值注入给 page
@app.get("/users")
def list_users(page: dict = Depends(pagination_params)):
    # 这里直接拿到准备好的分页参数，不用自己从 request 里抠
    return {"skip": page["skip"], "limit": page["limit"]}
```

并排看 Express 里你会怎么做：

```javascript
// Express：靠中间件把结果挂到 req 上，无类型、靠 key 约定
function paginationParams(req, res, next) {
  req.page = {  // 塞进 req.page，下游靠这个 key 取——拼写错了不报错
    skip: parseInt(req.query.skip) || 0,
    limit: parseInt(req.query.limit) || 10,
  }
  next()
}

app.get('/users', paginationParams, (req, res) => {
  res.json({ skip: req.page.skip, limit: req.page.limit })  // 取值靠记 key
})
```

**`Depends` 比中间件强在哪**：

| 维度 | Express 中间件 | FastAPI `Depends` |
|------|----------------|-------------------|
| 结果怎么拿 | 塞进 `req.xxx`，靠 key 约定 | 作为函数参数注入，**有类型、IDE 能补全** |
| 作用范围 | 挂在路由/全局上，全有或全无 | **精确到单个路由**，要哪个声明哪个 |
| 能否声明参数 | 自己从 `req.query/body` 抠 | 依赖函数能直接声明查询/路径参数，自动校验 |
| 复用 | 函数复用 | 函数复用 **+ 自动出现在 OpenAPI 文档** |
| 嵌套 | 手动串 | **依赖可以依赖别的依赖**（自动递归解析） |

> **关键差异（别套 Express 心智）**：`Depends` **不是**「请求进来前跑一遍」的全局拦截器，它是**「这个路由声明了我要什么，框架就给我准备什么」**——是按需的、声明式的、带类型的。这才是 FastAPI 处理认证/数据库连接的首选，中间件退居二线。

---

## 三、`Depends(fn)` vs `Depends(fn())`：最容易踩的前端坑

这是前端新手最高频的错误，单独拎出来讲。看这两行：

```python
# ✅ 正确：传「函数本身」，FastAPI 负责在每次请求时调用它
def good(page: dict = Depends(pagination_params)):
    ...

# ❌ 错误：传「函数调用的结果」，等于在模块加载时就执行了一次、之后再也不执行
def bad(page: dict = Depends(pagination_params())):
    ...
```

> **WHY（为什么这里反直觉）**：作为前端，你习惯 `useAuth()` 是要**带括号调用**的。但 `Depends` 要的是「**待调用的函数对象**」，不是「调用结果」——它需要拿到函数引用，好在**每次请求时**替你调用、注入当前请求的参数。写成 `Depends(fn())` 等于在模块加载那一刻就把函数执行了一次，再把它的**返回值**（这里是个 `dict`）交给 `Depends`；而 `Depends` 拿到的不是可调用对象，FastAPI 在启动 / 注册路由时就会直接报错（无法识别这个依赖）。退一步说，就算返回值碰巧是个函数侥幸没报错，它也只在导入时算过一次，每个请求都拿不到当前的 token、新的数据库会话，认证全失效。记住口诀：**`Depends` 里只写函数名，不加括号。**

类比 React 你能秒懂：

```javascript
// React：把函数本身传给 useMemo/useCallback，由 React 决定何时调用
useEffect(myEffect, [])      // ✅ 传函数引用，React 在合适时机调
useEffect(myEffect(), [])    // ❌ 立即调用，把返回值（很可能是 undefined）当成 effect 回调传进去
```

`Depends(fn)` 对应 `useEffect(myEffect, [])`，`Depends(fn())` 对应那个错误写法——是同一种「该传引用却传了调用结果」的坑。

---

## 四、用 `Depends` 做认证：解析当前登录用户

认证是 `Depends` 最典型的战场。思路：写一个 `get_current_user` 依赖，从请求头里取 token、校验、查出用户；任何需要登录的路由，参数里 `Depends(get_current_user)` 一挂即可。

```python
from fastapi import FastAPI, Depends, HTTPException, Header
from typing import Optional

app = FastAPI()

# 依赖函数：从请求头解析并校验当前用户
# authorization：FastAPI 自动从请求头 Authorization 取值（Header 的用法见第 14 篇）
#                类型标 Optional[str] 表示「可能没有」，默认 None
def get_current_user(authorization: Optional[str] = Header(default=None)):
    # 业务场景：没带 token —— 直接拒绝，返回 401
    if authorization is None:
        # HTTPException 是 FastAPI 抛错的标准方式，会被转成对应状态码的 JSON 响应
        # status_code：HTTP 状态码；detail：错误信息，会出现在响应体里
        raise HTTPException(status_code=401, detail="未登录")

    # 业务场景：token 格式不对（约定必须是 "Bearer xxx"）—— 拒绝
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="token 格式错误")

    # token：去掉 "Bearer " 前缀后的真实令牌字符串
    token = authorization.removeprefix("Bearer ")

    # 这里演示用：真实项目应解码 JWT 或查 Redis/数据库（详见后续认证实践）
    # user：根据 token 查出的当前用户信息
    user = {"id": 1, "name": "imber", "token": token}
    return user  # 返回值会被注入到声明了 Depends(get_current_user) 的路由

# 需要登录的路由：参数 user 一挂 Depends，进函数时它已是「校验通过的用户」
@app.get("/me")
def read_me(user: dict = Depends(get_current_user)):
    # 走到这里说明认证已通过（没过会在依赖里就 raise 401，根本进不来）
    return {"id": user["id"], "name": user["name"]}
```

并排看 Express 的等价写法：

```javascript
// Express：认证中间件 + 手动挂到需要保护的路由上
function getCurrentUser(req, res, next) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ detail: '未登录' })
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ detail: 'token 格式错误' })
  req.user = { id: 1, name: 'imber' }  // 挂到 req.user，下游靠 key 取
  next()
}

// 在需要保护的路由上手动挂中间件
app.get('/me', getCurrentUser, (req, res) => {
  res.json({ id: req.user.id, name: req.user.name })
})
```

差别就在前面那张表：FastAPI 版本里 `user` 是**带类型的函数参数**（IDE 能补全），且这个 `get_current_user` 会**自动出现在 `/docs` 文档**里标注「这个接口需要认证」。

---

## 五、依赖的进阶玩法：嵌套与资源收尾

### 依赖嵌套：依赖还能依赖别的依赖

`Depends` 的杀手锏：一个依赖函数里可以**再用 `Depends` 声明它自己的依赖**，FastAPI 会自动递归解析。这是中间件做不到的优雅。

```python
# 底层依赖：管理员校验，它自己又依赖 get_current_user
# user：通过 Depends 注入的当前用户（复用上面的认证逻辑，不用重写一遍）
def require_admin(user: dict = Depends(get_current_user)):
    # 业务场景：登录了但不是管理员 —— 返回 403（已登录但无权限）
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user  # 校验通过，把用户继续往上传

# 路由只声明最顶层的依赖，底层的 get_current_user 会被自动连带执行
@app.delete("/users/{user_id}")
def delete_user(user_id: int, admin: dict = Depends(require_admin)):
    # 能进来说明：① 已登录（get_current_user 过了）② 是管理员（require_admin 过了）
    return {"deleted": user_id}
```

执行顺序是自动的：`get_current_user` → `require_admin` → 路由函数。你只声明了 `require_admin`，FastAPI 看到它依赖 `get_current_user`，就**自动先把那个也跑了**。类比 React Hook 里一个自定义 Hook 内部调另一个 Hook（`useAdmin` 内部调 `useAuth`），调用链自动展开。

### `yield` 依赖：带「收尾」的资源管理（数据库连接最常用）

如果依赖需要**用完后收尾**（关数据库连接、释放锁），用 `yield` 代替 `return`：`yield` 之前是「准备」，`yield` 之后是「收尾」，收尾会在请求处理完后自动执行。

```python
# yield 依赖：典型用于数据库会话——请求开始时开，请求结束时关
def get_db():
    db = SessionLocal()      # 准备阶段：创建数据库会话（SessionLocal 见第 16 篇）
    try:
        yield db             # 把 db 注入给路由，函数在此「暂停」，等路由用完
    finally:
        db.close()           # 收尾阶段：无论路由成功还是抛错，都关掉连接

# 路由拿到 db，用完后 FastAPI 自动回到上面的 finally 关连接
@app.get("/items")
def list_items(db = Depends(get_db)):
    return db.query(...)  # 伪代码：用 db 查数据
```

> **前端类比**：`yield` 依赖 ≈ React `useEffect` 里 `return () => cleanup()` 的「副作用 + 清理函数」模式——`yield` 前是 effect 主体，`yield` 后（`finally`）是 cleanup。生成器 `yield` 的语法对标 JS `function*`/`yield`（详见第 06 篇），这里借它「暂停—恢复」的能力把收尾逻辑挂在请求生命周期末尾。

---

## 六、CORS：跨域，前端工程师的老朋友

跨域你太熟了——前端 fetch 后端被浏览器拦下来、控制台一片红的 CORS 报错。后端要做的是**主动放行**：通过响应头告诉浏览器「这些来源我允许」。FastAPI 用一个现成的中间件 `CORSMiddleware` 搞定。

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# add_middleware：注册中间件类（注意是「类」，不是上面 @app.middleware 那种函数写法）
app.add_middleware(
    CORSMiddleware,
    # allow_origins：允许跨域访问的前端来源列表（精确到协议+域名+端口）
    allow_origins=["http://localhost:5173", "https://my-frontend.com"],
    # allow_credentials：是否允许携带 Cookie/认证信息（对应前端 fetch 的 credentials: 'include'）
    allow_credentials=True,
    # allow_methods：允许的 HTTP 方法，["*"] 表示全部
    allow_methods=["*"],
    # allow_headers：允许前端带的请求头，["*"] 表示全部
    allow_headers=["*"],
)
```

并排看 Express 的 `cors` 中间件，思路完全一致：

```javascript
// Express：用 cors 中间件放行
const cors = require('cors')
app.use(cors({
  origin: ['http://localhost:5173', 'https://my-frontend.com'],
  credentials: true,
}))
```

> **必踩的坑（前端尤其会中招）**：当 `allow_credentials=True`（要带 Cookie）时，`allow_origins` **不能用 `["*"]` 通配**。这是浏览器的硬性安全规则——「带凭证」和「允许任意来源」不能同时成立，必须写出**具体的来源列表**。很多人本地图省事写 `allow_origins=["*"]` + `allow_credentials=True`，结果带 Cookie 的请求依然跨域失败，排查半天。要么列具体域名，要么关掉 `allow_credentials`。

---

## 七、中间件 vs 依赖注入：到底用哪个？

两件武器功能有重叠，给你一张决策表：

| 场景 | 推荐 | 原因 |
|------|------|------|
| 认证、取当前用户 | **`Depends`** | 按路由精确控制、带类型、自动进文档 |
| 取数据库会话/连接 | **`Depends`（yield 版）** | 自动收尾关连接，生命周期对齐请求 |
| 分页/通用查询参数解析 | **`Depends`** | 可声明参数、自动校验、可复用 |
| 权限分级（admin/普通） | **`Depends`（嵌套）** | 依赖套依赖，组合清晰 |
| 全局日志、请求计时 | **中间件** | 真·全局、和具体路由无关 |
| 统一改写所有响应头 | **中间件** | 拿得到最终 `response` 对象 |
| 全局异常兜底 | **异常处理器**（`@app.exception_handler`） | 比中间件更专门，详见后续 |

一句话经验：**和「某些路由需要什么」相关的，用 `Depends`；和「所有请求都要做、且与业务无关」相关的，用中间件。** FastAPI 官方也是这个倾向——能用 `Depends` 就别用中间件。

---

## 八、前端新手最易踩的坑汇总

1. **`Depends(fn())` 写成了带括号调用**（第三节重点）：只写函数名 `Depends(fn)`，加了括号等于服务启动时执行一次、结果冻死，认证/DB 全失效。

2. **`allow_credentials=True` 还配 `allow_origins=["*"]`**：浏览器禁止「带凭证 + 通配来源」组合，带 Cookie 的跨域必然失败。要列具体域名。

3. **以为中间件能像 `Depends` 那样按路由挂**：`@app.middleware("http")` 是**全局**的，对所有请求生效。想「只保护部分路由」请用 `Depends`，别试图在中间件里写 `if request.url.path == ...` 硬判断。

4. **中间件里忘了 `return response`**：Express 调 `next()` 就行，FastAPI 中间件必须把 `await call_next(request)` 拿到的 `response` 返回出去，否则请求挂起/报错。

5. **在 `async def` 依赖里调同步阻塞代码**：和第 17 篇说的一样，依赖函数若是 `async def`，里面别调 `time.sleep` 或同步阻塞 IO，会卡住事件循环。纯同步的依赖直接用普通 `def`，FastAPI 会自动丢到线程池跑，反而更安全。

6. **同一请求里依赖被重复执行的误解**：默认情况下，**同一个请求内**多个路由参数依赖了同一个函数，FastAPI **只执行一次并缓存结果**（`use_cache=True`）。别担心 `get_current_user` 被调好几遍——不会。

---

## 小结

FastAPI 给你两件武器处理「横切关注点」：**中间件**（沿用 Express/Koa 的洋葱模型，`call_next` ≈ `next()`，但必须 `return response`，且是全局的）和**依赖注入 `Depends`**（更像 React 自定义 Hook，声明式、带类型、按路由精确控制，是认证/取 DB 的首选）。认证就写个 `get_current_user` 依赖、各路由 `Depends` 一挂；CORS 用 `CORSMiddleware` 放行，注意带凭证时不能用通配来源。一条总原则：**和「某些路由需要什么」相关用 `Depends`，和「所有请求都做、与业务无关」相关用中间件。**

✅ **该掌握**
- 中间件写法 `@app.middleware("http")`，`call_next` ≈ `next()`，必须 `return response`
- `Depends(fn)` 注入依赖结果，类比 React 自定义 Hook，声明式 + 带类型
- 依赖能嵌套（依赖套依赖，自动递归）、能用 `yield` 做资源收尾（≈ useEffect cleanup）
- 认证用 `get_current_user` + `HTTPException(401/403)`；CORS 用 `CORSMiddleware`
- 选型原则：路由相关用 `Depends`，全局无关业务用中间件

⚠️ **易混淆**
- `Depends(fn)` ✅ vs `Depends(fn())` ❌ —— 只写函数名，别加括号
- `allow_credentials=True` 时 `allow_origins` 不能是 `["*"]`，必须列具体来源
- 中间件是全局的，不能按路由挂；要「部分路由」用 `Depends`
- 401（未登录） vs 403（已登录但无权限），别用混
- `async def` 依赖里别写同步阻塞代码（详见第 17 篇）
