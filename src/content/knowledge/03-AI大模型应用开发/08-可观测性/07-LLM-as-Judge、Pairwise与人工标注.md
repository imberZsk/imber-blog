# 可观测性（07） - LLM-as-Judge、Pairwise 与人工标注

> 评测器是测量工具，不是真值；先定义 Rubric 和人工基准，再判断自动评分是否可信。

> 读完你能：选择确定性、Judge 或人工评测，校准偏差并把失败样本回流到版本化数据集。

## 核心知识清单

- Deterministic、Human 与 LLM Evaluator
- LLM-as-Judge 的 Rubric 与锚点
- Reference-based 与 Reference-free
- Pointwise 与 Pairwise Evaluation
- Judge 校准、偏差与一致性
- Annotation Queue 与失败样本回流

## 评测器怎么选

JSON Schema、引用存在和工具参数适合确定性代码；事实性、帮助度等语义维度可由 LLM 辅助；医疗、法律、品牌和新型失败仍需领域人员。能提供标准答案时使用 reference-based；开放任务只能 reference-free，但要把标准拆成单一维度。

## Judge 设计

Rubric 写清评分对象、证据边界、等级含义和反例。一个 Judge 尽量只评一个维度，并输出分数、理由和证据引用。Pairwise 比较两个候选通常比绝对打分稳定，但要随机 A/B 顺序，控制位置和长度偏差。

## 校准闭环

先准备人工标注的校准集，计算 Judge 与人工的一致率，并按风险子集查看误报和漏报。模型、Prompt 或 Rubric 变更后重新校准。低置信、分歧和高风险 Trace 进入 Annotation Queue，经确认后回流版本化 Dataset，而不是直接拿线上点赞当真值。

## 参考资料

- [LangSmith LLM-as-a-Judge](https://docs.langchain.com/langsmith/llm-as-judge)
- [LangSmith Pairwise Evaluation](https://docs.langchain.com/langsmith/evaluate-pairwise)
- [Langfuse Annotation Queues](https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues)
