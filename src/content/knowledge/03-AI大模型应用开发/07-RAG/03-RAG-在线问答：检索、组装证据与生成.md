# RAG（03） - RAG 在线问答：检索、组装证据与生成

> 读完后，你应能：
> - 能验证“在线链路只处理当前请求：理解问题 → 查询改写 → 权限过滤 → 召回 → 重排 → 组装 Context”，并保存输入、输出与失败样本。
> - 能验证“→ 模型生成 → 引用校验”，并保存输入、输出与失败样本。
> - 能验证“它读取离线索引，但不重新解析和向量化全部文档”，并保存输入、输出与失败样本。


在线链路只处理当前请求：**理解问题 → 查询改写 → 权限过滤 → 召回 → 重排 → 组装 Context
→ 模型生成 → 引用校验**。它读取离线索引，但不重新解析和向量化全部文档。

```mermaid
flowchart LR
    U[用户问题与身份] --> N[规范化/改写]
    N --> F[服务端权限过滤]
    F --> R[多路召回]
    R --> K[Rerank]
    K --> C[Context Packing]
    C --> G[LLM 生成]
    G --> V[引用与忠实度校验]
    V --> T[答案/拒答/追问]
```

<!-- article-progressive-block:start -->
# 一、先建立全局：RAG 在线问答：检索、组装证据与生成 是什么？

