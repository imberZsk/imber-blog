# Python（15）- 请求参数与数据校验

> 读完你能：围绕“请求参数与数据校验”理解“先建立直觉：Pydantic 模型 ≈ zod schema（不是 TS interface）”与“Pydantic 在 FastAPI 里到底管哪部分参数”，并结合正文示例完成实践与排障。

> 前端拿到一个表单，你会先用 zod 校验一遍再提交；后端接到请求，同样要先校验参数再处理，否则脏数据会一路烂到数据库。这篇讲 FastAPI 的校验主力 **Pydantic**——它长得像 TS interface，干的活像 zod，但有一个本质区别你必须先记住：**它是运行时真校验，不是编译期摆设**。

# 一、先建立直觉：Pydantic 模型 ≈ zod schema（不是 TS interface）

你在前端定义一个「用户」的形状，大概率写过这两种：

```typescript
// 写法 A：TS interface —— 只在编译期存在，打包后被擦除，运行时啥也不剩
interface User {
  name: string
  age: number
}

// 写法 B：zod schema —— 运行时真实存在的对象，能真的去校验数据
import { z } from 'zod'
const UserSchema = z.object({
  name: z.string().min(2),
  age: z.number().int().gte(0),
})
const user = UserSchema.parse(req.body)   // 不合法直接抛错
```

Pydantic 的 `BaseModel` 对应的是**写法 B（zod）**，而不是写法 A：

```python
# Pydantic 模型：定义一个「用户」的数据形状 + 校验规则
from pydantic import BaseModel, Field

class User(BaseModel):
    name: str = Field(min_length=2)          # 字符串，最少 2 个字符
    age: int = Field(ge=0)                    # 整数，>= 0（ge = greater or equal）

# 用一坨原始数据去「实例化」，等价于 zod 的 .parse()
user = User(name="imber", age=18)            # 合法，正常构造
# User(name="x", age=-1)                     # 不合法，直接抛 ValidationError
```

| 维度 | TS interface | zod | Pydantic BaseModel |
|------|-------------|-----|--------------------|
| 运行时是否存在 | 否（被擦除） | 是 | 是 |
| 能否真的校验数据 | 不能 | 能 | 能 |
| 长得像哪个 | —— | —— | 形状像 interface，能力像 zod |
| 类型不符时 | 编译期红线 | 运行时抛错 | 运行时抛 `ValidationError` |

**边界（这里和 TS 不一样，最关键的认知）**：TS 的类型在编译后**完全消失**，运行时 `age: number` 不会拦住一个传进来的字符串。Pydantic 的字段注解（`age: int`）是**运行时生效的校验规则**——它不仅校验，还会**尝试自动转换**（下面第三节细说）。所以别把 Pydantic 当成「Python 版 interface」，要当成「自带类型注解语法糖的 zod」。

---

# 二、Pydantic 在 FastAPI 里到底管哪部分参数

一个 HTTP 请求的参数有三个来源，FastAPI 对它们的处理方式不同。先建立全景图（路由、`@app.post` 这些写法详见第 14 篇 FastAPI 入门）：

| 参数来源 | 例子 | FastAPI 怎么接 | 谁来校验 |
|---------|------|---------------|----------|
| 路径参数 | `/users/100` 里的 `100` | 函数形参 `user_id: int` | 类型注解直接校验 |
| 查询参数 | `/users?page=2&size=10` | 函数形参 `page: int` | 类型注解 + `Query()` |
| 请求体 | POST 的 JSON body | 形参类型是 **Pydantic 模型** | Pydantic 模型校验 |

判断规则很简单：**形参类型是 Pydantic 模型 → FastAPI 当成请求体；是 `int/str/float/bool` 等基础类型 → 当成路径或查询参数**。

