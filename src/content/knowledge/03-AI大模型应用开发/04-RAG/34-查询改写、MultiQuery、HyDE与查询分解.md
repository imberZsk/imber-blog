# RAG（34） - 查询改写、MultiQuery、HyDE 与查询分解

> 查询变换用于弥合用户表达与知识库表达的差距，但必须保留原问题并评测改写漂移。

> 读完你能：为不同查询选择 Rewrite、MultiQuery、HyDE 或分解，并评测召回收益和意图漂移。

## 核心知识清单

- Query Rewrite 与规范化
- MultiQuery 多角度召回
- HyDE 假设文档向量
- 查询分解与子问题依赖
- 原查询保底、去重与融合
- 改写漂移、延迟、成本与评测

## 四种方法怎么选

Query Rewrite 适合口语、省略和错别字；MultiQuery 为同一意图生成多种表达，适合术语不一致；HyDE 先生成一段“可能的答案”，再用其向量检索，适合抽象短问题；查询分解把多跳问题拆成可独立检索的子问题。简单精确查询不应强制改写，额外模型调用可能降低质量并增加延迟。

## 可运行融合示例

```python
from collections import defaultdict


def reciprocal_rank_fusion(rankings: list[list[str]], rank_constant: int = 60) -> list[str]:
    """用 RRF 融合原查询和多个改写查询的文档排名。"""
    # 每个文档跨召回列表累积的 RRF 分数。
    scores: dict[str, float] = defaultdict(float)
    for ranking in rankings:
        for rank, document_id in enumerate(ranking, start=1):
            scores[document_id] += 1 / (rank_constant + rank)
    return sorted(scores, key=scores.get, reverse=True)


# 原查询必须作为一路保底，避免模型改写偏离用户意图。
print(reciprocal_rank_fusion([["policy-v2", "faq"], ["faq", "policy-v2"], ["policy-v2", "guide"]]))
```

## 验收方法

评测集按短查询、术语查询、口语查询、多跳查询和负样本分层。比较改写前后的 Recall@K、MRR、无关召回率、P95 延迟与单位成功成本；记录生成的查询便于定位漂移。涉及权限时，每一路召回都必须执行相同 ACL 过滤，不能融合后再补权限。

## 参考资料

- [LangChain MultiQueryRetriever](https://python.langchain.com/docs/how_to/MultiQueryRetriever/)
- [HyDE Paper](https://arxiv.org/abs/2212.10496)
