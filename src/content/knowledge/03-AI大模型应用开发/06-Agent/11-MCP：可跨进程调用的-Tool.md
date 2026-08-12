# Agent（11） - MCP：可跨进程调用的 Tool

> 读完你能：理解 MCP 为什么出现，以及它和普通 Function Calling 的区别。

# 一、本篇定位

这是工具系统从“项目内函数”走向“可复用外部工具服务”的篇章。

# 二、一个真实场景

你在一个 Agent 项目里写了浏览器工具、地图工具、数据库工具。换一个 Agent 项目，又要重新接一遍。MCP 的价值就是把这些工具从单个应用里抽出来，变成独立进程提供的标准能力，让不同客户端都能发现和调用。

# 三、核心拆解

- 普通 Tool 往往是应用内函数，生命周期跟应用绑在一起。MCP Server 是独立进程，负责暴露 tools、resources、prompts 等能力。
- MCP Client 负责和 Server 建连接、发现工具 schema、发起调用、接收结果。模型仍然只提出调用意图，执行边界仍在客户端和服务端控制。
- MCP 解决的是工具分发和复用问题，不自动解决权限、安全和质量问题。Server 暴露了危险工具，客户端照样要拦。

# 四、工程链路

- 启动 MCP Server。
- 客户端连接并拉取工具列表。
- 模型根据工具描述提出调用。
- 客户端校验后转发给 MCP Server。
- Server 执行并返回结构化结果。
- 客户端把结果回填给模型。

# 五、落地建议

- 把跨项目复用的能力做成 MCP，比如浏览器、文件系统、企业内部 API。
- 为每个 MCP Server 标记权限等级，避免所有工具混在一个大列表里。
- 调用日志要记录到客户端侧，方便和模型 trace 对齐。

# 六、常见坑

- 以为接了 MCP 就安全。协议只是通道，策略还得自己做。
- 一次暴露太多工具，模型选择困难。
- Server 返回非结构化大文本，客户端难以稳定处理。

# 七、和已有主线的关系

28 的工具调用是函数级；56 把工具能力提升到进程级和生态级，是 进阶-多Agent与MCP工程化 的前置知识。

# 八、复述答法

> MCP 可以理解成跨进程的工具协议：Server 暴露工具，Client 发现和调用，模型只负责选择。它的价值是复用和标准化，不是替代权限系统。真正上线仍要做工具分级、调用校验和 trace。

# 九、总结

- **核心拆解**：普通 Tool 往往是应用内函数，生命周期跟应用绑在一起。
- **工程链路**：客户端校验后转发给 MCP Server。
- **常见坑**：以为接了 MCP 就安全。
- **本篇定位**：这是工具系统从“项目内函数”走向“可复用外部工具服务”的篇章。

## 十、最小可运行示例：MCP Server

~~~text
# requirements.txt
mcp[cli]
~~~

~~~python
from __future__ import annotations

from mcp.server.fastmcp import FastMCP


# MCP Server 名称会暴露给连接它的客户端。
mcp = FastMCP("knowledge-tools")


@mcp.tool()
def lookup_policy(policy_id: str) -> str:
    """按稳定 ID 查询公开示例制度；policy_id 是工具参数。"""

    # 教学数据模拟后端权限过滤后的制度结果。
    policies = {"refund": "退款审核通过后三个工作日内原路退回。"}
    return policies.get(policy_id, "未找到可访问制度")


if __name__ == "__main__":
    mcp.run(transport="stdio")
~~~

生产工具不能信任客户端传来的租户和角色；MCP Server 从连接身份或后端令牌计算权限，并对工具参数、输出大小、超时和副作用单独设限。

## 参考资料

- [LangChain Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [LangGraph 文档](https://docs.langchain.com/oss/python/langgraph/overview)
