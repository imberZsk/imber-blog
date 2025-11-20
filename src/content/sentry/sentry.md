# 监控平台（1）- sentry 接入

## sentry 的简介

https://sentry.io/
可以看到它提供的云平台有免费版本，只能一个账号，5k 错误监控，也够使用了，如果是自己部署，需要很高的服务器配置，比较贵，而且比较黑盒

![pricing](/sentry/pricing.png)

## sentry 的接入

登陆它的云平台，选择对应类型的项目，比如 nextjs，然后按它的步骤做，全选 yes

- `npx @sentry/wizard@latest -i nextjs --saas --org imberzsk --project imber-animation`
  最后这个 imber-animation 就是项目名来匹配 DSN

- 然后询问是否通过 API 路由来阻断广告
- 启用 Tracing 来采集 performance （看web vitals指标，也就是 tracesSampleRate: 1 配置）
- 启用 Session Replay 来遇到错误时支持视频回放（Sentry.replayIntegration() 插件配置）
- 启用 Logs 发送 log 到 sentry（ 配置插件可以精确控制
  `Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }) `）
  - 使用

    ```jsx
    import * as Sentry from "@sentry/nextjs"

    Sentry.logger.info("User triggered test log", { log_source: "sentry_test" })
    ```

- 创建 /sentry-example-page 例子
- 是否在用 CI/CD 工具在构建应用，比如 Github
  Action、Gitlab（然后它会生成一个环境变量，可以删除它的env，然后复制到本地.env，然后远程配置）
- 项目中有 prettier，是否 run
- 添加 MCP
- 选择编辑器

这些执行完后，生成了一些配置，大约是服务端监控，浏览器端监控配置。配置了 DSN 对应项目资源服务，enableLogs 启动日志，integrations 插件机制

然后nextjs 构建配置。配置了 `widenClientFileUpload: true` 上传 sourcemap 到 sentry 等

其它比如本地不想监控，可以设置开发时采样率为 0

## sentry 核心功能

可以总结下 sentry 的几个核心功能

- 监控：Issues 错误监控、Performance 性能监控、Metrics 行为监控
- dsn、插件机制
