---
typora-root-url: ../../public
---

## React 源码学习

带着问题学习 React 源码，下面是一些参考资料

- 一些概念的问题，可以看卡颂大佬的 [React 技术揭秘](https://react.iamkasong.com/) ，永不过时
- 最精简的搞懂 React 核心逻辑，可以跟着国外一个大佬的博客写一遍， [Build Your Own React](https://pomb.us/build-your-own-react/)
- 细看 React 源码的时候，可以比对下某位大佬的 [源码流程图](https://www.processon.com/view/link/63bcef8cf27176074bb81a21)

## 1.JSX（函数组件） 会被编译成什么？

在从 `ReactDOM.createRoot(document.getElementById('root'))` 之前，需要先了解 JSX，JSX 也就是 JS 的扩展，它可以通过 babel 编译成 JS ，这个结果可以在 [babel](https://www.babeljs.cn/repl#?browsers=defaults%2C%20not%20ie%2011%2C%20not%20ie_mob%2011&build=&builtIns=false&corejs=false&spec=false&loose=false&code_lz=GYVwdgxgLglg9mABAQQA6oBQEpEG8BQiiATgKZQjFIaFGIA8AJjAG6IQA2AhgM48ByXALakAvACI0qcQD5adBgAtSXRqWLtufQSIlSAtMtXrZANnP0A9EbXE5Cq8xb3EWfAF98-UgA9UcYihENWAuEA4gqXwgA&debug=false&forceAllTransforms=false&modules=false&shippedProposals=false&evaluate=false&fileSize=true&timeTravel=false&sourceType=module&lineWrap=true&presets=env%2Creact%2Cstage-2&prettier=true&targets=&version=7.28.4&externalPlugins=&assumptions=%7B%7D) 在线工具看

函数组件

```js
function App() {
  return (
    <div className="App">
      <header className="App-header">666</header>
    </div>
  )
}

export default App
```

babel classic 编译的代码

```js
function App() {
  return /*#__PURE__*/ React.createElement(
    'div',
    {
      className: 'App'
    },
    /*#__PURE__*/ React.createElement(
      'header',
      {
        className: 'App-header'
      },
      '666'
    )
  )
}
export default App
```

babel automatic 编译的代码

```js
import { jsx as _jsx } from 'react/jsx-runtime'
function App() {
  return /*#__PURE__*/ _jsx('div', {
    className: 'App',
    children: /*#__PURE__*/ _jsx('header', {
      className: 'App-header',
      children: '666'
    })
  })
}
export default App
```

从这个编译结果，还能清楚另一个问题：为什么 React17 为什么不需要引入 React ？



小结：classic 编译的代码里，没有手动引入 React，却使用了 React.createElement 方法，而 automatic 编译的代码里，自动引入了 react/jsx-runtime

## 2.createElement 和 jsx 方法有什么区别吗？

它们的入参结构是不同的，createElement的入参是 (type, config, children)，jsx 的入参是 (type, config, maybeKey)，那它们有没有本质的区别呢？



![jsx](/posts/react-source/jsx.png)



小结：返回结果都是一样的，都是返回 ReactElement 对象，但是 jsx 的 props 参数 对应了 ReactElement 对象的 props 参数，而 createElement 会多做一些遍历生成 Props 参数，所以 jsx 方法性能会更好（这里也算一种看了源码之后，知道的性能优化）

## 3.ReactDOM.createRoot 做了什么事情？

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

相信基本都了解 fiber 架构，这里先猜一下核心逻辑，应该是创建一颗 fiber 树，root 作为 fiber 树返回



![createRoot](/posts/react-source/createRoot.png)



可以看到最终 new 了个构造函数，也就是生成了一个 ReactDOMRoot, 返回一个实例对象，实例对象身上有个`\_internalRoot` 属性，这个属性是 createContainer 的返回，所以核心内容在 `createContainer` 方法里，并且只有第一个参数 container 有意义，所以后续都需要关注这个参数，传下去的时候后面叫 `containerInfo`



另外还需要注意里面还有两个方法 markContainerAsRoot 和 listenToAllSupportedEvents，markContainerAsRoot 是给根 fiber 一个标记，方便每次找到根 fiber，listenToAllSupportedEvents 函数的作用是在根容器元素上监听所有React支持的原生事件（事件机制）



![createFiberRoot](/posts/react-source/createFiberRoot.png)



从 createRoot 到了 createFiberRoot 方法，终于到了 fiber 的创建，这个逻辑从 react-dom 包走到 react-scheduler 包里；最终返回了一个 `root`，这个 root 是 FiberRootNode 创建的实例对象，并且这个 root 上有个 `current` 属性，它的值是 createHostRootFiber 函数执行的返回，所以接下来关心的逻辑是 `FiberRootNode` 构造函数和 `createHostRootFiber` 方法，另外还有 `initializeUpdateQueue` 方法初始化更新队列



先看 FiberRootNode，一个带了很多属性的对象

```js
function FiberRootNode(
  containerInfo,
  tag,
  hydrate,
  identifierPrefix,
  onRecoverableError,
) {
  this.tag = tag;
  this.containerInfo = containerInfo;
  this.pendingChildren = null;
  this.current = null;
  this.pingCache = null;
  this.finishedWork = null;
  this.timeoutHandle = noTimeout;
  this.context = null;
  this.pendingContext = null;
  this.callbackNode = null;
  this.callbackPriority = NoLane;
  this.eventTimes = createLaneMap(NoLanes);
  this.expirationTimes = createLaneMap(NoTimestamp);

  this.pendingLanes = NoLanes;
  this.suspendedLanes = NoLanes;
  this.pingedLanes = NoLanes;
  this.expiredLanes = NoLanes;
  this.mutableReadLanes = NoLanes;
  this.finishedLanes = NoLanes;

  this.entangledLanes = NoLanes;
  this.entanglements = createLaneMap(NoLanes);

  this.hiddenUpdates = createLaneMap(null);

  this.identifierPrefix = identifierPrefix;
  this.onRecoverableError = onRecoverableError;

  if (enableCache) {
    this.pooledCache = null;
    this.pooledCacheLanes = NoLanes;
  }

  this.incompleteTransitions = new Map();
}
```



FiberRootNode 构造函数的可以直接打印出来

```js
js const root = ReactDOM.createRoot(document.getElementById('root')) 

console.log('root', root)
```

先关注几个属性，后续会用到



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



小结：ReactDom.createRoot 初始化 FiberRootNode 根节点，current 当前正在处理的 fiber 树，updateQueue 更新队列，事件机制

## 4.React事件机制是怎么样的？

上面的 creatRoot 里有一个 listenToAllSupportedEvents 函数，它跟事件机制有关。



都知道 React 是通过冒泡来自定义事件机制，那最终绑定在哪儿呢？有些事件没有事件冒泡，那React 怎么知道触发事件了呢？

```js

```





## 5.fiber 是什么？

```js
function FiberNode(
  tag: WorkTag,
  pendingProps: mixed,
  key: null | string,
  mode: TypeOfMode,
) {
  // 实例
  this.tag = tag;
  this.key = key;
  this.elementType = null;
  this.type = null;
  this.stateNode = null;

  // Fiber
  this.return = null;
  this.child = null;
  this.sibling = null;
  this.index = 0;

  this.ref = null;

  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.updateQueue = null;
  this.memoizedState = null;
  this.dependencies = null;

  this.mode = mode;

  // 副作用
  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.deletions = null;

  this.lanes = NoLanes;
  this.childLanes = NoLanes;

  this.alternate = null;
}

```



FiberRootNode 和 fiber 有什么区别？

fiber 是树还是单链表？
