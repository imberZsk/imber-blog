# Python（26） - RAG 入门

> 读完后，你应能完成以下任务：
> - 绘制“Python（26） - RAG 入门 / 先给锚点：RAG ≈ 让模型「开卷考试」+ 你熟悉的「搜索 → 渲染」”的关键对象与数据流，解释“上下文窗口有限：模型一次能读的 token 有上限（几万到几十万不等），你公司几百份文档塞不下。 -> token 要花钱：输入越长越贵，每次提问都重发全部文档，成本爆炸。 -> 噪声拖垮效果：资料越多越杂，模型越容易被无关内容带偏（「大海捞针」问题，塞太多反而答得更差）。”，并用源码位置、日志或 Trace 标注证据。
> - 为“Python（26） - RAG 入门 / RAG 全景：离线建索引 + 在线问答，两条流水线”设计正常与异常输入，验证“类比前端：离线建索引 ≈ 打包构建期（把内容预处理好、建好索引，跑一次），在线问答 ≈ 运行时请求（用户每来一次就走一遍检索 + 生成）。”，输出首个偏差位置与回归测试结果。
> - 实现“Python（26） - RAG 入门 / 第一步 chunking：为什么要把文档切碎”的最小代码或配置，检验“chunking（切分 / 分块）是 RAG 里最不起眼、却最影响效果的一步。”，输出命令、结果与 Diff，并说明不适用边界。

> 上一篇（第 25 篇）你已经学会把文字压成一串坐标（Embedding），还会算「两段话语义有多近」。但单有 Embedding 还干不成事。本篇要解决的真实问题是：大模型**不知道你公司的内部文档**，也**不知道今天发生了什么**（它的知识有训练截止日期）。你问它「我们产品的退款政策是什么」，它要么瞎编（幻觉），要么说「我不知道」。RAG（Retrieval-Augmented Generation，检索增强生成）就是这件事的标准解法——本质是**让模型「开卷考试」**：先去你的资料库里检索相关片段，再把片段塞进 prompt 让模型「照着资料回答」。这是目前落地最广的 AI 应用形态（智能客服、文档问答、企业知识库几乎都是它）。

阶段五依赖链对齐：**23（调 API）→ 24（结构化输出 + 函数调用）→ 25（Embedding·把文字变坐标）→ 26（本篇·RAG）→ 27（Agent）**。本篇默认你已读过第 25 篇，知道 `embeddings.create` 怎么用、余弦相似度怎么算；这里把它们组装成一条能跑的问答流水线。

---

# 一、先给锚点：RAG ≈ 让模型「开卷考试」+ 你熟悉的「搜索 → 渲染」

先建立直觉。把大模型想象成一个**博学但记不住你私事的考生**：

- **闭卷考试**：直接问模型「我们的退款政策是几天？」。它没见过你的文档，只能凭「常识」瞎答 → 幻觉。
- **开卷考试**：先翻出政策文档里相关的那一段，连同问题一起递给它：「这是政策原文：『……7 天无理由退款……』，请据此回答」。模型照着抄就行 → 准确。

RAG 干的就是「开卷」这件事，而且整个流程你作为前端**其实天天在做**——它就是熟悉的「**搜索 → 拿数据 → 渲染**」模式：

| 前端做过的事 | RAG 里对应的环节 |
|--------------|------------------|
| 用户在搜索框输入关键词 | 用户提问（query） |
| 调搜索接口 `/search?q=...` 拿到相关结果 | 去向量库检索出最相关的几段资料 |
| 把结果数据塞进模板渲染成页面 | 把资料片段塞进 prompt 模板 |
| 浏览器展示最终页面 | 模型基于资料生成最终回答 |

> 边界（哪里不一样）：前端搜索是**关键词匹配**（`includes`、`LIKE %xx%`，字面对得上才命中）；RAG 的检索是**语义匹配**——你问「咋退钱」，能命中写着「退款流程」的段落，哪怕一个字都没重合。这正是第 25 篇 Embedding 的价值：把「字面匹配」升级成「意思相近就算命中」。另一个关键差异：搜索结果是直接展示给人看的，而 RAG 的检索结果是**喂给模型的中间料**，最终答案由模型加工后产出。

## 1.1 为什么不直接把整个知识库塞进 prompt？

新手第一反应常是：「我把所有文档一股脑贴进 system prompt 不就行了？」三个硬约束让这条路走不通：

