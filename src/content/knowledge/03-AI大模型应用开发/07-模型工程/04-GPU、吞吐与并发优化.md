# GPU、吞吐与并发优化

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

## 生产避坑

- 平均延迟掩盖尾部排队。
- 无限队列让错误从快速拒绝变成长时间超时。
- 多卡通信开销可能抵消并行收益。

## 验收清单

- 关键输入、输出、预算和停止条件都有结构化记录。
- 正常、边界、失败和攻击样本都进入可重复运行的测试集。
- 质量、延迟、成本与安全指标能定位到版本和 trace_id。

## 参考资料

- [NVIDIA Triton Performance](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/performance_tuning/performance_tuning.html)
- [vLLM Optimization](https://docs.vllm.ai/en/latest/configuration/optimization/)
