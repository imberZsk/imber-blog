# 第 10 课：装饰器与高阶函数

> 你在 Angular/TS 里写过 `@Component`，在 React 里写过 `withRouter(Comp)` 这种高阶组件——那你已经会装饰器了，只是换了门语言。本篇解决三个问题：Python 的 `@xxx` 到底是什么（先用你眼熟的 `@Component` 锚一下）、它背后"包一层函数"的机制怎么运转、以及它和 JS 装饰器哪里不一样（别踩"装饰器在定义时就执行了"这个坑）。

## 一、先建立前端锚点

第一眼，Python 装饰器和 TS/Angular 的装饰器长得**一模一样**：

```typescript
// TS / Angular：@ 开头，贴在类/方法上面
@Component({ selector: 'app-user' })
export class UserComponent {}
```

```python
# Python：@ 开头，贴在函数/类上面，长相几乎复制粘贴
@app.get("/users")          # FastAPI 路由，@xxx 贴在函数上
def list_users():
    return []
```

但"长得像"只是第一层。装饰器的**机制**更接近你写过的 React 高阶组件（HOC）：

```javascript
// React HOC：传入一个组件，返回一个被"增强过"的新组件
const EnhancedComp = withLogger(MyComponent)
```

```python
# Python 装饰器：传入一个函数，返回一个被"增强过"的新函数
enhanced = with_logger(my_func)   # @with_logger 就是这行的语法糖
```

一句话切入点：**装饰器 = 一个"函数进、函数出"的高阶函数 + `@` 语法糖**。先讲清"函数能当值传"这件事，装饰器就顺理成章了。

| JS / TS | Python | 说明 |
|---------|--------|------|
| `const f = () => {}` 然后 `g(f)` | `def f(): ...` 然后 `g(f)` | 函数当值传 |
| `withLogger(Comp)` | `with_logger(func)` | 函数进函数出 |
| `@Component({...})` | `@app.get("/x")` | `@` 语法糖 |
| TS 装饰器收 `(target, key, descriptor)` | 装饰器收"被装饰的函数本身" | 入参不同（见第五节） |

---

## 二、地基：函数是"一等公民"

装饰器能成立，全靠 Python（和 JS 一样）把函数当成普通值——能赋值、能传参、能从函数里返回。这点你在 JS 里早就习惯了：

```javascript
function greet(name) { return `hi ${name}` }
const fn = greet          // 函数赋值给变量
;[1, 2].map(greet)        // 函数当参数传
```

Python 逐字对应：

```python
# greet：最简单的问候函数，name 是要问候的名字
def greet(name):
    return f"hi {name}"        # f-string，等价 JS 模板字符串 `hi ${name}`

fn = greet                     # fn：指向同一个函数对象（注意没有括号，加括号就是调用了）
print(fn("tom"))               # 通过新变量调用，输出 hi tom
print(list(map(greet, ["a", "b"])))  # 函数当参数传给 map
```

关键：`greet` 不带括号是"函数这个对象本身"，`greet()` 带括号才是"调用它拿返回值"。**这一点是后面所有装饰器代码的阅读基础**。

### 高阶函数：吃函数 / 吐函数

"高阶函数"就是参数或返回值里有函数的函数。返回函数这点最关键，因为装饰器就靠它：

```python
# make_multiplier：工厂函数，返回一个"乘以 factor"的新函数
# factor：倍数，被内层函数通过闭包记住
def make_multiplier(factor):
    # inner：真正干活的函数，x 是待乘的数；它"记住"了外层的 factor（闭包）
    def inner(x):
        return x * factor
    return inner               # 返回函数本身，不是调用结果

double = make_multiplier(2)    # double：一个"乘 2"的函数
print(double(10))              # 20
```

```javascript
// JS 完全同款闭包
const makeMultiplier = (factor) => (x) => x * factor
const double = makeMultiplier(2)
double(10)   // 20
```

闭包（内层函数记住外层变量）你在 JS 里天天用，Python 的规则一致。**装饰器 = 高阶函数 + 闭包 + `@` 语法糖**，三者你都见过。

