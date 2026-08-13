# 工程化工作流（11） - loop-me：把重复活动写成可实施工作流

> loop-me 的目标不是让 Agent 无限执行，而是先把一个重复活动访谈成实现者无需追问的 `workflows/*.md`。

> 读完你能：用 Trigger、Checkpoint、Brief 和 Push right 描述一条工作流，并判断哪些步骤根本不需要 AI。

## 核心知识清单

- Loop 与 Workflow 的概念边界
- Event Trigger 和 Schedule Trigger
- Checkpoint 与 Human-in-the-loop
- Push right 的晚审批原则
- Brief 的决策就绪信息
- workflows 文件与 NOTES 共享词汇
- in-progress 成熟度与版本固定

## 它解决什么问题

“每天帮我整理工作”不是可实施需求：每天几点、由什么事件触发、读取哪些系统、如何判断重复、哪些动作能自动做、什么情况必须问人都不清楚。loop-me 使用 grilling 的持续访谈纪律，但输出只允许是 workflow spec。

该 Skill 当前位于 Matt Pocock 仓库的 `skills/in-progress/loop-me`，这意味着概念可学习，生产采用却必须固定 commit、审查源码并用自己的任务集评测。它不是 Claude `/loop` 定时命令，也不是运行工作流的调度器。

## 一份最小 Workflow Spec

```markdown
# CI failure triage

## Goal
在 CI 失败后 10 分钟内给出可复核根因；只为低风险代码缺陷创建补丁。

## Trigger
- Event: pull_request workflow_run completed with failure

## Inputs and permissions
- 只读：失败日志、当前 diff、项目测试配置
- 可写：独立 worktree
- 禁止：push main、修改密钥、执行生产迁移

## Steps
1. 归类基础设施失败与代码失败。
2. 复现代码失败，记录最小命令与原始错误。
3. 定位根因；只有证据充分时创建最小修复。
4. 运行目标回归和相关测试。

## Checkpoint
依赖升级、权限变化、迁移或无法复现时暂停。

## Brief
根因、证据、改动文件、测试结果、风险和待批准选项。

## Stop
成功；三轮无新证据；30 分钟或预算耗尽；检测到高风险动作。
```

## Trigger、Checkpoint 和 Brief

能用事件触发就不要轮询调度。新 Issue、新邮件和 CI 完成事件都比“每五分钟检查一次”更省成本，也更容易做到幂等。没有可靠事件时才使用 schedule，并记录上次游标，避免重复处理。

Checkpoint 不是每一步都问人。**Push right** 要求系统先完成低风险调查、去重、校验和材料整理，尽可能晚地请求一次决策。Checkpoint 展示的是 Brief：结论、证据、已完成工作、选项和影响，而不是把原始日志或半成品直接扔给用户。

## 哪些流程不应使用 AI

固定字段同步、确定性校验、幂等去重和规则明确的路由优先写普通程序。只有分类、总结、非结构化理解或方案生成需要模型。每个模型步骤都要声明输入、输出 Schema、失败兜底和是否允许影响外部状态。

## 学完验收

- 实现者只看 spec 就能确定触发、权限、状态、动作和停止条件。
- 人工审批尽量晚，但不会越过不可逆或高风险边界。
- 能指出工作流中至少一个应由确定性代码而非模型完成的步骤。

## 参考资料

- [loop-me 源码](https://github.com/mattpocock/skills/tree/main/skills/in-progress/loop-me)
- [grilling 访谈纪律](https://github.com/mattpocock/skills/tree/main/skills/productivity/grilling)
- [GitHub Actions Events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
