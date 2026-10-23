import { withSentryConfig } from '@sentry/nextjs'
import { realpathSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'

/** 当前工作树对应的应用目录。 */
const applicationRoot = process.cwd()
/** 依赖的真实目录，工作树可能通过符号链接复用已有依赖。 */
const dependencyRoot = realpathSync(resolve(applicationRoot, 'node_modules'))
/** 同时包含应用与依赖的最小公共目录。 */
let turbopackRoot = applicationRoot
// 工作树依赖在默认根目录之外时，Turbopack 会在 Ready 后崩溃；扩展到公共目录允许解析该链接。
while (relative(turbopackRoot, dependencyRoot).split(sep).includes('..')) {
  turbopackRoot = dirname(turbopackRoot)
}
/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: turbopackRoot // 将工作树与符号链接依赖同时纳入模块解析范围。
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  reactStrictMode: false,
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.res.meizu.com',
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'ssm.res.meizu.com',
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        port: '',
        pathname: '/gh/**'
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
        pathname: '/**'
      }
    ]
  },
  /** 为不透明来源的在线实验提供公开只读模型资产，不扩大到其他站点路由。 */
  async headers() {
    /** 只允许跨源读取的公开静态资产目录。 */
    const publicSandboxAssetSources = ['/models/:path*', '/vendor/transformers/:path*']
    return publicSandboxAssetSources.map((source) => ({
      source, // 限定为模型和 Transformers.js 运行时。
      headers: [
        {
          key: 'Access-Control-Allow-Origin', // 允许 sandbox iframe 的唯一不透明来源读取。
          value: '*' // 目录内只有公开、无凭据的静态资产。
        },
        {
          key: 'Cross-Origin-Resource-Policy', // 显式允许公开资产被隔离预览读取。
          value: 'cross-origin' // 不放宽页面、API 或用户资源。
        }
      ]
    }))
  }
}

export default withSentryConfig(nextConfig, {
  // 所有可用选项请参见：
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'imberzsk',

  project: 'imber-blog',

  // 仅在 CI 环境中打印上传 source maps 的日志
  silent: !process.env.CI,

  // 所有可用选项请参见：
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // 上传更大范围的 source maps 以获得更美观的堆栈跟踪（会增加构建时间）
  widenClientFileUpload: true,

  // 通过 Next.js rewrite 将浏览器请求路由到 Sentry，以绕过广告拦截器。
  // 这可能会增加服务器负载以及托管费用。
  // 注意：请确保配置的路由不会与 Next.js 中间件匹配，否则客户端错误报告将失败。
  tunnelRoute: '/monitoring',

  // 自动 tree-shake Sentry logger 语句以减少打包体积
  disableLogger: true,

  // 启用 Vercel Cron Monitors 的自动检测。（目前还不支持 App Router 路由处理器。）
  // 更多信息请参见：
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: false
})
