# 可观测性（08） - LangSmith 与 Langfuse 平台能力及选型

> 选型不能只比较 Trace 页面。要同时看数据模型、Prompt 版本、Dataset、Evaluator、部署方式、数据驻留和与当前框架的集成成本。

> 读完你能：解释两套平台的 Trace 层级、Prompt 与评测闭环，并基于治理约束完成选型验证。

## 核心知识清单

- LangSmith Run、Trace、Project、Dataset 与 Experiment
- LangSmith Prompt Version、Playground 与 Deployment
- Langfuse Trace、Span、Generation、Observation 与 Score
- Langfuse Prompt Management、Dataset Item 与 Dataset Run
- 自动追踪、手动追踪与 OpenTelemetry
- 托管、自托管、数据驻留与选型 PoC

## 数据模型先对齐

LangSmith 用 Run 表示一次可嵌套执行，多个 Run 组成 Trace；Langfuse 用 Observation 统一承载 Span、Generation、Agent 和 Retriever 等类型。无论平台，都要让模型、检索、Rerank、Tool、子 Agent 和最终生成形成正确父子关系，而不是把所有事件平铺。

Generation 需要记录模型、版本、输入输出 Token、成本和延迟；Retriever 记录查询、候选 ID 与分数；Tool 记录脱敏参数、结果摘要与错误。生产日志不能上传密钥、完整 PII 或无权限正文。

## Prompt 与 Evaluation

Prompt 发布使用不可变版本或 Commit，Trace 写入实际版本，才能把回归关联到变更。Dataset Item 保存输入、参考输出或评测元数据；Dataset Run 或 Experiment 保存某个应用版本在整个数据集上的结果。线上失败样本经脱敏与人工确认后回流 Dataset，而不是直接把所有生产数据拿来训练。

## 选型维度

| 维度 | 核心问题 |
| --- | --- |
| 集成 | 当前 LangChain、LangGraph 或自研链能否自动采集，缺失字段是否可手动补充 |
| 评测 | 是否支持代码、规则、LLM Judge、人工标注和基线比较 |
| 治理 | RBAC、审计、保留期、删除、区域和自托管是否满足要求 |
| 运维 | 采样、异步上报、失败缓冲、告警和成本是否可控 |
| 锁定 | Trace 是否能通过 OpenTelemetry 或导出 API 迁移 |

用同一条 RAG + Agent 链做 PoC，比较字段完整率、额外延迟、丢失率、查询效率与运维成本，再决定平台。截图好看不是选型结论。

## 参考资料

- [LangSmith Observability](https://docs.langchain.com/langsmith/observability)
- [LangSmith Evaluation](https://docs.langchain.com/langsmith/evaluation-concepts)
- [Langfuse Observability](https://langfuse.com/docs/observability/overview)
- [Langfuse Evaluation](https://langfuse.com/docs/evaluation/overview)
- [OpenTelemetry GenAI](https://opentelemetry.io/docs/specs/semconv/gen-ai/)

