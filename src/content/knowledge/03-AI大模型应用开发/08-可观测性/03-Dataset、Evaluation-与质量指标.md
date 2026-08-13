# 可观测性（03） - Dataset、Evaluation 与质量指标

> 用版本化数据集和分层指标同时约束检索、生成、Agent 行为及端到端任务完成率。

## 学习目标

读完本章后，你应能复述本主题的关键数据流，选择至少一种替代方案，运行或审查最小实现，并根据日志、指标或测试结果解释失败原因。

## 核心知识清单

- Dataset、Example、Split 与版本
- Baseline、Candidate 与 Experiment
- Retrieval、Generation、Agent 与端到端分层评测
- Deterministic、Human 与 LLM-as-Judge
- Offline Regression 与 Online Evaluation
- 质量、延迟、成本与安全发布门禁

## 为什么需要它

真实系统的问题通常不在 API 能否调用，而在输入边界、错误恢复和验收证据是否明确。本章给出可以进入设计评审和生产检查的最小框架。

## 核心决策

- RAG 分别评估 Recall@K、MRR、上下文相关性、引用正确性和答案忠实度。
- Agent 评估任务成功率、工具选择、参数正确率、步骤数、成本和安全违规。
- LLM-as-Judge 需要明确 rubric、锚点样例和人工抽检，不能直接当真值。

## 落地步骤

1. 从真实流量按错误类型分层采样并去敏。
2. 固定数据、Prompt、模型和评测器版本。
3. 在 CI 做小回归，发布前做完整对比，线上监控分布漂移。

## 决策记录怎么写

上线前不要只留下“采用 Dataset、Evaluation 与质量指标”这一句结论。把每个决策和验收证据放在同一张表里，后续模型、数据或流量变化时才能重跑对比。

| 需要回答的问题 | 当前决策 | 必须保留的证据 |
| --- | --- | --- |
| 决策 1 | RAG 分别评估 Recall@K、MRR、上下文相关性、引用正确性和答案忠实度。 | 对应步骤 1 的数据集、日志或压测结果 |
| 决策 2 | Agent 评估任务成功率、工具选择、参数正确率、步骤数、成本和安全违规。 | 对应步骤 2 的数据集、日志或压测结果 |
| 决策 3 | LLM-as-Judge 需要明确 rubric、锚点样例和人工抽检，不能直接当真值。 | 对应步骤 3 的数据集、日志或压测结果 |

下面的记录可以直接放进项目设计文档。阈值由真实评测集和 SLO 决定，不使用脱离业务的固定“最佳值”。

```yaml
topic: Dataset、Evaluation 与质量指标
baseline:
  version: required
  dataset: required
candidate:
  version: required
  change: required
acceptance:
  quality: business_threshold
  p95_latency_ms: service_slo
  cost_per_success: budget_limit
rollback:
  trigger: any_acceptance_regression
  owner: named_on_call
```

## 生产避坑

- 只看最终答案会掩盖错误证据。
- 测试集污染会虚高分数。
- 单一平均分无法反映高风险子集退化。

## 故障演练

1. 注入与“只看最终答案会掩盖错误证据。”对应的失败条件，记录用户侧现象、Trace 中的首个异常 Span 和恢复动作。
2. 注入与“测试集污染会虚高分数。”对应的失败条件，记录用户侧现象、Trace 中的首个异常 Span 和恢复动作。
3. 注入与“单一平均分无法反映高风险子集退化。”对应的失败条件，记录用户侧现象、Trace 中的首个异常 Span 和恢复动作。

演练必须能回答三个问题：故障是否在预算内快速失败，是否会越权或产生重复副作用，恢复后是否能用同一数据集证明质量没有退化。只有错误日志、没有用户影响和恢复证据，不能算完成排障。

## 验收清单

- 关键输入、输出、预算和停止条件都有结构化记录。
- 正常、边界、失败和攻击样本都进入可重复运行的测试集。
- 质量、延迟、成本与安全指标能定位到版本和 trace_id。

## 参考资料

- [LangSmith Evaluation](https://docs.langchain.com/langsmith/evaluation)
- [Ragas Metrics](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/)
