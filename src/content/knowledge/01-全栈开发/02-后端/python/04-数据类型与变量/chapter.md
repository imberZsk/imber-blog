# 第 04 课：数据类型与变量

> 你已经会 JS 的 `number / string / Array / Object / Map / Set`。这篇就把 Python 的 `int / float / str / list / dict / tuple / set` 一一对上号，重点不是"它们长什么样"，而是**哪里和 JS 不一样、哪里会让你踩坑**。

## 先建立一个总锚点

把 Python 的内置类型对照 JS，大致是这张表：

| JavaScript | Python | 一句话区别 |
|-----------|--------|-----------|
| `number`（不分整数小数） | `int` / `float` | Python 把整数和小数**分成两种类型** |
| `string` | `str` | 单引号双引号都行，**没有反引号模板字符串**（用 f-string 代替） |
| `boolean`（`true`/`false`） | `bool`（`True`/`False`） | **首字母大写** |
| `null` / `undefined` | `None` | 只有一个空值，没有 undefined |
| `Array`（`[]`） | `list`（`[]`） | 长得一样，方法名差很多 |
| `Object`（`{}`，键只能字符串） | `dict`（`{}`，键可以是任意不可变值） | 字面量像，但 `dict` 是更纯粹的"字典" |
| `Map` | `dict` | Python 没有单独的 Map，`dict` 一肩挑 |
| `Set` | `set`（`{}`） | 概念一样 |
| —（JS 无） | `tuple`（`()`） | **不可变的 list**，JS 里没有直接对应 |

下面逐个讲透，并且每讲一个就**立刻划清和 JS 的边界**，防止你拿 JS 心智模型硬套。

---

## 一、变量：没有 let/const，直接赋值

Python 声明变量就是一个等号，**不需要 `let`/`const`/`var`，也不写类型**：

```python
# Python
count = 10          # count：存商品数量，int 类型
name = "Tom"        # name：存用户名，str 类型
is_active = True    # is_active：存账号是否激活，bool 类型（注意 True 首字母大写）
```

```javascript
// JavaScript（对照）
let count = 10;
let name = "Tom";
let isActive = true;
```

边界（哪里不一样）：

1. **没有分号**（加了也不报错，但不符合习惯，不要加）。
2. **命名习惯是 `snake_case`**（下划线），不是 JS 的 `camelCase`。`is_active` 而不是 `isActive`。
3. **没有 `const`**。Python 没有真正的常量机制，约定俗成用**全大写**表示"别改我"：`MAX_SIZE = 100`。这只是约定，语法上还是能改。
4. Python 是**动态类型**，这点和 JS 一样：一个变量可以先存数字再存字符串（虽然不建议）。

> 注意：Python 也有"类型注解"（`count: int = 10`），但它和 TS 不同——**运行时完全不检查、不报错**，纯粹给人和工具看。后面讲 Pydantic / FastAPI 时会再展开（详见后续 Pydantic 篇）。

---

## 二、数字：int 和 float 是两种类型

JS 只有一个 `number`，Python 拆成了 `int`（整数）和 `float`（小数）：

```python
a = 10          # a：int 整数
b = 3.14        # b：float 小数
c = 10 / 3      # c：3.333...，只要用 / 结果一定是 float
d = 10 // 3     # d：3，// 是「整除」，向下取整，结果还是 int
e = 10 % 3      # e：1，取余，和 JS 一样
f = 2 ** 10     # f：1024，** 是「幂运算」，相当于 JS 的 Math.pow(2, 10)
```

```javascript
// JavaScript（对照）
let c = 10 / 3;          // 3.333...
let d = Math.floor(10 / 3); // 3，JS 没有整除运算符
let f = 2 ** 10;         // 1024，** 这个和 Python 一样
```

边界：

- **`/` 永远得到 float**：`6 / 2` 在 Python 里是 `3.0` 不是 `3`。想要整数结果用 `//`。
- **`int` 没有大小上限**：JS 超过 `Number.MAX_SAFE_INTEGER` 会失真，Python 的 `int` 可以无限大（`2 ** 1000` 直接算出精确值），这点比 JS 强。
- `float` 一样有浮点误差：`0.1 + 0.2 == 0.3` 在 Python 里同样是 `False`，和 JS 一个毛病。

---

## 三、字符串 str：没有反引号，用 f-string

