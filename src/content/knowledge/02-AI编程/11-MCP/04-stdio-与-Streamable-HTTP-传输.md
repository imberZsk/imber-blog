# MCP（04） - stdio 与 Streamable HTTP 传输

> 读完后，你应能完成以下任务：
> - 绘制“MCP（04） - stdio 与 Streamable HTTP 传输 / 主题拆解：stdio 与 Streamable HTTP 传输的关键机制”的关键对象与数据流，解释“stdio 与 Streamable HTTP 传输：stdio 每行只传协议消息，日志写 stderr，宿主负责子进程生命周期。”，并用源码位置、日志或 Trace 标注证据。
> - 为“MCP（04） - stdio 与 Streamable HTTP 传输 / 核心机制：输入、状态、输出和失败”设计正常与异常输入，验证“stdio 与 Streamable HTTP 传输判断 1：先把“stdio 与 Streamable HTTP 传输”写成输入、处理状态、输出和失败信号四部分，避免只停留在名词解释。”，输出首个偏差位置与回归测试结果。
> - 实现“MCP（04） - stdio 与 Streamable HTTP 传输 / 最小实践：验证stdio 与 Streamable HTTP 传输”的最小代码或配置，检验“expected 必须替换成服务实际声明或阻断的能力。”，输出命令、结果与 Diff，并说明不适用边界。

<!-- article-progressive-block:start -->
# 一、先建立全局：stdio 与 Streamable HTTP 传输 是什么？

