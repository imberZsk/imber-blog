# React 源码（4）- Fiber 架构和数据结构

## fiber 的三种含义

先来看 FiberNode 这个构造函数，这个构造函数源码中有三个注释，翻译过来就是 实例，Fiber，副作用，再参考 React 技术中的理念

- 作为静态数据结构来说，保存了下面实例的数据
- 作为架构来说，React 的 Reconciler 基于 Fiber 节点实现，被称为 Fiber Reconciler，它使用到了下面的 return child sibling 来构成链表，这是实现异步可打断更新的基础
- 作为动态工作单元来说，每个 Fiber 节点保存了更新的状态，要执行的工作等信息

```js
// react/packages/react-reconciler/src/ReactFiber.old.js

function FiberNode(
  tag: WorkTag,
  pendingProps: mixed,
  key: null | string,
  mode: TypeOfMode,
) {
  // 实例： 作为静态数据结构的属性
  this.tag = tag; // Fiber 的类型，如 FunctionComponent, ClassComponent, HostRoot 等
  this.key = key; // React Element 上的 key 属性，用于列表渲染时的优化
  this.elementType = null; // React Element 的 type，如函数组件本身，类组件的 class，或者 'div' 字符串
  this.type = null; // 与 elementType 类似，但对于 HostComponent，它就是 DOM 元素的标签名
  this.stateNode = null; // Fiber 对应的真实 DOM 节点（对于 HostComponent）或组件实例（对于 ClassComponent）


  // Fiber ：用于连接其他Fiber节点形成Fiber树
  this.return = null; // 指向父 Fiber 节点
  this.child = null; // 指向第一个子 Fiber 节点
  this.sibling = null; // 指向下一个兄弟 Fiber 节点
  this.index = 0; // 在兄弟节点中的索引

  this.ref = null; // React Element 上的 ref 属性

  this.pendingProps = pendingProps; // 新的 props，等待处理
  this.memoizedProps = null; // 上一次渲染时使用的 props，用于比较是否需要更新
  this.updateQueue = null; // 存储状态更新（setState）、回调函数等
  this.memoizedState = null; // 上一次渲染时使用的 state，用于比较是否需要更新
  this.dependencies = null; // 存储 Hooks 的依赖项，如 useContext, useMutableSource

  this.mode = mode; // Fiber 的模式，如 ConcurrentMode, BlockingMode, NoMode

  // 副作用 ：作为动态的工作单元的属性
  this.flags = NoFlags; // 标记 Fiber 节点需要执行的副作用（如 Placement, Update, Deletion）
  this.subtreeFlags = NoFlags; // 子树中所有 Fiber 节点需要执行的副作用的集合
  this.deletions = null; // 存储需要删除的子 Fiber 节点

  // 调度
  this.lanes = NoLanes; // 标记该 Fiber 节点及其子树中待处理的更新的优先级
  this.childLanes = NoLanes; // 子树中所有 Fiber 节点待处理的更新的优先级集合

  // 指向另一个 Fiber 树中的对应节点（current 树指向 work-in-progress 树，反之亦然）
  this.alternate = null;

   // 调试信息 (仅在 __DEV__ 模式下)
  if (__DEV__) {
    // ...
  }
}
```

## 状态和属性

- `pendingProps` 和 `memoizedProps`：pendingProps 存储了新的、待处理的 props。memoizedProps 存储了上一次成功渲染时使用的 props。React 通过比较这两个属性来判断组件的 props 是否发生变化，从而决定是否需要重新渲染。

- `updateQueue`：一个链表结构，存储了该 Fiber 节点上待处理的更新，例如 setState 调用、forceUpdate 调用等。在协调阶段，React 会遍历 updateQueue 来计算新的 state。

- `memoizedState`：存储了上一次成功渲染时使用的 state。对于函数组件，它存储了 Hooks 的状态（如 useState 的值）；对于类组件，它存储了组件的 state。

- `dependencies`: 存储了 Hooks 的依赖项，其是 React Fiber 架构中实现高效 Context 更新传播的关键部分。它通过一个链表结构记录了 Fiber 节点对各个 Context 的依赖情况，使得 React 能够在 Context 值变化时，精确且快速地找到需要更新的组件，从而优化了性能并保证了状态的一致性。

副作用

- `flags` 和 `subtreeFlags`：这是 Fiber 架构中非常重要的属性，用于标记 Fiber 节点需要执行的副作用（Side Effect）。例如，Placement 表示需要插入 DOM 节点，Update 表示需要更新 DOM 节点属性，Deletion 表示需要删除 DOM 节点。subtreeFlags 是其子树中所有 flags 的集合，用于快速判断子树中是否存在副作用，避免不必要的遍历。

