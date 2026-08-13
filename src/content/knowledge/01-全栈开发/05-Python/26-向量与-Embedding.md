# Python（26） - 向量与 Embedding

> 读完后，你应能解释“一、先建立前端锚点：用 CSS 颜色破题”，复现“二、为什么不用关键词匹配？”的最小实现，并用“三、核心干货一：怎么生成 Embedding”检查结果与失败边界。

> 你想做一个「语义搜索」：用户搜"怎么退款"，文档里写的是"取消订单后如何拿回钱"——没有一个字相同，传统的关键词匹配（`includes` / `LIKE '%退款%'`）会一条都搜不到。本篇解决这个问题：**怎么让机器理解"意思相近"，而不是"字面相同"**。答案就是 Embedding——把文字压成一串坐标数字，语义相近的文字坐标也挨得近，检索就变成"找最近的点"。这也是下一篇 RAG（第 26 篇）的地基。

> 依赖链提醒：阶段五是 `23 调用大模型API → 24 函数调用/结构化输出 → 25 本篇 Embedding → 26 RAG → 27 Agent`。本篇只讲清 Embedding 的**最小可用形态**（生成向量 + 算相似度 + 内存里检索），完整的"检索增强生成"流程留到第 26 篇。向量运算的底层全是 NumPy，建议先过第 20 篇。

# 一、先建立前端锚点：用 CSS 颜色破题

别一上来就背"向量""维度"这些术语。你其实**早就用过向量了**——CSS 颜色。

`rgb(255, 0, 0)` 是什么？它就是一个**三维向量** `[255, 0, 0]`。三个数字分别是红、绿、蓝三个"维度"上的坐标。

关键直觉来了：

```
rgb(255, 0, 0)   纯红
rgb(250, 5, 5)   稍微暗一点的红 —— 数值接近，看起来也接近
rgb(0, 0, 255)   纯蓝     —— 数值差很远，看起来也差很远
```

**颜色看起来像不像，约等于这两组数字离得近不近。** 这就是向量的全部精髓——把"东西"变成"一串坐标"，然后用"坐标距离"衡量"像不像"。

Embedding 干的是同一件事，只是：

| | CSS 颜色 | Embedding |
|---|---|---|
| 输入 | 一个颜色 | 一段文字 |
| 输出 | 3 个数字 `[r, g, b]` | 一长串数字（OpenAI 是 1536 个） |
| "近" 代表 | 颜色看起来像 | **语义（意思）相近** |
| 怎么算近 | 数值距离 | 向量距离 / 余弦相似度 |

所以一句话定义：**Embedding 就是把一段文字压成一串坐标（一个高维向量），语义相近的文字，坐标点挨得近。** 三维你能想象成空间里的点，1536 维想象不出来没关系，数学公式一模一样。

> ⚠️ 边界：颜色的三个维度有明确含义（红绿蓝），但 Embedding 那 1536 个维度**没有人类能解释的含义**——它是模型训练出来的，你别试图去理解"第 7 个维度代表什么"。你只需要相信：模型保证了"意思近 → 坐标近"这个性质。

---

# 二、为什么不用关键词匹配？

先看前端老办法的死穴：

```javascript
// JS：传统关键词匹配
const docs = ["如何取消订单并拿回钱", "配送时间说明", "积分规则"]
const query = "怎么退款"
// 字面包含匹配：一条都搜不到，因为没有"退款"两个字
const hits = docs.filter(d => d.includes("退款"))   // []  ❌
```

问题就在：`includes` / 数据库 `LIKE` 只认**字面**，不认**语义**。"退款"和"拿回钱"对机器是两个完全无关的字符串。

Embedding 把每段文字变成向量后，"退款"的向量和"拿回钱"的向量会**挨得很近**，于是就能搜到。这就是从"字符串匹配"升级到"语义匹配"的跨越。

---

# 三、核心干货一：怎么生成 Embedding

Embedding 不是你自己算的，是**调模型 API 拿的**（和第 23 篇调大模型同一套 SDK）。先装官方库：

```bash
pip install openai numpy
```

```python
from openai import OpenAI   # OpenAI：官方 SDK 客户端类

# client：API 客户端实例。api_key 实际项目从环境变量读，别硬编码（详见第 23 篇）
client = OpenAI()   # 默认读环境变量 OPENAI_API_KEY

def get_embedding(text: str) -> list[float]:
    """把一段文字转成 embedding 向量。
    参数 text：要向量化的原始文字。
    返回：一个浮点数列表，就是这段文字的坐标（OpenAI 该模型固定 1536 维）。
    """
    # embeddings.create：调用 embedding 接口
    # model：embedding 专用模型，和聊天模型(gpt-4 等)不是同一个，别混用
    # input：要编码的文字，可传单条字符串，也可传字符串列表批量处理
    resp = client.embeddings.create(
        model="text-embedding-3-small",   # 性价比高的常用 embedding 模型
        input=text,
    )
    # resp.data 是个列表（因为支持批量），单条取第 0 个的 .embedding
    return resp.data[0].embedding   # 返回值：长度 1536 的 float 列表

vec = get_embedding("怎么退款")   # vec：这句话的向量，1536 个浮点数
print(len(vec))    # 1536
print(vec[:5])     # 看前 5 个，类似 [0.013, -0.027, 0.008, ...]
```