```python
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI()

# 请求体模型：对应前端 POST 上来的那坨 JSON
class CreateUserBody(BaseModel):
    name: str = Field(min_length=2, max_length=20)   # 用户名，2~20 字符
    age: int = Field(ge=0, le=120)                    # 年龄，0~120
    email: str                                        # 邮箱（这里先用普通 str）

# user_id 是路径参数（基础类型）；body 是请求体（Pydantic 模型）
@app.post("/users/{user_id}")
def create_user(user_id: int, body: CreateUserBody):
    # 走到这里时，user_id 和 body 都已经校验+转换完毕了
    # body 是一个 CreateUserBody 实例，用 . 访问字段，有类型提示
    return {"user_id": user_id, "name": body.name, "age": body.age}
```

并排看你熟悉的 Express + zod，会发现 FastAPI 把「解析 + 校验」这步**内建**进了框架，省掉了手动 parse：

```javascript
// Express 里你得自己解析、自己校验、自己 catch
app.post('/users/:userId', (req, res) => {
  const userId = Number(req.params.userId)          // 手动转类型
  const result = CreateUserSchema.safeParse(req.body) // 手动校验
  if (!result.success) return res.status(422).json(result.error)
  const body = result.data
  res.json({ userId, name: body.name })
})
```

FastAPI 把这三步（转类型、校验、出错返回 422）全自动化了，你只管声明类型。

---

# 三、字段约束：Field ≈ zod 的链式方法

zod 用链式调用堆约束，Pydantic 用 `Field()` 的参数堆约束。对照表：

| 校验意图 | zod | Pydantic `Field()` |
|---------|-----|--------------------|
| 字符串最小长度 | `.min(2)` | `min_length=2` |
| 字符串最大长度 | `.max(20)` | `max_length=20` |
| 数字 > 0 | `.gt(0)` 或 `.positive()` | `gt=0` |
| 数字 >= 0 | `.gte(0)` | `ge=0` |
| 数字 <= 100 | `.lte(100)` | `le=100` |
| 正则匹配 | `.regex(/.../)` | `pattern=r"..."` |
| 必填 | 默认必填 | 不给默认值即必填 |
| 可选/有默认值 | `.optional()` / `.default(x)` | 给默认值 `= x` |

```python
from pydantic import BaseModel, Field

class Product(BaseModel):
    # 商品名：必填，1~50 字符
    title: str = Field(min_length=1, max_length=50)
    # 价格：必填，必须 > 0（gt = greater than，严格大于）
    price: float = Field(gt=0)
    # 库存：有默认值 0，所以是可选字段；ge=0 不允许负库存
    stock: int = Field(default=0, ge=0)
    # 手机号：用正则约束格式（中国大陆 1 开头 11 位）
    phone: str = Field(pattern=r"^1\d{10}$")
```

**注意必填的写法**：在 Pydantic v2 里，「不给默认值」就是必填。如果你想显式表达必填又想加约束，写 `Field(...)`（那个 `...` 是 Python 的 `Ellipsis` 对象，Pydantic 约定它表示「必填」）：

```python
class Foo(BaseModel):
    a: str                       # 必填（没默认值）
    b: str = Field(min_length=2) # 必填 + 约束（仍没默认值）
    c: str = "hi"                # 可选，默认 "hi"
    d: str = Field(default="hi", min_length=2)  # 可选 + 约束
```

---

# 四、自动类型转换：和 TS 心智模型差最远的地方

这是前端最容易看走眼的点。Pydantic 在校验时会**尝试合理转换**，而不是死板地「类型不等就报错」。

```python
class Item(BaseModel):
    count: int       # 声明要 int

# 传一个字符串 "123"，Pydantic 会帮你转成整数 123（合理的字符串数字）
item = Item(count="123")
print(item.count, type(item.count))   # 123 <class 'int'>

# 但传 "abc" 这种没法转成数字的，就抛 ValidationError
# Item(count="abc")   # ❌ 报错
```

为什么这很重要？因为 **HTTP 查询参数和路径参数本质上全是字符串**。前端 `/users?age=18`，`age` 在 HTTP 层面是字符串 `"18"`。你在 FastAPI 里声明 `age: int`，Pydantic 自动把 `"18"` 转成 `18`——这正是你想要的，省掉了 Express 里满地的 `Number(req.query.age)`。

