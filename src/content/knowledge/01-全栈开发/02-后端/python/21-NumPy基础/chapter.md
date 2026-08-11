# Python（20）- NumPy 基础

> 你在前端处理数据，遇到一组数字想整体翻倍、求和、归一化，第一反应是 `arr.map(...)` / `arr.reduce(...)`，逐个元素地循环。到了数据处理和 AI 这一阶段，数据量从几十条变成几十万行 × 上百列，逐个 for 循环会慢到无法接受。本篇解决一个核心问题：**怎么把"对一堆数字逐个操作"变成"对整个数组一次性操作"**——这就是 NumPy 的全部价值，也是后面 Pandas、向量、Embedding、机器学习的共同地基。

# 一、先建立前端锚点

一句话切入：**NumPy 的 `ndarray` ≈ 一个开了挂的「超级 Array」**。它最大的不同是——你不再写循环，而是把运算直接作用在整个数组上（这叫"向量化"）。

| 你在 JS 里这么做 | NumPy 地道写法 | 说明 |
|------------------|----------------|------|
| `arr.map(x => x * 2)` | `arr * 2` | 整个数组一次性翻倍，不写循环 |
| `arr.map((x, i) => x + b[i])` | `arr + b` | 两个数组逐位相加 |
| `arr.reduce((a, b) => a + b, 0)` | `arr.sum()` | 求和 |
| `arr.filter(x => x > 0)` | `arr[arr > 0]` | 布尔筛选 |
| `Math.sqrt` 配 `map` 逐个开方 | `np.sqrt(arr)` | 整个数组开方 |
| `new Array(5).fill(0)` | `np.zeros(5)` | 创建全 0 数组 |

记住这个心智图：**凡是你想写 `for` / `map` 逐个处理数字的地方，NumPy 让你直接对数组本身运算。** 这就是"向量化"，它既好写，又因为底层是 C 实现而快上几十倍。

---

# 二、安装与第一个数组

NumPy 是第三方库，不在标准库里，先装（建议在虚拟环境里，详见第 12 篇）：

```bash
pip install numpy
```

约定俗成的导入别名是 `np`，几乎所有教程都这么写，照做即可：

```python
import numpy as np   # np：NumPy 的标准别名，社区惯例，不要乱改

# np.array：把一个 Python 列表转成 ndarray（NumPy 的核心数据结构）
arr = np.array([1, 2, 3, 4])   # arr：一维数组，内容 [1 2 3 4]

print(arr)          # [1 2 3 4]，注意打印时元素之间没有逗号
print(type(arr))    # <class 'numpy.ndarray'>
```

对照 JS——JS 里数组就是数组，没有"转换"这一步：

```javascript
const arr = [1, 2, 3, 4]   // 普通 JS 数组
```

为什么 Python 要多包一层 `np.array`？因为普通 Python `list` 和 JS 数组一样是"通用容器"，不为数学运算优化；`np.array` 才是那个"超级 Array"，下面的所有能力都建立在它之上。

---

# 三、核心干货一：向量化运算（不写循环）

这是 NumPy 的灵魂。先看痛点——纯 Python 给一组数字整体翻倍要写循环：

```python
nums = [1, 2, 3, 4]                  # nums：普通 Python 列表
doubled = [x * 2 for x in nums]      # 必须逐个遍历，doubled：[2, 4, 6, 8]
```

NumPy 直接对数组运算，没有循环：

```python
arr = np.array([1, 2, 3, 4])   # arr：一维数组
doubled = arr * 2              # doubled：[2 4 6 8]，整个数组一次性翻倍
```

并排看 JS，能看出 NumPy 写法更接近"数学公式"而非"遍历逻辑"：

```javascript
const arr = [1, 2, 3, 4]
const doubled = arr.map(x => x * 2)   // JS 必须显式 map 逐个处理
```

两个数组之间也能逐位运算（前提是形状匹配）：

```python
a = np.array([1, 2, 3])        # a：数组
b = np.array([10, 20, 30])     # b：数组
print(a + b)    # [11 22 33]，逐位相加
print(a * b)    # [10 40 90]，逐位相乘（不是矩阵乘法！只是对应位置相乘）
```

