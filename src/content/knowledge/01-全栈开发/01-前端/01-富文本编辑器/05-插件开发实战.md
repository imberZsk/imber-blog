# TipTap 编辑器（5）- 插件开发实战

## 高亮 Callout 组件

这是 Tiptap 中没有的一个功能，Notion 中是有的，但是我们可以通过自定义插件来实现。
![](/editor/callout.png)

### 功能特性

- 🎨 **多色背景支持**：支持 8 种不同的背景颜色
- 🎯 **图标选择器**：内置 Emoji 选择器，支持分类和搜索
- 🔄 **实时编辑**：点击背景切换颜色，点击图标更换图标
- 📱 **响应式设计**：完美适配桌面端和移动端
- 🌙 **主题支持**：自动适配浅色/深色主题
- 📋 **Notion 兼容**：支持从 Notion 复制粘贴

### 核心实现

#### 1. 扩展定义 (callout-node-extension.ts)

```typescript
import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CalloutNode as CalloutNodeComponent } from '@/components/tiptap-node/callout-node/callout-node'

// 扩展Tiptap核心模块，为Commands接口添加callout相关命令的类型定义
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: { background?: string }) => ReturnType
    }
  }
}

// 创建Callout节点扩展
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  selectable: true,
  atom: false,
  content: '(paragraph)+',
  defining: true,

  addOptions() {
    return {
      defaultIcon: '💡',
      defaultBackground: null
    }
  },

  addAttributes() {
    return {
      icon: {
        default: this.options.defaultIcon,
        parseHTML: (element) => element.dataset.icon || this.options.defaultIcon,
        renderHTML: (attributes) => ({
          'data-icon': attributes.icon
        })
      },
      background: {
        default: null,
        parseHTML: (element) => element.dataset.background || null,
        renderHTML: (attributes) => ({
          'data-background': attributes.background
        })
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'callout' }, 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeComponent)
  },

  addCommands() {
    return {
      setCallout: () => {
        return ({ commands }) => {
          return commands.wrapIn(this.name)
        }
      }
    }
  }
})
```

#### 2. React 组件 (callout-node.tsx)

