# 大模型基础（08） - 预训练、SFT、RLHF、RLAIF 与 DPO

> 训练阶段解决的是“模型参数如何形成”，RAG、Prompt 和 Tool 解决的是“应用运行时如何补充知识与能力”。

> 读完你能：说明五种训练或对齐阶段的数据和目标，并判断何时不应该微调。

## 核心知识清单

- 预训练与下一个 Token 预测
- SFT 指令微调与示范数据
- 奖励模型、RLHF 与 PPO
- Constitutional AI 与 RLAIF
- 偏好数据、chosen/rejected 与 DPO
- 训练、微调、RAG 和 Prompt 的选择边界

## 各阶段解决什么

预训练从海量语料学习语言和世界模式；SFT 用高质量输入输出示范教会指令格式和任务行为；RLHF 先用人类偏好训练奖励模型，再用强化学习优化策略；RLAIF 用规则约束下的模型反馈辅助人工；DPO 直接拉大 chosen 与 rejected 回答的相对概率，不需要显式训练奖励模型和在线 RL。

## 什么时候不要微调

知识频繁变化、答案必须引用来源时优先 RAG；只是输出格式或语气不稳定时先用结构化输出、Prompt 和评测；需要访问外部系统时使用 Tool。只有稳定行为无法通过这些手段达到目标，且有代表性数据、训练预算和回归集时，再考虑 SFT 或偏好优化。

## 数据质量与验收

训练集、验证集、测试集按来源或用户隔离，避免近重复泄漏。每条偏好样本应有明确 rubric，不能把长度、语气等表面特征误当正确性。验收同时检查目标能力、通用能力回退、安全、延迟和部署成本，并保留基础模型作为可回滚基线。

## 参考资料

- [InstructGPT](https://arxiv.org/abs/2203.02155)
- [Constitutional AI](https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback)
- [Direct Preference Optimization](https://arxiv.org/abs/2305.18290)