---

## 三、第一个装饰器：手写一遍就懂

需求：给任意函数加一层"执行前后打日志"，但不改函数本身代码。这正是 HOC / 中间件的经典场景。

```python
import functools

# log_calls：装饰器。接收"被装饰的函数 func"，返回一个增强过的新函数
# func：被包裹的原函数（比如下面的 add）
def log_calls(func):
    # functools.wraps：把原函数的名字/文档等元信息拷到 wrapper 上
    # WHY：不加的话 add.__name__ 会变成 "wrapper"，调试和框架反射会出错
    @functools.wraps(func)
    # wrapper：真正替代原函数对外的那层壳
    # *args / **kwargs：原样接住任意位置参数和关键字参数，再透传给 func
    def wrapper(*args, **kwargs):
        print(f"调用 {func.__name__}，参数={args} {kwargs}")  # 调用前：打日志
        result = func(*args, **kwargs)                        # result：原函数的真实返回值
        print(f"{func.__name__} 返回 {result}")               # 调用后：打日志
        return result                                          # 把结果原样还回去，别吞了
    return wrapper             # 返回这层壳，它将取代 add

# @log_calls 等价于：add = log_calls(add)
@log_calls
def add(a, b):                 # a, b：两个待相加的数
    return a + b

add(2, 3)
# 输出：
# 调用 add，参数=(2, 3) {}
# add 返回 5
```

并排看 JS 里你会怎么手写同样的"包一层"：

```javascript
// 没有 @ 语法糖时，HOC 就是手动包
function logCalls(func) {
  return function (...args) {           // ...args ≈ Python 的 *args
    console.log(`调用 ${func.name}`, args)
    const result = func(...args)
    console.log(`${func.name} 返回`, result)
    return result
  }
}
const add = logCalls((a, b) => a + b)   // 手动赋值回去
```

看懂这段，装饰器你就过关了 80%。`@log_calls` 这行所做的，**只是把 `add = log_calls(add)` 写得更好看**。

### `*args` 和 `**kwargs` 一定要讲清

装饰器要能套在"任意函数"上，所以 wrapper 必须接住任意参数再透传。这两个语法对标 JS 的剩余/展开：

| JS | Python | 含义 |
|----|--------|------|
| `function f(...args)` | `def f(*args)` | 收集所有位置参数成一个序列 |
| `f(...arr)` | `f(*arr)` | 把序列展开成多个位置参数 |
| （无直接对应） | `def f(**kwargs)` | 收集所有 `key=value` 关键字参数成 dict |
| `f({...obj})` 近似 | `f(**d)` | 把 dict 展开成关键字参数 |

所以 `def wrapper(*args, **kwargs): func(*args, **kwargs)` 的意思就是：**不管你怎么调，我都原样接住、原样转发**。

---

## 四、带参数的装饰器：再包一层

你见过 `@app.get("/users")`、`@retry(times=3)` 这种"装饰器自己还带括号传参"的写法。它比普通装饰器**多嵌套一层**：最外层先吃配置参数，返回真正的装饰器。

```python
import functools

# repeat：带参数的装饰器工厂。times 是"重复执行几次"的配置
# 调用链：repeat(times) -> 返回 decorator -> decorator(func) -> 返回 wrapper
def repeat(times):
    # decorator：真正的装饰器，func 是被装饰的函数
    def decorator(func):
        @functools.wraps(func)
        # wrapper：执行 func 共 times 次，保留最后一次的返回值
        def wrapper(*args, **kwargs):
            result = None                  # result：存最后一次调用的返回值
            for _ in range(times):         # 业务场景：重复跑 times 次（如重试/压测）
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator

# @repeat(3) 等价于：say = repeat(3)(say)  —— 注意是连续两次调用
@repeat(3)
def say(msg):                  # msg：要打印的内容
    print(msg)

say("hi")    # 打印三次 hi
```

