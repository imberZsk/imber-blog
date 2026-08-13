# Agent（26） - Deep Agents Harness、Skill 与上下文压缩

> Deep Agents 适合长任务 Harness：计划、文件、子 Agent、Skill、压缩和人工审批共同工作；它不是所有 Tool Agent 的默认选择。

> 读完你能：设计最小上下文的子 Agent 协作、虚拟文件系统与 Skill 装载，并控制危险 Tool 和上下文膨胀。

## 核心知识清单

- Deep Agents 与开箱即用 Agent Harness
- Task Planning、子 Agent 与最终责任
- 虚拟文件系统、Backend 持久化与路径权限
- Summarization、Context Offloading 与 Prompt Caching
- Skill 渐进披露、短规则与详细流程
- 危险 Tool 审批、Sandbox 与预算上限

## 什么时候值得使用

适合需要多阶段计划、访问大量文件、并行研究、长时间运行和人工审批的任务。只有三五个工具、一步即可回答时，普通 Agent 或固定 Chain 更容易测试和维护。

## 文件与上下文

大段 Tool 结果写入虚拟文件系统，主上下文只保留路径、摘要和来源。Backend 决定文件是否跨运行持久化；路径必须限制在任务工作区，禁止访问宿主机密钥、生产配置和不相关仓库。

上下文接近阈值时，对已完成阶段做结构化 Summarization：保留目标、已确认事实、变更、验证证据、未决风险和文件引用。摘要不是事实来源，关键判断仍要回链原始文件。

## Skill 与子 Agent

高频且短的规则放系统约束；低频、详细、可复用流程放 Skill，通过名称和描述先披露索引，需要时再读取正文。子 Agent 只接收完成子任务所需的最小上下文，输出事实、证据、假设和未完成项。主 Agent 对最终整合、权限和验收负责，不能把责任一起“委派”出去。

## 安全与成本

Shell、浏览器、文件写入和外部消息 Tool 采用最小权限；危险操作在具体参数确定后再请求审批。限制总轮次、子 Agent 数、模型 Token、Tool 时间和并发。Trace 记录委派关系与结果来源，避免并行分支的冲突结果被静默覆盖。

## 参考资料

- [Deep Agents Overview](https://docs.langchain.com/oss/python/deepagents/overview)
- [Deep Agents Subagents](https://docs.langchain.com/oss/python/deepagents/subagents)
- [Deep Agents Filesystem](https://docs.langchain.com/oss/python/deepagents/harness)