> **WHY 它要自动转换**：HTTP 协议传的全是文本，没有「数字类型」这一说。如果不自动转换，你每个接口都得手动 parse 一遍。Pydantic 替你做了这件脏活，这是它比「纯类型检查」更实用的地方。

边界提醒：自动转换是「合理范围内」的转换，不是 JS 那种激进的隐式转换。`bool` 字段传 `"true"/"1"/1` 能转成 `True`，但 Pydantic 不会像 JS 那样把空字符串 `""` 当成 `False`、把 `"hello"` 强转成 truthy。规则比 JS 严格、可预测得多。

---

# 五、可选字段与「可空」：Optional 是个坑

前端 `name?: string`（可选）和 `name: string | null`（可空）是两件事，Python 这里更容易混。

```python
from typing import Optional

class A(BaseModel):
    # ⚠️ 陷阱：Optional[str] 只表示「类型可以是 str 或 None」
    #    它【不】自动让字段变成可选！没给默认值，它依然是必填的
    nickname: Optional[str]          # 必填，但允许传 None

class B(BaseModel):
    # 想让字段「可不传」，必须给默认值
    nickname: Optional[str] = None   # 可选，不传就是 None（这才是你通常要的）
    bio: str = ""                    # 可选，不传就是空串
```

| 前端写法 | 含义 | 对应 Pydantic |
|---------|------|--------------|
| `name?: string` | 可以不传 | `name: str = ""`（给个同类型默认值） |
| `name: string \| null` | 必须传，但可以是 null | `name: Optional[str]`（不给默认值） |
| `name?: string \| null` | 可不传，传了可以是 null | `name: Optional[str] = None` |

> Python 3.10+ 也可以用 `str | None` 代替 `Optional[str]`，和 TS 的联合类型写法一模一样，更推荐。`Optional` 的细节详见第 11 篇类型注解。

**可变默认值的坑**（这是 Python 通用陷阱，Pydantic 里也会遇到）：列表/字典类型的默认值不要直接写 `= []`，用 `Field(default_factory=list)`：

```python
class Order(BaseModel):
    # ✅ 正确：default_factory 每次新建实例都生成一个【新的】空列表
    tags: list[str] = Field(default_factory=list)
    # ❌ 不要写 tags: list[str] = []  —— 在普通 Python 类里这会让所有实例共享同一个列表
```

> Pydantic 实际上对 `= []` 做了保护（会帮你深拷贝），但养成用 `default_factory` 的习惯更稳妥，也和普通 Python 代码一致。

---

# 六、嵌套模型与自定义校验

**嵌套模型**：模型字段的类型可以是另一个模型，对应前端嵌套的 zod schema：

```python
class Address(BaseModel):
    city: str            # 城市
    street: str          # 街道

class User(BaseModel):
    name: str            # 用户名
    address: Address     # 嵌套：address 是一个 Address，会被递归校验

# 传嵌套 JSON，内层 Address 也会被自动校验
u = User(name="imber", address={"city": "杭州", "street": "文一西路"})
print(u.address.city)   # 杭州
```

**自定义校验**：约束不够用时（比如「确认密码要等于密码」），用 `field_validator`。它对应 zod 的 `.refine()`：

```python
from pydantic import BaseModel, field_validator

class RegisterBody(BaseModel):
    username: str        # 用户名
    password: str        # 密码

    # 自定义校验器：校验 username 不能是保留字
    # 关键参数 cls 是类本身（不是实例），v 是该字段待校验的值
    @field_validator("username")
    @classmethod
    def username_not_reserved(cls, v: str) -> str:
        # 业务场景：admin/root 是系统保留账号，不允许注册
        if v.lower() in {"admin", "root"}:
            raise ValueError("该用户名为系统保留，不可使用")
        return v   # 校验器必须 return 值（可以在这里顺便做转换，如 v.strip()）
```

对比 zod：

```javascript
const RegisterSchema = z.object({
  username: z.string().refine(
    (v) => !['admin', 'root'].includes(v.toLowerCase()),
    { message: '该用户名为系统保留，不可使用' }
  ),
  password: z.string(),
})
```

