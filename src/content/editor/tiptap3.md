# TipTap 编辑器（3）- 标题和菜单栏

## 前言

TipTap 编辑器提供了强大的菜单栏系统，让用户可以方便地访问各种编辑功能。本文将介绍如何创建和自定义 TipTap 编辑器的菜单栏，包括工具栏按钮、下拉菜单、快捷键等功能的实现。

## 菜单栏基础架构

### 1. 菜单栏组件结构

```tsx
import { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo
} from 'lucide-react'

interface MenuBarProps {
  editor: Editor | null
}

const MenuBar = ({ editor }: MenuBarProps) => {
  if (!editor) return null

  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200 p-2">
      {/* 文本格式化按钮 */}
      <div className="flex gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded p-2 hover:bg-gray-100 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
        >
          <Bold size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded p-2 hover:bg-gray-100 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
        >
          <Italic size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`rounded p-2 hover:bg-gray-100 ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}
        >
          <Underline size={16} />
        </button>
      </div>
    </div>
  )
}
```

### 2. 编辑器集成

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

## 菜单按钮组件

### 1. 基础按钮组件

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

### 2. 文本格式化按钮

```tsx
const TextFormatButtons = ({ editor }: { editor: Editor }) => {
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

### 3. 标题按钮

```tsx
const HeadingButtons = ({ editor }: { editor: Editor }) => {
  return (
    <div className="flex gap-1 border-r border-gray-200 pr-2">
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="标题 1"
      >
        H1
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="标题 2"
      >
        H2
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="标题 3"
      >
        H3
      </MenuButton>
    </div>
  )
}
```

### 4. 列表按钮

```tsx
const ListButtons = ({ editor }: { editor: Editor }) => {
  return (
    <div className="flex gap-1 border-r border-gray-200 pr-2">
      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="无序列表"
      >
        <List size={16} />
      </MenuButton>

      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="有序列表"
      >
        <ListOrdered size={16} />
      </MenuButton>
    </div>
  )
}
```

## 下拉菜单组件

### 1. 颜色选择器

```tsx
import { useState } from 'react'

const ColorPicker = ({ editor }: { editor: Editor }) => {
  const [isOpen, setIsOpen] = useState(false)

  const colors = [
    { name: '黑色', value: '#000000' },
    { name: '红色', value: '#ef4444' },
    { name: '绿色', value: '#22c55e' },
    { name: '蓝色', value: '#3b82f6' },
    { name: '紫色', value: '#a855f7' },
    { name: '橙色', value: '#f97316' }
  ]

  return (
    <div className="relative">
      <MenuButton onClick={() => setIsOpen(!isOpen)} title="文字颜色">
        <div className="h-4 w-4 rounded border bg-black" />
      </MenuButton>

      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <div className="grid grid-cols-3 gap-2">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => {
                  editor.chain().focus().setColor(color.value).run()
                  setIsOpen(false)
                }}
                className="h-8 w-8 rounded border transition-transform hover:scale-110"
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

### 2. 对齐方式选择器

```tsx
const AlignmentPicker = ({ editor }: { editor: Editor }) => {
  const alignments = [
    { name: '左对齐', value: 'left', icon: '←' },
    { name: '居中', value: 'center', icon: '↔' },
    { name: '右对齐', value: 'right', icon: '→' },
    { name: '两端对齐', value: 'justify', icon: '⇔' }
  ]

  return (
    <div className="flex gap-1">
      {alignments.map((alignment) => (
        <MenuButton
          key={alignment.value}
          onClick={() => editor.chain().focus().setTextAlign(alignment.value).run()}
          isActive={editor.isActive({ textAlign: alignment.value })}
          title={alignment.name}
        >
          {alignment.icon}
        </MenuButton>
      ))}
    </div>
  )
}
```

## 快捷键支持

### 1. 键盘快捷键处理

```tsx
import { useEffect } from 'react'

const useKeyboardShortcuts = (editor: Editor) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + B: 粗体
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault()
        editor.chain().focus().toggleBold().run()
      }

      // Ctrl/Cmd + I: 斜体
      if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
        event.preventDefault()
        editor.chain().focus().toggleItalic().run()
      }

      // Ctrl/Cmd + U: 下划线
      if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
        event.preventDefault()
        editor.chain().focus().toggleUnderline().run()
      }

      // Ctrl/Cmd + Z: 撤销
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        editor.chain().focus().undo().run()
      }

      // Ctrl/Cmd + Y 或 Ctrl/Cmd + Shift + Z: 重做
      if (
        ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z')
      ) {
        event.preventDefault()
        editor.chain().focus().redo().run()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editor])
}
```

### 2. 在编辑器中使用

```tsx
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

  useKeyboardShortcuts(editor)

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
```

## 响应式菜单栏

### 1. 移动端适配

```tsx
const ResponsiveMenuBar = ({ editor }: { editor: Editor }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="border-b border-gray-200">
      {/* 桌面端菜单 */}
      <div className="hidden gap-1 p-2 md:flex">
        <TextFormatButtons editor={editor} />
        <HeadingButtons editor={editor} />
        <ListButtons editor={editor} />
        <ColorPicker editor={editor} />
        <AlignmentPicker editor={editor} />
      </div>

      {/* 移动端菜单 */}
      <div className="md:hidden">
        <div className="flex items-center justify-between p-2">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="rounded p-2 hover:bg-gray-100">
            <Menu size={20} />
          </button>

          <div className="flex gap-1">
            <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
              <Bold size={16} />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
            >
              <Italic size={16} />
            </MenuButton>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="border-t border-gray-200 bg-gray-50 p-2">
            <div className="grid grid-cols-2 gap-2">
              <TextFormatButtons editor={editor} />
              <HeadingButtons editor={editor} />
              <ListButtons editor={editor} />
              <ColorPicker editor={editor} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

## 菜单栏样式优化

### 1. 主题适配

```tsx
const MenuBar = ({ editor }: { editor: Editor }) => {
  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        className="${editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-600' : ''} rounded p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <Bold size={16} />
      </MenuButton>
    </div>
  )
}
```

### 2. 动画效果

```tsx
const MenuButton = ({ onClick, isActive, children, title }: MenuButtonProps) => {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded p-2 transition-all duration-200 hover:scale-105 hover:bg-gray-100 active:scale-95 dark:hover:bg-gray-700 ${
        isActive ? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'
      } `}
    >
      {children}
    </button>
  )
}
```

## 总结

TipTap 编辑器的菜单栏系统提供了丰富的功能：

- ✅ **模块化设计** - 每个功能都可以独立开发和维护
- ✅ **响应式支持** - 适配桌面端和移动端
- ✅ **快捷键支持** - 提高编辑效率
- ✅ **主题适配** - 支持亮色和暗色主题
- ✅ **可扩展性** - 易于添加新功能

通过合理的菜单栏设计，可以大大提升用户的编辑体验，让编辑器更加易用和高效。
