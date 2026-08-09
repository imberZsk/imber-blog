# 07 - 面向对象

> 你在前端写过 `class extends`、`constructor`、`this`。Python 的 OOP 八成长得像，但有几个"看着一样、其实不一样"的坑：`self` 不是 `this`、类属性会被所有实例共享、还有一堆 `__xxx__` 魔术方法。本篇帮你把 JS 的 class 心智模型平移过来，并划清差异。

## 一、先给锚点：和 ES6 class 几乎一一对应

你在 React/TS 里写过的 class，Python 里有等价物，连关键字都很像：

```javascript
// JS / TS
class User {
  constructor(name, age) {
    this.name = name   // 实例属性
    this.age = age
  }
  greet() {            // 实例方法
    return `我是 ${this.name}`
  }
}
const tom = new User("Tom", 18)
tom.greet()
```

```python
# Python
class User:
    # __init__ 就是构造函数，对应 JS 的 constructor
    # self 是当前实例（约定名，对应 JS 的 this），必须手写为第一个参数
    def __init__(self, name, age):
        self.name = name   # 实例属性：存这个用户的名字
        self.age = age     # 实例属性：存这个用户的年龄

    # 实例方法：第一个参数固定是 self，否则拿不到实例数据
    def greet(self):
        return f"我是 {self.name}"

tom = User("Tom", 18)   # 注意：没有 new！直接像调函数一样
tom.greet()
```

对照表先建立直觉：

| JS / TS | Python | 说明 |
|---------|--------|------|
| `class User {}` | `class User:` | 关键字一致 |
| `constructor()` | `def __init__(self)` | 构造函数 |
| `this` | `self` | 当前实例（但 self 要显式写，见下） |
| `new User()` | `User()` | Python 没有 `new` |
| `extends Base` | `class Sub(Base)` | 继承 |
| `super()` | `super().__init__()` | 调父类 |
| `static foo()` | `@staticmethod` | 静态方法 |

---

## 二、边界一：self 不是 this，它必须"显式出现"

这是前端最容易踩的第一个坑。JS 的 `this` 是隐式的、自动绑定的；Python 的 `self` 只是个**普通参数**，规则简单到有点反直觉：

1. 每个实例方法的**第一个参数必须是 `self`**（名字是约定，理论上可改，但永远别改）。
2. 调用时 `tom.greet()` 会被 Python 自动翻译成 `User.greet(tom)`，`tom` 被塞进 `self`。
3. 访问实例属性**必须**写 `self.name`，不能像 JS 那样在方法里直接写 `name`。

```python
class Counter:
    def __init__(self):
        self.count = 0          # 存当前计数值

    def add(self):              # 忘了写 self 会直接报错
        self.count += 1         # 必须 self.count，不能只写 count
        return self.count

c = Counter()
c.add()                         # → 1，等价于 Counter.add(c)
```

```javascript
// JS 对比：this 是隐式的，方法里直接写 this.count
class Counter {
  constructor() { this.count = 0 }
  add() { this.count += 1; return this.count }  // 没有显式 this 参数
}
```

> ✅ 好消息：因为 `self` 是显式传入的，Python **没有 JS 那种 `this` 丢失的问题**。你不需要 `.bind(this)`、不需要箭头函数来"锁定 this"。把方法当回调传出去，`self` 也跟得牢牢的。

---

## 三、边界二：类属性 vs 实例属性（最隐蔽的坑）

JS 里你习惯所有状态都挂在 `this` 上。Python 多了一层"类属性"——直接写在 `class` 下、不在 `__init__` 里的变量，它**被所有实例共享**。

```python
class Dog:
    species = "犬科"            # 类属性：所有 Dog 共享同一份

    def __init__(self, name):
        self.name = name        # 实例属性：每个 Dog 各自一份

a = Dog("旺财")
b = Dog("来福")
print(a.species, b.species)     # 犬科 犬科（读的是同一份）
```

