# 工程基础（79）- 混合检索 RAG：多路召回、RRF 与重排

> 读完你能：实现 BM25、向量、标题三路召回，理解 RRF、加权融合和 Cross-Encoder Rerank 的边界，并能用评测数据判断每一路是否值得保留。
> 更新日期：2026/08/11

# 一、检索漏斗，而不是“多搜一点”

生产链路通常是：

`问题分类 → 并行召回 → 权限内去重 → 排名融合 → Rerank → Context Packing → 生成`

各层职责不同：召回层宁可多找一些候选，融合层解决多路分数不可比，重排层判断候选是否真正回答问题，Context Packing 再控制最终证据的覆盖面和 Token 数。

常见召回路由：

| 路由 | 擅长 | 典型失效 |
| --- | --- | --- |
| BM25 | 错误码、型号、专有名词、精确短语 | 同义改写、口语问题 |
| Dense Vector | 语义相似、自然语言改写 | 稀有编号、实体边界 |
| 标题/标签 | 文档导航、产品或模块过滤 | 正文细节 |
| Sparse Vector | 学习得到的词项扩展 | 模型和索引维护成本 |
| 图谱/关系 | 多跳实体关系 | 非结构化事实覆盖不足 |

# 二、为什么不能直接相加原始分数

BM25 分数没有固定上限，余弦相似度通常落在较小区间，模型 Rerank 又可能输出 logit。直接执行 `0.5 * bm25 + 0.5 * cosine`，权重含义会随索引、查询和模型变化。

RRF 只使用名次：

`score(d) = Σ 1 / (k + rank_i(d))`

它不要求不同召回路的分数同尺度。Elastic 官方默认 `rank_constant` 为 60；这个值是稳健起点，不是业务真理。`rank_window_size` 越大，低排名候选越可能参与融合，同时增加延迟。

# 三、RRF 的可执行实现

```python
from collections import defaultdict
from dataclasses import dataclass

# RRF 的平滑常量；需要通过固定评测集验证。
RRF_K = 60
# 每一路最多进入融合的候选数量。
RANK_WINDOW_SIZE = 50


@dataclass(frozen=True)
class Candidate:
    """保存一条召回候选及其可观测信息。"""

    # 跨索引稳定的 Chunk 主键。
    chunk_id: str
    # 候选来自哪条召回路由。
    route: str
    # 当前路由中的一基排名。
    rank: int


def reciprocal_rank_fusion(rankings: dict[str, list[str]]) -> list[tuple[str, float, set[str]]]:
    """按名次融合多路候选，并保留每篇候选的来源路由。"""
    # 每个 Chunk 累加后的 RRF 分数。
    scores: dict[str, float] = defaultdict(float)
    # 每个 Chunk 被哪些路由召回，用于线上贡献分析。
    routes: dict[str, set[str]] = defaultdict(set)

    for route, chunk_ids in rankings.items():
        for rank, chunk_id in enumerate(chunk_ids[:RANK_WINDOW_SIZE], start=1):
            scores[chunk_id] += 1.0 / (RRF_K + rank)
            routes[chunk_id].add(route)

    return sorted(
        [(chunk_id, score, routes[chunk_id]) for chunk_id, score in scores.items()],
        key=lambda item: item[1],
        reverse=True,
    )


# 两路原始分数不同，但名次可以直接融合。
rankings = {
    "bm25": ["chunk-e17", "chunk-token", "chunk-login"],
    "dense": ["chunk-login", "chunk-token", "chunk-account"],
}
print(reciprocal_rank_fusion(rankings))
```

# 四、Rerank 不等于再次向量检索

Bi-Encoder 分别编码问题和文档，适合全库快速召回；Cross-Encoder 同时读取“问题 + 候选”，能建模更细的词间交互，但每个候选都要推理，适合对几十条结果精排。

推荐起点：每路召回 30～100 条，融合后去重为 50～150 条，Rerank 后保留 5～15 条。具体数值必须由数据量、P95 延迟和 Recall@K 决定。

```python
from collections.abc import Callable

# 最终送入生成阶段的证据数量。
FINAL_TOP_N = 8


def rerank_candidates(
    question: str,
    candidate_texts: dict[str, str],
    score_pairs: Callable[[list[tuple[str, str]]], list[float]],
) -> list[tuple[str, float]]:
    """使用外部 Cross-Encoder 对候选文本精排。"""
    # 保持候选编号顺序，确保模型分数可准确回填。
    candidate_ids = list(candidate_texts)
    # 每个输入对都包含同一个问题和一条候选证据。
    pairs = [(question, candidate_texts[candidate_id]) for candidate_id in candidate_ids]
    # Rerank 模型返回的相关性分数。
    scores = score_pairs(pairs)
    # 带候选编号的精排结果。
    ranked = sorted(zip(candidate_ids, scores, strict=True), key=lambda item: item[1], reverse=True)
    return ranked[:FINAL_TOP_N]
```

# 五、动态路由怎么做

不要每个问题都机械地跑完所有检索器。可先用低成本规则或分类器判断：

- 命中错误码、版本号、引号短语：提高 BM25 和精确字段优先级。
- 口语化“怎么处理”“为什么”问题：保留 Dense Vector。
- 指定产品、部门、时间范围：先应用 metadata filter，再召回。
- 问题包含多个实体关系：增加图谱或 SQL 路由。

路由失败时应有保底：至少执行 BM25 + Dense 两路，并在 trace 记录选择理由。

# 六、评测必须拆层

| 层级 | 指标 | 回答的问题 |
| --- | --- | --- |
| 单路召回 | Recall@K、MRR | 该路能否找到正确证据 |
| 融合 | Recall@K、候选去重率、路由贡献率 | 多路是否真有互补 |
| Rerank | nDCG@K、MRR | 正确证据是否被排到前面 |
| 生成 | 忠实度、引用准确率、拒答准确率 | 模型是否只基于证据回答 |
| 系统 | P50/P95 延迟、Token、单问成本 | 上线是否可承受 |

做消融实验：依次关闭某一路，若 Recall@K 不降、延迟却明显下降，就应删除这一路，而不是为了架构图完整而保留。

# 七、生产排障

- **正确证据各路都没找到**：查切分、索引、Embedding 和查询改写。
- **单路能找到，融合后掉出 Top K**：查 `rank_window_size`、去重主键和路由权重。
- **融合排名正确，Rerank 排错**：查候选是否截断、模型语言能力与训练域。
- **证据正确，答案仍错**：问题已进入生成层，检查 Context Packing、Prompt 和引用校验。
- **多租户串数据**：权限过滤必须下推到每条召回路，不能融合后再过滤。

# 八、参考资料

- [Elasticsearch：Reciprocal rank fusion](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion)
- [Elasticsearch：Hybrid search](https://www.elastic.co/docs/solutions/search/hybrid-search)
- [Milvus：Reranking](https://milvus.io/docs/reranking.md)

# 九、总结

- 混合检索的价值是召回路互补，不是堆更多组件。
- RRF 用名次规避原始分数不可比；Cross-Encoder 只对小候选集精排。
- 用分层指标和消融实验决定链路去留，每条召回都要记录贡献、延迟与失败原因。

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“Agent 工程（79）- 混合检索 RAG：多路召回、RRF 与重排”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
