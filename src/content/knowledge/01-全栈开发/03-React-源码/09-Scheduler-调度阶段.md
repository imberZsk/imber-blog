# React 源码（8）- Scheduler 调度阶段

> 读完你能：围绕“Scheduler 调度阶段”理解“两个队列，两个最小堆”与“优雅降级请求浏览器每一帧空闲时间”，并结合正文示例完成实践与排障。

`/packages/scheduler/src/forks/Scheduler.js`

# 一、两个队列，两个最小堆

`unstable_scheduleCallback` 是调度的逻辑，里面有两个队列

- taskQueue (任务队列): 存放待执行的任务。这些任务要么是立即执行的，要么是已经到期的延迟任务。这是一个最小堆（Min-Heap），根据任务的 expirationTime（过期时间）进行排序。堆顶始终是最早过期（即最高优先级）的任务。

- timerQueue (定时器队列): 存放未到期的延迟任务。这也是一个最小堆（Min-Heap），但它是根据任务的 startTime（计划开始时间）进行排序。堆顶是即将到期的任务。

# 二、优雅降级请求浏览器每一帧空闲时间

/packages/scheduler/src/forks/Scheduler.js

如下图，调度流程的逻辑 `unstable_scheduleCallback` -> `requestHostCallback(callback)`，这里 setImmediate/MessageChannel/setTimeout

![](/posts/react-source/scheduler.png)

# 三、workLoop

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

# 四、核心流程

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

# 五、总结

- **核心流程**：只关注异步流程，因为异步可打断更新逻辑更复杂核心
- **两个队列，两个最小堆**：unstablescheduleCallback 是调度的逻辑，里面有两个队列
- **优雅降级请求浏览器每一帧空闲时间**：/packages/scheduler/src/forks/Scheduler.js
- **workLoop**：这是 scheduler 核心逻辑，从 flushWork->workLoop

## 参考资料

- [React 文档](https://react.dev/learn)
- [React 源码](https://github.com/facebook/react)
