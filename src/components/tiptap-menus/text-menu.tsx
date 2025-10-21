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
 */

import React from 'react'
import { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'

// --- UI 基础组件 ---
import { ToolbarGroup, ToolbarSeparator } from '@/components/tiptap-ui-primitive/toolbar' // 工具栏相关组件

// --- Tiptap UI 组件 ---
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu' // 标题下拉菜单
import { AIDropdownMenu } from '@/components/tiptap-ui/ai-dropdown-menu/ai-dropdown-menu' // AI 下拉菜单
import { ImageUploadButton } from '@/components/tiptap-ui/image-upload-button' // 图片上传按钮
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu' // 列表下拉菜单
import { BlockquoteButton } from '@/components/tiptap-ui/blockquote-button' // 引用按钮
import { CodeBlockButton } from '@/components/tiptap-ui/code-block-button' // 代码块按钮
import { ColorHighlightPopover, ColorHighlightPopoverButton } from '@/components/tiptap-ui/color-highlight-popover' // 颜色高亮弹窗组件
import { LinkPopover, LinkButton } from '@/components/tiptap-ui/link-popover' // 链接弹窗组件
import { MarkButton } from '@/components/tiptap-ui/mark-button' // 标记按钮（粗体、斜体等）
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button' // 文本对齐按钮
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button' // 撤销重做按钮

// --- 自定义 Hooks ---
import { useTextMenuStates } from './hooks/useTextMenuStates' // 文本菜单状态管理 Hook
import { cn } from '@/lib/utils' // 工具函数：类名合并

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
 *
 * @param {Object} props - 组件属性
 * @param {() => void} props.onHighlighterClick - 高亮按钮点击回调
 * @param {() => void} props.onLinkClick - 链接按钮点击回调
 * @param {boolean} props.isMobile - 是否为移动端设备
 * @returns {JSX.Element} 工具栏内容组件
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
      {/* AI */}
      <ToolbarGroup>
        <AIDropdownMenu></AIDropdownMenu>
      </ToolbarGroup>
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
  // 使用自定义 Hook 获取菜单状态（如是否应该显示菜单等）
  const states = useTextMenuStates(editor)

  return (
    <BubbleMenu
      editor={editor} // 编辑器实例，用于控制菜单的显示逻辑
      options={{
        placement: 'top-start', // 菜单位置：选中文本的上方左对齐
        // 指定滚动目标，确保在编辑器容器滚动时也能更新位置
        scrollTarget: editor.view.dom.closest('.simple-editor-wrapper') as HTMLElement
        // 添加调试信息
        // onUpdate: () => {
        //   console.log('BubbleMenu position updated')
        // },
        // onShow: () => {
        //   console.log('BubbleMenu shown')
        // },
        // onHide: () => {
        //   console.log('BubbleMenu hidden')
        // }
      }}
      shouldShow={states.shouldShow} // 控制菜单是否应该显示的逻辑函数
      updateDelay={0} // 更新延迟：立即更新菜单位置，无延迟
      className={cn(
        // 基础样式：弹性布局、圆角、内边距、阴影
        'flex items-center rounded-md bg-white p-2 shadow-2xl dark:bg-black'
      )}
    >
      {/* 
        文本选择时的气泡菜单内容
        使用完整的 MainToolbarContent 组件，包含所有编辑功能按钮
        传递必要的回调函数和设备类型参数
      */}
      <MainToolbarContent onHighlighterClick={onHighlighterClick} onLinkClick={onLinkClick} isMobile={isMobile} />
    </BubbleMenu>
  )
}

export default TextMenu
