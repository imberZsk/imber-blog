# React 源码（6）- Lane 车道模型

## 车道模型

想象一下一个繁忙的城市交通系统，既有需要紧急通行的救护车，也有日常通勤的公交车和私家车。为了保证交通顺畅，系统必须智能地为不同类型的车辆分配专用车道，并规定它们的通行优先级。React 的 Lanes 模型就扮演着类似的角色，它是 React 并发渲染和调度系统的核心与大脑。

Lanes 是一种用于表示和管理更新优先级、类型以及它们之间关系的复杂机制。它通过一个精巧的位掩码系统，为每一次状态更新分配一个或多个“车道”，从而决定了这次更新是需要紧急同步执行，还是可以被中断、稍后执行。理解 Lane，是深入探索 React 调度阶段、并发特性和性能优化的关键前置知识。

所有与 Lanes 相关的核心逻辑都存放在 `react/packages/react-reconciler/src/ReactFiberLane.(old | new).js` 文件中。

## 位掩码

要实现如此高效灵活的“车道”管理系统，React 选择了位掩码（Bitmask）作为其技术基石。位掩码是一种利用二进制位的 0 和 1 来表示和操作状态集合的技术。在 React 中，Lanes 系统巧妙地利用一个31位的二进制数，其中每一位都代表一个独立的“车道”（Lane）。

```js
// 定义一些Lane常量（React实际实现中定义在ReactFiberLane.js）
const SyncLane = 0b0000000000000000000000000000001 // 第1位
const InputContinuousLane = 0b0000000000000000000000000000100 // 第3位
const DefaultLane = 0b0000000000000000000000010000000 // 第8位

// 组合多个Lanes - 使用按位或(|)
const lanes = SyncLane | InputContinuousLane
// lanes = 0b0000000000000000000000000000101

// 检查是否包含某个Lane - 使用按位与(&)
const hasSyncLane = (lanes & SyncLane) !== 0 // true
const hasDefaultLane = (lanes & DefaultLane) !== 0 // false

// 移除某个Lane - 使用按位与(&)和按位非(~)
const newLanes = lanes & ~InputContinuousLane
// newLanes = 0b0000000000000000000000000000001
```

位掩码优势

```bash
极高性能 ：位操作是CPU最基本的操作，速度极快
紧凑存储 ：单个数字即可表示复杂的状态组合
灵活查询 ：可以快速检查、添加或移除特定优先级
```

位掩码为我们提供了表示和操作 Lanes 的高效工具，那么 React 中到底定义了哪些“车道”类型呢？

## Lane 的类型分类

- SyncLane: 最高优先级，用于必须同步执行的更新（例如，由 flushSync 触发的更新，或某些离散的用户输入）。在 ReactFiberReconciler.js 中明确定义。
- Input Lanes (如 InputContinuousLane, InputDiscreteLane): 用于处理用户输入，确保 UI 响应迅速。离散输入（如点击）通常比连续输入（如拖动）优先级更高。
- DefaultLane / NormalLane: 普通的异步更新，如 setState 或 useEffect 触发的更新。
- GestureLane: 专门用于处理由手势交互（例如触摸设备上的滑动、捏合缩放等）触发的更新。
- TransitionLane: 用于通过 startTransition API 标记的更新。这些更新被认为是“可过渡的”，优先级较低，可以被更高优先级的更新中断，以保持 UI 的响应性。React 19 进一步强化了 Actions 和 useTransition 的概念，这些都依赖于 Transition Lanes。
- RetryLane: 用于安排之前因 Suspense 而挂起的工作的重试。
- SelectiveHydrationLane: 用于服务器端渲染 (SSR) 的选择性水合过程，如 ReactFiberReconciler.js 中所示。
- IdleLane: 最低优先级，用于可以在浏览器空闲时执行的工作，例如离屏渲染或非常低优先级的后台任务。
  这些类型的优先级是按照从高到低的顺序排列的，确保了 React 在渲染过程中能够根据优先级来决定如何处理不同类型的更新。

既然 React 定义了如此多样的 Lane，那么当一个更新（如 setState）发生时，它到底是如何智能地为这次更新选择正确的“车道”呢？这就是 requestUpdateLane 函数的核心职责。

## 如何分配一个合适的 Lane

`requestUpdateLane` 函数在 React 中扮演着为新的更新请求分配合适“通道”（Lane）的关键角色。这个分配过程并不是随机的，而是会综合考虑当前 React 应用的多种运行情况和上下文信息，以确保更新能够以恰当的优先级和方式进行处理。

