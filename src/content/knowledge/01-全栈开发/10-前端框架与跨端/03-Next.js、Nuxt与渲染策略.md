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

## 参考资料

- [Next.js Rendering](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Nuxt Rendering Modes](https://nuxt.com/docs/guide/concepts/rendering)

