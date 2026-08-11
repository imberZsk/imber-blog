# 第 06 课：列表推导式与生成器

> 你在 JS 里写惯了 `arr.map().filter()`，到了 Python 会发现大家很少这么链式写，而是用一种叫"列表推导式"的语法糖。本篇解决两个问题：怎么用比 `map/filter` 更地道的方式处理集合；以及当数据量大到不想一次性装进内存时，怎么用 `yield` 做"惰性流"。后者直接对标你见过的 `function*`。

## 一、先建立前端锚点

| 你在 JS 里这么做 | Python 地道写法 | 类别 |
|------------------|-----------------|------|
| `arr.map(x => x * 2)` | `[x * 2 for x in arr]` | 列表推导式 |
| `arr.filter(x => x > 0)` | `[x for x in arr if x > 0]` | 带条件的推导式 |
| `function* gen() { yield 1 }` | `def gen(): yield 1` | 生成器 |
| `for (const v of iterable)` | `for v in iterable` | 迭代 |

核心切入点：**列表推导式 ≈ map/filter 的合体语法糖，生成器 ≈ JS 的 `function*` 一对一映射**。下面分别讲透。

---

## 二、列表推导式：map + filter 的合体

### 2.1 最基础：等价于 map

```python
nums = [1, 2, 3, 4]            # nums：原始数字列表
# 把每个元素翻倍。语法读法：[表达式 for 变量 in 可迭代对象]
doubled = [x * 2 for x in nums]  # doubled：翻倍后的新列表 [2, 4, 6, 8]
```

并排看 JS：

```javascript
const nums = [1, 2, 3, 4]
const doubled = nums.map(x => x * 2)   // [2, 4, 6, 8]
```

读法对照：把 `nums.map(x => x * 2)` 拆成三段——`x * 2`（要算什么）、`x`（每个元素叫什么）、`nums`（从哪来），重新排成 `[x * 2 for x in nums]` 就是 Python 写法。

### 2.2 加条件：等价于 filter

```python
nums = [1, 2, 3, 4, 5, 6]      # nums：原始数字列表
# 末尾的 if 是过滤条件，只保留偶数。读法：[表达式 for 变量 in 源 if 条件]
evens = [x for x in nums if x % 2 == 0]  # evens：所有偶数 [2, 4, 6]
```

```javascript
const nums = [1, 2, 3, 4, 5, 6]
const evens = nums.filter(x => x % 2 === 0)   // [2, 4, 6]
```

### 2.3 map + filter 一次写完

JS 里 map 和 filter 要链两次，Python 一个推导式搞定：

```python
nums = [1, 2, 3, 4, 5, 6]      # nums：原始数字列表
# 先 if 过滤偶数，再对留下的元素 *10。前面是 map 部分，后面是 filter 部分
result = [x * 10 for x in nums if x % 2 == 0]  # result：[20, 40, 60]
```

```javascript
const nums = [1, 2, 3, 4, 5, 6]
const result = nums.filter(x => x % 2 === 0).map(x => x * 10)  // [20, 40, 60]
```

注意顺序：Python 推导式里 `for...if` 在后、要算的表达式在前，和阅读习惯相反，但写多了就顺手了。

### 2.4 字典推导式 / 集合推导式

把方括号换成花括号，就能直接生成 dict 或 set：

```python
names = ["tom", "jerry"]       # names：名字列表
# 字典推导式：key: value 用冒号分隔，生成 {名字: 长度}
name_len = {n: len(n) for n in names}  # name_len：{'tom': 3, 'jerry': 5}

# 集合推导式：自动去重，类比 new Set(...)
unique_lens = {len(n) for n in names}  # unique_lens：{3, 5}
```

JS 没有等价语法糖，得手动 reduce 或 `Object.fromEntries`：

```javascript
const names = ["tom", "jerry"]
const nameLen = Object.fromEntries(names.map(n => [n, n.length]))  // {tom:3, jerry:5}
```

---

## 三、边界：哪里和 JS 不一样

类比建立了直觉，但必须立刻划清差异，别过度套用 JS 心智：

1. **没有 `[].map` 的链式语法主流地位**。Python 也有 `map()`/`filter()` 内置函数，但它们返回的是"惰性迭代器"而非列表，且社区公认推导式更可读。能用推导式就别用 `map/filter`。

2. **推导式里的变量不泄漏到外层**（Python 3 起）。下面的 `x` 不会污染外部作用域，这点和 JS 的 `let` 块级作用域一致，但和 Python 普通 `for` 循环不同——普通 `for` 的循环变量会留在外面。

   ```python
   squares = [x * x for x in range(3)]  # squares：[0, 1, 4]
   # print(x)  # ❌ NameError，推导式里的 x 在外面不存在
   ```

3. **别为了炫技写嵌套三层推导式**。可读性崩了就老老实实用普通 `for`。推导式适合"一行能说清"的转换。

4. **`range(n)` 不是数组**，是惰性的范围对象。`[i for i in range(3)]` 才得到列表 `[0,1,2]`。它类似 JS 里没有的"惰性 0..n 序列"。

---

## 四、生成器：yield 一对一对标 function*

### 4.1 心智模型直接搬 JS

你在 JS 里见过这个吗？

```javascript
function* countUp() {
  yield 1          // 暂停在这，把 1 交出去
  yield 2
  yield 3
}
const it = countUp()
it.next().value    // 1，每次 next 才往下走一步
```

Python 几乎逐字对应，只是去掉了 `*`，函数体里出现 `yield` 它就自动成为生成器：