```typescript
import React, { useState, useEffect, useRef } from 'react'
import { NodeViewWrapper, NodeViewProps, NodeViewContent } from '@tiptap/react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/tiptap-ui-primitive/popover'
import { cn } from '@/lib/utils'
import { calloutEmojisByCategory, colorOptions } from './const'

export const CalloutNode: React.FC<NodeViewProps> = (props) => {
  const { icon, background } = props.node.attrs
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('Callout')
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 处理图标选择
  const handleEmojiClick = (emoji: string) => {
    try {
      if (typeof emoji === 'string' && emoji.trim()) {
        encodeURIComponent(emoji)
        props.updateAttributes({ icon: emoji })
      }
    } catch (error) {
      console.warn('无法更新emoji图标:', error)
    }
  }

  // 处理颜色选择
  const handleColorSelect = (colorValue: string | null, e?: React.MouseEvent) => {
    try {
      if (e) {
        e.stopPropagation()
      }
      props.updateAttributes({ background: colorValue })
      setColorPopoverOpen(false)
    } catch (error) {
      console.warn('无法更新背景颜色:', error)
    }
  }

  // 处理背景点击事件
  const handleBackgroundClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const isEmojiTrigger = target.closest('.absolute.left-3')
    const isPopoverContent = target.closest('[data-popover-content]')
    const isColorSelector = target.closest('.rounded-md.border.border-stone-200')
    const isButton = target.closest('button')

    if (!isEmojiTrigger && !isPopoverContent && !isColorSelector && !isButton) {
      e.stopPropagation()
      setColorPopoverOpen(true)
    }
  }

  // 根据background属性获取对应的背景类
  const getBackgroundClass = () => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    const selectedColor = colorOptions.find((c) => c.value === background)

    if (selectedColor) {
      return selectedColor.light
    }

    return isDarkMode ? 'bg-[#30302e]' : 'bg-stone-50'
  }

  return (
    <NodeViewWrapper
      ref={containerRef}
      className={cn(
        `tiptap-callout relative my-3 cursor-pointer rounded-md py-4 pr-6 pl-10 dark:text-black ${getBackgroundClass()}`
      )}
      style={{ borderLeft: background ? '4px solid var(--tw-border-opacity, 1)' : 'none' }}
      onClick={handleBackgroundClick}
    >
      {/* 颜色选择器弹出层 */}
      {colorPopoverOpen && (
        <div className="absolute -top-1 left-1/2 z-10 flex -translate-x-1/2 -translate-y-full transform gap-2 rounded-md border border-stone-200 bg-white p-1 px-4 py-2 shadow-lg transition-opacity dark:border-stone-300 dark:bg-stone-800">
          {colorOptions.map((color) => (
            <button
              key={color.value || 'default'}
              className={`relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm transition-colors ${color.light}`}
              onClick={(e) => handleColorSelect(color.value, e)}
              aria-label={`选择${color.name}背景`}
            >
              {background === color.value && (
                <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-black/20">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Emoji 选择器 */}
      <Popover>
        <PopoverTrigger asChild>
          <span className="absolute top-7 left-3 -translate-y-1/2 cursor-pointer text-xl">{icon}</span>
        </PopoverTrigger>
        <PopoverContent className="max-h-[300px] max-w-[400px] min-w-[320px] overflow-hidden rounded-md border-0 bg-white p-0 shadow-lg dark:bg-[#252525]">
          {/* 搜索栏 */}
          <div className="border-b border-stone-200 px-4 py-2 dark:border-stone-700">
            <div className="relative">
              <input
                type="text"
                placeholder="Filter..."
                className="w-full rounded-md border-none bg-stone-100 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-stone-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
                  onClick={() => setSearchTerm('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 分类标签 */}
          {!searchTerm && (
            <div className="overflow-x-auto border-b border-stone-200 px-2 py-2 whitespace-nowrap dark:border-stone-700">
              {Object.keys(calloutEmojisByCategory).map((category) => (
                <button
                  key={category}
                  className={`mr-1 cursor-pointer rounded-md px-3 py-1 text-sm transition-colors ${
                    activeCategory === category
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          {/* Emoji网格 */}
          <div className="max-h-[200px] overflow-y-auto p-2">
            <div className="grid grid-cols-8 gap-1">
              {displayEmojis.map((emoji) => (
                <button
                  key={emoji}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-xl transition-colors hover:bg-stone-200 dark:hover:bg-stone-700"
                  onClick={() => handleEmojiClick(emoji)}
                  aria-label={`选择图标 ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {displayEmojis.length === 0 && (
              <div className="py-8 text-center text-stone-500 dark:text-stone-400">没有找到匹配的图标</div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <NodeViewContent />
    </NodeViewWrapper>
  )
}
```

#### 3. 常量定义 (const.ts)

```typescript
// 分类的emoji选项
export const calloutEmojisByCategory = {
  Callout: [
    '💡',
    '📝',
    '❗',
    '⚠️',
    '✨',
    '🔥',
    '🔔',
    '💬',
    '🔍',
    '🎯',
    '✅',
    '❌',
    '💪',
    '🤔',
    '💎',
    '⭐',
    '🌟',
    '💫',
    '🌈',
    '🌊',
    '🌞',
    '❓',
    '❔',
    '💭',
    '💤',
    '💢',
    '💯',
    '🙏'
  ],
  People: [
    '😊',
    '😃',
    '😁',
    '😄',
    '😆',
    '😅',
    '😂',
    '🤣',
    '😉',
    '😎',
    '🤩',
    '😍',
    '🥰',
    '😘',
    '😗',
    '😙',
    '👍',
    '👎',
    '👌',
    '✌️',
    '🤞',
    '🤟',
    '🤘',
    '🤙'
  ],
  Objects: ['📚', '✏️', '📝', '📋', '📄', '📃', '📑', '📊', '🔧', '⚙️', '🔨', '🗜️', '⛏️', '🔩', '⚖️', '⚗️']
}

// 定义背景颜色选项列表
export const colorOptions = [
  { name: '默认', value: null, light: 'bg-stone-50' },
  { name: '蓝色', value: 'blue', light: 'bg-blue-50' },
  { name: '浅蓝色', value: 'light-blue', light: 'bg-sky-50' },
  { name: '绿色', value: 'green', light: 'bg-green-50' },
  { name: '黄色', value: 'yellow', light: 'bg-yellow-50' },
  { name: '橙色', value: 'orange', light: 'bg-orange-50' },
  { name: '粉色', value: 'pink', light: 'bg-pink-50' },
  { name: '紫色', value: 'purple', light: 'bg-purple-50' }
]
```

### 技术亮点

#### 1. **交互设计**

- **点击背景**：打开颜色选择器，支持 8 种背景色
- **点击图标**：打开 Emoji 选择器，支持分类和搜索
- **事件处理**：精确的事件冒泡控制，避免冲突

#### 2. **搜索功能**

- **直接匹配**：支持 Emoji 字符直接搜索
- **分类搜索**：支持按分类名称搜索
- **关键词搜索**：支持 `light`、`warning`、`success` 等关键词

#### 3. **主题适配**

- **自动检测**：根据 `document.documentElement.classList.contains('dark')` 检测主题
- **动态样式**：根据主题动态应用对应的背景色
- **一致性**：与整体设计系统保持一致

#### 4. **无障碍支持**

- **ARIA 标签**：为所有交互元素添加适当的 `aria-label`
- **键盘导航**：支持键盘操作
- **语义化**：使用语义化的 HTML 结构

### 使用方式

```typescript
// 在编辑器中添加 Callout
editor.commands.setCallout()

// 设置特定背景色的 Callout
editor.commands.setCallout({ background: 'blue' })
```
