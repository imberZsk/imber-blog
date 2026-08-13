# Agent（25） - LangGraph 持久化、HIL 与可靠执行

> 长流程可靠性来自 Checkpoint、幂等副作用和明确恢复协议，不来自模型“记住上次做到哪里”。

> 读完你能：实现线程级持久化、人工中断、故障恢复、Time Travel 和流式进度，并防止恢复后重复执行工具。

## 核心知识清单

- Checkpointer、thread_id 与历史状态
- interrupt、Command resume 与 Human-in-the-loop
- Durable Execution、故障恢复与 Time Travel
- 幂等 Node、Idempotency Key 与副作用去重
- updates、values 与 messages 流式模式
- Tool 可恢复错误、程序 Bug 与业务拒绝

## Checkpoint 保存什么

Checkpointer 在图执行边界保存 State、下一节点和元数据；`thread_id` 标识一条可恢复执行线。它适合短中期工作流状态，不等同于跨会话用户记忆。生产存储应配置租户隔离、加密、保留期和清理任务。

## HIL 的完整协议

高风险 Node 在执行副作用前调用 `interrupt`，返回工具名、脱敏参数、风险说明和可修改字段。前端展示审批，用户选择批准、修改或拒绝；后端校验审批者权限后用 `Command(resume=...)` 恢复同一 `thread_id`。

审批记录必须不可抵赖，恢复时重新校验资源权限和参数。用户批准的是具体参数，不是未来任意调用。

## 恢复不等于重跑

节点可能已经完成外部写操作，但在写 Checkpoint 前崩溃。为每个副作用生成稳定 Idempotency Key，执行前查去重记录，成功结果与业务写入尽量原子提交。恢复时读取已有结果，不重复发信、扣款或创建工单。

错误按语义分类：网络和限流可退避重试；Tool 参数缺失可回到模型或用户；程序 Bug 立即停止并告警；权限拒绝和业务冲突不可通过重试绕过。

## Streaming 与 Time Travel

`updates` 适合展示节点增量，`values` 适合观察完整状态，`messages` 适合 Token 流。所有事件携带 run、node 和 sequence，客户端才能去重。Time Travel 用历史 Checkpoint 创建新分支进行调试或修改参数，不能悄悄篡改原审计链。

## 参考资料

- [LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [LangGraph Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [LangGraph Durable Execution](https://docs.langchain.com/oss/python/langgraph/durable-execution)
- [LangGraph Streaming](https://docs.langchain.com/oss/python/langgraph/streaming)

