'use client'

import * as React from 'react'

// --- Tiptap UI ---
import type { UseBlockquoteConfig } from '@/components/tiptap-ui/blockquote-button'
import { BLOCKQUOTE_SHORTCUT_KEY, useBlockquote } from '@/components/tiptap-ui/blockquote-button'

// --- Hooks ---
import { useTiptapEditor } from '@/hooks/use-tiptap-editor'

// --- Lib ---
import { parseShortcutKeys } from '@/lib/tiptap-utils'

// --- UI Primitives ---
import type { ButtonProps } from '@/components/tiptap-ui-primitive/button'
import { Button } from '@/components/tiptap-ui-primitive/button'
import { Badge } from '@/components/tiptap-ui-primitive/badge'

/**
 * Blockquote 按钮组件的属性接口
 * 继承自 ButtonProps 和 UseBlockquoteConfig，但排除了 type 属性
 */
export interface BlockquoteButtonProps extends Omit<ButtonProps, 'type'>, UseBlockquoteConfig {
  /**
   * 可选文本，显示在图标旁边
   */
  text?: string
  /**
   * 是否在按钮中显示快捷键提示
   * @default false
   */
  showShortcut?: boolean
}

/**
 * 显示快捷键提示的徽章组件
 * @param shortcutKeys - 快捷键字符串，默认为 BLOCKQUOTE_SHORTCUT_KEY
 * @returns 渲染快捷键徽章的 React 组件
 */
export function BlockquoteShortcutBadge({ shortcutKeys = BLOCKQUOTE_SHORTCUT_KEY }: { shortcutKeys?: string }) {
  return <Badge>{parseShortcutKeys({ shortcutKeys })}</Badge>
}

/**
 * 用于在 Tiptap 编辑器中切换 blockquote（引用块）格式的按钮组件
 *
 * 该组件封装了 blockquote 的切换逻辑，提供了完整的 UI 和交互功能。
 * 如果需要自定义按钮实现，请使用 `useBlockquote` hook 代替。
 *
 * @example
 * ```tsx
 * <BlockquoteButton
 *   text="引用"
 *   showShortcut={true}
 *   hideWhenUnavailable={true}
 *   onToggled={() => console.log('引用已切换')}
 * />
 * ```
 */
export const BlockquoteButton = React.forwardRef<HTMLButtonElement, BlockquoteButtonProps>(
  (
    {
      editor: providedEditor,
      text,
      hideWhenUnavailable = false,
      onToggled,
      showShortcut = false,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    // 获取 Tiptap 编辑器实例（如果未提供则从上下文获取）
    const { editor } = useTiptapEditor(providedEditor)

    // 使用 blockquote hook 获取相关状态和方法
    const {
      isVisible, // 按钮是否可见
      canToggle, // 是否可以切换 blockquote
      isActive, // 当前是否处于 blockquote 状态
      handleToggle, // 切换 blockquote 的处理函数
      label, // 按钮的标签文本
      shortcutKeys, // 快捷键字符串
      Icon // 图标组件
    } = useBlockquote({
      editor,
      hideWhenUnavailable,
      onToggled
    })

    // 处理按钮点击事件
    // 先执行外部传入的 onClick，如果事件被阻止则不再执行切换
    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        // 如果外部处理函数阻止了默认行为，则不执行切换
        if (event.defaultPrevented) return
        handleToggle()
      },
      [handleToggle, onClick]
    )

    // 如果按钮不可见，则不渲染
    if (!isVisible) {
      return null
    }

    return (
      <Button
        type="button"
        data-style="ghost" // 使用幽灵样式
        data-active-state={isActive ? 'on' : 'off'} // 标记激活状态
        role="button"
        tabIndex={-1} // 从键盘导航中排除
        disabled={!canToggle} // 根据是否可以切换设置禁用状态
        data-disabled={!canToggle} // 数据属性用于样式控制
        aria-label={label} // 无障碍标签
        aria-pressed={isActive} // 无障碍：按钮是否被按下
        tooltip="Blockquote" // 工具提示文本
        onClick={handleClick}
        {...buttonProps}
        ref={ref}
      >
        {/* 如果提供了自定义 children，则使用自定义内容，否则使用默认内容 */}
        {children ?? (
          <>
            {/* 显示 blockquote 图标 */}
            <Icon className="tiptap-button-icon" />
            {/* 如果提供了文本，则显示文本 */}
            {text && <span className="tiptap-button-text">{text}</span>}
            {/* 如果需要显示快捷键，则显示快捷键徽章 */}
            {showShortcut && <BlockquoteShortcutBadge shortcutKeys={shortcutKeys} />}
          </>
        )}
      </Button>
    )
  }
)

BlockquoteButton.displayName = 'BlockquoteButton'
