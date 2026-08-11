# TipTap 编辑器（3）- 菜单栏和 slash command

# 一、前言

TipTap 编辑器 Notion 风格的时候，需要选中文本提供菜单栏，而不是固定在页面，是动态的，然后支持输入 / 唤醒垂直菜单栏，这些都是 simple tiptap 没有的，需要自己实现。

基于 simple tiptap 的时候，可以把固定的菜单栏引入 [@tiptap/extension-bubble-menu](https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu#element) 扩展里。

# 二、基础 Demo

## 2.1 抽离组件

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

## 2.2 基础按钮组件

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

## 2.3 菜单栏组件

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

# 三、基于 simple tiptap

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

# 四、slash command

参考官网的 Demo，基于 @tiptap/suggestion 实现，功能复杂，addProseMirrorPlugins 添加原生的插件

```js
import { Editor, Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import tippy from 'tippy.js'

import { GROUPS } from './groups'
import { MenuList } from './MenuList'

// 扩展名称常量
const extensionName = 'slashCommand'

// 全局弹窗实例，用于显示命令菜单
let popup: any

/**
 * SlashCommand 扩展
 * 实现类似 Notion 的斜杠命令功能，用户输入 "/" 后可以快速插入各种内容块
 */
export const SlashCommand = Extension.create({
  name: extensionName,

  // 设置较高的优先级，确保在其他扩展之前加载
  priority: 200,

  /**
   * 扩展创建时的初始化
   * 创建 tippy.js 弹窗实例，用于显示命令菜单
   */
  onCreate() {
    popup = tippy('body', {
      interactive: true, // 允许用户与弹窗交互
      trigger: 'manual', // 手动控制显示/隐藏
      placement: 'bottom-start', // 弹窗位置：下方左对齐
      theme: 'slash-command', // 自定义主题
      maxWidth: '16rem', // 最大宽度
      offset: [16, 8], // 偏移量 [垂直, 水平]
      popperOptions: {
        strategy: 'fixed', // 使用 fixed 定位策略
        modifiers: [
          {
            name: 'flip', // 禁用自动翻转，保持固定位置
            enabled: false
          }
        ]
      }
    })
  },

  /**
   * 添加 ProseMirror 插件
   * 使用 Suggestion 插件实现斜杠命令功能
   */
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/', // 触发字符
        allowSpaces: true, // 允许空格
        startOfLine: true, // 必须在行首
        pluginKey: new PluginKey(extensionName),

        /**
         * 判断是否允许显示建议菜单
         * @param state - 编辑器状态
         * @param range - 选择范围
         * @returns 是否允许显示菜单
         */
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from)
          const isRootDepth = $from.depth === 1 // 在根层级
          const isParagraph = $from.parent.type.name === 'paragraph' // 在段落中
          const isStartOfNode = $from.parent.textContent?.charAt(0) === '/' // 以 "/" 开头
          // TODO: 列布局支持
          const isInColumn = this.editor.isActive('column') // 在列布局中

          // 检查 "/" 后的内容是否有效（不能以双空格结尾）
          const afterContent = $from.parent.textContent?.substring($from.parent.textContent?.indexOf('/'))
          const isValidAfterContent = !afterContent?.endsWith('  ')

          return (
            ((isRootDepth && isParagraph && isStartOfNode) || (isInColumn && isParagraph && isStartOfNode)) &&
            isValidAfterContent
          )
        },
        /**
         * 执行选中的命令
         * 删除斜杠命令文本，然后执行对应的动作
         * @param editor - 编辑器实例
         * @param props - 命令属性
         */
        command: ({ editor, props }: { editor: Editor; props: any }) => {
          const { view, state } = editor
          const { $head, $from } = view.state.selection

          const end = $from.pos
          // 计算斜杠命令的起始位置
          const from = $head?.nodeBefore
            ? end - ($head.nodeBefore.text?.substring($head.nodeBefore.text?.indexOf('/')).length ?? 0)
            : $from.start()

          // 删除斜杠命令文本
          const tr = state.tr.deleteRange(from, end)
          view.dispatch(tr)

          // 执行命令对应的动作
          props.action(editor)
          view.focus()
        },
        /**
         * 根据查询字符串过滤和返回命令项
         * @param query - 用户输入的查询字符串
         * @returns 过滤后的命令组
         */
        items: ({ query }: { query: string }) => {
          // 根据查询字符串过滤命令
          const withFilteredCommands = GROUPS.map((group) => ({
            ...group,
            commands: group.commands
              .filter((item) => {
                const labelNormalized = item.label.toLowerCase().trim()
                const queryNormalized = query.toLowerCase().trim()

                // 支持别名搜索
                if (item.aliases) {
                  const aliases = item.aliases.map((alias) => alias.toLowerCase().trim())
                  return labelNormalized.includes(queryNormalized) || aliases.includes(queryNormalized)
                }

                return labelNormalized.includes(queryNormalized)
              })
              // 过滤掉应该隐藏的命令
              .filter((command) => (command.shouldBeHidden ? !command.shouldBeHidden(this.editor) : true))
          }))

          // 移除空的命令组
          const withoutEmptyGroups = withFilteredCommands.filter((group) => {
            return group.commands.length > 0
          })

          // 为所有命令设置启用状态
          const withEnabledSettings = withoutEmptyGroups.map((group) => ({
            ...group,
            commands: group.commands.map((command) => ({
              ...command,
              isEnabled: true
            }))
          }))

          return withEnabledSettings
        },
        /**
         * 渲染建议菜单
         * 返回生命周期方法对象，处理菜单的显示、更新、隐藏等
         */
        render: () => {
          let component: any
          let scrollHandler: (() => void) | null = null

          return {
            /**
             * 菜单开始显示时的处理
             * @param props - 建议属性
             */
            onStart: (props: SuggestionProps) => {
              // 创建 React 组件渲染器
              component = new ReactRenderer(MenuList, {
                props,
                editor: props.editor
              })

              const { view } = props.editor

              /**
               * 获取参考元素的客户端矩形
               * 用于定位弹窗位置
               */
              const getReferenceClientRect = () => {
                if (!props.clientRect) {
                  // 防止类型报错: 显式指定 any
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error
                  return props.editor.storage[extensionName]?.rect
                }

                const rect = props.clientRect()

                if (!rect) {
                  // 尝试安全访问已缓存的 rect，避免类型报错
                  // const storage: Record<string, any> = props.editor.storage as Record<string, any>
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error
                  return storage[extensionName]?.rect ?? new DOMRect(0, 0, 0, 0)
                }

                let yPos = rect.y

                // 如果菜单会超出屏幕底部，则向上调整位置
                if (rect.top + component.element.offsetHeight + 40 > window.innerHeight) {
                  const diff = rect.top + component.element.offsetHeight - window.innerHeight + 40
                  yPos = rect.y - diff
                }

                return new DOMRect(rect.x, yPos, rect.width, rect.height)
              }

              // 滚动时更新弹窗位置
              scrollHandler = () => {
                popup?.[0].setProps({
                  getReferenceClientRect
                })
              }

              // 监听滚动事件
              view.dom.parentElement?.addEventListener('scroll', scrollHandler)

              // 配置并显示弹窗
              popup?.[0].setProps({
                getReferenceClientRect,
                appendTo: () => document.body,
                content: component.element
              })

              popup?.[0].show()
            },

            /**
             * 菜单更新时的处理
             * @param props - 建议属性
             */
            onUpdate(props: SuggestionProps) {
              // 更新组件属性
              component.updateProps(props)

              const { view } = props.editor

              /**
               * 获取参考元素的客户端矩形
               * 与 onStart 中的逻辑相同
               */
              const getReferenceClientRect = () => {
                if (!props.clientRect) {
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error
                  return props.editor.storage[extensionName].rect
                }

                const rect = props.clientRect()

                if (!rect) {
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error
                  return props.editor.storage[extensionName].rect
                }

                let yPos = rect.y

                // 防止菜单超出屏幕底部
                if (rect.top + component.element.offsetHeight + 40 > window.innerHeight) {
                  const diff = rect.top + component.element.offsetHeight - window.innerHeight + 40
                  yPos = rect.y - diff
                }

                return new DOMRect(rect.x, yPos, rect.width, rect.height)
              }

              // 滚动处理函数
              const scrollHandler = () => {
                popup?.[0].setProps({
                  getReferenceClientRect
                })
              }

              view.dom.parentElement?.addEventListener('scroll', scrollHandler)

              // 更新存储的矩形信息

              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              props.editor.storage[extensionName].rect = props.clientRect
                ? getReferenceClientRect()
                : {
                    width: 0,
                    height: 0,
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0
                  }

              // 更新弹窗属性
              popup?.[0].setProps({
                getReferenceClientRect
              })
            },

            /**
             * 键盘事件处理
             * @param props - 键盘事件属性
             * @returns 是否阻止默认行为
             */
            onKeyDown(props: SuggestionKeyDownProps) {
              // ESC 键隐藏菜单
              if (props.event.key === 'Escape') {
                popup?.[0].hide()
                return true
              }

              // 如果菜单未显示，则显示它
              if (!popup?.[0].state.isShown) {
                popup?.[0].show()
              }

              // 将键盘事件传递给组件处理
              return component.ref?.onKeyDown(props)
            },

            /**
             * 菜单退出时的清理工作
             * @param props - 建议属性
             */
            onExit(props) {
              // 隐藏弹窗
              popup?.[0].hide()

              // 移除滚动事件监听器
              if (scrollHandler) {
                const { view } = props.editor
                view.dom.parentElement?.removeEventListener('scroll', scrollHandler)
              }

              // 销毁组件
              component.destroy()
            }
          }
        }
      })
    ]
  },

  /**
   * 添加扩展存储
   * 用于存储弹窗位置信息
   */
  addStorage() {
    return {
      rect: {
        width: 0,
        height: 0,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
      }
    }
  }
})

export default SlashCommand

```

# 五、总结

- **slash command**：参考官网的 Demo，基于 @tiptap/suggestion 实现，功能复杂，addProseMirrorPlugins 添加原生的插件
- **前言**：TipTap 编辑器 Notion 风格的时候，需要选中文本提供菜单栏，而不是固定在页面，是动态的，然后支持输入 / 唤醒垂直菜单栏，这些都是 simple tiptap 没有的，需要自己实现。

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“TipTap 编辑器（3）- 菜单栏和 slash command”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
