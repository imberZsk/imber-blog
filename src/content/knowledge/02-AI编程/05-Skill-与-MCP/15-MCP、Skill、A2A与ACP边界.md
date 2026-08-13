# Skill 与 MCP（15） - MCP、Skill、A2A 与 ACP 边界

> Skill 说明“怎么做”，MCP 暴露“能调用什么”，A2A/ACP 处理“Agent 如何协作”。混用会丢失任务状态、权限或执行语义。

> 读完你能：为编码 Agent 选择 Skill、MCP、A2A 或 ACP，并设计能力发现、任务协议和最小权限。

## 核心知识清单

- Skill 说明文档、脚本、资源与渐进披露
- MCP Host、Client、Server、Tool、Resource 与 Prompt
- stdio、Streamable HTTP 与能力协商
- A2A Agent Card、Task、Message 与 Artifact
- ACP Agent 通信和互操作
- Skill 与 MCP、MCP 与远程 Agent 的边界
- 身份、授权、用户确认、幂等与审计

## 边界判断

可复用的代码审查流程、模板和验证步骤放 Skill；文件、工单、浏览器等外部能力通过 MCP 暴露；一个拥有独立目标、状态和长任务生命周期的远程 Agent 使用 A2A 或 ACP。把远程 Agent 包成同步 MCP Tool 会丢失进度、取消、输入请求和产物语义。

## MCP 安全

Host 管用户体验和策略，Client 连接 Server 并发现能力，Server 在执行时重新验证身份、租户、参数和资源。stdio 适合同机子进程，Streamable HTTP 需要 TLS、OAuth、限流和网络策略。高风险 Tool 在具体参数形成后请求用户确认。

## Agent 协作

A2A 通过 Agent Card 描述能力，Task 管状态，Message 交换信息，Artifact 交付结果；ACP 也关注跨框架 Agent 通信。无论协议，都要有任务 ID、超时、取消、幂等和 Trace。下游 Agent 权限不应大于委派范围。

## 参考资料

- [Agent Skills Specification](https://agentskills.io/specification)
- [MCP Specification](https://modelcontextprotocol.io/specification/latest)
- [A2A Specification](https://a2a-protocol.org/latest/specification/)
- [ACP Introduction](https://agentcommunicationprotocol.dev/introduction/welcome)

