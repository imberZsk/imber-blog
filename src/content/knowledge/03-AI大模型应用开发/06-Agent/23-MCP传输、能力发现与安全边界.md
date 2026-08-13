# Agent（23） - MCP 传输、能力发现与安全边界

> MCP 统一“如何发现和调用外部能力”，但不会替应用完成身份、授权、参数治理和副作用审批。

> 读完你能：解释 MCP 对象与两种传输，并设计从模型提议到受控执行的安全链。

## 核心知识清单

- MCP Client、Server 与 Host
- Tools、Resources 与 Prompts
- stdio 与 Streamable HTTP
- 初始化、能力协商与生命周期
- 身份认证、授权与租户隔离
- Schema 校验、超时、审计与用户确认

## 协议对象

Tool 表示可执行操作，Resource 表示可读取上下文，Prompt 表示可复用模板。Host 管理用户体验和安全策略，Client 与一个 Server 建立会话。模型看到的描述只是选择依据，真正的权限必须由 Host 和 Server 在执行时验证。

## 两种传输

stdio 适合同机子进程，部署简单且无需开放端口；Streamable HTTP 适合远程共享服务，需要 TLS、身份认证、会话管理、限流和网络策略。不能把本地可信 stdio 的假设直接复制到多租户 HTTP 服务。

## 调用安全链

`模型提议 → JSON Schema 校验 → 身份与租户解析 → 权限检查 → 高风险确认 → 幂等执行 → 审计结果`

读取资源同样需要路径或对象范围限制。Tool 返回值要限制大小并标记不可信内容，防止外部结果通过间接 Prompt Injection 影响后续调用。

## 参考资料

- [MCP Architecture](https://modelcontextprotocol.io/specification/latest/architecture)
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/latest/basic/transports#streamable-http)
