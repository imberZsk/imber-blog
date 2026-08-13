# 数据与中间件（03） - MongoDB 文档模型与聚合

> 读完你能：围绕一起读取和更新的数据设计文档，并判断何时关系数据库更合适。

## 核心知识清单

- MongoDB Document、Collection 与 BSON
- 嵌入、引用与文档边界
- 单文档原子性与多文档事务
- 复合、多键与 TTL 索引
- Aggregation Pipeline
- Schema Validation、分片与副本集

## 建模原则

经常一起读取、生命周期一致且大小有界的数据适合嵌入；高基数、无限增长或独立更新的数据应引用。MongoDB 提供灵活 Schema，不等于无需 Schema，生产集合应设置验证规则和版本迁移。多文档事务可用，但如果每次操作都依赖复杂跨集合事务，关系模型通常更自然。

聚合管道尽早 `$match` 和 `$project`，并用执行计划确认索引。数组字段产生多键索引，要关注组合限制和文档大小。

## 参考资料

- [MongoDB Data Modeling](https://www.mongodb.com/docs/manual/data-modeling/)
- [MongoDB Aggregation](https://www.mongodb.com/docs/manual/aggregation/)

