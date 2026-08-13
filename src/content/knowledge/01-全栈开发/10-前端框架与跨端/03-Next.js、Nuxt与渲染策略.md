# 前端框架与跨端（03） - Next.js、Nuxt 与渲染策略

> 读完你能：根据数据新鲜度、缓存、SEO 和交互边界选择 CSR、SSR、SSG 或增量生成。

## 核心知识清单

- Next.js 与 Nuxt 的文件路由和服务端运行时
- CSR、SSR、SSG 与 ISR
- Server Component 与 Client Component 边界
- 服务端数据获取、缓存与失效
- Streaming、Suspense 与局部加载
- 认证、密钥与服务端专属代码

## 渲染选择

公开且稳定的内容优先静态生成；需要定期更新可使用增量再生成；依赖请求身份的数据使用服务端渲染或客户端请求；强交互区保持客户端组件。不要把整个页面标为客户端来解决一个按钮事件，这会扩大 JavaScript、密钥泄露和瀑布请求风险。

Next.js 与 Nuxt 都提供路由、服务端数据和部署约定，但缓存默认、运行时和组件边界不同，必须以当前版本官方文档和实际构建结果为准。缓存键需包含用户/租户和数据版本，认证页面不能误用公共缓存。

## 数据流与失效

每个页面先写清内容所有者、读取身份、新鲜度和失效事件。产品说明可在构建期读取并按发布重新生成；库存页面可服务端读取但不缓存用户维度；用户资料必须绑定会话并避免进入公共 CDN。更新成功后按数据键或标签失效，而不是清空全站缓存。

Streaming 只缩短可见等待，不减少总工作量。把互不依赖的读取并发启动，在 Suspense 边界逐段返回；若子组件服务端请求彼此串行，页面仍会形成瀑布。Client Component 只能接收可序列化、最小必要数据，服务端密钥和数据库客户端不得越过边界。

## 失败与验收

- 登录用户看到他人内容：立即检查共享缓存键是否缺少身份或租户，并清除已污染缓存。
- 更新成功但页面仍旧：检查写路径是否触发对应 tag/key 失效，以及边缘缓存是否有第二层 TTL。
- 首屏 HTML 有内容但交互很慢：查看客户端 bundle、Hydration 和长任务，不要继续增加 SSR 工作。
- 生产与本地结果不同：核对 Node/Edge 运行时、环境变量和部署平台缓存默认值。

验收同时查看生成 HTML、Network 缓存头、构建产物和用户切换场景，不能只看开发服务器。

## 参考资料

- [Next.js Rendering](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Nuxt Rendering Modes](https://nuxt.com/docs/guide/concepts/rendering)
