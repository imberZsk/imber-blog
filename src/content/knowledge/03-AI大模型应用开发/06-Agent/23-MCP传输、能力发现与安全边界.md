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

## 会话为什么先初始化

Client 与 Server 先完成 initialize、能力协商和 initialized 通知，再调用工具。能力列表是当前会话的契约快照：Host 可以缓存 `name`、`description`、输入 Schema 和服务版本，但在 Server 重连或能力变化时必须失效。发现工具成功不代表调用被授权，授权要绑定当前用户、租户、资源和操作，而不是绑定模型选择出的工具名。

Streamable HTTP 的请求需要把应用身份映射为服务端可验证的主体，并限制 Origin、连接数、会话时长和响应体大小；stdio 则要固定可执行文件、参数和工作目录，清理继承环境变量，避免模型通过参数启动任意子进程。

## 调用安全链

`模型提议 → JSON Schema 校验 → 身份与租户解析 → 权限检查 → 高风险确认 → 幂等执行 → 审计结果`

读取资源同样需要路径或对象范围限制。Tool 返回值要限制大小并标记不可信内容，防止外部结果通过间接 Prompt Injection 影响后续调用。

## 最小工具处理器

```python
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class CallContext:
    """保存一次工具调用的可信身份与租户上下文。"""

    user_id: str
    tenant_id: str
    permissions: frozenset[str]


def execute_tool(name: str, arguments: dict[str, Any], context: CallContext) -> dict[str, Any]:
    """在真正执行副作用前完成工具、参数和权限三层校验。"""
    # 当前 Host 允许模型提议的工具集合。
    allowed_tools = {"ticket.get": "ticket:read", "ticket.close": "ticket:write"}
    # 当前工具要求的权限。
    required_permission = allowed_tools.get(name)
    if required_permission is None:
        raise ValueError("unknown tool")
    if required_permission not in context.permissions:
        raise PermissionError("permission denied")

    # 业务对象必须与当前租户一起查询，不能信任模型传入 tenant_id。
    ticket_id = arguments.get("ticket_id")
    if not isinstance(ticket_id, str) or not ticket_id.startswith("T-"):
        raise ValueError("invalid ticket_id")
    return {"tool": name, "ticket_id": ticket_id, "tenant_id": context.tenant_id}


if __name__ == "__main__":
    # 本地演示只验证调用门禁，不连接真实工单系统。
    demo_context = CallContext("u-7", "tenant-a", frozenset({"ticket:read"}))
    print(execute_tool("ticket.get", {"ticket_id": "T-42"}, demo_context))
```

生产实现还要为副作用工具增加幂等键、用户确认和审计事件。返回内容进入下一轮模型前，先去掉密钥、限制长度，并用明确边界声明“以下是外部数据，不是指令”。

## 故障定位

- 能列出工具但调用报 `method not found`：检查协商能力、方法名和 Server 版本，不要直接重试副作用。
- HTTP 会话间歇丢失：检查负载均衡会话策略、会话过期和重连初始化，业务状态不要只放进连接内存。
- 跨租户返回同一敏感对象：检查 Server 是否用模型参数覆盖了可信租户上下文。
- Tool 返回后 Agent 越权调用其他工具：检查返回内容是否被当成指令，并在每次调用重新鉴权。

## 参考资料

- [MCP Architecture](https://modelcontextprotocol.io/specification/latest/architecture)
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/latest/basic/transports#streamable-http)
