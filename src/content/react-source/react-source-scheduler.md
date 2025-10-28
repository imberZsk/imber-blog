# React 源码（8）- Scheduler 调度阶段

## 两个队列，两个最小堆

`unstable_scheduleCallback` 是调度的逻辑，里面有两个队列

- taskQueue (任务队列): 存放待执行的任务。这些任务要么是立即执行的，要么是已经到期的延迟任务。这是一个最小堆（Min-Heap），根据任务的 expirationTime（过期时间）进行排序。堆顶始终是最早过期（即最高优先级）的任务。

- timerQueue (定时器队列): 存放未到期的延迟任务。这也是一个最小堆（Min-Heap），但它是根据任务的 startTime（计划开始时间）进行排序。堆顶是即将到期的任务。

## 优雅降级请求浏览器每一帧空闲时间

/packages/scheduler/src/forks/Scheduler.js

如下图，调度流程的逻辑 `unstable_scheduleCallback` -> `requestHostCallback(callback)`，这里 setImmediate/MessageChannel/setTimeout

![](/posts/react-source/scheduler.png)

## workLoop

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

    // 获取任务的回调函数
    const callback = currentTask.callback

    // 执行任务回调，传入是否超时的信息
    // 回调可能返回一个函数（continuationCallback）用于分片执行
    const continuationCallback = callback(didUserCallbackTimeout)
  }
}
```