对照心智模型：这跟你在前端 `fetch` 一个 API 拿 JSON 没区别，只是返回的 JSON 里是一长串数字。

> ⚠️ 边界：**embedding 模型 ≠ 聊天模型**。`text-embedding-3-small` 只会吐向量、不会对话；`gpt-4` 只会对话、不给你向量。调错 model 名字会直接报错。

**批量更省钱省时**——`input` 直接传列表，一次编码多条：

```python
def get_embeddings(texts: list[str]) -> list[list[float]]:
    """批量把多段文字转成向量（比逐条调用快且省请求数）。
    参数 texts：文字列表。
    返回：向量列表，顺序与输入一一对应。
    """
    resp = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,   # 传列表即批量；返回的 resp.data 顺序和输入对齐
    )
    # 按 data 里的顺序把每个 .embedding 取出来组成列表
    return [item.embedding for item in resp.data]
```

---

# 四、核心干货二：怎么算"两段文字像不像"——余弦相似度

拿到两个向量后，怎么量化它们"近不近"？最常用的是**余弦相似度（cosine similarity）**。

直觉：把向量看成从原点射出的箭头，**余弦相似度衡量两支箭头的"方向"有多一致**，跟箭头多长无关。

- 方向几乎相同 → 值接近 **1**（语义非常像）
- 方向垂直无关 → 值接近 **0**（不相关）
- 方向相反 → 值接近 **-1**（语义相反）

公式就是第 20 篇结尾那段：`点积 / (两个向量各自的长度相乘)`。用 NumPy 一行搞定：

```python
import numpy as np

def cosine_similarity(a: list[float], b: list[float]) -> float:
    """计算两个向量的余弦相似度，值域 [-1, 1]，越接近 1 越相似。
    参数 a、b：两个等长的向量（embedding）。
    返回：相似度分数（float）。
    """
    a = np.array(a)   # a：转成 NumPy 数组才能做向量化运算（第 20 篇）
    b = np.array(b)   # b：同上
    # np.dot 算点积；np.linalg.norm 算向量长度（模）
    # 分母是两个模相乘，作用是"消掉长度只看方向"
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# 三句话各自取向量
v1 = get_embedding("怎么退款")        # v1：查询的向量
v2 = get_embedding("取消订单后如何拿回钱")  # v2：语义相近的文档
v3 = get_embedding("今天天气不错")     # v3：完全无关的文档

print(cosine_similarity(v1, v2))   # 比较高，比如 0.6 左右，语义相近
print(cosine_similarity(v1, v3))   # 比较低，比如 0.1 左右，几乎无关
```

> ⚠️ 易混点：**别用"两点直线距离（欧氏距离）"想当然代替余弦相似度。** 文本检索里余弦更常用，因为它只看方向、不受向量长度影响。两者结论大多一致，但语义检索的行业默认是余弦。另外注意：余弦相似度**越大越相似**，而距离是**越小越相似**，方向相反，排序时别搞反。

JS 里没有内置这些，得自己写循环，能直观看出 NumPy 帮你省了多少：

```javascript
// JS：纯手写余弦相似度，对比一下啰嗦程度
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {   // 1536 次循环，逐个累加
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
```

---

# 五、核心干货三：归一化的小技巧（让点积 = 余弦）

如果你把每个向量先**归一化**（缩放成长度为 1），那么"余弦相似度"就退化成了简单的"点积"——少算一步除法，批量检索时更快。OpenAI 的 embedding 默认已经是归一化的，但自己处理时知道这点有用：

```python
def normalize(vec: list[float]) -> np.ndarray:
    """把向量归一化为单位长度（长度变成 1，方向不变）。
    参数 vec：原始向量。
    返回：归一化后的 NumPy 数组。
    WHY：归一化后，余弦相似度 = 点积，省掉每次比较都重算模长的开销。
    """
    arr = np.array(vec)        # arr：转成数组
    norm = np.linalg.norm(arr) # norm：原始向量长度（标量）
    # 防 0 兜底：万一是全 0 向量，除法会得到 nan，这里直接返回原数组
    if norm == 0:
        return arr
    return arr / norm          # 每个元素同除以模长，结果长度为 1
```

> 这一节属于"知道就行"的优化点，新手阶段直接用上面的 `cosine_similarity` 即可，不影响功能。

---

# 六、核心干货四：搭一个最小语义检索（Embedding 的"Hello World"）

把前面拼起来，就是一个**内存版语义搜索**——这就是 RAG 的雏形，也是 Embedding 最小可用形态：

