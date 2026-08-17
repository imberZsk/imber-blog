# RAG（24） - Parent-Child、Contextual Compression 与动态检索

> 读完后，你应能完成以下任务：
> - 绘制“RAG（30） - Parent-Child、Contextual Compression 与动态检索 / 三个常见矛盾”的关键对象与数据流，解释“必须对父块去重并限制总 Token。”，并用源码位置、日志或 Trace 标注证据。
> - 为“RAG（30） - Parent-Child、Contextual Compression 与动态检索 / 选择链路”设计正常与异常输入，验证“单事实问题：BM25 + 向量混合召回，Rerank 后生成。 -> 表达模糊：MultiQuery 或 HyDE 扩展查询，再做融合去重。 -> 需要上下段：Parent-Child 返回父块。 -> 跨文档多跳：先查询分解或图检索，再逐步组合证据。”，输出首个偏差位置与回归测试结果。
> - 实现“RAG（30） - Parent-Child、Contextual Compression 与动态检索 / 评测不能只看最终答案”的最小代码或配置，检验“才能知道复杂度是否真正带来收益。”，输出命令、结果与 Diff，并说明不适用边界。

> 固定 Chunk、固定 Top-K 和固定检索器只能覆盖平均问题；复杂 RAG 需要根据查询类型改变召回粒度、路数和上下文预算。


## 核心知识清单

- Parent-Child Retrieval 与小块召回、大块返回
- Contextual Compression 与证据保真
- 查询分类、动态 Top-K 与预算控制
- MultiQuery、HyDE、BM25、向量与图检索路由
- 2-Step RAG、Hybrid RAG 与 Agentic RAG
- 检索 Trace、消融实验与失败归因

<!-- article-progressive-block:start -->
# 一、先建立全局：Parent-Child、Contextual Compression 与动态检索 是什么？

