# Kafka（03） - Offset、Rebalance 与消费语义

> 读完后，你应能完成以下任务：
> - 绘制“Kafka（03） - Offset、Rebalance 与消费语义 / Offset 是下一次读取位置”的关键对象与数据流，解释“批量 Poll 后不能只因最后一条成功就提交整个批次。”，并用源码位置、日志或 Trace 标注证据。
> - 为“Kafka（03） - Offset、Rebalance 与消费语义 / 手动提交与暂停”设计正常与异常输入，验证“实际生产要处理空批次、Wakeup、提交失败、重试和优雅停机。”，输出首个偏差位置与回归测试结果。
> - 实现“Kafka（03） - Offset、Rebalance 与消费语义 / Rebalance 生命周期”的最小代码或配置，检验“不能在撤销回调里无限等待，否则阻塞组协调。”，输出命令、结果与 Diff，并说明不适用边界。

<!-- article-progressive-block:start -->
# 一、先建立全局：Offset、Rebalance 与消费语义 是什么？

理解“Offset、Rebalance 与消费语义”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“Offset、Rebalance 与消费语义”的第一个核心判断是：批量 Poll 后不能只因最后一条成功就提交整个批次。。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | Offset 是下一次读取位置 | 批量 Poll 后不能只因最后一条成功就提交整个批次。 |
| 2 | 手动提交与暂停 | 实际生产要处理空批次、Wakeup、提交失败、重试和优雅停机。 |
| 3 | Rebalance 生命周期 | 不能在撤销回调里无限等待，否则阻塞组协调。 |
| 4 | 重放与故障边界 | 重置 Offset 是高风险操作。 |
| 5 | Consumer Position 表示当前客户端下一条要取的  | Consumer Position 表示当前客户端下一条要取的 Offset， |
| 6 | Committed Offset 表示组恢复时采用的位置 | Committed Offset 表示组恢复时采用的位置。 |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["Offset 是下一次读取位置"] --> S2
  S2["手动提交与暂停"] --> S3
  S3["Rebalance 生命周期"] --> S4
  S4["重放与故障边界"] --> S5
  S5["Consumer Position 表示当前客户端下一条要取的 "]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“Offset、Rebalance 与消费语义”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“Offset、Rebalance 与消费语义”的对象和顺序已经明确后，再看可观察的失败：计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、Offset 是下一次读取位置

Consumer Position 表示当前客户端下一条要取的 Offset，
Committed Offset 表示组恢复时采用的位置。
自动提交可能在业务尚未完成时推进位点，
因此有数据库写入、远程调用或异步处理的消费者通常关闭自动提交，
按处理成功范围显式提交。

批量 Poll 后不能只因最后一条成功就提交整个批次。
如果中间记录失败，提交最大 Offset 会跳过失败记录；
完全不提交则会重复已经成功的记录。
解决方式是顺序处理、分 Partition 维护连续成功水位，
或把耗时工作转入具备独立确认机制的内部队列。

# 三、手动提交与暂停

```java
consumer.subscribe(List.of("order-events"), rebalanceListener);
while (running) {
    ConsumerRecords<String, OrderEvent> records = consumer.poll(Duration.ofMillis(500));
    for (TopicPartition partition : records.partitions()) {
        List<ConsumerRecord<String, OrderEvent>> batch = records.records(partition);
        processIdempotently(batch);
        long nextOffset = batch.get(batch.size() - 1).offset() + 1;
        consumer.commitSync(Map.of(partition, new OffsetAndMetadata(nextOffset)));
    }
}
```

示例按 Partition 顺序处理并提交下一位置。
实际生产要处理空批次、Wakeup、提交失败、重试和优雅停机。
下游变慢时可 `pause` Partition 继续 Poll 保持组成员活跃，
容量恢复后 `resume`，
避免拉取无限堆积。

# 四、Rebalance 生命周期

Rebalance 撤销 Partition 前，
应停止接收新任务、等待有限时间完成在途处理并提交连续成功位点；
分配新 Partition 后从已提交位点恢复。
不能在撤销回调里无限等待，否则阻塞组协调。
Cooperative Rebalance 逐步迁移分区，
静态成员可减少短暂重启引发的全组变动。

`session.timeout.ms` 判断成员失联，
`max.poll.interval.ms` 限制两次 Poll 间隔。
业务处理超过后者会被踢出组，即使进程仍活着。
增大超时只能掩盖问题，应控制批量、并发和下游超时。

# 五、重放与故障边界

重置 Offset 是高风险操作。
先固定 Topic、Partition、目标时间/Offset 和影响消费者，
暂停写副作用或启用重放模式，
再执行并监控。
重放消费者必须幂等，通知、扣款等外部副作用默认关闭或隔离。

Lag 上升时区分生产突增、消费者变慢、Rebalance、热点 Partition 和下游故障。
总 Lag 平均值会掩盖单分区卡死，
应检查每个 Partition 的当前位置、Log End Offset 和处理速率。

## 验收清单

- Offset 提交点与业务事务成功点有明确关系。
- Rebalance、优雅停机和进程崩溃不会静默跳过消息。
- 下游变慢时有 Pause、限流和降级，不无限占用内存。
- Offset 重置具备审批、影响分析、幂等和审计记录。

<!-- article-progressive-block:start -->
# 六、动手验证：先跑通 Offset、Rebalance 与消费语义，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“Offset、Rebalance 与消费语义”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 6.1 基线与候选只允许一个变量不同

