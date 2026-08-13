# React 源码（10） - Reconciler 协调阶段

> 读完后，你应能解释“一、核心流程”，复现“二、工作循环”的最小实现，并用“三、协调阶段的完成”检查结果与失败边界。

`packages/react-reconciler/src/ReactFiberWorkLoop.old.js`

# 一、核心流程

![](/posts/react-source/workloop-concurrent.png)

先是在 `reconciler` 里 `updateContainer`，然后调用 `scheduleCallback` 走到 `scheduler`，它传入的参数 `performConcurrentWorkOnRoot.bind(null, root)` 很重要，又回到 `reconciler`

- 其中 `renderRootConcurrent` 有个函数 `prepareFreshStack` 是初始化 `workInProgress` 树的
- `!shouldYield()` 来自 `scheduler` 里的 `shouldYieldToHost`，里面的比如 timeElapsed < frameInterval，是当前执行时间和默认的 5ms 对比，在5ms内则不让给宿主（浏览器一帧是 16.6ms，5ms 用来做 react 任务）

# 二、工作循环

当调度器（Scheduler）确定当前更新任务具有足够的优先级并且浏览器有可用的时间片时，协调阶段就正式启动它的核心工作循环（`workLoop`）。这个过程就像是在一个巨大的城市地图（Fiber 树）上寻路和规划。

`workLoopConcurrent` 就是最关键的打断，判断是否还有剩余时间，是否还有执行任务

```js
// React 19 工作循环的简化版本
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(unitOfWork) {
  const next = beginWork(unitOfWork)
  if (next === null) {
    completeUnitOfWork(unitOfWork)
  } else {
    workInProgress = next
  }
}
```

### "向下看" (Begin Phase - beginWork 函数):

- 将虚拟 dom 变成 fiber， 从上往下创建 fiber
- 协调算法（Reconciliation）： React 会比较当前 Fiber 节点与对应的旧 Fiber 节点，检查 props、state、context 等是否发生变化。
  子节点协调： 根据比较结果，决定子 Fiber 节点的处理策略：复用（bailout）、更新、创建或删除。
- 副作用标记： 如果检测到需要 DOM 操作，会在 Fiber 节点的 flags 字段上标记相应的副作用（如 Placement、Update、Deletion）。
- 性能优化： 通过 React.memo、useMemo、shouldComponentUpdate 等机制实现 bailout 优化，跳过不必要的子树协调。

```js
// beginWork 的简化逻辑
function beginWork(current, workInProgress, renderLanes) {
  // 检查是否可以复用当前节点，下面的两句代码是在具体函数里面，为了简洁这样写
  if (current !== null && !didReceiveUpdate) {
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
  }

  // 根据组件类型进行不同的处理
  switch (workInProgress.tag) {
    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress, renderLanes)
    case ClassComponent:
      return updateClassComponent(current, workInProgress, renderLanes)
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderLanes)
    // ... 其他组件类型
  }
}
```

updateXXX 也就是更新用的，mountXXX是挂载用的函数，重点关注 `updateFunctionComponent` 函数的更新

### "向上走" (Complete Phase - completeWork 函数):

- 将 fiber 变成真实 dom 节点 从下往上
- 当一个 Fiber 节点的所有子节点都处理完毕后，或者该节点本身没有子节点，React 开始执行 completeWork。
- DOM 实例创建： 对于 Host 组件（如 <div>、<span>），如果是新创建的节点，会在此阶段创建对应的 DOM 实例。
- 属性处理： 处理和收集需要更新的 DOM 属性，为后续的 Commit 阶段做准备。
- 副作用收集： 将当前节点及其子树的副作用标记向上冒泡，构建副作用链表。
- Effect List 构建： 在 React 18 之前，会构建 Effect List；React 18+ 使用不同的副作用收集机制。

```js
// completeWork 的简化逻辑
// function completeWork(current, workInProgress, renderLanes) {
// unitOfWork 就是 WIP 树
function completeWork(unitOfWork) {
  switch (workInProgress.tag) {
    case HostComponent: {
      const type = workInProgress.type
      if (current !== null && workInProgress.stateNode != null) {
        // 更新现有的 DOM 节点
        updateHostComponent(current, workInProgress, type)
      } else {
        // 创建新的 DOM 节点
        const instance = createInstance(type, workInProgress.pendingProps)
        appendAllChildren(instance, workInProgress)
        workInProgress.stateNode = instance
      }
      break
    }
    case FunctionComponent:
    case ClassComponent:
      // 函数组件和类组件通常不需要特殊处理
      break
  }
  return null
}
```

这个"向下看"再"向上走"的过程会持续进行，直到整个地图（Fiber 树）都规划完毕。

# 三、协调阶段的完成

当工作循环处理完 Root Fiber 的 completeWork 后，整个协调阶段（Render Phase）就结束了。此时，React 已经：

1. 构建了一个新的 Fiber 树 (work-in-progress tree)，这个树代表了下一次要渲染的 UI 状态。
2. 计算出了所有必要的 DOM 变更、生命周期调用等，并以副作用标记 (flags) 的形式记录在各个 Fiber 节点上。
3. 生成了一个副作用列表 (effect list)，按顺序排列了所有需要执行副作用的 Fiber 节点。

接下来，React 会进入 `Commit` 阶段，根据副作用列表来实际执行这些变更。

关于 Diff，也就是 `beginWork` -> `updateFunctionComponent(updateHostComponent)` -> `reconcileSingleElement/reconcileChildrenArray`，在后面单独讲。

关于 Hook，也就是 `beginWork` -> `updateFunctionComponent` -> `renderWithHooks` 中的逻辑，在后面单独讲。

# 四、总结

- **核心流程**：先是在 reconciler 里 updateContainer，然后调用 scheduleCallback 走到 scheduler，它传入的参数 performConcurrentWorkOnRoot.bind(null, root) 很重要，又回到 reconciler
- **工作循环**：当调度器（Scheduler）确定当前更新任务具有足够的优先级并且浏览器有可用的时间片时，协调阶段就正式启动它的核心工作循环（workLoop）。
- **协调阶段的完成**：当工作循环处理完 Root Fiber 的 completeWork 后，整个协调阶段（Render Phase）就结束了。

## 参考资料

- [React 文档](https://react.dev/learn)
- [React 源码](https://github.com/facebook/react)
