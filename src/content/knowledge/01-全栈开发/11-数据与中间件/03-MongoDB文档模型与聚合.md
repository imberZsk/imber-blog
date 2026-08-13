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

## 建模例子

订单地址与下单快照生命周期一致、读取时总随订单出现，适合嵌入；订单事件会持续增长且需要独立分页，使用单独集合并以 `order_id + sequence` 建唯一索引。不要把所有事件无限追加到订单数组，否则文档增长会触发移动、写放大并逼近 BSON 大小上限。

聚合先 `$match` 租户和时间，再 `$project` 必要字段，最后 `$group`。在分片集合中，Shard Key 要同时考虑路由、写入分布和不可变性；只用递增时间可能形成热点，只用随机键又会让租户查询广播。

## 故障与迁移

灵活 Schema 容易让新旧字段同时存在。写入携带 `schema_version`，读取兼容有限版本，后台批量迁移并统计剩余数量；完成后再收紧 Validator。若聚合突然占满内存，查看早期过滤是否生效和是否丢失索引；若副本切换后读到旧数据，检查 Read Concern 与业务允许的陈旧度；若 TTL 文档没有准时删除，记住 TTL 清理是后台近似任务，不能拿它实现精确业务调度。

## 参考资料

- [MongoDB Data Modeling](https://www.mongodb.com/docs/manual/data-modeling/)
- [MongoDB Aggregation](https://www.mongodb.com/docs/manual/aggregation/)
