# LangChain 实战（58）- RAG：把文档向量化，基于向量实现真正的语义搜索

> 读完你能：从工程视角理解向量化入库和语义检索，而不只是记住 RAG 的流程图。

# 一、本篇定位

这是 RAG 进阶线的入口。20-26 已经讲过基础流程，这里开始把每一步拆到能落地调优的层级。

# 二、一个真实场景

用户问“报销多久内提交”，文档写的是“费用产生后三十日内完成报支”。关键词检索可能搜不到，向量检索能通过语义相似把它召回。RAG 的第一步，就是把文档和问题都变成可比较的向量。

# 三、核心拆解

- 向量化不是为了让模型直接读数字，而是为了把语义相近的文本放到向量空间里相近的位置。
- 入库时要保存三件东西：chunk 文本、embedding 向量、metadata。metadata 负责来源、章节、权限和时间。
- 在线检索时，用户问题也要 embedding，再用余弦相似度或内积找 topK。topK 不是越大越好，太大会引入噪声。

# 四、工程链路

- 解析文档。
- 按语义切 chunk。
- 为每个 chunk 生成 embedding。
- 向量和 metadata 一起写入库。
- 提问时对 query 向量化。
- 检索 topK 并拼进 prompt。

# 五、落地建议

- 先用一小批真实问题测试召回，再扩大知识库。
- 每个 chunk 都保留 source、page、section、permission。
- 记录检索分数，后面才能调阈值和坏 case。

# 六、常见坑

- 只存向量不存原文。
- 只看相似度最高的一条，不看 topK 里是否有噪声。
- 换 embedding 模型后不重建索引，导致向量空间不一致。

# 七、和已有主线的关系

20 是 RAG 总览，22 是 embedding 基础；58 把两者合成一个真实的向量化检索链路。

# 八、复述答法

> RAG 的语义搜索链路是：文档切块、每块生成 embedding、带 metadata 存入向量库；提问时 query 也生成 embedding，检索相似 chunk，再让模型基于证据回答。关键不是“用了向量库”，而是 chunk、metadata、topK 和阈值都可调可评测。

# 九、总结

- **核心拆解**：向量化不是为了让模型直接读数字，而是为了把语义相近的文本放到向量空间里相近的位置。
- **工程链路**：为每个 chunk 生成 embedding。
- **常见坑**：只看相似度最高的一条，不看 topK 里是否有噪声。
- **本篇定位**：这是 RAG 进阶线的入口。

## 十、最小可运行示例：真实 Embedding Top-K

```text
# requirements.txt
sentence-transformers
numpy
```

```python
from __future__ import annotations

import numpy as np
from sentence_transformers import SentenceTransformer


# 示例文档同时保留稳定 ID 与可引用正文。
DOCUMENTS = {
    "refund#1": "退款审核通过后三个工作日内原路退回。",
    "shipping#1": "订单发货后可在物流页面查看进度。",
}
# 本地多语言 Embedding 模型名称，首次运行需要下载权重。
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def search(query: str, top_k: int = 2) -> list[tuple[str, float]]:
    """执行余弦 Top-K；query 是问题，top_k 是返回数量。"""

    # 模型实例在服务进程中应复用，避免每次请求重复加载。
    model = SentenceTransformer(MODEL_NAME)
    # 文档向量和查询向量使用同一模型并归一化。
    document_vectors = model.encode(list(DOCUMENTS.values()), normalize_embeddings=True)
    # 单条查询向量用于与全部文档做点积。
    query_vector = model.encode([query], normalize_embeddings=True)[0]
    # 归一化向量点积等价于余弦相似度。
    scores = np.asarray(document_vectors) @ np.asarray(query_vector)
    # 倒序索引只保留指定候选数。
    ranked_indexes = np.argsort(scores)[::-1][:top_k]
    # 文档 ID 顺序与向量输入保持一致。
    document_ids = list(DOCUMENTS)
    return [(document_ids[index], float(scores[index])) for index in ranked_indexes]


print(search("退款多久能到账"))
```

点击下方在线实验可直接运行同一条检索链路：浏览器会加载站点内置的量化中文
`bge-small-zh-v1.5`，生成真实的 512 维向量并返回 Top-2；它不是关键词匹配或手写假向量。

生产建库把文档向量离线生成并写 VectorDB，在线只生成查询向量；同时记录模型版本、维度、前缀和归一化方式，任一变化都通过新索引重建发布。
