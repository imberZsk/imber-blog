# CI/CD（06） - GitLab Runner：Executor、Tag 与并发

> 读完后，你应能完成以下任务：
> - 绘制“CI/CD（06） - GitLab Runner：Executor、Tag 与并发 / Runner、Executor 与执行隔离”的关键对象与数据流，解释“Docker 提供容器边界，”，并用源码位置、日志或 Trace 标注证据。
> - 为“CI/CD（06） - GitLab Runner：Executor、Tag 与并发 / Tag、Protected 与信任域”设计正常与异常输入，验证“Job tags 必须被 Runner 标签集合覆盖，”，输出首个偏差位置与回归测试结果。
> - 实现“CI/CD（06） - GitLab Runner：Executor、Tag 与并发 / 并发、缓存与自动扩缩”的最小代码或配置，检验“监控 queued_duration 与失败原因。”，输出命令、结果与 Diff，并说明不适用边界。

<!-- article-progressive-block:start -->
# 一、先建立全局：GitLab Runner：Executor、Tag 与并发 是什么？

理解“GitLab Runner：Executor、Tag 与并发”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“GitLab Runner：Executor、Tag 与并发”的第一个核心判断是：Docker 提供容器边界，。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | Runner、Executor 与执行隔离 | Docker 提供容器边界， |
| 2 | Tag、Protected 与信任域 | Job tags 必须被 Runner 标签集合覆盖， |
| 3 | 并发、缓存与自动扩缩 | 监控 queued_duration 与失败原因。 |
| 4 | 受保护的 Kubernetes Runner Job | 发布 Job 只匹配生产 Kubernetes Runner。 |
| 5 | 故障边界与验证 | 验收时至少覆盖正常、边界和失败三条路径。 |
| 6 | Runner 从 GitLab 获取 Job | Runner 从 GitLab 获取 Job， |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["Runner、Executor 与执行隔离"] --> S2
  S2["Tag、Protected 与信任域"] --> S3
  S3["并发、缓存与自动扩缩"] --> S4
  S4["受保护的 Kubernetes Runner Job"] --> S5
  S5["故障边界与验证"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“GitLab Runner：Executor、Tag 与并发”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“GitLab Runner：Executor、Tag 与并发”的对象和顺序已经明确后，再看可观察的失败：环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、Runner、Executor 与执行隔离

Runner 从 GitLab 获取 Job，
再由 shell、Docker、Kubernetes 等 Executor 执行。
Shell Executor 直接共享宿主机，隔离最弱；
Docker 提供容器边界，
Kubernetes 为 Job 创建 Pod，
适合弹性但需要处理镜像拉取和集群配额。

# 三、Tag、Protected 与信任域

Job tags 必须被 Runner 标签集合覆盖，
无标签 Job 只会进入允许 untagged 的 Runner。
生产 Runner 设置 protected，仅服务受保护分支和 tag；
项目 Runner、组 Runner 和实例 Runner 的作用域要与代码信任边界一致。

# 四、并发、缓存与自动扩缩

concurrent 控制全局并发，Runner limit 控制单 Runner；
值要结合 CPU、内存、I/O、目标环境和外部 API 容量压测。
缓存存储按项目和保护级别隔离，
临时 Runner Job 后销毁，
监控 queued_duration 与失败原因。

# 五、受保护的 Kubernetes Runner Job

发布 Job 只匹配生产 Kubernetes Runner。

```yaml
deploy-production:
  stage: deploy
  tags: [kubernetes, production]
  rules:
    - if: '$CI_COMMIT_TAG'
  resource_group: production
  script:
    - ./deploy-by-digest.sh "$IMAGE_DIGEST"
```

resource_group 防止多个生产部署并行，
但 Runner 本身仍需 protected 和网络隔离。
云凭据使用短期身份，不在 Runner 磁盘长期保存。

# 六、故障边界与验证

下面三类现象覆盖本主题最常见的错误路径；
证明结果可复现且没有引入新的副作用。

| 现象 | 常见根因 | 验证与处理 |
| --- | --- | --- |
| Job 一直 pending | 没有 Runner 同时匹配全部 Tag 或 Runner 被暂停 | 核对 Job tags、Runner scope、protected 状态和在线心跳 |
| 并发升高后宿主机不稳定 | Shell/Docker Runner 超卖资源 | 设置 Runner limit、容器资源与队列告警 |
| 非保护分支拿到生产网络 | Runner 未标记 protected 或作用域过宽 | 立即隔离 Runner，审计 Job 并收窄分支和项目访问 |

验收时至少覆盖正常、边界和失败三条路径。
配置、镜像、工作流或测试数据都要绑定版本；

<!-- article-progressive-block:start -->
# 七、动手验证：先跑通 GitLab Runner：Executor、Tag 与并发，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“GitLab Runner：Executor、Tag 与并发”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 7.1 基线与候选只允许一个变量不同

验证“GitLab Runner：Executor、Tag 与并发”时，先固定制品、配置、运行环境、流量样本、权限和回滚条件。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“GitLab Runner：Executor、Tag 与并发”时，动作是：执行部署或验收链路，并主动制造一次健康检查、网络或依赖失败。原始结果不能只保留截图或汇总分数，必须同步保存：命令退出码、事件、日志、指标、Trace、页面断言和制品摘要，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 固定制品、配置、运行环境、流量样本、权限和回滚条件 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |
| 通过阈值 | 成功路径达标，失败被及时阻断，恢复与回滚结果经过复测 |
| 立即停止 | 环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用 |

## 7.2 执行前先排除不可比较条件

“GitLab Runner：Executor、Tag 与并发”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“GitLab Runner：Executor、Tag 与并发”的当前环境重复运行。
- 候选只改变一个与“GitLab Runner：Executor、Tag 与并发”结论直接相关的条件。
- “GitLab Runner：Executor、Tag 与并发”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “GitLab Runner：Executor、Tag 与并发”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 7.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“GitLab Runner：Executor、Tag 与并发”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 固定制品、配置、运行环境、流量样本、权限和回滚条件 |
| 过程可回放 | 执行部署或验收链路，并主动制造一次健康检查、网络或依赖失败 |
| 结果可审计 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |

“GitLab Runner：Executor、Tag 与并发”的一次合格基线对照按以下顺序执行：

1. 保存“GitLab Runner：Executor、Tag 与并发”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“GitLab Runner：Executor、Tag 与并发”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“GitLab Runner：Executor、Tag 与并发”：执行部署或验收链路，并主动制造一次健康检查、网络或依赖失败。
4. 为“GitLab Runner：Executor、Tag 与并发”保存：命令退出码、事件、日志、指标、Trace、页面断言和制品摘要。
5. 使用“GitLab Runner：Executor、Tag 与并发”预登记条件判断：成功路径达标，失败被及时阻断，恢复与回滚结果经过复测。
6. 如果“GitLab Runner：Executor、Tag 与并发”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 八、用一张矩阵验证 GitLab Runner：Executor、Tag 与并发 的关键结论

矩阵按正文顺序列出“GitLab Runner：Executor、Tag 与并发”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| Runner、Executor 与执行隔离 | Docker 提供容器边界， | 只改变与“Runner、Executor 与执行隔离”相关的条件 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |
| Tag、Protected 与信任域 | Job tags 必须被 Runner 标签集合覆盖， | 只改变与“Tag、Protected 与信任域”相关的条件 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |
| 并发、缓存与自动扩缩 | 监控 queued_duration 与失败原因。 | 只改变与“并发、缓存与自动扩缩”相关的条件 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |
| 受保护的 Kubernetes Runner Job | 发布 Job 只匹配生产 Kubernetes Runner。 | 只改变与“受保护的 Kubernetes Runner Job”相关的条件 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |
| 故障边界与验证 | 验收时至少覆盖正常、边界和失败三条路径。 | 只改变与“故障边界与验证”相关的条件 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |
| Runner 从 GitLab 获取 Job | Runner 从 GitLab 获取 Job， | 只改变与“Runner 从 GitLab 获取 Job”相关的条件 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 |

## 8.1 记录本次实际实验

下面的记录用于“GitLab Runner：Executor、Tag 与并发”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "GitLab Runner：Executor、Tag 与并发"
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

成功路径只能证明“GitLab Runner：Executor、Tag 与并发”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 命令退出码、事件、日志、指标、Trace、页面断言和制品摘要 | 成功路径达标，失败被及时阻断，恢复与回滚结果经过复测 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：停止扩量，按制品、配置、运行时和依赖顺序定位并恢复 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“GitLab Runner：Executor、Tag 与并发”，第一步是：停止扩量，按制品、配置、运行时和依赖顺序定位并恢复。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“GitLab Runner：Executor、Tag 与并发”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 九、GitLab Runner：Executor、Tag 与并发 的结果解释

解释“GitLab Runner：Executor、Tag 与并发”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用 | 先执行：停止扩量，按制品、配置、运行时和依赖顺序定位并恢复 |
| 异常链路无法恢复 | 环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用 | 先执行：停止扩量，按制品、配置、运行时和依赖顺序定位并恢复 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“GitLab Runner：Executor、Tag 与并发”只有同时满足“成功路径达标，失败被及时阻断，恢复与回滚结果经过复测”，并且没有出现“环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“GitLab Runner：Executor、Tag 与并发”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“GitLab Runner：Executor、Tag 与并发”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 十、GitLab Runner：Executor、Tag 与并发 的发布判断

发布判断需要把“GitLab Runner：Executor、Tag 与并发”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “GitLab Runner：Executor、Tag 与并发”的基线与候选只存在一个计划内变量。
- [ ] “GitLab Runner：Executor、Tag 与并发”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “GitLab Runner：Executor、Tag 与并发”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “GitLab Runner：Executor、Tag 与并发”的原始输出、中间状态和失败现场已经保留。
- [ ] “GitLab Runner：Executor、Tag 与并发”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “GitLab Runner：Executor、Tag 与并发”的停止条件、负责人和回滚入口已经演练。
- [ ] “GitLab Runner：Executor、Tag 与并发”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“GitLab Runner：Executor、Tag 与并发”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 十一、总结

- **Runner、Executor 与执行隔离**：Docker 提供容器边界，Kubernetes 为 Job 创建 Pod，适合弹性但需要处理镜像拉取和集群配额。
- **Tag、Protected 与信任域**：Job tags 必须被 Runner 标签集合覆盖，无标签 Job 只会进入允许 untagged 的 Runner。
- **并发、缓存与自动扩缩**：缓存存储按项目和保护级别隔离，临时 Runner Job 后销毁，监控 queued_duration 与失败原因。
- **受保护的 Kubernetes Runner Job**：发布 Job 只匹配生产 Kubernetes Runner。

## 参考资料

- [GitLab Runner Executors](https://docs.gitlab.com/runner/executors/)
- [GitLab Runners](https://docs.gitlab.com/ci/runners/)
- [Runner Configuration](https://docs.gitlab.com/runner/configuration/advanced-configuration.html)
