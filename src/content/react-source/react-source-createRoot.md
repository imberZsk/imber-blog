# React 源码（2）- 入口和初始化流程

## ReactDOM.createRoot 做了什么事情？

React 渲染一个组件只有两步代码，也就是：

```js
import React from 'react'
import ReactDOM from 'react-dom/client'

// 客户端初始化阶段
const root = ReactDOM.createRoot(document.getElementById('root'))

// 渲染组件
// AppJsx 组件也就是上面分析过的一个函数，里面有 jsx 方法，这个函数的执行返回结果是 ReactElement 对象
root.render(<AppJsx />)
```

那第一个疑惑肯定是，第一步 ReactDOM.createRoot 做了什么事情？，它肯定是初始化了一些东西，然后返回了一个 root 对象，上面有个 render 方法

这里能想到大概的核心逻辑，应该是创建一颗 fiber 树(FiberRoot)，root 作为 fiber 树返回

![createRoot](/posts/react-source/createRoot.png)

可以看到最终 new 了个构造函数，也就是生成了一个 ReactDOMRoot, 返回一个实例对象，实例对象身上有个`\_internalRoot` 属性，这个属性是 createContainer 的返回，所以核心内容在 `createContainer` 方法里，并且只有第一个参数 container 有意义，所以后续都需要关注这个参数，传下去的时候后面叫 `containerInfo`

另外还需要注意里面还有两个方法 markContainerAsRoot 和 listenToAllSupportedEvents，markContainerAsRoot 是给根 fiber 一个标记，方便每次找到根 fiber，listenToAllSupportedEvents 函数的作用是在根容器元素上监听所有React支持的原生事件（事件机制）

![createFiberRoot](/posts/react-source/createFiberRoot.png)

从 createRoot 到了 createFiberRoot 方法，终于到了 fiber 的创建，这个逻辑从 react-dom 包走到 react-scheduler 包里；最终返回了一个 `root`，这个 root 是 FiberRootNode 创建的实例对象，并且这个 root 上有个 `current` 属性，它的值是 createHostRootFiber 函数执行的返回，所以接下来关心的逻辑是 `FiberRootNode` 构造函数和 `createHostRootFiber` 方法，另外还有 `initializeUpdateQueue` 方法初始化更新队列

先看 FiberRootNode，一个带了很多属性的对象，因为目前没有用到，暂时不管它

```js
function FiberRootNode(containerInfo, tag, hydrate, identifierPrefix, onRecoverableError) {
  this.tag = tag
  this.containerInfo = containerInfo
  this.pendingChildren = null
  this.current = null
  this.pingCache = null
  this.finishedWork = null
  this.timeoutHandle = noTimeout
  this.context = null
  this.pendingContext = null
  this.callbackNode = null
  this.callbackPriority = NoLane
  this.eventTimes = createLaneMap(NoLanes)
  this.expirationTimes = createLaneMap(NoTimestamp)

  this.pendingLanes = NoLanes
  this.suspendedLanes = NoLanes
  this.pingedLanes = NoLanes
  this.expiredLanes = NoLanes
  this.mutableReadLanes = NoLanes
  this.finishedLanes = NoLanes

  this.entangledLanes = NoLanes
  this.entanglements = createLaneMap(NoLanes)

  this.hiddenUpdates = createLaneMap(null)

  this.identifierPrefix = identifierPrefix
  this.onRecoverableError = onRecoverableError

  if (enableCache) {
    this.pooledCache = null
    this.pooledCacheLanes = NoLanes
  }

  this.incompleteTransitions = new Map()
}
```

FiberRootNode 构造函数的可以直接打印出来

```js
js const root = ReactDOM.createRoot(document.getElementById('root'))

console.log('root', root)
```

这几个属性，是常见的，容器，current 正在处理的树指向 alternate 树，render 方法

![image-20250908223153135](/posts/react-source/image-20250908223153135.png)

接下来是 createHostRootFiber 方法，可以看到最终返回了一个 FiberNode 构造函数生成的实例对象，当前的这个 fiber 是 uninitializedFiber ，并且 FiberRootNode.current = uninitializedFiber（current 就是当前的 fiber 树），uninitializedFiber.stateNode = FiberRootNode; 到这里，生成的实例等东西都结束了。

![image-20250908224921565](/posts/react-source/image-20250908224921565.png)

最后是 initializeUpdateQueue 方法，总的来说前面都是生成对象，这个方法在 uninitializedFiber 里挂载了一个初始化的 updateQueue

```js
export function initializeUpdateQueue<State>(fiber: Fiber): void {
  const queue: UpdateQueue<State> = {
    baseState: fiber.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: {
      pending: null,
      lanes: NoLanes,
      hiddenCallbacks: null,
    },
    callbacks: null,
  };
  fiber.updateQueue = queue;
}
```

## 总结

ReactDom.createRoot 初始化 FiberRootNode 根节点，current 当前正在处理的 fiber 树，updateQueue 更新队列，事件机制

```js
function createRoot(container, options) {
  // 1. 验证容器是否有效
  if (!isValidContainer(container)) {
    throw new Error('Target container is not a DOM element.')
  }

  // 2. 初始化选项 (options)
  // 3. 创建 FiberRootNode (核心)
  const root = createContainer(
    container, // DOM 容器节点
    ConcurrentRoot, // 根节点类型 (并发模式)
    null, // hydrationCallbacks (非 hydrate 模式)
    isStrictMode, // 是否严格模式
    transitionCallbacks // 过渡回调
  )
  // 4. 标记 DOM 容器，建立与 FiberRoot 的关联
  markContainerAsRoot(root.current, container)
  // 5. 在容器上监听所有支持的事件
  listenToAllSupportedEvents(container)
  // 6. 返回一个 ReactDOMRoot 实例
  return new ReactDOMRoot(root)
}
```
