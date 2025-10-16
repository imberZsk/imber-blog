import React from 'react'
import { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'

// --- UI 基础组件 ---
import { ToolbarGroup, ToolbarSeparator } from '@/components/tiptap-ui-primitive/toolbar' // 工具栏相关组件

// --- Tiptap UI 组件 ---
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu' // 标题下拉菜单
import { ImageUploadButton } from '@/components/tiptap-ui/image-upload-button' // 图片上传按钮
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu' // 列表下拉菜单
import { BlockquoteButton } from '@/components/tiptap-ui/blockquote-button' // 引用按钮
import { CodeBlockButton } from '@/components/tiptap-ui/code-block-button' // 代码块按钮
import { ColorHighlightPopover, ColorHighlightPopoverButton } from '@/components/tiptap-ui/color-highlight-popover' // 颜色高亮弹窗组件
import { LinkPopover, LinkButton } from '@/components/tiptap-ui/link-popover' // 链接弹窗组件
import { MarkButton } from '@/components/tiptap-ui/mark-button' // 标记按钮（粗体、斜体等）
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button' // 文本对齐按钮
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button' // 撤销重做按钮

interface TextMenuProps {
  editor: Editor
  onHighlighterClick?: () => void
  onLinkClick?: () => void
  isMobile?: boolean
}

/**
 * 主工具栏内容组件
 * 这是编辑器的核心工具栏，包含了所有主要的编辑功能按钮
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
      {/* 第一组：撤销/重做操作 */}
      <ToolbarGroup>
        <UndoRedoButton action="undo" /> {/* 撤销操作 */}
        <UndoRedoButton action="redo" /> {/* 重做操作 */}
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* 第二组：文档结构工具 */}
      <ToolbarGroup>
        {/* 标题下拉菜单：支持 H1-H4 标题 */}
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        {/* 列表下拉菜单：支持无序列表、有序列表、任务列表 */}
        <ListDropdownMenu types={['bulletList', 'orderedList', 'taskList']} portal={isMobile} />
        <BlockquoteButton /> {/* 引用块按钮 */}
        <CodeBlockButton /> {/* 代码块按钮 */}
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* 第三组：文本格式工具 */}
      <ToolbarGroup>
        <MarkButton type="bold" /> {/* 粗体 */}
        <MarkButton type="italic" /> {/* 斜体 */}
        <MarkButton type="strike" /> {/* 删除线 */}
        <MarkButton type="code" /> {/* 行内代码 */}
        <MarkButton type="underline" /> {/* 下划线 */}
        {/* 高亮工具：桌面端显示弹窗，移动端显示按钮 */}
        {!isMobile ? <ColorHighlightPopover /> : <ColorHighlightPopoverButton onClick={onHighlighterClick} />}
        {/* 链接工具：桌面端显示弹窗，移动端显示按钮 */}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* 第四组：上标下标工具 */}
      <ToolbarGroup>
        <MarkButton type="superscript" /> {/* 上标 */}
        <MarkButton type="subscript" /> {/* 下标 */}
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* 第五组：文本对齐工具 */}
      <ToolbarGroup>
        <TextAlignButton align="left" /> {/* 左对齐 */}
        <TextAlignButton align="center" /> {/* 居中对齐 */}
        <TextAlignButton align="right" /> {/* 右对齐 */}
        <TextAlignButton align="justify" /> {/* 两端对齐 */}
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* 第六组：媒体插入工具 */}
      <ToolbarGroup>
        <ImageUploadButton text="Add" /> {/* 图片上传按钮 */}
      </ToolbarGroup>

      {/* 移动端额外分隔线 */}
      {isMobile && <ToolbarSeparator />}
    </>
  )
}

const TextMenu: React.FC<TextMenuProps> = ({
  editor,
  onHighlighterClick = () => {},
  onLinkClick = () => {},
  isMobile = false
}) => {
  if (!editor) return null

  return (
    <>
      {/* 文本选择时的气泡菜单 - 使用完整的 MainToolbarContent */}
      <BubbleMenu editor={editor} options={{ placement: 'bottom', offset: 8, flip: true }}>
        <div className="bubble-menu flex items-center rounded-md bg-white p-2 shadow-2xl dark:bg-black">
          <MainToolbarContent onHighlighterClick={onHighlighterClick} onLinkClick={onLinkClick} isMobile={isMobile} />
        </div>
      </BubbleMenu>
    </>
  )
}

export default TextMenu
