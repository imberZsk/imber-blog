# 工程化工作流（08） - OpenSpec：增量规范驱动

> 读完后，你应能完成以下任务：
> - 绘制“工程化工作流（08） - OpenSpec：增量规范驱动 / 数据模型：当前事实与本次差异”的关键对象与数据流，解释“OpenSpec 的重点不是多写 Markdown，而是建立双层事实来源。”，并用源码位置、日志或 Trace 标注证据。
> - 为“工程化工作流（08） - OpenSpec：增量规范驱动 / 一次最小变更”设计正常与异常输入，验证“apply 只表示按任务实施，不能替代真实验证。”，输出首个偏差位置与回归测试结果。
> - 实现“工程化工作流（08） - OpenSpec：增量规范驱动 / 存量项目怎么接入”的最小代码或配置，检验“选择下一项真实变更，只为受影响行为建立最小 current spec；”，输出命令、结果与 Diff，并说明不适用边界。

> OpenSpec 把“系统当前承诺什么”和“这次准备改什么”分开：`specs/` 是当前事实，`changes/` 是待实施差异。


## 核心知识清单

- current specs 与 change artifacts 的职责
- explore、propose、apply、verify 和 archive
- proposal、delta specs、design 与 tasks
- ADDED、MODIFIED、REMOVED 和场景验收
- 存量项目、跨仓库 Stores 与规格漂移
- 版本固定、人工审查和归档门禁

<!-- article-progressive-block:start -->
# 一、先建立全局：OpenSpec：增量规范驱动 是什么？

