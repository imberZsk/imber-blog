'use client'

import * as React from 'react'
import { EditorContent, EditorContext, useEditor } from '@tiptap/react'

// --- Tiptap 核心扩展 ---
import { StarterKit } from '@tiptap/starter-kit' // 基础功能包：段落、标题、粗体、斜体等
import { Image } from '@tiptap/extension-image' // 图片插入功能
import { TaskItem, TaskList } from '@tiptap/extension-list' // 任务列表功能
import { TextAlign } from '@tiptap/extension-text-align' // 文本对齐功能
import { Typography } from '@tiptap/extension-typography' // 排版优化（如引号、破折号等）
import { Highlight } from '@tiptap/extension-highlight' // 文本高亮功能
import { Subscript } from '@tiptap/extension-subscript' // 下标功能
import { Superscript } from '@tiptap/extension-superscript' // 上标功能
import { Selection } from '@tiptap/extensions' // 选择功能增强

// --- UI 基础组件 ---
import { Button } from '@/components/tiptap-ui-primitive/button' // 按钮组件
import { Spacer } from '@/components/tiptap-ui-primitive/spacer' // 间距组件
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '@/components/tiptap-ui-primitive/toolbar' // 工具栏相关组件

// --- Tiptap 节点组件 ---
import { ImageUploadNode } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension' // 图片上传节点
import { HorizontalRule } from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension' // 水平分割线节点
import '@/components/tiptap-node/blockquote-node/blockquote-node.scss' // 引用块样式
import '@/components/tiptap-node/code-block-node/code-block-node.scss' // 代码块样式
import '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss' // 分割线样式
import '@/components/tiptap-node/list-node/list-node.scss' // 列表样式
import '@/components/tiptap-node/image-node/image-node.scss' // 图片样式
import '@/components/tiptap-node/heading-node/heading-node.scss' // 标题样式
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss' // 段落样式

// --- Tiptap UI 组件 ---
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu' // 标题下拉菜单
import { ImageUploadButton } from '@/components/tiptap-ui/image-upload-button' // 图片上传按钮
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu' // 列表下拉菜单
import { BlockquoteButton } from '@/components/tiptap-ui/blockquote-button' // 引用按钮
import { CodeBlockButton } from '@/components/tiptap-ui/code-block-button' // 代码块按钮
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton
} from '@/components/tiptap-ui/color-highlight-popover' // 颜色高亮弹窗组件
import { LinkPopover, LinkContent, LinkButton } from '@/components/tiptap-ui/link-popover' // 链接弹窗组件
import { MarkButton } from '@/components/tiptap-ui/mark-button' // 标记按钮（粗体、斜体等）
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button' // 文本对齐按钮
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button' // 撤销重做按钮

// --- 图标组件 ---
import { ArrowLeftIcon } from '@/components/tiptap-icons/arrow-left-icon' // 左箭头图标
import { HighlighterIcon } from '@/components/tiptap-icons/highlighter-icon' // 高亮图标
import { LinkIcon } from '@/components/tiptap-icons/link-icon' // 链接图标

// --- 自定义 Hooks ---
import { useIsMobile } from '@/hooks/use-mobile' // 检测是否为移动设备
import { useWindowSize } from '@/hooks/use-window-size' // 获取窗口尺寸
import { useCursorVisibility } from '@/hooks/use-cursor-visibility' // 光标可见性管理

// --- 其他组件 ---
import { ThemeToggle } from '@/components/tiptap-templates/simple/theme-toggle' // 主题切换组件

// --- 工具函数 ---
import { handleImageUpload, MAX_FILE_SIZE } from '@/lib/tiptap-utils' // 图片上传处理函数

// --- 样式文件 ---
import '@/components/tiptap-templates/simple/simple-editor.scss' // 编辑器主样式

import content from '@/components/tiptap-templates/simple/data/content.json'

/**
 * 主工具栏内容组件
 * 这是编辑器的核心工具栏，包含了所有主要的编辑功能按钮
 *
 * @param onHighlighterClick - 移动端高亮按钮点击回调
 * @param onLinkClick - 移动端链接按钮点击回调
 * @param isMobile - 是否为移动设备
 */
const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
}) => {
  return (
    <>
      {/* 左侧弹性间距，将工具栏内容推到中间 */}
      <Spacer />

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

      {/* 右侧弹性间距，平衡布局 */}
      <Spacer />

      {/* 移动端额外分隔线 */}
      {isMobile && <ToolbarSeparator />}

      {/* 第七组：主题切换工具 */}
      <ToolbarGroup>
        <ThemeToggle /> {/* 明暗主题切换 */}
      </ToolbarGroup>
    </>
  )
}

/**
 * 移动端工具栏内容组件
 * 这是移动端的专用工具栏，用于显示高亮或链接功能的详细操作界面
 * 由于移动端屏幕空间有限，将复杂功能（高亮、链接）单独展示
 *
 * @param type - 工具栏类型：'highlighter' 高亮工具 或 'link' 链接工具
 * @param onBack - 返回主工具栏的回调函数
 */
