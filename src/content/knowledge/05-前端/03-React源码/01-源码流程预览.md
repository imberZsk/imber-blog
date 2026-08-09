# React 源码（1）- React 源码流程预览

## React 大致流程

React 全流程大约有以下几步：

React 设计原理里中有说两个阶段 render 阶段（reconciler 和 scheduler） 和 commit 阶段，所以我分为下面 4 个阶段来说

1. 初始化阶段：初始化事件层，根 fiber 树
2. 调度阶段：scheduler 决定执行时机
3. 协调阶段：遍历 Fiber 树找到修改的节点打上标记（异步可中断）
4. 提交阶段：根据标记渲染到页面（同步不可打断）

## React 包一览

```js
packages/
├── dom-event-testing-library/
├── eslint-plugin-react-hooks/
├── internal-test-utils/
├── jest-react/
├── react/
├── react-art/
├── react-cache/
├── react-client/
├── react-debug-tools/
├── react-devtools/
├── react-devtools-core/
├── react-devtools-extensions/
├── react-devtools-fusebox/
├── react-devtools-inline/
├── react-devtools-shared/
├── react-devtools-shell/
├── react-devtools-timeline/
├── react-dom/
├── react-dom-bindings/
├── react-is/
├── react-markup/
├── react-native-renderer/
├── react-noop-renderer/
├── react-reconciler/
├── react-refresh/
├── react-server/
├── react-server-dom-esm/
├── react-server-dom-fb/
├── react-server-dom-parcel/
├── react-server-dom-turbopack/
├── react-server-dom-webpack/
├── react-suspense-test-utils/
├── react-test-renderer/
├── scheduler/
├── shared/
├── use-subscription/
└── use-sync-external-store/
```

大约可以分为六大类：核心包、服务端渲染、渲染器、开发工具、工具包、试验性功能、绑定层；我们只需要关注核心包和渲染器

### React 核心包

```js
├── react/
├── react-reconciler/
├── scheduler/
```

#### react 包

提供了所有 React 组件/副作用/状态相关的基本API，没有提供渲染相关的代码，比如 Component，useEffect，useState

![](/react/react.png)

#### react-reconciler 包

react 调和 fiber 用的，reconciler 会计算出 哪些 DOM 需要更新，然后交给 Commit，让浏览器渲染，比如 createContainer，updateContainer，batchedUpdates 一些更新相关的

![](/react/reconciler.png)

#### scheduler 包

调度器负责任务的优先级管理和执行时机控制，让 React 不阻塞主线程来执行渲染工作

![](/react/scheduler.png)

### 渲染器相关

#### react-dom 包

React 最常用的渲染器，负责将 React 组件渲染到浏览器 DOM 中。它包含了所有与浏览器 DOM 交互的代码，如事件系统、属性处理等。

![](/react/react-dom.png)
