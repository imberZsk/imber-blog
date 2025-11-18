'use client'

import * as Sentry from '@sentry/nextjs'
import NextError from 'next/error'
import { useEffect } from 'react'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        {/* `NextError` 是 Next.js 的默认错误页面组件。其类型定义需要 `statusCode` 属性。
        然而，由于 App Router 不会暴露错误的状态码，我们只需传递 0 来渲染一个
        通用的错误消息。 */}
        <NextError statusCode={0} />
      </body>
    </html>
  )
}