下面是移除了开发环境检查的简化版代码:

```js
export function requestUpdateLane(fiber: Fiber): Lane {
  // 1. 获取 Fiber节点的 mode (模式)
  const mode = fiber.mode;

  // 2. 特殊情况处理：Legacy Mode
  if (!disableLegacyMode && (mode & ConcurrentMode) === NoMode) {
    return SyncLane;
  }

  // 3. 特殊情况处理：渲染阶段的更新 (Render Phase Update)
  if (
    (executionContext & RenderContext) !== NoContext &&
    workInProgressRootRenderLanes !== NoLanes
  ) {
    return pickArbitraryLane(workInProgressRootRenderLanes);
  }

  // 4. 处理 Transition 更新
  const transition = requestCurrentTransition();
  if (transition !== null) {
    // 调用 requestTransitionLane(transition) 来为这个 Transition 请求一个合适的 Lane。
    return requestTransitionLane(transition);
  }

  // 5. 默认情况：根据事件优先级确定 Lane
  return eventPriorityToLane(resolveUpdatePriority());
}
```

可以看到其实默认情况跟上节的事件机制相关

## 多车道协同作战：Lanes 的合并与选择

我们已经了解了 React 如何为单次更新分配一个合适的 Lane，但这只是故事的一部分。在真实的复杂应用中，多个不同来源的更新可能同时发生。React 需要一个更高维度的策略来管理这些并发的更新请求。这套策略的核心，就在于 Lanes 的合并与选择机制。

想象一下，调度中心不仅要为每辆车分配车道，还要看着整个交通网络，决定在某个时刻，哪些车道的车可以通行。这就是 `root.pendingLanes` 和 `getNextLanes` 函数所扮演的角色。

### 1. 作战地图: root.pendingLanes

在 React 的世界里，每一个应用的根节点（FiberRoot）都维护着一个名为 `pendingLanes` 的字段。你可以把它想象成一张包含了所有待处理任务的“作战地图”。

每当有一个新的更新被调度（即 `requestUpdateLane` 分配了一个 Lane），这个新的 Lane 就会通过**按位或（|）**操作，被合并到 `root.pendingLanes` 中。

```js
// 伪代码：当一个更新被调度时
const newLane = requestUpdateLane(fiber)
root.pendingLanes |= newLane // 使用 '|' 操作符将新车道并入地图
```

这意味着 `pendingLanes` 是一个集合，它包含了当前所有等待被处理的更新的优先级信息。例如，如果一个 `DefaultLane` 的更新正在等待，此时用户又触发了一个 `SyncLane` 的更新，那么 `pendingLanes` 就会变成 `DefaultLane | SyncLane`。

### 2. 作战指挥官: getNextLanes

有了作战地图，还需要一位指挥官来决定下一步的具体行动。这个指挥官就是 `getNextLanes` 函数（位于 ReactFiberLane.js）。在每次开始新的渲染工作前，调度器都会调用 `getNextLanes(root, wipLanes)` 来确定本次渲染要处理哪些 `Lanes`。

`getNextLanes` 的核心逻辑可以简化为：从 `pendingLanes` 中挑选出优先级最高的 Lane(s) 来执行。

在 React 19 的源码中，这个函数的逻辑非常复杂，但其根本目标是清晰的：

```js
// ReactFiberLane.js (简化逻辑)
export function getNextLanes(root: FiberRoot, wipLanes: Lanes): Lanes {
  const pendingLanes = root.pendingLanes;

  // 1. 如果没有任何待处理的 lane，直接返回
  if (pendingLanes === NoLanes) {
    return NoLanes;
  }

  // 2. 永远优先处理同步 Lane
  const syncLanes = pendingLanes & SyncLane;
  if (syncLanes !== NoLanes) {
    return syncLanes;
  }

  // 3. 其次处理连续输入事件的 Lane
  const continuousLanes = pendingLanes & InputContinuousLane;
  if (continuousLanes !== NoLanes) {
    return continuousLanes;
  }

  // 4. 再次处理默认 Lane
  const defaultLanes = pendingLanes & DefaultLane;
  if (defaultLanes !== NoLanes) {
    return defaultLanes;
  }

  // ... 其他优先级的判断

  // 5. 如果没有特定高优任务，则返回所有待处理任务中优先级最高的那个（x & -x）
  return getHighestPriorityLanes(pendingLanes);
}
```

## 案例：调度策略的实际体现

