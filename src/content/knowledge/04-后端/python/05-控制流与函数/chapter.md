# 05 - 控制流与函数

> 控制流（if/for/while）你在 JS 里已经写过无数遍，这篇只需关注「哪里不一样」。真正的重点是 Python 的函数：`def`、默认参数、`*args/**kwargs`——这套参数玩法比 JS 灵活得多，也是后面读 FastAPI / openai SDK 源码绕不开的基础。

## 前端锚点

控制流部分，Python 和 JS 心智模型几乎一致，差异只在「语法皮肤」：没有花括号，靠**缩进**分块；`for` 默认就是 `for...of`（遍历值，不是索引）。

函数部分差异更大，先记住一句类比：**Python 的函数参数 ≈ JS 函数参数 + 默认值 + 解构 + 剩余参数，但全部内置且更显式**。`*args` ≈ JS 的 `...rest`，`**kwargs` ≈ 把一个对象「展开」成具名参数。

---

## 一、控制流：先划清和 JS 的差异

### 1.1 没有花括号，缩进就是代码块

这是 Python 第一眼最大的不同。JS 用 `{}` 圈代码块，Python 用**冒号 + 缩进**。

```javascript
// JavaScript：花括号分块
if (age >= 18) {
  console.log("成年")
} else {
  console.log("未成年")
}
```

```python
# Python：冒号 + 缩进（约定 4 个空格），无花括号
if age >= 18:          # 行尾冒号开启代码块
    print("成年")       # 缩进 4 空格表示属于这个 if
else:
    print("未成年")
```

**关键差异：**
- 行尾必须有 `:`，下一行必须缩进（统一 4 空格，别和 Tab 混用，否则报 `IndentationError`）
- 缩进是**语法**不是风格，缩进错了直接报错（JS 缩进只是好看）
- 没有分号（写了也不报错，但不符合习惯）

### 1.2 条件判断：elif、布尔运算符是英文单词

```javascript
// JavaScript
if (score >= 90) {
  grade = "A"
} else if (score >= 60) {
  grade = "B"
} else {
  grade = "C"
}
const ok = isVip && age > 18 || isAdmin  // && || !
```

```python
# Python
if score >= 90:
    grade = "A"
elif score >= 60:        # else if 合并成一个词 elif
    grade = "B"
else:
    grade = "C"

ok = is_vip and age > 18 or is_admin   # 用英文单词 and / or / not
```

对照表：

| JS/TS | Python | 说明 |
|-------|--------|------|
| `else if` | `elif` | 合并成一个关键字 |
| `&&` | `and` | 逻辑与 |
| `\|\|` | `or` | 逻辑或 |
| `!x` | `not x` | 逻辑非 |
| `a === b` | `a == b` | Python 无 `===`，`==` 即比值 |
| `cond ? a : b` | `a if cond else b` | 三元，顺序不同 |

注意三元表达式的语序——Python 把「真值」写在最前面：

```python
# 业务场景：根据登录态决定显示的文案
label = "退出" if is_logged_in else "登录"   # 真值 if 条件 else 假值
```

### 1.3 for：默认是 for...of，要索引用 enumerate

Python 的 `for` 没有 `for (let i = 0; ...)` 这种 C 式写法，**默认就是遍历值**，等价于 JS 的 `for...of`。

```javascript
// JavaScript
const fruits = ["apple", "banana", "cherry"]
for (const f of fruits) {
  console.log(f)
}
for (let i = 0; i < 5; i++) {
  console.log(i)
}
```

```python
# Python
fruits = ["apple", "banana", "cherry"]   # fruits：水果名列表
for f in fruits:        # 直接拿到值，相当于 for...of
    print(f)

# 要「循环 N 次」用 range（不是写 i++）
for i in range(5):      # range(5) 产生 0,1,2,3,4
    print(i)
```

需要同时拿索引和值时，用内置的 `enumerate`，对标 JS 的 `arr.entries()`：

```javascript
// JavaScript：要索引时
for (const [i, f] of fruits.entries()) {
  console.log(i, f)
}
```

```python
# Python：enumerate 同时给出索引和值
for i, f in enumerate(fruits):   # i 是索引，f 是值
    print(i, f)
```

遍历字典（≈ JS 对象）时，用 `.items()` 同时拿键值：