- `deletions`: 需要删除的 Fiber 数组。

调度属性

- `lanes` 和 `childLanes`：在 React 18+ 中，lanes 替代了 expirationTime 和 suspensePriority，用于表示更新的优先级。它是一个位掩码，不同的位代表不同的优先级。lanes 标记了当前 Fiber 节点上待处理的更新的优先级，childLanes 标记了其子树中所有 Fiber 节点待处理的更新的优先级集合。这个章节将在后文详细的讲解

- `alternate`：指向另一个 Fiber 树中对应的 Fiber 节点。例如，如果当前 Fiber 节点属于 Current Fiber Tree，那么 alternate 就指向 Work-in-Progress Fiber Tree 中对应的节点，反之亦然。这个属性是实现“双缓冲”机制的关键。

## 工作标签系统（workTag）

React Fiber 的“工作标签系统”主要是指 Fiber 节点上的 tag 属性。这个 tag 是一个数字枚举值 (在源码中通常定义为 WorkTag 枚举)，它用来标识一个 Fiber 节点代表的是什么类型的工作单元或组件类型。不同的 tag 会导致 React Reconciler (协调器) 在 beginWork 和 completeWork 阶段对该 Fiber 节点采取不同的处理逻辑。

tag 属性是 Fiber 节点的核心属性之一，它决定了：

如何处理该 Fiber 节点： 例如，是调用函数组件、实例化类组件、创建 DOM 元素，还是处理 Context、Suspense 等特殊逻辑。
该 Fiber 节点可以拥有哪些子节点： 例如，HostComponent (DOM 元素) 的子节点通常也是 HostComponent 或 HostText。
在 Commit 阶段需要执行哪些副作用： 例如，HostComponent 可能需要进行 DOM 操作。
常见的 Fiber tag (WorkTag) 类型及其含义：

以下是一些在 React 源码中常见的 WorkTag 值：

- FunctionComponent (0): 代表一个函数组件。在 beginWork 中会直接调用该函数获取其子元素。
- ClassComponent (1): 代表一个类组件。在 beginWork 中会实例化组件 (如果需要)，调用生命周期方法 (如 render) 获取子元素。
- IndeterminateComponent (2): 初始状态，当 React 还不能确定一个组件是函数组件还是类组件时使用 (例如，一个函数返回了另一个函数)。在第一次渲染后会解析成 FunctionComponent 或 ClassComponent。
- HostRoot (3): Fiber 树的根节点，通常是调用 ReactDOM.createRoot(container).render(<App />) 时创建的，container DOM 元素会关联到这个 Fiber。
- HostPortal (4): 代表一个 Portal，允许将子节点渲染到父组件 DOM 层级之外的 DOM 节点中。
- HostComponent (5): 代表一个原生的 DOM 元素 (如 <div>, <span>, <p> 等)。beginWork 会处理其 children，completeWork 负责创建或更新真实的 DOM 节点。
- HostText (6): 代表一个文本节点 (DOM 中的 TextNode)。它没有子节点。
- Fragment (7): 代表 <React.Fragment> 或 <> 语法糖。它本身不渲染到 DOM，只是用来包裹一组子元素。
- Mode (8): 代表 React 的模式组件，如 <React.StrictMode> 或 <React.ConcurrentMode> (虽然 ConcurrentMode 后来更多是通过并发特性开关来控制)。它们会影响其子树中 Fiber 的行为。
- ContextConsumer (9): 代表使用 Context.Consumer 的组件或 useContext Hook 所在的组件，用于订阅 Context 的变化。
- ContextProvider (10): 代表 Context.Provider 组件，用于向下传递 Context 值。
- ForwardRef (11): 代表通过 React.forwardRef 创建的组件，允许父组件获取子组件内部的 DOM 节点或组件实例的 ref。
- Profiler (12): 代表 <React.Profiler> 组件，用于性能分析，测量渲染时间和提交次数。
- SuspenseComponent (13): 代表 <React.Suspense> 组件，用于处理代码分割和异步数据加载的 “加载中” UI 状态。
- MemoComponent (14): 代表通过 React.memo 优化的组件。beginWork 会进行 props 的浅比较来决定是否跳过渲染。
- SimpleMemoComponent (15): MemoComponent 的一种特定形式，当比较函数简单时使用。
- LazyComponent (16): 代表通过 React.lazy() 创建的动态加载组件。beginWork 会处理其加载状态。
- ScopeComponent (17): 一个实验性的特性，用于创建隔离的事件作用域。
- OffscreenComponent (18): 代表 <React.Offscreen> (实验性)，用于控制组件的可见性和渲染行为，例如在屏幕外预渲染或保持状态隐藏。
- LegacyHiddenComponent (19): 旧版的隐藏组件，类似 OffscreenComponent 但行为有所不同。
- CacheComponent (20): (实验性) 与 React Cache 相关，用于缓存数据获取结果。
- TracingMarkerComponent (21): (实验性) 与 React 的内部追踪和 DevTools 相关。
- HostHoistable (22): (实验性/内部使用) 与静态提升优化相关，可能用于标记那些可以在构建时提升的静态子树或元素。
- HostSingleton (23): (实验性/内部使用) 可能与确保某些类型的 HostComponent (如 <html>, <head>, <body>) 在文档中是单例的逻辑相关。

