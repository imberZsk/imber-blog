# Prompt 工程（06） - Zero-shot、任务分解、自洽与反思

> Prompt 技法不是越多越好。每种方法都在增加 Token、延迟或不确定性，必须对应一个已观察到的失败类型。

> 读完你能：选择 Zero-shot、Few-shot、任务分解、自洽或反思，并用确定性校验和预算限制它们。

## 核心知识清单

- Zero-shot 与 Few-shot 的选择
- 复杂任务分解与中间结果契约
- 多候选、自洽与投票
- Reflection、Verifier 与有限修订
- Prompt Template 与运行时变量
- 正确率、延迟、Token 与稳定性权衡

## 从最简单方案开始

边界清晰、模型已熟悉的任务先用 Zero-shot；输出格式或少见业务边界不稳定时，再加入少量高区分度 Few-shot。示例必须覆盖成功、拒答和边界，而不是重复同一种正常输入。

复杂任务先拆成可验证步骤，例如“识别意图 → 检索证据 → 校验权限 → 生成答案”。每一步定义输入输出 Schema，确定性部分交给代码。不要要求模型输出隐藏推理过程；系统只需要可验证的中间产物、工具结果和简洁理由。

## 自洽与反思的适用条件

自洽通过生成多个候选再投票或评分，适合答案可比较、单次波动明显的高价值任务。候选高度相关或校验器不可靠时，多跑几次只会复制相同错误。

Reflection 让模型依据明确 Rubric 检查初稿，Verifier 可以是代码、另一个模型或人工。必须限制修订轮数，并在每轮只提供需要修复的证据。没有外部校验时，模型说“已经正确”不能作为验收。

## 模板与变量

Prompt Template 将稳定规则与运行时数据分离。变量按不可信输入处理，使用明确分隔和长度限制；模板版本、模型和参数写入 Trace。模板不能替代 JSON Schema、权限检查和业务约束。

## 评测方式

在同一 Dataset 上比较各方法的任务成功率、格式正确率、P95 延迟、Token、成本和方差。只有质量增益超过预算，才保留多候选或反思链；否则回到更短、更确定的方案。

## 参考资料

- [OpenAI Prompt Engineering](https://platform.openai.com/docs/guides/prompt-engineering)
- [Self-Consistency Improves Chain of Thought Reasoning](https://arxiv.org/abs/2203.11171)
- [LangGraph Evaluator-Optimizer](https://docs.langchain.com/oss/python/langgraph/workflows-agents#evaluator-optimizer)