```python
user = {"name": "Tom", "age": 18}    # user：用户信息字典
for key, value in user.items():      # .items() 返回 (键, 值) 对
    print(key, value)
```

| 需求 | JS | Python |
|------|-----|--------|
| 遍历值 | `for (const x of arr)` | `for x in arr` |
| 遍历 N 次 | `for (let i=0; i<n; i++)` | `for i in range(n)` |
| 带索引 | `arr.entries()` | `enumerate(arr)` |
| 遍历对象键值 | `Object.entries(obj)` | `dict.items()` |

### 1.4 while：基本一样，但没有 do-while

```python
# Python：while 和 JS 几乎一致
count = 0          # count：当前计数
while count < 3:
    print(count)
    count += 1     # Python 没有 ++，用 += 1

# break / continue 用法和 JS 完全相同
```

注意：Python **没有 `++` / `--`**，也**没有 `do...while`**。需要「至少执行一次」时，用 `while True` + `break` 模拟。

---

## 二、函数 def：重点章节

### 2.1 基本定义

```javascript
// JavaScript
function add(a, b) {
  return a + b
}
const add2 = (a, b) => a + b   // 箭头函数
```

```python
# Python：用 def 关键字，冒号 + 缩进定义函数体
def add(a, b):          # 定义加法函数，a/b 为两个加数
    return a + b        # 返回两数之和

# 等价的匿名函数 lambda（只能写一个表达式，类似简化版箭头函数）
add2 = lambda a, b: a + b
```

**关键差异：**
- 用 `def`，函数体靠缩进
- `lambda` 是 Python 的「箭头函数」，但**只能放一个表达式**，不能写多行逻辑——所以 Python 里写复杂逻辑一律用 `def`，lambda 只用于 `sorted(key=...)` 这类一次性小函数

### 2.2 类型注解（可选，但后端常写）

Python 支持类型注解，长得像 TS，但**默认不强制检查**（运行时不报错，靠 IDE / mypy / Pydantic 检查）。FastAPI 正是靠这套注解做参数校验。

```typescript
// TypeScript：类型是强制的
function greet(name: string): string {
  return `Hello, ${name}`
}
```

```python
# Python：类型注解是「提示」，运行时不强制
def greet(name: str) -> str:    # name: 参数类型；-> str 是返回值类型
    return f"Hello, {name}"     # f-string 字符串插值，≈ 模板字符串
```

| TS | Python |
|----|--------|
| `name: string` | `name: str` |
| `age: number` | `age: int` / `age: float` |
| `flag: boolean` | `flag: bool` |
| `: string`（返回值） | `-> str`（返回值） |
| `` `Hello ${name}` `` | `f"Hello {name}"` |

> 注：这套注解在后面 FastAPI 篇会大量出现，那里类型注解会被「升级」成真正的请求参数校验。详见 FastAPI 相关章节。

### 2.3 默认参数

和 JS 一样支持默认值，但有一个**致命坑**（见第四节）。

```javascript
// JavaScript
function createUser(name, role = "user") {
  return { name, role }
}
```

```python
# Python：默认参数写法和 JS 一致
def create_user(name, role="user"):   # role 默认值为 "user"
    return {"name": name, "role": role}

create_user("Tom")              # role 用默认值 "user"
create_user("Tom", "admin")     # role 显式传 "admin"
```

### 2.4 关键字参数（Python 独有的爽点）

Python 调用函数时可以**用参数名传参**，顺序随意。这是 JS 没有的（JS 只能靠传一个对象模拟）。

```javascript
// JavaScript：想要「具名传参」只能传对象
function connect({ host, port, timeout = 30 }) { /* ... */ }
connect({ port: 5432, host: "localhost" })   // 解构对象
```

```python
# Python：原生支持具名传参（关键字参数）
def connect(host, port, timeout=30):    # 定义连接函数，三个配置项
    print(host, port, timeout)

connect(port=5432, host="localhost")    # 用名字传，顺序无所谓
connect("localhost", 5432)              # 也可以按位置传
```

这个特性让你读 SDK 调用时一眼看懂每个值的含义，例如：

```python
# 真实场景：openai SDK 调用，全部用关键字参数，可读性极高
response = client.chat.completions.create(   # response：模型返回的响应对象
    model="gpt-4o",          # model：使用的模型名
    temperature=0.7,         # temperature：采样温度，越高越随机
    max_tokens=500,          # max_tokens：最大输出 token 数
)
```

