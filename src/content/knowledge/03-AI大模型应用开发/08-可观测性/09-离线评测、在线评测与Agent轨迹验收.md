# 可观测性（09） - 离线评测、在线评测与 Agent 轨迹验收

> 最终答案正确不代表过程可靠。Agent 可能调用了越权工具、走了昂贵路径，或只是在一次随机运行中碰巧成功。

> 读完你能：构建版本化 Dataset，组合确定性、LLM Judge 与人工评估，并对 Agent 最终结果和轨迹分别验收。

## 核心知识清单

- Example Inputs、Reference Outputs 与 Dataset Version
- 人工精选、生产 Trace、常见失败与 Synthetic Data
- Exact Match、代码测试、规则、LLM Judge 与 Human Evaluation
- Reference-based、Reference-free 与 Pairwise
- Offline Evaluation、Online Evaluation 与 Baseline
- Agent 最终状态、Trajectory、Tool 与 Environment State
- Trial 重置、重复运行、置信区间与回归门禁

## Dataset 怎么建

每条样本包含输入、期望行为、允许变化、标签和来源。抽取与分类可给 Reference Output；开放问答更适合关键事实、引用或 Rubric。样本覆盖正常、边界、攻击和历史事故，并按用户或文档来源切分，防止数据泄漏。

Dataset 需要不可变版本。Prompt、模型、Retriever、索引和代码版本共同标识一次 Experiment，否则结果无法复现。

## Evaluator 要匹配任务

- Exact Match、Schema、单元测试：适合确定性输出和代码。
- Reference-based Judge：比较候选与参考事实，但参考答案可能不完备。
- Reference-free Judge：按安全、清晰、引用等 Rubric 评分。
- Pairwise：在同一样本上比较候选与 Baseline，减少绝对分漂移。
- Human Evaluation：用于高风险、主观或 Judge 校准样本。

Judge 一次只评一个维度，输出结构化理由和证据；定期与人工标注计算一致性，发现位置偏好、长度偏好和自我偏好。

## Agent 轨迹验收

最终成功率之外，还要检查 Tool 选择、参数、顺序、重试次数、权限拒绝、预算和终止原因。测试前重置数据库、文件和外部模拟状态，确保 Trial 独立。对随机 Agent 重复运行，报告均值、失败分布和置信区间，而不是展示最好的一次。

离线评测阻断回归；在线评测通过采样 Trace 发现分布漂移和新失败。线上失败经脱敏、去重和人工确认后进入 Dataset，修复通过离线回归、灰度和在线指标后再扩大流量。

## 参考资料

- [LangSmith Evaluation Concepts](https://docs.langchain.com/langsmith/evaluation-concepts)
- [LangSmith Evaluate an Agent](https://docs.langchain.com/langsmith/evaluate-complex-agent)
- [OpenAI Evals](https://github.com/openai/evals)

