# 应用框架（16） - LangChain v1 运行时、中间件与迁移边界

> LangChain v1 的核心价值是统一 Model、Message、Tool、Middleware 和 Agent Runtime，而不是让业务代码依赖更多魔法封装。

> 读完你能：判断固定 Chain、Agent 与 LangGraph 的边界，并从旧版 AgentExecutor 或 ConversationChain 迁移到显式状态和中间件。

## 核心知识清单

- LangChain v1、Provider 集成与 LangGraph Runtime
- Model、Message、Tool、Retriever 与结构化输出
- 固定 Chain、Agent Loop 与 Graph 的选择边界
- response_format、context_schema 与 recursion_limit
- before_agent、before_model、wrap_model_call 与 wrap_tool_call
- 消息裁剪、Context Offloading 与 Prompt Caching
- AgentExecutor、ConversationChain 与版本迁移

## 三种编排方式

固定步骤、无模型决策时使用 LCEL Chain；模型需要在有限工具间循环选择时使用 `create_agent`；需要分支、并行、人工中断、持久化恢复或确定性节点时使用 LangGraph。不要因为“以后可能复杂”就把简单抽取做成 Agent。

`create_agent` 需要显式控制：

- `response_format`：最终结构化结果的 Schema。
- `context_schema`：运行期依赖，如用户、租户和权限上下文。
- `recursion_limit`：防止工具循环失控。
- Tool：严格参数 Schema、错误语义和副作用边界。

`response_format` 约束 Agent 的最终业务结果，适合把自然语言收敛为可校验的结构化对象；它不负责约束每次 Tool 的参数。`context_schema` 定义运行期依赖的类型，例如 `tenant_id`、用户权限和请求配置，这些数据由应用注入，不能让模型从用户文本中自行生成。

两者必须分开：前者是模型输出契约，后者是可信运行上下文契约。若把租户或权限混进 `response_format`，模型就可能“回答”出一个身份；若把业务结果塞进 `context_schema`，中间件又无法对最终输出做独立校验。

## 中间件生命周期

`before_agent` 适合初始化运行上下文；`before_model` 可裁剪消息或注入动态规则；`wrap_model_call` 适合模型路由、重试与追踪；`wrap_tool_call` 适合参数校验、授权、审批和结果截断；`after_model` 与 `after_agent` 用于校验和收尾。观察性逻辑不能悄悄改变业务结果，策略性中间件必须有独立测试。

`wrap_model_call` 包裹一次真实模型调用，因此可以依据上下文选择模型、记录 Token 与延迟，并对可重试错误执行有上限的退避。它不能无条件重试解析失败或安全拒绝，否则会增加成本并把确定性错误伪装成偶发故障。

## Context Engineering

消息历史只是上下文的一部分。长期事实、检索证据、工具结果和运行配置应各自有来源与预算。超出窗口时，优先把大结果存入对象存储或虚拟文件系统，只把引用和摘要留给模型；稳定的前缀可以利用 Prompt Caching，但缓存键必须包含权限与版本。

## 从旧教程迁移

遇到 `AgentExecutor`、`ConversationChain` 或隐式 Memory 时，先核对版本，不要直接复制。迁移顺序是：明确输入输出 Schema，抽离 Tool，显式定义 Context 和 State，再迁移到 v1 Agent 或 LangGraph，最后用固定 Dataset 对比行为。旧版能运行不代表具有持久化、HIL 或可观测语义。

## 参考资料

- [LangChain Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [LangChain Middleware](https://docs.langchain.com/oss/python/langchain/middleware/overview)
- [LangChain Runtime](https://docs.langchain.com/oss/python/langchain/runtime)
- [LangChain v1 Migration](https://docs.langchain.com/oss/python/migrate/langchain-v1)