对照 JS——你得手动 map 配下标，啰嗦且易错：

```javascript
const a = [1, 2, 3]
const b = [10, 20, 30]
const sum = a.map((x, i) => x + b[i])   // [11, 22, 33]
```

> ⚠️ 关键边界：`a * b` 在 NumPy 里是"逐位相乘"，**不是**线性代数里的矩阵乘法。矩阵乘法要用 `a @ b` 或 `np.dot(a, b)`。这是从前端转过来最容易想当然的点。

---

# 四、核心干货二：dtype 和 shape（和 JS 数组最大的不同）

JS 数组可以随便混类型、随便变长：`[1, "a", true]` 完全合法。NumPy 数组**恰恰相反**——它有两个铁律：

1. **同质**：所有元素必须是同一种类型（`dtype`）。
2. **定形**：形状（`shape`）在创建时确定，是个有维度的网格。

```python
arr = np.array([1, 2, 3])      # arr：整数数组

print(arr.dtype)   # int64，元素类型（整数）；变量含义：该数组每个格子存什么类型的数据
print(arr.shape)   # (3,)，形状元组，表示"一维、长度 3"
print(arr.ndim)    # 1，维度数（几维）
print(arr.size)    # 3，元素总个数
```

二维数组（你可以理解成"数组的数组"，但它是规整的矩形网格，不是 JS 那种参差不齐的嵌套）：

```python
# matrix：二维数组，2 行 3 列
matrix = np.array([
    [1, 2, 3],
    [4, 5, 6],
])

print(matrix.shape)   # (2, 3)，含义：2 行 3 列
print(matrix.ndim)    # 2，二维
```

`dtype` 为什么重要？因为它直接决定内存和精度。比如机器学习里常把数据转成 `float32` 省一半内存：

```python
# astype：返回一个转换了 dtype 的新数组（不改原数组）
f = arr.astype(np.float32)   # f：把整数数组转成 32 位浮点
print(f.dtype)               # float32
```

对照 JS——JS 数组完全没有这套类型/形状约束，所以也享受不到 NumPy 的内存与速度优化。最接近的只有 `TypedArray`（如 `Float32Array`），其实 NumPy 的 dtype 思路和它一脉相承。

---

# 五、核心干货三：索引与切片（最大的坑在这）

一维索引切片，语法和 Python 列表、JS 数组都很像：

```python
arr = np.array([10, 20, 30, 40, 50])   # arr：一维数组

print(arr[0])     # 10，取第一个
print(arr[-1])    # 50，取最后一个（负索引，和 Python 列表一致）
print(arr[1:3])   # [20 30]，切片，含头不含尾（同 Python list / JS slice）
```

二维用逗号分隔行列，比 JS 的 `matrix[i][j]` 更简洁：

```python
matrix = np.array([[1, 2, 3], [4, 5, 6]])   # matrix：2 行 3 列

print(matrix[0, 1])   # 2，第 0 行第 1 列（逗号分隔，NumPy 特有写法）
print(matrix[1])      # [4 5 6]，整个第 1 行
print(matrix[:, 0])   # [1 4]，所有行的第 0 列（: 表示"这一维全要"）
```

> ⚠️ **本篇最大的坑：切片返回的是「视图（view）」而不是「拷贝」。**
>
> JS 的 `arr.slice(1, 3)` 给你一个**全新数组**，改它不影响原数组。NumPy 的切片默认是原数组的一个"窗口"，**改切片会改到原数组**：

```python
arr = np.array([1, 2, 3, 4, 5])   # arr：原数组
sub = arr[1:3]                    # sub：切片，它是 arr 的视图，不是副本
sub[0] = 999                      # 改 sub 的第一个元素
print(arr)   # [  1 999   3   4   5]  ❌ 原数组也被改了！
```

对照 JS，这是新手必踩的认知差：

```javascript
const arr = [1, 2, 3, 4, 5]
const sub = arr.slice(1, 3)   // 全新数组
sub[0] = 999
console.log(arr)   // [1, 2, 3, 4, 5]  原数组安然无恙
```

需要"像 JS 那样的独立副本"时，显式调用 `.copy()`：

