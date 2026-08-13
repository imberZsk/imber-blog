# 前端框架与跨端（02） - Vue、React 与状态模型

> 读完你能：比较 Vue 响应式追踪与 React 状态快照，并为本地、共享和服务端状态选择边界。

## 核心知识清单

- Vue Proxy 响应式、ref、computed 与 watch
- React 状态快照、单向数据流与 Hooks
- 组件身份、Key 与状态保留
- 派生状态、Effect 与副作用边界
- 本地状态、共享状态与服务端缓存
- 可测试组合逻辑与组件契约

## 两种心智模型

Vue 追踪响应式读取并在依赖变化时更新；React 每次渲染得到一个状态快照，通过新状态触发下一次渲染。两者都要求渲染逻辑纯净，网络、订阅和 DOM 集成放入明确生命周期。能从 props 或查询结果计算的值不要复制进 state。

列表 Key 表示业务身份，不是消除警告的序号；身份变化会重建组件状态。服务端数据应交给查询缓存处理新鲜度、去重和重试，避免复制到全局客户端 Store 后出现双源真相。

## 参考资料

- [Vue Reactivity Fundamentals](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)
- [React State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)

