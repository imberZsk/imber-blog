# CI/CD（03） - GitHub Actions：Action、Marketplace 与复用工作流

> 读完后，你应能完成以下任务：
> - 绘制“CI/CD（03） - GitHub Actions：Action、Marketplace 与复用工作流 / Action 与 Reusable Workflow 的职责”的关键对象与数据流，解释“JavaScript/容器 Action 适合更复杂运行时。”，并用源码位置、日志或 Trace 标注证据。
> - 为“CI/CD（03） - GitHub Actions：Action、Marketplace 与复用工作流 / 输入、输出、Secret 与版本契约”设计正常与异常输入，验证“复用单元声明 typed inputs、outputs 和必需 Secret，”，输出首个偏差位置与回归测试结果。
> - 实现“CI/CD（03） - GitHub Actions：Action、Marketplace 与复用工作流 / Marketplace 评估与供应链固定”的最小代码或配置，检验“对发布、云认证等高风险步骤优先使用官方 Action 或内部受控实现。”，输出命令、结果与 Diff，并说明不适用边界。

<!-- article-progressive-block:start -->
# 一、先建立全局：GitHub Actions：Action、Marketplace 与复用工作流 是什么？

理解“GitHub Actions：Action、Marketplace 与复用工作流”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“GitHub Actions：Action、Marketplace 与复用工作流”的第一个核心判断是：JavaScript/容器 Action 适合更复杂运行时。。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | Action 与 Reusable Workflow 的职责 | JavaScript/容器 Action 适合更复杂运行时。 |
| 2 | 输入、输出、Secret 与版本契约 | 复用单元声明 typed inputs、outputs 和必需 Secret， |
| 3 | Marketplace 评估与供应链固定 | 对发布、云认证等高风险步骤优先使用官方 Action 或内部受控实现。 |
| 4 | 调用复用 Workflow | secrets: inherit 只适合信任边界明确的同组织工作流， |
| 5 | 故障边界与验证 | 验收时至少覆盖正常、边界和失败三条路径。 |
| 6 | Action 封装一个 Job 内可复用步骤 | Action 封装一个 Job 内可复用步骤， |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["Action 与 Reusable Workflow 的职责"] --> S2
  S2["输入、输出、Secret 与版本契约"] --> S3
  S3["Marketplace 评估与供应链固定"] --> S4
  S4["调用复用 Workflow"] --> S5
  S5["故障边界与验证"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“GitHub Actions：Action、Marketplace 与复用工作流”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“GitHub Actions：Action、Marketplace 与复用工作流”的对象和顺序已经明确后，再看可观察的失败：环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、Action 与 Reusable Workflow 的职责

Action 封装一个 Job 内可复用步骤，
组合 Action 复用 shell 与现有 Action，
JavaScript/容器 Action 适合更复杂运行时。
Reusable Workflow 可以包含多个 Job、Runner、权限和 Environment，
适合组织级完整流水线策略。

# 三、输入、输出、Secret 与版本契约

复用单元声明 typed inputs、outputs 和必需 Secret，
调用方显式传入，
禁止隐式读取大量环境变量。
重大行为变更使用版本或不可变 SHA，调用链记录实际解析版本；
嵌套工作流的权限只能保持或收窄。

# 四、Marketplace 评估与供应链固定

引入第三方 Action 前审查所有者、源码、发布记录、权限、网络和依赖，
固定完整 commit SHA 并由依赖机器人更新。
Fork PR 不应向 Action 暴露密钥；
对发布、云认证等高风险步骤优先使用官方 Action 或内部受控实现。

# 五、调用复用 Workflow

调用方只传制品摘要和目标环境，生产 Secret 由受保护 Environment 提供。

```yaml
jobs:
  deploy:
    uses: acme/platform/.github/workflows/deploy.yml@COMMIT_SHA
    with:
      artifact-digest: sha256:abc123
      environment: staging
    secrets: inherit
    permissions:
      contents: read
      id-token: write
```

secrets: inherit 只适合信任边界明确的同组织工作流，
更稳妥的是逐项声明 Secret。
复用工作流内部还应限制 Environment 和 OIDC subject。

# 六、故障边界与验证

下面三类现象覆盖本主题最常见的错误路径；
证明结果可复现且没有引入新的副作用。

| 现象 | 常见根因 | 验证与处理 |
| --- | --- | --- |
| Action 更新后流水线突然改变 | 引用可变 tag 或主分支 | 固定完整 commit SHA 并通过审查更新 |
| 复用工作流拿不到 Secret | Secret 未声明、环境边界或继承层级错误 | 逐层检查 workflow_call 契约与 Environment 保护 |
| 组合 Action 无法设置 Job 权限 | Action 只运行在调用 Job 内 | 需要多 Job/权限时改为 reusable workflow |

验收时至少覆盖正常、边界和失败三条路径。
配置、镜像、工作流或测试数据都要绑定版本；

<!-- article-progressive-block:start -->
# 七、动手验证：先跑通 GitHub Actions：Action、Marketplace 与复用工作流，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“GitHub Actions：Action、Marketplace 与复用工作流”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 7.1 基线与候选只允许一个变量不同

验证“GitHub Actions：Action、Marketplace 与复用工作流”时，先固定制品、配置、运行环境、流量样本、权限和回滚条件。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“GitHub Actions：Action、Marketplace 与复用工作流”时，动作是：执行部署或验收链路，并主动制造一次健康检查、网络或依赖失败。原始结果不能只保留截图或汇总分数，必须同步保存：命令退出码、事件、日志、指标、Trace、页面断言和制品摘要，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 固定制品、配置、运行环境、流量样本、权限和回滚条件 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |
| 通过阈值 | 成功路径达标，失败被及时阻断，恢复与回滚结果经过复测 |
| 立即停止 | 环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用 |

## 7.2 执行前先排除不可比较条件

“GitHub Actions：Action、Marketplace 与复用工作流”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“GitHub Actions：Action、Marketplace 与复用工作流”的当前环境重复运行。
- 候选只改变一个与“GitHub Actions：Action、Marketplace 与复用工作流”结论直接相关的条件。
- “GitHub Actions：Action、Marketplace 与复用工作流”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “GitHub Actions：Action、Marketplace 与复用工作流”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 7.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“GitHub Actions：Action、Marketplace 与复用工作流”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 固定制品、配置、运行环境、流量样本、权限和回滚条件 |
| 过程可回放 | 执行部署或验收链路，并主动制造一次健康检查、网络或依赖失败 |
| 结果可审计 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |

“GitHub Actions：Action、Marketplace 与复用工作流”的一次合格基线对照按以下顺序执行：

1. 保存“GitHub Actions：Action、Marketplace 与复用工作流”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“GitHub Actions：Action、Marketplace 与复用工作流”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“GitHub Actions：Action、Marketplace 与复用工作流”：执行部署或验收链路，并主动制造一次健康检查、网络或依赖失败。
4. 为“GitHub Actions：Action、Marketplace 与复用工作流”保存：命令退出码、事件、日志、指标、Trace、页面断言和制品摘要。
5. 使用“GitHub Actions：Action、Marketplace 与复用工作流”预登记条件判断：成功路径达标，失败被及时阻断，恢复与回滚结果经过复测。
6. 如果“GitHub Actions：Action、Marketplace 与复用工作流”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 八、用一张矩阵验证 GitHub Actions：Action、Marketplace 与复用工作流 的关键结论

矩阵按正文顺序列出“GitHub Actions：Action、Marketplace 与复用工作流”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| Action 与 Reusable Workflow 的职责 | JavaScript/容器 Action 适合更复杂运行时。 | 只改变与“Action 与 Reusable Workflow 的职责”相关的条件 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |
| 输入、输出、Secret 与版本契约 | 复用单元声明 typed inputs、outputs 和必需 Secret， | 只改变与“输入、输出、Secret 与版本契约”相关的条件 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |
| Marketplace 评估与供应链固定 | 对发布、云认证等高风险步骤优先使用官方 Action 或内部受控实现。 | 只改变与“Marketplace 评估与供应链固定”相关的条件 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |
| 调用复用 Workflow | secrets: inherit 只适合信任边界明确的同组织工作流， | 只改变与“调用复用 Workflow”相关的条件 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |
| 故障边界与验证 | 验收时至少覆盖正常、边界和失败三条路径。 | 只改变与“故障边界与验证”相关的条件 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |
| Action 封装一个 Job 内可复用步骤 | Action 封装一个 Job 内可复用步骤， | 只改变与“Action 封装一个 Job 内可复用步骤”相关的条件 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |

## 8.1 记录本次实际实验

下面的记录用于“GitHub Actions：Action、Marketplace 与复用工作流”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "GitHub Actions：Action、Marketplace 与复用工作流"
selected_chapter: required
claim_from_article: required
baseline_version: required
changed_condition: exactly_one
execution: "执行部署或验收链路，并主动制造一次健康检查、网络或依赖失败"
evidence: "命令退出码、事件、日志、指标、Trace、页面断言和制品摘要"
pass_when: "成功路径达标，失败被及时阻断，恢复与回滚结果经过复测"
stop_when: "环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用"
observed_result: required
first_deviation: null_or_evidence
recovery_replay: required_after_failure
```

## 8.2 边界实验必须证明能够停止和恢复

成功路径只能证明“GitHub Actions：Action、Marketplace 与复用工作流”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 | 成功路径达标，失败被及时阻断，恢复与回滚结果经过复测 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：停止扩量，按制品、配置、运行时和依赖顺序定位并恢复 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“GitHub Actions：Action、Marketplace 与复用工作流”，第一步是：停止扩量，按制品、配置、运行时和依赖顺序定位并恢复。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“GitHub Actions：Action、Marketplace 与复用工作流”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 九、GitHub Actions：Action、Marketplace 与复用工作流 的结果解释

解释“GitHub Actions：Action、Marketplace 与复用工作流”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用 | 先执行：停止扩量，按制品、配置、运行时和依赖顺序定位并恢复 |
| 异常链路无法恢复 | 环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用 | 先执行：停止扩量，按制品、配置、运行时和依赖顺序定位并恢复 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“GitHub Actions：Action、Marketplace 与复用工作流”只有同时满足“成功路径达标，失败被及时阻断，恢复与回滚结果经过复测”，并且没有出现“环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“GitHub Actions：Action、Marketplace 与复用工作流”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“GitHub Actions：Action、Marketplace 与复用工作流”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 十、GitHub Actions：Action、Marketplace 与复用工作流 的发布判断

发布判断需要把“GitHub Actions：Action、Marketplace 与复用工作流”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “GitHub Actions：Action、Marketplace 与复用工作流”的基线与候选只存在一个计划内变量。
- [ ] “GitHub Actions：Action、Marketplace 与复用工作流”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “GitHub Actions：Action、Marketplace 与复用工作流”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “GitHub Actions：Action、Marketplace 与复用工作流”的原始输出、中间状态和失败现场已经保留。
- [ ] “GitHub Actions：Action、Marketplace 与复用工作流”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “GitHub Actions：Action、Marketplace 与复用工作流”的停止条件、负责人和回滚入口已经演练。
- [ ] “GitHub Actions：Action、Marketplace 与复用工作流”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“GitHub Actions：Action、Marketplace 与复用工作流”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 十一、总结

- **Action 与 Reusable Workflow 的职责**：Action 封装一个 Job 内可复用步骤，组合 Action 复用 shell 与现有 Action，JavaScript/容器 Action 适合更复杂运行时。
- **输入、输出、Secret 与版本契约**：复用单元声明 typed inputs、outputs 和必需 Secret，调用方显式传入，禁止隐式读取大量环境变量。
- **Marketplace 评估与供应链固定**：对发布、云认证等高风险步骤优先使用官方 Action 或内部受控实现。
- **调用复用 Workflow**：secrets: inherit 只适合信任边界明确的同组织工作流，更稳妥的是逐项声明 Secret。

## 参考资料

- [Creating Actions](https://docs.github.com/en/actions/sharing-automations/creating-actions)
- [Reusing Workflows](https://docs.github.com/en/actions/sharing-automations/reusing-workflows)
- [Marketplace Actions](https://docs.github.com/en/actions/learn-github-actions/finding-and-customizing-actions)