const MobileToolbarContent = ({ type, onBack }: { type: 'highlighter' | 'link'; onBack: () => void }) => (
  <>
    {/* 返回按钮组：显示当前功能类型并支持返回 */}
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {/* 根据类型显示对应的图标 */}
        {type === 'highlighter' ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {/* 功能内容区域：根据类型显示不同的操作界面 */}
    {type === 'highlighter' ? (
      /* 高亮工具内容：颜色选择器、高亮样式等 */
      <ColorHighlightPopoverContent />
    ) : (
      /* 链接工具内容：链接输入框、链接设置等 */
      <LinkContent />
    )}
  </>
)

/**
 * SimpleEditor 主组件
 * 这是 Tiptap 富文本编辑器的核心组件，集成了所有编辑功能和响应式设计
 *
 * 主要功能：
 * - 完整的富文本编辑功能（标题、列表、格式、对齐等）
 * - 响应式设计，支持桌面端和移动端
 * - 智能工具栏定位，避免遮挡编辑内容
 * - 图片上传和管理
 * - 主题切换支持
 */
export function SimpleEditor() {
  // === 响应式状态管理 ===
  const isMobile = useIsMobile() // 检测是否为移动设备
  const { height } = useWindowSize() // 获取窗口高度，用于工具栏定位
  const [mobileView, setMobileView] = React.useState<'main' | 'highlighter' | 'link'>('main') // 移动端工具栏视图状态
  const toolbarRef = React.useRef<HTMLDivElement>(null) // 工具栏引用，用于获取高度

  // === Tiptap 编辑器配置 ===
  const editor = useEditor({
    // 性能优化配置
    immediatelyRender: false, // 延迟渲染，提升性能
    shouldRerenderOnTransaction: false, // 避免不必要的重渲染

    // 编辑器属性配置
    editorProps: {
      attributes: {
        autocomplete: 'off', // 禁用自动完成
        autocorrect: 'off', // 禁用自动纠错
        autocapitalize: 'off', // 禁用自动大写
        'aria-label': 'Main content area, start typing to enter text.', // 无障碍标签
        class: 'simple-editor' // CSS 类名
      }
    },

    // 扩展插件配置
    extensions: [
      // 基础功能包配置
      StarterKit.configure({
        horizontalRule: false, // 禁用默认水平线，使用自定义版本
        link: {
          openOnClick: false, // 禁用点击打开链接
          enableClickSelection: true // 启用点击选择链接
        }
      }),

      // 自定义和第三方扩展
      HorizontalRule, // 自定义水平分割线
      TextAlign.configure({ types: ['heading', 'paragraph'] }), // 文本对齐（仅标题和段落）
      TaskList, // 任务列表
      TaskItem.configure({ nested: true }), // 嵌套任务项
      Highlight.configure({ multicolor: true }), // 多色高亮
      Image, // 图片支持
      Typography, // 智能排版
      Superscript, // 上标
      Subscript, // 下标
      Selection, // 选择增强

      // 图片上传节点配置
      ImageUploadNode.configure({
        accept: 'image/*', // 只接受图片文件
        maxSize: MAX_FILE_SIZE, // 最大文件大小限制
        limit: 3, // 最多上传3张图片
        upload: handleImageUpload, // 上传处理函数
        onError: (error) => console.error('Upload failed:', error) // 错误处理
      })
    ],
    content // 初始内容（从 JSON 文件加载）
  })

  // === 光标可见性管理 ===
  // 用于计算工具栏位置，避免遮挡编辑光标
  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0
  })

  // === 响应式效果处理 ===
  // 当从移动端切换到桌面端时，自动返回主工具栏视图
  React.useEffect(() => {
    if (!isMobile && mobileView !== 'main') {
      setMobileView('main')
    }
  }, [isMobile, mobileView])

  return (
    <div className="simple-editor-wrapper">
      {/* 编辑器上下文提供者，为子组件提供编辑器实例 */}
      <EditorContext.Provider value={{ editor }}>
        {/* 工具栏组件 */}
        <Toolbar
          ref={toolbarRef}
          style={{
            // 移动端动态定位：根据光标位置调整工具栏位置
            ...(isMobile
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`
                }
              : {})
          }}
        >
          {/* 根据移动端视图状态渲染不同的工具栏内容 */}
          {mobileView === 'main' ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView('highlighter')}
              onLinkClick={() => setMobileView('link')}
              isMobile={isMobile}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === 'highlighter' ? 'highlighter' : 'link'}
              onBack={() => setMobileView('main')}
            />
          )}
        </Toolbar>

        {/* 编辑器内容区域 */}
        <EditorContent
          editor={editor}
          role="presentation" // 无障碍角色
          className="simple-editor-content"
        />
      </EditorContext.Provider>
    </div>
  )
}
