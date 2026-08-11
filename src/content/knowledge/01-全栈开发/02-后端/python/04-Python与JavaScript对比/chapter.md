# Python（3）- Python 与 JavaScript 对比

> 你已经会 JS/TS，本篇用一张对照表帮你把 Python 的变量、函数、类型、常用操作一次性对上号。重点不是"记语法"，而是划清那些**长得像但行为不一样**的坑（比如 `self` 不是 `this`、`is` 不是 `===`）。

# 一、核心思路

**Python ≈ 动态类型的 JS（像不写类型的 JavaScript），但用缩进代替 `{}`、用换行代替 `;`。**

和你从 JS 转 Java 不同：Java 是"强类型 + 编译检查"，处处和 JS 别扭；而 Python 的类型系统和 JS 几乎一样松（运行时才检查），所以**上手比 Java 顺**。真正的差异集中在三处：**写法（缩进/命名）**、**几个同名不同义的关键字**、以及 **`self` 这个最大的陷阱**。

> 边界提醒：本篇只讲语法对照，建立"我大概会写了"的直觉。像 `async` 不受 GIL 影响、装饰器机制、生成器原理这些，留到对应专题篇深入。

---

# 二、变量和类型

## 2.1 变量声明

| JavaScript | TypeScript | Python |
|-----------|-----------|--------|
| `let name = "Tom"` | `let name: string = "Tom"` | `name = "Tom"` |
| `const AGE = 18` | `const AGE: number = 18` | `AGE = 18`（约定大写表示常量） |

**关键差异（边界）：**
- **没有 `let` / `const` / `var`**，直接 `变量名 = 值`。
- **Python 没有真正的常量**。全大写 `AGE` 只是**约定**告诉别人"别改我"，语言层面照样能改。这点和 JS 的 `const`（真正只读）不一样，别套用。
- 行尾**不写分号 `;`**（写了也不报错，但不符合习惯）。
- 命名习惯是 **`snake_case`**（下划线），不是 JS 的 `camelCase`。这是社区强约定，建议入乡随俗。

## 2.2 类型提示（Type Hints）≈ TS 的类型注解

Python 默认动态类型，但**可选**地写类型提示，写法和 TS 几乎一样（都是"变量名在前、类型在后"）：

```typescript
// TypeScript：类型是强制检查的
let count: number = 10;
let userName: string = "Tom";
```

```python
# Python：类型提示只是"给人和工具看的注释"，运行时不强制
count: int = 10          # count 存放计数，类型提示为 int
user_name: str = "Tom"   # user_name 存放用户名，类型提示为 str
```

> 边界：TS 的类型在编译期会报错；Python 的类型提示**运行时完全不检查**，写错类型照样跑。它的价值是给 IDE 补全和 mypy 这类静态检查工具用。后面学 FastAPI / Pydantic 时，类型提示会"变成真的"（被框架拿去做校验），到那篇再展开。

## 2.3 基本类型对照

| JS/TS | Python | 说明 |
|-------|--------|------|
| `number` | `int` | 整数 |
| `number` | `float` | 小数（浮点） |
| `string` | `str` | 字符串 |
| `boolean` | `bool` | 布尔值，**`True` / `False` 首字母大写** |
| `null` / `undefined` | `None` | 空值，**只有一个 `None`，首字母大写** |
| `Array` | `list` | 列表 |
| `object` / `Map` | `dict` | 字典 |
| `[a, b]`（TS 元组类型，但默认可改） | `tuple` | 元组（**真正不可变**） |
| `Set` | `set` | 集合 |

**最容易踩的三个坑：**
1. **`True` / `False` / `None` 首字母大写**。写成 JS 的 `true` / `null` 会直接报 `NameError`。
2. **`int` 和 `float` 是分开的两种类型**（JS 只有一个 `number`）。`10` 是 int，`10.0` 是 float。
3. **没有 `undefined`**，空值只有 `None` 一个。

```javascript
// JavaScript
let isActive = true;
let data = null;
```

```python
# Python
is_active = True   # is_active 存放激活状态，注意 True 大写
data = None        # data 存放空值，注意 None 大写
```

---

# 三、函数

## 3.1 声明格式

| JavaScript | Python |
|-----------|--------|
| `function add(a, b) { return a + b }` | `def add(a, b): return a + b` |
| 箭头函数 `(a, b) => a + b` | `lambda a, b: a + b` |

**Python 格式：**
```python
def 函数名(参数, ...):   # 用 def 关键字，结尾加冒号
    return 返回值        # 用缩进表示函数体，没有 {}
```

## 3.2 完整例子（并排对照）

```javascript
// JavaScript
function greet(name) {
    return "Hello, " + name;
}
```

```python
# Python
def greet(name):          # 定义打招呼函数，name 为待问候的名字
    return "Hello, " + name
```

