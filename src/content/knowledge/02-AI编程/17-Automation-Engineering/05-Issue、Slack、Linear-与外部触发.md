# Automation Engineering（05） - Issue、Slack、Linear 与外部触发

> 读完后，你应能完成以下任务：
> - 绘制“Automation Engineering（05） - Issue、Slack、Linear 与外部触发 / 主题拆解：Issue、Slack、Linear 与外部触发的关键机制”的关键对象与数据流，解释“Issue、Slack、Linear 与外部触发：触发事件先验证签名并生成幂等键，再创建持久任务；”，并用源码位置、日志或 Trace 标注证据。
> - 为“Automation Engineering（05） - Issue、Slack、Linear 与外部触发 / 核心机制：输入、状态、输出和失败”设计正常与异常输入，验证“Issue、Slack、Linear 与外部触发判断 1：先把“Issue、Slack、Linear 与外部触发”写成输入、处理状态、输出和失败信号四部分，避免只停留在名词解释。”，输出首个偏差位置与回归测试结果。
> - 实现“Automation Engineering（05） - Issue、Slack、Linear 与外部触发 / 补充结论 1”的最小代码或配置，检验“Issue、Slack、Linear 与外部触发判断 2：实现时围绕“触发事件、幂等键、任务状态和外部依赖”建立确定性契约，模型只负责需要推理的部分。”，输出命令、结果与 Diff，并说明不适用边界。

<!-- article-progressive-block:start -->
# 一、先建立全局：Issue、Slack、Linear 与外部触发 是什么？