让我们回到之前的搜索组件案例，但这次我们用 getNextLanes 的视角来分析。

1. 初始状态: 组件加载，useEffect 中的 setTimeout 触发 setList。requestUpdateLane 分配 DefaultLane。此时 root.pendingLanes 变为 DefaultLane。
2. 调度决策: 调度器调用 getNextLanes，发现 pendingLanes 中只有 DefaultLane，于是返回 DefaultLane，React 开始进行列表的渲染工作。
3. 中断发生: 在列表渲染的过程中，用户在输入框打字，触发 onChange。requestUpdateLane 分配 SyncLane。root.pendingLanes 通过 |= SyncLane 操作，变为 DefaultLane | SyncLane。
4. 新的调度决策: 由于新的高优先级任务到来，React 中断当前渲染。它再次调用 getNextLanes。这一次，pendingLanes 是 DefaultLane | SyncLane。根据 getNextLanes 的逻辑，它会立刻发现并返回 SyncLane。
5. 高优任务执行: React 开始处理 SyncLane 的渲染任务，即更新输入框的值。这个过程是同步的，用户立即看到反馈。
6. 后续处理: 当 SyncLane 的任务完成后，root.pendingLanes 中会移除 SyncLane，剩下 DefaultLane。在下一个调度周期，getNextLanes 将会选中 DefaultLane，继续完成之前被中断的列表渲染任务。

通过这套机制，React 实现了高效、有序的并发任务处理，确保了用户体验的流畅。

## 防止拥堵：饥饿问题与过期机制

并发调度系统虽然强大，但存在一个潜在的风险：饥饿问题（Starvation）。如果高优先级的任务持续不断地涌入，那么低优先级的任务可能会一直被推迟，永远没有机会执行，就像在高速公路上，如果应急车道一直有车，普通车道的车就可能一直无法并线。

为了解决这个问题，React 引入了一套巧妙的过期（Expiration）机制，确保即使是最低优先级的任务，最终也能得到执行的机会。

### 1. 为任务标记“保质期”

在 React 内部，当一个更新被创建时，除了分配 Lane，还会计算一个过期时间（expirationTime），并将其存储在 FiberRoot 上的 expirationTimes 映射中。这个过期时间代表了该任务最晚必须被执行的时间点。

```js
// ReactFiberLane.js (简化概念)
export function markRootUpdated(root: FiberRoot, updateLane: Lane) {
  root.pendingLanes |= updateLane;

  // 计算一个过期时间
  const expirationTime = computeExpirationTime(updateLane, ...);
  // 记录这个 Lane 的过期时间
  markStarvedLanesAsExpired(root, expirationTime);
}
```

### 2. 强制执行过期任务

在 getNextLanes 的决策过程中，它不仅会检查各个 Lane 的优先级，还会检查是否有 Lane 已经过期。

在 ReactFiberWorkLoop.js 的 ensureRootIsScheduled 函数中，有专门的逻辑来处理过期任务。它会调用 markStarvedLanesAsExpired，检查 pendingLanes 中是否有任务的 expirationTime 已经小于当前时间。如果有，React 会采取一个非常果断的措施：

将这个过期的 Lane 强制提升为同步优先级的 SyncLane。

```js
// ReactFiberWorkLoop.js (简化逻辑)
function ensureRootIsScheduled(root: FiberRoot, currentTime: number) {
  // ...
  // 检查是否有任务被“饿”了太久
  markStarvedLanesAsExpired(root, currentTime);

  // 再次获取下一个要执行的 Lane
  const nextLanes = getNextLanes(root, root.suspendedLanes);

  // 如果因为过期，nextLanes 中包含了 SyncLane，则会以同步方式调度
  if (nextLanes === SyncLane) {
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
  }
  // ...
}
```

## 案例：永不“饿死”的后台任务

想象一个新闻网站，页面上有一个“最新动态”模块，它通过一个低优先级的后台任务每 10 秒钟更新一次。同时，页面上有一个可以被用户拖拽的图表，拖拽会触发连续的、中等优先级的 InputContinuousLane 更新。

- 正常情况: 用户没有操作时，每 10 秒的 DefaultLane 更新都能正常执行。
- 饥饿风险: 如果用户长时间、不间断地拖拽图表，InputContinuousLane 的更新会持续产生。由于其优先级高于 DefaultLane，后台的“最新动态”更新可能会一直被中断，无法完成渲染，导致用户看到的信息越来越陈旧。
  过期机制介入: 假设 DefaultLane 的过期时间被设置为 currentTime + 5000（5秒后）。即使这个更新在 5 秒内一直被拖拽事件中断，5 秒钟后，markStarvedLanesAsExpired 会检测到它已过期。此时，这个 DefaultLane 会被“拔高”到 SyncLane 的级别。
