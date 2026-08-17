# Python（37） - A3 - 附录-JS到Python速查表


> 写代码时卡在「这个 JS 操作 Python 怎么写」？本篇就是给你随时翻的双向对照表。不讲原理（原理在各专题篇），只回答一个问题：**我会的 JS 写法，等价的 Python 是什么，以及哪里会咬人。**

# 一、怎么用本篇

- **正向查**（JS → Python）：知道 JS 怎么写，想要 Python 等价写法 → 看每张表左列找右列。
- **反向查**（Python → JS）：读别人 Python 代码看不懂某个写法 → 用表格右列反查左列。
- 表格里凡是标了 ⚠️ 的，都是**长得像但行为不一样**的坑，看到必须停一下。
- 想深入某个点，跟着「详见第 X 篇」的索引去对应专题篇。

> 心智模型一句话：**Python ≈ 不写类型的 JS + 用缩进代替 `{}` + 用换行代替 `;`**。上手比 Java 顺，真正的坑集中在「几个同名不同义的关键字」和「`self` / 可变默认参数」这几个点上。

---

# 二、变量与基本类型

## 2.1 变量声明

| JavaScript / TypeScript | Python |
|------|------|
| `let name = "Tom"` | `name = "Tom"` |
| `const AGE = 18` | `AGE = 18`（全大写=约定常量，⚠️ 语言层面照样能改） |
| `let a = b = 0` | `a = b = 0`（多变量同值） |
| `let [a, b] = [1, 2]` | `a, b = 1, 2`（解构，不用方括号） |
| `let [a, ...rest] = arr` | `a, *rest = arr`（`*` 收尾） |

⚠️ **三个最容易写错的常量**：JS 的 `true` / `false` / `null` 在 Python 里是 `True` / `False` / `None`（首字母大写），写小写直接 `NameError`。

## 2.2 基本类型对照

| JS/TS | Python | 说明 |
|------|------|------|
| `number` | `int` / `float` | ⚠️ Python 整数和浮点是两种类型，`10` 是 int，`10.0` 是 float |
| `string` | `str` | 单双引号都行 |
| `boolean` | `bool` | `True` / `False` |
| `null` / `undefined` | `None` | ⚠️ 只有一个 `None`，没有 undefined |
| `Array` | `list` | `[1, 2, 3]` |
| `object` / `Map` | `dict` | `{"k": "v"}` |
| `Set` | `set` | `{1, 2, 3}` |
| `[a, b]`（只读） | `tuple` | `(1, 2)`，不可变 |

## 2.3 类型转换

```javascript
// JavaScript
Number("42");      // 字符串转数字
String(42);        // 数字转字符串
parseInt("42px");  // 容错解析 → 42
```

```python
# Python：转换函数就是「类型名当函数调用」
int("42")     # 字符串转整数 → 42
str(42)       # 整数转字符串 → "42"
float("3.14") # 字符串转浮点 → 3.14
# ⚠️ Python 的 int("42px") 会直接抛 ValueError，没有 JS parseInt 那种容错
```

---

# 三、字符串操作

| JavaScript | Python | 说明 |
|------|------|------|
| `` `Hi ${name}` `` | `f"Hi {name}"` | 模板字符串 → f-string（详见 1.x） |
| `str.length` | `len(str)` | ⚠️ 不是属性，是内置函数 `len()` |
| `str.toUpperCase()` | `str.upper()` | 转大写 |
| `str.toLowerCase()` | `str.lower()` | 转小写 |
| `str.trim()` | `str.strip()` | 去首尾空白 |
| `str.includes("x")` | `"x" in str` | ⚠️ 用 `in` 运算符，不是方法 |
| `str.indexOf("x")` | `str.find("x")` | 找不到时 find 返回 -1 |
| `str.split(",")` | `str.split(",")` | 一样 |
| `arr.join(",")` | `",".join(arr)` | ⚠️ 主客颠倒：分隔符在前调用 |
| `str.replace(a, b)` | `str.replace(a, b)` | ⚠️ Python 默认替换全部，JS 默认只换第一个 |
| `str.startsWith("x")` | `str.startswith("x")` | 注意全小写 |
| `str.slice(1, 3)` | `str[1:3]` | 切片，详见第六节 |
| `str.repeat(3)` | `str * 3` | ⚠️ 直接用 `*` 乘 |

