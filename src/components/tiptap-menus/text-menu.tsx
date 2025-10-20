/**
 * TextMenu 组件 - 富文本编辑器的气泡菜单
 *
 * 这是一个基于 Tiptap 的富文本编辑器气泡菜单组件，当用户选中文本时会显示一个悬浮工具栏。
 * 该组件提供了完整的文本编辑功能，包括格式化、对齐、列表、标题等。
 *
 * 主要功能：
 * - 文本格式化（粗体、斜体、下划线等）
 * - 标题和列表管理
 * - 文本对齐
 * - 链接和高亮
 * - 图片上传
 * - 撤销/重做操作
 *
 * @author 开发者
 * @version 1.0.0
 * @since 2024
 */

import React from 'react'
import { Editor } from '@tiptap/react'
import CustomFloatingMenu from './custom-floating-menu'

// 所有 UI 组件已移动到 CustomFloatingMenu 中

// --- 自定义 Hooks ---
// import { useTextMenuStates } from './hooks/useTextMenuStates' // 文本菜单状态管理 Hook
// import { cn } from '@/lib/utils' // 工具函数：类名合并

/**
 * TextMenu 组件的属性接口
 *
 * @interface TextMenuProps
 * @property {Editor} editor - Tiptap 编辑器实例，用于控制编辑器的各种操作
 * @property {() => void} [onHighlighterClick] - 高亮按钮点击回调函数（可选）
 * @property {() => void} [onLinkClick] - 链接按钮点击回调函数（可选）
 * @property {boolean} [isMobile] - 是否为移动端设备，影响 UI 布局和交互方式（可选，默认为 false）
 */
interface TextMenuProps {
  editor: Editor
  onHighlighterClick?: () => void
  onLinkClick?: () => void
  isMobile?: boolean
}

// MainToolbarContent 组件已移动到 CustomFloatingMenu 中

/**
 * TextMenu 主组件
 *
 * 这是富文本编辑器的气泡菜单主组件，负责管理菜单的显示逻辑和用户交互。
 * 当用户选中文本时，会显示一个悬浮工具栏，提供各种文本编辑功能。
 *
 * 主要功能：
 * - 监听文本选择状态，控制菜单的显示/隐藏
 * - 管理选择过程中的视觉反馈
 * - 处理桌面端和移动端的差异化显示
 * - 集成所有文本编辑功能按钮
 *
 * @param {TextMenuProps} props - 组件属性
 * @returns {JSX.Element} 气泡菜单组件
 */
const TextMenu: React.FC<TextMenuProps> = ({
  editor,
  onHighlighterClick = () => {},
  onLinkClick = () => {},
  isMobile = false
}) => {
  // 使用自定义的浮动菜单组件，提供完整的滚动位置更新支持
  return (
    <CustomFloatingMenu
      editor={editor}
      onHighlighterClick={onHighlighterClick}
      onLinkClick={onLinkClick}
      isMobile={isMobile}
    />
  )
}

/**
 * 导出 TextMenu 组件
 *
 * 这是富文本编辑器的气泡菜单组件，提供完整的文本编辑功能。
 * 当用户选中文本时，会显示一个悬浮工具栏，包含格式化、对齐、列表等功能。
 *
 * 使用示例：
 * ```tsx
 * <TextMenu
 *   editor={editor}
 *   isMobile={false}
 *   onHighlighterClick={() => console.log('高亮点击')}
 *   onLinkClick={() => console.log('链接点击')}
 * />
 * ```
 */
export default TextMenu
