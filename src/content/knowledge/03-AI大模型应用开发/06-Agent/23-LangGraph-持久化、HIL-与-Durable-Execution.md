# Agent（23） - LangGraph 持久化、HIL 与 Durable Execution

> 复杂 Agent 不只要能跑通图，还要在中断、重启、人工确认和重复恢复后保持状态一致、动作可审计。

## 学习目标

- 设计包含 thread、State、版本和元数据的 checkpoint。
- 为高风险 Tool 实现人工确认、拒绝、恢复和审计。
- 用幂等、迁移、锁和终止条件保证 Durable Execution 可恢复。

## 一、Checkpoint 是什么

持久化保存线程/会话 ID、当前 State、下一节点、版本和元数据。它让图可以暂停后恢复、回放和查看历史，但不自动解决外部副作用的幂等问题。Checkpoint 存储需按租户和用户隔离，并设置保留与删除策略。

## 二、Human-in-the-loop

高风险工具执行前暂停，向人工展示计划、参数、证据和预计副作用。人工批准、拒绝或修改后再恢复图；等待期间不应占用模型连接。拒绝也要写入状态和审计，避免图重复请求确认。

## 三、Durable Execution 的边界

节点应尽量短小、可重试、可序列化。外部写操作使用幂等键和已完成标记；恢复时先检查副作用是否已成功，再决定重放。把不可重试网络调用直接写在可重复节点里，会造成重复扣款、重复发信等事故。

## 四、故障处理

```text
节点失败 -> 记录 Span 与错误分类 -> 可重试则有界重试
        -> 不可重试则进入人工/补偿节点 -> 更新 checkpoint -> 结束或恢复
```

图的每条循环边都要有最大轮次、预算和终止原因。版本升级时保留 State 迁移器，不能让旧 checkpoint 直接喂给新 Schema。

## 五、验收

- 节点执行到一半进程崩溃，恢复后不会重复外部副作用。
- 人工拒绝工具调用，图停止在可解释终态并保留审计。
- 同一 thread 在两个请求并发恢复时有锁或版本冲突处理。

## 参考资料

- [LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [LangGraph Human-in-the-loop](https://docs.langchain.com/oss/python/langgraph/interrupts)