1. **上下文窗口有限**：模型一次能读的 token 有上限（几万到几十万不等），你公司几百份文档塞不下。
2. **token 要花钱**：输入越长越贵，每次提问都重发全部文档，成本爆炸。
3. **噪声拖垮效果**：资料越多越杂，模型越容易被无关内容带偏（「大海捞针」问题，塞太多反而答得更差）。

所以正确做法不是「全塞」，而是「**先检索出最相关的一小撮，只塞这一小撮**」。这就是 RAG 的核心思想。

---

# 二、RAG 全景：离线建索引 + 在线问答，两条流水线

RAG 拆开看是**两个阶段**，别混在一起理解：

```text
【离线 · 建索引】（资料入库时跑一次，类比前端的「构建/预渲染」）
  原始文档
    └─切分(chunking)──> 一堆小片段
        └─Embedding──> 每段变成一串向量坐标
            └─存入向量库 (id, 原文, 向量)

【在线 · 问答】（用户每次提问时跑，类比「运行时请求」）
  用户问题
    └─Embedding──> 问题也变成向量
        └─去向量库找最近的 top-k 段──> 检索出最相关的几段原文
            └─拼进 prompt 模板──> 「这是资料：xxx。请据此回答：用户问题」
                └─调大模型生成──> 最终答案
```

类比前端：**离线建索引 ≈ 打包构建期**（把内容预处理好、建好索引，跑一次），**在线问答 ≈ 运行时请求**（用户每来一次就走一遍检索 + 生成）。把这两条线分清，后面代码就不会乱。

本篇按「切分 → 检索 → 生成拼装」三步逐个讲透，最后串成一个能跑的最小 demo。

---

# 三、第一步 chunking：为什么要把文档切碎

`chunking`（切分 / 分块）是 RAG 里最不起眼、却最影响效果的一步。**不能拿整篇文档去做 Embedding**，必须先切成小片段，原因有二：

- **检索粒度**：用户问一个具体问题，命中的应该是「相关的那一段」，而不是「包含答案的整篇 1 万字文档」。整篇喂回去既浪费 token 又引入噪声。
- **Embedding 表达力**：把 1 万字压成一个向量，语义被「平均」得稀烂（什么都沾一点 = 什么都不像）；一小段话压成向量，语义才聚焦。

> 类比：这就像前端的**分页 / 虚拟列表 / 懒加载**——不会把十万条数据一次性渲染，而是切成一屏一屏按需取。chunking 就是「把长文档切成可检索的最小单元」。

最常用的切法是**固定长度 + 重叠（overlap）**：

```python
def split_text(text: str, chunk_size: int = 300, overlap: int = 50) -> list[str]:
    """把长文本按固定字符数切成若干片段（chunk）。

    chunk_size: 每段的目标长度（字符数），太大检索不准、太小丢上下文
    overlap:    相邻两段的重叠字符数，防止把一句话从中间劈断丢失语义
    返回值:     切好的片段列表，每个元素是一段字符串
    """
    chunks: list[str] = []      # chunks：存放切分结果的列表，每个元素是一个片段
    start: int = 0              # start：当前片段的起始下标，每轮往后挪
    # 当起点还没越过文本末尾，就继续切下一段
    while start < len(text):
        end = start + chunk_size            # end：当前片段的结束下标（不含）
        chunk = text[start:end]             # chunk：本轮切出的片段
        chunks.append(chunk)
        # WHY 这里减 overlap：让下一段和当前段有一截重叠，
        # 避免「7 天无理由退款」被切点劈成「7 天无理由」+「退款」两段都检不全
        start += chunk_size - overlap
    return chunks


# 用法示例
doc = "我们支持 7 天无理由退款，需在订单完成后 7 天内申请……（此处省略长文）"  # doc：待切分的原始长文本
pieces = split_text(doc)    # pieces：切好的片段列表
```

```javascript
// JS 等价实现，思路一模一样
// text：待切分的长文本；chunkSize：每段目标长度；overlap：相邻段重叠字符数
function splitText(text, chunkSize = 300, overlap = 50) {
  const chunks = []   // chunks：存放切分结果的数组
  let start = 0       // start：当前片段的起始下标
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize))
    start += chunkSize - overlap   // 留 overlap 重叠，防止切断语义
  }
  return chunks
}
```

实战里还有更聪明的切法（按段落 `\n\n` 切、按 markdown 标题切、按句子切），原则是**尽量沿「自然语义边界」下刀**，别把一句话拦腰斩断。入门阶段用「固定长度 + overlap」足够，先跑通再优化。LangChain / LlamaIndex 这类框架内置了 `RecursiveCharacterTextSplitter` 等现成切分器，等理解了原理再用框架不迟。

