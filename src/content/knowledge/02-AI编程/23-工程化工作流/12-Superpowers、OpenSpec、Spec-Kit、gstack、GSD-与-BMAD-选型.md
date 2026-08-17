# 工程化工作流（12） - Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型

> 读完后，你应能完成以下任务：
> - 绘制“工程化工作流（12） - Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型 / 先看缺口，再选工具”的关键对象与数据流，解释“GSD（Get Shit Done）通常通过项目研究、路线图、阶段计划、原子任务和新鲜上下文降低长会话污染；”，并用源码位置、日志或 Trace 标注证据。
> - 为“工程化工作流（12） - Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型 / 推荐组合”设计正常与异常输入，验证“需要产品、设计、安全、发布专审时选择 gstack 的少量角色。”，输出首个偏差位置与回归测试结果。
> - 实现“工程化工作流（12） - Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型 / 三条组合红线”的最小代码或配置，检验“只有一个需求真相源：OpenSpec、Spec Kit、GSD .planning 与 BMAD 产物不能同时都被称为最终规格。 -> 完成状态只有一个写入者：执行 Agent 可以提交证据，最终验收由质量门禁或负责人写入。 -> 权限不能随流程升级：Skill、角色或重试次数不改变沙盒和审批边界。”，输出命令、结果与 Diff，并说明不适用边界。

> 不要按热度叠加工作流。先找当前研发链路缺失的控制点，再选择一个主流程和少量补充能力。


## 核心知识清单

- grill-me 的需求决策与 OpenSpec 的增量规范
- Spec Kit 的阶段化规格链与 Superpowers 的工程纪律
- loop-me、Loop Engineering 与 Ralph 的循环边界
- gstack 的产品到发布角色流水线
- GSD 的上下文分阶段与原子任务执行
- BMAD 的角色、规划产物与规模自适应流程
- 单一事实来源、交接契约和最小流程选择

<!-- article-progressive-block:start -->
# 一、先建立全局：Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型 是什么？

