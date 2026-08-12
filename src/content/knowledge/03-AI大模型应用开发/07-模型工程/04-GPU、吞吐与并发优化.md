# 模型工程（04） - GPU、吞吐与并发优化

> 用请求长度分布和 SLO 计算容量，而不是用单请求峰值 tokens/s 估算生产并发。

## 学习目标

读完本章后，你应能复述本主题的关键数据流，选择至少一种替代方案，运行或审查最小实现，并根据日志、指标或测试结果解释失败原因。

## 为什么需要它

真实系统的问题通常不在 API 能否调用，而在输入边界、错误恢复和验收证据是否明确。本章给出可以进入设计评审和生产检查的最小框架。

## 核心决策

- TTFT 反映排队和 Prefill，TPOT 反映 Decode；两者优化手段不同。
- 数据并行扩副本，张量并行拆单模型，流水线并行适合跨阶段部署。
- 队列设置长度和等待上限，过载时拒绝或降级，不能让所有请求一起超时。

## 落地步骤

1. 采集输入/输出 token 分位数和到达率。
2. 按交互与批处理流量拆池并设置优先级。
3. 压测到 SLO 临界点，保留故障和发布余量。

## 决策记录怎么写

上线前不要只留下“采用 GPU、吞吐与并发优化”这一句结论。把每个决策和验收证据放在同一张表里，后续模型、数据或流量变化时才能重跑对比。

| 需要回答的问题 | 当前决策 | 必须保留的证据 |
| --- | --- | --- |
| 决策 1 | TTFT 反映排队和 Prefill，TPOT 反映 Decode；两者优化手段不同。 | 对应步骤 1 的数据集、日志或压测结果 |
| 决策 2 | 数据并行扩副本，张量并行拆单模型，流水线并行适合跨阶段部署。 | 对应步骤 2 的数据集、日志或压测结果 |
| 决策 3 | 队列设置长度和等待上限，过载时拒绝或降级，不能让所有请求一起超时。 | 对应步骤 3 的数据集、日志或压测结果 |

下面的记录可以直接放进项目设计文档。阈值由真实评测集和 SLO 决定，不使用脱离业务的固定“最佳值”。

```yaml
topic: GPU、吞吐与并发优化
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

- 平均延迟掩盖尾部排队。
- 无限队列让错误从快速拒绝变成长时间超时。
- 多卡通信开销可能抵消并行收益。

## 故障演练

1. 注入与“平均延迟掩盖尾部排队。”对应的失败条件，记录用户侧现象、Trace 中的首个异常 Span 和恢复动作。
2. 注入与“无限队列让错误从快速拒绝变成长时间超时。”对应的失败条件，记录用户侧现象、Trace 中的首个异常 Span 和恢复动作。
3. 注入与“多卡通信开销可能抵消并行收益。”对应的失败条件，记录用户侧现象、Trace 中的首个异常 Span 和恢复动作。

演练必须能回答三个问题：故障是否在预算内快速失败，是否会越权或产生重复副作用，恢复后是否能用同一数据集证明质量没有退化。只有错误日志、没有用户影响和恢复证据，不能算完成排障。

## 验收清单

- 关键输入、输出、预算和停止条件都有结构化记录。
- 正常、边界、失败和攻击样本都进入可重复运行的测试集。
- 质量、延迟、成本与安全指标能定位到版本和 trace_id。

## 参考资料

- [NVIDIA Triton Performance Analyzer](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/perf_analyzer/docs/README.html)
- [vLLM Optimization](https://docs.vllm.ai/en/latest/configuration/optimization/)
