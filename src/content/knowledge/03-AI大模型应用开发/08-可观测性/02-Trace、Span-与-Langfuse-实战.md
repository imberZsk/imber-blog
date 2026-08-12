# Trace、Span 与 Langfuse 实战

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

## 生产避坑

- 只记总耗时无法定位慢在检索还是生成。
- 全量保存用户正文会产生隐私风险。
- Trace 成功不等于回答正确，必须关联质量评分。

## 验收清单

- 关键输入、输出、预算和停止条件都有结构化记录。
- 正常、边界、失败和攻击样本都进入可重复运行的测试集。
- 质量、延迟、成本与安全指标能定位到版本和 trace_id。

## 参考资料

- [OpenTelemetry Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [Langfuse Tracing](https://langfuse.com/docs/observability/overview)
