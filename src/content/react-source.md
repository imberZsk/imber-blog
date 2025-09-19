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



先看 FiberRootNode，一个带了很多属性的对象，因为目前没有用到，暂时不管它

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



小结：ReactDom.createRoot 初始化 FiberRootNode 根节点，current 当前正在处理的 fiber 树，updateQueue 更新队列，事件机制

## 4.React事件机制是怎么样的？

上面的 creatRoot 里有一个 listenToAllSupportedEvents 函数，说明初始化阶段，初始化了事件机制，接下来探究这部分代码。



都知道 React 是通过冒泡来自定义事件机制，那最终绑定在哪儿呢？有些事件没有事件冒泡，那React 怎么知道触发事件了呢？



先看看原生的事件，原生里的 capture 和 passive，React 也处理了很简单，对于wheel/touchStart/touchmove 默认加上 passive 告诉浏览器先执行默认事件，不会 e.preventDefault，这样不会有 listener 卡顿问题，就不细说了

```js
// 这就是该函数内部大概做的事情
element.addEventListener(eventType, listener, {
  capture: true,   // 捕获阶段
  passive: true,   // 被动模式
  once: false      // 不是一次性
});
```

在这之前，ReactDOMEventListener.js 这个文件顶部有注册事件，也就是之前的 allNativeEvent 的事件其实是这里注册的，也就是收集到所有事件，方便后续遍历，这样处理



![image-20250910001532459](/posts/react-source/image-20250910001532459.png)



如下图，在源码中可以看到，绑定在了 root 上，但是对于 selectionChange 绑定在了 document 上，selectionChange 在编辑器里有比较多的时候，比如监听选中的内容，然后在选中内容上增加一个弹层 tooltip 组件



![image-20250909232137990](/posts/react-source/image-20250909232137990.png)



里面还有用到按位或 | 和按位与 & 和左移位运算符`<<` ,它们通过排列组合比较容易区分是哪种事件，这种方案还可以用在权限管理



```js
// 分配标识
export const IS_CAPTURE_PHASE = 1 << 2; // 0b0100 (4)
export const IS_BUBBLE_PHASE  = 1 << 3; // 0b1000 (8)

// 组合标识
const flags = IS_CAPTURE_PHASE | IS_BUBBLE_PHASE; // 0b1100 (12)

// 检查某个标识
if (flags & IS_CAPTURE_PHASE) {
  console.log("捕获阶段已启用");
}
```



遍历给 root 绑定事件这部分比较简单，也就是点击一个元素然后 root 就能收到事件，重点是 listener，也就是 `createEventListenerWrapperWithPriority` 方法，方法名可以看出它带有优先级，那它为什么需要优先级呢？事件优先级是怎么样的？它是怎么处理收到事件呢？e.currentTarget 是指向触发元素，那 React 中会不会全都成了 root ?



如下图，事件优先级肯定是同时触发的时候，让更高优先级的事情先触发，下面的 getEventPriority 方法可以看到，事件的优先级分为四类有：



- ####  DiscreteEventPriority (离散事件优先级)	

  - 由用户**离散**触发的、不需要频繁执行的事件。这些事件需要立即响应，体验上不能有延迟。
  - **例子：** `click`、`keydown`、`keyup`、`mousedown`、`mouseup`、`focusin`、`focusout` 等。

- #### ContinuousEventPriority (连续事件优先级)

  - **对应事件：** 由用户**连续**触发的、会高频执行的事件。为了防止阻塞渲染，React 会对这些事件进行**节流（throttle）** 处理。
  - **例子：** `drag`、`mousemove`、`mouseover`、`mouseout`、`scroll`、`touchmove`、`wheel` 等。

- #### DefaultEventPriority (默认事件优先级)

  - **对应事件：** 不属于上述两类的其他事件，或者没有明确指定优先级的更新（如 `setTimeout`、`Promise` 回调中的 `setState`）。
  - **例子：** `load`、`animationend` 等。



![image-20250911215151672](/posts/react-source/image-20250911215151672.png)



这些优先级  lane  车道模型对应，如下代码，我看的这里是 .old 文件，也就是在`react/packages/shared/ReactFeatureFlags.js`文件 的字段 `export const enableNewReconciler = false; ` 判断是.old.js 的车道模型，不过不影响，主要是思想

```js
export const DiscreteEventPriority: EventPriority = SyncLane;
export const ContinuousEventPriority: EventPriority = InputContinuousLane;
export const DefaultEventPriority: EventPriority = DefaultLane;
export const IdleEventPriority: EventPriority = IdleLane;

let currentUpdatePriority: EventPriority = NoLane;

export const TotalLanes = 31;

export const NoLanes: Lanes = /*                        */ 0b0000000000000000000000000000000;
export const NoLane: Lane = /*                          */ 0b0000000000000000000000000000000;

export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;

export const InputContinuousHydrationLane: Lane = /*    */ 0b0000000000000000000000000000010;
export const InputContinuousLane: Lane = /*             */ 0b0000000000000000000000000000100;

export const DefaultHydrationLane: Lane = /*            */ 0b0000000000000000000000000001000;
export const DefaultLane: Lane = /*          
// ...
```