#### 工作流程中的作用：

在 createFiberFromTypeAndProps 函数中，React 会根据传入的 type (组件构造函数、字符串标签名、或 React 内部类型如 REACT_FRAGMENT_TYPE) 来决定新创建的 Fiber 节点的 tag。

然后，在 `beginWork` 函数中，会有一个大的 switch (workInProgress.tag) 语句，根据不同的 tag 执行不同的协调逻辑：

```js
// 伪代码示例
function beginWork(current, workInProgress, lanes) {
  // ... bailout 逻辑 ...

  switch (workInProgress.tag) {
    case IndeterminateComponent:
      return mountIndeterminateComponent(current, workInProgress, workInProgress.type, lanes)
    case LazyComponent:
      return updateLazyComponent(current, workInProgress, lanes)
    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress, workInProgress.type, workInProgress.pendingProps, lanes)
    case ClassComponent:
      return updateClassComponent(current, workInProgress, workInProgress.type, workInProgress.pendingProps, lanes)
    case HostRoot:
      return updateHostRoot(current, workInProgress, lanes)
    case HostComponent:
      return updateHostComponent(current, workInProgress, lanes)
    case HostText:
      return null // HostText 没有子节点
    case SuspenseComponent:
      return updateSuspenseComponent(current, workInProgress, lanes)
    // ... 其他 case
  }
}
```

同样，`completeWork` 函数中也会根据 tag 来执行不同的收尾工作，比如创建 DOM 实例、准备 DOM 更新、收集 effect 等。

因此，WorkTag 是 React Fiber 架构中区分不同工作类型、指导协调过程和实现各种 React 特性的关键机制。

## fiber 的指针结构

Fiber 节点之间通过以下三个关键指针形成树结构，这使得 React 可以高效地遍历和处理组件：

- child: 从父节点指向其第一个子节点。React 通过这个指针开始处理子组件。
- sibling: 从一个子节点指向其下一个兄弟节点。这允许 React 处理同一父级下的所有子节点，形成一个单向链表。
- return: 从子节点指回其父节点。当一个节点及其所有子孙节点都处理完毕后，React 通过 return 指针返回到父节点继续处理兄弟节点或完成父节点的工作。

举个例子:

```js
function App() {
  return (
    <div>
      <Header />
      <main>
        <Content />
        <Sidebar />
      </main>
    </div>
  )
}
```

React 会将上述 JSX 结构转化为如下的 Fiber 树（简化表示）：

```js
App (FunctionComponent)
├── child → div (HostComponent)
│   ├── child → Header (FunctionComponent)
│   │   └── sibling → main (HostComponent)
│   │       ├── child → Content (FunctionComponent)
│   │       │   └── sibling → Sidebar (FunctionComponent)
│   │       └── return → div
│   └── return → App
```

## Fiber 树的构建与遍历

Fiber 树的构建和遍历是协调阶段的核心。React 采用深度优先遍历（DFS）的方式来处理 Fiber 树，这个过程分为两个主要阶段：

Render Phase (渲染阶段 / 协调阶段)： 从根 Fiber 节点开始，自上而下地遍历 Work-in-Progress Fiber Tree。在这个阶段，React 会执行组件的 render 方法（或函数组件的函数体），计算新的 props 和 state，并根据 Diff 算法生成新的子 Fiber 节点。同时，也会在这个阶段标记副作用（flags）。这个阶段是可中断的。

- `beginWork`： 在“向下”遍历时，对每个 Fiber 节点执行“工作”（begin work）。这包括根据组件类型（函数组件、类组件、原生 DOM 元素等）执行相应的逻辑，如调用组件的 render 方法，比较 props 和 state，并创建或更新子 Fiber 节点。如果子节点有变化，beginWork 会返回第一个子 Fiber 节点，继续向下遍历；如果没有子节点或子节点已处理完毕，则返回 null。

