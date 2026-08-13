# RAG（35） - RAG 数据生命周期、权限与可复现发布

> RAG 的生产难点不是第一次建库，而是源文档变化后，正文、Chunk、Embedding、索引、权限和引用仍保持同一版本。

> 读完你能：设计支持增量更新、删除传播、权限过滤和无损回滚的知识入库与索引发布流程。

## 核心知识清单

- 数据源身份、版本、校验和与同步游标
- Parser、Chunker 与 Embedding 版本
- 文档、Chunk、向量和倒排索引的一致性
- tenant_id、ACL 与后端再次授权
- 双写、影子索引、Alias 切换与回滚
- 删除传播、Embedding 兼容与可复现记录

## 给每个产物可追溯身份

文档记录至少包含 `document_id`、`source_uri`、`source_version`、`content_hash`、`tenant_id` 和 ACL。Chunk 再携带 `chunk_id`、页码或标题路径、Parser 版本、Chunker 版本和正文偏移。向量记录还要保存 Embedding 模型、维度与归一化方式。

只有这些字段齐全，线上错误才能回答“这条引用来自哪个源版本、由哪套规则切分、使用哪个模型向量化”。

## 更新与删除链路

```mermaid
flowchart LR
  A["源文档变更"] --> B["计算版本与内容哈希"]
  B --> C["解析和分块"]
  C --> D["生成新向量"]
  D --> E["写入影子索引"]
  E --> F["检索与权限回归"]
  F --> G["Alias 原子切换"]
  G --> H["延迟清理旧版本"]
```

源删除必须传播到正文、Chunk、向量、倒排索引和缓存。先写墓碑记录，再按 `document_id + source_version` 删除，最后通过反向查询确认没有残留。不要只删数据库行而留下仍可被召回的向量。

## 权限必须做两次

检索阶段用 `tenant_id` 与 ACL 过滤，减少越权候选；结果返回前，后端依据当前身份再次授权，防止索引权限滞后。ACL 更新应触发增量重建或权限字段更新，并清理包含旧结果的查询缓存。

## 发布与回滚

Parser、Chunker 或 Embedding 变更通常不兼容，应写入新索引而非原地覆盖。影子索引通过文档数、Chunk 数、失败率、Recall@K、权限用例和引用回链验收后，再切换 Alias。旧索引保留一个回滚窗口，且查询 Trace 记录所用索引版本。

## 参考资料

- [Elasticsearch Aliases](https://www.elastic.co/guide/en/elasticsearch/reference/current/aliases.html)
- [Milvus Manage Collections](https://milvus.io/docs/manage-collections.md)
- [OWASP Vector and Embedding Weaknesses](https://genai.owasp.org/llmrisk/llm082025-vector-and-embedding-weaknesses/)

