# Python（33）- 实战——AI 生成一个接口 demo

> 前面 14~18 篇把 FastAPI、Pydantic、SQLAlchemy、依赖注入这些"零件"一个个讲透了。这一篇我们换个干活方式：**不再逐行手写，而是让 AI 一次性生成一个带数据库的接口，你的角色从"码字员"变成"读懂 + 校验 + 联调"**。看完你能独立走完一条真实链路：需求 → 写给 AI 的需求描述 → 读懂它生成的三层代码 → 跑起来联调。

Java 第 30 课是"从下往上一行行盖楼"，这一篇是同一个目标的 **AI 版本**。为什么这样安排？因为 Python 的 AI/胶水定位决定了真实开发里你大概率会让 Copilot / Cursor / Claude 先生成骨架，再自己改。但这恰恰是新手最危险的阶段——**AI 生成的代码看着能跑，你却说不清它对不对**。这一篇就教你怎么把 AI 当脚手架，同时守住"会读、会改、会验证"的底线。

【前端类比】这就像你用 v0 / Cursor 生成一个 React 组件：它能秒出一个能渲染的 `<UserForm />`，但你必须看懂它的 props、state、副作用，知道哪里要改、哪里有坑。后端接口同理——AI 生成不等于你可以不懂。

---

# 一、需求分析：先把需求"翻译"成给 AI 的描述

【前端类比】这一步就像你接到一个页面需求，先不急着喊 AI 生成，而是先想清楚：要几个接口？每个接口收什么、返回什么？数据长啥样？把这些想明白，AI 才能生成对的代码——**你描述得越含糊，AI 越爱自由发挥**。

我们要做的需求很常见：**文章管理**（一个最小博客后台）。基础就是经典 **CRUD**（增删改查）：

| 操作 | 前端动作 | 接口 | HTTP 方法 |
|------|---------|------|-----------|
| 查列表 | 进页面拉文章 | `GET /articles` | GET |
| 查详情 | 点某篇看详情 | `GET /articles/{id}` | GET |
| 新增 | 写完点发布 | `POST /articles` | POST |
| 修改 | 编辑后保存 | `PUT /articles/{id}` | PUT |
| 删除 | 点删除 | `DELETE /articles/{id}` | DELETE |

> 注意 URL 风格：这里用 **RESTful 风格**（资源 `/articles` + HTTP 方法表达动作），和一些既有 Java 服务的 `/article/add`、`/article/list`（动词放路径里）不同。两种都常见，FastAPI 社区更偏 RESTful，跟着团队规范走即可。

一篇文章至少这些字段：

```
id        主键, 自增
title     标题, 必填
content   正文, 必填
status    状态, 1=已发布 0=草稿, 默认 0
created_at 创建时间, 后端生成
```

需求清楚后，把它"翻译"成一段能交给 AI 的描述（这就是你给 AI 的 prompt）：

```text
用 FastAPI + SQLAlchemy 2.0 写一个文章管理 CRUD 接口，要求：
1. 数据库用 SQLite(本地文件 app.db)，文章字段：
   id(主键自增)、title(必填)、content(必填)、
   status(int, 1已发布/0草稿, 默认0)、created_at(创建时间)
2. 请求体和响应体用 Pydantic 模型，二者分开(新增时前端不传 id/created_at)
3. 数据库 Session 用 Depends 依赖注入按请求创建
4. 提供 增/删/改/查列表/查详情 五个接口，查不到返回 404
5. 代码分文件：models.py(ORM)、schemas.py(Pydantic)、main.py(路由)
```

> 这段描述里每一条都对应你前面学过的知识点（Pydantic 见第 15 篇、SQLAlchemy 见第 16 篇、Depends 见第 18 篇）。**正因为你学过，才能把需求拆得这么具体**——这就是"会读 AI 代码"的前提：你得先知道正确答案长什么样。

---

# 二、AI 生成的全貌：三个文件，三种角色

AI 按上面的描述生成了三个文件。先别急着看代码，先看清这张分层图——它和 Java 第 30 课的"从下往上盖楼"是一个意思，只是落到 Python 的文件上：

