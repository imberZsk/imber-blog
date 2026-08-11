# Superpowers（1）- Superpowers 工作流总览：先设计，再实现，再验证

Superpowers 不是一组随手调用的提示词，而是一套约束 AI 编程顺序的工程方法。它把“直接开始写代码”改成一条可检查的交付链：**澄清需求 → 隔离工作区 → 编写计划 → 小步实现 → 审查与验证 → 收尾分支**。

# 一、为什么需要固定顺序

AI 最容易在三个地方失控：需求没有说清便开工、一次改动过大、没有证据便宣布完成。固定工作流让每个阶段都有输入和退出条件：

| 阶段 | 关键 Skill                                                 | 退出条件                               |
| ---- | ---------------------------------------------------------- | -------------------------------------- |
| 设计 | `brainstorming`                                            | 方案、边界和验收标准得到确认           |
| 隔离 | `using-git-worktrees`                                      | 独立工作树可构建，基线状态已记录       |
| 计划 | `writing-plans`                                            | 任务拆到可独立验证的小步骤             |
| 实现 | `test-driven-development`                                  | 每步都经历失败测试、最小实现、通过测试 |
| 交付 | `requesting-code-review`、`verification-before-completion` | 审查问题已处理，命令输出证明验收通过   |
| 收尾 | `finishing-a-development-branch`                           | 合并、PR、保留或清理策略明确           |

# 二、一次最小实践

把下面这段直接交给支持 Superpowers 的 Agent，观察它是否先澄清而不是立即改代码：

```text
请使用 Superpowers 工作流为“文章支持收藏”制定并实施方案。
先用 brainstorming 澄清范围和验收标准；方案确认后再创建工作树和计划。
实现阶段使用 TDD，每完成一步给出验证证据，最后做代码审查和完成前验证。
```

判断是否真正遵循工作流，不看它有没有说“我正在使用 Skill”，而看它有没有留下设计决策、失败测试、验证输出和收尾选择。

# 三、何时不该并行

存在共享文件、前后步骤有数据依赖或问题根因未知时，先串行推进。只有任务互不依赖、不会写同一状态时，才适合
`dispatching-parallel-agents`。

# 四、官方资料

- [Superpowers 仓库](https://github.com/obra/superpowers)
- [Superpowers Skills 目录](https://github.com/obra/superpowers/tree/main/skills)

# 五、总结

- **为什么需要固定顺序**：AI 最容易在三个地方失控：需求没有说清便开工、一次改动过大、没有证据便宣布完成。
- **一次最小实践**：把下面这段直接交给支持 Superpowers 的 Agent，观察它是否先澄清而不是立即改代码：
- **何时不该并行**：存在共享文件、前后步骤有数据依赖或问题根因未知时，先串行推进。
- **官方资料**：Superpowers Skills 目录

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“Superpowers（1）- Superpowers 工作流总览：先设计，再实现，再验证”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