```javascript
// JavaScript：模板字符串
const name = "Tom", age = 18;
const msg = `${name} is ${age}, next year ${age + 1}`;
```

```python
# Python：f-string，花括号里能直接写表达式
name, age = "Tom", 18                       # name 存名字，age 存年龄
msg = f"{name} is {age}, next year {age + 1}"  # msg 存拼好的字符串
```

---

# 四、数组 / 列表（list）

## 4.1 增删改查

| JavaScript | Python | 说明 |
|------|------|------|
| `arr.push(x)` | `arr.append(x)` | 尾部追加 |
| `arr.pop()` | `arr.pop()` | 弹出末尾 |
| `arr.shift()` | `arr.pop(0)` | 弹出头部 |
| `arr.unshift(x)` | `arr.insert(0, x)` | 头部插入 |
| `arr.length` | `len(arr)` | ⚠️ 用 `len()` |
| `arr.includes(x)` | `x in arr` | ⚠️ 用 `in` |
| `arr.indexOf(x)` | `arr.index(x)` | ⚠️ 找不到 Python 会抛异常，不是返回 -1 |
| `arr.concat(b)` | `arr + b` | 直接相加拼接 |
| `arr.reverse()` | `arr.reverse()` | 原地反转 |
| `[...arr]` | `arr.copy()` 或 `arr[:]` | 浅拷贝 |
| `arr.slice(1, 3)` | `arr[1:3]` | 切片 |

## 4.2 遍历

```javascript
// JavaScript
for (const item of arr) { ... }
arr.forEach((item, i) => { ... });
```

```python
# Python
for item in arr:          # 直接 in，最常用
    ...
for i, item in enumerate(arr):  # 需要索引时用 enumerate（≈ entries()）
    ...
```

| JS | Python |
|------|------|
| `for (const x of arr)` | `for x in arr:` |
| `arr.forEach((x, i) => ...)` | `for i, x in enumerate(arr):` |
| `for (const k in obj)` | `for k in dict:` |

⚠️ **`for...in` 陷阱**：JS 的 `for...in` 遍历**键/索引**，`for...of` 遍历**值**。Python 只有一个 `for x in`，遍历 list 时拿到的是**值**（相当于 JS 的 `of`），遍历 dict 时拿到的是**键**。

---

# 五、高阶函数：map / filter / reduce → 列表推导式

这是前端最该「忘掉旧写法」的地方。Python 虽然也有 `map()` / `filter()`，但**社区强烈推荐用列表推导式（list comprehension）**，更短更地道。详见第 06 篇。

```javascript
// JavaScript：链式方法
const doubled = nums.map(x => x * 2);
const evens = nums.filter(x => x % 2 === 0);
const result = nums.filter(x => x > 0).map(x => x * 2);
```

```python
# Python：列表推导式，[表达式 for 变量 in 可迭代对象 if 条件]
doubled = [x * 2 for x in nums]              # doubled 存每项翻倍后的新列表
evens = [x for x in nums if x % 2 == 0]      # evens 存所有偶数
result = [x * 2 for x in nums if x > 0]      # 过滤+映射一步到位
```

| JS | Python 推导式 |
|------|------|
| `arr.map(x => x * 2)` | `[x * 2 for x in arr]` |
| `arr.filter(x => x > 0)` | `[x for x in arr if x > 0]` |
| `arr.filter(f).map(g)` | `[g(x) for x in arr if f(x)]` |
| `Object.fromEntries(...)` | `{k: v for k, v in items}`（字典推导式） |
| `arr.reduce((a, b) => a + b, 0)` | `sum(arr)` 或 `from functools import reduce` |

⚠️ `reduce` 在 Python 里被「打入冷宫」，要从 `functools` 导入。能用 `sum()` / `max()` / `min()` 这些内置聚合函数就别用 reduce。

---

# 六、对象 / 字典（dict）

