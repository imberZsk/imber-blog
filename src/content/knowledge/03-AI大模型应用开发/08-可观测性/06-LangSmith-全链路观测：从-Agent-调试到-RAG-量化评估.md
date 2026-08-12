# LangSmith / LangFuse（81）- LangSmith 全链路观测：从 Agent 调试到 RAG 量化评估

> 读完你能：理解 Agent/RAG 为什么必须有 trace，以及如何从调试走向量化评估。

# 一、本篇定位

这是可观测性进阶篇，衔接 40 日志与可观测性。

# 二、一个真实场景

用户反馈“回答错了”。如果你只能看到最终回答，就不知道是 query 改写错、检索没命中、rerank 排错、prompt 引导差，还是模型自己编。LangSmith 这类工具的价值，是把每一步调用、输入、输出、耗时和 token 展开给你看。

# 三、核心拆解

- Trace 是一次请求的调用树。Agent 的每个模型调用、工具调用、检索调用都应该是一个 span。
- 调试阶段看单条 trace，定位坏 case。评估阶段跑数据集，看 Hit Rate、faithfulness、answer correctness、latency 等指标。
- RAG 评估不能只看最终答案，还要评估 retrieval：正确证据是否被召回，是否排在前面。

# 四、工程链路

- 为每次请求生成 trace_id。
- 记录检索、rerank、LLM、tool 的输入输出。
- 坏 case 进入数据集。
- 改参数后批量回放评估集。
- 对比指标和成本。

# 五、落地建议

- 线上日志脱敏后再进入观测平台。
- 每次 prompt 或检索参数改动都标版本。
- 把高频坏 case 固化成回归集。

# 六、常见坑

- 只记录最终回答。
- 没有版本字段，评估结果无法复现。
- 只看平均耗时，不看 P90/P99。

# 七、和已有主线的关系

40 讲通用日志，26 讲 RAG 评测；81 把 trace 和评估平台串起来。

# 八、复述答法

> LangSmith 类工具的核心价值是 trace 和 dataset evaluation。单条 trace 帮你定位坏 case，评估集帮你对比改动是否变好。RAG 要同时看检索指标、答案忠实度、延迟和成本。

# 九、总结

- **核心拆解**：Trace 是一次请求的调用树。
- **工程链路**：为每次请求生成 traceid。
- **常见坑**：没有版本字段，评估结果无法复现。
- **本篇定位**：这是可观测性进阶篇，衔接 40 日志与可观测性。

## 十、最小可运行示例：LangSmith Trace

~~~text
# requirements.txt
langsmith
~~~

~~~python
from __future__ import annotations

import os

from langsmith import traceable


# Prompt 版本与索引版本进入 Trace，支持回放和对比。
PROMPT_VERSION = "rag-v3"
INDEX_VERSION = "knowledge-2026-08-11"


@traceable(name="retrieve", run_type="retriever")
def retrieve(query: str) -> list[dict[str, str]]:
    """返回教学候选；query 是已脱敏问题。"""

    # 生产实现记录 chunk_id 和分数，不默认上传敏感全文。
    return [{"chunk_id": "refund#1", "score": "0.82"}]


@traceable(name="rag_answer", metadata={"prompt": PROMPT_VERSION, "index": INDEX_VERSION})
def answer(query: str) -> dict[str, object]:
    """组合检索与答案；query 在进入 Trace 前应按策略脱敏。"""

    # 当前候选作为子 Span 结果进入调用树。
    hits = retrieve(query)
    return {"answer": "退款三日到账", "citations": [hit["chunk_id"] for hit in hits]}


if os.getenv("LANGSMITH_TRACING") == "true":
    print(answer("退款多久到账"))
~~~

观测平台配置失败不应阻断主业务；上传失败单独告警。截图至少展示调用树、召回候选、版本、耗时和 Token，并对正文、租户、用户与密钥脱敏。

## 参考资料

- [OpenTelemetry Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [Langfuse 文档](https://langfuse.com/docs)
