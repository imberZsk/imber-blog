'use client'

import * as React from 'react'
import { EditorContent, EditorContext, useEditor } from '@tiptap/react'
import { CalloutClassNames } from './style'

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
import { CodeBlock } from '@/components/tiptap-extensions/CodeBlock/CodeBlock'

// --- Tiptap 节点组件 ---
import { ImageUploadNode } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension' // 图片上传节点
import { HorizontalRule } from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension' // 水平分割线节点
import '@/components/tiptap-node/blockquote-node/blockquote-node.scss' // 引用块样式
import '@/components/tiptap-node/code-block-node/code-block-node.scss' // 代码块样式
import '@/components/tiptap-node/code-block/code-block.scss' // 代码块样式
import '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss' // 分割线样式
import '@/components/tiptap-node/list-node/list-node.scss' // 列表样式
import '@/components/tiptap-node/image-node/image-node.scss' // 图片样式
import '@/components/tiptap-node/heading-node/heading-node.scss' // 标题样式
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss' // 段落样式

// --- 其他组件 ---

// --- 工具函数 ---
import { cn, handleImageUpload, MAX_FILE_SIZE } from '@/lib/tiptap-utils' // 图片上传处理函数

// --- 样式文件 ---
import '@/components/tiptap-templates/simple/simple-editor.scss' // 编辑器主样式

import initialContent from '@/components/tiptap-templates/simple/data/content.json'
import TextMenu from '@/components/tiptap-menus/text-menu'
import { SlashCommand } from '@/components/tiptap-extensions'
import { Callout } from '@/components/tiptap-extensions/Callout'

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
export function SimpleEditor({ content, editable = true }: { content?: string; editable?: boolean }) {
  // === Tiptap 编辑器配置 ===
  const editor = useEditor({
    // 性能优化配置
    immediatelyRender: false, // 延迟渲染，提升性能
    shouldRerenderOnTransaction: false, // 避免不必要的重渲染
    editable: editable, // 禁用编辑
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
        codeBlock: false, // 禁用默认代码块，使用自定义版本
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
      }),
      SlashCommand,
      CodeBlock,
      Callout
    ],
    content: content || initialContent // 初始内容（从 JSON 文件加载）
  })

  return (
    <div className="simple-editor-wrapper">
      {/* 编辑器上下文提供者，为子组件提供编辑器实例 */}
      <EditorContext.Provider value={{ editor }}>
        {/* 编辑器内容区域 */}
        <EditorContent
          editor={editor}
          role="presentation" // 无障碍角色
          className={cn('simple-editor-content', CalloutClassNames)}
        />

        {/* 文本菜单 */}
        {editor && <TextMenu editor={editor} />}
      </EditorContext.Provider>
    </div>
  )
}