- `completeWork`： 在“向上”回溯时，对每个 Fiber 节点执行“完成工作”（complete work）。这包括收集子节点的副作用，将它们合并到父节点的 subtreeFlags 中，并创建或更新与 Fiber 节点对应的真实 DOM 节点（对于 HostComponent）。

- Commit Phase (提交阶段)： 当 Render Phase 完成并生成了带有副作用标记的 Work-in-Progress Fiber Tree 后，React 会进入 Commit Phase。这个阶段是同步的，不可中断。在这个阶段，React 会遍历 Work-in-Progress Fiber Tree 中所有带有副作用标记的 Fiber 节点，并将其副作用（如 DOM 的插入、更新、删除）应用到真实的 DOM 上，从而更新 UI。

通过这种深度优先遍历和双阶段提交的机制，Fiber 架构实现了高效且可控的 UI 更新。Render 阶段的“计算”与 Commit 阶段的“执行”分离，使得复杂的更新任务可以在不阻塞主线程的情况下分片完成。

然而，如果每次更新都在唯一的一棵树上进行，那么中断和恢复就无从谈起，因为中断可能导致 UI 显示出不完整的中间状态。为了解决这个问题，React 引入了一个更为精妙的设计——双缓冲 Fiber 树。

## 双缓冲 Fiber 树？

React 在内存中同时维护两棵 Fiber 树：

1. `current` 树 (当前树): 这棵树代表了当前已经渲染到屏幕上的 UI 状态。它是用户正在看到的界面的内部表示。这棵树上的 Fiber 节点是不可变的（或者说，在一次更新周期中不直接修改）。

2. `workInProgress` 树 (工作中的树): 这棵树是 React 在后台构建或更新的树。当有新的更新（比如 setState、父组件重新渲染等）发生时，React 会基于 current 树来创建或克隆一个 workInProgress 树。所有的计算、diffing（比较差异）、以及副作用的标记都在这棵树上进行。

每个 Fiber 节点都有一个 alternate 属性。这个属性非常关键，它将 current 树中的 Fiber 节点和 workInProgress 树中对应的 Fiber 节点连接起来。也就是说，current.alternate 指向 workInProgress 树中的对应节点，而 workInProgress.alternate 指向 current 树中的对应节点。

### 双缓冲 Fiber 树有什么用？

双缓冲机制主要用于以下目的：

1. 原子性更新与一致性: React 可以在 workInProgress 树上完成所有的计算和准备工作，而不会影响当前屏幕上显示的 UI。只有当 workInProgress 树完全构建好，并且所有必要的 DOM 操作都准备就绪后，React 才会一次性地将 workInProgress 树切换为 current 树，并执行 DOM 更新。这确保了用户不会看到渲染不完整的中间状态，提供了更流畅和一致的用户体验。

2. 可中断与恢复渲染: 由于所有的工作都在 workInProgress 树上进行，如果渲染过程中有更高优先级的任务（如用户输入事件）到来，React 可以暂停 workInProgress 树的构建，去处理高优先级任务，然后再回来从之前中断的地方继续构建 workInProgress 树。current 树在此期间保持不变，用户界面不会卡顿。

3. 错误处理与回退: 如果在构建 workInProgress 树的过程中发生错误（例如，某个组件的 render 方法抛出异常），React 可以选择丢弃整个 workInProgress 树，而 current 树（即用户看到的界面）不受影响。这为实现更健壮的错误边界（Error Boundaries）提供了基础。

4. 状态复用与优化: 在创建 workInProgress 树时，如果某个 Fiber 节点及其子树没有发生变化，React 可以直接复用 current 树中对应的 Fiber 节点（通过 alternate 指针），避免了不必要的重新创建和计算，从而提高性能。

### 有什么优点？

1. 提升用户体验:
   - 避免了 UI 渲染的中间状态，界面更新更平滑。
   - 通过可中断渲染，使得应用在高负载下也能保持对用户输入的响应，减少卡顿感。
2. 提高渲染性能:
   - 通过复用未改变的 Fiber 节点，减少了不必要的工作量。
   - 允许 React 将渲染工作分片执行，避免长时间阻塞主线程。
3. 增强应用稳定性:
   - 错误处理机制使得单个组件的错误不容易导致整个应用崩溃。
4. 实现高级特性:
   - 是 React 并发模式 (Concurrent Mode) 和 Suspense 等高级特性的基石。