理解“OpenSpec：增量规范驱动”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“OpenSpec：增量规范驱动”的第一个核心判断是：OpenSpec 的重点不是多写 Markdown，而是建立双层事实来源。。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | 数据模型：当前事实与本次差异 | OpenSpec 的重点不是多写 Markdown，而是建立双层事实来源。 |
| 2 | 一次最小变更 | apply 只表示按任务实施，不能替代真实验证。 |
| 3 | 存量项目怎么接入 | 选择下一项真实变更，只为受影响行为建立最小 current spec； |
| 4 | 什么时候不用 | change 中每条需求都有场景，任务能追踪到需求和验证证据。 |
| 5 | current specs 与 change artifacts 的职责 | OpenSpec 把“系统当前承诺什么”和“这次准备改什么”分开：specs/ 是当前事实，changes/ 是待实施差异。 |
| 6 | explore、propose、apply、verify 和 archive | apply 只表示按任务实施，不能替代真实验证。 |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["数据模型：当前事实与本次差异"] --> S2
  S2["一次最小变更"] --> S3
  S3["存量项目怎么接入"] --> S4
  S4["什么时候不用"] --> S5
  S5["current specs 与 change artifacts 的职责"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“OpenSpec：增量规范驱动”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“OpenSpec：增量规范驱动”的对象和顺序已经明确后，再看可观察的失败：文本直通执行、状态不可重放或重试重复写入。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、数据模型：当前事实与本次差异

OpenSpec 的重点不是多写 Markdown，而是建立双层事实来源。
`openspec/specs/` 描述已经生效的能力；
`openspec/changes/<change>/` 保存一次变更的动机、增量规格、设计和任务。
这样审查者可以只看 delta，完成后再把差异归档进当前规格。

```text
openspec/
├── specs/                    # 已上线行为
└── changes/add-login-lock/
    ├── proposal.md           # 为什么改、范围与风险
    ├── specs/auth/spec.md    # ADDED / MODIFIED / REMOVED
    ├── design.md             # 数据流、取舍与迁移
    └── tasks.md              # 可执行任务与验证
```

# 三、一次最小变更

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

`apply` 只表示按任务实施，不能替代真实验证。
测试、迁移演练、浏览器流程、安全审查通过后，
才允许 `archive` 把 delta 合并回 current specs。

# 四、存量项目怎么接入

不要先补齐整个系统的规格。
选择下一项真实变更，只为受影响行为建立最小 current spec；
从路由、接口、测试和线上行为反向核实事实。
发现代码与现有 spec 冲突时先记录 drift，
由负责人判断是代码缺陷还是规格过期，
禁止 Agent 自动选一边覆盖另一边。

跨仓库功能可以使用 OpenSpec Stores 独立保存共享规划，
但该能力仍应按官方状态评估成熟度。
团队落地时固定 CLI 版本、把 change 纳入 PR、设置 spec owner，
并在 CI 检查必需 artifact 和未完成任务。

# 五、什么时候不用

- 一行无行为变化的修复，直接使用 issue、测试和 diff 更轻。
- 全新产品需要从原则、需求到任务的完整阶段门禁时，Spec Kit 更匹配。
- 需求尚未澄清时，先用 grill-me；不要让 `/propose` 把猜测固化成正式规格。

## 学完验收

- 能说明 current spec 和 delta spec 的差异。
- change 中每条需求都有场景，任务能追踪到需求和验证证据。
- 归档前能识别未通过验证、规格漂移和高风险人工审批三类阻断。

<!-- article-progressive-block:start -->
# 六、动手验证：先跑通 OpenSpec：增量规范驱动，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“OpenSpec：增量规范驱动”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 6.1 基线与候选只允许一个变量不同

验证“OpenSpec：增量规范驱动”时，先固定工具 Schema、身份、畸形参数、超时和重复请求。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“OpenSpec：增量规范驱动”时，动作是：回放决策到执行链路，覆盖失败、重试、暂停和恢复。原始结果不能只保留截图或汇总分数，必须同步保存：模型提议、校验、授权、幂等键、状态迁移、Trace，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 工具 Schema、身份、畸形参数、超时和重复请求 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 通过阈值 | 模型只提议；执行受代码约束；失败不重复副作用 |
| 立即停止 | 文本直通执行、状态不可重放或重试重复写入 |

## 6.2 执行前先排除不可比较条件

“OpenSpec：增量规范驱动”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“OpenSpec：增量规范驱动”的当前环境重复运行。
- 候选只改变一个与“OpenSpec：增量规范驱动”结论直接相关的条件。
- “OpenSpec：增量规范驱动”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “OpenSpec：增量规范驱动”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 6.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“OpenSpec：增量规范驱动”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 工具 Schema、身份、畸形参数、超时和重复请求 |
| 过程可回放 | 回放决策到执行链路，覆盖失败、重试、暂停和恢复 |
| 结果可审计 | 模型提议、校验、授权、幂等键、状态迁移、Trace |

“OpenSpec：增量规范驱动”的一次合格基线对照按以下顺序执行：

1. 保存“OpenSpec：增量规范驱动”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“OpenSpec：增量规范驱动”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“OpenSpec：增量规范驱动”：回放决策到执行链路，覆盖失败、重试、暂停和恢复。
4. 为“OpenSpec：增量规范驱动”保存：模型提议、校验、授权、幂等键、状态迁移、Trace。
5. 使用“OpenSpec：增量规范驱动”预登记条件判断：模型只提议；执行受代码约束；失败不重复副作用。
6. 如果“OpenSpec：增量规范驱动”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 七、用一张矩阵验证 OpenSpec：增量规范驱动 的关键结论

矩阵按正文顺序列出“OpenSpec：增量规范驱动”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| 数据模型：当前事实与本次差异 | OpenSpec 的重点不是多写 Markdown，而是建立双层事实来源。 | 只改变与“数据模型：当前事实与本次差异”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 一次最小变更 | apply 只表示按任务实施，不能替代真实验证。 | 只改变与“一次最小变更”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 存量项目怎么接入 | 选择下一项真实变更，只为受影响行为建立最小 current spec； | 只改变与“存量项目怎么接入”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 什么时候不用 | change 中每条需求都有场景，任务能追踪到需求和验证证据。 | 只改变与“什么时候不用”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| current specs 与 change artifacts 的职责 | OpenSpec 把“系统当前承诺什么”和“这次准备改什么”分开：specs/ 是当前事实，changes/ 是待实施差异。 | 只改变与“current specs 与 change artifacts 的职责”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| explore、propose、apply、verify 和 archive | apply 只表示按任务实施，不能替代真实验证。 | 只改变与“explore、propose、apply、verify 和 archive”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |

## 7.1 记录本次实际实验

下面的记录用于“OpenSpec：增量规范驱动”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "OpenSpec：增量规范驱动"
selected_chapter: required
claim_from_article: required
baseline_version: required
changed_condition: exactly_one
execution: "回放决策到执行链路，覆盖失败、重试、暂停和恢复"
evidence: "模型提议、校验、授权、幂等键、状态迁移、Trace"
pass_when: "模型只提议；执行受代码约束；失败不重复副作用"
stop_when: "文本直通执行、状态不可重放或重试重复写入"
observed_result: required
first_deviation: null_or_evidence
recovery_replay: required_after_failure
```

## 7.2 边界实验必须证明能够停止和恢复

成功路径只能证明“OpenSpec：增量规范驱动”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：文本直通执行、状态不可重放或重试重复写入，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 模型提议、校验、授权、幂等键、状态迁移、Trace | 模型只提议；执行受代码约束；失败不重复副作用 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：文本直通执行、状态不可重放或重试重复写入 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：关闭副作用入口，恢复检查点，补充失败契约测试 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“OpenSpec：增量规范驱动”，第一步是：关闭副作用入口，恢复检查点，补充失败契约测试。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“OpenSpec：增量规范驱动”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 八、OpenSpec：增量规范驱动 的结果解释

解释“OpenSpec：增量规范驱动”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 文本直通执行、状态不可重放或重试重复写入 | 先执行：关闭副作用入口，恢复检查点，补充失败契约测试 |
| 异常链路无法恢复 | 文本直通执行、状态不可重放或重试重复写入 | 先执行：关闭副作用入口，恢复检查点，补充失败契约测试 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“OpenSpec：增量规范驱动”只有同时满足“模型只提议；执行受代码约束；失败不重复副作用”，并且没有出现“文本直通执行、状态不可重放或重试重复写入”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“OpenSpec：增量规范驱动”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“OpenSpec：增量规范驱动”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 九、OpenSpec：增量规范驱动 的发布判断

发布判断需要把“OpenSpec：增量规范驱动”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “OpenSpec：增量规范驱动”的基线与候选只存在一个计划内变量。
- [ ] “OpenSpec：增量规范驱动”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “OpenSpec：增量规范驱动”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “OpenSpec：增量规范驱动”的原始输出、中间状态和失败现场已经保留。
- [ ] “OpenSpec：增量规范驱动”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “OpenSpec：增量规范驱动”的停止条件、负责人和回滚入口已经演练。
- [ ] “OpenSpec：增量规范驱动”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“OpenSpec：增量规范驱动”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 十、总结

- **数据模型：当前事实与本次差异**：OpenSpec 的重点不是多写 Markdown，而是建立双层事实来源。
- **一次最小变更**：一条新增需求应写成可观察场景，而不是实现愿望：
- **存量项目怎么接入**：选择下一项真实变更，只为受影响行为建立最小 current spec；
- **什么时候不用**：一行无行为变化的修复，直接使用 issue、测试和 diff 更轻。

## 参考资料

- [OpenSpec 官方仓库](https://github.com/Fission-AI/OpenSpec)
- [OpenSpec Core Concepts](https://github.com/Fission-AI/OpenSpec/blob/main/docs/overview.md)
- [OpenSpec Commands](https://github.com/Fission-AI/OpenSpec/blob/main/docs/commands.md)
- [OpenSpec Existing Projects](https://github.com/Fission-AI/OpenSpec/blob/main/docs/existing-projects.md)