| JavaScript | Python | 说明 |
|------|------|------|
| `obj.key` | `dict["key"]` | ⚠️ Python 不能用点号访问字典 |
| `obj["key"]` | `dict["key"]` | 一致，但 key 不存在会抛 KeyError |
| `obj.key ?? "default"` | `dict.get("key", "default")` | ⚠️ 用 `.get()` 拿默认值，更安全 |
| `obj.key = v` | `dict["key"] = v` | 赋值/新增 |
| `delete obj.key` | `del dict["key"]` | 删除 |
| `"key" in obj` | `"key" in dict` | 判断键存在，一致 |
| `Object.keys(obj)` | `dict.keys()` | 所有键 |
| `Object.values(obj)` | `dict.values()` | 所有值 |
| `Object.entries(obj)` | `dict.items()` | 键值对 |
| `{...a, ...b}` | `{**a, **b}` | ⚠️ 展开用 `**`（字典）/ `*`（列表） |
| `obj?.a?.b` | 无直接等价 | ⚠️ Python 没有可选链，用 `.get()` 逐层或 try |

```javascript
// JavaScript：安全取值
const port = config.port ?? 8080;
```

```python
# Python：dict.get(键, 默认值)，键不存在时返回默认值，不报错
port = config.get("port", 8080)   # port 存端口号，没配就用 8080
```

⚠️ **`obj.key` 不能套用**：JS 里对象属性可以点号访问，Python 的 dict **只能用方括号**。点号在 Python 里是「访问对象的属性/方法」，是另一回事（dict 没有叫 key 的属性）。

---

# 七、切片（slice）—— Python 的杀手锏

Python 的切片比 JS 强大得多，list / str / tuple 通用。语法 `序列[起始:结束:步长]`，**含头不含尾**（和 JS slice 一致）。

```javascript
// JavaScript
arr.slice(1, 3);      // 索引 1~2
arr.slice(-2);        // 最后两个
arr.slice().reverse() // 反转副本
```

```python
# Python：切片是语法，不是方法
arr[1:3]      # 索引 1~2
arr[-2:]      # 最后两个
arr[::-1]     # ⚠️ 步长 -1 = 反转，超常用的小技巧
arr[:]        # 复制整个列表（浅拷贝）
arr[::2]      # 每隔一个取一个
```

| JS | Python |
|------|------|
| `arr.slice(1, 3)` | `arr[1:3]` |
| `arr.slice(-2)` | `arr[-2:]` |
| `arr.slice().reverse()` | `arr[::-1]` |
| `str[0]` | `str[0]` |

---

# 八、函数

## 8.1 声明对照

```javascript
// JavaScript
function add(a, b = 0) { return a + b; }
const add = (a, b) => a + b;          // 箭头函数
function sum(...nums) { ... }          // 剩余参数
```

```python
# Python：用 def，缩进代替花括号，无需 return 关键字之外的标点
def add(a, b=0):          # b=0 是默认参数，和 JS 一致
    return a + b

add = lambda a, b: a + b  # lambda ≈ 箭头函数，⚠️ 只能写单个表达式，无函数体

def total(*nums):         # *nums ≈ JS 的 ...nums（收集成 tuple）
    return sum(nums)
```

| JS | Python | 说明 |
|------|------|------|
| `function f(a, b)` | `def f(a, b):` | |
| `(a, b) => a + b` | `lambda a, b: a + b` | ⚠️ lambda 只能单表达式 |
| `f(a, b = 1)` | `def f(a, b=1):` | 默认参数 |
| `f(...args)` | `def f(*args):` | 收集位置参数为 tuple |
| 无直接等价 | `def f(**kwargs):` | 收集关键字参数为 dict |
| `f(...arr)` | `f(*arr)` | 调用时展开 |

## 8.2 关键字参数（Python 特有，很爽）

```python
# Python：调用时可以「指名道姓」传参，顺序随意、可读性高
def create_user(name, age, active=True):  # 创建用户：name 名字，age 年龄，active 是否激活
    ...

create_user(name="Tom", age=18)          # 关键字传参，等价于位置传参但更清晰
create_user("Tom", active=False, age=20) # 混合：位置参数在前，关键字在后
```

