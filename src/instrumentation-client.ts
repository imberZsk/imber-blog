// 此文件配置 Sentry 在客户端的初始化。
// 在此处添加的配置将在用户在其浏览器中加载页面时使用。
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://ea2770eb392b4700196592abeb9f0e3c@o4506473922428928.ingest.us.sentry.io/4510383749005312',

  // 添加可选集成以获得额外功能
  integrations: [Sentry.replayIntegration()],

  // 定义跟踪采样的概率。在生产环境中调整此值，或使用 tracesSampler 以获得更好的控制。
  tracesSampleRate: 1,
  // 启用将日志发送到 Sentry
  enableLogs: true,

  // 定义 Replay 事件的采样概率。
  // 这将采样率设置为 10%。你可能希望在开发环境中设置为 100%，
  // 在生产环境中使用较低的采样率
  replaysSessionSampleRate: 0.1,

  // 定义发生错误时 Replay 事件的采样概率。
  replaysOnErrorSampleRate: 1.0,

  // 启用发送用户 PII（个人身份信息）
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