读的时候没问题，但如果类属性是**可变对象（list/dict）**，所有实例会共改一份数据——这是经典 bug：

```python
class Team:
    members = []                # ⚠️ 可变类属性：所有 Team 共享这一个 list！

    def add(self, name):
        self.members.append(name)  # 改的其实是类上的那一份

t1 = Team()
t2 = Team()
t1.add("Tom")
print(t2.members)               # ['Tom'] —— t2 莫名其妙也有了！
```

正确写法：可变状态一律放进 `__init__`，让每个实例独立持有。

```python
class Team:
    def __init__(self):
        self.members = []       # ✅ 每个实例各自一个 list，互不干扰

    def add(self, name):
        self.members.append(name)
```

> 类比：类属性 ≈ JS 里写在 class 体里的 `static` 字段（全类共享）；实例属性 ≈ 写在 `constructor` 里挂到 `this` 上的字段（各实例独立）。前端容易踩坑，是因为 JS 写在 class 体里的 `count = 0` 默认是**实例字段**，而 Python 写在 class 体里的是**类属性**——同样的位置，含义相反。

---

## 四、继承：和 extends 几乎一样，super 略有区别

```python
class Animal:
    def __init__(self, name):
        self.name = name        # 存动物名字

    def speak(self):
        return "..."

# class 子类(父类): 对应 JS 的 class Sub extends Base
class Cat(Animal):
    def __init__(self, name, color):
        super().__init__(name)  # 调父类构造，对应 JS 的 super(name)
        self.color = color      # 子类新增：存毛色

    # 同名方法即"重写"(override)，无需任何关键字标注
    def speak(self):
        return f"{self.name} 喵喵叫"

c = Cat("咪咪", "橘色")
c.speak()                       # 咪咪 喵喵叫
```

```javascript
// JS 对比
class Cat extends Animal {
  constructor(name, color) {
    super(name)                 // 同样先调父类
    this.color = color
  }
  speak() { return `${this.name} 喵喵叫` }
}
```

差异点：
- Python `super().__init__()` 要**自己手动调**，否则父类的 `__init__` 不会跑（JS 里如果子类写了 constructor，不调 super 会直接报错，Python 不报错只是不执行，更隐蔽）。
- Python 支持**多继承** `class C(A, B)`，JS 不支持。新手别急着用，理解单继承即可。

---

## 五、静态方法与类方法：对应 JS 的 static

JS 只有一种 `static`，Python 分两种，用装饰器区分（装饰器先当"标签"理解，第 10 篇细讲）：

```python
class User:
    default_role = "member"     # 类属性：所有 User 共享的默认角色

    def __init__(self, name, age):
        self.name = name        # 实例属性：存用户名
        self.age = age          # 实例属性：存年龄

    @staticmethod               # 静态方法：不接收 self/cls，就是挂在类下的普通函数
    def is_adult(age):          # age 是待判断的年龄(年)
        return age >= 18

    @classmethod                # 类方法：第一个参数是 cls(类本身)，常用于"另一种构造方式"
    def from_string(cls, text): # text 形如 "Tom,18"
        name, age = text.split(",")     # name 是解析出的用户名，age 是解析出的年龄字符串
        return cls(name, int(age))      # cls(...) 即 User(...)，比写死类名更利于继承

User.is_adult(20)               # 静态方法：直接类名调用，不用建实例，像 JS 的 Math 工具方法
User.from_string("Tom,18")      # 类方法当工厂：从字符串造一个 User 实例
```

```javascript
// JS 对比：只有 static 一种，静态和"工厂"都靠它
class User {
  static isAdult(age) { return age >= 18 }
  static fromString(text) {
    const [name, age] = text.split(",")
    return new User(name, Number(age))
  }
}
User.isAdult(20)
```

