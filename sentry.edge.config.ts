// 此文件配置 Sentry 在边缘功能（中间件、边缘路由等）中的初始化。
// 在此处添加的配置将在加载任何边缘功能时使用。
// 注意：此配置与 Vercel Edge Runtime 无关，在本地运行时也需要。
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://ea2770eb392b4700196592abeb9f0e3c@o4506473922428928.ingest.us.sentry.io/4510383749005312',

  // 定义跟踪采样的概率。在生产环境中调整此值，或使用 tracesSampler 以获得更好的控制。
  tracesSampleRate: 1,

  // 启用将日志发送到 Sentry
  enableLogs: true,

  // 启用发送用户 PII（个人身份信息）
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true
})
