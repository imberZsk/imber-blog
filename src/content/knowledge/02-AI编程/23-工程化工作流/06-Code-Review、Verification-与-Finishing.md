# 工程化工作流（06） - Code Review、Verification 与 Finishing

> 读完后，你应能完成以下任务：
> - 绘制“工程化工作流（06） - Code Review、Verification 与 Finishing / 两类审查”的关键对象与数据流，解释“receiving-code-review：先验证意见是否符合当前代码和运行环境，再修改真实问题，不能为了显得配合而盲改。”，并用源码位置、日志或 Trace 标注证据。
> - 为“工程化工作流（06） - Code Review、Verification 与 Finishing / 完成前验证”设计正常与异常输入，验证““之前通过过”“看起来没问题”“代理说已经完成”都不是当前证据。”，输出首个偏差位置与回归测试结果。
> - 实现“工程化工作流（06） - Code Review、Verification 与 Finishing / 分支收尾”的最小代码或配置，检验“在验证通过后给出明确选择：本地合并、推送并创建 PR、保留分支稍后处理，或在得到授权后丢弃。”，输出命令、结果与 Diff，并说明不适用边界。

交付阶段要回答三个不同问题：实现是否满足规格、代码是否存在质量问题、分支下一步怎样处理。
一次“测试通过”不能替代这三项判断。

<!-- article-progressive-block:start -->
# 一、先建立全局：Code Review、Verification 与 Finishing 是什么？

