# 应用框架（09） - LangChain 整体总结：AI Agent 第一阶段学习完成

> 读完你能：把 Prompt、Tool、Retriever、Parser、Runnable 串成一张 LangChain 能力地图。

# 一、本篇定位

这是 LangChain 小阶段总结，帮助你判断自己是否真的掌握了框架本质。

# 二、一个真实场景

学完 LangChain 后，很多人会记住一堆类名，却说不清项目里为什么用它。正确的总结方式是回到工程问题：prompt 怎么复用，检索怎么接，工具怎么暴露，输出怎么解析，链路怎么追踪。

# 三、核心拆解

- LangChain 的价值是标准化组件和组合方式。它把 prompt、model、retriever、tool、parser 变成可组合的积木。
- 它不替你解决业务边界。权限、工具确认、引用来源、拒答、评测和部署仍然要你自己设计。
- 它适合快速搭多步骤固定流程和复用生态组件，不适合简单到一次模型调用的场景，也不适合强循环状态机。

# 四、工程链路

- 用 PromptTemplate 管提示词。
- 用 Retriever 接知识库。
- 用 Tool 暴露外部能力。
- 用 Parser 稳定输出。
- 用 Runnable/LCEL 串固定流程。
- 复杂分支交给 LangGraph。

# 五、落地建议

- 学习 LangChain 要记抽象，不死记版本 API。
- 项目里先裸写最小链路，再决定是否引框架。
- 每条 chain 都要有输入输出契约和 trace。

# 六、常见坑

- 用框架掩盖自己没想清流程。
- API 版本变化就完全不会改。
- 以为 LangChain 默认会处理安全和评测。

# 七、和已有主线的关系

35 是入门，66-68 是拆解，69 是阶段收束；后面进入 Nest、LangGraph 和工程化。

# 八、复述答法

> LangChain 可以总结为“组件标准化 + 链式组合”。它让 prompt、retriever、tool、parser、model 更容易复用，但业务安全、引用、拒答、评测和状态管理仍要自己负责。简单需求裸写，固定多步骤用 chain，复杂循环上 LangGraph。

# 九、总结

- **核心拆解**：LangChain 的价值是标准化组件和组合方式。
- **工程链路**：用 PromptTemplate 管提示词。
- **常见坑**：以为 LangChain 默认会处理安全和评测。
- **本篇定位**：这是 LangChain 小阶段总结，帮助你判断自己是否真的掌握了框架本质。

## 参考资料

- [LangChain 文档](https://docs.langchain.com/oss/python/langchain/overview)
- [Dify 文档](https://docs.dify.ai/)