```python
name = "Tom"        # name：用户名
age = 18            # age：年龄

# f-string：在字符串前加 f，用 {} 嵌变量，相当于 JS 的反引号模板字符串
msg = f"Hello, {name}, you are {age}"   # msg：拼好的问候语

# 也能直接用 + 拼，但 + 两边必须都是 str
msg2 = "Hello, " + name                  # msg2：用加号拼接的字符串
```

```javascript
// JavaScript（对照）
let msg = `Hello, ${name}, you are ${age}`;  // 反引号 + ${}
let msg2 = "Hello, " + name;
```

对照表：

| JavaScript | Python | 说明 |
|-----------|--------|------|
| `` `Hello ${name}` `` | `f"Hello {name}"` | 模板字符串，Python 用 `f"..."` 而非反引号 |
| `str.length` | `len(s)` | **Python 没有 `.length` 属性**，统一用 `len()` 函数 |
| `str.toUpperCase()` | `s.upper()` | 转大写 |
| `str.toLowerCase()` | `s.lower()` | 转小写 |
| `str.includes("x")` | `"x" in s` | 是否包含，用 `in` 关键字更地道 |
| `str.split(",")` | `s.split(",")` | 切分，一样 |
| `str.trim()` | `s.strip()` | 去首尾空白 |
| `str.replace("a","b")` | `s.replace("a", "b")` | 替换 |
| `arr.join("-")` | `"-".join(arr)` | **方向反了**：Python 是「分隔符.join(列表)」 |

边界（最容易踩的两个坑）：

1. **求长度是 `len(s)` 不是 `s.length`**。这是新手最高频的错。`list`、`dict` 也都用 `len()`。
2. **`+` 不会自动转类型**：`"年龄" + 18` 在 JS 里得到 `"年龄18"`，在 Python 里**直接报错**（`TypeError`）。必须显式转：`"年龄" + str(18)`，或者干脆用 f-string。

---

## 四、list：长得像 Array，方法名不一样

`list` 就是 Python 的"数组"，字面量也是 `[]`：

```python
# fruits：存水果名称的列表
fruits = ["apple", "banana", "cherry"]

fruits.append("orange")   # 末尾添加，相当于 JS 的 push
first = fruits[0]         # 取第一个，索引访问和 JS 一样
last = fruits[-1]         # 取最后一个，负索引！JS 没有，等价于 arr[arr.length-1]
count = len(fruits)       # 长度，不是 .length
```

```javascript
// JavaScript（对照）
let fruits = ["apple", "banana", "cherry"];
fruits.push("orange");
let first = fruits[0];
let last = fruits[fruits.length - 1];  // JS 要手动算
let count = fruits.length;
```

方法对照：

| JavaScript | Python | 说明 |
|-----------|--------|------|
| `arr.push(x)` | `list.append(x)` | 末尾追加单个 |
| `arr.pop()` | `list.pop()` | 弹出末尾，一样 |
| `arr.length` | `len(arr)` | 长度用函数 |
| `arr.includes(x)` | `x in arr` | 是否包含 |
| `arr.indexOf(x)` | `arr.index(x)` | 找下标（找不到 Python 会**报错**，JS 返回 -1） |
| `arr.map(f)` | `[f(x) for x in arr]` | 列表推导式，后面单独讲 |
| `arr.filter(f)` | `[x for x in arr if f(x)]` | 列表推导式 |
| `arr.slice(1, 3)` | `arr[1:3]` | **切片语法**，Python 用方括号+冒号 |

边界——切片（slicing）是 Python 的招牌特性，JS 没有等价语法：

```python
nums = [0, 1, 2, 3, 4, 5]   # nums：测试用数字列表

nums[1:3]    # [1, 2]，从下标 1 到 3（不含 3），类似 arr.slice(1,3)
nums[:3]     # [0, 1, 2]，从头到下标 3（不含）
nums[3:]     # [3, 4, 5]，从下标 3 到末尾
nums[-2:]    # [4, 5]，最后两个
nums[::-1]   # [5, 4, 3, 2, 1, 0]，步长 -1 = 反转列表（常用技巧）
```

> 这个切片语法后面看 NumPy / Pandas 会反复用到，先混个眼熟。

---

## 五、dict：JS 的 Object 和 Map 合二为一

`dict` 是 Python 的字典，字面量也是 `{}`，但它更像 JS 的 `Map`（纯键值存储），而不是带方法的 Object：