---

## 三、*args 和 **kwargs：收集任意参数

这是本篇最该花时间的概念，也是读第三方库源码（到处是 `def foo(*args, **kwargs)`）的前提。

### 3.1 `*args`：收集多余的「位置参数」成元组

`*args` ≈ JS 的剩余参数 `...rest`，把多传的位置参数打包成一个**元组**。

```javascript
// JavaScript：剩余参数
function sum(...nums) {       // nums 是数组
  return nums.reduce((a, b) => a + b, 0)
}
sum(1, 2, 3)   // 6
```

```python
# Python：*args 收集多余位置参数成元组
def total(*nums):        # nums：收到的所有位置参数，类型是 tuple
    return sum(nums)     # 内置 sum() 对可迭代对象求和

total(1, 2, 3)   # 6
total(1, 2, 3, 4, 5)   # 15
```

> 名字 `args` 只是约定，关键是前面的 `*`。`*nums`、`*items` 都行。

### 3.2 `**kwargs`：收集多余的「关键字参数」成字典

`**kwargs` 把所有「名字=值」形式的多余参数打包成一个**字典**。JS 没有直接对应物，最接近的是「把剩下的属性收进一个对象」。

```javascript
// JavaScript：用对象 + 剩余属性近似
function request(url, { method = "GET", ...options } = {}) {
  console.log(url, method, options)   // options 收集其余配置
}
request("/api", { method: "POST", timeout: 30, retry: 3 })
```

```python
# Python：**kwargs 收集多余的关键字参数成 dict
def request(url, **options):     # options：除 url 外的所有具名参数，类型是 dict
    print(url, options)

request("/api", method="POST", timeout=30, retry=3)
# 输出：/api {'method': 'POST', 'timeout': 30, 'retry': 3}
```

### 3.3 两者组合 + 完整参数顺序

参数定义顺序是**固定**的，记成一句话：**位置参数（可带默认值）→ `*args` → 关键字参数（可带默认值）→ `**kwargs`**。注意 `*args` 之后定义的参数会变成「只能用关键字传」（keyword-only），比如下面综合示例里 `*headers` 后面的 `timeout` 就只能写成 `timeout=60`。最常见的组合是把 `*args` 和 `**kwargs` 放最后，表示「接收任意参数」：

```python
# 经典写法：透传任意参数（装饰器、包装函数里到处是这个）
def wrapper(*args, **kwargs):     # args：所有位置参数(tuple)；kwargs：所有关键字参数(dict)
    print("调用前的日志")
    result = real_func(*args, **kwargs)   # 原样转发出去（见 3.4 解包）
    print("调用后的日志")
    return result
```

### 3.4 反向操作：`*` 和 `**` 用于「解包」

`*` / `**` 出现在**调用处**时，作用相反——把列表/字典「拆开」成一个个参数。这正是 JS 展开运算符 `...` 的两种用法合体。

```javascript
// JavaScript：展开运算符
const nums = [1, 2, 3]
Math.max(...nums)              // 数组展开成参数

const config = { host: "x", port: 1 }
connect({ ...config })         // 对象展开
```

```python
# Python：* 解包列表/元组，** 解包字典
nums = [1, 2, 3]            # nums：待求和的数字列表
print(sum(nums))           # 正常传

args = (3, 5)              # args：要传给 range 的起止值
print(list(range(*args)))  # * 把 (3,5) 拆成 range(3, 5) → [3, 4]

config = {"host": "localhost", "port": 5432}   # config：连接配置字典
connect(**config)          # ** 把字典拆成 host="localhost", port=5432
```

记忆口诀：
- **定义函数时**的 `*args/**kwargs` = **收集**（多个值 → 一个集合）
- **调用函数时**的 `*list/**dict` = **解包**（一个集合 → 多个值）

---

## 四、前端新手最易踩的坑

### 坑 1：默认参数不要用可变对象（list/dict）

JS 里默认值每次调用都重新求值，Python **默认值只在函数定义时求值一次**，可变默认值会被多次调用「共享」，造成数据串台。

```python
# ❌ 错误：默认值用了 list，会被所有调用共享
def add_item(item, bucket=[]):    # bucket 默认空列表——只创建一次！
    bucket.append(item)
    return bucket

add_item("a")   # ['a']
add_item("b")   # ['a', 'b'] —— 居然带上了上次的数据！WHY：默认 [] 是同一个对象
```

