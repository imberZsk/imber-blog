# 第 21 课：Pandas 数据分析

> 你在前端天天和「一坨数据」打交道：后端返回的 `[{name, age}, {name, age}, ...]`，你用 `map` / `filter` / `reduce` 一通处理，再渲染成表格。Pandas 干的就是这件事——只不过它把这个「对象数组」升级成了一张真正的二维表，并内置了 Excel 的「整列运算」和 SQL 的「筛选 / 分组 / 聚合」能力。本篇先用 `array of objects` 给你建立直觉，再立刻划清三处关键边界：**列不是普通数组（是 Series）**、**取行有 loc / iloc 两套语法**、**别用 for 循环遍历（要向量化）**。

## 零、它在生态里的位置

Pandas 建在 NumPy（详见第 20 篇，NumPy ≈ 批量运算的「超级 Array」）之上。一句话分工：

| 层 | 类比 | 干什么 |
|----|------|--------|
| NumPy | 超级 Array（纯数字） | 底层数值计算引擎 |
| Pandas | 加强版 Excel / SQL | 带列名、带索引的二维表，做数据分析 |
| matplotlib | 后端版 ECharts / D3（详见第 22 篇） | 把表画成图 |

安装与导入（约定俗成 `import pandas as pd`，几乎所有教程都这么写，照做即可）：

```bash
pip install pandas   # pandas 会自动把 numpy 一起装上
```

```python
import pandas as pd   # pd：Pandas 的标准别名，社区约定，别自己改名
import numpy as np    # np：NumPy 的标准别名，Pandas 经常和它配合
```

## 一、先给锚点：DataFrame ≈ 你后端拿到的「对象数组」

前端最熟悉的数据形态，就是后端返回的一个对象数组：

```javascript
// JavaScript：一个「对象数组」，每个对象是一行
const users = [
  { name: "Tom", age: 18, city: "上海" },
  { name: "Amy", age: 25, city: "北京" },
  { name: "Bob", age: 30, city: "上海" },
]
```

Pandas 的 `DataFrame` 就是这个东西的「表格化升级版」——同样是一行行记录，但它知道自己有哪些**列**、每行有个**索引（index）**：

```python
# Python：用一个「字典的列表」直接构造 DataFrame，结构和 JS 的对象数组一一对应
users = [
    {"name": "Tom", "age": 18, "city": "上海"},
    {"name": "Amy", "age": 25, "city": "北京"},
    {"name": "Bob", "age": 30, "city": "上海"},
]
df = pd.DataFrame(users)   # df：一张二维表，每个 dict 变成一行，dict 的 key 变成列名
print(df)
#   name  age city
# 0  Tom   18   上海      ← 左边的 0/1/2 是「索引(index)」，DataFrame 自动加的，类似行号
# 1  Amy   25   北京
# 2  Bob   30   上海
```

**核心概念就两个**，先记牢：

| 概念 | 类比 | 说明 |
|------|------|------|
| `DataFrame` | 整张 Excel 表 / SQL 表 | 二维：有行有列 |
| `Series` | 表里的**一列** / 一个带标签的数组 | 一维：`df["age"]` 取出来就是它 |
| `index` | Excel 最左边的行号 | 默认 0,1,2…，也可设成日期、ID 等 |

> 边界一：**取出一列得到的不是 Python list，而是 `Series`**。`df["age"]` 不是 `[18, 25, 30]` 这种普通列表，而是一个带索引、能直接做整列运算的 `Series`（下一节就用到）。别下意识把它当 list 来 `for` 遍历。

## 二、读数据：CSV / Excel 一行搞定

前端读数据靠 `fetch`，Pandas 读数据靠一组 `read_*` 函数，最常用的是 CSV 和 Excel：

```python
# 读 CSV：路径既可以是本地文件，也可以直接是一个 URL
df = pd.read_csv("users.csv")          # df 存放从 csv 读进来的整张表

# 读 Excel（需要额外装 openpyxl：pip install openpyxl）
# sheet_name 指定读哪个工作表，不传默认读第一个
df = pd.read_excel("data.xlsx", sheet_name="Sheet1")

# 写出去同样一行：index=False 表示不把那列行号也写进文件（否则会多出一列 0,1,2…）
df.to_csv("output.csv", index=False)   # 业务场景：清洗完的数据导出给别人用
```

