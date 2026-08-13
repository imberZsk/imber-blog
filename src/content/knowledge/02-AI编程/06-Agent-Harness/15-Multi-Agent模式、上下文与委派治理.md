# Agent Harness（15） - Multi-Agent 模式、上下文与委派治理

> 多 Agent 的价值来自专业隔离、上下文隔离或并行收益，而不是让更多模型互相讨论。

> 读完你能：选择 Routing、Handoff、Supervisor、Orchestrator-Worker 或 Pipeline，并设计私有上下文、委派 Trace 和最终责任。

## 核心知识清单

- Routing、Handoff、Supervisor 与 Pipeline
- Orchestrator-Worker 与动态 fan-out/fan-in
- 单一职责、输入输出 Schema 与终止条件
- 共享状态、私有上下文与最小权限
- 部分失败、重试、取消与结果冲突
- 委派 Trace、成本预算与最终责任

## 模式选择

Routing 根据稳定意图把请求一次分给专用 Agent；Handoff 在持续对话中转移控制权和必要状态；Supervisor 保持最终控制并调用子 Agent；Orchestrator-Worker 动态拆出多个独立任务并并行汇合；Pipeline 按固定顺序传递产物。步骤固定时优先 Pipeline，不需要模型主管。

## 上下文设计

每个 Agent 只接收任务、允许资源、必要事实和输出契约。专业 Agent 的检索细节保留在私有上下文，向主管返回结论、证据、风险和未完成项。共享状态使用显式字段和合并策略，不能把全部聊天历史广播给所有 Agent。

## 委派治理

委派消息包含 `task_id`、目标、输入引用、截止时间、预算和验收。子 Agent 权限小于等于委派者，并按任务进一步裁剪。设置最大深度、Handoff 次数、并行度和总 Token，防止循环委派。

并行分支允许部分失败时，汇总器明确缺失项；结果冲突必须展示来源或进入裁决，不能按完成顺序覆盖。Trace 记录 parent_run、agent_role、task_id、工具和成本。Supervisor 或指定 Owner 对最终输出负责，不能把责任分散到“多个 Agent 都参与过”。

## 参考资料

- [LangChain Multi-Agent Patterns](https://docs.langchain.com/oss/python/langchain/multi-agent)
- [LangChain Handoffs](https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs)
- [LangChain Subagents](https://docs.langchain.com/oss/python/langchain/multi-agent/subagents)
- [LangGraph Orchestrator-Worker](https://docs.langchain.com/oss/python/langgraph/workflows-agents#orchestrator-worker)

