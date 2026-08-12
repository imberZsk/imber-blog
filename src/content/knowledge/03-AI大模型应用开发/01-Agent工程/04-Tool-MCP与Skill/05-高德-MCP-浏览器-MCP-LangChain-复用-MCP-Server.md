# Agent 工程（57）- 高德 MCP + 浏览器 MCP：LangChain 复用别人的 MCP Server 有多爽！

> 读完你能：理解如何在 LangChain 等框架里复用现成 MCP Server，以及复用时要控制哪些风险。

# 一、本篇定位

这是 MCP 的应用篇：从理解协议转到把地图、浏览器这类外部能力接进 Agent。

# 二、一个真实场景

你要做一个出行规划 Agent。它既要查地点、算距离，又要打开网页确认信息。如果每个能力都从零写工具，成本很高；直接复用高德 MCP、浏览器 MCP，可以把重点放在业务编排上。

# 三、核心拆解

- 复用 MCP Server 的前提是工具描述足够清楚。模型靠工具名、description、参数 schema 判断什么时候调用它。
- LangChain 这类框架可以把 MCP 工具适配成自己的 Tool 接口，这样 Agent 不关心工具来自本地函数还是外部 Server。
- 外部 MCP 的风险在于不可控：接口变更、结果格式变化、权限过宽、网络不稳定，都可能让 Agent 出错。

# 四、工程链路

- 选择 MCP Server 并确认工具清单。
- 在客户端把 MCP tool 转成框架 Tool。
- 给模型提供少量、明确、当前任务相关的工具。
- 调用后把结构化结果压缩成模型能用的观察。
- 失败时给出可恢复错误而不是让 Agent 无限重试。

# 五、落地建议

- 只加载当前任务需要的 MCP 工具，别全量丢给模型。
- 为浏览器类工具设置访问域名和动作限制。
- 为地图类工具缓存静态结果，减少重复请求。

# 六、常见坑

- 复用别人 Server 却不读工具 schema。
- 浏览器工具没有限制，可能访问敏感页面。
- 把 MCP 输出原样塞进上下文，导致噪声过多。

# 七、和已有主线的关系

56 讲 MCP 基础；57 说明它如何进入 LangChain 生态，并和后续 66-69 的 chain 组装衔接。

# 八、复述答法

> 复用 MCP 的爽点是少写工具，难点是控制工具集合和结果质量。工程上我会把 MCP tool 适配成框架工具，只暴露当前任务需要的少量能力，并加域名、权限、超时和输出压缩。

# 九、总结

- **核心拆解**：复用 MCP Server 的前提是工具描述足够清楚。
- **工程链路**：选择 MCP Server 并确认工具清单。
- **常见坑**：复用别人 Server 却不读工具 schema。
- **本篇定位**：这是 MCP 的应用篇：从理解协议转到把地图、浏览器这类外部能力接进 Agent。

## 十、最小可运行示例：调用 stdio MCP

~~~text
# requirements.txt
mcp[cli]
~~~

~~~python
from __future__ import annotations

import asyncio

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main() -> None:
    """启动受信 MCP Server，发现工具并执行一次只读调用。"""

    # Server 命令和参数由应用配置，不接受模型动态改写。
    server = StdioServerParameters(command="python", args=["server.py"])
    async with stdio_client(server) as (reader, writer):
        # 当前会话负责初始化协议并关联一次进程连接。
        async with ClientSession(reader, writer) as session:
            await session.initialize()
            # 工具清单用于在调用前核对名称与输入 Schema。
            tools = await session.list_tools()
            if not any(tool.name == "lookup_policy" for tool in tools.tools):
                raise RuntimeError("required tool is unavailable")
            # 工具结果仍是不可信外部数据，返回模型前限制长度并标记来源。
            result = await session.call_tool("lookup_policy", {"policy_id": "refund"})
            print(result.content)


asyncio.run(main())
~~~

浏览器 MCP、高德 MCP 等第三方 Server 要先审计来源、版本、权限和网络范围；工具描述不是安全边界，客户端仍要维护允许调用的 Server 与 Tool 清单。
