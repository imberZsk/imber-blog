# LangChain（02） - LangChain 接入大模型与注册 Tools


## Python 实现地图

Python 从 `langchain_core.messages` 导入四种核心 Message，用 `langchain_core.tools.tool` 装饰器和类型注解定义参数。模型通过 `bind_tools()` 注册工具；执行 Tool 后用对应的 `tool_call_id` 构造 `ToolMessage`。

```python runnable file=main.py title="Python Message 流转" description="观察四种核心 Message 在 Tool Calling 循环中的顺序。"
messages = ["SystemMessage", "HumanMessage", "AIMessage(tool_calls)", "ToolMessage", "AIMessage(final)"]
for index, message in enumerate(messages, start=1):
    print(f"{index}. {message}")
```


> 读完后，你应能：
> - 使用临时 Base URL、API Key 和模型名完成一次真实 ChatModel 调用，并输出模型响应与 Token 用量记录。
> - 使用 `tool` 和 Pydantic schema 定义 `get_weather`，再通过 `bind_tools` 注册给模型，并输出 schema 检查结果。
> - 区分“模型提出 Tool Call”和“应用执行 Tool”，并输出运行结果证明本文只完成前者。

## 核心知识清单

- `ChatOpenAI` 是 LangChain 对 OpenAI 和兼容接口的 ChatModel 集成
- Base URL、API Key 与模型名是连接配置，不属于 Prompt
- Tool 由名称、描述、输入 schema 和执行函数组成
- `bind_tools` 把 Tool schema 暴露给模型，不会自动执行 Tool
- 模型返回 Tool Call 后，应用仍要校验权限、参数和副作用
- Tool 执行结果必须带着对应的调用 ID 回传，完整循环放到 Tool Calling 专题继续学习

# 一、本篇只解决哪两个问题？

第一篇已经说明 LangChain 的定位、包和生态。

这一篇不进入 Runnable、LCEL 和 Agent 循环。

只完成两个最小目标：

1. 让 LangChain 成功连接真实大模型。
2. 给模型注册一个 Tool，并看到模型生成 Tool Call。

完成这两步后，你会知道模型能力和外部能力如何进入 LangChain。

后续文章再解释它们如何组合成 Chain。

# 二、接入大模型需要哪些信息？

模型连接至少需要三个值。

| 配置 | 作用 | 常见错误 |
| --- | --- | --- |
| Base URL | 指向供应商 API 根地址 | 填成控制台首页或漏掉版本路径 |
| API Key | 证明调用身份 | Key 失效、无模型权限或被错误回显 |
| 模型名 | 指定真实模型 | 使用供应商不存在的模型标识 |

这三个值都属于运行配置。

不要把它们写死在文章源码或 Git 仓库中。

在线沙盒只在当前页面内存中保存 Key。

请求通过同源服务端代理发送。

服务端会拒绝 HTTP、localhost、私网 IP 和云元数据地址。

## 2.1 为什么使用 `ChatOpenAI`？

本文使用 Python 的 `langchain-openai`。

其中 `ChatOpenAI` 把 LangChain 消息转换成 OpenAI 协议请求。

很多供应商提供 OpenAI 兼容接口，因此也可以通过自定义 Base URL 接入。

“协议兼容”不代表所有功能都兼容。

供应商仍可能缺少以下能力：

- Tool Calling。
- 流式 Tool Call。
- Token Usage。
- 严格结构化输出。
- 某些模型参数。

所以连接成功后还要针对实际功能单独验证。

# 三、先理解一次普通模型调用

一次普通调用的链路很短。

```mermaid
sequenceDiagram
    participant U as 用户
    participant A as 应用
    participant L as ChatOpenAI
    participant M as 模型供应商
    U->>A: 输入问题
    A->>L: messages + connection
    L->>M: Chat 请求
    M-->>L: Assistant 消息
    L-->>A: AIMessage
    A-->>U: 展示文本与 Usage
```

<!-- DIAGRAM_DESCRIPTION: 用户问题由应用交给 ChatOpenAI，ChatOpenAI 调用模型供应商并返回统一 AIMessage，应用展示文本和 Token Usage。 -->

这里还没有 Tool。

模型只能基于输入和自身能力返回消息。