---

# 四、第二步检索：向量库就是「语义版的搜索引擎」

切好的片段要先转成向量、存起来，用户提问时再去「找最近的几段」。这一步直接复用第 25 篇的 Embedding 能力。

## 4.1 离线：把片段灌进库

```python
from openai import OpenAI

client = OpenAI()   # client：SDK 客户端，自动读环境变量 OPENAI_API_KEY


def embed(texts: list[str]) -> list[list[float]]:
    """把一批文本转成向量（详见第 25 篇）。

    texts: 待向量化的字符串列表（批量传比逐条调省钱省时）
    返回值: 向量列表，与输入一一对应，每个向量是一串 float
    """
    resp = client.embeddings.create(
        model="text-embedding-3-small",   # model：embedding 专用模型，和聊天模型不是同一个
        input=texts,                       # input：支持一次传多条，批量处理
    )
    # resp.data 与 input 顺序一一对应，每个 .embedding 是该条文本的向量
    return [item.embedding for item in resp.data]


# —— 离线建索引：这里用一个最简单的「内存列表」当向量库，便于看清原理 ——
documents = [                      # documents：知识库原始片段（实际应来自 split_text 的输出）
    "我们支持 7 天无理由退款，需在订单完成后 7 天内提交申请。",
    "会员等级分为青铜、白银、黄金，按累计消费金额自动升级。",
    "客服工作时间为每天 9:00 至 21:00，节假日不休。",
]
doc_vectors = embed(documents)     # doc_vectors：每个片段对应的向量，下标和 documents 对齐
```

> ⚠️ 关键坑：**建索引和查询必须用同一个 embedding 模型**。向量是模型「私有的坐标系」，A 模型的坐标和 B 模型的坐标不在一个空间里，混用就是拿北京的经纬度去查上海的地图——算出来的距离毫无意义。

## 4.2 在线：用余弦相似度找 top-k

检索的本质是「问题向量离哪几个片段向量最近」。距离度量最常用**余弦相似度**（第 25 篇讲过：值越接近 1 越相似）。这里手写一版，把黑盒拆开看：

```python
import numpy as np   # NumPy ≈ 批量操作的「超级 Array」，整组向量一次算，不写 for（详见第 20 篇）


def search(query: str, top_k: int = 2) -> list[str]:
    """检索与 query 语义最相近的 top_k 个片段。

    query: 用户的提问
    top_k: 返回最相关的几条（k 太小可能漏答案，太大引入噪声，常用 3~5）
    返回值: 命中的原文片段列表，按相关度从高到低
    """
    q_vec = np.array(embed([query])[0])     # q_vec：问题的向量（embed 返回列表，取第 0 个）
    mat = np.array(doc_vectors)             # mat：所有片段向量堆成的矩阵，形状 (片段数, 维度)

    # 余弦相似度 = 点积 / (各自模长之积)。NumPy 一次性算出 query 对每个片段的相似度
    # WHY 用矩阵运算而非 for 循环：几万条片段时，向量化比逐个循环快几个数量级
    dot = mat @ q_vec                                   # dot：query 与每个片段的点积，一维数组
    norms = np.linalg.norm(mat, axis=1) * np.linalg.norm(q_vec)  # norms：模长乘积，做归一化
    scores = dot / norms                                # scores：每个片段的余弦相似度（-1~1）

    # argsort 升序排，取末尾 top_k 再反转 = 相似度最高的前 k 个的下标
    top_idx = scores.argsort()[-top_k:][::-1]           # top_idx：命中片段在 documents 中的下标
    return [documents[i] for i in top_idx]


hits = search("怎么退钱")   # hits：检索结果，预期命中「7 天无理由退款」那条
```

注意「怎么退钱」和原文「无理由退款」**一个字都不重合**，但语义相近，所以能命中——这就是语义检索碾压关键词搜索的地方。

## 4.3 真实场景：用现成向量库，别自己手撸

手写 numpy 版是为了讲清原理。**真实项目几万、几百万条片段时，每次都全量算一遍余弦太慢**，要用专门的向量库（内置近似最近邻索引 ANN，毫秒级返回）。入门最易上手的是 Chroma：

