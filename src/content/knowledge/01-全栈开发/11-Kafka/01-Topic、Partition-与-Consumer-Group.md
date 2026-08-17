# Kafka（01） - Topic、Partition 与 Consumer Group

> 读完后，你应能完成以下任务：
> - 绘制“Kafka（01） - Topic、Partition 与 Consumer Group / Topic 与 Partition 的职责”的关键对象与数据流，解释“Topic 是事件类别，Partition 是实际追加写日志和并行处理单元。”，并用源码位置、日志或 Trace 标注证据。
> - 为“Kafka（01） - Topic、Partition 与 Consumer Group / Key 决定顺序边界”设计正常与异常输入，验证“顺序边界应写进事件契约，例如“同一订单状态有序，不同订单可并行”，而不是笼统要求全局有序。”，输出首个偏差位置与回归测试结果。
> - 实现“Kafka（01） - Topic、Partition 与 Consumer Group / Consumer Group 与 Rebalance”的最小代码或配置，检验“同一 Consumer Group 内，”，输出命令、结果与 Diff，并说明不适用边界。

> 本系列目录沿用当前思维导图中的 “kafka” 标签；技术产品的官方名称是 **Apache Kafka**，正文和配置均使用官方名称 Kafka。

<!-- article-progressive-block:start -->
# 一、先建立全局：Topic、Partition 与 Consumer Group 是什么？

