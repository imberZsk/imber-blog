import { cn } from '@/lib/utils'
// ============================ NODES ============================
// #region

// 编辑器容器样式
export const EditorContainerClassNames = 'mx-auto max-w-3xl px-4 pt-24 pb-8 2xl:max-w-4xl'

// 正文：16 1.6 2%，组件间距 16px
export const paragraphClassNames = '[&_p]:text-base [&_p]:leading-[1.6] [&_p]:tracking-[2%] [&_p]:my-4'

// 引用 - 支持多种颜色
export const blockquoteClassNames = cn(
  '[&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:border-gray-500'
)

// 无序列表
export const bulletListClassNames = '[&_ul]:!list-disc [&_ul]:pl-4 [&_ul]:my-4'

// 代码块 pre->code，快捷键
export const codeBlockClassNames =
  '[&_pre]:bg-white [&_pre]:dark:bg-black [&_pre]:border [&_pre]:border-gray-200 [&_pre]:dark:border-gray-800 [&_pre]:p-4 [&_pre]:my-4 [&_pre]:block [&_pre]:rounded-md [&_pre_code]:bg-transparent [&_pre_code]:border-0 [&_pre_code]:p-0'

// 标题组件
export const headingClassNames = cn(
  '[&_h1]:text-[28px] [&_h1]:leading-[1.5] [&_h1]:tracking-[2%] [&_h1]:my-4 [&_h1]:font-semibold',
  '[&_h2]:text-[22px] [&_h2]:leading-[1.5] [&_h2]:tracking-[2%] [&_h2]:my-4 [&_h2]:font-semibold',
  '[&_h3]:text-[18px] [&_h3]:leading-[1.6] [&_h3]:tracking-[2%] [&_h3]:my-4 [&_h3]:font-semibold',
  '[&_h4]:text-[16px] [&_h4]:leading-[1.6] [&_h4]:tracking-[2%] [&_h4]:my-4 [&_h4]:font-semibold',
  '[&_h5]:text-[14px] [&_h5]:leading-[1.6] [&_h5]:tracking-[2%] [&_h5]:my-4 [&_h5]:font-semibold',
  '[&_h6]:text-[12px] [&_h6]:leading-[1.6] [&_h6]:tracking-[2%] [&_h6]:my-4 [&_h6]:font-semibold'
)

// 分割线
export const horizontalRuleClassNames = '[&_hr]:my-4 [&_hr]:h-px [&_hr]:bg-gray-400 [&_hr]:border-0'

// 列表项，li，这样可以控制 li 节点，暂时没用上
export const listItemClassNames = '[&_li]:my-1'

// 有序列表
export const orderedListClassNames = '[&_ol]:!list-decimal [&_ol]:pl-4 [&_ol]:my-4'
// #endregion

// ============================ MARKS ============================
// #region

// 超链接
export const linkClassNames = '[&_a]:text-blue-500 [&_a]:underline [&_a]:cursor-pointer'

// 粗体
export const boldClassNames = '[&_strong]:font-bold'

// 行内 code，快捷键 `` 或者 command + e
export const codeClassNames =
  '[&_code:not(pre_code)]:bg-white [&_code:not(pre_code)]:dark:bg-black [&_code:not(pre_code)]:border [&_code:not(pre_code)]:border-gray-200 [&_code:not(pre_code)]:dark:border-gray-800 [&_code:not(pre_code)]:inline [&_code:not(pre_code)]:px-1 [&_code:not(pre_code)]:text-sm [&_code:not(pre_code)]:py-0.5 [&_code:not(pre_code)]:rounded-md'

// 斜体 em command + i
export const italicClassNames = ''

// 删除线 s command + shift + s
export const strikeClassNames = ''

// 下滑线 u command +  u
export const underlineClassNames = ''

// 高亮块
// export const highlightBlockClassNames = cn(
//   // '[&_[data-type="highlightBlock"]]:p-4',
//   "[&_[data-type='highlightBlock']]:p-4 [&_[data-type='highlightBlock']]:my-4",
//   // 不同颜色的高亮块
//   '[&_.highlightBlock-gray]:bg-gray-100',
//   '[&_.highlightBlock-blue]:bg-blue-500',
//   '[&_.highlightBlock-green]:bg-green-500',
//   '[&_.highlightBlock-purple]:bg-purple-500',
//   '[&_.highlightBlock-orange]:bg-orange-500'
// )

// #endregion

// 统一导出
export const EditorAllClassNames = cn(
  EditorContainerClassNames,
  paragraphClassNames,
  blockquoteClassNames,
  bulletListClassNames,
  codeBlockClassNames,
  headingClassNames,
  horizontalRuleClassNames,
  listItemClassNames,
  orderedListClassNames,
  linkClassNames,
  boldClassNames,
  codeClassNames,
  italicClassNames,
  strikeClassNames,
  underlineClassNames
)
