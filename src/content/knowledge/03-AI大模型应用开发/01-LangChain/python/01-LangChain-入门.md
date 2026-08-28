# LangChain（01） - LangChain 是什么、核心包与生态

## 参考资料

- [LangChain Python Overview](https://docs.langchain.com/oss/python/langchain/overview)
- [LangChain Python Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [ChatOpenAI Integration](https://docs.langchain.com/oss/python/integrations/chat/openai)
- [LangGraph Overview](https://docs.langchain.com/oss/python/langgraph/overview)
- [LangSmith Documentation](https://docs.langchain.com/langsmith/home)

> 读完后，你应能回答：
> - 什么时候该用 LangChain，什么时候不用？
> - LangChain 有哪些包？
> - LangChain 的生态是什么？

## 核心知识清单

- LangChain 是大模型应用框架，不是模型，也不会提升模型本身的知识和推理能力
- LangChain v1 的高层入口围绕 Agent、Model、Tool、Middleware 等能力组织
- `langchain-core` 保存消息、Runnable、Prompt 和 Tool 等基础契约
- `langchain-openai` 等集成包负责连接具体模型供应商
- LangGraph 承担更复杂的状态、分支、循环和持久化执行
- LangSmith 用于 Trace、评测与线上观测，不参与业务答案生成

# 一、什么时候该用 LangChain，什么时候不用？

LangChain 是用来构建大模型应用的框架。

它处理的是“模型周围的应用工程”，不是训练模型本身。

一个最小的大模型应用通常只有两步：

1. 把用户问题发给模型。
2. 把模型返回的文本展示出来。

这种场景直接使用模型供应商 SDK 就够了。

当应用继续增长，业务会逐渐出现更多对象：

- System、User、Assistant 和 Tool 消息。
- 可以切换的模型供应商。
- 需要校验的结构化输出。
- 允许模型选择的 Tools。
- 对话历史和运行时上下文。
- 重试、超时、流式输出和回调。
- Trace、评测和人工审批。

LangChain 为这些对象提供相对统一的接口。

统一接口的价值是减少供应商 SDK 与业务代码之间的直接耦合。

例如业务代码不应该到处读取 OpenAI 响应对象的私有字段。

它更适合依赖 LangChain 的消息和模型接口，再由集成包完成协议转换。

# 二、LangChain 有哪些包？

- `langchain`：提供 `create_agent`、Agent 和 Middleware 等高层应用入口。
- `langchain-core`（导入名 `langchain_core`）：提供 Message、Document、Prompt、Runnable、Tool 和 Retriever 等基础契约。
- `langchain-openai`（导入名 `langchain_openai`）等供应商包：提供 ChatModel 和 Embeddings 集成。
- `langchain-text-splitters`、`langchain-mcp-adapters`、`langchain-milvus`：分别提供文档分块、MCP Tool 转换和向量库集成。

| 包 | 负责什么 | 典型导入 |
| --- | --- | --- |
| `langchain` | `create_agent`、Middleware 等高层应用入口 | `langchain.agents` |
| `langchain-core` | Message、Document、Prompt、Runnable、Tool、Retriever 等稳定契约 | `langchain_core.messages`、`langchain_core.runnables` |
| `langchain-openai` | `ChatOpenAI` 与 `OpenAIEmbeddings` | `langchain_openai` |
| `langchain-text-splitters` | `RecursiveCharacterTextSplitter` 等文档分块器 | `langchain_text_splitters` |
| `langchain-mcp-adapters` | 把 stdio 或 Streamable HTTP MCP Server 转换为 LangChain Tools | `langchain_mcp_adapters` |
| `langchain-milvus` | `Milvus` VectorStore 与 Retriever 适配 | `langchain_milvus` |
| `langgraph` | 显式状态图、持久化与可恢复执行 | `langgraph.graph` |
| `langchain-community` | 社区 Loader、VectorStore 和第三方集成 | `langchain_community` |
| `pydantic` | Tool 参数和结构化输出的运行时 schema | `pydantic` |

Python 的安装名通常用连字符，导入名则用下划线。例如安装 `langchain-text-splitters` 后，要从 `langchain_text_splitters` 导入。

## 2.1 LangChain 在 Python 项目的安装与导入

Python 生态使用 PyPI 包拆分核心能力和供应商集成：

```bash
pip install langchain langchain-core langchain-openai langchain-text-splitters
```

消息类型通常从 `langchain_core.messages` 导入，`ChatOpenAI` 来自 `langchain_openai`，`RecursiveCharacterTextSplitter` 来自 `langchain_text_splitters`。Python 类型注解不会自动校验模型生成的 Tool 参数，仍要使用 Pydantic schema 或工具装饰器的参数契约。

```python
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
```

## 2.2 `langchain` 包基础使用

`langchain` 提供 Agent 等高层入口。下面的代码需要已配置模型凭据：

```python runnable model-sandbox mode=tools file=main.py title="langchain Agent 基础使用" description="使用临时模型连接创建 Agent，并观察 Tool Calling。" prompt="请查询成都的天气，并调用 get_weather 工具。"
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI


def get_weather(city: str) -> str:
    """返回演示天气，实际项目应调用真实天气服务。"""
    return f"{city}今天晴，25°C"


model = ChatOpenAI(model="gpt-5.4-mini", temperature=0)
agent = create_agent(
    model=model,
    tools=[get_weather],
    system_prompt="你是天气助手，查询天气时必须调用工具。",
)

result = agent.invoke({"messages": [{"role": "user", "content": "成都天气如何？"}]})
print(result["messages"][-1].content)
```

## 2.3 `langchain-core` 包基础使用

语言对应的 core 包保存跨供应商复用的基础对象。

常见对象包括：

- 消息类型。
- Prompt 模板。
- Runnable 接口。
- Output Parser。
- Tool 定义。
- Callback 与运行配置。

业务代码依赖这些契约后，更换供应商时不需要重写全部上层逻辑。

但“统一接口”不代表所有供应商能力完全一致。

某些模型不支持 Tool Calling，某些兼容接口也不会返回完整 Token Usage。能力差异仍要通过集成文档和真实测试确认。

```python runnable packages=langchain-core file=main.py title="langchain-core Message 与 Runnable" description="安装 langchain-core，运行真实 HumanMessage 与 RunnableLambda。"
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableLambda


def to_message(question: str) -> HumanMessage:
    """把普通字符串转换为 HumanMessage。"""
    return HumanMessage(content=question.strip())


message = RunnableLambda(to_message).invoke("  LangChain core 负责什么？  ")
print(type(message).__name__)
print(message.content)
```

## 2.4 `langchain-openai` 包基础使用

其他模型供应商通常有各自的集成包。

下面的代码需要设置 `OPENAI_API_KEY`：

```python runnable model-sandbox file=main.py title="langchain-openai 基础使用" description="使用临时连接调用真实 ChatModel，并查看 AIMessage。" prompt="LangChain 是模型吗？请只用一句话回答。"
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI


model = ChatOpenAI(model="gpt-5.4-mini", temperature=0)
response = model.invoke(
    [
        SystemMessage(content="只用一句话回答。"),
        HumanMessage(content="LangChain 是模型吗？"),
    ]
)

print(type(response).__name__)
print(response.content)
```

# 三、LangChain 的生态是什么？

LangChain 不是一个包包办全部能力。

它与 LangGraph、LangSmith 和各类集成共同构成生态。

```mermaid
flowchart LR
    A[业务应用] --> B[LangChain]
    B --> C[Model]
    B --> D[Tools]
    B --> E[Middleware]
    B --> F[LangGraph]
    C --> G[模型供应商集成]
    D --> H[数据库与外部 API]
    F --> I[状态、分支、循环与持久化]
    B --> J[LangSmith]
    F --> J
    J --> K[Trace、评测与观测]
```

<!-- DIAGRAM_DESCRIPTION: 业务应用通过 LangChain 组合模型、Tools 和 Middleware；复杂状态进入 LangGraph；模型由供应商集成连接；LangSmith旁路收集 Trace 与评测证据。 -->

## 3.1 LangGraph：复杂执行流程

LangGraph 适合表达状态、分支、循环和可恢复执行。

当流程需要“调用 Tool 后根据结果决定下一步”，它比单向顺序链更自然。

LangChain 的 Agent 能力本身也建立在 LangGraph 的运行能力之上。

学习顺序上，不应在还没理解模型和 Tool 前直接进入复杂图状态。

## 3.2 LangSmith：运行证据

LangSmith 负责记录和评估运行过程。

它可以保存模型调用、Tool 调用、耗时、错误和评测结果。

LangSmith 不替代 LangChain。

一个负责执行应用逻辑，一个负责观察和评估执行结果。

## 3.3 Integrations：连接外部世界

模型、向量数据库、文档加载器和第三方服务都属于集成层。

集成数量多不代表每个集成都由 LangChain 核心团队维护。

## 3.4 下一步学什么？

下一篇只做两件事：

1. 通过 LangChain 接入一个真实 ChatModel。
2. 定义并注册一个 Tool，观察模型返回的 Tool Call。

Prompt、Runnable、LCEL 和 Output Parser 会在后续文章逐层展开。

现在不需要一次理解完整链路。

# 四、总结

> **什么时候该用 LangChain，什么时候不用？** 只有固定 Prompt 和一次模型调用时，直接使用模型供应商 SDK 即可；需要统一消息、切换模型、组合 Tools、管理上下文或接入 Trace 时，再使用 LangChain。

> **LangChain 有哪些包？** `langchain` 提供 Agent 等高层入口，`langchain-core` 提供 Message、Runnable、Prompt 和 Tool 等基础契约，`langchain-openai` 等集成包负责连接具体模型与外部系统。

> **LangChain 的生态是什么？** LangChain 负责组织大模型应用，LangGraph 负责复杂状态与可恢复执行，Integrations 连接模型和外部数据，LangSmith 负责 Trace、评测与观测。