```
前端 axios
   │  POST /articles  { title, content }
   ▼
┌────────────────────────────────────────────────┐
│ main.py     路由层: 收参数→调DB→return           │  ≈ Controller
│   @app.post("/articles")                         │
└──────────────────────┬───────────────────────────┘
                       ▼
┌────────────────────────────────────────────────┐
│ schemas.py  Pydantic: 校验入参 / 塑形出参         │  ≈ In / Out (DTO)
│   ArticleCreate(入参)   ArticleOut(出参)          │
└──────────────────────┬───────────────────────────┘
                       ▼
┌────────────────────────────────────────────────┐
│ models.py   SQLAlchemy: 表↔类映射, 真正存数据      │  ≈ Entity
│   class Article(Base)                            │
└──────────────────────┬───────────────────────────┘
                       ▼
                  SQLite  articles 表
```

**这里藏着 Python 后端最大的一个新手坑，必须先点破：有两套"模型"，名字都叫 Model，但完全是两回事。**

| | SQLAlchemy 模型（`models.py`） | Pydantic 模型（`schemas.py`） |
|--|------------------------------|------------------------------|
| 干啥的 | 映射数据库表，负责**存数据** | 校验请求 / 塑形响应，负责**接口出入境** |
| 基类 | `class Article(Base)` | `class ArticleCreate(BaseModel)` |
| 对应 Java | Entity (`@TableName`) | In / Out (DTO) |
| 前端类比 | Prisma 的 `model` | zod schema / TS interface |

> ⚠️ 为什么要分两套、不能用一套？和 Java 第 30 课"Entity 给数据库看、In/Out 给前端看"是同一个道理：**数据库模型含 `id`、`created_at` 这些前端不该传的字段，还可能含密码等不该返回的字段**。混用会导致前端能乱传 id、或后端把敏感字段泄露出去。AI 有时为了省事会只生成一套——这正是你要盯住、要求它拆开的地方。

下面逐个文件读，重点是**读懂 + 标出哪里要警惕**。

---

# 三、读 models.py：数据库的镜像（≈ Entity）

这一层定义"表长什么样"，对应 Java 的 Entity。用的是 SQLAlchemy 2.0 写法（详见第 16 篇）：

```python
# models.py —— 数据库表的 Python 镜像
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# engine: 数据库连接池, 全局只建一次; sqlite:///app.db 表示当前目录下的 app.db 文件
# echo=True: 把 ORM 背后生成的真实 SQL 打到控制台, 学习/排查期强烈建议开(见第16篇)
engine = create_engine("sqlite:///app.db", echo=True)


# Base: 所有 ORM 模型的基类, 相当于 Prisma schema 的命名空间
class Base(DeclarativeBase):
    pass


# Article: 映射到数据库 articles 表, 一个类 = 一张表, 一个实例 = 一行
class Article(Base):
    __tablename__ = "articles"  # 表名, 必填

    # id: 主键, primary_key=True 即自增主键(对应 SQL 的 AUTO_INCREMENT)
    id: Mapped[int] = mapped_column(primary_key=True)
    # title: 文章标题, 必填字符串列
    title: Mapped[str] = mapped_column()
    # content: 文章正文, 必填字符串列
    content: Mapped[str] = mapped_column()
    # status: 状态 1已发布/0草稿, default=0 是 SQLAlchemy 在 INSERT 时自动填的默认值(应用层, 非数据库 DDL 默认值), 不传则存 0
    status: Mapped[int] = mapped_column(default=0)
    # created_at: 创建时间, default=datetime.now 让插入时自动填当前时间(后端生成, 不信任前端)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)


# 根据上面所有模型定义, 在 app.db 里建好表(已存在则跳过), 类似 Prisma 的 db push
Base.metadata.create_all(engine)
```

【读这段时你该警惕的点】

