# 文档切分（05） - LangChain Splitter 选型：递归、结构化、Token 与语义分块

> 读完后，你应能完成以下任务：
> - 绘制“RAG（13） - LangChain Splitter 选型：递归、结构化、Token 与语义分块 / 默认方案与升级条件”的关键对象与数据流，解释“RecursiveCharacterTextSplitter 是普通文本的稳健起点：先尝试段落和句子等大边界，”，并用源码位置、日志或 Trace 标注证据。
> - 为“RAG（13） - LangChain Splitter 选型：递归、结构化、Token 与语义分块 / 中文递归分块示例”设计正常与异常输入，验证“接真实模型时应使用对应 Tokenizer，否则中文字符数与 Token 预算会偏离。”，输出首个偏差位置与回归测试结果。
> - 实现“RAG（13） - LangChain Splitter 选型：递归、结构化、Token 与语义分块 / 标题分块与父子块”的最小代码或配置，检验“若答案需要完整条款，保存父块正文：子块负责精准召回，父块负责生成上下文。”，输出命令、结果与 Diff，并说明不适用边界。

> 更新日期：2026/08/11

<!-- article-progressive-block:start -->
# 一、先建立全局：LangChain Splitter 选型：递归、结构化、Token 与语义分块 是什么？

理解“LangChain Splitter 选型：递归、结构化、Token 与语义分块”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“LangChain Splitter 选型：递归、结构化、Token 与语义分块”的第一个核心判断是：RecursiveCharacterTextSplitter 是普通文本的稳健起点：先尝试段落和句子等大边界，。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | 默认方案与升级条件 | RecursiveCharacterTextSplitter 是普通文本的稳健起点：先尝试段落和句子等大边界， |
| 2 | 中文递归分块示例 | 接真实模型时应使用对应 Tokenizer，否则中文字符数与 Token 预算会偏离。 |
| 3 | 标题分块与父子块 | 若答案需要完整条款，保存父块正文：子块负责精准召回，父块负责生成上下文。 |
| 4 | 如何选择参数 | 比较 Recall@5/10、MRR 与正确条件完整率。 -> 统计 Chunk 数量、P50/P95 Token、重复率和索引成本。 -> 记录在线 Rerank 候选数、Context Token 与 P95。 -> 对表格、代码、否定/例外条件单独分组分析。 |
| 5 | 容易忽略的边界 | 列表项之间可能共享前置条件，不能每项完全孤立。 |
| 6 | 仍超长才降级到小分隔符 | 仍超长才降级到小分隔符。 |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["默认方案与升级条件"] --> S2
  S2["中文递归分块示例"] --> S3
  S3["标题分块与父子块"] --> S4
  S4["如何选择参数"] --> S5
  S5["容易忽略的边界"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“LangChain Splitter 选型：递归、结构化、Token 与语义分块”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“LangChain Splitter 选型：递归、结构化、Token 与语义分块”的对象和顺序已经明确后，再看可观察的失败：解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、默认方案与升级条件

`RecursiveCharacterTextSplitter` 是普通文本的稳健起点：先尝试段落和句子等大边界，
仍超长才降级到小分隔符。
它不是所有文档的终点：Markdown 应先按标题、代码应先按函数/类、HTML 应先按 DOM、表格应保留行列关系。

| 策略 | 适合 | 主要风险 |
| --- | --- | --- |
| 固定字符 | 数据流 Demo、无结构短文本 | 切断句子与业务条件 |
| 递归字符 | 普通说明文、FAQ | 不理解标题和代码语法 |
| Token | 严格控制模型窗口 | 仍可能切断语义 |
| Markdown/HTML Header | 有明确标题结构 | 标题下大块仍需二次切 |
| 代码语法 | 源代码、API 示例 | 跨函数调用上下文不足 |
| 语义分块 | 主题变化明显的长文 | 成本高、边界和版本不稳定 |

# 三、中文递归分块示例

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 单块最大 Token/字符近似值；生产应使用目标模型 Tokenizer 计数。
CHUNK_SIZE = 500
# 只用于保护边界的重叠长度。
CHUNK_OVERLAP = 80
# 从大结构到小结构的中文分隔符优先级。
CHINESE_SEPARATORS = ["\n\n", "\n", "。", "；", "，", " ", ""]

# 普通中文文档的默认递归分块器。
splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=CHINESE_SEPARATORS,
    length_function=len,
)
# 待切分的制度文档示例。
text = "第一条 适用范围。\n本制度适用于正式员工；外包人员按合同约定执行。"
# 切分得到的可检索正文列表。
chunks = splitter.split_text(text)
print(chunks)
```

示例用字符数便于运行；
接真实模型时应使用对应 Tokenizer，否则中文字符数与 Token 预算会偏离。

# 四、标题分块与父子块

Markdown 可先由 Header Splitter 得到标题单元，
再对超长单元做递归切分。
每个子块继承 `Header 1/2/3`，检索时把标题与正文一起编码。
若答案需要完整条款，保存父块正文：子块负责精准召回，父块负责生成上下文。

Overlap 不能替代父子块。
大比例重叠会扩大索引、制造重复候选，让同一文档挤占 Top K。

# 五、如何选择参数

准备同一批问题和正确证据，针对候选配置运行离线实验：

1. 比较 Recall@5/10、MRR 与正确条件完整率。
2. 统计 Chunk 数量、P50/P95 Token、重复率和索引成本。
3. 记录在线 Rerank 候选数、Context Token 与 P95。
4. 对表格、代码、否定/例外条件单独分组分析。
5. 只保留在质量或成本上有明确优势的策略。

不能根据“块看起来差不多”决定参数，也不能只在一篇文档上调到最好。

# 六、容易忽略的边界

- 工具调用 JSON、代码围栏和表格不要在结构内部切断。
- 标题很短但提供主题，Embedding 时应拼接标题，展示时仍保留正文来源。
- 列表项之间可能共享前置条件，不能每项完全孤立。
- PDF 页码边界不一定是语义边界，跨页段落应先合并。
- 更换 Splitter 或参数就是索引版本变化，要可重建、对比和回滚。

## 验收清单

- 没有空 Chunk、超 Token Chunk 和异常大面积重叠。
- 标题、来源、页码、权限随每个子块保存。
- 关键句、否定条件、函数和表格结构不被破坏。
- 同一输入与配置重复运行得到稳定 ID。
- 参数变化在固定评测集上有 Recall/成本证据。

<!-- article-progressive-block:start -->
# 七、动手验证：先跑通 LangChain Splitter 选型：递归、结构化、Token 与语义分块，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“LangChain Splitter 选型：递归、结构化、Token 与语义分块”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 7.1 基线与候选只允许一个变量不同

验证“LangChain Splitter 选型：递归、结构化、Token 与语义分块”时，先固定标注查询集、原文与 chunk 快照、Embedding 和索引版本、权限身份。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“LangChain Splitter 选型：递归、结构化、Token 与语义分块”时，动作是：依次回放解析、切分、召回、过滤、重排、上下文组装和引用生成。原始结果不能只保留截图或汇总分数，必须同步保存：原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 标注查询集、原文与 chunk 快照、Embedding 和索引版本、权限身份 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 通过阈值 | 正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料 |
| 立即停止 | 解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 |

## 7.2 执行前先排除不可比较条件

“LangChain Splitter 选型：递归、结构化、Token 与语义分块”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“LangChain Splitter 选型：递归、结构化、Token 与语义分块”的当前环境重复运行。
- 候选只改变一个与“LangChain Splitter 选型：递归、结构化、Token 与语义分块”结论直接相关的条件。
- “LangChain Splitter 选型：递归、结构化、Token 与语义分块”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “LangChain Splitter 选型：递归、结构化、Token 与语义分块”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 7.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“LangChain Splitter 选型：递归、结构化、Token 与语义分块”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 标注查询集、原文与 chunk 快照、Embedding 和索引版本、权限身份 |
| 过程可回放 | 依次回放解析、切分、召回、过滤、重排、上下文组装和引用生成 |
| 结果可审计 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |

“LangChain Splitter 选型：递归、结构化、Token 与语义分块”的一次合格基线对照按以下顺序执行：

1. 保存“LangChain Splitter 选型：递归、结构化、Token 与语义分块”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“LangChain Splitter 选型：递归、结构化、Token 与语义分块”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“LangChain Splitter 选型：递归、结构化、Token 与语义分块”：依次回放解析、切分、召回、过滤、重排、上下文组装和引用生成。
4. 为“LangChain Splitter 选型：递归、结构化、Token 与语义分块”保存：原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace。
5. 使用“LangChain Splitter 选型：递归、结构化、Token 与语义分块”预登记条件判断：正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料。
6. 如果“LangChain Splitter 选型：递归、结构化、Token 与语义分块”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 八、用一张矩阵验证 LangChain Splitter 选型：递归、结构化、Token 与语义分块 的关键结论

矩阵按正文顺序列出“LangChain Splitter 选型：递归、结构化、Token 与语义分块”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| 默认方案与升级条件 | RecursiveCharacterTextSplitter 是普通文本的稳健起点：先尝试段落和句子等大边界， | 只改变与“默认方案与升级条件”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 中文递归分块示例 | 接真实模型时应使用对应 Tokenizer，否则中文字符数与 Token 预算会偏离。 | 只改变与“中文递归分块示例”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 标题分块与父子块 | 若答案需要完整条款，保存父块正文：子块负责精准召回，父块负责生成上下文。 | 只改变与“标题分块与父子块”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 如何选择参数 | 比较 Recall@5/10、MRR 与正确条件完整率。 -> 统计 Chunk 数量、P50/P95 Token、重复率和索引成本。 -> 记录在线 Rerank 候选数、Context Token 与 P95。 -> 对表格、代码、否定/例外条件单独分组分析。 | 只改变与“如何选择参数”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 容易忽略的边界 | 列表项之间可能共享前置条件，不能每项完全孤立。 | 只改变与“容易忽略的边界”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 仍超长才降级到小分隔符 | 仍超长才降级到小分隔符。 | 只改变与“仍超长才降级到小分隔符”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |

## 8.1 记录本次实际实验

下面的记录用于“LangChain Splitter 选型：递归、结构化、Token 与语义分块”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "LangChain Splitter 选型：递归、结构化、Token 与语义分块"
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

## 8.2 边界实验必须证明能够停止和恢复

成功路径只能证明“LangChain Splitter 选型：递归、结构化、Token 与语义分块”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace | 正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“LangChain Splitter 选型：递归、结构化、Token 与语义分块”，第一步是：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“LangChain Splitter 选型：递归、结构化、Token 与语义分块”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 九、LangChain Splitter 选型：递归、结构化、Token 与语义分块 的结果解释

解释“LangChain Splitter 选型：递归、结构化、Token 与语义分块”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 | 先执行：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链 |
| 异常链路无法恢复 | 解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 | 先执行：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“LangChain Splitter 选型：递归、结构化、Token 与语义分块”只有同时满足“正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料”，并且没有出现“解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“LangChain Splitter 选型：递归、结构化、Token 与语义分块”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“LangChain Splitter 选型：递归、结构化、Token 与语义分块”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 十、LangChain Splitter 选型：递归、结构化、Token 与语义分块 的发布判断

发布判断需要把“LangChain Splitter 选型：递归、结构化、Token 与语义分块”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “LangChain Splitter 选型：递归、结构化、Token 与语义分块”的基线与候选只存在一个计划内变量。
- [ ] “LangChain Splitter 选型：递归、结构化、Token 与语义分块”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “LangChain Splitter 选型：递归、结构化、Token 与语义分块”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “LangChain Splitter 选型：递归、结构化、Token 与语义分块”的原始输出、中间状态和失败现场已经保留。
- [ ] “LangChain Splitter 选型：递归、结构化、Token 与语义分块”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “LangChain Splitter 选型：递归、结构化、Token 与语义分块”的停止条件、负责人和回滚入口已经演练。
- [ ] “LangChain Splitter 选型：递归、结构化、Token 与语义分块”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“LangChain Splitter 选型：递归、结构化、Token 与语义分块”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 十一、总结

- **默认方案与升级条件**：RecursiveCharacterTextSplitter 是普通文本的稳健起点：先尝试段落和句子等大边界，仍超长才降级到小分隔符。
- **中文递归分块示例**：接真实模型时应使用对应 Tokenizer，否则中文字符数与 Token 预算会偏离。
- **标题分块与父子块**：若答案需要完整条款，保存父块正文：子块负责精准召回，父块负责生成上下文。
- **如何选择参数**：比较 Recall@5/10、MRR 与正确条件完整率。 -> 统计 Chunk 数量、P50/P95 Token、重复率和索引成本。 -> 记录在线 Rerank 候选数、Context Token 与 P95。 -> 对表格、代码、否定/例外条件单独分组分析。
- **容易忽略的边界**：列表项之间可能共享前置条件，不能每项完全孤立。

## 参考资料

- [LangChain Text splitters](https://docs.langchain.com/oss/python/integrations/splitters)
- [LangChain RecursiveCharacterTextSplitter](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter)

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)