理解“Issue、Slack、Linear 与外部触发”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“Issue、Slack、Linear 与外部触发”的第一个核心判断是：Issue、Slack、Linear 与外部触发：触发事件先验证签名并生成幂等键，再创建持久任务；。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | 主题拆解：Issue、Slack、Linear 与外部触发的关键机制 | Issue、Slack、Linear 与外部触发：触发事件先验证签名并生成幂等键，再创建持久任务； |
| 2 | 核心机制：输入、状态、输出和失败 | Issue、Slack、Linear 与外部触发判断 1：先把“Issue、Slack、Linear 与外部触发”写成输入、处理状态、输出和失败信号四部分，避免只停留在名词解释。 |
| 3 | Issue、Slack、Linear 与外部触发判断 2 | Issue、Slack、Linear 与外部触发判断 2：实现时围绕“触发事件、幂等键、任务状态和外部依赖”建立确定性契约，模型只负责需要推理的部分。 |
| 4 | Issue、Slack、Linear 与外部触发判断 3 | Issue、Slack、Linear 与外部触发判断 3：最终用“可重试、可取消、可审计的执行结果”验收，并保存足够证据供复现和回滚。 |
| 5 | 重复事件返回原任务结果 | 重复事件返回原任务结果。 |
| 6 | Issue、Slack、Linear 与外部触发 | Issue、Slack、Linear 与外部触发：长任务使用租约、心跳和 Checkpoint，Worker 失联后由调度器安全接管。 |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["主题拆解：Issue、Slack、Linear 与外部触发的关键机制"] --> S2
  S2["核心机制：输入、状态、输出和失败"] --> S3
  S3["Issue、Slack、Linear 与外部触发判断 2"] --> S4
  S4["Issue、Slack、Linear 与外部触发判断 3"] --> S5
  S5["重复事件返回原任务结果"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“Issue、Slack、Linear 与外部触发”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“Issue、Slack、Linear 与外部触发”的对象和顺序已经明确后，再看可观察的失败：条件缺失、结果不可复现或失败后责任不清。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、主题拆解：Issue、Slack、Linear 与外部触发的关键机制

- **Issue、Slack、Linear 与外部触发**：触发事件先验证签名并生成幂等键，再创建持久任务；重复事件返回原任务结果。
- **Issue、Slack、Linear 与外部触发**：长任务使用租约、心跳和 Checkpoint，Worker 失联后由调度器安全接管。
- **Issue、Slack、Linear 与外部触发**：失败分为可重试、需补偿和需人工三类，每类有独立终态和通知。

# 三、核心机制：输入、状态、输出和失败


- **Issue、Slack、Linear 与外部触发判断 1**：先把“Issue、Slack、Linear 与外部触发”写成输入、处理状态、输出和失败信号四部分，避免只停留在名词解释。
- **Issue、Slack、Linear 与外部触发判断 2**：实现时围绕“触发事件、幂等键、任务状态和外部依赖”建立确定性契约，模型只负责需要推理的部分。
- **Issue、Slack、Linear 与外部触发判断 3**：最终用“可重试、可取消、可审计的执行结果”验收，并保存足够证据供复现和回滚。

# 四、最小实践：用状态和终态验证流程

下面示例只依赖 Python 3.10+ 标准库，

```python
from dataclasses import dataclass


@dataclass
class TaskState:
    """保存任务轮次、预算和终态。"""

    attempts: int = 0  # 保存已经执行的尝试次数。
    max_attempts: int = 3  # 保存允许执行的最大次数。
    status: str = "running"  # 保存 running、succeeded 或 exhausted。


def advance(state: TaskState, passed: bool) -> TaskState:
    """根据确定性验证结果推进状态；state 是当前状态，passed 表示验收是否通过。"""
    state.attempts += 1
    if passed:
        state.status = "succeeded"
    elif state.attempts >= state.max_attempts:
        state.status = "exhausted"
    return state


# 保存演示任务的当前状态。
result = TaskState()
for check_result in (False, False, True):
    result = advance(result, check_result)
    if result.status != "running":
        break
print(result)
```


 失败信号 |

<!-- article-progressive-block:start -->
# 五、动手验证：先跑通 Issue、Slack、Linear 与外部触发，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“Issue、Slack、Linear 与外部触发”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 5.1 基线与候选只允许一个变量不同

验证“Issue、Slack、Linear 与外部触发”时，先固定样本、基线、候选、成功标准和失败边界。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“Issue、Slack、Linear 与外部触发”时，动作是：同环境运行基线与候选，记录输入、中间状态和异常。原始结果不能只保留截图或汇总分数，必须同步保存：可重放命令、结构化日志、输出 Diff、失败样本、版本，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 固定样本、基线、候选、成功标准和失败边界 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |
| 通过阈值 | 结果符合结论条件，异常输入可解释、可恢复 |
| 立即停止 | 条件缺失、结果不可复现或失败后责任不清 |

## 5.2 执行前先排除不可比较条件

“Issue、Slack、Linear 与外部触发”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“Issue、Slack、Linear 与外部触发”的当前环境重复运行。
- 候选只改变一个与“Issue、Slack、Linear 与外部触发”结论直接相关的条件。
- “Issue、Slack、Linear 与外部触发”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “Issue、Slack、Linear 与外部触发”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 5.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“Issue、Slack、Linear 与外部触发”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 固定样本、基线、候选、成功标准和失败边界 |
| 过程可回放 | 同环境运行基线与候选，记录输入、中间状态和异常 |
| 结果可审计 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |

“Issue、Slack、Linear 与外部触发”的一次合格基线对照按以下顺序执行：

1. 保存“Issue、Slack、Linear 与外部触发”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“Issue、Slack、Linear 与外部触发”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“Issue、Slack、Linear 与外部触发”：同环境运行基线与候选，记录输入、中间状态和异常。
4. 为“Issue、Slack、Linear 与外部触发”保存：可重放命令、结构化日志、输出 Diff、失败样本、版本。
5. 使用“Issue、Slack、Linear 与外部触发”预登记条件判断：结果符合结论条件，异常输入可解释、可恢复。
6. 如果“Issue、Slack、Linear 与外部触发”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 六、用一张矩阵验证 Issue、Slack、Linear 与外部触发 的关键结论

矩阵按正文顺序列出“Issue、Slack、Linear 与外部触发”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| 主题拆解：Issue、Slack、Linear 与外部触发的关键机制 | Issue、Slack、Linear 与外部触发：触发事件先验证签名并生成幂等键，再创建持久任务； | 只改变与“主题拆解：Issue、Slack、Linear 与外部触发的关键机制”相关的条件 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |
| 核心机制：输入、状态、输出和失败 | Issue、Slack、Linear 与外部触发判断 1：先把“Issue、Slack、Linear 与外部触发”写成输入、处理状态、输出和失败信号四部分，避免只停留在名词解释。 | 只改变与“核心机制：输入、状态、输出和失败”相关的条件 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |
| Issue、Slack、Linear 与外部触发判断 2 | Issue、Slack、Linear 与外部触发判断 2：实现时围绕“触发事件、幂等键、任务状态和外部依赖”建立确定性契约，模型只负责需要推理的部分。 | 只改变与“Issue、Slack、Linear 与外部触发判断 2”相关的条件 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |
| Issue、Slack、Linear 与外部触发判断 3 | Issue、Slack、Linear 与外部触发判断 3：最终用“可重试、可取消、可审计的执行结果”验收，并保存足够证据供复现和回滚。 | 只改变与“Issue、Slack、Linear 与外部触发判断 3”相关的条件 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |
| 重复事件返回原任务结果 | 重复事件返回原任务结果。 | 只改变与“重复事件返回原任务结果”相关的条件 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |
| Issue、Slack、Linear 与外部触发 | Issue、Slack、Linear 与外部触发：长任务使用租约、心跳和 Checkpoint，Worker 失联后由调度器安全接管。 | 只改变与“Issue、Slack、Linear 与外部触发”相关的条件 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 |

## 6.1 记录本次实际实验

下面的记录用于“Issue、Slack、Linear 与外部触发”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "Issue、Slack、Linear 与外部触发"
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

## 6.2 边界实验必须证明能够停止和恢复

成功路径只能证明“Issue、Slack、Linear 与外部触发”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：条件缺失、结果不可复现或失败后责任不清，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 可重放命令、结构化日志、输出 Diff、失败样本、版本 | 结果符合结论条件，异常输入可解释、可恢复 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：条件缺失、结果不可复现或失败后责任不清 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：保留基线，缩小变量；根因确认前不扩大范围 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“Issue、Slack、Linear 与外部触发”，第一步是：保留基线，缩小变量；根因确认前不扩大范围。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“Issue、Slack、Linear 与外部触发”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 七、Issue、Slack、Linear 与外部触发 的结果解释

解释“Issue、Slack、Linear 与外部触发”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 条件缺失、结果不可复现或失败后责任不清 | 先执行：保留基线，缩小变量；根因确认前不扩大范围 |
| 异常链路无法恢复 | 条件缺失、结果不可复现或失败后责任不清 | 先执行：保留基线，缩小变量；根因确认前不扩大范围 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“Issue、Slack、Linear 与外部触发”只有同时满足“结果符合结论条件，异常输入可解释、可恢复”，并且没有出现“条件缺失、结果不可复现或失败后责任不清”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“Issue、Slack、Linear 与外部触发”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“Issue、Slack、Linear 与外部触发”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 八、Issue、Slack、Linear 与外部触发 的发布判断

发布判断需要把“Issue、Slack、Linear 与外部触发”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “Issue、Slack、Linear 与外部触发”的基线与候选只存在一个计划内变量。
- [ ] “Issue、Slack、Linear 与外部触发”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “Issue、Slack、Linear 与外部触发”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “Issue、Slack、Linear 与外部触发”的原始输出、中间状态和失败现场已经保留。
- [ ] “Issue、Slack、Linear 与外部触发”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “Issue、Slack、Linear 与外部触发”的停止条件、负责人和回滚入口已经演练。
- [ ] “Issue、Slack、Linear 与外部触发”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“Issue、Slack、Linear 与外部触发”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 九、总结

- **主题拆解：Issue、Slack、Linear 与外部触发的关键机制**：Issue、Slack、Linear 与外部触发：触发事件先验证签名并生成幂等键，再创建持久任务；
- **核心机制：输入、状态、输出和失败**：Issue、Slack、Linear 与外部触发判断 1：先把“Issue、Slack、Linear 与外部触发”写成输入、处理状态、输出和失败信号四部分，避免只停留在名词解释。

- **验证方式**：Issue、Slack、Linear 与外部触发判断 3：最终用“可重试、可取消、可审计的执行结果”验收，并保存足够证据供复现和回滚。
- **实现机制**：Issue、Slack、Linear 与外部触发判断 2：实现时围绕“触发事件、幂等键、任务状态和外部依赖”建立确定性契约，模型只负责需要推理的部分。

## 参考资料

- [GitHub Actions Events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Temporal Durable Execution](https://docs.temporal.io/temporal)
