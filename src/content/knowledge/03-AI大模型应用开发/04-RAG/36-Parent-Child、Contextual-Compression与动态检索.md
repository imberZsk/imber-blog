# RAG（36） - Parent-Child、Contextual Compression 与动态检索

> 固定 Chunk、固定 Top-K 和固定检索器只能覆盖平均问题；复杂 RAG 需要根据查询类型改变召回粒度、路数和上下文预算。

> 读完你能：组合 Parent-Child Retrieval、Contextual Compression、动态 Top-K 与 2-Step RAG，并判断何时不应升级为 Agentic RAG。

## 核心知识清单

- Parent-Child Retrieval 与小块召回、大块返回
- Contextual Compression 与证据保真
- 查询分类、动态 Top-K 与预算控制
- MultiQuery、HyDE、BM25、向量与图检索路由
- 2-Step RAG、Hybrid RAG 与 Agentic RAG
- 检索 Trace、消融实验与失败归因

## 三个常见矛盾

小 Chunk 更容易精确匹配，但上下文不完整；大 Chunk 语义完整，却可能稀释匹配信号。Parent-Child 用小块建索引，命中后返回所属父块，必须对父块去重并限制总 Token。

Top-K 太小容易漏证据，太大则增加噪声、成本和 Lost in the Middle。动态 Top-K 可以依据问题类型、首轮分数间隔、结果多样性和预算调整，但上限必须由延迟与上下文 SLO 约束。

Contextual Compression 可以从长证据中抽取相关句，但压缩器可能删掉否定词、条件和例外。生产中应保留原始 Chunk ID、压缩前后文本和偏移，引用最终回链原文。

## 选择链路

1. 单事实问题：BM25 + 向量混合召回，Rerank 后生成。
2. 表达模糊：MultiQuery 或 HyDE 扩展查询，再做融合去重。
3. 需要上下段：Parent-Child 返回父块。
4. 跨文档多跳：先查询分解或图检索，再逐步组合证据。
5. 只有在检索步骤必须由运行反馈动态决定时，才使用 Agentic RAG。

## 评测不能只看最终答案

分别记录各路候选、过滤原因、融合分数、Rerank 次序、装配 Token 和最终引用。用消融实验逐个关闭查询改写、关键词路、向量路或压缩器，比较 Recall@K、NDCG、引用正确率、延迟与成本，才能知道复杂度是否真正带来收益。

## 参考资料

- [LangChain Parent Document Retriever](https://python.langchain.com/docs/how_to/parent_document_retriever/)
- [LangChain Contextual Compression](https://python.langchain.com/docs/how_to/contextual_compression/)
- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)

