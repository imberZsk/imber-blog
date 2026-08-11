# AI 应用开发在线实验套件

这套浏览器实验覆盖企业 RAG、检索、评测、可观测性、生产稳定性和多 Agent 等 17 个核心场景。每个场景都支持参数调整和典型故障注入。

## 覆盖内容

- AA-01 至 AA-07：企业 RAG 全链路、Chunking、Embedding、BM25、混合检索、ACL 与增量索引
- AA-08 至 AA-13：Trace 排障、模型容错、查询改写、Rerank、RAG 评测与异步建库
- AA-14 至 AA-17：DeepAgents、GraphRAG、多模态 RAG 与语义缓存

## 真实执行与模拟边界

页面中的 BM25、RRF、成本、并发、重试、缓存和评测指标均由当前参数实时计算。ES、Redis、Milvus、LangSmith、LangFuse 和模型 API 不会从浏览器直连，相关阶段使用确定性数据模拟生产机制，避免泄露密钥或让公共文章拥有集群写权限。
