/**
 * CustomFloatingMenu 组件 - 自定义浮动菜单
 *
 * 这是一个使用 Floating UI 直接实现的自定义浮动菜单，用于替代 Tiptap 的 BubbleMenu。
 * 该组件提供了完整的滚动位置更新支持，确保在页面滚动时菜单位置能够正确更新。
 *
 * 主要功能：
 * - 基于 Floating UI 的精确位置计算
 * - 完整的滚动事件监听和位置更新
 * - 与 Tiptap 编辑器的深度集成
 * - 支持多种定位策略和边界检测
 *
 * @author 开发者
 * @version 1.0.0
 * @since 2024
 */

import React, { useEffect, useRef, useState } from 'react'
import { Editor } from '@tiptap/react'
import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom'
import { cn } from '@/lib/utils'
import { useTextMenuStates } from './hooks/useTextMenuStates'

// --- UI 基础组件 ---
import { ToolbarGroup, ToolbarSeparator } from '@/components/tiptap-ui-primitive/toolbar'

// --- Tiptap UI 组件 ---
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu'
import { ImageUploadButton } from '@/components/tiptap-ui/image-upload-button'
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu'
import { BlockquoteButton } from '@/components/tiptap-ui/blockquote-button'
import { CodeBlockButton } from '@/components/tiptap-ui/code-block-button'
import { ColorHighlightPopover, ColorHighlightPopoverButton } from '@/components/tiptap-ui/color-highlight-popover'
import { LinkPopover, LinkButton } from '@/components/tiptap-ui/link-popover'
import { MarkButton } from '@/components/tiptap-ui/mark-button'
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button'
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button'

/**
 * CustomFloatingMenu 组件的属性接口
 */
interface CustomFloatingMenuProps {
  editor: Editor
  onHighlighterClick?: () => void
  onLinkClick?: () => void
  isMobile?: boolean
}

/**
 * 主工具栏内容组件
 *
 * 这是编辑器的核心工具栏，包含了所有主要的编辑功能按钮。
 * 该组件负责渲染工具栏的所有功能按钮，并处理桌面端和移动端的差异化显示。
 *
 * 工具栏功能分组：
 * 1. 撤销/重做操作
 * 2. 文档结构工具（标题、列表、引用、代码块）
 * 3. 文本格式工具（粗体、斜体、下划线、高亮、链接）
 * 4. 上标下标工具
 * 5. 文本对齐工具
 * 6. 媒体插入工具
 */
const MainToolbarContent = ({
  onHighlighterClick = () => {},
  onLinkClick = () => {},
  isMobile = false
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
}) => {
  return (
    <>
      {/* ===== 第一组：撤销/重做操作 ===== */}
      <ToolbarGroup>
        <UndoRedoButton action="undo" /> {/* 撤销操作 - 撤销上一步操作 */}
        <UndoRedoButton action="redo" /> {/* 重做操作 - 重做被撤销的操作 */}
      </ToolbarGroup>
      <ToolbarSeparator /> {/* 分隔线 - 视觉上分隔不同的功能组 */}
      {/* ===== 第二组：文档结构工具 ===== */}
      <ToolbarGroup>
        {/* 标题下拉菜单：支持 H1-H4 标题，用于设置文本的标题级别 */}
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        {/* 列表下拉菜单：支持无序列表、有序列表、任务列表 */}
        <ListDropdownMenu types={['bulletList', 'orderedList', 'taskList']} portal={isMobile} />
        <BlockquoteButton /> {/* 引用块按钮 - 将选中文本转换为引用块 */}
        <CodeBlockButton /> {/* 代码块按钮 - 插入代码块 */}
      </ToolbarGroup>
      <ToolbarSeparator /> {/* 分隔线 */}
      {/* ===== 第三组：文本格式工具 ===== */}
      <ToolbarGroup>
        <MarkButton type="bold" /> {/* 粗体 - 加粗选中文本 */}
        <MarkButton type="italic" /> {/* 斜体 - 将选中文本设为斜体 */}
        <MarkButton type="strike" /> {/* 删除线 - 为选中文本添加删除线 */}
        <MarkButton type="code" /> {/* 行内代码 - 将选中文本设为行内代码格式 */}
        <MarkButton type="underline" /> {/* 下划线 - 为选中文本添加下划线 */}
        {/* 高亮工具：根据设备类型显示不同的UI组件 */}
        {!isMobile ? (
          <ColorHighlightPopover /> // 桌面端：显示颜色高亮弹窗，支持多种颜色选择
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} /> // 移动端：显示高亮按钮
        )}
        {/* 链接工具：根据设备类型显示不同的UI组件 */}
        {!isMobile ? (
          <LinkPopover /> // 桌面端：显示链接弹窗，支持URL输入和编辑
        ) : (
          <LinkButton onClick={onLinkClick} /> // 移动端：显示链接按钮
        )}
      </ToolbarGroup>
      <ToolbarSeparator /> {/* 分隔线 */}
      {/* ===== 第四组：上标下标工具 ===== */}
      <ToolbarGroup>
        <MarkButton type="superscript" /> {/* 上标 - 将选中文本设为上标（如 x²） */}
        <MarkButton type="subscript" /> {/* 下标 - 将选中文本设为下标（如 H₂O） */}
      </ToolbarGroup>
      <ToolbarSeparator /> {/* 分隔线 */}
      {/* ===== 第五组：文本对齐工具 ===== */}
      <ToolbarGroup>
        <TextAlignButton align="left" /> {/* 左对齐 - 文本左对齐 */}
        <TextAlignButton align="center" /> {/* 居中对齐 - 文本居中对齐 */}
        <TextAlignButton align="right" /> {/* 右对齐 - 文本右对齐 */}
        <TextAlignButton align="justify" /> {/* 两端对齐 - 文本两端对齐，自动调整间距 */}
      </ToolbarGroup>
      <ToolbarSeparator /> {/* 分隔线 */}
      {/* ===== 第六组：媒体插入工具 ===== */}
      <ToolbarGroup>
        <ImageUploadButton text="Add" /> {/* 图片上传按钮 - 插入图片到编辑器中 */}
      </ToolbarGroup>
      {/* 移动端额外分隔线 - 仅在移动端显示，用于视觉平衡 */}
      {isMobile && <ToolbarSeparator />}
    </>
  )
}

