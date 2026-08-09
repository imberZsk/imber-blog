import * as React from 'react'

import { cn } from '@/lib/utils'

/** 渲染符合博客设计 token 的通用文本输入框。 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-border placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground focus-visible:ring-ring/20 flex h-9 w-full min-w-0 rounded-[18px] border bg-[var(--color-surface-alt)] px-3 py-1 text-sm shadow-none transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export { Input }
