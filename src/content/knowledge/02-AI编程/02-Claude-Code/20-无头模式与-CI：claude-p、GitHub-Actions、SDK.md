# Claude Code（20） - 无头模式与 CI：claude -p、GitHub Actions、SDK

> 读完后，你应能完成以下任务：
> - 绘制“Claude Code（20） - 无头模式与 CI：claude -p、GitHub Actions、SDK / 什么是「无头模式」”的关键对象与数据流，解释“前面都是「交互式」——你在终端里和它一来一回。”，并用源码位置、日志或 Trace 标注证据。
> - 为“Claude Code（20） - 无头模式与 CI：claude -p、GitHub Actions、SDK / claude -p：打印模式”设计正常与异常输入，验证“💡 脚本/CI 里常配 --no-session-persistence：不把会话存盘、不可恢复，适合一次性的自动化运行。”，输出首个偏差位置与回归测试结果。
> - 实现“Claude Code（20） - 无头模式与 CI：claude -p、GitHub Actions、SDK / GitHub Actions：让它在 PR 里自动干活”的最小代码或配置，检验“注：v1 是 GA 正式版。”，输出命令、结果与 Diff，并说明不适用边界。

> 本章目标：用 `claude -p` 做脚本/CI 自动化；接入 GitHub Action；了解 Agent SDK 编排。


---

<!-- article-progressive-block:start -->
# 一、先建立全局：无头模式与 CI：claude -p、GitHub Actions、SDK 是什么？

