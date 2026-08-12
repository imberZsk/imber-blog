# 应用框架（02） - Callback、Middleware 与运行时扩展

> 在不污染业务链的前提下统一记录模型、检索和工具调用，并实现限流、降级和审计。

## 学习目标

读完本章后，你应能复述本主题的关键数据流，选择至少一种替代方案，运行或审查最小实现，并根据日志、指标或测试结果解释失败原因。

## 为什么需要它

真实系统的问题通常不在 API 能否调用，而在输入边界、错误恢复和验收证据是否明确。本章给出可以进入设计评审和生产检查的最小框架。

## 核心决策

- Callback 适合观察生命周期事件，Middleware 适合在调用前后修改上下文或拦截执行。
- Trace 必须携带 request_id、tenant_id、model、token、latency 和 error_type，但不能记录密钥与完整敏感正文。
- 扩展点失败默认不能拖垮主链路；审计类事件则需要可靠缓冲和告警。

## 落地步骤

1. 定义统一事件 Schema。
2. 在模型、Retriever、Tool 三个边界注入追踪。
3. 用正常、超时、解析失败和回调故障四类用例验证。

## 决策记录怎么写

上线前不要只留下“采用 Callback、Middleware 与运行时扩展”这一句结论。把每个决策和验收证据放在同一张表里，后续模型、数据或流量变化时才能重跑对比。

| 需要回答的问题 | 当前决策 | 必须保留的证据 |
| --- | --- | --- |
| 决策 1 | Callback 适合观察生命周期事件，Middleware 适合在调用前后修改上下文或拦截执行。 | 对应步骤 1 的数据集、日志或压测结果 |
| 决策 2 | Trace 必须携带 request_id、tenant_id、model、token、latency 和 error_type，但不能记录密钥与完整敏感正文。 | 对应步骤 2 的数据集、日志或压测结果 |
| 决策 3 | 扩展点失败默认不能拖垮主链路；审计类事件则需要可靠缓冲和告警。 | 对应步骤 3 的数据集、日志或压测结果 |

下面的记录可以直接放进项目设计文档。阈值由真实评测集和 SLO 决定，不使用脱离业务的固定“最佳值”。

```yaml
topic: Callback、Middleware 与运行时扩展
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

- 同步上报 Trace 会放大尾延迟。
- 重复注册 Callback 会产生重复 Span 和成本统计。
- 把业务分支写进通用回调会导致链条不可理解。

## 故障演练

1. 注入与“同步上报 Trace 会放大尾延迟。”对应的失败条件，记录用户侧现象、Trace 中的首个异常 Span 和恢复动作。
2. 注入与“重复注册 Callback 会产生重复 Span 和成本统计。”对应的失败条件，记录用户侧现象、Trace 中的首个异常 Span 和恢复动作。
3. 注入与“把业务分支写进通用回调会导致链条不可理解。”对应的失败条件，记录用户侧现象、Trace 中的首个异常 Span 和恢复动作。

演练必须能回答三个问题：故障是否在预算内快速失败，是否会越权或产生重复副作用，恢复后是否能用同一数据集证明质量没有退化。只有错误日志、没有用户影响和恢复证据，不能算完成排障。

## 验收清单

- 关键输入、输出、预算和停止条件都有结构化记录。
- 正常、边界、失败和攻击样本都进入可重复运行的测试集。
- 质量、延迟、成本与安全指标能定位到版本和 trace_id。

## 参考资料

- [LangChain Callbacks](https://python.langchain.com/docs/concepts/callbacks/)
- [LangChain Middleware](https://docs.langchain.com/oss/python/langchain/middleware/overview)
