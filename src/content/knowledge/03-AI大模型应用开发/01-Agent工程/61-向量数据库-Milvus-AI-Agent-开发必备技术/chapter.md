# 向量数据库 Milvus：做 AI Agent 开发必备技术

> 读完你能：理解 Milvus 在大规模向量检索里的角色，以及它和 Chroma、pgvector 的取舍。
> 来源：`吃透 AI Agent 开发` 截图目录第 9 篇，2026/01/13，可试读 20%
> 导入与重写日期：2026/07/07

## 本篇定位

这是向量数据库的专项篇。23 讲基础概念，61 聚焦 Milvus 这种更偏生产规模的方案。

## 一个真实场景

几千条 chunk 用内存或 Chroma 很舒服；几十万、几百万条向量，还要分租户、按 metadata 过滤、动态增删，简单方案就开始吃力。Milvus 的定位就是为大规模向量检索提供更专业的存储、索引和查询能力。

## 核心拆解

- Milvus 里的核心对象是 collection，相当于一张向量表。字段通常包括 id、vector、text、source、tenant、permission 等。
- 索引决定检索性能。HNSW、IVF 等索引用速度换近似精度，参数要结合数据量和延迟目标调。
- 生产检索很少只查向量，还会叠加 metadata filter，比如 tenant_id、department、doc_type、status。

## 工程链路

- 设计 collection schema。
- 批量写入 chunk 和向量。
- 创建合适索引。
- 查询时传 query vector、topK 和过滤条件。
- 把命中结果和分数写入 trace。
- 用评测集调索引参数和阈值。

## 落地建议

- 小项目可以 Chroma 起步，生产规模再上 Milvus。
- 已有 PostgreSQL 技术栈且规模中等时，pgvector 是更轻的选择。
- 权限过滤要在检索阶段做，不能检索后再让模型判断。

## 常见坑

- 只关心能不能搜到，不记录召回分数和索引参数。
- 所有租户共用 collection 却没有过滤字段。
- embedding 模型升级后新旧向量混在一起。

## 和已有主线的关系

23 是向量数据库总览；61 是 Milvus 生产化视角，后续 62 会把它放进 RAG 实战。

## 复述答法

> Milvus 适合大规模向量检索：collection 存向量、文本和 metadata，索引用来提升 topK 查询速度，filter 用来做租户和权限隔离。选型上小 demo 可用 Chroma，中等规模可看 pgvector，大规模和高并发再考虑 Milvus。
