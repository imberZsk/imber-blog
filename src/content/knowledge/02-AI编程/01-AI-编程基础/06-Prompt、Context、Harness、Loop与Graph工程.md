# AI 编程基础（06） - Prompt、Context、Harness、Loop 与 Graph 工程

> 五类工程解决不同问题：指令表达、信息供给、运行支架、执行循环和状态编排不能混成一个“超级 Prompt”。

> 读完你能：区分五类工程的职责，并把失败归因到正确层次而不是一律修改 Prompt。

## 核心知识清单

- Prompt Engineering：任务、约束与输出契约
- Context Engineering：相关事实、工具结果与预算
- Harness Engineering：工具、权限、沙盒与生命周期
- Loop Engineering：观察、行动、停止与恢复
- Graph Engineering：显式状态、分支、并行与人工审批
- Vibe Coding 与 Agentic Engineering 的边界

## 分层职责

Prompt 决定模型收到什么指令；Context 决定模型看见哪些事实；Harness 决定模型能调用什么以及调用前后如何治理；Loop 驱动“模型 → 工具 → 观察”的重复过程；Graph 把复杂工作流的状态和路由写入代码。选错层会产生典型反模式，例如用 Prompt 要求“绝不删错文件”，却不给文件工具设置路径边界。

## 组合示例

代码修复 Agent 用 Prompt 声明目标和完成条件，用搜索结果和测试日志构建 Context；Harness 提供只读搜索、受控编辑和命令超时；Loop 在每次工具结果后重新决策；遇到“复现 → 修复 → 测试 → 审查”的固定阶段时，再用 Graph 保证顺序和失败回退。

## Loop 和 Graph 的边界

Loop 解决“下一轮根据什么证据继续”：每轮要保存状态、比较进展、消耗预算，并明确成功、无进展、阻塞和人工接管。Ralph 类实现可以用新的 Agent 会话反复读取同一规格，但“再跑一次”本身不是工程，只有外部状态、确定性验证和终止策略齐全才是。

Graph 解决“流程现在位于哪个阶段、接下来允许走哪条边”：节点执行业务或一个局部 Loop，边根据状态路由，Checkpointer 负责恢复。流程只有线性两三步时不要先上 Graph；当存在并行、回退、人工审批、长时暂停或审计要求时，显式状态图才开始产生净收益。

`loop-me` 是把重复活动访谈成 workflow spec 的实验性 Skill，不是执行引擎；Claude `/loop` 是定时重复命令，也不是 Loop Engineering 的同义词。三者要分开理解。

## 选择原则

- 规则表达不清：改 Prompt。
- 缺少事实或上下文过载：改 Context。
- 权限、工具或观测不足：改 Harness。
- 循环不停止、重复调用：改 Loop。
- 分支、并行、审批难以维护：改 Graph。

## 参考资料

- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [LangGraph Workflows and Agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- [loop-me](https://github.com/mattpocock/skills/tree/main/skills/in-progress/loop-me)