/**
 * CustomFloatingMenu 主组件
 *
 * 使用 Floating UI 直接实现的自定义浮动菜单，提供完整的滚动位置更新支持。
 * 该组件监听编辑器的选择变化，并在选中文本时显示浮动工具栏。
 *
 * @param {CustomFloatingMenuProps} props - 组件属性
 * @returns {JSX.Element} 自定义浮动菜单组件
 */
const CustomFloatingMenu: React.FC<CustomFloatingMenuProps> = ({
  editor,
  onHighlighterClick = () => {},
  onLinkClick = () => {},
  isMobile = false
}) => {
  // 使用自定义 Hook 获取菜单状态
  const states = useTextMenuStates(editor)

  // 菜单容器引用
  const menuRef = useRef<HTMLDivElement>(null)

  // 是否显示菜单
  const [isVisible, setIsVisible] = useState(false)

  // 菜单位置状态
  const [position, setPosition] = useState({ x: 0, y: 0 })

  /**
   * 更新菜单位置
   * 使用 Floating UI 计算最佳位置
   */
  const updatePosition = async () => {
    if (!menuRef.current || !editor) return

    try {
      // 获取选中文本的边界矩形
      const { from, to } = editor.state.selection
      if (from === to) return

      // 获取选中文本的 DOM 元素
      const start = editor.view.coordsAtPos(from)
      const end = editor.view.coordsAtPos(to)

      // 创建虚拟参考元素
      const referenceElement = {
        getBoundingClientRect: () => ({
          x: Math.min(start.left, end.left),
          y: Math.min(start.top, end.top),
          width: Math.abs(end.left - start.left),
          height: Math.abs(end.bottom - start.top),
          top: Math.min(start.top, end.top),
          right: Math.max(start.right, end.right),
          bottom: Math.max(start.bottom, end.bottom),
          left: Math.min(start.left, end.left)
        })
      }

      // 使用 Floating UI 计算位置
      const { x, y } = await computePosition(referenceElement, menuRef.current, {
        placement: 'top-start',
        middleware: [
          offset(10), // 偏移量
          flip(), // 自动翻转
          shift({ padding: 8 }) // 边界检测
        ]
      })

      setPosition({ x, y })
    } catch (error) {
      console.error('Error updating menu position:', error)
    }
  }

  /**
   * 显示菜单
   */
  const showMenu = () => {
    setIsVisible(true)
    updatePosition()
  }

  /**
   * 隐藏菜单
   */
  const hideMenu = () => {
    setIsVisible(false)
  }

  // 监听编辑器选择变化
  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      if (states.shouldShow({ view: editor.view, from: editor.state.selection.from })) {
        showMenu()
      } else {
        hideMenu()
      }
    }

    // 监听选择更新
    editor.on('selectionUpdate', handleSelectionUpdate)

    // 初始检查
    handleSelectionUpdate()

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
    }
  }, [editor, states.shouldShow])

  // 设置自动位置更新
  useEffect(() => {
    if (!isVisible || !menuRef.current) return

    // 使用 Floating UI 的 autoUpdate 功能
    const cleanup = autoUpdate(
      editor.view.dom, // 参考元素
      menuRef.current, // 浮动元素
      updatePosition
    )

    return cleanup
  }, [isVisible, editor])

  // 监听滚动事件
  useEffect(() => {
    if (!isVisible) return

    const handleScroll = () => {
      console.log('Custom menu scroll update triggered')
      updatePosition()
    }

    // 监听各种滚动事件
    window.addEventListener('scroll', handleScroll, { passive: true })

    // 监听编辑器容器的滚动
    const editorContainer = editor.view.dom.parentElement
    if (editorContainer) {
      editorContainer.addEventListener('scroll', handleScroll, { passive: true })
    }

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (editorContainer) {
        editorContainer.removeEventListener('scroll', handleScroll)
      }
    }
  }, [isVisible, editor])

  // 如果不显示菜单，返回 null
  if (!isVisible) return null

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-50 flex items-center rounded-md bg-white p-2 shadow-2xl dark:bg-black',
        'transition-opacity duration-200'
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateZ(0)' // 启用硬件加速
      }}
    >
      <MainToolbarContent onHighlighterClick={onHighlighterClick} onLinkClick={onLinkClick} isMobile={isMobile} />
    </div>
  )
}

export default CustomFloatingMenu