记忆法：**带括号的装饰器 = 三层函数**（配置层 → 装饰器层 → wrapper 层）。和 React 里 `connect(mapState)(Comp)` 那种"先配置、再返回 HOC、再包组件"的两步调用一模一样：

```javascript
// react-redux 的 connect：connect(配置) 先返回一个 HOC，再用它包组件
const EnhancedComp = connect(mapStateToProps)(MyComponent)
//                    └─ 第一层吃配置 ─┘└─ 第二层吃组件 ─┘
```

---

## 五、边界：和 JS 装饰器哪里不一样

类比建立了直觉，但必须立刻划清差异，否则会用 JS/TS 心智踩坑：

1. **执行时机：Python 装饰器在"函数定义时"就运行，不是调用时。** 这是最大的坑。`@log_calls` 那行在模块加载、`def add` 被定义的瞬间就执行了一次（`add = log_calls(add)`），而不是等你 `add(2,3)` 才执行。所以装饰器里写有副作用的代码（比如注册路由、打印）会在 import 阶段就发生。

   ```python
   # announce：只在"装饰时"打印、不改变原函数的装饰器，用来演示装饰发生在定义阶段
   # func：被装饰的函数
   def announce(func):
       print(f"装饰器正在装饰 {func.__name__}")  # 这行在 import 时就打印，不等调用
       return func

   @announce
   def hello(): ...           # hello：一个空函数占位，仅用于触发上面的装饰过程
   # 仅仅 import 这个模块，就会立刻看到 "装饰器正在装饰 hello"
   ```

2. **入参不同。** TS 的方法装饰器签名是 `(target, propertyKey, descriptor)` 这套"反射式三件套"；Python 装饰器朴素得多——**收到的就是被装饰的函数（或类）本身**，你自己决定怎么包。没有 descriptor 那层抽象。

3. **TS 装饰器曾长期是实验特性、依赖编译；Python 装饰器是语言原生、运行时直接生效。** 不用配 `experimentalDecorators`，不用 Babel 插件，写了就能跑。

4. **别忘了 `functools.wraps`。** JS 里函数 `name` 丢了通常无所谓，但 Python 框架（FastAPI/pytest 等）大量靠 `__name__`、签名做反射，漏写 `@functools.wraps(func)` 会导致名字变成 `wrapper`、文档丢失，甚至路由/测试发现失败。**写装饰器就顺手加上，别问，加就对了。**

5. **装饰的是方法时，第一个参数是 `self` 不是 `this`。** wrapper 的 `*args` 会把 `self` 一并接住透传，无需特殊处理，但你得知道 `args[0]` 可能就是实例本身。

---

## 六、标准库里你天天会遇到的装饰器

不用全自己写，Python 内置和标准库给了一批高频装饰器，先认脸：

```python
import functools

class Circle:
    # __init__：构造方法，radius 是半径
    def __init__(self, radius):
        self._radius = radius          # _radius：内部存的半径，下划线表示"约定私有"

    @property
    # area：用 @property 把方法伪装成"只读属性"，访问时不用加括号
    # 类比：JS class 里的 get area() {}
    def area(self):
        return 3.14159 * self._radius ** 2   # ** 是幂运算，半径平方

    @staticmethod
    # describe：静态方法，不需要 self，类比 JS 的 static 方法
    def describe():
        return "我是一个圆"

    @classmethod
    # from_diameter：类方法，第一个参数是类本身 cls（不是实例）
    # diameter：直径，用它换算半径再造对象；类比"工厂构造器"
    def from_diameter(cls, diameter):
        return cls(diameter / 2)       # cls 就是 Circle，等价 new Circle(...)

c = Circle(2)
print(c.area)                  # 12.56636 —— 注意没有括号，@property 让它像字段
print(Circle.from_diameter(10).area)  # 用类方法造对象再取面积
```

