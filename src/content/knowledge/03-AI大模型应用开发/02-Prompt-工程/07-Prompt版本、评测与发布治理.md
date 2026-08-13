# Prompt 工程（07） - Prompt 版本、评测与发布治理

> Prompt 是生产配置和业务逻辑的一部分，必须像代码一样具备版本、评测、审批、灰度和回滚证据。

> 读完你能：建立 Prompt Registry、分层测试集和发布门禁，并从线上失败形成可复现回归样本。

## 核心知识清单

- Prompt ID、不可变版本、环境标签与变更说明
- 正常、边界、失败与对抗样例
- 格式正确率、任务成功率、事实性、延迟与成本
- Prompt、模型、Retriever 与 Tool 的联合版本
- Baseline、离线 Experiment、灰度与回滚
- 生产 Trace、用户反馈、人工确认与 Dataset 回流

## 一个版本要记录什么

Prompt 使用稳定 ID 和不可变版本，内容包括系统规则、模板、变量 Schema、示例与输出契约。环境标签如 staging、production 只指向具体版本。变更说明写清假设、目标指标和回滚条件，Trace 保存实际版本，而不是只保存标签。

Prompt 行为同时受模型、采样参数、上下文装配、Retriever、索引、Tool Schema 和代码影响。一次实验必须冻结这些联合版本；否则结果变化无法归因。

## 四类样例

- 正常样例：最常见且应该成功的输入。
- 边界样例：长度、时间、数值、歧义和证据冲突。
- 失败样例：资料缺失、模型超时、Tool 失败和无权限。
- 对抗样例：Prompt Injection、越权请求、敏感信息和格式破坏。

格式正确率只证明能解析，任务成功率判断是否完成目标，事实性检查结论是否有证据。延迟、Token 和成本必须与质量一起比较。

## 发布闭环

候选版本先在固定 Dataset 上与生产 Baseline 做 Pairwise 和确定性检查；达到门槛后进入小流量灰度，观察质量、拒答率、错误、延迟与成本。任何关键指标越界都能把环境标签原子切回旧版本。

线上差评或错误 Trace 先脱敏、去重并由人工确认，再加入 Dataset。修复必须在该失败样例和完整回归集上通过，避免只修一个案例却破坏其他任务。

## 参考资料

- [LangSmith Prompt Engineering](https://docs.langchain.com/langsmith/prompt-engineering-concepts)
- [Langfuse Prompt Management](https://langfuse.com/docs/prompt-management/get-started)
- [OpenAI Evaluation Best Practices](https://platform.openai.com/docs/guides/evaluation-best-practices)

