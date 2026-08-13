# 工程化工作流（09） - OpenSpec：面向存量项目的增量规范驱动

> OpenSpec 把“系统当前承诺什么”和“这次准备改什么”分开：`specs/` 是当前事实，`changes/` 是待实施差异。

> 读完你能：为存量项目创建一个可追踪 change，完成探索、提案、实现、验证和归档，并处理代码与规格漂移。

## 核心知识清单

- current specs 与 change artifacts 的职责
- explore、propose、apply、verify 和 archive
- proposal、delta specs、design 与 tasks
- ADDED、MODIFIED、REMOVED 和场景验收
- 存量项目、跨仓库 Stores 与规格漂移
- 版本固定、人工审查和归档门禁

## 数据模型：当前事实与本次差异

OpenSpec 的重点不是多写 Markdown，而是建立双层事实来源。`openspec/specs/` 描述已经生效的能力；`openspec/changes/<change>/` 保存一次变更的动机、增量规格、设计和任务。这样审查者可以只看 delta，完成后再把差异归档进当前规格。

```text
openspec/
├── specs/                    # 已上线行为
└── changes/add-login-lock/
    ├── proposal.md           # 为什么改、范围与风险
    ├── specs/auth/spec.md    # ADDED / MODIFIED / REMOVED
    ├── design.md             # 数据流、取舍与迁移
    └── tasks.md              # 可执行任务与验证
```

## 一次最小变更

```bash
# 安装后在现有仓库初始化；执行前确认 Node.js 版本满足当前官方要求。
npm install -g @fission-ai/openspec@latest
openspec init

# 不确定方案时先探索；不同宿主可能显示为 /opsx:、@opsx- 或 $openspec-。
/opsx:explore
/opsx:propose add-login-lock
/opsx:apply

# verify 属于扩展工作流；先用 openspec config profile 选择对应 profile，
# 再执行 openspec update 刷新宿主命令后使用。
/opsx:verify
/opsx:archive
```

一条新增需求应写成可观察场景，而不是实现愿望：

```markdown
## ADDED Requirements

### Requirement: Login failure lock
The system SHALL lock an account for 15 minutes after five consecutive failures.

#### Scenario: Fifth consecutive failure
- **WHEN** the same account fails authentication for the fifth time
- **THEN** further attempts are rejected until the lock expires
```

`apply` 只表示按任务实施，不能替代真实验证。测试、迁移演练、浏览器流程、安全审查通过后，才允许 `archive` 把 delta 合并回 current specs。

## 存量项目怎么接入

不要先补齐整个系统的规格。选择下一项真实变更，只为受影响行为建立最小 current spec；从路由、接口、测试和线上行为反向核实事实。发现代码与现有 spec 冲突时先记录 drift，由负责人判断是代码缺陷还是规格过期，禁止 Agent 自动选一边覆盖另一边。

跨仓库功能可以使用 OpenSpec Stores 独立保存共享规划，但该能力仍应按官方状态评估成熟度。团队落地时固定 CLI 版本、把 change 纳入 PR、设置 spec owner，并在 CI 检查必需 artifact 和未完成任务。

## 什么时候不用

- 一行无行为变化的修复，直接使用 issue、测试和 diff 更轻。
- 全新产品需要从原则、需求到任务的完整阶段门禁时，Spec Kit 更匹配。
- 需求尚未澄清时，先用 grill-me；不要让 `/propose` 把猜测固化成正式规格。

## 学完验收

- 能说明 current spec 和 delta spec 的差异。
- change 中每条需求都有场景，任务能追踪到需求和验证证据。
- 归档前能识别未通过验证、规格漂移和高风险人工审批三类阻断。

## 参考资料

- [OpenSpec 官方仓库](https://github.com/Fission-AI/OpenSpec)
- [OpenSpec Core Concepts](https://github.com/Fission-AI/OpenSpec/blob/main/docs/overview.md)
- [OpenSpec Commands](https://github.com/Fission-AI/OpenSpec/blob/main/docs/commands.md)
- [OpenSpec Existing Projects](https://github.com/Fission-AI/OpenSpec/blob/main/docs/existing-projects.md)