```python
sub = arr[1:3].copy()   # sub：独立副本，改它不影响 arr
```

为什么 NumPy 这么设计？因为视图不复制数据，处理超大数组时省内存又快。这是性能取舍，不是 bug。

---

# 六、核心干货四：布尔索引（替代 filter）

NumPy 里 `arr > 2` 不返回单个布尔值，而是返回一个**布尔数组**，逐个元素判断：

```python
arr = np.array([1, 2, 3, 4, 5])   # arr：一维数组

mask = arr > 2    # mask：布尔数组 [False False True True True]，逐元素比较的结果
print(arr[mask])  # [3 4 5]，用布尔数组当下标，只取出 True 对应的元素
```

通常合成一行，这就是 NumPy 版的 `filter`：

```python
print(arr[arr > 2])   # [3 4 5]
```

对照 JS：

```javascript
const arr = [1, 2, 3, 4, 5]
console.log(arr.filter(x => x > 2))   // [3, 4, 5]
```

还能直接批量赋值，比如"把所有负数清零"（数据清洗常用）：

```python
data = np.array([-1, 5, -3, 8])   # data：含负数的数组
data[data < 0] = 0                # 业务场景：把所有负数替换成 0（异常值兜底）
print(data)   # [0 5 0 8]
```

> ⚠️ 注意：布尔数组之间组合条件**不能用 `and` / `or`**（那是给单个布尔值用的），要用 `&` / `|`，且每个条件**必须加括号**：

```python
# 取出 [2, 4] 区间的元素。& 是逐元素与；括号不能省，否则运算符优先级会出错
print(arr[(arr > 2) & (arr < 5)])   # [3 4]
```

---

# 七、核心干货五：聚合与 axis（按行/按列统计）

求和、平均、最大最小，对标 JS 的 `reduce`，但一个方法就够：

```python
arr = np.array([1, 2, 3, 4])   # arr：一维数组

print(arr.sum())    # 10，求和
print(arr.mean())   # 2.5，平均值
print(arr.max())    # 4，最大值
print(arr.min())    # 1，最小值
print(arr.std())    # 标准差（数据分析常用，JS 得自己实现）
```

对照 JS 的 reduce，NumPy 明显更省心：

```javascript
const arr = [1, 2, 3, 4]
const sum = arr.reduce((a, b) => a + b, 0)   // 10
const mean = sum / arr.length                // 2.5
```

二维数组的精髓在 `axis` 参数——它决定"沿哪个方向压扁"。这是新手最绕的概念，记住：**`axis=0` 是"竖着压"（按列），`axis=1` 是"横着压"（按行）**：

```python
# matrix：2 行 3 列
matrix = np.array([
    [1, 2, 3],
    [4, 5, 6],
])

print(matrix.sum())          # 21，不指定 axis 就是全部加起来
# axis=0：沿"行"方向往下压，每一列各自求和 → 得到列数个结果
print(matrix.sum(axis=0))    # [5 7 9]   (1+4, 2+5, 3+6)
# axis=1：沿"列"方向往右压，每一行各自求和 → 得到行数个结果
print(matrix.sum(axis=1))    # [ 6 15]   (1+2+3, 4+5+6)
```

记忆口诀：**axis 指的是"被消掉的那个维度"**。`axis=0` 把行这一维消掉（2 行 → 没了，剩 3 个列结果），`axis=1` 把列这一维消掉。

---

# 八、形状操作：reshape

`reshape` 把数据重新排成另一种形状，**元素总数必须不变**：

```python
arr = np.arange(6)        # arr：[0 1 2 3 4 5]，np.arange 类似 Python range 但直接返回数组

# reshape：返回指定形状的新数组（视图）。这里把 6 个元素排成 2 行 3 列
m = arr.reshape(2, 3)     # m：[[0 1 2] [3 4 5]]

# -1 表示"这一维你帮我算"，常用来"我只关心列数，行数自动"
m2 = arr.reshape(-1, 2)   # m2：3 行 2 列，行数由 6/2 自动推出
```

`reshape` 在深度学习里无处不在——比如把一张图片从 `(28, 28)` 的二维像素拉平成 `(784,)` 的一维向量喂给模型，靠的就是它。