- 强制执行: 在下一次调度中，getNextLanes 会选中这个被提升的 SyncLane，并以同步、不可中断的方式将其渲染完毕。这样就保证了“最新动态”最迟在约 5 秒后一定能被更新，避免了无限期的饥饿。
  通过这套优雅的过期机制，React 在保证高优先级任务优先响应的同时，也为低优先级任务提供了“最低生活保障”，构筑了一个既高效又鲁棒的并发调度系统。

## 优先级与一致性：React 如何化解更新冲突

一个自然而然的问题是：如果高优先级任务可以中断低优先级任务，当它们操作同一份数据时，React 如何保证最终状态的正确性，避免数据错乱或更新丢失？

答案是：React 通过`“废弃并重做”（Abort and Retry`）的策略，确保了数据的一致性。

当一个高优先级更新（如 SyncLane）到来并中断了正在进行的低优先级渲染（如 DefaultLane）时，React 并不会试图在低优先级任务已完成的工作基础上“缝补”。相反，它会采取更果断的措施：

1. 废弃（Abort）: React 会完全丢弃那个被中断的、尚未完成的 workInProgress 树。所有计算到一半的结果都会被抛弃。
2. 执行高优任务: 它会优先完成这个高优先级任务的渲染，并将其结果提交到屏幕上。
3. 重做（Retry）: 当浏览器再次空闲时，React 会重新开始执行之前被中断的那个低优先级任务。关键在于，这次“重做”是基于一个已经包含了高优先级更新结果的全新 current 树。这确保了低优先级任务在执行时，能读取到最新的、一致的状态，从而避免任何数据冲突。

让我们通过具体的案例来剖析这个过程。

### 案例：计数器更新冲突

想象一个组件，它在 useEffect 中以低优先级更新一个计数器，同时用户可以通过点击按钮以高优先级更新同一个计数器。

```js
function ConflictingCounter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    // 模拟一个低优先级的更新
    setTimeout(() => {
      setCount((c) => c + 1) // 期望 count 变为 1
    }, 200)
  }, [])

  function handleClick() {
    // 用户点击，这是一个高优先级的同步更新
    setCount((c) => c + 1) // 期望 count 在之前的基础上 +1
  }

  return <button onClick={handleClick}>Count is {count}</button>
}
```

冲突过程分析：

1. 低优任务启动: 组件挂载后，useEffect 中的 setTimeout 在 200ms 后触发 setCount。requestUpdateLane 分配一个 DefaultLane，React 开始渲染 count 为 1 的 workInProgress 树。
2. 高优任务中断: 在 React 渲染 count 为 1 的过程中（比如只过了 10ms，渲染还没完成），用户点击了按钮。handleClick 触发了另一次 setCount。由于这是由用户交互触发的，requestUpdateLane 分配了 SyncLane。
3. 丢弃与重做: React 检测到更高优先级的 SyncLane，立即暂停了 DefaultLane 的渲染工作，并丢弃了计算到一半的 workInProgress 树。
4. 执行高优任务: React 同步执行 SyncLane 的更新。此时 count 的状态还是 0，执行 c => c + 1 后，count 变为 1。React 完成渲染并将 count 为 1 的结果提交到 DOM。
5. 重启低优任务: 在完成 SyncLane 的任务后，root.pendingLanes 中还留着之前的 DefaultLane。React 在下一个调度周期会处理它。关键来了：它会从头开始执行 DefaultLane 的更新。此时，它读取到的 count 的当前值已经是 1。因此，它执行 c => c + 1，计算出的新状态是 2。

最终结果：count 的值最终会正确地变为 2，而不是 1。React 通过“废弃重做”的机制，保证了两次更新都被正确应用，避免了“更新丢失”的问题。

## 实战案例：Lane 如何协调更新冲突

理论知识最终要服务于实践。让我们通过两个具体的案例，来看看 Lane 模型在实际开发中是如何工作的。

### 案例一：用户输入与数据获取的优先级博弈

想象一个场景：用户在一个搜索框中快速输入文本，同时应用在后台发起了一个数据请求，请求成功后需要更新页面上的一个列表。