```python
# ✅ 正确：默认用 None，进函数再创建新列表
def add_item(item, bucket=None):   # bucket 默认 None，避免共享可变对象
    if bucket is None:             # 这次没传，才新建一个空列表
        bucket = []
    bucket.append(item)
    return bucket
```

### 坑 2：缩进必须统一，别混用 Tab 和空格

Python 缩进是语法。同一个块里混用 Tab 和空格会报 `TabError` 或逻辑错乱。统一用 **4 个空格**（编辑器设置 Tab 转空格即可）。

### 坑 3：函数默认返回 None，不是 undefined

JS 函数不写 `return` 返回 `undefined`；Python 返回 `None`。判空时用 `is None`，别用 `== None`：

```python
result = some_func()        # result：函数返回值，可能是 None
if result is None:          # 判 None 用 is（身份比较），更规范也更快
    print("没有返回值")
```

### 坑 4：别拿 lambda 当箭头函数写复杂逻辑

`lambda` 只能容纳**一个表达式**，不能写 `if/for` 语句块、不能多行。需要逻辑就老老实实 `def`。lambda 的正确用途是一次性小函数：

```python
users = [{"name": "Tom", "age": 30}, {"name": "Amy", "age": 18}]   # users：待排序的用户列表
# 按 age 排序，key 用 lambda 取排序字段（≈ JS 的 arr.sort((a,b)=>a.age-b.age)）
users.sort(key=lambda u: u["age"])
```

### 坑 5：`range` 是左闭右开，且不含 C 式 for

`range(5)` 是 `0~4`，`range(2, 5)` 是 `2,3,4`——和 JS `for(i=0;i<5;i++)` 的边界一致（右开），但别再想着写 `i++`。

---

## 五、综合示例：一个带各种参数的函数

```python
# 综合演示：构造一条 HTTP 请求配置
# url：请求地址（必填位置参数）
# method：请求方法，默认 GET（带默认值的参数）
# *headers：额外的请求头字符串，收集成元组
# timeout：超时秒数，默认 30（带默认值，放在 *headers 之后只能用关键字传）
# **extra：其余任意配置，收集成字典
def build_request(url, method="GET", *headers, timeout=30, **extra):
    config = {                       # config：最终组装出的请求配置字典
        "url": url,
        "method": method,
        "headers": list(headers),    # 把元组转成列表存储
        "timeout": timeout,
        "extra": extra,
    }
    return config

# 位置参数 + 关键字参数混合调用
cfg = build_request(                 # cfg：组装好的请求配置字典
    "/api/users",                    # url
    "POST",                          # method
    "Content-Type: json",            # 进入 *headers
    "Auth: token123",                # 进入 *headers
    timeout=60,                      # 关键字传 timeout
    retry=3,                         # 进入 **extra
)
print(cfg)
# {'url': '/api/users', 'method': 'POST',
#  'headers': ['Content-Type: json', 'Auth: token123'],
#  'timeout': 60, 'extra': {'retry': 3}}
```

---

## 小结

控制流几乎是 JS 的「换皮」，把精力留给函数的参数系统——`*args/**kwargs` 是后面读库源码的通行证。

✅ 该掌握
- 缩进即代码块，`elif` / `and` / `or` / `not`，三元 `a if cond else b`
- `for x in xs` 默认遍历值，要索引用 `enumerate`，要次数用 `range`
- `def` 定义函数，类型注解（`name: str -> str`）是提示不强制
- 关键字参数（具名传参）；`*args` 收位置参数成元组、`**kwargs` 收关键字参数成字典
- 调用处 `*list` / `**dict` 是「解包」，与定义处的「收集」方向相反

⚠️ 易混淆
- 默认参数别用可变对象（`[]` / `{}`），用 `None` 兜底再新建
- 判空用 `is None`，不是 `== None`；函数无 return 返回 `None` 不是 `undefined`
- 没有 `++`、没有 `do...while`、没有 `===`
- `lambda` 只能写单个表达式，复杂逻辑必须用 `def`
- 定义函数时 `*` = 收集，调用函数时 `*` = 解包，方向相反

下一篇：数据结构进阶（列表/字典推导式等 Python 标志性写法）。