理解“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”的第一个核心判断是：GSD（Get Shit Done）通常通过项目研究、路线图、阶段计划、原子任务和新鲜上下文降低长会话污染；。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | 先看缺口，再选工具 | GSD（Get Shit Done）通常通过项目研究、路线图、阶段计划、原子任务和新鲜上下文降低长会话污染； |
| 2 | 推荐组合 | 需要产品、设计、安全、发布专审时选择 gstack 的少量角色。 |
| 3 | 三条组合红线 | 只有一个需求真相源：OpenSpec、Spec Kit、GSD .planning 与 BMAD 产物不能同时都被称为最终规格。 -> 完成状态只有一个写入者：执行 Agent 可以提交证据，最终验收由质量门禁或负责人写入。 -> 权限不能随流程升级：Skill、角色或重试次数不改变沙盒和审批边界。 |
| 4 | 最小选型评分 | 用 0 到 2 分评估需求不确定性、系统风险、参与角色、任务时长、分支复杂度和审计要求。 |
| 5 | grill-me 的需求决策与 OpenSpec 的增量规范 | \| 目标和边界仍模糊 \| grill-me \| 规格持久化、代码实现 \| |
| 6 | Spec Kit 的阶段化规格链与 Superpowers 的工程纪律 | 只有一个需求真相源：OpenSpec、Spec Kit、GSD .planning 与 BMAD 产物不能同时都被称为最终规格。 |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["先看缺口，再选工具"] --> S2
  S2["推荐组合"] --> S3
  S3["三条组合红线"] --> S4
  S4["最小选型评分"] --> S5
  S5["grill-me 的需求决策与 OpenSpec 的增量规范"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”的对象和顺序已经明确后，再看可观察的失败：文本直通执行、状态不可重放或重试重复写入。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、先看缺口，再选工具

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

GSD（Get Shit Done）通常通过项目研究、路线图、阶段计划、原子任务和新鲜上下文降低长会话污染；
BMAD-METHOD 使用专业角色、规划产物和规模自适应路径覆盖更完整的交付过程。
两者生态变化快，
采用时应阅读当前官方仓库、固定版本并用真实项目验证，
不把社区文章的命令数量或效率数字当成稳定契约。

# 三、推荐组合

**中等存量功能**：grill-me → OpenSpec → Superpowers → 真实 QA/PR。
规格只有 OpenSpec 一份；
Superpowers 读取 change，不另建需求文档。

**新产品或跨团队项目**：Spec Kit 或 BMAD 二选一作为主规划系统；
实现阶段复用 Superpowers 的 TDD/调试技能；
需要产品、设计、安全、发布专审时选择 gstack 的少量角色。

**长时自主任务**：稳定规格 → 原子任务队列 → Ralph/Loop 执行 → 确定性验证 → checkpoint → 人工批准。
循环只消费任务，不修改主规格；
新发现通过 change request 回到规划层。

# 四、三条组合红线

1. **只有一个需求真相源**：OpenSpec、Spec Kit、GSD `.planning` 与 BMAD 产物不能同时都被称为最终规格。
2. **完成状态只有一个写入者**：执行 Agent 可以提交证据，最终验收由质量门禁或负责人写入。
3. **权限不能随流程升级**：Skill、角色或重试次数不改变沙盒和审批边界。

# 五、最小选型评分

用 0 到 2 分评估需求不确定性、系统风险、参与角色、任务时长、分支复杂度和审计要求。
总分 0-3 使用目标 + 验证；
4-7 增加一种规格或 Superpowers；
8-10 增加 Loop/Graph；
11-12 才考虑 gstack、GSD 或 BMAD 这类完整体系。
分数只是流程成本讨论工具，不是自动决策器。

## 学完验收

- 为一个实际需求选择一个主流程，并明确拒绝至少两个不必要工具。
- 每个交接产物都有唯一 owner、位置、版本和下游消费者。
- 能指出循环、角色和规格系统分别在哪一层，不会用一种工具代替所有治理。

<!-- article-progressive-block:start -->
# 六、动手验证：先跑通 Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 6.1 基线与候选只允许一个变量不同

验证“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”时，先固定工具 Schema、身份、畸形参数、超时和重复请求。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”时，动作是：回放决策到执行链路，覆盖失败、重试、暂停和恢复。原始结果不能只保留截图或汇总分数，必须同步保存：模型提议、校验、授权、幂等键、状态迁移、Trace，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 工具 Schema、身份、畸形参数、超时和重复请求 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 通过阈值 | 模型只提议；执行受代码约束；失败不重复副作用 |
| 立即停止 | 文本直通执行、状态不可重放或重试重复写入 |

## 6.2 执行前先排除不可比较条件

“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”的当前环境重复运行。
- 候选只改变一个与“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”结论直接相关的条件。
- “Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 6.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 工具 Schema、身份、畸形参数、超时和重复请求 |
| 过程可回放 | 回放决策到执行链路，覆盖失败、重试、暂停和恢复 |
| 结果可审计 | 模型提议、校验、授权、幂等键、状态迁移、Trace |

“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”的一次合格基线对照按以下顺序执行：

1. 保存“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”：回放决策到执行链路，覆盖失败、重试、暂停和恢复。
4. 为“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”保存：模型提议、校验、授权、幂等键、状态迁移、Trace。
5. 使用“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”预登记条件判断：模型只提议；执行受代码约束；失败不重复副作用。
6. 如果“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 七、用一张矩阵验证 Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型 的关键结论

矩阵按正文顺序列出“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| 先看缺口，再选工具 | GSD（Get Shit Done）通常通过项目研究、路线图、阶段计划、原子任务和新鲜上下文降低长会话污染； | 只改变与“先看缺口，再选工具”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 推荐组合 | 需要产品、设计、安全、发布专审时选择 gstack 的少量角色。 | 只改变与“推荐组合”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 三条组合红线 | 只有一个需求真相源：OpenSpec、Spec Kit、GSD .planning 与 BMAD 产物不能同时都被称为最终规格。 -> 完成状态只有一个写入者：执行 Agent 可以提交证据，最终验收由质量门禁或负责人写入。 -> 权限不能随流程升级：Skill、角色或重试次数不改变沙盒和审批边界。 | 只改变与“三条组合红线”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 最小选型评分 | 用 0 到 2 分评估需求不确定性、系统风险、参与角色、任务时长、分支复杂度和审计要求。 | 只改变与“最小选型评分”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| grill-me 的需求决策与 OpenSpec 的增量规范 | \| 目标和边界仍模糊 \| grill-me \| 规格持久化、代码实现 \| | 只改变与“grill-me 的需求决策与 OpenSpec 的增量规范”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| Spec Kit 的阶段化规格链与 Superpowers 的工程纪律 | 只有一个需求真相源：OpenSpec、Spec Kit、GSD .planning 与 BMAD 产物不能同时都被称为最终规格。 | 只改变与“Spec Kit 的阶段化规格链与 Superpowers 的工程纪律”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |

## 7.1 记录本次实际实验

下面的记录用于“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型"
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

成功路径只能证明“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：文本直通执行、状态不可重放或重试重复写入，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 模型提议、校验、授权、幂等键、状态迁移、Trace | 模型只提议；执行受代码约束；失败不重复副作用 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：文本直通执行、状态不可重放或重试重复写入 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：关闭副作用入口，恢复检查点，补充失败契约测试 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”，第一步是：关闭副作用入口，恢复检查点，补充失败契约测试。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 八、Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型 的结果解释

解释“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 文本直通执行、状态不可重放或重试重复写入 | 先执行：关闭副作用入口，恢复检查点，补充失败契约测试 |
| 异常链路无法恢复 | 文本直通执行、状态不可重放或重试重复写入 | 先执行：关闭副作用入口，恢复检查点，补充失败契约测试 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”只有同时满足“模型只提议；执行受代码约束；失败不重复副作用”，并且没有出现“文本直通执行、状态不可重放或重试重复写入”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 九、Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型 的发布判断

发布判断需要把“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”的基线与候选只存在一个计划内变量。
- [ ] “Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”的原始输出、中间状态和失败现场已经保留。
- [ ] “Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”的停止条件、负责人和回滚入口已经演练。
- [ ] “Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“Superpowers、OpenSpec、Spec Kit、gstack、GSD 与 BMAD 选型”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 十、总结

- **先看缺口，再选工具**：| 当前缺口 | 优先选择 | 不应期待它解决 |
- **推荐组合**：需要产品、设计、安全、发布专审时选择 gstack 的少量角色。
- **三条组合红线**：只有一个需求真相源：OpenSpec、Spec Kit、GSD .planning 与 BMAD 产物不能同时都被称为最终规格。 -> 完成状态只有一个写入者：执行 Agent 可以提交证据，最终验收由质量门禁或负责人写入。 -> 权限不能随流程升级：Skill、角色或重试次数不改变沙盒和审批边界。
- **最小选型评分**：用 0 到 2 分评估需求不确定性、系统风险、参与角色、任务时长、分支复杂度和审计要求。

## 参考资料

- [Superpowers](https://github.com/obra/superpowers)
- [OpenSpec](https://github.com/Fission-AI/OpenSpec)
- [GitHub Spec Kit](https://github.com/github/spec-kit)
- [gstack](https://github.com/garrytan/gstack)
- [GSD](https://github.com/gsd-build/get-shit-done)
- [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