```python
# countUp：生成器函数。函数体含 yield，调用时不立刻执行，返回一个生成器对象
def count_up():
    yield 1   # 执行到这里暂停，把 1 交出去；下次被请求时从这继续
    yield 2
    yield 3

it = count_up()   # it：生成器对象，此刻函数体一行都还没跑
next(it)          # 1，调用 next 才推进一步（≈ JS 的 it.next().value）
```

对照表：

| JS | Python |
|------|--------|
| `function* g() {}` | `def g(): ...`（函数内含 yield） |
| `yield v` | `yield v` |
| `it.next().value` | `next(it)` |
| `for (const v of g())` | `for v in g()` |
| 迭代结束 `done: true` | 抛出 `StopIteration`（`for` 会自动处理） |

### 4.2 为什么要用它：惰性 + 省内存

普通函数是"一次性把结果全做完返回"，生成器是"要一个给一个"。处理大数据时差别巨大：

```python
# read_big_lines：逐行读大文件（path：要读取的文件路径）。用 yield 而非一次性 readlines()，避免把整个文件塞进内存
def read_big_lines(path):
    # 用 with 确保文件句柄自动关闭（详见后续文件 IO 篇）
    with open(path, encoding="utf-8") as f:
        for line in f:        # 文件对象本身就是惰性迭代器，一行一行来
            yield line.strip()  # 交出去一行处理完，再回来读下一行

# 用起来和普通可迭代对象没区别，但内存里同时只有一行
for line in read_big_lines("huge.log"):  # line：当前这一行文本
    if "ERROR" in line:                  # 业务场景：只挑出报错行
        print(line)
```

如果用列表，`["..." for line in ...]` 会把几百万行全装进内存；生成器则是流式的，内存占用恒定。这正是 `function*` 在 JS 里处理无限/超大序列的同款理由。

### 4.3 生成器表达式：推导式的惰性版

把列表推导式的方括号 `[]` 换成圆括号 `()`，就从"立刻算出整个列表"变成"惰性生成器"：

```python
nums = range(1000000)          # nums：一百万个数字的惰性范围

# 方括号：立刻算出并占用一百万个元素的内存
sum_list = sum([x * x for x in nums])

# 圆括号：生成器表达式，一次只产出一个，内存恒定。大数据求和首选
sum_gen = sum(x * x for x in nums)   # 注意 sum(...) 里直接写，括号可省一层
```

经验法则：**只是要遍历/聚合一次就用生成器表达式 `()`；需要反复访问、索引、求长度才用列表 `[]`**。

---

## 五、最容易踩的坑

1. **生成器只能消费一次**。遍历完就空了，不像列表能反复 for。这是新手最常见的崩溃点。

   ```python
   gen = (x for x in range(3))   # gen：生成器对象
   list(gen)   # [0, 1, 2]，第一次消费
   list(gen)   # []  ❌ 已被掏空，第二次什么都没有
   ```

   对照 JS 的 generator 也是同样行为——迭代器一旦走完就 `done`。需要复用就转成列表存起来。

2. **想要列表却写成了生成器**。`(x for x in nums)` 不是元组，是生成器；`print` 它会看到 `<generator object ...>` 而不是内容。要列表请用 `[]`，或外面包 `list(...)`。

3. **推导式里调用有副作用的函数**。推导式应当是"纯转换"。如果你在里面 `print` 或改外部状态，说明该用普通 `for`。

4. **超大数据还用列表推导式**。这会瞬间吃满内存。判断标准：源数据大 + 只遍历一次 → 用生成器表达式 `()` 或 `yield`。

---

## 六、综合示例：读日志统计错误

把本篇知识串起来，写一个流式统计：

```python
# parse_errors：从日志行流里挑出错误行并提取关键字段（lines：可迭代的日志行来源），全程惰性不占内存
def parse_errors(lines):
    for line in lines:              # line：当前日志行
        # 业务场景：只处理包含 ERROR 的行，其余跳过
        if "ERROR" in line:
            yield line.split("] ")[-1]  # 交出 "] " 之后的错误正文

# logs：惰性的日志行来源（这里用列表模拟，真实场景是读文件的生成器）
logs = [
    "[INFO] started",
    "[ERROR] db timeout",
    "[ERROR] null pointer",
]

# error_msgs：调用生成器函数得到的生成器对象，此刻一行都还没处理，依然惰性
error_msgs = parse_errors(logs)

# 最终用列表推导式把结果固化下来（要反复用，所以转成列表）
result = [msg.upper() for msg in error_msgs]  # result：['DB TIMEOUT', 'NULL POINTER']
print(result)
```

---

## 小结

列表推导式是 `map/filter` 的合体语法糖，写法是 `[表达式 for 变量 in 源 if 条件]`；把 `[]` 换成 `{}` 得到 dict/set 推导式，换成 `()` 得到惰性生成器表达式。生成器用 `yield`，和 JS 的 `function*` 一对一对应，核心价值是惰性求值、省内存、能表达无限/超大序列。

✅ 该掌握
- 用推导式替代 `map/filter`，一行写完 map+filter
- `[]` 立刻求值得列表，`()` 惰性得生成器，`{}` 得 dict/set
- `yield` = JS 的 `function*`，`next(it)` / `for v in g()` 取值
- 大数据、只遍历一次 → 优先生成器

⚠️ 易混淆
- 生成器只能消费一次，遍历完即空（不像列表可复用）
- `(x for x in xs)` 是生成器不是元组
- 推导式的循环变量不泄漏到外层，但普通 `for` 的会
- 推导式里 `for...if` 顺序在后，和阅读直觉相反

下一篇：装饰器（对标 TS 的 `@Component`）