读进来后，**第一件事永远是先「体检」**，这几个方法你会天天用：

```python
df.head()       # 看前 5 行（≈ console.log(arr.slice(0, 5))，快速瞄一眼数据长啥样）
df.tail(3)      # 看后 3 行
df.shape        # (行数, 列数)，比如 (1000, 5)；注意是属性不是方法，不加括号
df.columns      # 所有列名（≈ Object.keys(arr[0])）
df.info()       # 每列的类型 + 非空数量（排查缺失值第一站）
df.describe()   # 数值列的统计摘要：count/mean/std/min/max/分位数（一眼看分布）
```

> 边界二：`df.shape` 这种是**属性**（无括号），`df.head()` 这种是**方法**（有括号）。这俩很容易混。判断标准：要不要「执行一个动作」——取已有的形状信息是属性，让它去算/去取前几行是方法。

## 三、选列与选行：loc / iloc 是新坑

### 3.1 选列：像取对象属性

```python
df["age"]                 # 取一列 → 得到 Series（≈ users.map(u => u.age)，但更强）
df[["name", "age"]]       # 取多列 → 传一个「列名列表」,得到一个新的 DataFrame（注意双层方括号）
```

### 3.2 选行：用 loc / iloc（**这里和 JS 思路不同，重点**）

JS 里取第 0 行你写 `users[0]`。Pandas 里 `df[0]` **会报错或被当成取列**，取行必须用 `loc` / `iloc`：

```python
# iloc：i = integer，按「位置/行号」取，规则和 JS 数组下标一样（从 0 开始）
df.iloc[0]            # 第 1 行（≈ users[0]）
df.iloc[0:3]          # 前 3 行（切片，左闭右开，和 JS slice 一致）

# loc：按「索引标签」取（默认索引是 0,1,2 时看着和 iloc 像，但语义不同）
df.loc[0]             # 索引标签为 0 的那行
df.loc[0:2]           # 注意！loc 切片是「左闭右闭」,取 0、1、2 三行（和 iloc 不一样）

# 取某行某列的单个值：loc[行, 列]
df.loc[0, "name"]     # 第一行的 name
```

| 需求 | JS | Pandas |
|------|----|--------|
| 取一列 | `users.map(u => u.age)` | `df["age"]` |
| 取第 N 行（按位置） | `users[n]` | `df.iloc[n]` |
| 取前 3 行 | `users.slice(0, 3)` | `df.iloc[0:3]`（左闭右开） |
| 按标签取行 | （无直接对应） | `df.loc[label]` |

> 边界三：**`iloc` 切片左闭右开（同 JS），`loc` 切片左闭右闭（多取一个）**。这是 Pandas 最反直觉的点之一。记法：`iloc` 是「位置」走数组那套，`loc` 是「标签」，标签区间天然包含两端。

## 四、筛选：布尔索引 ≈ filter（但写法是新的）

前端筛选用 `arr.filter(条件)`。Pandas 用一种叫**布尔索引**的写法——先算出一列「True/False」，再用它去框选行：

```javascript
// JavaScript
const adults = users.filter(u => u.age >= 18)                       // 单条件
const shAdults = users.filter(u => u.age >= 18 && u.city === "上海")  // 多条件
```

```python
# Python（Pandas）：把条件写在方括号里
adults = df[df["age"] >= 18]   # df["age"] >= 18 先算出一列布尔值,再用它筛出 True 的行

# 多条件：每个条件「必须用圆括号包起来」,且用 & / | 而不是 and / or
sh_adults = df[(df["age"] >= 18) & (df["city"] == "上海")]
```

**两个高频坑，前端 100% 会踩：**

```python
# 坑1：多条件必须用 & | ~（按位运算符）,不能用 Python 的 and / or
#      WHY：and/or 针对单个布尔值,而这里两边是「一整列布尔值」,要逐元素比对,得用 & |
# df[df["age"] >= 18 and df["city"] == "上海"]   # ❌ 直接报 ValueError

# 坑2：每个子条件必须用圆括号括起来
#      WHY：& 的运算优先级比 >= 高,不加括号会先算 18 & df["city"] 导致出错
# df[df["age"] >= 18 & df["city"] == "上海"]     # ❌ 优先级错乱
```

