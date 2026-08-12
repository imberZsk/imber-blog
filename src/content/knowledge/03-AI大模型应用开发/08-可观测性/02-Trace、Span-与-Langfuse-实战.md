# 可观测性（02） - Trace、Span 与 Langfuse 实战

> 把一次 AI 请求拆成模型、检索、工具和解析 Span，定位质量、延迟和成本发生在哪一段。

## 学习目标

读完本章后，你应能复述本主题的关键数据流，选择至少一种替代方案，运行或审查最小实现，并根据日志、指标或测试结果解释失败原因。

## 为什么需要它

真实系统的问题通常不在 API 能否调用，而在输入边界、错误恢复和验收证据是否明确。本章给出可以进入设计评审和生产检查的最小框架。

## 核心决策

- Trace 表示端到端请求，Span 表示一个有开始、结束、属性和状态的操作。
- 输入输出需脱敏和采样，tenant_id 等权限字段只存不可逆标识。
- Langfuse 负责 AI Trace、Prompt、Dataset 和评测，但基础设施指标仍交给 OpenTelemetry 体系。

## 落地步骤

1. 建立 trace_id 并贯穿网关、RAG、Agent 和模型调用。
2. 记录模型、token、延迟、命中证据、工具错误和最终评分。
3. 从线上坏例进入 Dataset，再回放形成回归闭环。

## 决策记录怎么写

上线前不要只留下“采用 Trace、Span 与 Langfuse 实战”这一句结论。把每个决策和验收证据放在同一张表里，后续模型、数据或流量变化时才能重跑对比。

| 需要回答的问题 | 当前决策 | 必须保留的证据 |
| --- | --- | --- |
| 决策 1 | Trace 表示端到端请求，Span 表示一个有开始、结束、属性和状态的操作。 | 对应步骤 1 的数据集、日志或压测结果 |
| 决策 2 | 输入输出需脱敏和采样，tenant_id 等权限字段只存不可逆标识。 | 对应步骤 2 的数据集、日志或压测结果 |
| 决策 3 | Langfuse 负责 AI Trace、Prompt、Dataset 和评测，但基础设施指标仍交给 OpenTelemetry 体系。 | 对应步骤 3 的数据集、日志或压测结果 |

下面的记录可以直接放进项目设计文档。阈值由真实评测集和 SLO 决定，不使用脱离业务的固定“最佳值”。

```yaml
topic: Trace、Span 与 Langfuse 实战
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

- 只记总耗时无法定位慢在检索还是生成。
- 全量保存用户正文会产生隐私风险。
- Trace 成功不等于回答正确，必须关联质量评分。

## 故障演练

1. 注入与“只记总耗时无法定位慢在检索还是生成。”对应的失败条件，记录用户侧现象、Trace 中的首个异常 Span 和恢复动作。
2. 注入与“全量保存用户正文会产生隐私风险。”对应的失败条件，记录用户侧现象、Trace 中的首个异常 Span 和恢复动作。
3. 注入与“Trace 成功不等于回答正确，必须关联质量评分。”对应的失败条件，记录用户侧现象、Trace 中的首个异常 Span 和恢复动作。

演练必须能回答三个问题：故障是否在预算内快速失败，是否会越权或产生重复副作用，恢复后是否能用同一数据集证明质量没有退化。只有错误日志、没有用户影响和恢复证据，不能算完成排障。

## 验收清单

- 关键输入、输出、预算和停止条件都有结构化记录。
- 正常、边界、失败和攻击样本都进入可重复运行的测试集。
- 质量、延迟、成本与安全指标能定位到版本和 trace_id。

## 参考资料

- [OpenTelemetry Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [Langfuse Tracing](https://langfuse.com/docs/observability/overview)
