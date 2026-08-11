# React 源码（12）- Hooks

> 读完你能：围绕“Hooks”理解“Hooks 分类”与“状态管理 (State Management)”，并结合正文示例完成实践与排障。

packages/react-reconciler/src/ReactFiberWorkLoop.old.js

`updateContainer` -> `ensureRootIsScheduled` -> `scheduleCallback(schedulerPriorityLevel,performConcurrentWorkOnRoot.bind(null, root))`-> `performConcurrentWorkOnRoot` -> `renderRootConcurrent` -> `workLoopConcurrent` -> `performUnitOfWork` -> `beginWork` -> `renderWithHooks` -> `updateFunctionComponent` -> `renderWithHooks`

# 一、Hooks 分类

### 状态管理 (State Management)

这些 Hooks 用于在组件内部管理和更新状态。

useState: 声明一个状态变量，可以直接更新。
useReducer: 当状态逻辑较为复杂或下一个状态依赖于前一个状态时使用，通过 reducer 函数管理状态。
useActionState (React 19 新增，原 useFormState): 管理与表单提交或异步操作相关的状态，简化加载、错误和数据状态的处理。
useOptimistic (React 19 新增): 用于实现乐观更新，即时更新 UI 以提升用户体验，同时在后台处理实际的数据变更。

### 副作用处理 (Side Effect Handling)

这些 Hooks 用于处理组件渲染之外的操作，如数据获取、订阅或手动更改 DOM。

useEffect: 连接组件到外部系统，在组件渲染后执行副作用操作。
useLayoutEffect: 与 useEffect 类似，但在浏览器执行绘制之前同步触发。常用于读取布局信息并同步触发重新渲染。
useInsertionEffect (React 18 新增): 主要供 CSS-in-JS 库使用，在 React 对 DOM 进行更改之后，但在 useLayoutEffect 读取新布局之前同步触发，用于动态插入 CSS 规则。

### 核心概念速览

- Hook 对象：每个 Hook 调用对应一个 Hook 对象，存储该 Hook 的状态和配置
- Hook 链表：组件内所有 Hook 按调用顺序形成链表，这就是为什么 Hook 不能在条件语句中调用
- UpdateQueue：管理状态更新的队列，每次 setState 都会创建一个 Update 对象
- Effect 链表：管理副作用的执行，包括 useEffect、useLayoutEffect 等

# 二、useState

![](/posts/react-source/useState.png)

FunctionComponent 对应的 Fiber 节点（如 App 的 Fiber）的 memoizedState 指向一条“Hook 单向链表”。

```js
Hook {
  memoizedState: any,        // 当前渲染后的 state（对 useState 即 number）
  baseState: any,            // 作为下轮计算的“基线”状态
  baseQueue: Update | null,  // 未被本轮消费完的“基线更新”（环形链表尾指针）
  queue: {
    pending: Update | null,  // 新进入的待处理更新（环形链表尾指针）
    dispatch: Function,      // 即 setNumber，绑定了 fiber+queue
    lastRenderedReducer,     // 最近一次渲染使用的 reducer
    lastRenderedState,       // 最近一次渲染得到的 state
    lanes,                   // 该队列上累积的车道（优先级）
  },
  next: Hook | null          // 指向下一个 Hook
}
```

Update 结点（队列里的元素）

```js
Update {
  lane,              // 该更新的车道/优先级
  action,            // setNumber 传入的值或函数
  hasEagerState?,    // 是否有预计算状态
  eagerState?,       // 预计算的状态值（可用于短路）
  next: Update | null // 环形单链表
}
```

setNumber 触发是 dispatchEvent 触发，然后 scheduleUpdateOnFiber 调度

# 三、useEffect

![](/posts/react-source/useEffect.png)

# 四、总结

- **Hooks 分类**：这些 Hooks 用于在组件内部管理和更新状态。
- **useState**：FunctionComponent 对应的 Fiber 节点（如 App 的 Fiber）的 memoizedState 指向一条“Hook 单向链表”。