⚠️ **可变默认参数大坑**（前端最容易栽）：默认参数 `def f(items=[])` 的 `[]` **只在定义时创建一次**，多次调用会共享同一个 list！这和 JS 完全不同。正确写法：

```python
# ❌ 错误：默认的 [] 被所有调用共享，会累积脏数据
def add_item(item, items=[]):
    items.append(item)
    return items

# ✅ 正确：默认用 None，函数内再新建
def add_item(item, items=None):
    if items is None:      # 没传才新建，避免共享同一个列表
        items = []
    items.append(item)
    return items
```

---

# 九、同名不同义的关键字（⚠️ 重灾区）

| JS | Python | ⚠️ 区别 |
|------|------|------|
| `===` | `==` | Python 的 `==` 比较「值」，没有 `===` |
| `==`（带隐式转换） | 无 | Python `==` 不做 JS 那种松散转换 |
| `===`（同一引用） | `is` | ⚠️ `is` 比较「是不是同一个对象」，**只用于和 `None` 比** |
| `!` | `not` | 逻辑非 |
| `&&` | `and` | 逻辑与 |
| `\|\|` | `or` | 逻辑或 |
| `a ? b : c` | `b if a else c` | ⚠️ 三元表达式顺序不同 |
| `null` / `undefined` | `None` | |
| `typeof x` | `type(x)` | |
| `x instanceof C` | `isinstance(x, C)` | |
| `this` | `self` | ⚠️ 详见第 07 篇，`self` 必须手写为方法第一个参数 |

```javascript
// JavaScript
const label = age >= 18 ? "成年" : "未成年";
if (user === null) { ... }
```

```python
# Python：值在中间，条件在 if 后
label = "成年" if age >= 18 else "未成年"  # label 存年龄段文案
if user is None:                            # ⚠️ 和 None 比较用 is，不用 ==
    ...
```

⚠️ **`is` 不是 `===`**：别看到「严格相等」就用 `is`。`is` 判断的是「内存里是不是同一个对象」，比较数字/字符串会出诡异结果。**记死规则：只在判断 `is None` / `is not None` 时用 `is`，其余一律 `==`。**

---

# 十、类与面向对象

```javascript
// JavaScript
class User {
  constructor(name) { this.name = name; }
  greet() { return `Hi ${this.name}`; }
}
const u = new User("Tom");
```

```python
# Python：构造方法叫 __init__，self 要手写
class User:
    def __init__(self, name):   # 构造方法，self ≈ this 但必须显式写在第一个参数
        self.name = name        # self.name 存实例的名字
    def greet(self):            # ⚠️ 每个方法第一个参数都得是 self
        return f"Hi {self.name}"

u = User("Tom")                 # ⚠️ 没有 new 关键字，直接「类名()」
```

| JS | Python | 说明 |
|------|------|------|
| `constructor() {}` | `def __init__(self):` | 构造方法 |
| `this` | `self` | ⚠️ 必须作为方法第一个参数显式声明 |
| `new User()` | `User()` | ⚠️ 没有 new |
| `class B extends A` | `class B(A):` | 继承 |
| `super()` | `super().__init__()` | 调父类构造 |
| `static method()` | `@staticmethod` | 静态方法用装饰器 |
| `get x()` | `@property` | 属性访问器 |
| `toString()` | `__str__(self)` | 转字符串（魔术方法） |

⚠️ `self` 不是 `this`：它不是关键字、不会自动注入，**纯靠你手写**。漏写第一个 `self` 参数是新手最高频报错。详见第 07 篇。

---

# 十一、异步 async / await

好消息：**Python 的 async/await 写法和 JS 高度一致**，心智模型基本能直接搬。机制差异（GIL、事件循环）详见第 17 篇，这里只对照写法。

```javascript
// JavaScript
async function fetchData() {
  const res = await fetch(url);
  return await res.json();
}
await Promise.all([a(), b()]);
```

