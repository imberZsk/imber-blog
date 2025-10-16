# TipTap 编辑器（3）-菜单栏

## 前言

TipTap 编辑器 Notion 风格的时候，需要选中文本提供菜单栏，而不是固定在页面，是动态的，然后支持输入 / 唤醒垂直菜单栏，这些都是 simple tiptap 没有的，需要自己实现。

基于 simple tiptap 的时候，可以把固定的菜单栏引入 [@tiptap/extension-bubble-menu](https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu#element) 扩展里。

## 基础 Demo

### 抽离组件

```tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { MenuBar } from './MenuBar'

const TiptapEditor = () => {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: '<p>Hello World! 🌎️</p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-80 p-4'
      }
    }
  })

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

export default TiptapEditor
```

### 基础按钮组件

```tsx
interface MenuButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
  title?: string
}

const MenuButton = ({ onClick, isActive = false, disabled = false, children, title }: MenuButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded p-2 transition-colors hover:bg-gray-100 ${isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} `}
    >
      {children}
    </button>
  )
}
```

### 菜单栏组件

```tsx
const MenuBar = ({ editor }: { editor: Editor }) => {
  return (
    <div className="flex gap-1 border-r border-gray-200 pr-2">
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="粗体 (Ctrl+B)"
      >
        <Bold size={16} />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="斜体 (Ctrl+I)"
      >
        <Italic size={16} />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="下划线 (Ctrl+U)"
      >
        <Underline size={16} />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="删除线"
      >
        <Strikethrough size={16} />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="行内代码"
      >
        <Code size={16} />
      </MenuButton>
    </div>
  )
}
```

## 基于 simple tiptap

```tsx
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
```