如果问题依赖实时订单、天气或数据库，模型不能凭空读取这些系统。

# 四、Message 有哪些类型？

LangChain 用 Message 统一表达“谁说了什么”和“这条消息携带了什么调用信息”。常见的四种消息不是四个可以随意互换的字符串角色：

| 类型 | 谁产生 | 主要用途 |
| --- | --- | --- |
| `SystemMessage` | 应用 | 约束模型身份、规则、输出边界和安全要求 |
| `HumanMessage` | 用户或应用 | 表达用户问题、任务输入和多模态输入 |
| `AIMessage` | 模型 | 表达模型文本回复、Token 用量和 `tool_calls` |
| `ToolMessage` | 应用执行 Tool 后 | 携带与 `tool_call_id` 对应的 Tool 结果，交回模型继续推理 |

还会遇到 `BaseMessage` 及其扩展类型。它是公共抽象，不代表一类额外的业务角色；某些集成也会携带自定义消息或消息块。实际编排时先保证四种核心消息的顺序和关联 ID 正确，再处理供应商扩展。

一次完整 Tool Calling 对话通常是：

```text
SystemMessage -> HumanMessage -> AIMessage(tool_calls) -> ToolMessage -> AIMessage(final)
```

`AIMessage` 提出调用，`ToolMessage` 只能由应用在完成权限校验和执行后创建。不能把模型返回的 JSON 直接伪装成 `ToolMessage`，也不能漏掉 `tool_call_id`，否则模型无法知道结果对应哪一次调用。

# 四、LangChain Tool 是什么？

Tool 是应用暴露给模型的一项受控能力。

一个 Tool 至少包含四部分：

| 字段 | 作用 |
| --- | --- |
| `name` | 模型返回 Tool Call 时使用的稳定名称 |
| `description` | 告诉模型什么时候应该选择该 Tool |
| `schema` | 约束 Tool 输入字段、类型和必填项 |
| 执行函数 | 应用确认调用后真正访问外部系统 |

名称应该稳定、明确。

描述应该解释适用条件，不要只重复名称。

schema 是运行时契约，不只是 Python 类型提示。

执行函数必须把不可信参数当成外部输入重新校验。

## 4.1 为什么需要 schema？

模型生成的是调用建议，不是可信程序输入。

它可能遗漏字段。

它可能使用错误类型。

它也可能生成超出权限范围的资源 ID。

Pydantic schema 可以先检查数据形状。

但 schema 不能替代权限检查。

例如 `city` 是合法字符串，不代表当前业务允许查询任意位置的内部数据。

# 五、`bind_tools` 到底做了什么？

`bind_tools` 会把 Tool 的名称、描述和 schema 放进模型请求。

模型看到这些定义后，可以选择：

- 直接返回普通文本。
- 返回一个或多个 Tool Call。

`bind_tools` 不会自动执行 Tool 函数。

这条边界非常重要。

模型只能提出“我想调用 `get_weather`，参数是 `{ city: ... }`”。

应用收到后仍要决定是否执行。

## 5.1 注册不等于执行

下面的状态图把两者分开。

```mermaid
stateDiagram-v2
    [*] --> Register: 定义并 bind_tools
    Register --> AskModel: 发送用户问题
    AskModel --> TextAnswer: 模型直接回答
    AskModel --> ToolProposal: 模型返回 Tool Call
    ToolProposal --> Validate: 应用校验名称、参数、权限
    Validate --> Reject: 不允许执行
    Validate --> Execute: 允许执行
    Execute --> ReturnResult: 回传 ToolMessage
    ReturnResult --> AskModel
    TextAnswer --> [*]
    Reject --> [*]
```

<!-- DIAGRAM_DESCRIPTION: bind_tools 只完成注册；模型产生 Tool Call 后，应用必须校验再执行，并把 ToolMessage 回传给模型形成完整循环。 -->

本文沙盒停在 `ToolProposal`。

它不会访问真实天气接口。

这样可以先验证模型是否理解 Tool schema，又不会产生外部副作用。

# 六、可运行实验：真实模型与 Tool 注册

这个沙盒会执行真实 LangChain 模型调用。

它注册一个确定性的 `get_weather` 教学 Tool。

