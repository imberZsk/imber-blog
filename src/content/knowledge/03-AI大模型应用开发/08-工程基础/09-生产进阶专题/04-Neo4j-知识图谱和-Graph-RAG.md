# 工程基础（80）- Neo4j 知识图谱和 Graph RAG

> 读完你能：理解知识图谱解决什么问题，以及 Graph RAG 何时值得引入。

# 一、本篇定位

这是 GraphRAG 专项篇，和 appendices 里的进阶 GraphRAG 形成互补。

# 二、一个真实场景

用户问“设备 A 的 E17 故障和哪个传感器有关，处理步骤是什么”。普通 RAG 可能召回几段相似文本，但关系链不清楚。知识图谱可以把设备、部件、故障码、原因、处理步骤连成图，先走关系，再回原文找证据。

# 三、核心拆解

- Neo4j 存的是节点和关系。节点可以是设备、人员、公司、故障、条款；关系可以是属于、导致、引用、依赖。
- Graph RAG 不是替代向量 RAG，而是增加一条关系召回路径。图谱找路径，文本 RAG 找证据，模型负责组织回答。
- 图谱建设成本高，适合实体关系明确、多跳问题多、需要证据路径的领域。

# 四、工程链路

- 从文档抽取实体和关系。
- 写入 Neo4j。
- 用户问题做实体识别。
- 查询图谱路径。
- 根据路径回查原文证据。
- 结合文本证据生成回答。

# 五、落地建议

- 先从小范围核心实体建图，不要全量抽取。
- 图谱关系要能回到原文来源。
- 图查询结果要和 RAG chunk 一起给模型。

# 六、常见坑

- 为了显得高级硬上图谱。
- 图谱没有来源，关系无法核验。
- 实体抽取错误后不做人工校正，图越建越脏。

# 七、和已有主线的关系

`../09-附录/进阶-GraphRAG与知识图谱增强.md` 讲思路；本篇聚焦 Neo4j 落地链路。

# 八、设计判断

Graph RAG 最适合“关系先于文本”的问题。如果用户只是问制度条款、产品说明，普通 RAG 往往足够；如果用户问 A 和 B 的关系、某故障由哪些部件导致、某公司和哪些项目关联，图谱才开始有明显价值。建图前先列 20 个真实问题，看其中是否大量需要多跳关系和实体消歧。没有这些问题，图谱会变成昂贵的装饰。

# 九、复述答法

> Graph RAG 适合多跳关系和实体消歧。Neo4j 存实体关系，向量库保存原文证据，回答时先查关系路径，再回到文本证据。它不是普通 RAG 的替代品，只有关系问题足够多时才值得引入。

# 十、总结

- **核心拆解**：Neo4j 存的是节点和关系。
- **常见坑**：实体抽取错误后不做人工校正，图越建越脏。
- **本篇定位**：这是 GraphRAG 专项篇，和 appendices 里的进阶 GraphRAG 形成互补。
- **落地建议**：先从小范围核心实体建图，不要全量抽取。

## 十、最小可运行示例：参数化 GraphRAG 查询

~~~text
# requirements.txt
neo4j>=5,<7
~~~

~~~python
from __future__ import annotations

from neo4j import Driver


# 图扩展最大返回量，避免无界遍历进入模型上下文。
MAX_GRAPH_HITS = 20


def find_evidence(driver: Driver, tenant_id: str, entity_id: str, groups: list[str]) -> list[dict[str, object]]:
    """查询实体关联证据；身份与权限参数来自服务端鉴权。"""

    # Cypher 固定标签、关系和跳数，模型不能提交任意查询文本。
    query = """
    MATCH (entity:Entity {tenant_id: $tenant_id, entity_id: $entity_id})
          <-[:MENTIONS]-(chunk:Chunk)<-[:HAS_CHUNK]-(document:Document)
    WHERE any(group IN document.acl_groups WHERE group IN $groups)
    RETURN chunk.chunk_id AS chunk_id, chunk.source_uri AS source_uri
    LIMIT $limit
    """
    # 查询参数不通过字符串拼接进入 Cypher。
    records, _, _ = driver.execute_query(
        query,
        tenant_id=tenant_id,
        entity_id=entity_id,
        groups=groups,
        limit=MAX_GRAPH_HITS,
        database_="neo4j",
    )
    return [record.data() for record in records]
~~~

图路径必须回链到有权限的原始 Chunk。GraphRAG 单独评估实体链接、多跳命中和证据回链，不用最终答案掩盖图谱错误。