常用的还有 `isin`（≈ JS 的 `includes` 判断）和 `str` 系列（针对字符串列）：

```python
df[df["city"].isin(["上海", "北京"])]      # city 在这个列表里的行（≈ ["上海","北京"].includes(u.city)）
df[df["name"].str.startswith("A")]         # name 以 A 开头；.str 是对整列字符串做操作的入口
```

## 五、整列运算：向量化，别写 for（性能关键边界）

这是 Pandas 最该改掉的 JS 习惯。前端给每个对象加字段，你会 `for` 一遍。Pandas 里**直接对整列运算**，底层走 NumPy 批量处理，又快又短：

```javascript
// JavaScript：循环逐个处理
users.forEach(u => { u.ageNextYear = u.age + 1 })
const names = users.map(u => u.name.toUpperCase())
```

```python
# Python（Pandas）：整列一把梭,不用循环
df["age_next_year"] = df["age"] + 1        # 新增一列 = 旧列整体 +1,自动逐行算
df["name_upper"] = df["name"].str.upper()  # 整列字符串转大写（.str 入口）

# 条件派生新列：np.where(条件, 真值, 假值) ≈ 整列版的三元表达式
df["group"] = np.where(df["age"] >= 18, "成人", "未成年")
```

> 边界四（性能）：**能向量化就别 for**。`for i in range(len(df)): df.loc[i, ...]` 这种逐行循环在 Pandas 里又慢又难读，几万行就明显卡。心智转变：从「遍历每个元素」改成「对整列下达一条指令」——这正是 NumPy/Pandas 的灵魂。真要逐行处理逻辑时用 `df.apply(函数)`，但优先找向量化写法。

## 六、分组聚合：groupby ≈ SQL 的 GROUP BY

这是 DataFrame「像 SQL」的部分。需求：按城市分组，算每个城市的平均年龄、人数。SQL 你会写，对照看 Pandas：

```sql
-- SQL
SELECT city, AVG(age) AS avg_age, COUNT(*) AS cnt
FROM users
GROUP BY city;
```

```python
# Pandas：groupby("分组列") 后接聚合函数,思路和 SQL 一模一样
result = df.groupby("city")["age"].mean()   # 按 city 分组,对 age 求平均 → 得到一个 Series

# 一次算多个指标：用 agg 传一个字典,key 是列名,value 是要算的聚合方式
result = df.groupby("city").agg(
    avg_age=("age", "mean"),   # 新列 avg_age = age 列求平均
    count=("name", "count"),   # 新列 count  = name 列计数（即每组人数）
)
```

常用聚合函数和 SQL 一一对应：`mean()` / `sum()` / `count()` / `max()` / `min()` / `median()`。

`value_counts()` 是个超高频快捷方式——统计某列每个值出现多少次（≈ `GROUP BY x COUNT(*)` 再排序）：

```python
df["city"].value_counts()    # 各城市分别有多少行,自动按数量从多到少排好
# 上海    2
# 北京    1
```

## 七、缺失值处理：真实数据一定有 NaN

读进来的真实数据，几乎必然有空值。Pandas 用 `NaN`（Not a Number）表示缺失，**约等于 JS 的 `null` / `undefined`**，但判空方式不同：

```python
df.isnull()           # 返回整张「是否为空」的布尔表
df.isnull().sum()     # 每列有多少个空值（排查数据质量第一句话）

# 删除：把含空值的行丢掉
df_clean = df.dropna()                  # 任意列为空就删整行
df_clean = df.dropna(subset=["age"])    # 只看 age 列,age 为空才删

# 填充：用一个值补上（业务场景：年龄缺失就用平均值兜底,避免后续计算被 NaN 污染）
df["age"] = df["age"].fillna(df["age"].mean())
```

> 边界五：**判断空值不能用 `== None` 或 `== NaN`**。`NaN == NaN` 结果竟然是 `False`（IEEE 浮点规定，NaN 不等于任何值，包括它自己）。所以必须用 `df["x"].isnull()` / `.notnull()` 来判空，不要手写等号比较。

## 八、串起来：一个最小数据分析流程

把前面的拼成你真实会写的样子——读数据 → 清洗 → 派生 → 分组 → 导出：