```python
import numpy as np

# 1) 准备知识库：每条是一段文档文字
documents = [                       # documents：原始文档列表
    "如何取消订单并申请退款",
    "配送时间一般为 3 到 5 个工作日",
    "积分可以在下单时抵扣现金",
    "会员等级与专属权益说明",
]

# 2) 离线阶段：把所有文档一次性批量编码成向量，存起来备用
#    真实项目里这步结果会落库（向量数据库，第 26 篇），不必每次请求都重算
doc_vectors = get_embeddings(documents)   # doc_vectors：与 documents 对齐的向量列表

def search(query: str, top_k: int = 2) -> list[tuple[str, float]]:
    """在知识库里做语义检索，返回最相关的 top_k 条。
    参数 query：用户的查询文字。
    参数 top_k：返回前几条，默认 2。
    返回：[(文档原文, 相似度分数), ...]，按相似度从高到低排序。
    """
    q_vec = get_embedding(query)   # q_vec：查询的向量（在线阶段实时算）

    # scored：每条文档配上它与查询的相似度，结构 [(文档, 分数), ...]
    scored = [
        (doc, cosine_similarity(q_vec, doc_vec))
        for doc, doc_vec in zip(documents, doc_vectors)   # zip：把文档和它的向量配对
    ]

    # 按分数降序排（相似度越大越靠前），reverse=True 表示从大到小
    scored.sort(key=lambda item: item[1], reverse=True)
    return scored[:top_k]   # 只取前 top_k 条

# 用户搜"怎么退款"，字面没有"退款"二字也能命中第一条
results = search("怎么退款")   # results：检索结果
for doc, score in results:
    print(f"{score:.3f}  {doc}")
# 输出类似：
# 0.612  如何取消订单并申请退款     ← 语义命中，关键词匹配做不到
# 0.181  积分可以在下单时抵扣现金
```

这段就是语义检索的完整骨架，对照前端你会发现结构很眼熟：

| 阶段 | 干什么 | 类比前端 |
|---|---|---|
| 离线建库 | 把所有文档批量转向量存起来 | 构建期把数据预处理成索引 |
| 在线查询 | 查询转向量 → 和库里逐个算相似度 → 排序取 top_k | 拿到搜索词去索引里 `filter` + `sort` |

> 真实项目不会在内存里逐个 for 比较（几万条会很慢），而是用**向量数据库**（如 Chroma / FAISS / pgvector）做高效近邻检索——这是第 26 篇 RAG 的内容。本篇你先理解"检索 = 在向量堆里找最近的点"这个本质就够了。

---

# 七、前端新手最容易踩的坑

1. **以为 embedding 是关键词提取**——不是。它不抽关键词，而是把整段语义压成坐标。两段没有共同字的话也能算出"很像"。

2. **embedding 模型和聊天模型用混**——`text-embedding-3-small` 出向量，`gpt-4` 出对话，model 名字传错直接报错。

3. **每次请求都重新编码整个知识库**——文档向量应该**离线算一次存起来**，只有用户的 query 才需要实时编码。否则又慢又烧钱。

4. **相似度方向搞反**——余弦相似度**越大越相似**（接近 1），排序要 `reverse=True`；如果你改用"距离"则是越小越相似，两者排序方向相反。

5. **不同模型的向量混用比较**——`text-embedding-3-small` 的向量和别的模型的向量**不在同一个坐标系**，不能互相算相似度。整个知识库必须用同一个模型编码。

6. **维度对不上还硬算**——两个向量长度（维度）必须相同才能算相似度。换了模型导致维度变化（比如 1536 → 3072），旧向量全部作废，得重新生成。

7. **拿 list 直接做数学运算**——Python 的 `list` 不支持 `a * b` 这种向量化运算（那是 NumPy 的本事，第 20 篇），算相似度前记得 `np.array(...)`。

---

# 八、总结

Embedding 就是"把文字压成一串坐标（高维向量），语义相近的文字坐标挨得近"。用 CSS 颜色类比最直观：`rgb` 是三维向量、数值近=颜色近；Embedding 只是把文字变成了 1536 维的坐标点、坐标近=意思近。生成靠调 embedding 模型 API，"像不像"用余弦相似度衡量（越接近 1 越像），检索就是"在向量堆里找离 query 最近的几个点"。把这套最小流程跑通，第 26 篇 RAG 只是把它接上向量数据库和大模型生成。

✅ 该掌握
- 一句话本质：文字 → 向量，语义近 → 坐标近，检索 = 找最近点
- 用 `client.embeddings.create(model=..., input=...)` 生成向量，能批量
- 余弦相似度算"像不像"：`np.dot(a,b) / (norm(a)*norm(b))`，越大越像
- 最小语义检索三步：离线建库 → query 编码 → 算分排序取 top_k
- embedding 模型和聊天模型是两类，向量必须同一模型生成

⚠️ 易混淆
- Embedding 不是关键词提取，是整段语义的坐标
- 余弦相似度越大越相似；距离越小越相似，排序方向相反别搞反
- 文档向量离线算一次存起来，别每次请求重算整库
- 不同模型 / 不同维度的向量不能互相比较
- list 不能直接做向量运算，先 `np.array(...)`（第 20 篇）

下一篇：26 - RAG 入门（把本篇的检索接上向量数据库 + 大模型生成，做"检索增强生成"）

## 参考资料

- [Python 3 文档](https://docs.python.org/3/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