| 装饰器 | 作用 | JS / TS 类比 |
|--------|------|--------------|
| `@property` | 方法伪装成只读属性 | `get xxx()` |
| `@staticmethod` | 静态方法，无 `self` | `static method()` |
| `@classmethod` | 类方法，首参是 `cls` | `static` + 工厂方法 |
| `@functools.wraps` | 保留被包函数的元信息 | 手动拷 `fn.name` |
| `@functools.lru_cache` | 自动缓存函数结果（记忆化） | 手写 memoize / `useMemo` 思路 |

`@functools.lru_cache` 很实用，等于免费给你一个记忆化缓存：

```python
import functools

# @functools.lru_cache：自动缓存结果，相同入参第二次直接返回缓存，不重复计算
# maxsize：最多缓存多少组结果，None 表示不限
@functools.lru_cache(maxsize=None)
def fib(n):                    # n：要算第几个斐波那契数
    if n < 2:                  # 边界：0 和 1 直接返回自身
        return n
    return fib(n - 1) + fib(n - 2)

print(fib(50))   # 瞬间出结果；没缓存的话这是指数级递归会很慢
```

---

## 七、一个贴近实战的例子：计时装饰器

把本篇串起来，写一个能套在任意函数上的"执行耗时统计"，这是后端排查性能时的常用小工具：

```python
import functools
import time

# timeit：测量被装饰函数的执行耗时并打印
# func：被测量的目标函数
def timeit(func):
    @functools.wraps(func)     # 保留原函数名，否则日志里全是 wrapper
    def wrapper(*args, **kwargs):
        start = time.perf_counter()        # start：开始时刻；perf_counter 是高精度计时器
        result = func(*args, **kwargs)     # result：原函数真实返回值
        cost_ms = (time.perf_counter() - start) * 1000  # cost_ms：耗时（毫秒）
        print(f"{func.__name__} 耗时 {cost_ms:.2f}ms")
        return result          # 透传返回值，调用方无感知
    return wrapper

@timeit
def heavy_sum(n):              # n：累加上界
    return sum(range(n))       # 业务：算 0..n-1 的和，模拟一段耗时计算

heavy_sum(1_000_000)           # 数字里的下划线只是分隔符，便于读，等于 1000000
# 输出类似：heavy_sum 耗时 12.34ms
```

注意它的通用性：因为用了 `*args/**kwargs` 透传 + `@functools.wraps`，这个 `@timeit` 可以原样套到项目里任何函数上，完全不碰被测函数的代码——这正是装饰器（以及它对标的 HOC / 中间件）的核心价值：**横切关注点（日志、计时、缓存、鉴权）和业务逻辑分离**。

---

## 小结

装饰器本质是"函数进、函数出"的高阶函数，`@xxx` 只是 `func = xxx(func)` 的语法糖。它长得像 TS 的 `@Component`，机制像 React 的 HOC：包一层壳，在不改原函数的前提下加增强。带参数的装饰器多嵌一层（配置 → 装饰器 → wrapper）。写 wrapper 用 `*args/**kwargs` 透传参数，并务必加 `@functools.wraps` 保留元信息。

✅ 该掌握
- 函数是一等公民：不带括号是对象本身，带括号才是调用
- `@deco` ≡ `func = deco(func)`；带参数的 `@deco(x)` ≡ `func = deco(x)(func)`
- wrapper 用 `*args, **kwargs` 原样接住并透传参数
- 写装饰器固定加 `@functools.wraps(func)`
- 认脸标准库：`@property` / `@staticmethod` / `@classmethod` / `@lru_cache`

⚠️ 易混淆
- 装饰器在**函数定义时**就执行一次，不是调用时（最大的坑）
- Python 装饰器收到的是"函数本身"，不是 TS 那套 `(target, key, descriptor)`
- 漏写 `@functools.wraps` 会让 `__name__` 变成 `wrapper`，框架反射/测试发现会出错
- `@property` 修饰后访问不加括号（`c.area` 而非 `c.area()`）
- 装饰方法时第一个参数是 `self`，不是 JS 的 `this`（详见第 07 篇面向对象）

下一篇：进入 async/await，强调它和 JS 单线程事件循环高度相似。

