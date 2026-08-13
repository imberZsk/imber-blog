# 前端框架与跨端（10） - Next App Router 与 Nuxt 服务端数据工程

> 元框架的难点不在文件路由，而在服务端/客户端边界、缓存、身份和部署运行时。

> 读完你能：对比 Next App Router 与 Nuxt，设计 Layout、服务端数据、Mutation、Middleware、Runtime Config 和安全缓存。

## 核心知识清单

- Next App Router、Layout、Page 与 Route Handler
- Server Component、Client Component 与 Server Action
- Next 数据缓存、重新验证与 Streaming
- Nuxt 文件路由、Layout、Middleware 与 Composable
- useFetch、useAsyncData、Nitro Server Routes
- Runtime Config、Secret 与公共配置
- 身份、租户、缓存键与部署能力边界

## Next.js 边界

Server Component 可直接读取服务端数据和 Secret，Client Component 承担浏览器交互。Server Action 是服务端 Mutation 入口，仍要重新认证、校验和授权，不能因为调用来自自家组件就信任参数。缓存与 revalidate 根据数据新鲜度设计，用户私有数据不能进入公共缓存。

Layout 跨页面保留结构，Page 对应路由内容，Route Handler 提供 HTTP 端点。Streaming 与 Suspense 让慢区域独立加载，但错误和权限边界要能局部处理。

## Nuxt 边界

Nuxt 使用文件路由和 Layout，Route Middleware 处理导航逻辑但不替代服务端授权。`useFetch`/`useAsyncData` 负责 SSR 数据复用和 hydration，Key 必须稳定。Nitro Server Routes 执行服务端逻辑，Runtime Config 将私密项留服务端、公开项显式暴露。

## 部署验收

不同平台对 Node、Edge、文件系统、缓存和长连接支持不同。构建通过后还要在目标运行时验证 Cookie、Streaming、图片、Server Action、环境变量和冷启动。不能从本地 Node 行为推断 Edge 或 Serverless 完全一致。

## 参考资料

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Data Fetching](https://nextjs.org/docs/app/getting-started/fetching-data)
- [Nuxt Data Fetching](https://nuxt.com/docs/getting-started/data-fetching)
- [Nuxt Runtime Config](https://nuxt.com/docs/guide/going-further/runtime-config)

