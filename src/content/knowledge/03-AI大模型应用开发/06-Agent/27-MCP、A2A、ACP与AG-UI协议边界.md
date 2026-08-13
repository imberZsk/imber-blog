# Agent（27） - MCP、A2A、ACP 与 AG-UI 协议边界

> Agent 协议解决的问题不同：MCP 连接能力，A2A/ACP 连接 Agent，AG-UI 连接 Agent 与用户界面；协议不能替代业务授权和可靠执行。

> 读完你能：根据连接对象选择协议，并设计跨 Agent 任务、前端事件和安全边界。

## 核心知识清单

- MCP 的 Tool、Resource、Prompt 与能力发现
- A2A Agent Card、Task、Message 与 Artifact
- ACP Agent 通信与互操作契约
- AG-UI Run、Message、Tool、State 与前端事件
- Skill 的流程知识与协议能力边界
- 身份传播、租户隔离、审批、幂等与 Trace

## 四类问题不要混用

| 需求 | 适合的机制 | 核心边界 |
| --- | --- | --- |
| Agent 调数据库、浏览器或内部服务 | MCP | 能力发现与工具调用 |
| 一个 Agent 委托另一个独立 Agent | A2A 或 ACP | 任务、消息、状态与产物交换 |
| Agent 向前端推送文本、Tool 和状态 | AG-UI | 用户界面事件与交互 |
| 告诉 Agent 某类工作应该怎么完成 | Skill | 可复用流程、脚本和验收规则 |

MCP Server 不是子 Agent；A2A Agent 也不等于一个 Tool。把长时间、多状态的外部 Agent 强行包装成同步 Tool，会丢失取消、进度、产物和恢复语义。

## 跨 Agent 任务契约

任务应包含全局唯一 ID、目标、输入引用、身份上下文、截止时间和允许的能力。状态至少区分 submitted、working、input-required、completed、failed 和 canceled。产物使用可验证引用与媒体类型，不把大文件塞进消息正文。

## 安全与可观测性

协议携带的身份声明不能被下游直接信任，应由网关验证并换取最小权限凭据。跨租户资源、写操作和外部消息仍要服务端授权与必要的用户确认。重试用任务幂等键，取消要传播到正在执行的 Tool。

Trace 通过 `trace_id`、`task_id` 和父子 Span 串起 UI、主 Agent、远程 Agent 与 MCP Tool；日志只保存脱敏参数和产物摘要。每个边界设置超时、最大消息大小、并发和预算。

## 参考资料

- [MCP Specification](https://modelcontextprotocol.io/specification/latest)
- [A2A Specification](https://a2a-protocol.org/latest/specification/)
- [ACP Introduction](https://agentcommunicationprotocol.dev/introduction/welcome)
- [AG-UI Documentation](https://docs.ag-ui.com/)
- [Agent Skills Specification](https://agentskills.io/specification)

