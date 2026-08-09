import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/** 徽标的视觉变体，统一复用 shadcn 的 variant 约定。 */
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border bg-background text-foreground'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

/** 提供适合分类和技术标签的紧凑 shadcn 徽标。 */
function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