理解“RAG 在线问答：检索、组装证据与生成”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“RAG 在线问答：检索、组装证据与生成”的第一个核心判断是：K”，生成阶段再回答“答案是否忠于证据”。。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | 检索和生成要分开验收 | K”，生成阶段再回答“答案是否忠于证据”。 |
| 2 | 可执行示例 | 先运行上一课生成 rag-index.json，再把下面代码保存为 ask_index.py，执行 |
| 3 | 在线链路的关键保护 | Prompt 中把检索内容视为资料，不允许其中的指令覆盖系统规则。 |
| 4 | 在线链路只处理当前请求 | 在线链路只处理当前请求：理解问题 → 查询改写 → 权限过滤 → 召回 → 重排 → 组装 Context |
| 5 | 模型生成 → 引用校验 | 模型生成 → 引用校验。 |
| 6 | 它读取离线索引 | 它读取离线索引，但不重新解析和向量化全部文档。 |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["检索和生成要分开验收"] --> S2
  S2["可执行示例"] --> S3
  S3["在线链路的关键保护"] --> S4
  S4["在线链路只处理当前请求"] --> S5
  S5["模型生成 → 引用校验"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“RAG 在线问答：检索、组装证据与生成”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“RAG 在线问答：检索、组装证据与生成”的对象和顺序已经明确后，再看可观察的失败：解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、检索和生成要分开验收

检索阶段先回答“正确证据有没有进入 Top
K”，生成阶段再回答“答案是否忠于证据”。如果证据没召回，调整 Prompt 通常无效；如果证据正确而答案编造，才应检查生成规则和模型。

# 三、可执行示例

先运行上一课生成 `rag-index.json`，再把下面代码保存为 `ask_index.py`，执行
`python ask_index.py "耳机多久可以退款"`。示例会输出 Top
2 证据和可直接交给模型的 Prompt，不依赖第三方包或 API Key。

```text
# requirements.txt
# 本教学脚本仅使用 Python 3.10+ 标准库，无第三方依赖。
```

```python
import hashlib
import json
import math
import re
import sys
from pathlib import Path

# 必须与离线索引保持一致的向量维度。
VECTOR_DIMENSION = 64
# 在线召回保留的证据数量。
TOP_K = 2
# 离线链路生成的索引文件。
INDEX_PATH = Path("rag-index.json")


def tokenize(text: str) -> list[str]:
    """使用与离线链路相同的规则切分查询。"""
    # 查询中的英文单词和单个中文字符。
    tokens = re.findall(r"[a-z0-9]+|[\u4e00-\u9fff]", text.lower())
    return tokens


def embed(text: str) -> list[float]:
    """生成与离线索引兼容的教学查询向量。"""
    # 查询累加得到的哈希向量。
    vector = [0.0] * VECTOR_DIMENSION
    for token in tokenize(text):
        # 词元的稳定哈希值。
        token_hash = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16)
        vector[token_hash % VECTOR_DIMENSION] += 1.0

    # 查询向量的 L2 范数。
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def cosine(left_vector: list[float], right_vector: list[float]) -> float:
    """计算两个已归一化向量的余弦相似度。"""
    return sum(left * right for left, right in zip(left_vector, right_vector, strict=True))


# 命令行传入的用户问题。
question = " ".join(sys.argv[1:]).strip() or "耳机多久可以退款"
# 从离线文件读取的全部索引记录。
index_records = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
# 当前问题对应的查询向量。
query_vector = embed(question)
# 按相似度从高到低排列的候选证据。
ranked_records = sorted(
    index_records,
    key=lambda record: cosine(query_vector, record["vector"]),
    reverse=True,
)[:TOP_K]
# 带来源标记的上下文，方便模型输出引用。
context = "\n".join(f"[{record['id']}] {record['text']}" for record in ranked_records)
# 交给模型的最小问答提示词；证据不足时明确要求拒答。
prompt = f"""仅根据证据回答问题；证据不足就回答无法确认，并引用证据编号。

证据：
{context}

问题：{question}
"""

print(prompt)
```

# 四、在线链路的关键保护

- 在召回前应用租户、用户和文档权限过滤。
- Prompt 中把检索内容视为资料，不允许其中的指令覆盖系统规则。
- 保存 Query、候选、最终证据和引用，才能定位召回还是生成故障。
- 设置最低相关性阈值，证据不足时拒答或追问，不要强行生成。
- 对召回、Rerank、生成分别设置超时与降级；ES 或 VectorDB 单路失败时允许降级，但两路都无可信证据必须拒答。
- Trace 记录索引、Embedding、Rerank 和 Prompt 版本，并按租户脱敏，避免无法复现坏案例或泄露正文。

<!-- article-progressive-block:start -->
# 五、动手验证：先跑通 RAG 在线问答：检索、组装证据与生成，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“RAG 在线问答：检索、组装证据与生成”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 5.1 基线与候选只允许一个变量不同

验证“RAG 在线问答：检索、组装证据与生成”时，先固定标注查询集、原文与 chunk 快照、Embedding 和索引版本、权限身份。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“RAG 在线问答：检索、组装证据与生成”时，动作是：依次回放解析、切分、召回、过滤、重排、上下文组装和引用生成。原始结果不能只保留截图或汇总分数，必须同步保存：原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 标注查询集、原文与 chunk 快照、Embedding 和索引版本、权限身份 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 通过阈值 | 正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料 |
| 立即停止 | 解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 |

## 5.2 执行前先排除不可比较条件

“RAG 在线问答：检索、组装证据与生成”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“RAG 在线问答：检索、组装证据与生成”的当前环境重复运行。
- 候选只改变一个与“RAG 在线问答：检索、组装证据与生成”结论直接相关的条件。
- “RAG 在线问答：检索、组装证据与生成”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “RAG 在线问答：检索、组装证据与生成”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 5.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“RAG 在线问答：检索、组装证据与生成”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 标注查询集、原文与 chunk 快照、Embedding 和索引版本、权限身份 |
| 过程可回放 | 依次回放解析、切分、召回、过滤、重排、上下文组装和引用生成 |
| 结果可审计 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |

“RAG 在线问答：检索、组装证据与生成”的一次合格基线对照按以下顺序执行：

1. 保存“RAG 在线问答：检索、组装证据与生成”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“RAG 在线问答：检索、组装证据与生成”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“RAG 在线问答：检索、组装证据与生成”：依次回放解析、切分、召回、过滤、重排、上下文组装和引用生成。
4. 为“RAG 在线问答：检索、组装证据与生成”保存：原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace。
5. 使用“RAG 在线问答：检索、组装证据与生成”预登记条件判断：正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料。
6. 如果“RAG 在线问答：检索、组装证据与生成”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 六、用一张矩阵验证 RAG 在线问答：检索、组装证据与生成 的关键结论

矩阵按正文顺序列出“RAG 在线问答：检索、组装证据与生成”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| 检索和生成要分开验收 | K”，生成阶段再回答“答案是否忠于证据”。 | 只改变与“检索和生成要分开验收”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 可执行示例 | 先运行上一课生成 rag-index.json，再把下面代码保存为 ask_index.py，执行 | 只改变与“可执行示例”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 在线链路的关键保护 | Prompt 中把检索内容视为资料，不允许其中的指令覆盖系统规则。 | 只改变与“在线链路的关键保护”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 在线链路只处理当前请求 | 在线链路只处理当前请求：理解问题 → 查询改写 → 权限过滤 → 召回 → 重排 → 组装 Context | 只改变与“在线链路只处理当前请求”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 模型生成 → 引用校验 | 模型生成 → 引用校验。 | 只改变与“模型生成 → 引用校验”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |
| 它读取离线索引 | 它读取离线索引，但不重新解析和向量化全部文档。 | 只改变与“它读取离线索引”相关的条件 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace |

## 6.1 记录本次实际实验

下面的记录用于“RAG 在线问答：检索、组装证据与生成”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "RAG 在线问答：检索、组装证据与生成"
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

成功路径只能证明“RAG 在线问答：检索、组装证据与生成”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace | 正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“RAG 在线问答：检索、组装证据与生成”，第一步是：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“RAG 在线问答：检索、组装证据与生成”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 七、RAG 在线问答：检索、组装证据与生成 的结果解释

解释“RAG 在线问答：检索、组装证据与生成”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 | 先执行：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链 |
| 异常链路无法恢复 | 解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论 | 先执行：在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“RAG 在线问答：检索、组装证据与生成”只有同时满足“正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料”，并且没有出现“解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“RAG 在线问答：检索、组装证据与生成”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“RAG 在线问答：检索、组装证据与生成”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 八、RAG 在线问答：检索、组装证据与生成 的发布判断

发布判断需要把“RAG 在线问答：检索、组装证据与生成”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “RAG 在线问答：检索、组装证据与生成”的基线与候选只存在一个计划内变量。
- [ ] “RAG 在线问答：检索、组装证据与生成”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “RAG 在线问答：检索、组装证据与生成”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “RAG 在线问答：检索、组装证据与生成”的原始输出、中间状态和失败现场已经保留。
- [ ] “RAG 在线问答：检索、组装证据与生成”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “RAG 在线问答：检索、组装证据与生成”的停止条件、负责人和回滚入口已经演练。
- [ ] “RAG 在线问答：检索、组装证据与生成”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“RAG 在线问答：检索、组装证据与生成”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 九、总结

- **检索和生成要分开验收**：K”，生成阶段再回答“答案是否忠于证据”。
- **可执行示例**：先运行上一课生成 rag-index.json，再把下面代码保存为 ask_index.py，执行
- **在线链路的关键保护**：Prompt 中把检索内容视为资料，不允许其中的指令覆盖系统规则。
- **可运行实验：Multi-Query、Rewrite 与 HyDE**：调整参数并注入失败，重点对比正常路径、保护条件和失败诊断；

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)