> 注意 `field_validator` 必须配 `@classmethod`，且第一个参数是 `cls` 不是 `self`——这里它是类方法，不是实例方法（self/cls 的区别详见第 7 篇面向对象，核心是：`self` 不是 JS 的 `this`，得显式声明）。

---

# 七、响应也能校验：response_model

校验不只管「进来的」，也能管「出去的」。`response_model` 声明接口**返回**的形状，FastAPI 会按它过滤+校验响应数据。最典型的用途：**从返回里抹掉密码等敏感字段**。

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# 内部用的完整模型（含敏感字段）
class UserInDB(BaseModel):
    id: int
    name: str
    password: str        # 敏感字段，绝不能返回给前端

# 对外响应模型：只暴露安全字段
class UserPublic(BaseModel):
    id: int
    name: str

# response_model 指定返回形状：即使函数 return 了 password，FastAPI 也会按 UserPublic 把它过滤掉
@app.get("/users/{user_id}", response_model=UserPublic)
def get_user(user_id: int):
    # 模拟从数据库查出完整用户（含 password）
    user = UserInDB(id=user_id, name="imber", password="secret123")
    return user   # 返回时被 UserPublic 裁剪，前端拿不到 password
```

这相当于在出口处又套了一层「形状合同」，比手动 `delete user.password` 可靠得多。

---

# 八、Pydantic v1 vs v2：别被老教程带偏

网上大量 Pydantic 教程是 v1 的，API 名字变了。FastAPI 现在默认 v2，记住这几个高频改名，省得复制老代码报错：

| 用途 | Pydantic v1（旧） | Pydantic v2（现在用这个） |
|------|------------------|--------------------------|
| 模型转 dict | `user.dict()` | `user.model_dump()` |
| 模型转 JSON 字符串 | `user.json()` | `user.model_dump_json()` |
| 从 dict 校验构造 | `User.parse_obj(d)` | `User.model_validate(d)` |
| 自定义字段校验 | `@validator` | `@field_validator` |
| 从 ORM 对象读取 | `Config.orm_mode = True` | `model_config = {"from_attributes": True}` |

```python
user = User(name="imber", age=18)   # user 存储一个校验通过的 User 实例
data = user.model_dump()        # v2：转成 dict，{"name": "imber", "age": 18}
json_str = user.model_dump_json()  # v2：转成 JSON 字符串
```

> 其中 `from_attributes`（旧名 orm_mode）在下一阶段对接数据库时会用到——让 Pydantic 模型能直接从 SQLAlchemy 的 ORM 对象读字段（详见第 16 篇数据库操作）。

> 另外 `EmailStr`（邮箱专用类型）需要额外装包 `pip install email-validator` 才能用，否则会报错。不想装就先用普通 `str` + 正则 `pattern`。

---

# 九、总结

Pydantic 是 FastAPI 的校验中枢：你用「类型注解 + `Field`」声明数据形状，它在运行时自动完成**校验 + 类型转换 + 出错返回 422**，把你从 Express 里满地的手动 parse 中解放出来。核心是把它当 zod 理解（运行时真校验），而不是当 TS interface（编译期擦除）。

✅ 该掌握：
- `BaseModel` 定义模型，形参类型是模型 → 当请求体；是基础类型 → 当路径/查询参数
- `Field()` 堆约束（`min_length` / `ge` / `gt` / `pattern`…），不给默认值即必填
- Pydantic 会自动做合理的类型转换（HTTP 全是字符串，这层很关键）
- `field_validator` 写自定义校验，`response_model` 校验+过滤返回数据
- v2 用 `model_dump()` / `model_validate()` / `field_validator`

⚠️ 易混淆：
- 别把 Pydantic 当 TS interface——它是运行时真校验，不是编译期摆设
- `Optional[str]` 不等于「可选字段」，它只表示「允许 None」；想可选必须给默认值（`= None`）
- 可变默认值（list/dict）用 `Field(default_factory=list)`，别直接 `= []`
- `field_validator` 第一个参数是 `cls` 且要配 `@classmethod`，不是 `self`
- 看教程先确认是不是 v1：`.dict()` / `@validator` / `orm_mode` 都是旧写法
