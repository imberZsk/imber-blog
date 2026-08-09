# React 源码（5）- React 事件机制

## 事件委托

随着 React 18 的发布，事件系统带来了一些新的理念和更新。其中最引人注目的两大变化是：

- 事件委托的根节点从 document 迁移到了应用的根 DOM 元素
- SyntheticEvent 不再进行池化处理。

事件委托的好处

- 减少内存消耗：只需在顶层容器上附加少量监听器，而非为成千上万个 DOM 元素都绑定事件。
- 简化动态内容管理：对于动态添加或移除的元素，无需手动绑定或解绑事件，因为事件处理是在顶层统一管理的。

## 源码实现

createRoot 调用到createContainer 里有一个 listenToAllSupportedEvents 函数，说明初始化阶段，初始化了事件机制，接下来探究这部分代码。

都知道 React 是通过冒泡来自定义事件机制，那最终绑定在哪儿呢？有些事件没有事件冒泡，那React 怎么知道触发事件了呢？

先看看原生的事件，原生里的 capture 和 passive，React 也处理了很简单，对于 wheel/touchStart/touchMove 默认加上 passive 告诉浏览器先执行默认事件，不会 e.preventDefault，这样不会有 listener 卡顿问题，就不细说了

```js
// 这就是该函数内部大概做的事情
element.addEventListener(eventType, listener, {
  capture: true, // 捕获阶段
  passive: true, // 被动模式
  once: false // 不是一次性
})
```

在这之前，ReactDOMEventListener.js 这个文件顶部有注册事件，也就是之前的 allNativeEvent 的事件其实是这里注册的，也就是收集到所有事件，方便后续遍历，这样处理

![image-20250910001532459](/posts/react-source/image-20250910001532459.png)

如下图，在源码中可以看到，绑定在了 root 上，但是对于 selectionChange 绑定在了 document 上，selectionChange 在编辑器里有比较多的时候，比如监听选中的内容，然后在选中内容上增加一个弹层 tooltip 组件

![image-20250909232137990](/posts/react-source/image-20250909232137990.png)

里面还有用到按位或 | 和按位与 & 和左移位运算符`<<` ,它们通过排列组合比较容易区分是哪种事件，这种方案还可以用在权限管理

```js
// 分配标识
export const IS_CAPTURE_PHASE = 1 << 2 // 0b0100 (4)
export const IS_BUBBLE_PHASE = 1 << 3 // 0b1000 (8)

// 组合标识
const flags = IS_CAPTURE_PHASE | IS_BUBBLE_PHASE // 0b1100 (12)

// 检查某个标识
if (flags & IS_CAPTURE_PHASE) {
  console.log('捕获阶段已启用')
}
```

遍历给 root 绑定事件这部分比较简单，也就是点击一个元素然后 root 就能收到事件，重点是 listener，也就是 `createEventListenerWrapperWithPriority` 方法，方法名可以看出它带有优先级，那它为什么需要优先级呢？事件优先级是怎么样的？它是怎么处理收到事件呢？e.currentTarget 是指向触发元素，那 React 中会不会全都成了 root ?

如下图，事件优先级肯定是同时触发的时候，让更高优先级的事情先触发，下面的 getEventPriority 方法可以看到，事件的优先级分为四类有：

- #### DiscreteEventPriority (离散事件优先级)
  - 由用户**离散**触发的、不需要频繁执行的事件。这些事件需要立即响应，体验上不能有延迟。
  - **例子：** `click`、`keydown`、`keyup`、`mousedown`、`mouseup`、`focusin`、`focusout` 等。

- #### ContinuousEventPriority (连续事件优先级)
  - **对应事件：** 由用户**连续**触发的、会高频执行的事件。为了防止阻塞渲染，React 会对这些事件进行**节流（throttle）** 处理。
  - **例子：** `drag`、`mousemove`、`mouseover`、`mouseout`、`scroll`、`touchmove`、`wheel` 等。

- #### DefaultEventPriority (默认事件优先级)
  - **对应事件：** 不属于上述两类的其他事件，或者没有明确指定优先级的更新（如 `setTimeout`、`Promise` 回调中的 `setState`）。
  - **例子：** `load`、`animationend` 等。

![image-20250911215151672](/posts/react-source/image-20250911215151672.png)

这些优先级 lane 车道模型对应，如下代码，我看的这里是 .old 文件，也就是在`react/packages/shared/ReactFeatureFlags.js`文件 的字段 `export const enableNewReconciler = false; ` 判断是.old.js 的车道模型，不过不影响，主要是思想

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
let isBatching = false
let pendingUpdates = []

// 2. 简化的批处理函数
function batchedUpdates(fn) {
  if (isBatching) {
    // 如果已经在批处理中，直接执行
    return fn()
  }

  // 开始批处理
  isBatching = true
  try {
    return fn()
  } finally {
    // 结束批处理，执行所有待更新的状态
    isBatching = false
    flushPendingUpdates()
  }
}

// 3. 简化的 setState
function setState(newState) {
  if (isBatching) {
    // 在批处理中，只收集状态更新，不立即渲染
    pendingUpdates.push(newState)
  } else {
    // 不在批处理中，立即渲染
    render(newState)
  }
}
```

这样一个 onclick 事件里多次 setState，就只会更新一次，这个 isBatching 在现在的源码中是 isInsideEventHandler

![image-20250912000353880](/posts/react-source/image-20250912000353880.png)

接下来是看具体怎么分发事件，分发事件干啥呢？主要是把事件放到 dispatchQueue 中

![image-20250912234132942](/posts/react-source/image-202509100015324592.png)

这里涉及插件系统，并且核心函数是 `extractEvents`，它提取事件监听器并创建合成事件对象，然后填充到 dispatchQueue 队列中。那合成对象是什么吗，为什么要有事件合成对象，有什么用？如下图，合成对象就是 e，event，就是常用的 e.target，上面这部分逻辑，主要是创建事件对象，放入 dispatchQueue 中，里面还有个核心逻辑 `accumulateSinglePhaseListeners` 函数直接返回的 listeners 和事件插件系统创建的 event 传入 `dispatchQueue`，然后在后续的 `processDispatchQueue`(dispatchQueue, eventSystemFlags) 中调用

![image-20250913002403725](/posts/react-source/image-20250913002403725.png)

如上图：accumulateSinglePhaseListeners 函数逻辑比较单一，就是根据传入的 fiber，向上遍历整棵 fiber 树，收集所有的冒泡事件，比如 click 了一个 div，那它收集的就是所有父级上的 click 事件，并且放到 `dispatchQueue`，接下来是 `processDispatchQueue`，如下图，其实就是看冒泡还是捕获，捕获就倒序执行，冒泡就顺序执行

![image-20250916232647562](/../../../Library/Application Support/typora-user-images/image-20250916232647562.png)
