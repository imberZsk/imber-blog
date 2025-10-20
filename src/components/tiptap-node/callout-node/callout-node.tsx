import React, { useState, useEffect, useRef } from 'react'
import { NodeViewWrapper, NodeViewProps, NodeViewContent } from '@tiptap/react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/tiptap-ui-primitive/popover'
import '@/components/tiptap-node/callout-node/callout-node.scss'
import { cn } from '@/lib/utils'
import { calloutEmojisByCategory, colorOptions } from './const'

// 获取所有emoji列表
const getAllEmojis = () => {
  return Object.values(calloutEmojisByCategory).flat()
}

export const CalloutNode: React.FC<NodeViewProps> = (props) => {
  const { icon, background } = props.node.attrs
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('Callout')
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleEmojiClick = (emoji: string) => {
    try {
      // 确保emoji是有效的字符串并可以安全编码
      if (typeof emoji === 'string' && emoji.trim()) {
        // 尝试编码以验证emoji的有效性
        encodeURIComponent(emoji)
        // 更新callout的图标属性
        props.updateAttributes({ icon: emoji })
      }
    } catch (error) {
      console.warn('无法更新emoji图标:', error)
    }
  }

  // 处理颜色选择
  const handleColorSelect = (colorValue: string | null, e?: React.MouseEvent) => {
    try {
      // 阻止事件冒泡，防止触发背景点击事件
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
    // 如果点击的是Popover触发器或其内容，或者点击了其他交互元素，则不触发颜色选择器
    const target = e.target as HTMLElement

    // 检查是否点击了emoji触发器区域
    const isEmojiTrigger = target.closest('.absolute.left-3')

    // 检查是否点击了Popover内容区域
    const isPopoverContent = target.closest('[data-popover-content]')

    // 检查是否点击了颜色选择器按钮
    const isColorSelector = target.closest('.rounded-md.border.border-stone-200')

    // 检查是否点击了其他按钮
    const isButton = target.closest('button')

    // 只有当没有点击任何交互元素时，才触发颜色选择器
    if (!isEmojiTrigger && !isPopoverContent && !isColorSelector && !isButton) {
      // 阻止事件冒泡，防止与其他组件交互
      e.stopPropagation()
      setColorPopoverOpen(true)
    }
  }

  // 点击外部关闭颜色选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setColorPopoverOpen(false)
      }
    }

    // 添加事件监听器
    if (colorPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    // 清理函数
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [colorPopoverOpen])

  // 根据background属性和暗色模式获取对应的背景类
  const getBackgroundClass = () => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    const selectedColor = colorOptions.find((c) => c.value === background)

    if (selectedColor) {
      return selectedColor.light
    }

    // 默认背景
    return isDarkMode ? 'bg-[#30302e]' : 'bg-stone-50'
  }

  // 根据搜索词过滤emoji
  const filterEmojis = (emojis: string[]) => {
    if (!searchTerm.trim()) return emojis

    // 转换搜索词为小写进行不区分大小写的匹配
    const lowerSearchTerm = searchTerm.toLowerCase()

    // 方法1: 尝试直接匹配emoji字符
    const directMatches = emojis.filter((emoji) => emoji.includes(searchTerm))
    if (directMatches.length > 0) return directMatches

    // 方法2: 支持按emoji分类名称搜索
    if (Object.keys(calloutEmojisByCategory).some((category) => category.toLowerCase().includes(lowerSearchTerm))) {
      // 如果搜索词匹配某个分类名称，返回该分类的所有emoji
      const matchedCategory = Object.keys(calloutEmojisByCategory).find((category) =>
        category.toLowerCase().includes(lowerSearchTerm)
      )
      if (matchedCategory) {
        return calloutEmojisByCategory[matchedCategory as keyof typeof calloutEmojisByCategory]
      }
    }

    // 方法3: 特殊关键词匹配
    const keywordMap: { [key: string]: string[] } = {
      light: ['💡', '✨', '🌟', '💫'],
      warning: ['⚠️', '❗'],
      success: ['✅', '🎉'],
      fail: ['❌', '❓'],
      idea: ['💡', '🤔', '💭'],
      fire: ['🔥'],
      star: ['⭐', '🌟'],
      people: Object.values(calloutEmojisByCategory.People),
      object: Object.values(calloutEmojisByCategory.Objects),
      callout: Object.values(calloutEmojisByCategory.Callout)
    }

    // 检查是否有匹配的关键词
    for (const [keyword, emojiList] of Object.entries(keywordMap)) {
      if (keyword.includes(lowerSearchTerm)) {
        // 过滤出emojiList中存在于传入数组中的emoji
        return emojis.filter((emoji) => emojiList.includes(emoji))
      }
    }

    return [] // 没有匹配项
  }

  // 获取要显示的emoji列表
  const displayEmojis = searchTerm
    ? filterEmojis(getAllEmojis())
    : calloutEmojisByCategory[activeCategory as keyof typeof calloutEmojisByCategory]

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