- **`primary_key=True` 等于自增**：SQLite/MySQL 下整型主键默认自增，前端新增时不该传 id —— 记住这点，下一层 Pydantic 入参就不能有 id。
- **`default=datetime.now`（不带括号！）**：传的是**函数本身**，让每次插入时才调用取当时时间。AI 偶尔会写成 `datetime.now()`（带括号），那会变成"建表那一刻算出一个固定时间，所有行都用它"——这是个隐蔽 bug，读到这行要停一下确认没括号。
- **`echo=True` 生产要关**：会把每条 SQL 打到日志，学习期开着看 SQL 很爽，上线务必关掉。

> 【前端类比】这层就是你 Prisma 的 `schema.prisma`：定义 model、字段、主键、默认值。`Mapped[int]` 这种写法看着陌生，把它当成"带类型标注的字段声明"即可，类型注解机制见第 11 篇。

---

# 四、读 schemas.py：接口的出入境（≈ In / Out）

这一层是 **Pydantic 模型**，专门管"前端能传什么、后端返回什么"，对应 Java 的 In/Out DTO。**这是和 models.py 最容易混的地方，重点读。**

```python
# schemas.py —— 接口出入境的形状定义(Pydantic, 见第15篇)
from datetime import datetime
from pydantic import BaseModel


# ArticleCreate: 新增文章的"入参", 只暴露前端该填的字段
# 故意不含 id(自增) 和 created_at(后端生成) —— 这正是入参/出参要分开的核心原因
class ArticleCreate(BaseModel):
    title: str       # 标题, 必填; 缺了或类型不对, FastAPI 自动返回 422
    content: str     # 正文, 必填
    status: int = 0  # 状态, 选填; 给了默认值 0 就变可选, 不传即草稿


# ArticleUpdate: 修改文章的入参, 这里和新增字段一致, 单独定义是为了未来好扩展
class ArticleUpdate(BaseModel):
    title: str       # 标题
    content: str     # 正文
    status: int      # 状态; 改的时候要求明确传, 不给默认值


# ArticleOut: 返回给前端的"出参", 含数据库生成的 id 和 created_at
class ArticleOut(BaseModel):
    id: int                  # 主键, 前端编辑/删除时要回传
    title: str               # 标题
    content: str             # 正文
    status: int              # 状态
    created_at: datetime     # 创建时间, 序列化成 JSON 时自动转 ISO 字符串

    # model_config: Pydantic v2 的配置; from_attributes=True 允许"从对象属性读值"
    # WHY: 路由层会直接把 SQLAlchemy 的 Article 对象丢给它, 没这行就无法从 ORM 对象塑形
    model_config = {"from_attributes": True}
```

【这段的三个关键认知】

1. **入参故意"缺字段"是对的，不是 bug**：`ArticleCreate` 没有 `id`/`created_at`，因为这俩由后端/数据库生成，前端传了也该被忽略。AI 如果在入参里塞了 id，你要删掉。
2. **`from_attributes=True` 是 ORM → Pydantic 的桥**（Pydantic v2 的写法；v1 里叫 `orm_mode = True`，AI 有时会写串版本，看到 `orm_mode` 就知道它在用旧写法）。有了它，路由里才能 `return article_对象` 让 FastAPI 自动把 ORM 对象塑形成 `ArticleOut`。
3. **对照前端**：`ArticleCreate` ≈ 你和后端约定的 `interface CreateArticleReq`，`ArticleOut` ≈ `interface ArticleResp`。区别是——Pydantic 这俩是**运行时真实存在、真的会校验**的对象，不像 TS interface 编译后就没了（第 15 篇反复强调过这个差异）。

| | 入参 ArticleCreate | 出参 ArticleOut | ORM Article |
|--|--------------------|------------------|-------------|
| 给谁看 | 前端→后端 | 后端→前端 | 后端↔数据库 |
| 含 id 吗 | ❌ 不含 | ✅ 含 | ✅ 含 |
| 前端类比 | 请求体 type | 响应 type | Prisma model |

---

# 五、读 main.py：路由层（≈ Controller）