为了稳定观察 Tool Call，服务端会要求模型选择该 Tool。

运行后应看到：

- 实际模型名。
- Token Usage（供应商支持时）。
- `get_weather` Tool 名称。
- 模型生成的 `city` 参数。
- 明确提示“本文未执行 Tool”。

```python runnable file=main.py title="Python Tool Call 消息契约" description="验证 Tool Call 与 ToolMessage 必须使用同一个关联 ID。"
tool_call = {"id": "call_weather_1", "name": "get_weather", "args": {"city": "成都"}}
tool_message = {"tool_call_id": tool_call["id"], "content": "晴，24 摄氏度"}
assert tool_message["tool_call_id"] == tool_call["id"]
print(tool_call)
print(tool_message)
print("应用完成权限校验后才允许执行 Tool")
```

## 6.1 如何判断实验通过？

不能只看页面显示“运行成功”。

至少检查下面四项：

1. Tool 名称必须是 `get_weather`。
2. 参数必须包含非空 `city`。
3. 输出必须声明 Tool 尚未执行。
4. API Key 不能出现在源码、URL、日志或输出中。

如果模型直接返回天气文本，而没有 Tool Call，说明当前供应商或模型的 Tool Calling 兼容性需要检查。

# 七、模型返回 Tool Call 后怎么办？

完整执行循环还有四步：

1. 校验 Tool 名称是否在白名单。
2. 用 schema 校验参数，并检查当前用户权限。
3. 执行 Tool，保存副作用和审计记录。
4. 把结果作为 ToolMessage 回传给模型。

本文不展开这四步。

它们会在“完整 Tool Calling 循环”专题中单独学习。

现在只需记住：模型不能直接调用你的数据库或操作系统。

真正执行动作的是应用代码。

# 八、常见失败怎么定位？

| 现象 | 优先检查 |
| --- | --- |
| 401 或 403 | API Key、账号权限和模型权限 |
| 404 | Base URL 版本路径和模型名 |
| 429 | 余额、RPM、TPM 与并发限制 |
| 请求超时 | 网络、上游状态和模型响应时间 |
| 模型没有 Tool Call | 模型能力、供应商兼容性与 Tool 描述 |
| Tool 参数缺失 | schema 描述、用户问题和模型能力 |
| Tool 参数越权 | 应用权限校验，而不是继续改 Prompt |

认证失败不是 Prompt 问题。

Tool 参数合法也不代表权限合法。

每次只改变一个条件，保留原始响应再判断根因。

# 九、上线前边界

- [ ] API Key 只通过环境变量或密钥服务注入。
- [ ] Base URL 只允许批准的公网 HTTPS 地址。
- [ ] 模型名来自供应商真实支持列表。
- [ ] 所有 Tool 名称进入白名单。
- [ ] 所有 Tool 参数通过 schema 与业务权限双重校验。
- [ ] 有副作用的 Tool 在执行前进行确认。
- [ ] Tool 调用使用幂等键，避免重试产生重复副作用。
- [ ] Tool Call、执行结果与调用身份进入审计记录。
- [ ] 超时和中止不会把半成品结果当成成功。
- [ ] 错误信息不会回显 API Key。

# 十、本篇与后续课程的边界

本篇只建立 Model 和 Tool 两个入口。

后续课程按下面顺序继续：

1. Runnable：理解统一输入输出接口。
2. LCEL：理解多个 Runnable 如何组合。
3. Output Parser：理解模型输出如何进入业务类型。
4. Callback 与 Middleware：理解运行时扩展。
5. LangGraph 与 Tool Calling：理解完整循环、状态和恢复。

不要在第二篇一次学习完所有抽象。

先确认模型能连通，再确认 Tool 能注册。

## 参考资料

- [LangChain Python Overview](https://docs.langchain.com/oss/python/langchain/overview)
- [LangChain Python Tools](https://docs.langchain.com/oss/python/langchain/tools)
- [ChatOpenAI Integration](https://docs.langchain.com/oss/python/integrations/chat/openai)
- [LangChain Models and Tool Calling](https://docs.langchain.com/oss/python/langchain/models)
- [Pydantic Documentation](https://pydantic.dev/)