```python
# Python：async def + await，需要 import asyncio
import asyncio

async def fetch_data():        # async def 定义协程函数，≈ JS async function
    res = await client.get(url)  # await 等待异步结果，和 JS 一样
    return res.json()

await asyncio.gather(a(), b())  # gather ≈ Promise.all（并发等待多个）
```

| JS | Python | 说明 |
|------|------|------|
| `async function` | `async def` | |
| `await x` | `await x` | 一致 |
| `Promise.all([...])` | `asyncio.gather(...)` | 并发聚合 |
| `setTimeout` 配 Promise | `await asyncio.sleep(s)` | 异步等待 |
| 顶层直接 await | `asyncio.run(main())` | ⚠️ Python 要用 run 启动事件循环 |

⚠️ **GIL ≠ 影响 async**：很多人听说「Python 有 GIL 不能并发」就以为 async 没用。其实 async 处理的是 **IO 等待**（网络、磁盘），和 GIL（限制的是多线程跑 CPU 计算）是两码事。async 该快还是快，心智和 JS 单线程事件循环一模一样。详见第 17 篇。

---

# 十二、装饰器 ≈ TS/Angular 的 @Component

如果你写过 Angular 或 TS 的 `@Component` / `@Injectable`，那 Python 装饰器**长得一模一样**——`@` 加在函数/类上面那行。机制详见第 10 篇。

```typescript
// TypeScript / Angular：你已经见过的 @ 语法
@Component({ selector: "app" })
class AppComponent {}
```

```python
# Python：@装饰器 加在 def 上面，本质是「用一个函数包一层」
@app.get("/users")        # FastAPI 路由装饰器，把下面的函数注册成接口
def list_users():         # ≈ Express 里 app.get("/users", handler)
    return [...]

@staticmethod             # 标记为静态方法
def helper(): ...
```

机制一句话：`@deco` 加在 `def f` 上，等价于 `f = deco(f)`——**拿原函数当参数、返回一个包装后的新函数**。类比 JS 里「中间件包一层 handler」。详见第 10 篇。

---

# 十三、生成器 ≈ function / yield

JS 的 `function*` + `yield` 在 Python 里几乎一对一映射——只是少了那个 `*`。详见第 06 篇。

```javascript
// JavaScript
function* counter() {
  let i = 0;
  while (true) yield i++;
}
```

```python
# Python：函数里只要出现 yield，它就自动变成生成器
def counter():            # 一个会「逐个吐值」的生成器函数
    i = 0                 # i 存当前计数器的值，每次自增后吐出
    while True:
        yield i           # ⚠️ 有 yield 就不用 function* 标记，自动是生成器
        i += 1
```

| JS | Python |
|------|------|
| `function* g()` | `def g():`（函数体里有 `yield`） |
| `yield x` | `yield x` |
| `yield* iter` | `yield from iter` |
| `gen.next().value` | `next(gen)` |

---

# 十四、异常处理

```javascript
// JavaScript
try {
  risky();
} catch (e) {
  console.error(e);
} finally {
  cleanup();
}
throw new Error("boom");
```

```python
# Python：catch 叫 except，throw 叫 raise
try:
    risky()
except ValueError as e:      # ⚠️ 可以按异常类型分别捕获
    print(e)
except Exception as e:       # 兜底捕获所有异常
    print(e)
finally:
    cleanup()

raise ValueError("boom")     # ⚠️ raise 不是 throw，且不用 new
```

| JS | Python | 说明 |
|------|------|------|
| `try {}` | `try:` | |
| `catch (e)` | `except Exception as e:` | ⚠️ 关键字是 except |
| `finally {}` | `finally:` | 一致 |
| `throw new Error(x)` | `raise ValueError(x)` | ⚠️ 用 raise，不用 new |
| 无直接等价 | `with open(f) as fp:` | 上下文管理器，自动关资源，详见第 09 篇 |

⚠️ Python 鼓励**按类型分别 except**（`except ValueError` / `except KeyError`），比 JS 里一个 catch 里 `if (e instanceof ...)` 优雅。

---

# 十五、模块与导入

