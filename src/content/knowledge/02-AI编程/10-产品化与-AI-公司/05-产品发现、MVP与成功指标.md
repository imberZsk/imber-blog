# 产品化与 AI 公司（05） - 产品发现、MVP 与成功指标

> Agent 能加快实现，却不能证明用户需要它。产品发现必须先收集问题和行为证据，再定义最小可验证价值。

> 读完你能：完成用户问题发现、需求证据、MVP、成功指标和非功能质量设计，并避免把 Demo 当产品。

## 核心知识清单

- 用户、场景、任务与痛点发现
- 访谈、日志、工单与付费行为证据
- 假设、MVP、范围与人工兜底
- 首次价值时间、任务成功、留存、返工与成本指标
- 信息架构、交互一致性与界面状态
- 响应式、可访问性、安全与可靠性
- 上线实验、反馈、退出条件与迭代

## 需求证据

区分用户说想要、实际反复执行和愿意付费。访谈用于理解动机，工单和日志用于量化频率，现有手工流程用于估算成本。把证据、假设和未知项分开，不让 Agent 自动补全缺失事实。

## MVP

MVP 只覆盖一个高价值完整任务，包括输入、处理、结果、错误和人工兜底。不能只做聊天框而没有数据、权限、保存和反馈。对高风险领域，早期 Human-in-the-loop 是产品能力，不是失败。

## 指标

核心指标围绕用户结果：首次价值时间、任务成功率、人工返工、留存、错误率和单位成功成本。调用次数、Token 和生成字数是运营指标，不是产品价值。

## 产品质量

界面要覆盖加载、空、失败、部分成功、取消和恢复；响应式和可访问性从组件设计开始。非功能质量包括延迟、可用性、隐私、审计和可撤销性。上线前定义成功门槛和停止实验条件。

## 参考资料

- [Nielsen Norman Group User Interviews](https://www.nngroup.com/articles/user-interviews/)
- [W3C WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [Google HEART Framework](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/)