验证“Offset、Rebalance 与消费语义”时，先固定数据快照、并发条件、客户端配置、拓扑和故障注入点。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“Offset、Rebalance 与消费语义”时，动作是：执行正常读写与故障场景，记录查询计划、锁、复制或消费状态。原始结果不能只保留截图或汇总分数，必须同步保存：执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 固定数据快照、并发条件、客户端配置、拓扑和故障注入点 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |
| 通过阈值 | 一致性与性能满足正文约束，故障恢复后没有丢失或重复副作用 |
| 立即停止 | 计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致 |

## 6.2 执行前先排除不可比较条件

“Offset、Rebalance 与消费语义”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“Offset、Rebalance 与消费语义”的当前环境重复运行。
- 候选只改变一个与“Offset、Rebalance 与消费语义”结论直接相关的条件。
- “Offset、Rebalance 与消费语义”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “Offset、Rebalance 与消费语义”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 6.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“Offset、Rebalance 与消费语义”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 固定数据快照、并发条件、客户端配置、拓扑和故障注入点 |
| 过程可回放 | 执行正常读写与故障场景，记录查询计划、锁、复制或消费状态 |
| 结果可审计 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |

“Offset、Rebalance 与消费语义”的一次合格基线对照按以下顺序执行：

1. 保存“Offset、Rebalance 与消费语义”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“Offset、Rebalance 与消费语义”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“Offset、Rebalance 与消费语义”：执行正常读写与故障场景，记录查询计划、锁、复制或消费状态。
4. 为“Offset、Rebalance 与消费语义”保存：执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验。
5. 使用“Offset、Rebalance 与消费语义”预登记条件判断：一致性与性能满足正文约束，故障恢复后没有丢失或重复副作用。
6. 如果“Offset、Rebalance 与消费语义”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 七、用一张矩阵验证 Offset、Rebalance 与消费语义 的关键结论

矩阵按正文顺序列出“Offset、Rebalance 与消费语义”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| Offset 是下一次读取位置 | 批量 Poll 后不能只因最后一条成功就提交整个批次。 | 只改变与“Offset 是下一次读取位置”相关的条件 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |
| 手动提交与暂停 | 实际生产要处理空批次、Wakeup、提交失败、重试和优雅停机。 | 只改变与“手动提交与暂停”相关的条件 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |
| Rebalance 生命周期 | 不能在撤销回调里无限等待，否则阻塞组协调。 | 只改变与“Rebalance 生命周期”相关的条件 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |
| 重放与故障边界 | 重置 Offset 是高风险操作。 | 只改变与“重放与故障边界”相关的条件 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |
| Consumer Position 表示当前客户端下一条要取的  | Consumer Position 表示当前客户端下一条要取的 Offset， | 只改变与“Consumer Position 表示当前客户端下一条要取的 ”相关的条件 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |
| Committed Offset 表示组恢复时采用的位置 | Committed Offset 表示组恢复时采用的位置。 | 只改变与“Committed Offset 表示组恢复时采用的位置”相关的条件 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 |

## 7.1 记录本次实际实验

下面的记录用于“Offset、Rebalance 与消费语义”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "Offset、Rebalance 与消费语义"
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

成功路径只能证明“Offset、Rebalance 与消费语义”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验 | 一致性与性能满足正文约束，故障恢复后没有丢失或重复副作用 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：从数据入口、存储状态、复制消费链路和恢复步骤定位根因 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“Offset、Rebalance 与消费语义”，第一步是：从数据入口、存储状态、复制消费链路和恢复步骤定位根因。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“Offset、Rebalance 与消费语义”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 八、Offset、Rebalance 与消费语义 的结果解释

解释“Offset、Rebalance 与消费语义”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致 | 先执行：从数据入口、存储状态、复制消费链路和恢复步骤定位根因 |
| 异常链路无法恢复 | 计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致 | 先执行：从数据入口、存储状态、复制消费链路和恢复步骤定位根因 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“Offset、Rebalance 与消费语义”只有同时满足“一致性与性能满足正文约束，故障恢复后没有丢失或重复副作用”，并且没有出现“计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“Offset、Rebalance 与消费语义”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“Offset、Rebalance 与消费语义”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 九、Offset、Rebalance 与消费语义 的发布判断

发布判断需要把“Offset、Rebalance 与消费语义”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “Offset、Rebalance 与消费语义”的基线与候选只存在一个计划内变量。
- [ ] “Offset、Rebalance 与消费语义”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “Offset、Rebalance 与消费语义”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “Offset、Rebalance 与消费语义”的原始输出、中间状态和失败现场已经保留。
- [ ] “Offset、Rebalance 与消费语义”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “Offset、Rebalance 与消费语义”的停止条件、负责人和回滚入口已经演练。
- [ ] “Offset、Rebalance 与消费语义”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“Offset、Rebalance 与消费语义”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 十、总结

- **Offset 是下一次读取位置**：批量 Poll 后不能只因最后一条成功就提交整个批次。
- **手动提交与暂停**：实际生产要处理空批次、Wakeup、提交失败、重试和优雅停机。
- **Rebalance 生命周期**：不能在撤销回调里无限等待，否则阻塞组协调。
- **重放与故障边界**：重置 Offset 是高风险操作。

## 参考资料

- [Apache Kafka Consumer Configurations](https://kafka.apache.org/documentation/#consumerconfigs)
- [KafkaConsumer Javadoc](https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Apache Kafka Consumer Rebalance Protocol](https://kafka.apache.org/documentation/#consumerconfigs_group.protocol)
