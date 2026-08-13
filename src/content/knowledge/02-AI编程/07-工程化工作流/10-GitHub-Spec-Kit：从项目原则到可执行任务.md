# 工程化工作流（10） - GitHub Spec Kit：从项目原则到可执行任务

> Spec Kit 把规格放在开发主流程中：项目原则约束需求，需求推导计划，计划拆出任务，最后用追踪关系检查实现是否完整。

> 读完你能：运行 constitution、specify、clarify、plan、tasks、analyze 和 implement，并识别每个阶段应该阻止什么错误。

## 核心知识清单

- constitution 的长期质量与架构原则
- specify 的 What、Why 与独立验收场景
- clarify 的高影响歧义消除
- plan 的技术上下文、数据模型与接口契约
- tasks 的依赖、并行标记和文件落点
- analyze 的一致性、覆盖率与追踪检查
- implement 的执行顺序和完成证据

## 七个阶段不是七份形式文档

| 阶段 | 关键产物 | 应阻止的问题 |
| --- | --- | --- |
| constitution | 不随单个功能变化的原则 | 为赶进度绕过测试、安全或架构边界 |
| specify | 用户目标、场景、非目标 | 过早绑定技术方案，遗漏可独立验收的需求 |
| clarify | 已解决的高影响歧义 | Agent 对权限、失败、数据生命周期自行猜测 |
| plan | 技术方案、数据模型、契约、研究结论 | 设计与仓库事实、项目原则冲突 |
| tasks | 有依赖的可执行清单 | 任务不可验证、遗漏测试或修改位置不明确 |
| analyze | 规格、计划、任务一致性报告 | 需求没有任务、任务没有来源、术语互相冲突 |
| implement | 代码、测试和验证记录 | 跳过依赖顺序，空口声明完成 |

## 最小使用流程

```bash
# 安装官方 CLI；团队应固定 release，而不是长期追随 main。
uv tool install specify-cli

# 在现有目录初始化时选择真实使用的 Agent 集成。
specify init . --integration codex
```

```text
/speckit.constitution 建立测试、安全、可观测性和最小改动原则
/speckit.specify 用户可以在 15 分钟内撤销误删项目
/speckit.clarify
/speckit.plan 使用现有 PostgreSQL 与任务队列，不增加新中间件
/speckit.tasks
/speckit.analyze
/speckit.implement
```

Codex 或其他 Skill 宿主可能使用 `$speckit-*` 名称，具体调用形式以初始化结果为准。关键不是命令拼写，而是上游产物成为下游输入：任务必须能追踪到需求场景，代码和测试必须能追踪到任务。

## 写规格时保持 What 与 How 分离

`specify` 写“用户能撤销、超时后不可撤销、无权限时拒绝”，不先写表名和队列。`plan` 再根据仓库真实技术栈决定软删除字段、过期任务、恢复接口和并发控制。这样技术方案调整时，用户承诺仍然稳定；业务目标变化时，系统也能识别哪些技术任务已经失效。

`clarify` 只处理会改变范围、数据模型、安全或验收的高影响问题。小的实现细节留给计划阶段，否则澄清会退化成穷举所有可能。`analyze` 应在实现前运行，也应在重大规格变化后重跑。

## 与 OpenSpec 的选择

Spec Kit 更强调从 constitution 到 implement 的完整阶段链，适合新项目、复杂功能和严格追踪；OpenSpec 以 current specs + change delta 管理存量项目更轻。团队可以只选一个作为规格事实来源；同时运行两套时必须规定谁是主记录、如何同步，否则会制造双份真相。

## 学完验收

- 能为一个功能写出三个可独立验收场景和明确非目标。
- `tasks` 中每项都有输入、修改位置、输出和验证方式。
- `analyze` 能发现至少一种需求遗漏、原则冲突或任务无来源问题。

## 参考资料

- [GitHub Spec Kit 官方仓库](https://github.com/github/spec-kit)
- [Spec Kit 官方文档](https://github.github.io/spec-kit/)
- [Spec-Driven Development](https://github.com/github/spec-kit/blob/main/spec-driven.md)