最后是把上面两层串起来的路由层，对应 Java 的 Controller：**收参数 → 操作数据库 → return**，本身不该堆业务逻辑。

```python
# main.py —— 路由层, 把请求接到数据库上
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import engine, Article            # ORM 引擎和模型
from schemas import ArticleCreate, ArticleUpdate, ArticleOut  # 出入境模型

app = FastAPI()  # app: FastAPI 应用实例, 相当于 Express 的 app


# get_db: 依赖函数, 每个请求调一次, yield 出一个 Session 给接口用(见第18篇)
# yield 后的 close 在请求处理完才执行(生成器特性, 见第6篇), 保证连接一定被释放
def get_db():
    db = Session(engine)  # 每个请求开一个独立 Session(切勿全局共享, 非线程安全)
    try:
        yield db          # 把 Session 交给接口函数
    finally:
        db.close()        # 请求结束(无论成功失败)都关闭, 归还连接


# 查列表: GET /articles, 无参数, 返回全部文章
# response_model=list[ArticleOut]: 声明返回类型, FastAPI 据此把 ORM 对象塑形成 JSON + 写进 /docs
@app.get("/articles", response_model=list[ArticleOut])
def list_articles(db: Session = Depends(get_db)):
    # select(Article): 查 Article 整表; scalars().all(): 取成对象列表(见第16篇)
    return db.scalars(select(Article)).all()


# 查详情: GET /articles/{id}, id 是路径参数(自动转 int)
@app.get("/articles/{article_id}", response_model=ArticleOut)
def get_article(article_id: int, db: Session = Depends(get_db)):
    article = db.get(Article, article_id)  # 按主键查, 查不到返回 None
    # 业务分支: 目标文章不存在时, 主动抛 404 (对应前端的 res.status(404))
    if article is None:
        raise HTTPException(status_code=404, detail="文章不存在")
    return article


# 新增: POST /articles, 请求体是 ArticleCreate(自动校验)
@app.post("/articles", response_model=ArticleOut, status_code=201)
def create_article(payload: ArticleCreate, db: Session = Depends(get_db)):
    # 把校验过的入参组装成 ORM 对象; **payload.model_dump() 把 Pydantic 模型转 dict 再解包成关键字参数
    article = Article(**payload.model_dump())
    db.add(article)      # 放进 Session 暂存区(还没写库, 见第16篇)
    db.commit()          # 提交, 此刻才真正 INSERT
    db.refresh(article)  # 从库刷新, 拿到数据库生成的 id 和 created_at
    return article


# 修改: PUT /articles/{id}, 路径参数定位 + 请求体带新值
@app.put("/articles/{article_id}", response_model=ArticleOut)
def update_article(article_id: int, payload: ArticleUpdate, db: Session = Depends(get_db)):
    article = db.get(Article, article_id)
    # 业务分支: 改一个不存在的文章, 直接 404, 而非静默新建
    if article is None:
        raise HTTPException(status_code=404, detail="文章不存在")
    # 逐字段更新; Session 的"脏检查"会自动记下哪些属性变了, commit 时生成 UPDATE
    article.title = payload.title
    article.content = payload.content
    article.status = payload.status
    db.commit()          # 提交改动
    db.refresh(article)  # 刷新拿最新值
    return article


# 删除: DELETE /articles/{id}
@app.delete("/articles/{article_id}")
def delete_article(article_id: int, db: Session = Depends(get_db)):
    article = db.get(Article, article_id)
    # 业务分支: 删不存在的, 报 404 避免误导前端"删成功了"
    if article is None:
        raise HTTPException(status_code=404, detail="文章不存在")
    db.delete(article)  # 标记删除, 放进暂存区
    db.commit()         # 提交, 真正 DELETE
    return {"deleted": article_id}
```

并排看一眼 Express，路由壳子几乎一样，差异都在第 14 篇讲过（装饰器即路由、参数靠签名、return 即响应）：

