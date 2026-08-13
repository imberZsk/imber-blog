# 工程化工作流（16） - 工作流选型与组合：Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD

> 不要按热度叠加工作流。先找当前研发链路缺失的控制点，再选择一个主流程和少量补充能力。

> 读完你能：比较主流 AI 编程工作流的事实来源、控制粒度和适用规模，并设计无重复真相源的组合方案。

## 核心知识清单

- grill-me 的需求决策与 OpenSpec 的增量规范
- Spec Kit 的阶段化规格链与 Superpowers 的工程纪律
- loop-me、Loop Engineering 与 Ralph 的循环边界
- gstack 的产品到发布角色流水线
- GSD 的上下文分阶段与原子任务执行
- BMAD 的角色、规划产物与规模自适应流程
- 单一事实来源、交接契约和最小流程选择

## 先看缺口，再选工具

| 当前缺口 | 优先选择 | 不应期待它解决 |
| --- | --- | --- |
| 目标和边界仍模糊 | grill-me | 规格持久化、代码实现 |
| 存量项目的变更需要 delta | OpenSpec | 完整产品角色团队 |
| 新项目需要原则到任务的追踪 | Spec Kit | TDD 和分支收尾纪律 |
| 开发过程容易跳过设计、测试和验证 | Superpowers | 产品、设计、发布全角色覆盖 |
| 重复活动还没成为可实施流程 | loop-me | 实际调度和执行引擎 |
| Agent 反复尝试但不会停止 | Loop Engineering | 多分支、审批和并行编排 |
| 产品到发布缺少角色审查 | gstack | 自动证明业务正确性 |
| 长项目上下文易腐化 | GSD | 组织级角色与治理 |
| 大型项目需要角色和阶段模板 | BMAD | 小改动的低流程成本 |
| Agent 过早放弃或空口完成 | PUA 方法层 | 权限控制和确定性验证器 |

GSD（Get Shit Done）通常通过项目研究、路线图、阶段计划、原子任务和新鲜上下文降低长会话污染；BMAD-METHOD 使用专业角色、规划产物和规模自适应路径覆盖更完整的交付过程。两者生态变化快，采用时应阅读当前官方仓库、固定版本并用真实项目验证，不把社区文章的命令数量或效率数字当成稳定契约。

## 推荐组合

**中等存量功能**：grill-me → OpenSpec → Superpowers → 真实 QA/PR。规格只有 OpenSpec 一份；Superpowers 读取 change，不另建需求文档。

**新产品或跨团队项目**：Spec Kit 或 BMAD 二选一作为主规划系统；实现阶段复用 Superpowers 的 TDD/调试技能；需要产品、设计、安全、发布专审时选择 gstack 的少量角色。

**长时自主任务**：稳定规格 → 原子任务队列 → Ralph/Loop 执行 → 确定性验证 → checkpoint → 人工批准。循环只消费任务，不修改主规格；新发现通过 change request 回到规划层。

## 三条组合红线

1. **只有一个需求真相源**：OpenSpec、Spec Kit、GSD `.planning` 与 BMAD 产物不能同时都被称为最终规格。
2. **完成状态只有一个写入者**：执行 Agent 可以提交证据，最终验收由质量门禁或负责人写入。
3. **权限不能随流程升级**：Skill、角色或重试次数不改变沙盒和审批边界。

## 最小选型评分

用 0 到 2 分评估需求不确定性、系统风险、参与角色、任务时长、分支复杂度和审计要求。总分 0-3 使用目标 + 验证；4-7 增加一种规格或 Superpowers；8-10 增加 Loop/Graph；11-12 才考虑 gstack、GSD 或 BMAD 这类完整体系。分数只是流程成本讨论工具，不是自动决策器。

## 学完验收

- 为一个实际需求选择一个主流程，并明确拒绝至少两个不必要工具。
- 每个交接产物都有唯一 owner、位置、版本和下游消费者。
- 能指出循环、角色和规格系统分别在哪一层，不会用一种工具代替所有治理。

## 参考资料

- [Superpowers](https://github.com/obra/superpowers)
- [OpenSpec](https://github.com/Fission-AI/OpenSpec)
- [GitHub Spec Kit](https://github.com/github/spec-kit)
- [gstack](https://github.com/garrytan/gstack)
- [GSD](https://github.com/gsd-build/get-shit-done)
- [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
