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

## 一条可靠更新链

上传文件时先在数据库创建 `PENDING` 元数据和对象 Key，客户端通过短时签名 URL 直传，服务端校验对象大小、类型和校验和后转为 `READY`。业务事务同时写 Outbox；发布器把 `DocumentChanged(version=7)` 发到 Kafka；搜索消费者只接受高于当前版本的事件并更新 Elasticsearch；缓存使用包含版本的 Key 或在事件后失效。

删除也走状态机：先禁止新读取，发布 Tombstone，消费者删除搜索文档和缓存，最后按保留期删除对象。对账任务按业务 ID 比较数据库、对象头信息和索引版本，缺失项可重放。不能只在成功路径调用四个系统，那会在任一步超时后产生无法判断的半完成状态。

## 选型与故障表

| 需求 | 所有者 | 常见失败 | 恢复方式 |
| --- | --- | --- | --- |
| 大文件正文 | 对象存储 | 上传完成但元数据未确认 | 校验对象后推进状态或清理孤儿对象 |
| 毫秒级可重建状态 | Redis | 热点、穿透、过期风暴 | 请求合并、负缓存、TTL 抖动 |
| 全文与聚合搜索 | Elasticsearch | Mapping 错误、索引落后 | 新索引重建、Alias 原子切换 |
| 可重放事件 | Kafka | 重复、乱序、消费积压 | 幂等键、版本判断、按分区扩容 |

## 参考资料

- [Amazon S3 Concepts](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
- [Redis Data Types](https://redis.io/docs/latest/develop/data-types/)
- [Elasticsearch Indexing](https://www.elastic.co/guide/en/elasticsearch/reference/current/documents-indices.html)
- [Kafka Introduction](https://kafka.apache.org/documentation/#intro_concepts_and_terms)