```python
import chromadb

# Chroma 客户端：这里用内存模式，生产可换持久化（PersistentClient）
chroma = chromadb.Client()   # chroma：Chroma 向量库客户端
# 创建一个集合（collection），类比数据库里的一张「表」
collection = chroma.create_collection(name="kb")   # collection：存放片段及其向量的容器

# 灌数据：documents 给原文，ids 给唯一标识，Chroma 默认自带 embedding 模型自动算向量
# （也可传 embeddings= 用你自己算好的向量，比如上面 OpenAI 的）
collection.add(
    documents=documents,                       # documents：片段原文列表
    ids=[f"doc-{i}" for i in range(len(documents))],  # ids：每条的唯一 id，类比主键
)

# 查询：传问题文本，Chroma 自动把它向量化再找最近的 n_results 条
result = collection.query(   # result：查询结果，含 documents/ids/distances 等键
    query_texts=["怎么退钱"],   # query_texts：问题列表，可一次查多个
    n_results=2,                # n_results：返回 top-k 数量
)
# result["documents"] 是二维列表（外层对应每个 query），取第 0 个 query 的命中
print(result["documents"][0])
```

> 常见向量库选型（了解即可）：**Chroma**（最轻量，本地起步首选）、**FAISS**（Meta 出品，纯本地、快，无服务端）、**pgvector**（给 PostgreSQL 装个扩展就能存向量，已有 PG 的项目最省事）、**Milvus / Qdrant / Pinecone**（面向规模化、可托管）。原理都一样：存向量 + 近似最近邻检索，换库主要是换 API。

---

# 五、第三步生成：把检索结果拼进 prompt

检索拿到相关片段后，最后一步是**把它们拼进 prompt，让模型照着回答**。这一步回到第 24 篇的 Prompt 工程——核心是用 system prompt **立规矩**：「只准根据我给的资料回答，资料里没有就说不知道」。

```python
def answer(query: str) -> str:
    """RAG 问答主流程：检索 → 拼 prompt → 生成。

    query: 用户提问
    返回值: 模型基于检索资料生成的最终回答
    """
    hits = search(query, top_k=2)             # hits：检索到的相关片段列表

    # context：把命中的片段拼成一段「参考资料」，编号便于模型引用和我们排查
    context = "\n".join(f"[资料{i + 1}] {text}" for i, text in enumerate(hits))

    # system prompt 立规矩：约束模型只用资料作答，杜绝它自由发挥编答案
    # WHY 要写「资料里没有就说不知道」：这是 RAG 防幻觉的关键护栏，
    # 否则模型检索不到时会脑补，反而比直接说「不知道」更危险
    system_prompt = (
        "你是企业知识库助手。只能依据下面提供的【参考资料】回答问题，"
        "禁止编造资料之外的内容。若资料中找不到答案，直接回答「资料中未提及」。\n\n"
        f"【参考资料】\n{context}"
    )

    resp = client.chat.completions.create(   # resp：大模型返回的聊天补全结果
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query},
        ],
        temperature=0,   # temperature=0：问答要稳定可复现，把随机性压到最低（详见第 24 篇）
    )
    return resp.choices[0].message.content


print(answer("怎么退钱？"))      # 预期：基于「7 天无理由退款」那条资料作答
print(answer("你们卖不卖股票？")) # 预期：资料里没有 → 回答「资料中未提及」，而不是瞎编
```

这段 `system_prompt` 的拼装就是整个 RAG 的「临门一脚」。注意它和第 24 篇讲的结构化输出、few-shot 完全可以叠加使用——比如还能要求模型「在答案末尾标注引用了哪条资料」，方便做溯源。

---

# 六、串起来：一个最小可跑的 RAG

把上面三步合并，就是一个能跑的最小 RAG。整体不到 50 行，结构是「离线建一次索引 + 在线反复问答」：

