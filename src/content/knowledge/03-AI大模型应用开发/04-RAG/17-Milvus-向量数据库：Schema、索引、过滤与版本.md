# LangChain 实战（61）- Milvus 向量数据库：Schema、索引、过滤与版本

> 读完你能：为 RAG 设计 Milvus Collection，理解 HNSW/IVF 参数，并实现带租户过滤、Embedding 版本和可观测结果的向量检索。
> 更新日期：2026/08/11

# 一、Milvus 在 RAG 里负责什么

Milvus 保存向量及其标量 Metadata，提供 ANN Top K 和过滤。它不负责解析 PDF、生成 Embedding、验证事实或生成答案。完整链路仍要有 Loader、Splitter、Embedding、权限、Rerank 和评测。

小规模原型可用内存/FAISS/Chroma；已有 PostgreSQL 且规模中等可考虑 pgvector；向量规模、并发和独立扩展需求提高时，专用 Milvus 更有价值。选型必须结合运维能力。

# 二、Collection Schema

```python
from pymilvus import DataType, MilvusClient

# Collection 中向量字段的固定维度，必须与 Embedding 模型一致。
VECTOR_DIMENSION = 512
# 当前向量索引的逻辑名称。
COLLECTION_NAME = "knowledge_chunks_v1"

# 连接到本地 Milvus 服务的客户端。
client = MilvusClient(uri="http://localhost:19530")
# 当前 Collection 的显式字段定义。
schema = client.create_schema(auto_id=False, enable_dynamic_field=False)
schema.add_field(field_name="chunk_id", datatype=DataType.VARCHAR, is_primary=True, max_length=128)
schema.add_field(field_name="document_id", datatype=DataType.VARCHAR, max_length=128)
schema.add_field(field_name="tenant_id", datatype=DataType.VARCHAR, max_length=64)
schema.add_field(field_name="acl", datatype=DataType.ARRAY, element_type=DataType.VARCHAR, max_capacity=32, max_length=64)
schema.add_field(field_name="embedding_version", datatype=DataType.VARCHAR, max_length=64)
schema.add_field(field_name="text", datatype=DataType.VARCHAR, max_length=8192)
schema.add_field(field_name="vector", datatype=DataType.FLOAT_VECTOR, dim=VECTOR_DIMENSION)

# HNSW 索引的构建参数；上线前应在真实数据上压测。
index_params = client.prepare_index_params()
index_params.add_index(
    field_name="vector",
    index_type="HNSW",
    metric_type="COSINE",
    params={"M": 16, "efConstruction": 200},
)
client.create_collection(
    collection_name=COLLECTION_NAME,
    schema=schema,
    index_params=index_params,
)
```

客户端 API 会随版本演进，生产项目要锁定 `pymilvus` 与 Milvus 兼容版本，并用契约测试验证建表和查询。

# 三、索引参数如何理解

- HNSW `M` 越大，图连接更多，通常召回更好，但内存与构建成本上升。
- `efConstruction` 控制建图搜索宽度，影响建库时间和图质量。
- 查询 `ef` 控制搜索范围，越大通常召回越高、延迟越大。
- IVF 用聚类桶缩小搜索范围，`nprobe` 决定查询多少桶；数据分布变化后要关注重建。

使用精确 KNN 或高参数结果作为近似真值，画 Recall@K 与 P95 曲线，再选满足 SLO 的点。

# 四、带权限过滤的查询

```python
from typing import Any

# 每次返回给融合/Rerank 层的候选数量。
TOP_K = 50
# HNSW 在线查询的初始搜索宽度。
SEARCH_EF = 128


def search_chunks(
    client: MilvusClient,
    query_vector: list[float],
    tenant_id: str,
    role_id: str,
) -> list[list[dict[str, Any]]]:
    """在租户和角色权限范围内执行向量检索。"""
    # Milvus 标量过滤表达式；外部值应经过白名单/转义封装。
    filter_expression = f'tenant_id == "{tenant_id}" and array_contains(acl, "{role_id}")'
    return client.search(
        collection_name=COLLECTION_NAME,
        data=[query_vector],
        anns_field="vector",
        filter=filter_expression,
        limit=TOP_K,
        search_params={"metric_type": "COSINE", "params": {"ef": SEARCH_EF}},
        output_fields=["chunk_id", "document_id", "text", "embedding_version"],
    )
```

示例直接拼接表达式是为了说明过滤位置；真实服务应封装并校验 ID，避免表达式注入。权限过滤不能放在 Top K 返回后。

# 五、Embedding 版本升级

模型、维度、归一化或 query/document 前缀任一变化，都应创建新 Collection/字段版本：后台重建 → 数量与 ID 对账 → 固定集评测 → 影子查询 → 切读别名 → 观察 → 回收旧版。混合新旧向量会让距离失去意义。

# 六、生产验收

- 插入数量、源 Chunk 数与主键差集一致。
- 无权限 Query 永远不能命中其他租户候选。
- Recall@K、P50/P95、QPS、索引内存和构建时间达到预算。
- 删除文档后所有向量和缓存不可再检索。
- Trace 保存 Collection、索引参数、Embedding 版本、过滤表达式摘要和原始距离。
- Milvus 不可用时明确降级 BM25 或拒答，而不是静默返回模型常识。

# 七、参考资料

- [Milvus Overview](https://milvus.io/docs/overview.md)
- [Milvus Index explained](https://milvus.io/docs/index-explained.md)
- [Milvus Filtered search](https://milvus.io/docs/filtered-search.md)

# 八、总结

- Milvus 解决大规模向量近邻与 Metadata Filter，不等于完整 RAG。
- Schema、索引参数、权限下推和 Embedding 版本必须共同设计。
- 所有 ANN 参数都要用 Recall-延迟曲线而不是经验数字验收。

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)
