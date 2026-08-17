# RAG（06） - Elasticsearch 分词回归：让 BM25 召回可验证

> 读完后，你应能：
> - 能验证“中文 RAG 的 BM25 召回经常不是“ES 不行”，而是索引分词器、查询分词器或词典版本不一致”，并保存输入、输出与失败样本。
> - 能验证“上线前必须把分词结果变成可重复测试，而不是在控制台里肉眼看一次 _analyze”，并保存输入、输出与失败样本。
> - 能验证“analyzer：写入时拆分词元，决定倒排索引里保存什么”，并保存输入、输出与失败样本。


中文 RAG 的 BM25 召回经常不是“ES 不行”，而是索引分词器、查询分词器或词典版本不一致。上线前必须把分词结果变成可重复测试，而不是在控制台里肉眼看一次 `_analyze`。

<!-- article-progressive-block:start -->
# 一、先建立全局：Elasticsearch 分词回归：让 BM25 召回可验证 是什么？

理解“Elasticsearch 分词回归：让 BM25 召回可验证”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“Elasticsearch 分词回归：让 BM25 召回可验证”的第一个核心判断是：analyzer：写入时拆分词元，决定倒排索引里保存什么。。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | 测试对象 | analyzer：写入时拆分词元，决定倒排索引里保存什么。 |
| 2 | 可运行测试 | 执行：ELASTICSEARCH_URL=http://localhost:9200 INDEX_NAME=knowledge_chunks_v1 pytest -q。 |
| 3 | 从分词测试升级到召回测试 | 下一层应建立包含 query、expected_chunk_ids、tenant_id 的小型金标集，在与生产相同的权限过滤条件下检查 Recall@K。 |
| 4 | 生产避坑 | 修改 analyzer 不能原地改变已有倒排索引，必须新建版本化索引并重建数据。 -> 远程词典更新后要确认所有节点加载成功，再跑回归集； -> 错误码、订单号等精确值单独使用 keyword 子字段，不要只依赖中文分词。 -> _analyze 样本不要只有通顺句子，必须覆盖粘连词、大小写、连字符、版本号和中英文混排。 |
| 5 | 验收标准 | 分词样本 100% 通过只是发布门槛； |
| 6 | 中文 RAG 的 BM25 召回经常不是“ES 不行” | 中文 RAG 的 BM25 召回经常不是“ES 不行”，而是索引分词器、查询分词器或词典版本不一致。 |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["测试对象"] --> S2
  S2["可运行测试"] --> S3
  S3["从分词测试升级到召回测试"] --> S4
  S4["生产避坑"] --> S5
  S5["验收标准"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“Elasticsearch 分词回归：让 BM25 召回可验证”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“Elasticsearch 分词回归：让 BM25 召回可验证”的对象和顺序已经明确后，再看可观察的失败：解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、测试对象

- `analyzer`：写入时拆分词元，决定倒排索引里保存什么。
- `search_analyzer`：查询时拆分词元，决定用户问题拿什么去匹配。
- 领域词典：产品名、错误码、人名和缩写是否保持为期望词元。
- 版本一致性：集群每个节点是否加载相同插件和词典版本。

```mermaid
flowchart LR
    D[领域样本集] --> A[_analyze API]
    A --> T[实际词元]
    E[期望词元] --> C{集合与顺序校验}
    T --> C
    C -->|通过| G[允许创建新索引]
    C -->|失败| B[阻止发布并定位词典]
```


# 三、可运行测试

```text
# requirements.txt
elasticsearch>=8,<10
pytest>=8,<9
```

```python
from __future__ import annotations

import os

import pytest
from elasticsearch import Elasticsearch


# Elasticsearch 地址从环境变量读取，避免在代码中写连接信息。
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
# 待验证的索引名称，测试它最终生效的 analyzer 配置。
INDEX_NAME = os.getenv("INDEX_NAME", "knowledge_chunks_v1")
# 领域分词样本及必须出现的词元，新增业务术语时同步扩展。
ANALYZER_CASES = [
    ("支付失败错误码 PAY-1042", {"支付", "失败", "pay-1042"}),
    ("Visual Worktree 离线建库", {"visual worktree", "离线", "建库"}),
]


@pytest.fixture(scope="module")
def es_client() -> Elasticsearch:
    """创建测试模块共享的 ES 客户端，连接参数由环境变量控制。"""

    # 客户端仅用于当前分词回归，不在测试中修改索引。
    client = Elasticsearch(ELASTICSEARCH_URL, request_timeout=5)
    if not client.ping():
        pytest.skip("Elasticsearch is unavailable")
    return client


@pytest.mark.parametrize(("text", "expected_tokens"), ANALYZER_CASES)
def test_search_analyzer_keeps_domain_terms(
    es_client: Elasticsearch,
    text: str,
    expected_tokens: set[str],
) -> None:
    """校验领域文本的查询词元；text 是输入，expected_tokens 是最低期望集合。"""

    # `_analyze` 返回当前索引实际生效的查询分词结果。
    response = es_client.indices.analyze(
        index=INDEX_NAME,
        body={"field": "content", "text": text},
    )
    # 统一小写后比较，避免英文大小写过滤器造成无意义失败。
    actual_tokens = {item["token"].lower() for item in response["tokens"]}
    assert expected_tokens <= actual_tokens
```

执行：`ELASTICSEARCH_URL=http://localhost:9200 INDEX_NAME=knowledge_chunks_v1 pytest -q`。

# 四、从分词测试升级到召回测试

分词正确不等于检索正确。下一层应建立包含 `query`、`expected_chunk_ids`、`tenant_id` 的小型金标集，在与生产相同的权限过滤条件下检查 Recall@K。分词回归负责快速定位词典和 analyzer，召回回归负责验证 mapping、BM25、字段权重和过滤器的组合结果。

# 五、生产避坑

1. 修改 analyzer 不能原地改变已有倒排索引，必须新建版本化索引并重建数据。
2. 远程词典更新后要确认所有节点加载成功，再跑回归集；节点版本不一致会产生随机召回。
3. 错误码、订单号等精确值单独使用 `keyword` 子字段，不要只依赖中文分词。
4. `_analyze` 样本不要只有通顺句子，必须覆盖粘连词、大小写、连字符、版本号和中英文混排。
5. 记录 ES 版本、插件版本、词典哈希和索引版本，Trace 才能复现线上坏案例。

# 六、验收标准

分词样本 100% 通过只是发布门槛；最终还需验证 BM25 Recall@10、权限零泄漏、索引切换无中断，以及回滚旧别名可在分钟级完成。

<!-- article-progressive-block:start -->
# 七、动手验证：先跑通 Elasticsearch 分词回归：让 BM25 召回可验证，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“Elasticsearch 分词回归：让 BM25 召回可验证”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 7.1 基线与候选只允许一个变量不同

验证“Elasticsearch 分词回归：让 BM25 召回可验证”时，先固定标注查询集、原文与 chunk 快照、Embedding 和索引版本、权限身份。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“Elasticsearch 分词回归：让 BM25 召回可验证”时，动作是：依次回放解析、切分、召回、过滤、重排、上下文组装和引用生成。原始结果不能只保留截图或汇总分数，必须同步保存：原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 标注查询集、原文与 chunk 快照、Embedding 和索引版本、权限身份 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 通过阈值 | 正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料 |
| 立即停止 | 解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 |

## 7.2 执行前先排除不可比较条件

“Elasticsearch 分词回归：让 BM25 召回可验证”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“Elasticsearch 分词回归：让 BM25 召回可验证”的当前环境重复运行。
- 候选只改变一个与“Elasticsearch 分词回归：让 BM25 召回可验证”结论直接相关的条件。
- “Elasticsearch 分词回归：让 BM25 召回可验证”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “Elasticsearch 分词回归：让 BM25 召回可验证”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 7.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“Elasticsearch 分词回归：让 BM25 召回可验证”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 标注查询集、原文与 chunk 快照、Embedding 和索引版本、权限身份 |
| 过程可回放 | 依次回放解析、切分、召回、过滤、重排、上下文组装和引用生成 |
| 结果可审计 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |

“Elasticsearch 分词回归：让 BM25 召回可验证”的一次合格基线对照按以下顺序执行：

1. 保存“Elasticsearch 分词回归：让 BM25 召回可验证”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“Elasticsearch 分词回归：让 BM25 召回可验证”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“Elasticsearch 分词回归：让 BM25 召回可验证”：依次回放解析、切分、召回、过滤、重排、上下文组装和引用生成。
4. 为“Elasticsearch 分词回归：让 BM25 召回可验证”保存：原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace。
5. 使用“Elasticsearch 分词回归：让 BM25 召回可验证”预登记条件判断：正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料。
6. 如果“Elasticsearch 分词回归：让 BM25 召回可验证”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 八、用一张矩阵验证 Elasticsearch 分词回归：让 BM25 召回可验证 的关键结论

矩阵按正文顺序列出“Elasticsearch 分词回归：让 BM25 召回可验证”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| 测试对象 | analyzer：写入时拆分词元，决定倒排索引里保存什么。 | 只改变与“测试对象”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 可运行测试 | 执行：ELASTICSEARCH_URL=http://localhost:9200 INDEX_NAME=knowledge_chunks_v1 pytest -q。 | 只改变与“可运行测试”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 从分词测试升级到召回测试 | 下一层应建立包含 query、expected_chunk_ids、tenant_id 的小型金标集，在与生产相同的权限过滤条件下检查 Recall@K。 | 只改变与“从分词测试升级到召回测试”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 生产避坑 | 修改 analyzer 不能原地改变已有倒排索引，必须新建版本化索引并重建数据。 -> 远程词典更新后要确认所有节点加载成功，再跑回归集； -> 错误码、订单号等精确值单独使用 keyword 子字段，不要只依赖中文分词。 -> _analyze 样本不要只有通顺句子，必须覆盖粘连词、大小写、连字符、版本号和中英文混排。 | 只改变与“生产避坑”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 验收标准 | 分词样本 100% 通过只是发布门槛； | 只改变与“验收标准”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 中文 RAG 的 BM25 召回经常不是“ES 不行” | 中文 RAG 的 BM25 召回经常不是“ES 不行”，而是索引分词器、查询分词器或词典版本不一致。 | 只改变与“中文 RAG 的 BM25 召回经常不是“ES 不行””相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |

## 8.1 记录本次实际实验

下面的记录用于“Elasticsearch 分词回归：让 BM25 召回可验证”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "Elasticsearch 分词回归：让 BM25 召回可验证"
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

成功路径只能证明“Elasticsearch 分词回归：让 BM25 召回可验证”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace | 正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“Elasticsearch 分词回归：让 BM25 召回可验证”，第一步是：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“Elasticsearch 分词回归：让 BM25 召回可验证”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 九、Elasticsearch 分词回归：让 BM25 召回可验证 的结果解释

解释“Elasticsearch 分词回归：让 BM25 召回可验证”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 | 先执行：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链 |
| 异常链路无法恢复 | 解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 | 先执行：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“Elasticsearch 分词回归：让 BM25 召回可验证”只有同时满足“正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料”，并且没有出现“解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“Elasticsearch 分词回归：让 BM25 召回可验证”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“Elasticsearch 分词回归：让 BM25 召回可验证”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 十、Elasticsearch 分词回归：让 BM25 召回可验证 的发布判断

发布判断需要把“Elasticsearch 分词回归：让 BM25 召回可验证”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “Elasticsearch 分词回归：让 BM25 召回可验证”的基线与候选只存在一个计划内变量。
- [ ] “Elasticsearch 分词回归：让 BM25 召回可验证”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “Elasticsearch 分词回归：让 BM25 召回可验证”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “Elasticsearch 分词回归：让 BM25 召回可验证”的原始输出、中间状态和失败现场已经保留。
- [ ] “Elasticsearch 分词回归：让 BM25 召回可验证”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “Elasticsearch 分词回归：让 BM25 召回可验证”的停止条件、负责人和回滚入口已经演练。
- [ ] “Elasticsearch 分词回归：让 BM25 召回可验证”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“Elasticsearch 分词回归：让 BM25 召回可验证”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 十一、总结

- **测试对象**：analyzer：写入时拆分词元，决定倒排索引里保存什么。
- **可运行测试**：执行：ELASTICSEARCH_URL=http://localhost:9200 INDEX_NAME=knowledge_chunks_v1 pytest -q。
- **从分词测试升级到召回测试**：下一层应建立包含 query、expected_chunk_ids、tenant_id 的小型金标集，在与生产相同的权限过滤条件下检查 Recall@K。
- **生产避坑**：修改 analyzer 不能原地改变已有倒排索引，必须新建版本化索引并重建数据。 -> 远程词典更新后要确认所有节点加载成功，再跑回归集； -> 错误码、订单号等精确值单独使用 keyword 子字段，不要只依赖中文分词。 -> _analyze 样本不要只有通顺句子，必须覆盖粘连词、大小写、连字符、版本号和中英文混排。
- **验收标准**：分词样本 100% 通过只是发布门槛；

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)