理解“Parent-Child、Contextual Compression 与动态检索”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“Parent-Child、Contextual Compression 与动态检索”的第一个核心判断是：必须对父块去重并限制总 Token。。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | 三个常见矛盾 | 必须对父块去重并限制总 Token。 |
| 2 | 选择链路 | 单事实问题：BM25 + 向量混合召回，Rerank 后生成。 -> 表达模糊：MultiQuery 或 HyDE 扩展查询，再做融合去重。 -> 需要上下段：Parent-Child 返回父块。 -> 跨文档多跳：先查询分解或图检索，再逐步组合证据。 |
| 3 | 评测不能只看最终答案 | 才能知道复杂度是否真正带来收益。 |
| 4 | 查询分类、动态 Top-K 与预算控制 | 只有在检索步骤必须由运行反馈动态决定时，才使用 Agentic RAG。 |
| 5 | Step RAG、Hybrid RAG 与 Agentic RAG | 只有在检索步骤必须由运行反馈动态决定时，才使用 Agentic RAG。 |
| 6 | 检索 Trace、消融实验与失败归因 | 只有在检索步骤必须由运行反馈动态决定时，才使用 Agentic RAG。 |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["三个常见矛盾"] --> S2
  S2["选择链路"] --> S3
  S3["评测不能只看最终答案"] --> S4
  S4["查询分类、动态 Top-K 与预算控制"] --> S5
  S5["Step RAG、Hybrid RAG 与 Agentic RAG"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“Parent-Child、Contextual Compression 与动态检索”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“Parent-Child、Contextual Compression 与动态检索”的对象和顺序已经明确后，再看可观察的失败：解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、三个常见矛盾

小 Chunk 更容易精确匹配，但上下文不完整；
大 Chunk 语义完整，却可能稀释匹配信号。
Parent-Child 用小块建索引，
命中后返回所属父块，
必须对父块去重并限制总 Token。

Top-K 太小容易漏证据，太大则增加噪声、成本和 Lost in the Middle。
动态 Top-K 可以依据问题类型、首轮分数间隔、结果多样性和预算调整，
但上限必须由延迟与上下文 SLO 约束。

Contextual Compression 可以从长证据中抽取相关句，
但压缩器可能删掉否定词、条件和例外。
生产中应保留原始 Chunk ID、压缩前后文本和偏移，引用最终回链原文。

# 三、选择链路

1. 单事实问题：BM25 + 向量混合召回，Rerank 后生成。
2. 表达模糊：MultiQuery 或 HyDE 扩展查询，再做融合去重。
3. 需要上下段：Parent-Child 返回父块。
4. 跨文档多跳：先查询分解或图检索，再逐步组合证据。
5. 只有在检索步骤必须由运行反馈动态决定时，才使用 Agentic RAG。

# 四、评测不能只看最终答案

分别记录各路候选、过滤原因、融合分数、Rerank 次序、装配 Token 和最终引用。
用消融实验逐个关闭查询改写、关键词路、向量路或压缩器，
比较 Recall@K、NDCG、引用正确率、延迟与成本，
才能知道复杂度是否真正带来收益。

<!-- article-progressive-block:start -->
# 五、动手验证：先跑通 Parent-Child、Contextual Compression 与动态检索，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“Parent-Child、Contextual Compression 与动态检索”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 5.1 基线与候选只允许一个变量不同

验证“Parent-Child、Contextual Compression 与动态检索”时，先固定标注查询集、原文与 chunk 快照、Embedding 和索引版本、权限身份。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“Parent-Child、Contextual Compression 与动态检索”时，动作是：依次回放解析、切分、召回、过滤、重排、上下文组装和引用生成。原始结果不能只保留截图或汇总分数，必须同步保存：原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 标注查询集、原文与 chunk 快照、Embedding 和索引版本、权限身份 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 通过阈值 | 正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料 |
| 立即停止 | 解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 |

## 5.2 执行前先排除不可比较条件

“Parent-Child、Contextual Compression 与动态检索”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“Parent-Child、Contextual Compression 与动态检索”的当前环境重复运行。
- 候选只改变一个与“Parent-Child、Contextual Compression 与动态检索”结论直接相关的条件。
- “Parent-Child、Contextual Compression 与动态检索”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “Parent-Child、Contextual Compression 与动态检索”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 5.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“Parent-Child、Contextual Compression 与动态检索”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 标注查询集、原文与 chunk 快照、Embedding 和索引版本、权限身份 |
| 过程可回放 | 依次回放解析、切分、召回、过滤、重排、上下文组装和引用生成 |
| 结果可审计 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |

“Parent-Child、Contextual Compression 与动态检索”的一次合格基线对照按以下顺序执行：

1. 保存“Parent-Child、Contextual Compression 与动态检索”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“Parent-Child、Contextual Compression 与动态检索”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“Parent-Child、Contextual Compression 与动态检索”：依次回放解析、切分、召回、过滤、重排、上下文组装和引用生成。
4. 为“Parent-Child、Contextual Compression 与动态检索”保存：原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace。
5. 使用“Parent-Child、Contextual Compression 与动态检索”预登记条件判断：正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料。
6. 如果“Parent-Child、Contextual Compression 与动态检索”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 六、用一张矩阵验证 Parent-Child、Contextual Compression 与动态检索 的关键结论

矩阵按正文顺序列出“Parent-Child、Contextual Compression 与动态检索”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| 三个常见矛盾 | 必须对父块去重并限制总 Token。 | 只改变与“三个常见矛盾”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 选择链路 | 单事实问题：BM25 + 向量混合召回，Rerank 后生成。 -> 表达模糊：MultiQuery 或 HyDE 扩展查询，再做融合去重。 -> 需要上下段：Parent-Child 返回父块。 -> 跨文档多跳：先查询分解或图检索，再逐步组合证据。 | 只改变与“选择链路”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 评测不能只看最终答案 | 才能知道复杂度是否真正带来收益。 | 只改变与“评测不能只看最终答案”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 查询分类、动态 Top-K 与预算控制 | 只有在检索步骤必须由运行反馈动态决定时，才使用 Agentic RAG。 | 只改变与“查询分类、动态 Top-K 与预算控制”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| Step RAG、Hybrid RAG 与 Agentic RAG | 只有在检索步骤必须由运行反馈动态决定时，才使用 Agentic RAG。 | 只改变与“Step RAG、Hybrid RAG 与 Agentic RAG”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 检索 Trace、消融实验与失败归因 | 只有在检索步骤必须由运行反馈动态决定时，才使用 Agentic RAG。 | 只改变与“检索 Trace、消融实验与失败归因”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |

## 6.1 记录本次实际实验

下面的记录用于“Parent-Child、Contextual Compression 与动态检索”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "Parent-Child、Contextual Compression 与动态检索"
selected_chapter: required
claim_from_article: required
baseline_version: required
changed_condition: exactly_one
execution: "依次回放解析、切分、召回、过滤、重排、上下文组装和引用生成"
evidence: "原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace"
pass_when: "正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料"
stop_when: "解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论"
observed_result: required
first_deviation: null_or_evidence
recovery_replay: required_after_failure
```

## 6.2 边界实验必须证明能够停止和恢复

成功路径只能证明“Parent-Child、Contextual Compression 与动态检索”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace | 正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“Parent-Child、Contextual Compression 与动态检索”，第一步是：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“Parent-Child、Contextual Compression 与动态检索”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 七、Parent-Child、Contextual Compression 与动态检索 的结果解释

解释“Parent-Child、Contextual Compression 与动态检索”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 | 先执行：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链 |
| 异常链路无法恢复 | 解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 | 先执行：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“Parent-Child、Contextual Compression 与动态检索”只有同时满足“正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料”，并且没有出现“解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“Parent-Child、Contextual Compression 与动态检索”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“Parent-Child、Contextual Compression 与动态检索”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 八、Parent-Child、Contextual Compression 与动态检索 的发布判断

发布判断需要把“Parent-Child、Contextual Compression 与动态检索”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “Parent-Child、Contextual Compression 与动态检索”的基线与候选只存在一个计划内变量。
- [ ] “Parent-Child、Contextual Compression 与动态检索”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “Parent-Child、Contextual Compression 与动态检索”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “Parent-Child、Contextual Compression 与动态检索”的原始输出、中间状态和失败现场已经保留。
- [ ] “Parent-Child、Contextual Compression 与动态检索”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “Parent-Child、Contextual Compression 与动态检索”的停止条件、负责人和回滚入口已经演练。
- [ ] “Parent-Child、Contextual Compression 与动态检索”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“Parent-Child、Contextual Compression 与动态检索”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 九、总结

- **三个常见矛盾**：Parent-Child 用小块建索引，命中后返回所属父块，必须对父块去重并限制总 Token。
- **选择链路**：单事实问题：BM25 + 向量混合召回，Rerank 后生成。 -> 表达模糊：MultiQuery 或 HyDE 扩展查询，再做融合去重。 -> 需要上下段：Parent-Child 返回父块。 -> 跨文档多跳：先查询分解或图检索，再逐步组合证据。
- **评测不能只看最终答案**：用消融实验逐个关闭查询改写、关键词路、向量路或压缩器，比较 Recall@K、NDCG、引用正确率、延迟与成本，才能知道复杂度是否真正带来收益。
- **Parent-Child Retrieval 与小块召回、大块返回**：Parent-Child 用小块建索引，命中后返回所属父块，必须对父块去重并限制总 Token。
- **查询分类、动态 Top-K 与预算控制**：动态 Top-K 可以依据问题类型、首轮分数间隔、结果多样性和预算调整，但上限必须由延迟与上下文 SLO 约束。
- **MultiQuery、HyDE、BM25、向量与图检索路由**：用消融实验逐个关闭查询改写、关键词路、向量路或压缩器，比较 Recall@K、NDCG、引用正确率、延迟与成本，才能知道复杂度是否真正带来收益。

## 参考资料

- [LangChain Parent Document Retriever](https://python.langchain.com/docs/how_to/parent_document_retriever/)
- [LangChain Contextual Compression](https://python.langchain.com/docs/how_to/contextual_compression/)
- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