| JavaScript | Python | 说明 |
|------|------|------|
| `import { a, b } from "./m"` | `from m import a, b` | 按名导入 |
| `import * as m from "./m"` | `import m` | 整模块导入，用 `m.a` 调 |
| `import x from "./m"` | 无默认导出概念 | ⚠️ Python 没有 default export |
| `export const a = 1` | `a = 1`（模块内顶层变量自动可导入） | ⚠️ 不写 export，默认全部可被导入 |
| `import("./m")` 动态 | `importlib.import_module("m")` | 动态导入 |
| `package.json` | `requirements.txt` / `pyproject.toml` | 依赖清单，详见第 12 篇 |
| `npm install x` | `pip install x` | 装包 |
| `node_modules/` | `.venv/`（虚拟环境） | ⚠️ 隔离方式不同，详见第 12 篇 |

```python
# Python：模块里凡是顶层定义的，默认都能被 import，没有 export 一说
# math_utils.py
def add(a, b):     # 这个函数定义在模块顶层，自动可被别处 import
    return a + b

# main.py
from math_utils import add   # 直接按名字导入
```

---

# 十六、Web 后端：FastAPI ≈ Express

写过 Express 路由的话，FastAPI 几乎是「带类型校验的 Express」。详见第 14、15 篇。

```javascript
// Express
app.get("/users/:id", (req, res) => {
  res.json({ id: req.params.id });
});
```

```python
# FastAPI：路由用装饰器，参数靠类型注解自动解析+校验
from fastapi import FastAPI
app = FastAPI()             # app 存 FastAPI 应用实例，所有路由都挂在它上面

@app.get("/users/{id}")     # 路径参数用 {id}，不是 :id
async def get_user(id: int):  # ⚠️ id: int 会被框架自动转换+校验（详见第 15 篇）
    return {"id": id}         # 返回 dict 自动转 JSON，不用 res.json()
```

| Express | FastAPI | 说明 |
|------|------|------|
| `app.get("/p/:id", fn)` | `@app.get("/p/{id}")` | 路径参数花括号 |
| `req.params.id` | 函数参数 `id` | 自动注入 |
| `req.query.q` | 函数参数（带默认值） | query 参数 |
| `req.body` | Pydantic 模型参数 | ⚠️ 自动校验，≈ zod，详见第 15 篇 |
| `res.json(obj)` | `return obj` | 直接 return |
| 手写校验 | Pydantic `BaseModel` | 像 zod / TS interface 但运行时真校验 |
| `express.Router()` | `APIRouter()` | 路由分组 |

---

# 十七、数据处理三件套（阶段四锚点）

这三个库前端没有对应物，**必须建立类比锚点**，否则容易被 API 淹没。详见第 20、21、22 篇。

## 17.1 NumPy ≈ 批量操作的「超级 Array」

把 NumPy 数组想成**一个能整体做数学运算的 JS Array**——不用写 for 循环逐个处理，整个数组一把梭。

```javascript
// JavaScript：逐个 for / map
const a = [1, 2, 3];
const doubled = a.map(x => x * 2);  // 必须遍历
```

```python
# NumPy：整个数组直接运算，底层 C 实现，比 for 快几十倍
import numpy as np
a = np.array([1, 2, 3])   # a 是 ndarray，一个「超级数组」
doubled = a * 2           # ⚠️ 不用 map/循环，整体广播 → [2 4 6]
total = a.sum()           # 内置聚合
```

> 锚点：`np.array` ≈ 批量操作版的 Array，`a * 2` 替代 `a.map(x => x*2)`，这种「整体运算」叫**向量化**，是 NumPy 快的原因。

## 17.2 Pandas DataFrame ≈ 加强版 Excel / SQL

DataFrame 就是**代码里的一张表**：有行有列、能筛选、能分组聚合，约等于「Excel 表格 + SQL 查询」的合体。

```python
import pandas as pd
df = pd.read_csv("data.csv")   # df 是 DataFrame，一张二维表
df.head()                       # 看前几行，≈ Excel 翻到顶部
df[df["age"] > 18]              # ⚠️ 按条件筛选行，≈ SQL 的 WHERE age > 18
df.groupby("city")["sales"].sum()  # 分组求和，≈ SQL 的 GROUP BY
```