带类型提示的版本（≈ TS）：

```python
# 返回类型用 -> 标在参数括号后面
def greet(name: str) -> str:   # name: 待问候的名字；-> str: 返回字符串
    return "Hello, " + name
```

## 3.3 默认参数 & 关键字参数（比 JS 强大）

JS 的默认参数你已经会。Python 额外支持**调用时按名字传参**，可读性很高：

```javascript
// JavaScript：默认参数
function createUser(name, age = 18) { ... }
createUser("Tom");           // 只能按位置传
```

```python
# Python：默认参数 + 关键字参数
def create_user(name, age=18):   # create_user：创建用户字典；name 必填，age 默认 18
    return {"name": name, "age": age}

create_user("Tom")               # 按位置：age 用默认值 18
create_user("Tom", age=20)       # 按名字传：更清晰，不怕传错位置
```

> 坑：**默认参数不要用可变对象**（如 `def f(items=[])`）。因为默认值只在定义时创建一次，多次调用会共享同一个 list，导致诡异 bug。需要时用 `def f(items=None): items = items or []`。这是 Python 新手的经典陷阱。

## 3.4 程序入口：没有 main，但有 `if __name__ == "__main__"`

Python 没有 Java 那种强制的 `main` 方法。文件**从上到下直接执行**。但有个固定写法用来区分"被直接运行"还是"被 import"：

```python
def main():                  # main：程序入口逻辑，集中放启动时要跑的代码
    print("程序启动")

# 仅当本文件被直接运行（python xxx.py）时才执行；被别的文件 import 时不执行
if __name__ == "__main__":
    main()
```

类比：有点像 Node 里判断 `if (require.main === module)`——只在直接运行时跑入口逻辑。

---

# 四、列表、字典与常用操作

## 4.1 列表 list ≈ JS Array

`list` 就是 JS 的 `Array`，但方法名变了：

```javascript
// JavaScript
let arr = [1, 2, 3];
arr.push(4);            // 末尾追加
arr.length;             // 长度
arr[0];                 // 取第一个
arr.includes(2);        // 是否包含
```

```python
# Python
arr = [1, 2, 3]         # arr 存放一组数字
arr.append(4)           # push → append（末尾追加）
len(arr)                # arr.length → len(arr)（用内置函数，不是属性）
arr[0]                  # 取第一个，和 JS 一样
2 in arr                # includes → in 运算符
```

| JS | Python |
|------|--------|
| `arr.push(x)` | `arr.append(x)` |
| `arr.length` | `len(arr)` |
| `arr[i]` | `arr[i]` |
| `arr.includes(x)` | `x in arr` |
| `arr.slice(1, 3)` | `arr[1:3]`（切片语法） |
| `arr[arr.length - 1]` | `arr[-1]`（**负索引取倒数**，JS 没有） |

> 亮点：Python 的**切片**很强。`arr[1:3]` 取索引 1~2，`arr[-1]` 取最后一个，`arr[::-1]` 直接反转。这是 JS 没有的语法糖。

## 4.2 字典 dict ≈ JS object / Map

```javascript
// JavaScript
let map = {};
map["age"] = 18;        // 或 map.age = 18
map["age"];             // 取值
delete map["age"];      // 删除
"age" in map;           // 是否有 key
```

```python
# Python
m = {}                  # m 存放键值对
m["age"] = 18           # 只能用 [],没有 m.age 这种点语法
m["age"]                # 取值；key 不存在会报 KeyError（不像 JS 返回 undefined）
m.get("age")            # 更安全：取不到返回 None,不报错
del m["age"]            # 删除
"age" in m              # 是否有 key（检查的是 key,和 JS 一样）
```

| JS | Python |
|------|--------|
| `obj[key] = value` | `d[key] = value` |
| `obj[key]` | `d[key]` |
| `obj.key`（点语法） | ❌ 不支持，**只能用 `d[key]`** |
| `obj[key] ?? default` | `d.get(key, default)` |
| `delete obj[key]` | `del d[key]` |
| `Object.keys(obj)` | `d.keys()` |

> 坑：**字典取不存在的 key 会抛 `KeyError` 异常**，不像 JS 返回 `undefined`。不确定 key 在不在时，用 `d.get(key)`（默认返回 None）或 `d.get(key, 默认值)`。

## 4.3 列表推导式 ≈ map / filter 的浓缩写法

JS 里 `arr.map(...).filter(...)` 链式调用，Python 有更紧凑的**列表推导式**：

```javascript
// JavaScript
let nums = [1, 2, 3, 4];
let doubled = nums.map(n => n * 2);              // 每个翻倍
let evens = nums.filter(n => n % 2 === 0);       // 只留偶数
```

