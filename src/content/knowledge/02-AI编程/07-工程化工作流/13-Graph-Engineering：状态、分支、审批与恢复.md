# 工程化工作流（13） - Graph Engineering：状态、分支、审批与恢复

> Graph Engineering 把复杂 Agent 流程变成显式状态机：节点执行工作，边决定流转，持久化保证暂停后能恢复。

> 读完你能：把一个 Agent 工作流拆成状态、节点、边、终态和人工审批，并判断节点内部何时需要局部 Loop。

## 核心知识清单

- 显式 State 与状态更新契约
- Node、Static Edge 与 Conditional Edge
- 节点内部 Loop 和图级控制流
- Checkpointer、Thread 与幂等恢复
- Human-in-the-loop Interrupt 与 Resume
- fan-out、fan-in、超时和取消传播
- Time Travel、审计与补偿动作

## Loop 与 Graph 不在同一层

Loop 关心“这一阶段是否继续尝试”；Graph 关心“系统当前在哪个阶段，下一步允许去哪里”。例如修复节点内部可以调查、编辑、测试多轮；图只在节点返回 `verified` 后进入 Review，在 `blocked` 时进入人工审批，在预算耗尽时终止。

```text
START -> investigate -> implement -> verify
              ^             |          |
              |             | fail     | pass
              +-------------+          v
                                      review -> human_approval -> END
```

## 先设计 State，再写节点

状态只保存跨节点需要的事实，例如任务 ID、规格版本、根因证据、改动摘要、验证结果、预算和审批决定。不要把完整聊天、客户端连接或不可序列化对象塞进 State。每个节点要声明读取字段、写入字段、幂等键和失败类型。

Conditional Edge 读取结构化状态路由，不能通过解析模型自然语言决定高风险分支。模型可以提出 `route`，但必须经过枚举 Schema、权限和业务校验。并行节点需要 Reducer 或明确的 fan-in 合并规则，避免后写结果覆盖先写结果。

## 持久化与人工审批

Checkpointer 保存的是可恢复执行状态，不等于业务事务。外部写操作仍要使用幂等键、Outbox 或补偿动作。恢复同一 thread 时先检查外部系统是否已经执行成功，避免因为节点重放而重复创建 PR、重复发消息或重复扣费。

人工审批使用 Interrupt 暂停：展示待批准动作、证据、影响、替代方案和回滚；Resume 只接受结构化决定，并重新校验权限和资源版本。长时间暂停后，原 diff、部署版本或审批人权限都可能变化，不能直接沿用旧快照。

## 什么时候不要画图

- 线性三步且失败直接终止：普通函数或 Pipeline 更容易测试。
- 只是同一动作有限重试：Loop + 重试库足够。
- 分支由单个模型随意生成、状态不可审计：Graph 只会把不确定性画得更漂亮。

当流程存在多个回退点、并行汇聚、跨小时暂停、人工审批或合规审计时，Graph 才明显优于隐藏在 Prompt 和 `if` 中的控制流。

## 学完验收

- 能为每个节点写出输入、输出、幂等和失败契约。
- 测试覆盖成功、条件分支、节点失败、暂停恢复和重复恢复。
- 能解释一次工具循环属于哪个节点，而不是把每次工具调用都画成图节点。

## 参考资料

- [LangGraph Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api)
- [LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [LangGraph Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
