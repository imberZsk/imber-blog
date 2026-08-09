import * as React from 'react'

import { cn } from '@/lib/utils'

/** 提供遵循全局边框、背景和圆角 token 的内容卡片。 */
function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('bg-card text-card-foreground border-border flex flex-col rounded-lg border', className)}
      {...props}
    />
  )
}

/** 提供卡片内部统一的内容间距。 */
function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('p-4', className)} {...props} />
}

export { Card, CardContent }