```python
import pandas as pd

# 1. 读：从 CSV 加载原始订单数据
df = pd.read_csv("orders.csv")    # df 存放原始订单表,假设有列 user/amount/city

# 2. 体检：先看看数据质量,有没有缺失
print(df.shape)            # 多少行多少列
print(df.isnull().sum())   # 各列缺失情况

# 3. 清洗：丢掉金额为空的脏数据
df = df.dropna(subset=["amount"])   # amount 为空的订单无效,删掉

# 4. 筛选：只分析金额大于 0 的有效订单
df = df[df["amount"] > 0]

# 5. 派生：加一列「是否大额订单」,业务上 >= 1000 算大额
df["is_big"] = df["amount"] >= 1000

# 6. 分组聚合：按城市算总销售额和订单数
report = df.groupby("city").agg(
    total_amount=("amount", "sum"),   # 该城市总销售额
    order_count=("amount", "count"),  # 该城市订单数
).sort_values("total_amount", ascending=False)   # 按销售额从高到低排序

# 7. 导出：把分析结果写成新文件交付
report.to_csv("city_report.csv")   # 这里保留 index,因为 city 就是我们要的标签
print(report)
```

这套流程就是阶段四的核心肌肉记忆：**读 → 看 → 洗 → 算 → 出**。出图的部分交给下一篇 matplotlib（第 22 篇，后端版 ECharts/D3）。

## 九、和前端思维的速查对照

| 操作 | JavaScript（对象数组） | Pandas |
|------|----------------------|--------|
| 数据形态 | `[{...}, {...}]` | `DataFrame` |
| 一列数据 | `arr.map(o => o.x)` | `df["x"]`（是 Series） |
| 行数 | `arr.length` | `df.shape[0]` / `len(df)` |
| 取第 N 行 | `arr[n]` | `df.iloc[n]` |
| 筛选 | `arr.filter(o => o.x > 1)` | `df[df["x"] > 1]` |
| 多条件筛选 | `&&` / `\|\|` | `&` / `\|`（每段加圆括号） |
| 新增/派生列 | `forEach` 里赋值 | `df["new"] = df["x"] + 1`（整列） |
| 映射转换 | `arr.map(...)` | 整列运算 / `df["x"].apply(fn)` |
| 包含判断 | `[...].includes(o.x)` | `df["x"].isin([...])` |
| 分组统计 | `reduce` 手撸 | `df.groupby("x").agg(...)` |
| 计数 | 手动累加 | `df["x"].value_counts()` |
| 判空 | `o.x == null` | `df["x"].isnull()`（不能用 ==） |
| 排序 | `arr.sort((a,b)=>...)` | `df.sort_values("x")` |

## 小结

DataFrame 就是你天天用的「对象数组」长出了 Excel 的整列运算和 SQL 的分组聚合能力。把 `map/filter/reduce` 的肌肉记忆平移过来，再吃掉 loc/iloc 和向量化这两个新坑，日常分析就够用了。

✅ **该掌握**
- `pd.DataFrame(对象数组)` 构造表；`read_csv` / `to_csv` 读写；`head()` / `info()` / `describe()` 体检。
- 选列 `df["x"]`（得 Series）；选行 `df.iloc[位置]` / `df.loc[标签]`。
- 筛选用布尔索引 `df[条件]`；派生列直接整列运算 `df["new"] = ...`。
- 分组聚合 `df.groupby("x").agg(...)`（就是 SQL 的 GROUP BY）；`value_counts()` 快速计数。
- 缺失值用 `isnull()` / `dropna()` / `fillna()` 处理。

⚠️ **易混淆（前端最容易栽的坑）**
- **取列得到的是 `Series`，不是 list**：别下意识当普通数组遍历，优先整列运算。
- **取行必须 `loc` / `iloc`**：`df[0]` 不是取第一行；且 `iloc` 切片左闭右开、`loc` 切片左闭右闭。
- **多条件筛选用 `&` / `\|` 且每段加圆括号**，不能用 `and` / `or`。
- **能向量化就别写 for**：从「遍历元素」转向「对整列下指令」，几万行的性能差距巨大。
- **判空用 `.isnull()`，不能用 `== NaN`**：因为 `NaN == NaN` 恒为 `False`。
- `df.shape` 是属性（无括号），`df.head()` 是方法（有括号），别搞混。