```python
# Python
nums = [1, 2, 3, 4]                              # nums 存放一组待处理的数字
doubled = [n * 2 for n in nums]                  # ≈ map：每个翻倍
evens = [n for n in nums if n % 2 == 0]          # ≈ filter：if 在后面做筛选
```

读法："**结果表达式** for **元素** in **集合** if **条件**"。一开始别扭，写几次就顺了，这是 Python 最常用的写法之一。

---

# 五、类和对象（最大的坑：self）

## 5.1 类定义

```typescript
// TypeScript
class User {
    name: string;
    age: number;

    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }

    greet(): string {
        return `Hello, ${this.name}`;
    }
}
const u = new User("Tom", 18);
```

```python
# Python
class User:
    # 构造方法固定叫 __init__（不是 constructor）
    # self 是实例自身,必须作为第一个参数显式写出
    def __init__(self, name, age):
        self.name = name      # self.name 存放用户名
        self.age = age        # self.age 存放年龄

    # 每个方法的第一个参数都必须是 self
    def greet(self):
        return f"Hello, {self.name}"   # f-string ≈ JS 模板字符串

u = User("Tom", 18)           # 创建实例，注意没有 new 关键字
```

**关键差异（重点边界）：**
1. **`self` 不是 `this`**。`this` 是 JS 隐式给的，Python 的 `self` 必须**手动写成方法的第一个参数**，并且调用时不用传（解释器自动塞进去）。这是前端转 Python 最高频的报错来源。
2. **构造方法固定叫 `__init__`**，不是 `constructor`。
3. **创建对象不用 `new`**，直接 `User("Tom", 18)`。
4. 访问成员一律 `self.xxx`，漏写 `self.` 会被当成局部变量。

> 为什么 self 要显式写？(WHY) Python 的设计哲学是"显式优于隐式"——方法本质上就是个普通函数，`u.greet()` 等价于 `User.greet(u)`，那个 `u` 就是传给 `self` 的。理解了这一层，self 就不神秘了。

## 5.2 f-string（模板字符串）

```javascript
// JavaScript：反引号 + ${}
let msg = `Hello, ${name}, you are ${age}`;
```

```python
# Python：字符串前加 f,用 {}
msg = f"Hello, {name}, you are {age}"   # msg 存放拼好的问候语
```

一对一映射，把反引号换成 `f"..."`、去掉 `$` 即可。

---

# 六、控制流（和 JS 像，但有几个坑）

## 6.1 条件判断

```python
# if-elif-else：注意是 elif 不是 else if,每个分支结尾加冒号
if age >= 18:
    print("成年")
elif age >= 12:        # else if → elif
    print("青少年")
else:
    print("儿童")
```

| JS | Python | 说明 |
|------|--------|------|
| `else if` | `elif` | 拼写不同 |
| `&&` `\|\|` `!` | `and` `or` `not` | **用英文单词**，不是符号 |
| `===` | `==` | Python 没有 `===`，`==` 比的是值 |
| `a ? b : c` | `b if a else c` | **三元语序反了**，结果在前 |

```javascript
// JavaScript 三元
let result = age >= 18 ? "成年" : "未成年";
```

```python
# Python 三元：语序是「真值 if 条件 else 假值」,和 JS 反过来
result = "成年" if age >= 18 else "未成年"
```

## 6.2 循环

```python
# for 遍历列表（≈ JS for-of,但不用括号）
for item in arr:
    print(item)

# 要计数时用 range(n) 生成 0..n-1
for i in range(10):       # i 从 0 到 9
    print(i)

# 同时拿索引和值（≈ arr.entries()）
for i, item in enumerate(arr):   # i 是索引,item 是值
    print(i, item)

# while 和 JS 几乎一样
while count > 0:
    count -= 1            # Python 没有 ++ / --,用 += / -=
```

> 坑：**Python 没有 `++` / `--` 自增运算符**。要写 `count += 1` / `count -= 1`。

---

# 七、相等判断与真值（高频坑）

## 7.1 `==` vs `is`

```python
a = [1, 2]    # a 存放一个列表
b = [1, 2]    # b 存放另一个内容相同、但独立创建的列表
a == b      # True：比较「值」是否相等（你大多数时候要的）
a is b      # False：比较「是不是同一个对象」（身份/内存地址）
```

**`is` 不是 JS 的 `===`！** 别被长度迷惑。规则：
- 比**值**用 `==`（这是日常默认选择）。
- `is` 只用在判断 `None`：写 `if x is None:`，这是社区规范（不写 `x == None`）。

```javascript
// JavaScript
if (data === null) { ... }
```

```python
# Python：判空用 is None
if data is None:        # 判断 data 是否为空,固定用 is None
    print("没有数据")
```

## 7.2 真值（Truthy / Falsy）