```python
# user：存一个用户信息的字典
user = {
    "name": "Tom",     # 键 "name" 对应用户名
    "age": 18,         # 键 "age" 对应年龄
}

name = user["name"]          # 取值，键不存在会报错 KeyError
age = user.get("age")        # 用 get 取值，键不存在返回 None，不报错（更安全）
city = user.get("city", "")  # 第二个参数是默认值，键不存在时返回 ""
user["email"] = "t@x.com"    # 新增/修改键
exists = "name" in user      # 判断键是否存在，用 in（不是 .hasOwnProperty）
```

```javascript
// JavaScript（对照）
let user = { name: "Tom", age: 18 };
let name = user["name"];          // 或 user.name
let age = user.age;
user.email = "t@x.com";
let exists = "name" in user;      // 或 user.hasOwnProperty("name")
```

对照表：

| JavaScript（Object） | Python（dict） | 说明 |
|---------------------|----------------|------|
| `obj.key` / `obj["key"]` | `d["key"]` | Python **没有点号访问**，只能用方括号 |
| `obj.key`（不存在得 undefined） | `d["key"]`（不存在**报错**） | 关键差异！用 `d.get("key")` 才返回 `None` |
| `obj["key"] = v` | `d["key"] = v` | 赋值一样 |
| `delete obj.key` | `del d["key"]` | 删除 |
| `Object.keys(obj)` | `d.keys()` | 所有键 |
| `Object.values(obj)` | `d.values()` | 所有值 |
| `Object.entries(obj)` | `d.items()` | 键值对，常用于遍历 |
| `"key" in obj` | `"key" in d` | 判断键存在 |

边界（两个核心差异）：

1. **没有点号访问**：JS 习惯 `user.name`，Python 只能 `user["name"]`。（点号在 Python 里是访问对象的属性/方法，是另一回事。）
2. **取不存在的键会抛 `KeyError`，不是返回 undefined**。所以读取拿不准的键，养成用 `.get(key, 默认值)` 的习惯。

遍历 dict 的地道写法：

```python
# 遍历键值对，items() 类似 JS 的 Object.entries()
for key, value in user.items():
    print(f"{key} = {value}")   # 同时拿到键和值
```

---

## 六、tuple：JS 里没有的"不可变 list"

`tuple`（元组）用圆括号 `()`，可以理解成**一旦创建就不能改的 list**。JS 里没有直接对应物。

```python
# point：存一个坐标点，(x, y)，定好就不该再改
point = (3, 4)

x = point[0]    # 取值和 list 一样，用下标
# point[0] = 5  # 报错！tuple 不可变，不能修改元素

# 最常见用途：函数返回多个值（Python 用 tuple 实现"多返回值"）
def get_size():
    # get_size：返回屏幕宽高两个值，演示多返回值的写法
    return 1920, 1080          # 实际返回的是一个 tuple (1920, 1080)

width, height = get_size()     # 解构赋值，类似 JS 的 const [w, h] = ...
```

```javascript
// JavaScript（对照）：JS 没有 tuple，通常用数组模拟，但数组能改
function getSize() {
  return [1920, 1080];
}
const [width, height] = getSize();  // 解构和 Python 几乎一样
```

边界：

- **为什么要有 tuple？** 表达"这组数据是固定的，别改"（坐标、RGB 颜色、数据库一行记录）。不可变 = 更安全、能当 `dict` 的键、性能略好。
- **单元素 tuple 有个坑**：`(5)` 不是 tuple，是数字 5 加了层括号；必须写 `(5,)`，**逗号才是元组的灵魂**。

---

## 七、set：去重集合

`set` 用 `{}`，存**不重复**的元素，概念和 JS 的 `Set` 一样：

```python
# tags：存文章标签，自动去重
tags = {"python", "web", "python"}   # 结果只有 {"python", "web"}

tags.add("ai")             # 添加元素，相当于 JS 的 set.add
has = "web" in tags        # 判断是否存在，用 in（O(1)，很快）

# 列表去重的常用技巧：转 set 再转回 list
nums = [1, 1, 2, 3, 3]     # nums：有重复的列表
unique = list(set(nums))   # unique：去重后的列表 [1, 2, 3]
```

```javascript
// JavaScript（对照）
let tags = new Set(["python", "web", "python"]);
tags.add("ai");
let has = tags.has("web");
let unique = [...new Set([1, 1, 2, 3, 3])];  // 去重技巧
```

