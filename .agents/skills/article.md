# LangChain（01） - LangChain 基础：定位、核心包与生态

> 读完后，你应能：
> - 用一张职责表解释 LangChain 解决什么问题，并输出“不需要使用 LangChain”的反例记录。
> - 根据项目要使用的能力选择 `langchain`、`langchain-core` 和供应商集成包，并输出带选择依据的依赖清单。
> - 绘制 LangChain、LangGraph、LangSmith、模型供应商与业务代码的关系图，并输出每一层的边界检查结果。

## 核心知识清单

- LangChain 是大模型应用框架，不是模型，也不会提升模型本身的知识和推理能力
- LangChain v1 的高层入口围绕 Agent、Model、Tool、Middleware 等能力组织
- `langchain-core` 保存消息、Runnable、Prompt 和 Tool 等基础契约
- `langchain-openai` 等集成包负责连接具体模型供应商
- LangGraph 承担更复杂的状态、分支、循环和持久化执行
- LangSmith 用于 Trace、评测与线上观测，不参与业务答案生成