```python
from openai import OpenAI
import numpy as np

client = OpenAI()   # client：OpenAI SDK 客户端，自动读环境变量 OPENAI_API_KEY

# ===== 离线：建索引（程序启动时跑一次）=====
documents = [   # documents：知识库片段（真实项目应来自文档切分 split_text 的结果）
    "我们支持 7 天无理由退款，需在订单完成后 7 天内提交申请。",
    "会员等级分为青铜、白银、黄金，按累计消费金额自动升级。",
    "客服工作时间为每天 9:00 至 21:00，节假日不休。",
]


def embed(texts: list[str]) -> list[list[float]]:
    """批量把文本转向量（详见第 25 篇）。texts：文本列表；返回：向量列表。"""
    resp = client.embeddings.create(model="text-embedding-3-small", input=texts)
    return [d.embedding for d in resp.data]


doc_matrix = np.array(embed(documents))   # doc_matrix：全部片段向量组成的矩阵，建索引时算一次


# ===== 在线：每次提问走一遍 =====
def rag(query: str, top_k: int = 2) -> str:
    """完整 RAG 流程：检索 + 拼装 + 生成。

    query: 用户提问
    top_k: 取最相关的几段资料
    返回值: 最终回答
    """
    # 1) 检索：问题转向量，算余弦相似度，取 top_k
    q = np.array(embed([query])[0])                          # q：问题向量
    scores = doc_matrix @ q / (                              # scores：每段的余弦相似度
        np.linalg.norm(doc_matrix, axis=1) * np.linalg.norm(q)
    )
    idx = scores.argsort()[-top_k:][::-1]                    # idx：命中片段下标（相似度降序）
    context = "\n".join(f"[资料{i + 1}] {documents[j]}"      # context：拼好的参考资料文本
                        for i, j in enumerate(idx))

    # 2) 拼装 + 3) 生成
    resp = client.chat.completions.create(   # resp：大模型返回的聊天补全结果
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content":
                "只依据以下资料回答，找不到就说「资料中未提及」。\n" + context},
            {"role": "user", "content": query},
        ],
        temperature=0,
    )
    return resp.choices[0].message.content


# 跑起来
print(rag("退款几天内有效？"))
```

这条 50 行的流水线，就是市面上绝大多数「文档问答 / 智能客服 / 企业知识库」的内核。剩下的工程化（换持久化向量库、加 chunking 策略、加缓存、加引用溯源、加重排序）都是在这个骨架上长出来的枝叶。

---

# 七、前端新手最容易踩的坑

| 坑 | 现象 | 正解 |
|----|------|------|
| **以为 RAG 是「微调模型」** | 想着「拿数据训练模型让它记住」 | RAG **不改模型**，只是检索后塞进 prompt。改模型那叫微调（fine-tune），是另一条路、成本高得多 |
| **建库和查询用了不同 embedding 模型** | 检索全是离谱结果 | 两边必须同一个模型，向量是模型私有坐标系，不通用 |
| **不切分，整篇文档做 embedding** | 检索命中一大坨、答案飘、token 爆 | 必须先 chunking 切成小片段 |
| **chunk 切太大或太小** | 太大引入噪声、太小丢上下文 | 从 300~500 字 + 适当 overlap 起步，按效果调 |
| **以为检索是关键词匹配** | 纠结「问题里没出现这个词怎么办」 | 它是**语义**匹配，意思相近就能命中，字面不必重合 |
| **不给模型「找不到就拒答」的护栏** | 检索失败时模型脑补、幻觉 | system prompt 明确「资料里没有就说不知道」 |
| **检索质量差却怪模型不行** | 答得不准，第一反应去换更强的生成模型 | RAG 的天花板是**检索**——没召回到正确片段，再强的模型也答不对（garbage in, garbage out） |

最后这条最关键，单独强调：**RAG 答得好不好，七成看检索、三成看生成。** 新手总爱在「换更贵的模型」上花力气，但真正的杠杆通常在前半段——切分策略、embedding 质量、top-k 取值、要不要加重排序（rerank）。调 RAG 时，先把「检索到的片段打印出来肉眼看」，确认召回对了，再去管生成。

---

# 八、总结

- **先给锚点：RAG ≈ 让模型「开卷考试」+ 你熟悉的「搜索 → 渲染」**：上下文窗口有限：模型一次能读的 token 有上限（几万到几十万不等），你公司几百份文档塞不下。 -> token 要花钱：输入越长越贵，每次提问都重发全部文档，成本爆炸。 -> 噪声拖垮效果：资料越多越杂，模型越容易被无关内容带偏（「大海捞针」问题，塞太多反而答得更差）。
- **RAG 全景：离线建索引 + 在线问答，两条流水线**：RAG 拆开看是两个阶段，别混在一起理解：
- **第一步 chunking：为什么要把文档切碎**：chunking（切分 / 分块）是 RAG 里最不起眼、却最影响效果的一步。
- **第二步检索：向量库就是「语义版的搜索引擎」**：⚠️ 关键坑：建索引和查询必须用同一个 embedding 模型。
- **第三步生成：把检索结果拼进 prompt**：检索拿到相关片段后，最后一步是把它们拼进 prompt，让模型照着回答。
- **串起来：一个最小可跑的 RAG**：把上面三步合并，就是一个能跑的最小 RAG。

## 参考资料

- [Python 3 文档](https://docs.python.org/3/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