理解“Code Review、Verification 与 Finishing”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“Code Review、Verification 与 Finishing”的第一个核心判断是：receiving-code-review：先验证意见是否符合当前代码和运行环境，。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | 两类审查 | receiving-code-review：先验证意见是否符合当前代码和运行环境， |
| 2 | 完成前验证 | “之前通过过”“看起来没问题”“代理说已经完成”都不是当前证据。 |
| 3 | 分支收尾 | 在验证通过后给出明确选择：本地合并、推送并创建 PR、保留分支稍后处理，或在得到授权后丢弃。 |
| 4 | 交付阶段要回答三个不同问题 | 交付阶段要回答三个不同问题：实现是否满足规格、代码是否存在质量问题、分支下一步怎样处理。 |
| 5 | 一次“测试通过”不能替代这三项判断 | 一次“测试通过”不能替代这三项判断。 |
| 6 | requesting-code-review | requesting-code-review |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["两类审查"] --> S2
  S2["完成前验证"] --> S3
  S3["分支收尾"] --> S4
  S4["交付阶段要回答三个不同问题"] --> S5
  S5["一次“测试通过”不能替代这三项判断"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“Code Review、Verification 与 Finishing”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“Code Review、Verification 与 Finishing”的对象和顺序已经明确后，再看可观察的失败：文本直通执行、状态不可重放或重试重复写入。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、两类审查

`requesting-code-review`
应提供需求、改动范围、基线与当前提交，让审查者优先报告会导致错误或回归的问题。
收到意见后使用
`receiving-code-review`：先验证意见是否符合当前代码和运行环境，
再修改真实问题，
不能为了显得配合而盲改。

# 三、完成前验证

`verification-before-completion`
的核心是新鲜证据。准备宣布完成前，应重新运行能直接证明结论的命令：

```bash
# 检查实际改动范围，防止混入无关文件。
git diff --stat
git diff --check

# 使用项目自己的验证命令替换下面两行。
npm test
npm run build
```

“之前通过过”“看起来没问题”“代理说已经完成”都不是当前证据。
命令失败时应如实报告失败，而不是把部分通过描述成全部通过。

# 四、分支收尾

`finishing-a-development-branch`
在验证通过后给出明确选择：本地合并、推送并创建 PR、保留分支稍后处理，或在得到授权后丢弃。
涉及删除工作树或分支时，先检查未提交改动和远程状态。

# 五、官方资料

- [requesting-code-review](https://github.com/obra/superpowers/tree/main/skills/requesting-code-review)
- [receiving-code-review](https://github.com/obra/superpowers/tree/main/skills/receiving-code-review)
- [verification-before-completion](https://github.com/obra/superpowers/tree/main/skills/verification-before-completion)
- [finishing-a-development-branch](https://github.com/obra/superpowers/tree/main/skills/finishing-a-development-branch)

<!-- article-progressive-block:start -->
# 六、动手验证：先跑通 Code Review、Verification 与 Finishing，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“Code Review、Verification 与 Finishing”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 6.1 基线与候选只允许一个变量不同

验证“Code Review、Verification 与 Finishing”时，先固定工具 Schema、身份、畸形参数、超时和重复请求。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“Code Review、Verification 与 Finishing”时，动作是：回放决策到执行链路，覆盖失败、重试、暂停和恢复。原始结果不能只保留截图或汇总分数，必须同步保存：模型提议、校验、授权、幂等键、状态迁移、Trace，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 工具 Schema、身份、畸形参数、超时和重复请求 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 通过阈值 | 模型只提议；执行受代码约束；失败不重复副作用 |
| 立即停止 | 文本直通执行、状态不可重放或重试重复写入 |

## 6.2 执行前先排除不可比较条件

“Code Review、Verification 与 Finishing”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“Code Review、Verification 与 Finishing”的当前环境重复运行。
- 候选只改变一个与“Code Review、Verification 与 Finishing”结论直接相关的条件。
- “Code Review、Verification 与 Finishing”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “Code Review、Verification 与 Finishing”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 6.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“Code Review、Verification 与 Finishing”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 工具 Schema、身份、畸形参数、超时和重复请求 |
| 过程可回放 | 回放决策到执行链路，覆盖失败、重试、暂停和恢复 |
| 结果可审计 | 模型提议、校验、授权、幂等键、状态迁移、Trace |

“Code Review、Verification 与 Finishing”的一次合格基线对照按以下顺序执行：

1. 保存“Code Review、Verification 与 Finishing”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“Code Review、Verification 与 Finishing”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“Code Review、Verification 与 Finishing”：回放决策到执行链路，覆盖失败、重试、暂停和恢复。
4. 为“Code Review、Verification 与 Finishing”保存：模型提议、校验、授权、幂等键、状态迁移、Trace。
5. 使用“Code Review、Verification 与 Finishing”预登记条件判断：模型只提议；执行受代码约束；失败不重复副作用。
6. 如果“Code Review、Verification 与 Finishing”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 七、用一张矩阵验证 Code Review、Verification 与 Finishing 的关键结论

矩阵按正文顺序列出“Code Review、Verification 与 Finishing”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| 两类审查 | receiving-code-review：先验证意见是否符合当前代码和运行环境， | 只改变与“两类审查”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 完成前验证 | “之前通过过”“看起来没问题”“代理说已经完成”都不是当前证据。 | 只改变与“完成前验证”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 分支收尾 | 在验证通过后给出明确选择：本地合并、推送并创建 PR、保留分支稍后处理，或在得到授权后丢弃。 | 只改变与“分支收尾”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 交付阶段要回答三个不同问题 | 交付阶段要回答三个不同问题：实现是否满足规格、代码是否存在质量问题、分支下一步怎样处理。 | 只改变与“交付阶段要回答三个不同问题”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| 一次“测试通过”不能替代这三项判断 | 一次“测试通过”不能替代这三项判断。 | 只改变与“一次“测试通过”不能替代这三项判断”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |
| requesting-code-review | requesting-code-review | 只改变与“requesting-code-review”相关的条件 | 模型提议、校验、授权、幂等键、状态迁移、Trace |

## 7.1 记录本次实际实验

下面的记录用于“Code Review、Verification 与 Finishing”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "Code Review、Verification 与 Finishing"
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

成功路径只能证明“Code Review、Verification 与 Finishing”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：文本直通执行、状态不可重放或重试重复写入，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 模型提议、校验、授权、幂等键、状态迁移、Trace | 模型只提议；执行受代码约束；失败不重复副作用 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：文本直通执行、状态不可重放或重试重复写入 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：关闭副作用入口，恢复检查点，补充失败契约测试 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“Code Review、Verification 与 Finishing”，第一步是：关闭副作用入口，恢复检查点，补充失败契约测试。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“Code Review、Verification 与 Finishing”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 八、Code Review、Verification 与 Finishing 的结果解释

解释“Code Review、Verification 与 Finishing”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 文本直通执行、状态不可重放或重试重复写入 | 先执行：关闭副作用入口，恢复检查点，补充失败契约测试 |
| 异常链路无法恢复 | 文本直通执行、状态不可重放或重试重复写入 | 先执行：关闭副作用入口，恢复检查点，补充失败契约测试 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“Code Review、Verification 与 Finishing”只有同时满足“模型只提议；执行受代码约束；失败不重复副作用”，并且没有出现“文本直通执行、状态不可重放或重试重复写入”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“Code Review、Verification 与 Finishing”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“Code Review、Verification 与 Finishing”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 九、Code Review、Verification 与 Finishing 的发布判断

发布判断需要把“Code Review、Verification 与 Finishing”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “Code Review、Verification 与 Finishing”的基线与候选只存在一个计划内变量。
- [ ] “Code Review、Verification 与 Finishing”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “Code Review、Verification 与 Finishing”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “Code Review、Verification 与 Finishing”的原始输出、中间状态和失败现场已经保留。
- [ ] “Code Review、Verification 与 Finishing”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “Code Review、Verification 与 Finishing”的停止条件、负责人和回滚入口已经演练。
- [ ] “Code Review、Verification 与 Finishing”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“Code Review、Verification 与 Finishing”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 十、总结

- **两类审查**：receiving-code-review：先验证意见是否符合当前代码和运行环境，再修改真实问题，不能为了显得配合而盲改。
- **完成前验证**：“之前通过过”“看起来没问题”“代理说已经完成”都不是当前证据。
- **分支收尾**：在验证通过后给出明确选择：本地合并、推送并创建 PR、保留分支稍后处理，或在得到授权后丢弃。
- **工程边界**：一次“测试通过”不能替代这三项判断。
- **实现机制**：交付阶段要回答三个不同问题：实现是否满足规格、代码是否存在质量问题、分支下一步怎样处理。