> 锚点：选列 ≈ SELECT，`df[条件]` ≈ WHERE，`groupby` ≈ GROUP BY。把它当「能写代码的 Excel」就不慌。

## 17.3 matplotlib ≈ 后端版 ECharts / D3

画图库，相当于在 Python 里用 ECharts——给数据、选图表类型、出图。

```python
import matplotlib.pyplot as plt
plt.plot([1, 2, 3], [10, 20, 15])  # 折线图，≈ ECharts 的 line series
plt.bar(["a", "b"], [3, 7])         # 柱状图
plt.savefig("chart.png")            # ⚠️ 后端环境通常存成图片，而非浏览器渲染
```

> 锚点：`plt.plot` ≈ ECharts line，`plt.bar` ≈ bar。区别是它跑在后端，结果常存成 png 而不是渲染到 DOM。

---

# 十八、AI 编程速查（阶段五锚点）

阶段五的依赖链：**23 调模型 → 24 函数调用 → 25 Embedding → 26 RAG → 27 Agent**，一篇比一篇陡。这里只给最小心智锚点，细节回各专题篇。

## 18.1 调大模型 ≈ 调一个 REST API

```python
# 调 OpenAI 兼容接口 ≈ 你天天写的 fetch POST，只是 SDK 封装好了
from openai import OpenAI
client = OpenAI()   # client 是 SDK 客户端，读环境变量里的 API key

# messages 是对话历史数组，role 区分 system/user/assistant
resp = client.chat.completions.create(   # resp 存模型返回的响应对象
    model="gpt-4o",                              # 用哪个模型
    messages=[{"role": "user", "content": "你好"}],  # 对话内容
)
print(resp.choices[0].message.content)   # 取出回复文本
```

> 锚点：`messages` ≈ 一个对话记录数组，调用 ≈ 一次带 body 的 POST，区别只是 SDK 帮你拼好了。详见第 23 篇。

## 18.2 Embedding ≈ 把文字压成一串坐标

别被「向量」吓到。想想 CSS 颜色 `rgb(255, 0, 0)`——它就是个三维向量，颜色越接近、数值距离越近。Embedding 就是同理：**把一段文字压成一长串数字（坐标），语义相近的文字，坐标点挨得近**。检索 = 在坐标空间里找最近的点。详见第 25 篇。

```python
# 把文字转成向量（一串 float），语义相近的文字向量距离近
resp = client.embeddings.create(model="text-embedding-3-small", input="一只猫")  # resp 存 embedding 响应对象
vec = resp.data[0].embedding   # vec 是这段文字的向量坐标（如 1536 个 float）
# 检索 = 算 vec 和库里各向量的距离，找最近的几个 → 就是「最相关」的内容
```

> 锚点：RGB 是三维向量、颜色相近=距离近；Embedding 是高维向量、语义相近=距离近。检索就是「找最近的点」。

## 18.3 RAG ≈ 先查资料再回答

RAG = 检索增强生成。流程：**把文档切块（chunking）→ 各块转 Embedding 存库 → 用户提问时检索最相关的块 → 把块塞进 prompt 让模型基于它回答**。本质是「开卷考试」：先翻到相关那几页，再答题。详见第 26 篇。

```python
# RAG 三步（伪代码，真实实现详见第 26 篇）
chunks = split(doc)                      # 1. 切块：长文档切成小段
store = [(c, embed(c)) for c in chunks]  # 2. 各块转向量入库
hits = top_k_nearest(embed(question), store, k=3)  # 3. 检索最相关的 3 块
answer = llm(f"参考资料：{hits}\n问题：{question}")  # 4. 塞进 prompt 生成
```

> 锚点：检索（找最近的点，见 17.2）+ 拼 prompt（字符串模板）+ 生成（调模型，见 17.1）。每步你都见过，RAG 只是把它们串起来。

## 18.4 Agent / 工具调用 ≈ 带记忆的 while 循环 + 函数注册表