理解“Topic、Partition 与 Consumer Group”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“Topic、Partition 与 Consumer Group”的第一个核心判断是：Topic 是事件类别，Partition 是实际追加写日志和并行处理单元。。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | Topic 与 Partition 的职责 | Topic 是事件类别，Partition 是实际追加写日志和并行处理单元。 |
| 2 | Key 决定顺序边界 | 顺序边界应写进事件契约，例如“同一订单状态有序，不同订单可并行”，而不是笼统要求全局有序。 |
| 3 | Consumer Group 与 Rebalance | 同一 Consumer Group 内， |
| 4 | 设计与故障边界 | 依据峰值写入、单分区处理能力和目标消费并行度估算分区。 -> 选择能表达顺序边界且分布均匀的 Key。 -> 定义保留时间、压缩策略、最大消息和副本数。 -> 为生产/消费失败、死信和事件重放建立独立 Topic 或流程。 |
| 5 | 本系列目录沿用当前思维导图中的 “kafka” 标签 | 本系列目录沿用当前思维导图中的 “kafka” 标签； |
| 6 | 技术产品的官方名称是 Apache Kafka | 技术产品的官方名称是 Apache Kafka，正文和配置均使用官方名称 Kafka。 |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["Topic 与 Partition 的职责"] --> S2
  S2["Key 决定顺序边界"] --> S3
  S3["Consumer Group 与 Rebalance"] --> S4
  S4["设计与故障边界"] --> S5
  S5["本系列目录沿用当前思维导图中的 “kafka” 标签"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“Topic、Partition 与 Consumer Group”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“Topic、Partition 与 Consumer Group”的对象和顺序已经明确后，再看可观察的失败：计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、Topic 与 Partition 的职责

Topic 是事件类别，Partition 是实际追加写日志和并行处理单元。
每条记录在 Partition 内有递增 Offset，
Kafka 只保证单 Partition 内的记录顺序，
不保证整个 Topic 的全局顺序。
副本用于容错，Leader 处理读写，Follower 复制日志；
副本数不能超过可放置的 Broker 数。

分区数决定消费组最大有效并行度，也影响文件、网络、选主和运维成本。
创建大量分区不是免费的，
而且后续增加分区会改变默认 Key 哈希到 Partition 的映射，
可能破坏同一业务实体的历史顺序假设。

# 三、Key 决定顺序边界

```java
ProducerRecord<String, OrderEvent> record =
    new ProducerRecord<>("order-events", orderId, event);
producer.send(record);
```

需要同一订单有序时使用稳定 `orderId` 做 Key，使其进入同一 Partition。
随机 Key 提高均衡性但失去实体顺序；
固定少数 Key 会形成热点。
顺序边界应写进事件契约，例如“同一订单状态有序，不同订单可并行”，而不是笼统要求全局有序。

事件至少包含 `event_id`、业务实体 ID、事件类型、Schema 版本、发生时间和 `trace_id`。
不要只发送一段无法演进的业务 JSON；
消费者需要知道如何去重、兼容和追踪。

# 四、Consumer Group 与 Rebalance

同一 Consumer Group 内，
一个 Partition 同时只分配给一个 Consumer；
不同 Group 各自消费完整数据，可分别服务搜索同步、通知和审计。
Consumer 数超过 Partition 数时，多出的实例空闲；
少于 Partition 数时，一个 Consumer 处理多个 Partition。

成员加入、退出、订阅变化或超时可能触发 Rebalance。
处理时间超过 `max.poll.interval.ms`、频繁发布或实例抖动会导致重复 Rebalance。
消费者应控制单批处理量、把耗时任务解耦，
并使用 Cooperative 策略或静态成员减少不必要迁移。

# 五、设计与故障边界

1. 依据峰值写入、单分区处理能力和目标消费并行度估算分区。
2. 选择能表达顺序边界且分布均匀的 Key。
3. 定义保留时间、压缩策略、最大消息和副本数。
4. 为生产/消费失败、死信和事件重放建立独立 Topic 或流程。
5. 监控分区倾斜、ISR、Under-replicated Partition、Lag 和 Rebalance。

Broker 可用不代表业务正常。
某个热点 Partition、消费组 Lag 上升或 ISR 缩小都可能只影响部分流量。
排障必须下钻到 Topic、Partition、Group 和客户端实例。

## 验收清单

- Topic 的事件语义、Key、分区、保留和副本均有书面契约。
- 同实体顺序和跨实体并行经过并发测试。
- 扩容消费者与增加分区的行为和风险已经演练。
- Lag、Rebalance、ISR 和热点分区具备告警。

<!-- article-progressive-block:start -->
# 六、动手验证：先跑通 Topic、Partition 与 Consumer Group，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“Topic、Partition 与 Consumer Group”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 6.1 基线与候选只允许一个变量不同

验证“Topic、Partition 与 Consumer Group”时，先固定数据快照、并发条件、客户端配置、拓扑和故障注入点。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“Topic、Partition 与 Consumer Group”时，动作是：执行正常读写与故障场景，记录查询计划、锁、复制或消费状态。原始结果不能只保留截图或汇总分数，必须同步保存：执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 固定数据快照、并发条件、客户端配置、拓扑和故障注入点 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |
| 通过阈值 | 一致性与性能满足正文约束，故障恢复后没有丢失或重复副作用 |
| 立即停止 | 计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致 |

## 6.2 执行前先排除不可比较条件

“Topic、Partition 与 Consumer Group”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“Topic、Partition 与 Consumer Group”的当前环境重复运行。
- 候选只改变一个与“Topic、Partition 与 Consumer Group”结论直接相关的条件。
- “Topic、Partition 与 Consumer Group”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “Topic、Partition 与 Consumer Group”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 6.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“Topic、Partition 与 Consumer Group”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 固定数据快照、并发条件、客户端配置、拓扑和故障注入点 |
| 过程可回放 | 执行正常读写与故障场景，记录查询计划、锁、复制或消费状态 |
| 结果可审计 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |

“Topic、Partition 与 Consumer Group”的一次合格基线对照按以下顺序执行：

1. 保存“Topic、Partition 与 Consumer Group”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“Topic、Partition 与 Consumer Group”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“Topic、Partition 与 Consumer Group”：执行正常读写与故障场景，记录查询计划、锁、复制或消费状态。
4. 为“Topic、Partition 与 Consumer Group”保存：执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验。
5. 使用“Topic、Partition 与 Consumer Group”预登记条件判断：一致性与性能满足正文约束，故障恢复后没有丢失或重复副作用。
6. 如果“Topic、Partition 与 Consumer Group”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 七、用一张矩阵验证 Topic、Partition 与 Consumer Group 的关键结论

矩阵按正文顺序列出“Topic、Partition 与 Consumer Group”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| Topic 与 Partition 的职责 | Topic 是事件类别，Partition 是实际追加写日志和并行处理单元。 | 只改变与“Topic 与 Partition 的职责”相关的条件 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |
| Key 决定顺序边界 | 顺序边界应写进事件契约，例如“同一订单状态有序，不同订单可并行”，而不是笼统要求全局有序。 | 只改变与“Key 决定顺序边界”相关的条件 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |
| Consumer Group 与 Rebalance | 同一 Consumer Group 内， | 只改变与“Consumer Group 与 Rebalance”相关的条件 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |
| 设计与故障边界 | 依据峰值写入、单分区处理能力和目标消费并行度估算分区。 -> 选择能表达顺序边界且分布均匀的 Key。 -> 定义保留时间、压缩策略、最大消息和副本数。 -> 为生产/消费失败、死信和事件重放建立独立 Topic 或流程。 | 只改变与“设计与故障边界”相关的条件 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |
| 本系列目录沿用当前思维导图中的 “kafka” 标签 | 本系列目录沿用当前思维导图中的 “kafka” 标签； | 只改变与“本系列目录沿用当前思维导图中的 “kafka” 标签”相关的条件 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |
| 技术产品的官方名称是 Apache Kafka | 技术产品的官方名称是 Apache Kafka，正文和配置均使用官方名称 Kafka。 | 只改变与“技术产品的官方名称是 Apache Kafka”相关的条件 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |

## 7.1 记录本次实际实验

下面的记录用于“Topic、Partition 与 Consumer Group”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "Topic、Partition 与 Consumer Group"
selected_chapter: required
claim_from_article: required
baseline_version: required
changed_condition: exactly_one
execution: "执行正常读写与故障场景，记录查询计划、锁、复制或消费状态"
evidence: "执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验"
pass_when: "一致性与性能满足正文约束，故障恢复后没有丢失或重复副作用"
stop_when: "计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致"
observed_result: required
first_deviation: null_or_evidence
recovery_replay: required_after_failure
```

## 7.2 边界实验必须证明能够停止和恢复

成功路径只能证明“Topic、Partition 与 Consumer Group”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 | 一致性与性能满足正文约束，故障恢复后没有丢失或重复副作用 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：从数据入口、存储状态、复制消费链路和恢复步骤定位根因 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“Topic、Partition 与 Consumer Group”，第一步是：从数据入口、存储状态、复制消费链路和恢复步骤定位根因。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“Topic、Partition 与 Consumer Group”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 八、Topic、Partition 与 Consumer Group 的结果解释

解释“Topic、Partition 与 Consumer Group”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致 | 先执行：从数据入口、存储状态、复制消费链路和恢复步骤定位根因 |
| 异常链路无法恢复 | 计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致 | 先执行：从数据入口、存储状态、复制消费链路和恢复步骤定位根因 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“Topic、Partition 与 Consumer Group”只有同时满足“一致性与性能满足正文约束，故障恢复后没有丢失或重复副作用”，并且没有出现“计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“Topic、Partition 与 Consumer Group”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“Topic、Partition 与 Consumer Group”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 九、Topic、Partition 与 Consumer Group 的发布判断

发布判断需要把“Topic、Partition 与 Consumer Group”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “Topic、Partition 与 Consumer Group”的基线与候选只存在一个计划内变量。
- [ ] “Topic、Partition 与 Consumer Group”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “Topic、Partition 与 Consumer Group”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “Topic、Partition 与 Consumer Group”的原始输出、中间状态和失败现场已经保留。
- [ ] “Topic、Partition 与 Consumer Group”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “Topic、Partition 与 Consumer Group”的停止条件、负责人和回滚入口已经演练。
- [ ] “Topic、Partition 与 Consumer Group”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“Topic、Partition 与 Consumer Group”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 十、总结

- **Topic 与 Partition 的职责**：Topic 是事件类别，Partition 是实际追加写日志和并行处理单元。
- **Key 决定顺序边界**：顺序边界应写进事件契约，例如“同一订单状态有序，不同订单可并行”，而不是笼统要求全局有序。
- **Consumer Group 与 Rebalance**：同一 Consumer Group 内，一个 Partition 同时只分配给一个 Consumer；
- **设计与故障边界**：依据峰值写入、单分区处理能力和目标消费并行度估算分区。 -> 选择能表达顺序边界且分布均匀的 Key。 -> 定义保留时间、压缩策略、最大消息和副本数。 -> 为生产/消费失败、死信和事件重放建立独立 Topic 或流程。

## 参考资料

- [Apache Kafka Introduction](https://kafka.apache.org/documentation/#intro_concepts_and_terms)
- [Apache Kafka Design](https://kafka.apache.org/documentation/#design)
- [Apache Kafka Consumer Group Protocol](https://kafka.apache.org/documentation/#consumerconfigs_group.protocol)