理解“stdio 与 Streamable HTTP 传输”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“stdio 与 Streamable HTTP 传输”的第一个核心判断是：stdio 与 Streamable HTTP 传输：stdio 每行只传协议消息，日志写 stderr，宿主负责子进程生命周期。。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | 主题拆解：stdio 与 Streamable HTTP 传输的关键机制 | stdio 与 Streamable HTTP 传输：stdio 每行只传协议消息，日志写 stderr，宿主负责子进程生命周期。 |
| 2 | 核心机制：输入、状态、输出和失败 | stdio 与 Streamable HTTP 传输判断 1：先把“stdio 与 Streamable HTTP 传输”写成输入、处理状态、输出和失败信号四部分，避免只停留在名词解释。 |
| 3 | 最小实践：验证stdio 与 Streamable HTTP 传输 | expected 必须替换成服务实际声明或阻断的能力。 |
| 4 | stdio 与 Streamable HTTP 传输 | stdio 与 Streamable HTTP 传输：Streamable HTTP 需要认证、Origin 校验、会话标识、断线恢复和反向代理超时配置。 |
| 5 | stdio 与 Streamable HTTP 传输判断 2 | stdio 与 Streamable HTTP 传输判断 2：实现时围绕“Client、Server、能力清单、Schema 与传输”建立确定性契约，模型只负责需要推理的部分。 |
| 6 | stdio 与 Streamable HTTP 传输判断 3 | stdio 与 Streamable HTTP 传输判断 3：最终用“经过授权和校验的 Tool、Resource 或 Prompt 结果”验收，并保存足够证据供复现和回滚。 |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["主题拆解：stdio 与 Streamable HTTP 传输的关键机制"] --> S2
  S2["核心机制：输入、状态、输出和失败"] --> S3
  S3["最小实践：验证stdio 与 Streamable HTTP 传输"] --> S4
  S4["stdio 与 Streamable HTTP 传输"] --> S5
  S5["stdio 与 Streamable HTTP 传输判断 2"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“stdio 与 Streamable HTTP 传输”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“stdio 与 Streamable HTTP 传输”的对象和顺序已经明确后，再看可观察的失败：依赖漂移、参数未校验、异常被吞、事务未回滚或状态残留。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、主题拆解：stdio 与 Streamable HTTP 传输的关键机制

- **stdio 与 Streamable HTTP 传输**：stdio 每行只传协议消息，日志写 stderr，宿主负责子进程生命周期。
- **stdio 与 Streamable HTTP 传输**：Streamable HTTP 需要认证、Origin 校验、会话标识、断线恢复和反向代理超时配置。
- **stdio 与 Streamable HTTP 传输**：连接先完成 initialize 和能力协商，再进行 Tool、Resource 或 Prompt 的发现与调用。
- **stdio 与 Streamable HTTP 传输**：Tool 输入由 JSON Schema 描述，但宿主仍要做身份、资源级权限和业务不变量校验。
- **stdio 与 Streamable HTTP 传输**：stdio 连接绑定本地子进程；远程 Streamable HTTP 需要认证、会话、超时和网络边界。

# 三、核心机制：输入、状态、输出和失败


- **stdio 与 Streamable HTTP 传输判断 1**：先把“stdio 与 Streamable HTTP 传输”写成输入、处理状态、输出和失败信号四部分，避免只停留在名词解释。
- **stdio 与 Streamable HTTP 传输判断 2**：实现时围绕“Client、Server、能力清单、Schema 与传输”建立确定性契约，模型只负责需要推理的部分。
- **stdio 与 Streamable HTTP 传输判断 3**：最终用“经过授权和校验的 Tool、Resource 或 Prompt 结果”验收，并保存足够证据供复现和回滚。

# 四、最小实践：验证stdio 与 Streamable HTTP 传输

保存为当前文章专用的验收记录。
下面的 JSON 可作为最小测试输入；
`expected` 必须替换成服务实际声明或阻断的能力。

```json
{
  "topic": "stdio 与 Streamable HTTP 传输",
  "request": "initialize -> capability discovery -> one valid call -> one invalid call",
  "expected": "stdio 每行只传协议消息，日志写 stderr，宿主负责子进程生命周期。",
  "evidence": ["request_id", "negotiated_version", "capabilities", "error_code"]
}
```

通过条件：合法调用符合协商后的 Schema；
非法参数、越权资源或不兼容版本返回机器可判断的错误；
只看到 Tool 成功执行，
不足以证明“stdio 与 Streamable HTTP 传输”已经正确实现。

程生命周期。

<!-- article-progressive-block:start -->
# 五、动手验证：先跑通 stdio 与 Streamable HTTP 传输，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“stdio 与 Streamable HTTP 传输”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 5.1 基线与候选只允许一个变量不同

验证“stdio 与 Streamable HTTP 传输”时，先固定语言与依赖版本、请求参数、数据库初始状态和环境配置。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“stdio 与 Streamable HTTP 传输”时，动作是：运行最小程序或接口测试，覆盖正常输入、边界值和异常传播。原始结果不能只保留截图或汇总分数，必须同步保存：退出码、响应状态、断言、数据库前后状态、异常栈和测试报告，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 固定语言与依赖版本、请求参数、数据库初始状态和环境配置 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 退出码、响应状态、断言、数据库前后状态、异常栈和测试报告 |
| 通过阈值 | 输出满足契约，异常不会留下部分写入，结果可在干净环境复现 |
| 立即停止 | 依赖漂移、参数未校验、异常被吞、事务未回滚或状态残留 |

## 5.2 执行前先排除不可比较条件

“stdio 与 Streamable HTTP 传输”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“stdio 与 Streamable HTTP 传输”的当前环境重复运行。
- 候选只改变一个与“stdio 与 Streamable HTTP 传输”结论直接相关的条件。
- “stdio 与 Streamable HTTP 传输”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “stdio 与 Streamable HTTP 传输”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 5.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“stdio 与 Streamable HTTP 传输”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 固定语言与依赖版本、请求参数、数据库初始状态和环境配置 |
| 过程可回放 | 运行最小程序或接口测试，覆盖正常输入、边界值和异常传播 |
| 结果可审计 | 退出码、响应状态、断言、数据库前后状态、异常栈和测试报告 |

“stdio 与 Streamable HTTP 传输”的一次合格基线对照按以下顺序执行：

1. 保存“stdio 与 Streamable HTTP 传输”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“stdio 与 Streamable HTTP 传输”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“stdio 与 Streamable HTTP 传输”：运行最小程序或接口测试，覆盖正常输入、边界值和异常传播。
4. 为“stdio 与 Streamable HTTP 传输”保存：退出码、响应状态、断言、数据库前后状态、异常栈和测试报告。
5. 使用“stdio 与 Streamable HTTP 传输”预登记条件判断：输出满足契约，异常不会留下部分写入，结果可在干净环境复现。
6. 如果“stdio 与 Streamable HTTP 传输”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 六、用一张矩阵验证 stdio 与 Streamable HTTP 传输 的关键结论

矩阵按正文顺序列出“stdio 与 Streamable HTTP 传输”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| 主题拆解：stdio 与 Streamable HTTP 传输的关键机制 | stdio 与 Streamable HTTP 传输：stdio 每行只传协议消息，日志写 stderr，宿主负责子进程生命周期。 | 只改变与“主题拆解：stdio 与 Streamable HTTP 传输的关键机制”相关的条件 | 退出码、响应状态、断言、数据库前后状态、异常栈和测试报告 |
| 核心机制：输入、状态、输出和失败 | stdio 与 Streamable HTTP 传输判断 1：先把“stdio 与 Streamable HTTP 传输”写成输入、处理状态、输出和失败信号四部分，避免只停留在名词解释。 | 只改变与“核心机制：输入、状态、输出和失败”相关的条件 | 退出码、响应状态、断言、数据库前后状态、异常栈和测试报告 |
| 最小实践：验证stdio 与 Streamable HTTP 传输 | expected 必须替换成服务实际声明或阻断的能力。 | 只改变与“最小实践：验证stdio 与 Streamable HTTP 传输”相关的条件 | 退出码、响应状态、断言、数据库前后状态、异常栈和测试报告 |
| stdio 与 Streamable HTTP 传输 | stdio 与 Streamable HTTP 传输：Streamable HTTP 需要认证、Origin 校验、会话标识、断线恢复和反向代理超时配置。 | 只改变与“stdio 与 Streamable HTTP 传输”相关的条件 | 退出码、响应状态、断言、数据库前后状态、异常栈和测试报告 |
| stdio 与 Streamable HTTP 传输判断 2 | stdio 与 Streamable HTTP 传输判断 2：实现时围绕“Client、Server、能力清单、Schema 与传输”建立确定性契约，模型只负责需要推理的部分。 | 只改变与“stdio 与 Streamable HTTP 传输判断 2”相关的条件 | 退出码、响应状态、断言、数据库前后状态、异常栈和测试报告 |
| stdio 与 Streamable HTTP 传输判断 3 | stdio 与 Streamable HTTP 传输判断 3：最终用“经过授权和校验的 Tool、Resource 或 Prompt 结果”验收，并保存足够证据供复现和回滚。 | 只改变与“stdio 与 Streamable HTTP 传输判断 3”相关的条件 | 退出码、响应状态、断言、数据库前后状态、异常栈和测试报告 |

## 6.1 记录本次实际实验

下面的记录用于“stdio 与 Streamable HTTP 传输”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "stdio 与 Streamable HTTP 传输"
selected_chapter: required
claim_from_article: required
baseline_version: required
changed_condition: exactly_one
execution: "运行最小程序或接口测试，覆盖正常输入、边界值和异常传播"
evidence: "退出码、响应状态、断言、数据库前后状态、异常栈和测试报告"
pass_when: "输出满足契约，异常不会留下部分写入，结果可在干净环境复现"
stop_when: "依赖漂移、参数未校验、异常被吞、事务未回滚或状态残留"
observed_result: required
first_deviation: null_or_evidence
recovery_replay: required_after_failure
```

## 6.2 边界实验必须证明能够停止和恢复

成功路径只能证明“stdio 与 Streamable HTTP 传输”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：依赖漂移、参数未校验、异常被吞、事务未回滚或状态残留，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 退出码、响应状态、断言、数据库前后状态、异常栈和测试报告 | 输出满足契约，异常不会留下部分写入，结果可在干净环境复现 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：依赖漂移、参数未校验、异常被吞、事务未回滚或状态残留 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：从入口参数、调用栈、事务边界和外部依赖逐层缩小根因 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“stdio 与 Streamable HTTP 传输”，第一步是：从入口参数、调用栈、事务边界和外部依赖逐层缩小根因。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“stdio 与 Streamable HTTP 传输”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 七、stdio 与 Streamable HTTP 传输 的结果解释

解释“stdio 与 Streamable HTTP 传输”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 依赖漂移、参数未校验、异常被吞、事务未回滚或状态残留 | 先执行：从入口参数、调用栈、事务边界和外部依赖逐层缩小根因 |
| 异常链路无法恢复 | 依赖漂移、参数未校验、异常被吞、事务未回滚或状态残留 | 先执行：从入口参数、调用栈、事务边界和外部依赖逐层缩小根因 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“stdio 与 Streamable HTTP 传输”只有同时满足“输出满足契约，异常不会留下部分写入，结果可在干净环境复现”，并且没有出现“依赖漂移、参数未校验、异常被吞、事务未回滚或状态残留”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“stdio 与 Streamable HTTP 传输”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“stdio 与 Streamable HTTP 传输”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 八、stdio 与 Streamable HTTP 传输 的发布判断

发布判断需要把“stdio 与 Streamable HTTP 传输”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “stdio 与 Streamable HTTP 传输”的基线与候选只存在一个计划内变量。
- [ ] “stdio 与 Streamable HTTP 传输”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “stdio 与 Streamable HTTP 传输”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “stdio 与 Streamable HTTP 传输”的原始输出、中间状态和失败现场已经保留。
- [ ] “stdio 与 Streamable HTTP 传输”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “stdio 与 Streamable HTTP 传输”的停止条件、负责人和回滚入口已经演练。
- [ ] “stdio 与 Streamable HTTP 传输”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“stdio 与 Streamable HTTP 传输”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 九、总结

- **主题拆解：stdio 与 Streamable HTTP 传输的关键机制**：stdio 与 Streamable HTTP 传输：stdio 每行只传协议消息，日志写 stderr，宿主负责子进程生命周期。
- **核心机制：输入、状态、输出和失败**：stdio 与 Streamable HTTP 传输判断 1：先把“stdio 与 Streamable HTTP 传输”写成输入、处理状态、输出和失败信号四部分，避免只停留在名词解释。

- **验证方式**：stdio 与 Streamable HTTP 传输判断 3：最终用“经过授权和校验的 Tool、Resource 或 Prompt 结果”验收，并保存足够证据供复现和回滚。
- **实现机制**：stdio 与 Streamable HTTP 传输判断 2：实现时围绕“Client、Server、能力清单、Schema 与传输”建立确定性契约，模型只负责需要推理的部分。

## 参考资料

- [MCP Specification](https://modelcontextprotocol.io/specification/latest)
- [MCP Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
