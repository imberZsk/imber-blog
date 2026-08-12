# Callback、Middleware 与运行时扩展

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

## 生产避坑

- 同步上报 Trace 会放大尾延迟。
- 重复注册 Callback 会产生重复 Span 和成本统计。
- 把业务分支写进通用回调会导致链条不可理解。

## 验收清单

- 关键输入、输出、预算和停止条件都有结构化记录。
- 正常、边界、失败和攻击样本都进入可重复运行的测试集。
- 质量、延迟、成本与安全指标能定位到版本和 trace_id。

## 参考资料

- [LangChain Callbacks](https://python.langchain.com/docs/concepts/callbacks/)
- [LangChain Middleware](https://docs.langchain.com/oss/python/langchain/middleware/overview)