了解事件优先级后，具体看里面的事件，也就是 createEventListenerWrapperWithPriority 里的 dispatchDiscreteEvent 、dispatchContinuousEvent 、 dispatchEvent 三个方法，只看一个 dispatchDiscreteEvent 来学习，也就是一个点击事件，其中很多边界和 SSR 水合方面的问题不用理会，关注核心逻辑



![image-20250911232209637](/posts/react-source/image-20250911232209637.png)



上图走到了一个批处理事件 batchedUpdates 和派发事件 dispatchEventsForPlugins，那事件的批处理是什么意思呢？大约是这个意思,：



```js
// 1. 全局状态
let isBatching = false;
let pendingUpdates = [];

// 2. 简化的批处理函数
function batchedUpdates(fn) {
  if (isBatching) {
    // 如果已经在批处理中，直接执行
    return fn();
  }
  
  // 开始批处理
  isBatching = true;
  try {
    return fn();
  } finally {
    // 结束批处理，执行所有待更新的状态
    isBatching = false;
    flushPendingUpdates();
  }
}

// 3. 简化的 setState
function setState(newState) {
  if (isBatching) {
    // 在批处理中，只收集状态更新，不立即渲染
    pendingUpdates.push(newState);
  } else {
    // 不在批处理中，立即渲染
    render(newState);
  }
}
```



这样一个 onclick 事件里多次 setState，就只会更新一次，这个 isBatching 在现在的源码中是 isInsideEventHandler





![image-20250912000353880](/posts/react-source/image-20250912000353880.png)



接下来是看具体怎么分发事件，分发事件干啥呢？主要是把事件放到 dispatchQueue 中



![image-20250912234132942](/posts/react-source/image-202509100015324592.png)



这里涉及插件系统，并且核心函数是 extractEvents，它提取事件监听器并创建合成事件对象，然后填充到 dispatchQueue 队列中。那合成对象是什么吗，为什么要有事件合成对象，有什么用？如下图，合成对象就是 e，event，就是常用的 e.taget，上面这部分逻辑，主要是创建事件对象，放入 dispatchQueue 中，里面还有个核心逻辑 `accumulateSinglePhaseListeners` 函数直接返回的 listeners 和事件插件系统创建的 event 传入 `dispatchQueue`，然后在后续的  `processDispatchQueue`(dispatchQueue, eventSystemFlags) 中调用



![image-20250913002403725](/posts/react-source/image-20250913002403725.png)



如上图：ccumulateSinglePhaseListeners 函数逻辑比较单一，就是根据传入的 fiber，向上遍历整棵 fiber 树，收集所有的冒泡事件，比如 click 了一个 div，那它收集的就是所有父级上的 click 事件，并且放到 dispathchQueue，接下来是 `processDispatchQueue`，如下图，其实就是看冒泡还是捕获，捕获就倒序执行，冒泡就顺序执行



![image-20250916232647562](/../../../Library/Application Support/typora-user-images/image-20250916232647562.png)



小结：

## 5.fiber 是什么？

先来看 FiberNode 这个构造函数，这个构造函数源码中有三个注释，翻译过来就是 实例，Fiber，副作用，再参考 React 技术中的理念



- 作为静态数据结构来说，保存了下面实例的数据
- 作为架构来说，React 的 Reconciler 基于 Fiber 节点实现，被称为 Fiber Reconciler，它使用到了下面的 return child sibling 来构成链表，这是实现异步可打断更新的基础
- 作为动态工作单元来说，每个 Fiber 节点保存了更新的状态，要执行的工作等信息

```js
function FiberNode(
  tag: WorkTag,
  pendingProps: mixed,
  key: null | string,
  mode: TypeOfMode,
) {
  // 实例： 作为静态数据结构的属性
  this.tag = tag;
  this.key = key;
  this.elementType = null;
  this.type = null;
  this.stateNode = null;

  // Fiber ：用于连接其他Fiber节点形成Fiber树
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

  // 副作用 ：作为动态的工作单元的属性
  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.deletions = null;

  // 调度优先级相关
  this.lanes = NoLanes;
  this.childLanes = NoLanes;

  // 指向该fiber在另一次更新时对应的fiber
  this.alternate = null;
}

```

## 6.React 渲染流程：root.render(\</APP>) 

如下图，会去拿到两个信息，一个是 eventTime，可以粗略的理解为 performance.now()，另一个 lane，获取当前根容器的 fiber 的车道模型，当前为 defaultLane

![image-20250917233007619](/posts/react-source/image-20250917233007619.png)

如下图，接着看updateContainer 逻辑，主要是创建 update 对象，然后放入全局队列，供后续消费

![image-20250918155556578](/../../../Library/Application Support/typora-user-images/image-20250918155556578.png)

```js
// 用户首次调用
root.render(<App />);

// 执行流程：
// 1. 创建更新对象
const update = {
  eventTime: now(),
  lane: 16,
  payload: { element: <App /> },
  callback: null
};

// 2. 检查是否为渲染阶段更新
// 首次渲染：isUnsafeClassRenderPhaseUpdate(fiber) = false
// 走正常并发更新路径

// 3. 加入并发队列
concurrentQueues = [fiber, queue, update, 16];
concurrentQueuesIndex = 4;

// 4. 更新Fiber状态
fiber.lanes = 16;  // 标记这个Fiber有工作要做

// 5. 返回根节点
return fiberRoot;

// 6. 后续调度
scheduleUpdateOnFiber(fiberRoot, current, 16, eventTime);
```