```javascript
// Express 对照: 同样五个路由, 但参数从 req 掏、要手写校验、返回手动 res.json
app.post('/articles', (req, res) => {
  const { title, content } = req.body   // 手动取, 还得自己校验 title 是不是 string
  // ...自己拼 SQL 或调 ORM, 自己处理 404...
  res.status(201).json(article)
})
```

【这层最该盯住的点】

- **`response_model=ArticleOut` 是安全阀**：它强制响应只输出 `ArticleOut` 声明的字段。就算你不小心 `return` 了带敏感字段的 ORM 对象，多余字段也会被过滤掉。AI 若漏写这个参数，接口能跑但会"裸返回"整个 ORM 对象——要补上。
- **`add/commit` 两步别漏 commit**：SQLAlchemy 不是 Prisma，`add` 只是暂存，**忘了 `commit()` 数据根本没存进库**（第 16 篇的核心坑）。AI 一般不会漏，但你 review 时要扫一眼每个写操作后面有没有 commit。
- **`model_dump()` 是 Pydantic v2 写法**（v1 叫 `.dict()`）。看到 AI 写 `.dict()` 说明它在用旧 API，能跑但已过时。

---

# 六、跑起来 + 联调

代码读懂了，跑起来验证。FastAPI 自己不带服务器，靠 uvicorn 跑（见第 13、14 篇）：

```bash
# 装依赖: fastapi 框架 + uvicorn 服务器 + sqlalchemy ORM
pip install "fastapi[standard]" uvicorn sqlalchemy

# 启动: main 是文件名(main.py), app 是实例名, --reload 类似前端的 nodemon 热重载
uvicorn main:app --reload
```

启动后，**先别急着写前端**，打开 `http://127.0.0.1:8000/docs`——FastAPI 白送的可交互 Swagger 文档（Express 要装 swagger 才有）。五个接口、参数、请求体结构全在上面，能直接点 "Try it out" 发请求。**这是验证 AI 代码最快的方式：不用写一行前端，先在 /docs 把五个接口点一遍**。

也可以用 curl 走一遍完整链路：

```bash
# 新增一篇(POST, body 是 JSON)
curl -X POST http://127.0.0.1:8000/articles \
  -H "Content-Type: application/json" \
  -d '{"title":"第一篇","content":"正文内容","status":1}'
# 返回 {"id":1,"title":"第一篇","content":"正文内容","status":1,"created_at":"2026-06-11T..."}

# 查列表
curl http://127.0.0.1:8000/articles

# 查不存在的 → 验证 404 分支
curl http://127.0.0.1:8000/articles/999
# 返回 {"detail":"文章不存在"}, HTTP 状态码 404
```

前端联调就回到你的主场，和调任何 RESTful 接口一样：

```ts
import request from '@/utils/request' // 项目封装的 axios 实例

// 查列表 —— GET, 无参数
export function fetchArticles() {
  return request({ url: '/articles', method: 'get' })
}

// 新增 —— POST, 参数放 data(作为 JSON 请求体)
export function createArticle(payload: {
  title: string
  content: string
  status?: number
}) {
  return request({ url: '/articles', method: 'post', data: payload })
}
```

【联调自查清单】出问题按这个顺序排查（和 Java 第 30 课同源，但响应约定不同）：

```
后端收不到参数 / 422 ？
 ├─ POST/PUT → 前端是否用了 data(请求体), 而不是 params(URL查询串)?
 ├─ 字段名/类型对不对? title 传了 null、status 传了字符串 → Pydantic 直接 422
 └─ 看响应里的 detail, FastAPI 会精确告诉你哪个字段不合法

404 ？
 └─ 路径 id 对应的数据不存在, 命中了 raise HTTPException(404) 分支

500 ？
 ├─ 多半是后端代码异常: 忘了 commit、Session 用法错、default=datetime.now() 带括号等
 └─ 看 uvicorn 终端打印的异常栈追根因(echo=True 时还能看到执行了哪些 SQL)
```

