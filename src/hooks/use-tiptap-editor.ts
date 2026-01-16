'use client'

import * as React from 'react'
import type { Editor } from '@tiptap/react'
import { useCurrentEditor, useEditorState } from '@tiptap/react'

/**
 * 提供访问 Tiptap 编辑器实例的自定义 Hook
 *
 * 该 Hook 接受一个可选的编辑器实例作为参数，如果没有提供，
 * 则会从 Tiptap 上下文中获取编辑器实例。这使得组件可以在以下两种场景下工作：
 * 1. 直接传入编辑器实例
 * 2. 在 Tiptap 编辑器上下文中使用（自动从上下文获取）
 *
 * @param providedEditor - 可选的编辑器实例，如果提供则优先使用，否则从上下文获取
 * @returns 返回包含以下属性的对象：
 *   - editor: 编辑器实例（如果不存在则为 null）
 *   - editorState: 编辑器的状态对象（可选）
 *   - canCommand: 编辑器命令检查函数（可选）
 *
 * @example
 * ```tsx
 * // 方式一：直接传入编辑器实例
 * function MyComponent() {
 *   const myEditor = useEditor({ ... })
 *   const { editor } = useTiptapEditor(myEditor)
 *   // 使用 editor
 * }
 *
 * // 方式二：从上下文获取（在 Tiptap 组件内部使用）
 * function MyComponent() {
 *   const { editor } = useTiptapEditor()
 *   // 自动从 Tiptap 上下文获取编辑器实例
 * }
 * ```
 */
export function useTiptapEditor(providedEditor?: Editor | null): {
  editor: Editor | null
  editorState?: Editor['state']
  canCommand?: Editor['can']
} {
  // 从 Tiptap 上下文获取编辑器实例
  // 如果组件不在 Tiptap 上下文中，coreEditor 可能为 undefined
  const { editor: coreEditor } = useCurrentEditor()

  // 确定要使用的主编辑器实例
  // 优先使用提供的编辑器，如果没有提供则使用上下文中的编辑器
  // 使用 useMemo 避免不必要的重新计算
  const mainEditor = React.useMemo(() => providedEditor || coreEditor, [providedEditor, coreEditor])

  // 使用 useEditorState 订阅编辑器状态变化
  // 当编辑器状态发生变化时，会自动触发组件重新渲染
  const editorState = useEditorState({
    editor: mainEditor,
    // selector 函数用于从编辑器上下文中提取需要的数据
    // 当编辑器状态变化时，这个函数会被调用
    selector(context) {
      // 如果上下文中没有编辑器，返回空值
      if (!context.editor) {
        return {
          editor: null,
          editorState: undefined,
          canCommand: undefined
        }
      }

      // 返回编辑器实例、状态对象和命令检查函数
      // 这些数据会在编辑器状态变化时自动更新
      return {
        editor: context.editor, // 编辑器实例
        editorState: context.editor.state, // 编辑器状态（ProseMirror state）
        canCommand: context.editor.can // 命令检查函数，用于判断是否可以执行某个命令
      }
    }
  })

  // 如果 editorState 存在则返回它，否则返回一个包含 null editor 的对象
  // 这确保了即使编辑器不存在，Hook 也能返回一个有效的对象结构
  return editorState || { editor: null }
}