理解“无头模式与 CI：claude -p、GitHub Actions、SDK”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“无头模式与 CI：claude -p、GitHub Actions、SDK”的第一个核心判断是：前面都是「交互式」——你在终端里和它一来一回。。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | 什么是「无头模式」 | 前面都是「交互式」——你在终端里和它一来一回。 |
| 2 | claude -p：打印模式 | 💡 脚本/CI 里常配 --no-session-persistence：不把会话存盘、不可恢复，适合一次性的自动化运行。 |
| 3 | GitHub Actions：让它在 PR 里自动干活 | 注：v1 是 GA 正式版。 |
| 4 | Agent SDK：把它嵌进你自己的程序 | 如果你想用代码编排 Claude Code（不只是命令行）， |
| 5 | 三种无头方式怎么选 | 从简到繁：脚本用 -p，团队 CI 用 Action，产品集成用 SDK。 |
| 6 | 常见错误 | 错误 1：把 API Key 硬写进脚本/工作流 |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["什么是「无头模式」"] --> S2
  S2["claude -p：打印模式"] --> S3
  S3["GitHub Actions：让它在 PR 里自动干活"] --> S4
  S4["Agent SDK：把它嵌进你自己的程序"] --> S5
  S5["三种无头方式怎么选"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“无头模式与 CI：claude -p、GitHub Actions、SDK”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“无头模式与 CI：claude -p、GitHub Actions、SDK”的对象和顺序已经明确后，再看可观察的失败：条件缺失、结果不可复现或失败后责任不清。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、什么是「无头模式」

前面都是「交互式」——你在终端里和它一来一回。
但要把它放进**脚本、CI、定时任务**里，就不能靠人坐在那儿敲了。
**无头模式（headless）= 不进交互界面，给个指令直接出结果。
** 这是把 Claude Code 接入自动化的基础。

---

# 三、claude -p：打印模式

最核心的一个 flag。
`-p`（或 `--print`）让它**执行完直接打印结果，不进交互会话**：

```bash
claude -p "总结一下 src/ 目录的整体结构"
```

它干完、打印、退出。这意味着你可以把它写进任何脚本：

```bash
# 在脚本里用它生成内容
SUMMARY=$(claude -p "用一句话总结本次 git diff 的改动")
echo "本次改动：$SUMMARY"
```

结合第 16 章的 `/goal`，还能让它在一条命令里**跑到目标达成**：

```bash
claude -p "/goal CHANGELOG.md 为本周每个合并的 PR 都补上一条记录"
```

> 💡 脚本/CI 里常配 `--no-session-persistence`：不把会话存盘、不可恢复，适合一次性的自动化运行。

---

# 四、GitHub Actions：让它在 PR 里自动干活

官方提供了 GitHub Action（`anthropics/claude-code-action@v1`），
把 Claude Code 接进你的 CI 流水线。
最常见的用法：**PR 一开，它自动 review**。

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    prompt: "审查这个 PR 的安全问题"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    claude_args: |
      --append-system-prompt "遵循我们的编码规范"
      --max-turns 10
      --model claude-sonnet-4-6
```

要点：

- `prompt`：让它干什么（审查、改代码、补测试……）；
- `anthropic_api_key`：放进仓库 secrets，**别硬写在文件里**；
- `claude_args`：透传 CLI 参数（系统提示、最大轮数、模型等）。

> 注：v1 是 GA 正式版。早期 beta 用的是 `direct_prompt`、`custom_instructions`、`max_turns` 等独立字段，v1 统一改为 `prompt` + `claude_args` 透传。用新版写法即可。

---

# 五、Agent SDK：把它嵌进你自己的程序

如果你想**用代码编排** Claude Code（不只是命令行），
用 **Agent SDK**（有 TypeScript 和 Python 版）。
它让你在程序里发起会话、流式接收消息、控制权限、甚至做**文件检查点**（回顾第 04 章的回溯，
SDK 里可编程实现）。

适合的场景：

- 把 Claude 的能力做成你产品里的一个功能；
- 构建复杂的多代理编排（程序化地调度、收集结果）；
- 需要精细控制每一步（权限、轮数、模型）。

> 对绝大多数日常自动化，`claude -p` + GitHub Action 已经够用；要做产品化集成或复杂编排，才上 SDK。

---

# 六、三种无头方式怎么选

| 方式 | 适合 | 复杂度 |
| --- | --- | --- |
| `claude -p` | shell 脚本、本地自动化、一次性任务 | 低 |
| GitHub Action | PR 自动审查/改动、团队 CI 流程 | 中 |
| Agent SDK | 产品化集成、复杂多代理编排 | 高 |

> 从简到繁：脚本用 `-p`，团队 CI 用 Action，产品集成用 SDK。

---

# 七、常见错误

**错误 1：把 API Key 硬写进脚本/工作流**
泄露风险极高。→ 一律放环境变量 / 仓库 secrets。

**错误 2：CI 里不设 `--max-turns`**
无人值守却不限轮数，可能跑飞、烧 token。
→ 设合理的最大轮数兜底。

**错误 3：无头模式跑高危操作不设防**
没人盯着却让它改生产/删数据。→ 严控权限，高危操作别放进自动流程。

**错误 4：日常小自动化也硬上 SDK**
杀鸡用牛刀。
→ 能 `claude -p` 解决的别写一堆 SDK 代码。

---

# 八、最佳实践

1. **脚本优先 `-p`**：一次性、本地自动化，打印模式最省事。
2. **密钥进 secrets**：API Key 绝不硬写进文件。
3. **CI 设护栏**：`--max-turns`、合适的模型、明确的 prompt。
4. **无头守安全**：高危操作不进自动流程，权限从严。
5. **按复杂度选工具**：`-p` → Action → SDK，由简到繁。

---

# 九、动手实践：Demo 20 · 无头自动化（可直接用）

## 9.1 文件
- `summarize-diff.sh`：用 claude -p 在脚本里生成 diff 摘要（演示无头调用）。
- `.github/workflows/claude-review.yml`：PR 自动审查工作流（复制到你仓库即可）。

## 9.2 怎么用
- 脚本：在 git 仓库里 `bash summarize-diff.sh`（需已装并登录 claude）。
- Action：把 .github/workflows/claude-review.yml 复制到你的仓库，并在仓库 Secrets 配 ANTHROPIC_API_KEY。

<!-- article-progressive-block:start -->
# 十、动手验证：先跑通 无头模式与 CI：claude -p、GitHub Actions、SDK，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“无头模式与 CI：claude -p、GitHub Actions、SDK”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 10.1 基线与候选只允许一个变量不同

验证“无头模式与 CI：claude -p、GitHub Actions、SDK”时，先固定样本、基线、候选、成功标准和失败边界。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“无头模式与 CI：claude -p、GitHub Actions、SDK”时，动作是：同环境运行基线与候选，记录输入、中间状态和异常。原始结果不能只保留截图或汇总分数，必须同步保存：可重放命令、结构化日志、输出 Diff、失败样本、版本，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 固定样本、基线、候选、成功标准和失败边界 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |
| 通过阈值 | 结果符合结论条件，异常输入可解释、可恢复 |
| 立即停止 | 条件缺失、结果不可复现或失败后责任不清 |

## 10.2 执行前先排除不可比较条件

“无头模式与 CI：claude -p、GitHub Actions、SDK”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“无头模式与 CI：claude -p、GitHub Actions、SDK”的当前环境重复运行。
- 候选只改变一个与“无头模式与 CI：claude -p、GitHub Actions、SDK”结论直接相关的条件。
- “无头模式与 CI：claude -p、GitHub Actions、SDK”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “无头模式与 CI：claude -p、GitHub Actions、SDK”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 10.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“无头模式与 CI：claude -p、GitHub Actions、SDK”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 固定样本、基线、候选、成功标准和失败边界 |
| 过程可回放 | 同环境运行基线与候选，记录输入、中间状态和异常 |
| 结果可审计 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |

“无头模式与 CI：claude -p、GitHub Actions、SDK”的一次合格基线对照按以下顺序执行：

1. 保存“无头模式与 CI：claude -p、GitHub Actions、SDK”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“无头模式与 CI：claude -p、GitHub Actions、SDK”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“无头模式与 CI：claude -p、GitHub Actions、SDK”：同环境运行基线与候选，记录输入、中间状态和异常。
4. 为“无头模式与 CI：claude -p、GitHub Actions、SDK”保存：可重放命令、结构化日志、输出 Diff、失败样本、版本。
5. 使用“无头模式与 CI：claude -p、GitHub Actions、SDK”预登记条件判断：结果符合结论条件，异常输入可解释、可恢复。
6. 如果“无头模式与 CI：claude -p、GitHub Actions、SDK”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 十一、用一张矩阵验证 无头模式与 CI：claude -p、GitHub Actions、SDK 的关键结论

矩阵按正文顺序列出“无头模式与 CI：claude -p、GitHub Actions、SDK”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| 什么是「无头模式」 | 前面都是「交互式」——你在终端里和它一来一回。 | 只改变与“什么是「无头模式」”相关的条件 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |
| claude -p：打印模式 | 💡 脚本/CI 里常配 --no-session-persistence：不把会话存盘、不可恢复，适合一次性的自动化运行。 | 只改变与“claude -p：打印模式”相关的条件 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |
| GitHub Actions：让它在 PR 里自动干活 | 注：v1 是 GA 正式版。 | 只改变与“GitHub Actions：让它在 PR 里自动干活”相关的条件 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |
| Agent SDK：把它嵌进你自己的程序 | 如果你想用代码编排 Claude Code（不只是命令行）， | 只改变与“Agent SDK：把它嵌进你自己的程序”相关的条件 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |
| 三种无头方式怎么选 | 从简到繁：脚本用 -p，团队 CI 用 Action，产品集成用 SDK。 | 只改变与“三种无头方式怎么选”相关的条件 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |
| 常见错误 | 错误 1：把 API Key 硬写进脚本/工作流 | 只改变与“常见错误”相关的条件 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |

## 11.1 记录本次实际实验

下面的记录用于“无头模式与 CI：claude -p、GitHub Actions、SDK”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "无头模式与 CI：claude -p、GitHub Actions、SDK"
selected_chapter: required
claim_from_article: required
baseline_version: required
changed_condition: exactly_one
execution: "同环境运行基线与候选，记录输入、中间状态和异常"
evidence: "可重放命令、结构化日志、输出 Diff、失败样本、版本"
pass_when: "结果符合结论条件，异常输入可解释、可恢复"
stop_when: "条件缺失、结果不可复现或失败后责任不清"
observed_result: required
first_deviation: null_or_evidence
recovery_replay: required_after_failure
```

## 11.2 边界实验必须证明能够停止和恢复

成功路径只能证明“无头模式与 CI：claude -p、GitHub Actions、SDK”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：条件缺失、结果不可复现或失败后责任不清，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 | 结果符合结论条件，异常输入可解释、可恢复 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：条件缺失、结果不可复现或失败后责任不清 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：保留基线，缩小变量；根因确认前不扩大范围 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“无头模式与 CI：claude -p、GitHub Actions、SDK”，第一步是：保留基线，缩小变量；根因确认前不扩大范围。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“无头模式与 CI：claude -p、GitHub Actions、SDK”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 十二、无头模式与 CI：claude -p、GitHub Actions、SDK 的结果解释

解释“无头模式与 CI：claude -p、GitHub Actions、SDK”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 条件缺失、结果不可复现或失败后责任不清 | 先执行：保留基线，缩小变量；根因确认前不扩大范围 |
| 异常链路无法恢复 | 条件缺失、结果不可复现或失败后责任不清 | 先执行：保留基线，缩小变量；根因确认前不扩大范围 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“无头模式与 CI：claude -p、GitHub Actions、SDK”只有同时满足“结果符合结论条件，异常输入可解释、可恢复”，并且没有出现“条件缺失、结果不可复现或失败后责任不清”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“无头模式与 CI：claude -p、GitHub Actions、SDK”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“无头模式与 CI：claude -p、GitHub Actions、SDK”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 十三、无头模式与 CI：claude -p、GitHub Actions、SDK 的发布判断

发布判断需要把“无头模式与 CI：claude -p、GitHub Actions、SDK”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “无头模式与 CI：claude -p、GitHub Actions、SDK”的基线与候选只存在一个计划内变量。
- [ ] “无头模式与 CI：claude -p、GitHub Actions、SDK”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “无头模式与 CI：claude -p、GitHub Actions、SDK”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “无头模式与 CI：claude -p、GitHub Actions、SDK”的原始输出、中间状态和失败现场已经保留。
- [ ] “无头模式与 CI：claude -p、GitHub Actions、SDK”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “无头模式与 CI：claude -p、GitHub Actions、SDK”的停止条件、负责人和回滚入口已经演练。
- [ ] “无头模式与 CI：claude -p、GitHub Actions、SDK”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“无头模式与 CI：claude -p、GitHub Actions、SDK”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 十四、总结

- **什么是「无头模式」**：前面都是「交互式」——你在终端里和它一来一回。
- **claude -p：打印模式**：💡 脚本/CI 里常配 --no-session-persistence：不把会话存盘、不可恢复，适合一次性的自动化运行。
- **GitHub Actions：让它在 PR 里自动干活**：注：v1 是 GA 正式版。
- **Agent SDK：把它嵌进你自己的程序**：如果你想用代码编排 Claude Code（不只是命令行），用 Agent SDK（有 TypeScript 和 Python 版）。
- **三种无头方式怎么选**：| 方式 | 适合 | 复杂度 |
- **常见错误**：错误 1：把 API Key 硬写进脚本/工作流

## 参考资料

- [Claude Code 文档](https://docs.anthropic.com/en/docs/claude-code/overview)
- [Claude Code 安全](https://docs.anthropic.com/en/docs/claude-code/security)