记忆：`@staticmethod` ≈ JS 的纯 `static`（不碰类/实例）；`@classmethod` 是 Python 特有，拿得到类本身 `cls`，最常见用途是提供"工厂方法"（如 `User.from_json(data)`）。

---

## 六、魔术方法（dunder）：定制对象的"内置行为"

带双下划线的方法 `__xxx__`（dunder = double underscore）由 Python 在特定时机自动调用，类似 JS 里 `toString()`、`Symbol.iterator`、`valueOf()` 这类"被引擎隐式调用的钩子"。

| 魔术方法 | 何时被调用 | JS 类比 |
|----------|------------|---------|
| `__init__` | `User()` 创建实例时 | `constructor` |
| `__repr__` | 打印/调试时显示 | `toString()`（偏调试） |
| `__str__` | `str(obj)` / `print(obj)` | `toString()`（偏展示） |
| `__eq__` | `a == b` 比较时 | 重写相等逻辑 |
| `__len__` | `len(obj)` 时 | `.length` getter |
| `__getitem__` | `obj[key]` 取值时 | 索引/proxy get |

```python
class Money:
    def __init__(self, amount):
        self.amount = amount    # 存金额(单位:元)

    # __repr__：print 和交互式回显时显示这个，建议给所有类都写一个，方便调试
    def __repr__(self):
        return f"Money({self.amount}元)"

    # __eq__：定义 == 的比较逻辑，只要金额相等就算相等
    def __eq__(self, other):
        return self.amount == other.amount

    # __add__：定义 + 运算符，让两个 Money 能直接相加(运算符重载)
    def __add__(self, other):
        return Money(self.amount + other.amount)

a = Money(10)
b = Money(10)
print(a)            # Money(10元)        ← __repr__
print(a == b)       # True               ← __eq__
print(a + b)        # Money(20元)        ← __add__
```

> 边界提醒：JS **不支持运算符重载**（`a + b` 行为固定）。Python 的 `__add__` 这类能力比 JS 强，但别滥用——只在"语义天然"的地方用（金额、向量、坐标），否则代码会很迷惑。日常 80% 场景你只需要会写 `__init__` 和 `__repr__`。

---

## 七、一个易混淆的小语法：没有 private，用下划线"约定"

Python **没有真正的 private**。访问控制靠命名约定：

```python
class Account:
    def __init__(self):
        self.name = "Tom"       # 公开：随便访问
        self._balance = 100     # 单下划线：约定"内部用"，仅提示，语法上仍可访问
        self.__pin = "1234"     # 双下划线：名称改写(name mangling)，外部较难直接访问
```

- `_balance`：纯君子协定，等于 TS 里加了 `private` 但没编译检查——能访问，只是"你不该访问"。
- `__pin`：会被改名为 `_Account__pin`，算是"防误碰"，但不是安全机制。

新手记住一条：**看到单下划线开头的属性/方法，就当它是内部的，别在外面调。**

---

## 小结

Python 的 OOP 可以直接套用你的 ES6 class 心智模型，但务必记住几处"形似神不似"。

✅ 该掌握
- `class` / `__init__` / 继承 `class Sub(Base)` / `super().__init__()`，结构和 JS 一一对应
- `self` 是显式的第一个参数，访问实例数据一律 `self.xxx`
- 创建对象**不用 `new`**，直接 `User(...)`
- 可变状态放进 `__init__`，至少会写 `__init__` 和 `__repr__`

⚠️ 易混淆
- `self` ≠ `this`：要显式写、但也因此没有 this 丢失问题，不需要 bind
- 写在 `class` 体里的变量是**类属性（全实例共享）**，和 JS 同位置的实例字段含义相反；可变类属性（list/dict）是经典 bug 源
- `super().__init__()` 漏调不报错、只是静默不执行父类构造
- 没有真 private，下划线只是约定

下一篇：08 - 模块与包管理（import / `__init__.py` / pip，对比 node 的 require/package.json）。