边界（一个语法陷阱）：

- **空集合不能写 `{}`**！`{}` 是空 `dict`，不是空 `set`。空集合必须写 `set()`。这是 Python 用 `{}` 同时表示两种类型留下的历史坑。

---

## 八、可变 vs 不可变（理解这个能少踩一半坑）

这是 Python 类型体系里最该建立的一个直觉。把内置类型分两类：

| 不可变（创建后不能改） | 可变（能原地修改） |
|---------------------|------------------|
| `int` / `float` / `bool` | `list` |
| `str` | `dict` |
| `tuple` | `set` |
| `None` | |

这点其实和 JS 高度相似——JS 里 `string`/`number` 是值类型（不可变），`object`/`array` 是引用类型（可变）。同样的坑也存在：

```python
a = [1, 2, 3]   # a：原始列表
b = a           # b 和 a 指向同一个列表（不是拷贝！和 JS 引用赋值一样）
b.append(4)     # 改 b 实际也改了 a
print(a)        # [1, 2, 3, 4]，a 也变了

# 想真正复制一份，用切片或 .copy()
c = a[:]        # c：a 的浅拷贝，改 c 不影响 a
c = a.copy()    # 同上，更直观的写法
```

```javascript
// JavaScript（同样的引用陷阱）
let a = [1, 2, 3];
let b = a;          // 引用赋值
b.push(4);
console.log(a);     // [1, 2, 3, 4]，a 也变了
let c = [...a];     // 浅拷贝
```

> 一句话：**`list`/`dict`/`set` 赋值是传引用**，要复制得显式 copy。这和 JS 的对象/数组完全一致，你已经懂这个直觉。

---

## 九、类型转换与查看类型

```python
n = int("123")      # 字符串转 int，相当于 JS 的 parseInt / Number
f = float("3.14")   # 字符串转 float
s = str(123)        # 数字转字符串，相当于 JS 的 String(123)
b = bool(0)         # 0 转 bool 是 False（空字符串、空列表、0、None 都是假值）

t = type(n)         # 查看类型，返回 <class 'int'>，类似 JS 的 typeof
ok = isinstance(n, int)  # 判断是否是某类型，返回 True（更推荐用这个做判断）
```

```javascript
// JavaScript（对照）
let n = parseInt("123");   // 或 Number("123")
let s = String(123);
let t = typeof n;          // "number"
```

边界：

- **假值（falsy）规则和 JS 类似但不完全相同**：Python 里 `0`、`""`、`None`、`[]`（空列表）、`{}`（空字典）、`set()`（空集合）都是假值。JS 里空数组 `[]` 和空对象 `{}` 反而是**真值**——这是个容易反向踩的坑。
- 判断类型用 `isinstance(x, int)` 比 `type(x) == int` 更地道（能正确处理继承关系）。

---

## 小结

把 Python 内置类型当成"换了套方法名和语法的 JS 类型"来记，绝大部分直觉能复用，只盯着差异记就够了。

✅ 该掌握：
- 变量直接赋值、`snake_case` 命名、没有 `const`（用全大写约定常量）
- `int` / `float` 是两种类型，`/` 永远得 float，`//` 是整除
- 字符串用 `len()` 求长度、用 f-string 拼接、`+` 不自动转类型
- `list`（`[]`）、`dict`（`{}`）、`set`（`{}`）、`tuple`（`()`）的字面量和常用操作
- 切片 `arr[1:3]` / `arr[::-1]` 这套 Python 招牌语法
- 可变 vs 不可变，以及 `list`/`dict` 赋值传引用（和 JS 一致）

⚠️ 易混淆：
- **`len(x)` 不是 `x.length`**（最高频的错）
- **`dict["不存在的键"]` 会报 `KeyError`**，不像 JS 返回 undefined，拿不准用 `.get()`
- **dict 不能用点号访问**，只能 `d["key"]`
- **空 set 是 `set()` 不是 `{}`**（`{}` 是空 dict）
- **`"年龄" + 18` 直接报错**，必须 `str(18)`
- 空列表 `[]`、空字典 `{}` 在 Python 里是**假值**（JS 里却是真值）

下一篇：运算符与流程控制，把 `if / for / while` 和 JS 对齐，重点看 Python 用**缩进**代替花括号这件大事。
