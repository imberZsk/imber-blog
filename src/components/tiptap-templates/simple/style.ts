import { cn } from '@/lib/utils'

// Notion 风格的高亮块样式
export const CalloutClassNames = cn(
  // 基础样式
  '[&_.callout-gray]:py-4 [&_.callout-gray]:my-2 [&_.callout-gray]:rounded-md',
  '[&_.callout-gray]:pl-12 [&_.callout-gray]:pr-6',
  '[&_.callout-gray]:gap-3',
  '[&_.callout-gray_p]:flex-1 [&_.callout-gray]:break-all',

  // 图标样式 - 使用伪元素
  '[&_.callout-gray]:before:content-["💡"] [&_.callout-gray]:before:absolute [&_.callout-gray]:before:left-5 [&_.callout-gray]:before:text-lg [&_.callout-gray]:before:flex-shrink-0 [&_.callout-gray]:before:mr-1',

  // 不同颜色的高亮块 - 浅色主题
  '[&_.callout-gray]:bg-stone-50 [&_.callout-gray]:text-stone-800',

  // 暗色主题支持
  'dark:[&_.callout-gray]:bg-[#30302e] dark:[&_.callout-gray]:text-stone-200'
)
