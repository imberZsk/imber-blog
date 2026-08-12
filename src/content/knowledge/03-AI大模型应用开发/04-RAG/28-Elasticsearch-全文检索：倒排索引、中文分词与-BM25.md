# RAG（28） - Elasticsearch 全文检索：倒排索引、中文分词与 BM25

> 读完你能：解释 BM25 为什么仍是企业 RAG 的基础召回，并能写出带权限过滤、业务词典和可观测字段的 Elasticsearch 查询。
> 更新日期：2026/08/11

# 一、为什么向量检索不能替代 BM25

用户问“E17 报错”“GB/T 35273 第 6.3 条”“`NullPointerException`”时，关键线索是不能改写的错误码、标准号和 API 名。Embedding 擅长同义表达，但可能弱化这些稀有符号；倒排索引会直接保留词项与文档的对应关系。

因此生产 RAG 常用两条互补链路：

- BM25 负责错误码、型号、人名、法条号、函数名和精确短语。
- 向量检索负责口语化问题、同义词和没有共同词面的语义匹配。

# 二、倒排索引与 BM25 到底算什么

倒排索引记录“词项 → 出现该词项的文档列表”。查询不必扫描全库，而是合并相关词项的 posting list。BM25 再根据三类信号排序：

1. **词频 TF**：查询词在当前文档出现得越多，通常越相关，但收益会逐渐饱和。
2. **逆文档频率 IDF**：越少见的词区分度越高，“E17”通常比“系统”更重要。
3. **长度归一化**：避免长文档仅因包含更多词而天然占优。

`k1` 控制词频饱和速度，`b` 控制文档长度归一化强度。不要脱离标注集盲调参数；中文场景往往先修分词、字段和词典，收益比调 BM25 参数更大。

# 三、索引设计：正文、精确词和权限分开

```json
PUT knowledge_chunks
{
  "settings": {
    "analysis": {
      "analyzer": {
        "zh_business": {
          "type": "custom",
          "tokenizer": "ik_max_word",
          "filter": ["lowercase"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "chunk_id": { "type": "keyword" },
      "tenant_id": { "type": "keyword" },
      "acl": { "type": "keyword" },
      "title": { "type": "text", "analyzer": "zh_business" },
      "content": { "type": "text", "analyzer": "zh_business" },
      "exact_terms": { "type": "keyword" },
      "updated_at": { "type": "date" }
    }
  }
}
```

`exact_terms` 用来保存抽取出的错误码、产品型号和接口名，避免它们被分词器切碎。`tenant_id` 与 `acl` 必须在检索阶段过滤；先全库召回再由应用层删除无权限结果，会泄露命中数量、分数甚至高亮片段。

# 四、可直接改造的查询

```python
from typing import Any

# 标题权重应由离线评测决定，这里是便于起步的初始值。
TITLE_BOOST = 2.0
# 精确词字段权重高于普通正文，确保错误码和型号优先。
EXACT_TERM_BOOST = 4.0
# 每次稀疏召回进入融合层的候选数量。
SPARSE_TOP_K = 50


def build_bm25_query(question: str, tenant_id: str, role_ids: list[str]) -> dict[str, Any]:
    """构造带租户和角色权限过滤的 BM25 查询。"""
    # 当前请求允许访问的角色；空集合时只能命中 public。
    allowed_roles = ["public", *role_ids]
    return {
        "size": SPARSE_TOP_K,
        "_source": ["chunk_id", "title", "content", "updated_at"],
        "query": {
            "bool": {
                "filter": [
                    {"term": {"tenant_id": tenant_id}},
                    {"terms": {"acl": allowed_roles}},
                ],
                "should": [
                    {
                        "multi_match": {
                            "query": question,
                            "fields": [f"title^{TITLE_BOOST}", "content"],
                            "type": "best_fields",
                        }
                    },
                    {
                        "term": {
                            "exact_terms": {
                                "value": question,
                                "boost": EXACT_TERM_BOOST,
                            }
                        }
                    },
                ],
                "minimum_should_match": 1,
            }
        },
        "highlight": {"fields": {"title": {}, "content": {}}},
    }
```

真实项目还应先从问题里抽取精确实体，再对 `exact_terms` 做 `terms` 查询。不要直接把整句问题当作一个 keyword；上例保留这个最小分支，是为了突出字段职责。

# 五、中文分词怎么验收

先用 `_analyze` 看词元，再看搜索结果：

```json
POST knowledge_chunks/_analyze
{
  "analyzer": "zh_business",
  "text": "TMS-2026 运单轨迹回传失败"
}
```

应重点检查：

- 错误码、型号、缩写是否完整保留。
- 同一业务词在索引和查询阶段是否使用同一分析器。
- 自定义词典更新是否需要重建索引，滚动发布时各节点词典是否一致。
- `match`、`term`、`match_phrase` 是否放在正确字段；`term` 不会替你做全文分词。

# 六、评测与排障

检索评测至少保存 `Recall@K`、`MRR`、无结果率和 P95 延迟。坏案例按下面顺序查：

1. `_analyze` 是否产生了预期词元。
2. 文档是否进入正确索引、租户和权限范围。
3. `explain: true` 下哪些字段贡献了分数。
4. 正确证据是否在 Top K 外，还是根本没有命中。
5. 改词典或字段后，固定评测集是否整体提升，而不是只修好一个例子。

# 七、常见错误

- 只建一个 `text` 字段，精确过滤、聚合和全文检索全部混用。
- 把 BM25 `_score` 与向量余弦分直接相加，两种分值没有统一量纲。
- 业务词典只在一台 ES 节点更新，导致同一查询结果漂移。
- 为了召回率把 `minimum_should_match` 放得过松，Top K 被通用词占满。
- 忘记记录查询 DSL、索引版本和词典版本，线上坏案例无法复现。

# 八、参考资料

- [Elasticsearch：BM25 similarity](https://www.elastic.co/docs/reference/elasticsearch/index-settings/similarity)
- [Elasticsearch：Analyze API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-analyze)
- [Elasticsearch：Hybrid search](https://www.elastic.co/docs/solutions/search/hybrid-search)

# 九、总结

- BM25 的核心价值是稳定保留精确词面信号，和向量语义召回互补。
- 先把字段、分词、词典、权限过滤做对，再讨论参数调优。
- 检索问题要用 Recall@K、MRR、查询 DSL 与索引版本定位，不能只凭最终回答好不好看。

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)
