# React 源码（08） - Scheduler 调度阶段

> 读完后，你应能完成以下任务：
> - 绘制“React 源码（08） - Scheduler 调度阶段 / 两个队列，两个最小堆”的关键对象与数据流，解释“unstable_scheduleCallback 是调度的逻辑，里面有两个队列”，并用源码位置、日志或 Trace 标注证据。
> - 为“React 源码（08） - Scheduler 调度阶段 / 优雅降级请求浏览器每一帧空闲时间”设计正常与异常输入，验证“/packages/scheduler/src/forks/Scheduler.js”，输出首个偏差位置与回归测试结果。
> - 实现“React 源码（08） - Scheduler 调度阶段 / workLoop”的最小代码或配置，检验“这是 scheduler 核心逻辑，从 flushWork->workLoop”，输出命令、结果与 Diff，并说明不适用边界。

`/packages/scheduler/src/forks/Scheduler.js`

<!-- article-progressive-block:start -->
# 一、先建立全局：Scheduler 调度阶段 是什么？

理解“Scheduler 调度阶段”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“Scheduler 调度阶段”的第一个核心判断是：unstable_scheduleCallback 是调度的逻辑，里面有两个队列。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | 两个队列，两个最小堆 | unstable_scheduleCallback 是调度的逻辑，里面有两个队列 |
| 2 | 优雅降级请求浏览器每一帧空闲时间 | /packages/scheduler/src/forks/Scheduler.js |
| 3 | workLoop | 这是 scheduler 核心逻辑，从 flushWork->workLoop |
| 4 | 核心流程 | 只关注异步流程，因为异步可打断更新逻辑更复杂核心 |
| 5 | taskQueue (任务队列) | taskQueue (任务队列): 存放待执行的任务。 |
| 6 | 这些任务要么是立即执行的 | 这些任务要么是立即执行的，要么是已经到期的延迟任务。 |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["两个队列，两个最小堆"] --> S2
  S2["优雅降级请求浏览器每一帧空闲时间"] --> S3
  S3["workLoop"] --> S4
  S4["核心流程"] --> S5
  S5["taskQueue (任务队列)"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“Scheduler 调度阶段”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“Scheduler 调度阶段”的对象和顺序已经明确后，再看可观察的失败：入口未命中、Lane 不符、更新丢失、重复提交或 DOM 结果不一致。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、两个队列，两个最小堆

`unstable_scheduleCallback` 是调度的逻辑，里面有两个队列

- taskQueue (任务队列): 存放待执行的任务。这些任务要么是立即执行的，要么是已经到期的延迟任务。这是一个最小堆（Min-Heap），根据任务的 expirationTime（过期时间）进行排序。堆顶始终是最早过期（即最高优先级）的任务。

- timerQueue (定时器队列): 存放未到期的延迟任务。这也是一个最小堆（Min-Heap），但它是根据任务的 startTime（计划开始时间）进行排序。堆顶是即将到期的任务。

# 三、优雅降级请求浏览器每一帧空闲时间

/packages/scheduler/src/forks/Scheduler.js

如下图，
调度流程的逻辑 `unstable_scheduleCallback` -> `requestHostCallback(callback)`，
这里 setImmediate/MessageChannel/setTimeout

![](/posts/react-source/scheduler.png)

# 四、workLoop

这是 scheduler 核心逻辑，从 flushWork->workLoop

![](/posts/react-source/workLoop.png)

核心逻辑如下

```js
function workLoop() {
  // 从任务队列（最小堆）顶部获取优先级最高的任务
  currentTask = peek(taskQueue)

  // 主循环：持续执行任务直到满足退出条件
  while (
    currentTask !== null && // 还有任务需要执行
    !(enableSchedulerDebugging && isSchedulerPaused) // 调度器未被调试暂停
  ) {
    // 检查是否应该让出控制权
    if (
      currentTask.expirationTime > currentTime && // 任务还未过期
      (!hasTimeRemaining || shouldYieldToHost()) // 且（没有剩余时间 或 应该让出给宿主）
    ) {
      // 任务未过期但需要让出：中断循环，等待下一个时间切片
      break
    }

    // 获取任务的回调函数，callback 是 performConcurrentWorkOnRoot.bind(null, root) -> performUnitOfWork
    const callback = currentTask.callback

    // 执行任务回调，传入是否超时的信息
    // 回调可能返回一个函数（continuationCallback）用于分片执行
    const continuationCallback = callback(didUserCallbackTimeout)
  }
}
```

# 五、核心流程

只关注异步流程，因为异步可打断更新逻辑更复杂核心

1. 先在 reconciler 里 updateContainer 函数一值执行，然后在 `packages/react-reconciler/src/ReactFiberWorkLoop.old.js` 中执行 `scheduleUpdateOnFiber` 是调度的入口标记 Root 的`pendingLanes`，然后 `ensureRootIsScheduled`判断同步还是并发和确保根节点调度 执行 `scheduleCallback`，`scheduleCallback(schedulerPriorityLevel,performConcurrentWorkOnRoot.bind(null, root));` 才是真正在 Scheduler 包中

2. packages/scheduler/src/forks/Scheduler.js Scheduler 包中的名字叫 `unstable_scheduleCallback`，它里面主要有两个队列 `taskQueue` 和 `timerQueue` 用来放立即执行任务和未到期任务都是最小堆，立即执行任务走 `requestHostCallback(flushWork)`，然后 `MessageChannel` 调度一帧来执行

3. `requestHostCallback` 的参数 `flushWork` 会走到 `workLoop`，他会判断是否停止任务让给宿主，核心逻辑如下

```js
function workLoop(hasTimeRemaining, initialTime) {
  while (
    currentTask !== null // 还有任务需要执行
  ) {
    if (
      currentTask.expirationTime > currentTime && // 任务还未过期
      (!hasTimeRemaining || shouldYieldToHost()) // 且（没有剩余时间 或 应该让出给宿主）
    ) {
      break
    }

    // 执行任务
    const continuationCallback = callback(didUserCallbackTimeout)
  }
}
```

<!-- article-progressive-block:start -->
# 六、动手验证：先跑通 Scheduler 调度阶段，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“Scheduler 调度阶段”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 6.1 基线与候选只允许一个变量不同

验证“Scheduler 调度阶段”时，先固定React 版本、组件输入、更新触发方式和浏览器事件。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“Scheduler 调度阶段”时，动作是：在对应源码入口设置断点，记录 Fiber、Lane、UpdateQueue 与提交阶段变化。原始结果不能只保留截图或汇总分数，必须同步保存：调用栈、Fiber 字段快照、Scheduler 任务、DOM 断言和源码行号，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | 固定 React 版本、组件输入、更新触发方式和浏览器事件 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 调用栈、Fiber 字段快照、Scheduler 任务、DOM 断言和源码行号 |
| 通过阈值 | 调用顺序与正文一致，状态变化能对应到最终 DOM 或副作用 |
| 立即停止 | 入口未命中、Lane 不符、更新丢失、重复提交或 DOM 结果不一致 |

## 6.2 执行前先排除不可比较条件

“Scheduler 调度阶段”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“Scheduler 调度阶段”的当前环境重复运行。
- 候选只改变一个与“Scheduler 调度阶段”结论直接相关的条件。
- “Scheduler 调度阶段”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “Scheduler 调度阶段”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 6.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“Scheduler 调度阶段”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | 固定 React 版本、组件输入、更新触发方式和浏览器事件 |
| 过程可回放 | 在对应源码入口设置断点，记录 Fiber、Lane、UpdateQueue 与提交阶段变化 |
| 结果可审计 | 调用栈、Fiber 字段快照、Scheduler 任务、DOM 断言和源码行号 |

“Scheduler 调度阶段”的一次合格基线对照按以下顺序执行：

1. 保存“Scheduler 调度阶段”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“Scheduler 调度阶段”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“Scheduler 调度阶段”：在对应源码入口设置断点，记录 Fiber、Lane、UpdateQueue 与提交阶段变化。
4. 为“Scheduler 调度阶段”保存：调用栈、Fiber 字段快照、Scheduler 任务、DOM 断言和源码行号。
5. 使用“Scheduler 调度阶段”预登记条件判断：调用顺序与正文一致，状态变化能对应到最终 DOM 或副作用。
6. 如果“Scheduler 调度阶段”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 七、用一张矩阵验证 Scheduler 调度阶段 的关键结论

矩阵按正文顺序列出“Scheduler 调度阶段”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| 两个队列，两个最小堆 | unstable_scheduleCallback 是调度的逻辑，里面有两个队列 | 只改变与“两个队列，两个最小堆”相关的条件 | 调用栈、Fiber 字段快照、Scheduler 任务、DOM 断言和源码行号 |
| 优雅降级请求浏览器每一帧空闲时间 | /packages/scheduler/src/forks/Scheduler.js | 只改变与“优雅降级请求浏览器每一帧空闲时间”相关的条件 | 调用栈、Fiber 字段快照、Scheduler 任务、DOM 断言和源码行号 |
| workLoop | 这是 scheduler 核心逻辑，从 flushWork->workLoop | 只改变与“workLoop”相关的条件 | 调用栈、Fiber 字段快照、Scheduler 任务、DOM 断言和源码行号 |
| 核心流程 | 只关注异步流程，因为异步可打断更新逻辑更复杂核心 | 只改变与“核心流程”相关的条件 | 调用栈、Fiber 字段快照、Scheduler 任务、DOM 断言和源码行号 |
| taskQueue (任务队列) | taskQueue (任务队列): 存放待执行的任务。 | 只改变与“taskQueue (任务队列)”相关的条件 | 调用栈、Fiber 字段快照、Scheduler 任务、DOM 断言和源码行号 |
| 这些任务要么是立即执行的 | 这些任务要么是立即执行的，要么是已经到期的延迟任务。 | 只改变与“这些任务要么是立即执行的”相关的条件 | 调用栈、Fiber 字段快照、Scheduler 任务、DOM 断言和源码行号 |

## 7.1 记录本次实际实验

下面的记录用于“Scheduler 调度阶段”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "Scheduler 调度阶段"
selected_chapter: required
claim_from_article: required
baseline_version: required
changed_condition: exactly_one
execution: "在对应源码入口设置断点，记录 Fiber、Lane、UpdateQueue 与提交阶段变化"
evidence: "调用栈、Fiber 字段快照、Scheduler 任务、DOM 断言和源码行号"
pass_when: "调用顺序与正文一致，状态变化能对应到最终 DOM 或副作用"
stop_when: "入口未命中、Lane 不符、更新丢失、重复提交或 DOM 结果不一致"
observed_result: required
first_deviation: null_or_evidence
recovery_replay: required_after_failure
```

## 7.2 边界实验必须证明能够停止和恢复

成功路径只能证明“Scheduler 调度阶段”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：入口未命中、Lane 不符、更新丢失、重复提交或 DOM 结果不一致，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 调用栈、Fiber 字段快照、Scheduler 任务、DOM 断言和源码行号 | 调用顺序与正文一致，状态变化能对应到最终 DOM 或副作用 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：入口未命中、Lane 不符、更新丢失、重复提交或 DOM 结果不一致 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：从首个错误状态回查 Update 入队、调度、协调和提交边界 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“Scheduler 调度阶段”，第一步是：从首个错误状态回查 Update 入队、调度、协调和提交边界。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“Scheduler 调度阶段”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 八、Scheduler 调度阶段 的结果解释

解释“Scheduler 调度阶段”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 入口未命中、Lane 不符、更新丢失、重复提交或 DOM 结果不一致 | 先执行：从首个错误状态回查 Update 入队、调度、协调和提交边界 |
| 异常链路无法恢复 | 入口未命中、Lane 不符、更新丢失、重复提交或 DOM 结果不一致 | 先执行：从首个错误状态回查 Update 入队、调度、协调和提交边界 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“Scheduler 调度阶段”只有同时满足“调用顺序与正文一致，状态变化能对应到最终 DOM 或副作用”，并且没有出现“入口未命中、Lane 不符、更新丢失、重复提交或 DOM 结果不一致”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“Scheduler 调度阶段”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“Scheduler 调度阶段”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 九、Scheduler 调度阶段 的发布判断

发布判断需要把“Scheduler 调度阶段”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “Scheduler 调度阶段”的基线与候选只存在一个计划内变量。
- [ ] “Scheduler 调度阶段”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “Scheduler 调度阶段”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “Scheduler 调度阶段”的原始输出、中间状态和失败现场已经保留。
- [ ] “Scheduler 调度阶段”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “Scheduler 调度阶段”的停止条件、负责人和回滚入口已经演练。
- [ ] “Scheduler 调度阶段”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“Scheduler 调度阶段”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 十、总结

- **两个队列，两个最小堆**：unstable_scheduleCallback 是调度的逻辑，里面有两个队列
- **优雅降级请求浏览器每一帧空闲时间**：/packages/scheduler/src/forks/Scheduler.js
- **workLoop**：这是 scheduler 核心逻辑，从 flushWork->workLoop
- **核心流程**：先在 reconciler 里 updateContainer 函数一值执行，然后在 packages/react-reconciler/src/ReactFiberWorkLoop.old.js 中执行 scheduleUpdateOnFiber 是调度的入口标记 Root 的pendingLanes… -> packages/scheduler/src/forks/Scheduler.js Scheduler 包中的名字叫 unstable_scheduleCallback，它里面主要有两个队列 taskQueue 和 timerQueue 用来放立即执行任务和未到期任务都是最小堆，立即执行任务走 requestHostCallback(flushWork)… -> requestHostCallback 的参数 flushWork 会走到 workLoop，他会判断是否停止任务让给宿主，核心逻辑如下

## 参考资料

- [React 文档](https://react.dev/learn)
- [React 源码](https://github.com/facebook/react)
