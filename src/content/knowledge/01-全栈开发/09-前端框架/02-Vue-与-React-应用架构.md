# 前端框架（02） - Vue 与 React 应用架构

> Vue 和 React 的核心差异在表达方式，真正决定可维护性的仍是状态归属、数据边界和副作用控制。

## 学习目标

- 按本地 UI、URL、服务端和共享状态划分组件职责。
- 对比 Vue 响应式与 React 重渲染模型中的副作用与更新边界。
- 处理请求竞态、表单状态、缓存和组件 key 等高频问题。

## 一、先按状态归属建模

| 状态 | 示例 | 建议位置 |
| --- | --- | --- |
| 本地 UI | 对话框开关、输入草稿 | 组件内部 |
| URL | 搜索词、页码、筛选条件 | Router query/path |
| 服务端数据 | 用户、订单、列表 | Query 缓存或框架数据层 |
| 跨组件客户端状态 | 主题、临时工作流 | Pinia/Context 等最小共享层 |

不要把所有数据放进全局 Store。服务端状态包含缓存、失效、重试和并发语义，使用 TanStack Query 等数据层通常比手写 loading/error/data 三元组可靠。

## 二、响应式与不可变更新

Vue 通过响应式代理追踪读取与写入；React 通过重新渲染和状态身份判断变化。两者都要求副作用与渲染分离：计算结果优先 computed/useMemo 语义，外部同步才使用 watch/useEffect。

```typescript
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }

/** 当前用户列表请求的互斥状态。 */
const usersState: RequestState<string[]> = { status: 'idle' }
```

有限状态比 `isLoading/isError/hasData` 三个可能互相矛盾的布尔值更清晰。

## 三、组件边界

- 容器组件协调数据与路由，展示组件通过 props/emit 或 props/callback 接收契约。
- 表单字段的校验、脏状态与提交状态属于一个业务单元，不应散在多层组件。
- 列表项使用稳定业务 ID 作 key；索引 key 会在插入、排序时错配本地状态。
- 共享组件只承载跨页面稳定行为，页面权限、接口和特殊流程留在领域层。

## 四、副作用与竞态

搜索联想、路由切换等场景会出现旧请求后返回覆盖新结果。使用 AbortController 或查询库取消旧请求，并让缓存键完整包含筛选条件。卸载时还要清理监听器、订阅和计时器。

## 五、选型

选型依据是团队经验、现有生态、SSR/跨端需求、性能约束和长期维护成本。不要把 demo 代码行数当生产复杂度，也不要在同一项目混用多套状态方案却没有边界。

## 参考资料

- [Vue 响应式基础](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)
- [React 管理状态](https://react.dev/learn/managing-state)
- [TanStack Query Overview](https://tanstack.com/query/latest/docs/framework/react/overview)