---

# 九、为什么这是 AI 的地基（衔接后续）

到这里你可能会问：学这个跟 AI 有什么关系？关系极大——**后面所有 AI 数据都是 NumPy 数组**：

- **Embedding 向量**（第 25 篇）本质就是一个一维 NumPy 数组，比如 OpenAI 的 embedding 是个长度 1536 的 `float` 数组。"语义相似"在数学上就是"两个向量距离近"。

用 CSS 颜色打个直觉比方：RGB 颜色 `(255, 0, 0)` 就是一个三维向量，`(250, 5, 5)` 和它数值接近，所以**看起来也是相近的红**。Embedding 是同一回事，只是把一段文字压成了上千维的坐标点，**语义相近的文字，坐标点也挨得近**。检索（第 26 篇 RAG）就是"在这堆坐标点里找离我最近的几个"。算"距离/相似度"用的就是本篇的向量运算：

```python
import numpy as np

# a、b：两个模拟的 embedding 向量（真实场景里由模型生成，长度可能上千）
a = np.array([0.1, 0.3, 0.5])
b = np.array([0.2, 0.2, 0.6])

# 余弦相似度：两向量点积 / (各自模长相乘)。值越接近 1，语义越相近
# np.dot 算点积，np.linalg.norm 算向量长度（模）
cos_sim = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
print(cos_sim)   # 接近 1，说明这两个向量方向几乎一致
```

这段代码现在看个意思就行——重点是让你知道：**本篇的向量运算，就是后面 Embedding 检索、相似度计算的底层操作**。先把"对数组整体运算"这个肌肉记忆练出来，到第 25、26 篇就不会卡。

---

# 十、最容易踩的坑（前端视角汇总）

1. **切片是视图不是拷贝**——改切片会改原数组，要独立副本必须 `.copy()`。这是和 JS `slice` 最大的认知差，排第一位。

2. **`a * b` 是逐位相乘不是矩阵乘法**——矩阵乘法用 `a @ b`。别拿线性代数直觉套。

3. **数组是同质 + 定形的**——不能像 JS 数组那样随意混类型、随意 push 改长度。要"加元素"通常是重新构造或用 `np.concatenate`，频繁增删请用 Python list。

4. **布尔条件组合用 `&`/`|` 且要加括号**——不能用 `and`/`or`，括号不能省。

5. **`axis` 搞反**——记住"axis 是被消掉的维度"，`axis=0` 按列、`axis=1` 按行。

6. **别再写 for 循环逐个处理**——能向量化就向量化。看到自己在 NumPy 数组上写 `for`，先停下想想有没有整体运算的写法（性能差几十倍）。

---

# 十一、总结

NumPy 的核心就一句话：把"对一堆数字逐个 for 循环"变成"对整个数组一次性运算"，写法更像数学公式，速度因为底层 C 实现快几十倍。它的 `ndarray` 是个同质（dtype）、定形（shape）的"超级 Array"，支持向量化运算、广播、布尔索引、按 axis 聚合。它是 Pandas、Embedding 向量、机器学习的共同地基。

✅ 该掌握
- 向量化：`arr * 2`、`a + b`、`np.sqrt(arr)` 替代 `map` 循环
- `shape` / `dtype` / `reshape` 看懂并会改数组形状
- 布尔索引 `arr[arr > 2]` 替代 `filter`，批量赋值做数据清洗
- 聚合 `sum/mean/max` 配 `axis=0`（按列）/`axis=1`（按行）
- 知道 Embedding 向量就是一维 NumPy 数组，相似度=向量运算

⚠️ 易混淆
- 切片是**视图**不是拷贝，改切片会动原数组（要副本用 `.copy()`）
- `a * b` 是逐位相乘，矩阵乘法是 `a @ b`
- 布尔条件用 `&`/`|` 且必须加括号，不能用 `and`/`or`
- `axis` 是"被消掉的维度"，最易搞反
- NumPy 数组同质定形，不能像 JS 数组随意混类型/变长

下一篇：Pandas 基础（DataFrame ≈ 加强版 Excel/SQL，建立在 NumPy 之上）

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“Python（20）- NumPy 基础”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