- **tool use（工具调用）** ≈ 给模型**注册一组可调用函数**（类似事件回调/函数注册表）。你描述好每个函数干啥、要什么参数，模型决定何时调哪个。
- **ReAct** ≈ 一个 **`while` 循环**：反复「思考 → 调用工具（像调 API）→ 拿结果再思考」，直到得出答案。
- **多步推理** = 这个循环带着记忆（历史 messages）一轮轮跑。

```python
# tool use ≈ 注册函数表，告诉模型「你有这些工具可以调」
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",                    # 工具名
        "description": "查询某城市天气",            # 描述，模型据此决定何时调
        "parameters": {                            # 参数 schema（≈ 函数签名）
            "type": "object",
            "properties": {"city": {"type": "string"}},
        },
    },
}]
# ReAct 主循环（伪代码）：思考→调工具→拿结果→再思考
# while 没得到最终答案:
#     resp = 调模型(messages, tools)        # 模型「思考」，可能要求调某个工具
#     if resp 要求调工具:
#         result = 本地执行那个函数(参数)    # 「调用工具」，像调 API
#         messages.append(result)            # 把结果塞回记忆，继续循环
#     else:
#         return resp                        # 拿到最终答案，跳出循环
```

> 锚点：tool use ≈ 函数注册表（像注册事件回调），ReAct ≈ `while(思考→调工具→拿结果)`，多步推理 = 带记忆的循环。这三个你在前端全见过。详见第 27 篇。

---

# 十九、命令行 / 工程速查（node 生态对照）

| Node 生态 | Python 生态 | 说明 |
|------|------|------|
| `node app.js` | `python app.py` | 运行脚本 |
| `npm init` | `python -m venv .venv` | 初始化环境（详见第 12 篇） |
| `npm install x` | `pip install x` | 装包 |
| `npm install` | `pip install -r requirements.txt` | 按清单装 |
| `package.json` | `requirements.txt` / `pyproject.toml` | 依赖清单 |
| `node_modules/` | `.venv/` | 依赖隔离目录 |
| `npx` | `pipx` / `python -m` | 跑工具 |
| `console.log(x)` | `print(x)` | 打印 |
| `JSON.stringify(o)` | `json.dumps(o)` | 对象转 JSON 字符串 |
| `JSON.parse(s)` | `json.loads(s)` | JSON 字符串转对象 |

⚠️ **虚拟环境是 Python 必备习惯**：不像 node_modules 默认本地隔离，Python 默认全局装包会污染系统。每个项目先 `python -m venv .venv` 再 `source .venv/bin/activate`，养成习惯。详见第 12 篇。

---

# 二十、命名风格对照

| 场景 | JS/TS 习惯 | Python 习惯（PEP 8） |
|------|------|------|
| 变量/函数 | `camelCase` | `snake_case` |
| 类名 | `PascalCase` | `PascalCase`（一致） |
| 常量 | `UPPER_CASE` | `UPPER_CASE`（一致） |
| 私有 | `#field` / `_field` | `_field`（单下划线约定） |
| 文件名 | `userService.ts` | `user_service.py` |

⚠️ 别把 JS 的 `camelCase` 带进 Python。社区强约定用 `snake_case`，混用会被一眼看出「这是个写 JS 的人」。

---

# 二十一、总结

- **怎么用本篇**：表格里凡是标了 ⚠️ 的，都是长得像但行为不一样的坑，看到必须停一下。
- **变量与基本类型**：⚠️ 三个最容易写错的常量：JS 的 true / false / null 在 Python 里是 True / False / None（首字母大写），写小写直接 NameError。
- **字符串操作**：| str.length | len(str) | ⚠️ 不是属性，是内置函数 len() |
- **数组 / 列表（list）**：| arr.indexOf(x) | arr.index(x) | ⚠️ 找不到 Python 会抛异常，不是返回 -1 |
- **高阶函数：map / filter / reduce → 列表推导式**：这是前端最该「忘掉旧写法」的地方。
- **对象 / 字典（dict）**：| obj.key | dict["key"] | ⚠️ Python 不能用点号访问字典 |

## 参考资料

- [Python 3 文档](https://docs.python.org/3/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
