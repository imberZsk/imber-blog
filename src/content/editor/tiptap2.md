# TipTap 编辑器（2）- 样式隔离

## 前言

在开发富文本编辑器时，样式隔离是一个至关重要的问题。编辑器的样式需要与页面其他部分的样式完全隔离，避免相互影响。同时，编辑器内部的各种组件（如标题、段落、列表等）也需要有统一的样式管理方案。

本文将介绍如何基于 Tailwind CSS 实现 TipTap 编辑器的样式隔离，提供一个可扩展、易维护的样式架构方案。

## 样式隔离面临的挑战

### 1. 全局样式污染

编辑器运行在页面环境中，容易受到全局 CSS 样式的影响：

- 页面的 `h1`、`h2` 等标题样式可能影响编辑器内的标题显示
- 全局的 `p`、`ul`、`ol` 等元素样式会干扰编辑器内容
- 第三方组件库的样式可能意外影响编辑器

### 2. 编辑器样式泄露

编辑器内部的样式可能影响页面其他部分：

- 编辑器的字体、颜色设置可能影响页面布局
- 编辑器的边距、内边距设置可能破坏页面设计
- 编辑器的主题切换可能影响页面其他组件

### 3. 主题兼容性问题

编辑器需要支持多种主题，同时与页面主题保持一致：

- 亮色/暗色主题切换时，编辑器样式需要同步更新
- 不同主题下的颜色对比度需要符合可访问性标准
- 主题切换时的过渡动画需要平滑自然

### 4. 组件嵌套样式冲突

编辑器内部组件之间的样式可能相互冲突：

- 多级列表的嵌套样式问题
- 自定义组件（如高亮块、分栏）与基础组件的样式冲突
- 组件间距的上下边距重叠问题

## 基于 Tailwind 的样式隔离方案

### 核心设计理念

我们的样式隔离方案基于以下核心理念：

1. **完全无 CSS 方案** - 所有样式都通过 Tailwind 类名实现，避免自定义 CSS 文件
2. **作用域隔离** - 使用 Tailwind 的作用域前缀确保样式不会泄露
3. **主题一致性** - 编辑器主题与页面主题保持同步
4. **可扩展性** - 支持多种主题和自定义样式

### 1. 样式抽离

首先，我们需要把样式抽离出去，方便维护，也就是当前目录下的 style.ts：

```tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import './tiptap.css'

// 样式组件化
import { EditorAllClassNames } from './style'

const Tiptap = () => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: `Write something, ' / ' for commands…`
      })
    ],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-80'
      }
    }
  })

  return <EditorContent editor={editor} className={EditorAllClassNames} />
}

export default Tiptap
```

### 2. prosemirror-devtools

然后按谷歌插件，prosemirror-devtools，来依次写样式，这样可以知道编辑器已经有哪些扩展，也避免某些扩展没有写到样式，对于不需要样式的我们也写个空串，cn 函数会帮我们优化类名问题

![prosemirror-devtools](/Users/meizu/Desktop/imber-blog/public/md/prosemirror-devtools.png)

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 3. 组件样式定义

style.ts 定义样式

```javascript
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
```

### 4. 其它复杂样式

这里我选择新建一个 tiptap.css 来写复杂的样式，比如下面是 placeholder 需要的样式

```css
/* CSS 变量定义 */
:root {
  --placeholder: #adb5bd;
}

.dark {
  --placeholder: #6b7280;
}

/* editor placeholder */
.tiptap p.is-empty::before {
  color: var(--placeholder);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
```

### 5. 主题切换

## 总结

基于 Tailwind CSS 的样式隔离方案为 TipTap 编辑器提供了一个完整、可扩展的样式管理解决方案。通过使用作用域前缀、CSS 变量主题系统和组件化样式管理，我们实现了：

- ✅ 完全的样式隔离，避免与页面样式冲突
- ✅ 主题一致性，编辑器与页面主题同步切换
- ✅ 可扩展性，支持自定义扩展和主题
- ✅ 维护性，集中管理样式定义
- ✅ 性能优化，按需加载和 JIT 编译

这个方案不仅解决了样式隔离的问题，还为后续的功能扩展和主题定制提供了良好的基础架构。在实际项目中，你可以根据具体需求调整样式定义和扩展配置，打造出符合项目特色的富文本编辑器。