<!-- knowledge-scenario-inlined:AA-10 -->

## 9.1 可运行实验：Multi-Query、Rewrite 与 HyDE


```html runnable file=index.html title="Multi-Query、Rewrite 与 HyDE" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AA-10 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AA-10 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'Multi-Query、Rewrite 与 HyDE', summary: '比较原始 Query、多查询、改写和假设文档检索的召回与去重。', controls: [
    { key: 'strategy', label: '查询策略', type: 'select', value: 'multi', options: [['raw', '原始 Query'], ['rewrite', 'Query Rewrite'], ['multi', 'Multi-Query'], ['hyde', 'HyDE']] },
    { key: 'variants', label: '生成查询数', type: 'range', min: 1, max: 8, value: 4, suffix: ' 条' },
    { key: 'dedupe', label: '候选去重', type: 'select', value: 'id', options: [['none', '不去重'], ['id', '按 Chunk ID'], ['semantic', '按语义相似度']] }
  ] };
    const controls = document.querySelector('#controls');
    const failure = document.querySelector('#failure');
    document.querySelector('#title').textContent = scenario.title;
    document.querySelector('#summary').textContent = scenario.summary;
    function renderControl(control) {
      const label = document.createElement('label'); label.className = 'control';
      const head = document.createElement('span'); head.className = 'head'; head.innerHTML = '<span>' + control.label + '</span><span class="value" data-value="' + control.key + '"></span>'; label.appendChild(head);
      const input = document.createElement(control.type === 'select' ? 'select' : 'input'); input.dataset.key = control.key;
      if (control.type === 'select') control.options.forEach(option => { const item = document.createElement('option'); item.value = option[0]; item.textContent = option[1]; item.selected = option[0] === control.value; input.appendChild(item); });
      else { input.type = 'range'; input.min = control.min; input.max = control.max; input.step = control.step || 1; input.value = control.value; }
      input.addEventListener('input', updateValues); label.appendChild(input); return label;
    }
    function updateValues() { scenario.controls.forEach(control => { const input = controls.querySelector('[data-key="' + control.key + '"]'); document.querySelector('[data-value="' + control.key + '"]').textContent = control.type === 'select' ? input.options[input.selectedIndex].text : input.value + (control.suffix || ''); }); }
    function readValues() { const values = {}; scenario.controls.forEach(control => { const input = controls.querySelector('[data-key="' + control.key + '"]'); values[control.key] = control.type === 'range' ? Number(input.value) : input.value; }); values.failure = failure.checked; return values; }
    function stage(name, state, detail) { return { name, state, detail }; }
    const aiStage = stage;
    function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
    function simulate(values) { const fail = values.failure;
      /** 不同查询策略的基础召回分。 */
      const baseRecall = { raw: 62, rewrite: 74, multi: 86, hyde: 82 }[values.strategy];
      /** 查询变体带来的候选总数。 */
      const rawCandidates = values.variants * 8;
      /** 去重策略减少后的候选数。 */
      const candidates = values.dedupe === 'none' ? rawCandidates : values.dedupe === 'id' ? Math.round(rawCandidates * 0.72) : Math.round(rawCandidates * 0.58);
      /** 变体数量和故障对召回率的修正。 */
      const recall = clamp(baseRecall + Math.min(values.variants, 4) * 2 - (fail ? 18 : 0), 0, 98);
      return { metrics: [[values.variants, '查询变体'], [rawCandidates, '原始候选'], [candidates, '去重候选'], [recall + '%', '估算 Recall']], stages: [aiStage('理解意图', fail ? 'fail' : 'ok', values.strategy), aiStage('生成查询', 'ok', values.variants), aiStage('并行召回', 'ok', rawCandidates), aiStage('候选去重', values.dedupe === 'none' ? 'warn' : 'ok', candidates), aiStage('覆盖检查', recall >= 80 ? 'ok' : 'warn', recall + '%')], rows: [['策略差异', values.strategy === 'hyde' ? '先生成假设答案再检索，可能放大模型偏见' : values.strategy === 'multi' ? '从同义词、业务实体和时间条件扩展查询' : '只改写或直接使用原问题'], ['去重键', values.dedupe === 'id' ? '同一 Chunk ID 只保留一次' : values.dedupe === 'semantic' ? '相近候选聚类，保留最高分证据' : '重复证据会浪费 Rerank 预算'], ['故障注入', fail ? '改写丢失“3 天未到账”时间约束' : '关键实体和约束均保留']], diagnosis: recall >= 80 && values.dedupe !== 'none' && !fail ? '查询扩展提高覆盖率，候选去重控制了后续成本。' : '需要修复意图保持或候选去重。', danger: fail };
     }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