> ⚠️ 响应约定差异：FastAPI 默认**直接用 HTTP 状态码表达结果**（200 成功 / 422 校验失败 / 404 找不到），返回体就是数据本身或 `{"detail": "..."}`。这和一些既有 Java 服务“一律 HTTP 200，靠业务错误码区分成败”是两种风格。前端对接 FastAPI 时**看 HTTP 状态码 + catch 错误**即可，不用先判断业务错误码。具体用哪套看团队约定。

---

# 七、用 AI 生成接口的正确姿势（本篇的真正重点）

代码会读了，回到这一篇的核心命题：**怎么把 AI 当好脚手架，又不被它坑**。沉淀成一份 review 清单，AI 生成后逐条过：

| 检查项 | 为什么 | 怎么改 |
|--------|--------|--------|
| 入参/出参模型分开了吗 | 混用会让前端能传 id、或泄露敏感字段 | 拆成 `XxxCreate` / `XxxOut` 两个模型 |
| 入参里有没有混进 id/created_at | 这些该由后端生成 | 从入参模型删掉 |
| 出参有没有配 `response_model` | 没配会裸返回整个 ORM 对象 | 路由装饰器补 `response_model=` |
| 每个写操作后有没有 `commit()` | 漏了数据不落库 | add/delete/改属性后补 commit |
| `default=datetime.now` 带括号没 | 带括号会让所有行用同一时间 | 去掉括号, 传函数本身 |
| 用的是 v2 还是 v1 API | `.dict()`/`orm_mode` 是过时写法 | 统一到 `.model_dump()`/`from_attributes` |
| Session 是按请求建的吗 | 全局共享非线程安全 | 用 `Depends(get_db)` |
| 查不到有没有处理 | 静默返回 None 会误导前端 | `raise HTTPException(404)` |

> 一句话总结这套方法：**AI 负责出初稿和体力活，你负责出判断**。能列出这张清单本身，说明你前面 14~18 篇没白学——你不是在"信任 AI"，而是在"校验 AI"。这正是从前端转后端、又要用好 AI 编程的人最该练的能力：不被代码量吓住，也不被"能跑"骗过去。

---

# 八、总结

这一篇把前面所有 FastAPI/数据库零件，用"让 AI 生成、你来读懂校验联调"的方式串成了一条完整链路。开发姿势从手写变成了 review，但要求的理解深度一点没降。

✅ 该掌握
- 开发链路：把需求翻译成清晰的 AI prompt → 读懂生成的 `models/schemas/main` 三层 → `/docs` 或 curl 跑通 → 前端联调
- **两套模型别混**：SQLAlchemy 模型（存数据，≈Entity）vs Pydantic 模型（接口出入境，≈In/Out）
- 三层职责：`main.py` 收发不写业务、`schemas.py` 管校验塑形、`models.py` 管落库
- 写操作三件套：`add` → `commit`（必须）→ `refresh`（拿回填的 id）
- 验证优先用 `/docs`，比写前端快得多；联调按"422→404→500"顺序排查

⚠️ 易混淆
- **SQLAlchemy 模型 ≠ Pydantic 模型**：名字都像 Model，一个对数据库、一个对接口，AI 爱偷懒合成一套，必须拆开
- **`add` 不等于写库**：忘了 `commit()` 数据不落地（SQLAlchemy 不是 Prisma，见第 16 篇）
- `default=datetime.now`（不带括号传函数）vs `datetime.now()`（带括号是固定值，bug）
- Pydantic **v2**（`model_dump`/`from_attributes`）vs **v1**（`.dict`/`orm_mode`）写法别混，AI 常生成旧版
- FastAPI 默认**靠 HTTP 状态码**表达成败，和部分 Java 服务的业务错误码风格不同，联调时以接口约定为准
- AI 生成 ≠ 可以不懂：能跑的代码可能藏着裸返回、漏 commit、版本混用等坑，靠第七节的清单逐条校验

下一篇：34 - 实战-AI生成一个数据脚本（抓数据 → 用 Pandas 清洗分析 → matplotlib 出图，把阶段四的数据处理零件也用 AI 串一遍）。

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“Python（33）- 实战——AI 生成一个接口 demo”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