和 JS 类似但更直觉：空列表 `[]`、空字典 `{}`、空字符串 `""`、`0`、`None` 都是假值。

```python
items = []              # items 存放一个空列表，用来演示真值判断
if not items:           # 列表为空时为真,常用来判断「没数据」
    print("列表是空的")
```

---

# 八、模块与包（≈ import / npm）

## 8.1 导入导出

Python **没有 `export`**——一个文件（模块）里定义的所有东西默认都能被别的文件导入。

```javascript
// JavaScript
import { add } from './utils';
import axios from 'axios';
```

```python
# Python
from utils import add        # 从 utils.py 导入 add 函数
import requests              # 导入第三方库（≈ import axios）
from datetime import datetime  # 导入标准库的某个类
```

| JS | Python |
|------|--------|
| `import { x } from './m'` | `from m import x` |
| `import * as m from './m'` | `import m`（用 `m.x` 调用） |
| `export function x` | 无需导出，定义即可被导入 |
| `npm install axios` | `pip install requests` |
| `package.json` | `requirements.txt` / `pyproject.toml` |
| `node_modules/` | 虚拟环境 `venv/`（见环境配置篇） |

> 边界：JS 的依赖装在项目本地 `node_modules`；Python 默认装到全局，所以才需要**虚拟环境**隔离不同项目（环境篇已讲）。心智上 `pip` ≈ `npm`，`venv` ≈ 项目级隔离。

---

# 九、常见语法速查表

| 功能 | JavaScript/TypeScript | Python |
|------|---------------------|--------|
| 变量 | `let x = 1` | `x = 1` |
| 常量 | `const X = 1` | `X = 1`（仅约定大写） |
| 代码块 | `{ ... }` | **缩进**（4 个空格） |
| 行尾 | `;` | 直接换行 |
| 命名 | `camelCase` | `snake_case` |
| 字符串模板 | `` `Hi ${name}` `` | `f"Hi {name}"` |
| 函数 | `function f(x) {}` | `def f(x):` |
| 箭头函数 | `(x) => x + 1` | `lambda x: x + 1` |
| 空值 | `null` / `undefined` | `None` |
| 布尔 | `true` / `false` | `True` / `False` |
| 逻辑与或非 | `&&` `\|\|` `!` | `and` `or` `not` |
| 相等 | `===` | `==`（判空用 `is None`） |
| 三元 | `a ? b : c` | `b if a else c` |
| 列表追加 | `arr.push(x)` | `arr.append(x)` |
| 长度 | `arr.length` | `len(arr)` |
| 字典取值 | `obj[k]` / `obj[k] ?? d` | `d[k]` / `d.get(k, 默认)` |
| 包含判断 | `arr.includes(x)` | `x in arr` |
| 遍历 | `for (const x of arr)` | `for x in arr:` |
| 带索引遍历 | `arr.entries()` | `enumerate(arr)` |
| 自增 | `i++` | `i += 1`（无 `++`） |
| this | `this` | `self`（需显式声明） |
| 构造器 | `constructor()` | `def __init__(self)` |
| 实例化 | `new User()` | `User()`（无 new） |
| 输出 | `console.log(x)` | `print(x)` |
| 注释 | `//` `/* */` | `#` `""" """` |

---

# 十、总结

Python 对前端来说**比 Java 友好**：动态类型、写法简洁、控制流和 JS 几乎一致。真正要重点记的就三类差异。

✅ **该掌握**
- 缩进即代码块、`#` 注释、`snake_case`、行尾不写分号。
- 三大数据结构对照：`list` ≈ Array（`append` / `len()`）、`dict` ≈ object（只能 `d[k]`，用 `.get()` 防 KeyError）、列表推导式 ≈ map/filter。
- 类：`def __init__(self, ...)` 是构造器，方法第一个参数永远是 `self`，实例化不用 `new`。
- `f"{x}"` 模板字符串、`x if cond else y` 三元、`for x in arr` 遍历。

⚠️ **易混淆（前端最容易栽的坑）**
- **`self` 不是 `this`**：必须手写成方法第一个参数，调用时不传。
- **`is` 不是 `===`**：比值用 `==`，`is` 只用于 `x is None`。
- **`True` / `False` / `None` 首字母大写**，逻辑用 `and` / `or` / `not` 而非 `&&` / `||`。
- **没有 `++`、没有 `let/const`、没有 `undefined`**；常量只是命名约定，不是真只读。
- 字典取不存在的 key 会**抛异常**，不是返回 undefined。

下一阶段开始接触真实库时，类比会越来越重要（NumPy ≈ 超级 Array、Pandas ≈ 加强版 Excel），到那几篇会重点加锚点。本篇先把基础语法对上号即可。

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“Python（3）- Python 与 JavaScript 对比”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