```js
import React, { useState, useEffect, startTransition } from 'react'

function SearchComponent() {
  const [inputValue, setInputValue] = useState('')
  const [list, setList] = useState([])

  // 模拟后台数据获取
  useEffect(() => {
    // 假设组件加载后 1s 返回数据
    setTimeout(() => {
      const fetchedData = ['Apple', 'Banana', 'Cherry', 'Date']
      setList(fetchedData) // <--- 低优先级更新
    }, 1000)
  }, [])

  const handleChange = (e) => {
    setInputValue(e.target.value) // <--- 高优先级更新
  }

  return (
    <div>
      <input type="text" value={inputValue} onChange={handleChange} placeholder="Type here..." />
      <ul>
        {list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
```

在这个例子中，会发生什么？

1. 用户输入 (handleChange): 当用户在输入框打字时，onChange 事件是一个离散的用户交互。requestUpdateLane 会将其判定为 DiscreteEventPriority，并分配一个高优先级的 Lane，很可能是 SyncLane。这意味着 setInputValue 导致的重渲染会同步执行，用户会立刻看到输入的内容出现在输入框中，体验非常流畅。

2. 数据获取更新 (setList): useEffect 中的 setTimeout 回调函数中执行的 setList，由于它不与任何直接的用户交互事件关联，requestUpdateLane 会将其判定为 DefaultEventPriority，并分配一个较低优先级的 DefaultLane。

核心冲突与解决：如果在 setList 触发的低优先级渲染正在进行时，用户又输入了新的字符（高优先级更新），React 的调度器会毫不犹豫地中断正在进行的 DefaultLane 渲染任务，优先执行 SyncLane 的渲染任务，确保输入框的即时响应。待高优先级任务完成后，React 会在稍后的时间片重新尝试执行被中断的低优先级任务。

### 案例二：使用 startTransition 优化耗时渲染

现在考虑一个更复杂的情况：我们有一个按钮，点击后需要渲染一个非常庞大且计算量大的列表，直接渲染可能会导致页面卡顿。

```js
import React, { useState, useTransition } from 'react'

// 假设这是一个计算量很大的组件
const HeavyComponent = ({ count }) => {
  const items = []
  for (let i = 0; i < count; i++) {
    items.push(<li key={i}>Item {i + 1}</li>)
  }
  return <ul>{items}</ul>
}

function TransitionExample() {
  const [isPending, startTransition] = useTransition()
  const [count, setCount] = useState(0)

  const handleClick = () => {
    startTransition(() => {
      // 将这个耗时的更新放入 transition 中
      setCount(5000) // <--- TransitionLane 更新
    })
  }

  return (
    <div>
      <button onClick={handleClick}>Render Heavy Component</button>
      {isPending ? <p>Loading...</p> : <HeavyComponent count={count} />}
    </div>
  )
}
```

在这个例子中：

1. startTransition 的作用: handleClick 中的 setCount(5000) 被包裹在了 startTransition 函数中。这相当于在告诉 React：“这个状态更新可能会导致界面卡顿，你可以从容地、可中断地处理它。”

2. Lane 的分配: requestUpdateLane 在检测到当前更新处于一个 transition 上下文中时（通过 requestCurrentTransition()），会调用 requestTransitionLane()，为这次更新分配一个或多个 TransitionLane。这是一个非常低优先级的 Lane。

带来的好处：

- UI 不冻结：即使用户点击了按钮，开始渲染 5000 个列表项，由于它运行在 TransitionLane 上，这个渲染过程是可中断的。如果此时用户执行了其他更高优先级的操作（比如点击另一个按钮、输入文字），React 会立即暂停 HeavyComponent 的渲染，去响应用户的操作，从而保持了界面的流畅。

- Pending 状态反馈：useTransition 返回的 isPending 状态可以用来在过渡期间向用户显示加载指示（如 “Loading...”），提升了用户体验。

## 总结：Lane 不仅仅是优先级

通过本文的探讨，我们可以看到，React 的 Lane 模型远不止是一个简单的优先级数字。它是一个高度精密的、基于位掩码的并发调度框架，是 React 实现以下特性的基石：

- 差异化更新：能够区分用户输入、动画、数据获取等不同来源的更新，并赋予它们不同的行为（同步、并发、可中断）。
- 并发与中断：使得低优先级的渲染任务可以在不阻塞用户界面的情况下执行，并在高优先级任务到来时被中断和恢复。
- 高级特性支持：为 Suspense 的异步数据加载、useTransition 的平滑状态过渡以及未来可能出现的 Offscreen API 等高级功能提供了底层的调度能力。
