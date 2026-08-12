# Agent（02） - Router、Plan-and-Execute 与 Reflection

> 针对任务复杂度选择一次路由、显式计划或结果反思，避免所有请求都进入昂贵且难控制的循环。

## 学习目标

读完本章后，你应能复述本主题的关键数据流，选择至少一种替代方案，运行或审查最小实现，并根据日志、指标或测试结果解释失败原因。

## 为什么需要它

真实系统的问题通常不在 API 能否调用，而在输入边界、错误恢复和验收证据是否明确。本章给出可以进入设计评审和生产检查的最小框架。

## 核心决策

- Router 适合类别稳定、目标处理器明确的请求。
- Plan-and-Execute 适合多步骤且依赖关系清楚的任务，计划必须允许执行反馈后重排。
- Reflection 只在结果可验证且修正收益高时启用，并设置最大轮次和终止原因。

## 落地步骤

1. 先定义状态、可用动作和成功条件。
2. 路由输出使用枚举 Schema，计划步骤绑定工具和完成证据。
3. 每轮记录决策、工具结果、预算和停止原因。

## 决策记录怎么写

上线前不要只留下“采用 Router、Plan-and-Execute 与 Reflection”这一句结论。把每个决策和验收证据放在同一张表里，后续模型、数据或流量变化时才能重跑对比。

| 需要回答的问题 | 当前决策 | 必须保留的证据 |
| --- | --- | --- |
| 决策 1 | Router 适合类别稳定、目标处理器明确的请求。 | 对应步骤 1 的数据集、日志或压测结果 |
| 决策 2 | Plan-and-Execute 适合多步骤且依赖关系清楚的任务，计划必须允许执行反馈后重排。 | 对应步骤 2 的数据集、日志或压测结果 |
| 决策 3 | Reflection 只在结果可验证且修正收益高时启用，并设置最大轮次和终止原因。 | 对应步骤 3 的数据集、日志或压测结果 |

下面的记录可以直接放进项目设计文档。阈值由真实评测集和 SLO 决定，不使用脱离业务的固定“最佳值”。

```yaml
topic: Router、Plan-and-Execute 与 Reflection
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

- 无限反思会增加成本但不提高正确率。
- 计划与执行共享未裁剪上下文容易超窗。
- 没有确定性校验器时，模型自评不能作为唯一验收。

## 故障演练

1. 注入与“无限反思会增加成本但不提高正确率。”对应的失败条件，记录用户侧现象、Trace 中的首个异常 Span 和恢复动作。
2. 注入与“计划与执行共享未裁剪上下文容易超窗。”对应的失败条件，记录用户侧现象、Trace 中的首个异常 Span 和恢复动作。
3. 注入与“没有确定性校验器时，模型自评不能作为唯一验收。”对应的失败条件，记录用户侧现象、Trace 中的首个异常 Span 和恢复动作。

演练必须能回答三个问题：故障是否在预算内快速失败，是否会越权或产生重复副作用，恢复后是否能用同一数据集证明质量没有退化。只有错误日志、没有用户影响和恢复证据，不能算完成排障。

## 验收清单

- 关键输入、输出、预算和停止条件都有结构化记录。
- 正常、边界、失败和攻击样本都进入可重复运行的测试集。
- 质量、延迟、成本与安全指标能定位到版本和 trace_id。

## 参考资料

- [LangGraph Workflows and Agents](https://langchain-ai.github.io/langgraph/tutorials/workflows/)
- [ReAct Paper](https://arxiv.org/abs/2210.03629)
