# 前端框架（03） - Next.js 渲染、缓存与安全边界

> Next.js 同时运行服务端和浏览器代码，最重要的不是路由文件名，而是数据在哪执行、缓存多久、谁有权读取。

## 学习目标

- 区分 Server/Client Component、Route Handler 和 Server Action 的执行边界。
- 根据用户、权限和新鲜度要求设计缓存与失效策略。
- 在数据层而非界面层实现认证、授权和敏感配置保护。

## 一、组件与执行位置

Server Component 适合服务端读取数据、缩小客户端 JavaScript；Client Component 承载事件、浏览器 API 和交互状态。`"use client"` 会建立客户端边界，其依赖也进入客户端图，不能从中导入密钥或只应在服务端运行的模块。

## 二、四种数据决策

1. 数据是否按用户或权限变化？若是，不能共享公共缓存。
2. 是否允许旧数据？允许则设置明确 revalidate；不允许则按请求读取。
3. 变更后哪些页面或标签失效？缓存失效应靠业务键，不靠整站清空。
4. 错误和加载是否需要流式隔离？使用 Suspense/Error Boundary 控制局部影响。

## 三、权限必须贴近数据

```typescript
/** 仅服务端可调用的订单读取入口。 */
async function getOrder(orderId: string, currentUserId: string) {
  /** 数据层返回的订单，可能不存在。 */
  const order = await repository.findById(orderId)
  if (!order || order.userId !== currentUserId) return null
  return order
}
```

页面隐藏按钮、Middleware 拦 URL 都不能替代数据层权限过滤。Server Action 与 Route Handler 接受的参数来自客户端，必须重新做身份、权限、Schema、CSRF/Origin 和幂等校验。

## 四、常见故障

- 把用户 A 的结果放入公共缓存，造成跨用户数据泄露。
- 在布局中读取动态身份，使整个子树失去预期静态缓存能力。
- 混淆构建时环境变量与运行时配置，把服务端密钥暴露为 `NEXT_PUBLIC_*`。
- 只在浏览器测试导航，不验证直接访问、刷新、并发变更和缓存失效。

## 五、验收

- 用两个用户请求同一资源，确认数据层拒绝越权。
- 修改数据后验证目标缓存失效且无关页面不受影响。
- 构建产物中搜索密钥名，确认客户端 bundle 不包含服务端配置。

## 参考资料

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js Data Security](https://nextjs.org/docs/app/guides/data-security)
- [Next.js Caching](https://nextjs.org/docs/app/guides/caching)
