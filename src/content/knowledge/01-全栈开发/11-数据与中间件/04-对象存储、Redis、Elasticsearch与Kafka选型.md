# 数据与中间件（04） - 对象存储、Redis、Elasticsearch 与 Kafka 选型

> 读完你能：区分对象、缓存、搜索和事件日志的职责，并设计从主库更新派生系统的可靠链路。

## 核心知识清单

- S3 兼容对象存储、Key、元数据与签名 URL
- Redis 缓存、TTL、淘汰与热点保护
- Elasticsearch 倒排索引、Mapping 与近实时刷新
- Kafka Topic、Partition、Offset 与 Consumer Group
- Cache Aside、CDC、Outbox 与索引重建
- 幂等消费、重放、删除传播与灾难恢复

## 选型边界

大文件正文放对象存储，数据库保存所有权和元数据；Redis 保存可丢失或可重建的低延迟状态；Elasticsearch 保存面向搜索的派生文档；Kafka 保存可顺序重放的事件流。它们都不应默认取代主业务数据库。

主库事务同时写业务数据和 Outbox，再异步发布事件更新缓存、索引和对象元数据。消费者以业务 ID 和版本做幂等，允许重放；删除事件与更新事件同等重要。任何派生系统都要有全量重建、进度校验和切换方案。

## 参考资料

- [Amazon S3 Concepts](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
- [Redis Data Types](https://redis.io/docs/latest/develop/data-types/)
- [Elasticsearch Indexing](https://www.elastic.co/guide/en/elasticsearch/reference/current/documents-indices.html)
- [Kafka Introduction](https://kafka.apache.org/documentation/#intro_concepts_and_terms)
