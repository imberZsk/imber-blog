'use client'

import * as React from 'react'
import type { Editor } from '@tiptap/react'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'

// --- Hooks ---
import { useTiptapEditor } from '@/hooks/use-tiptap-editor'

// --- Icons ---
import { BlockquoteIcon } from '@/components/tiptap-icons/blockquote-icon'

// --- UI Utils ---
import { findNodePosition, isNodeInSchema, isNodeTypeSelected, isValidPosition } from '@/lib/tiptap-utils'

/**
 * Blockquote 功能的快捷键
 * 默认快捷键：Cmd/Ctrl + Shift + B
 */
export const BLOCKQUOTE_SHORTCUT_KEY = 'mod+shift+b'

/**
 * Blockquote 功能的配置接口
 */
export interface UseBlockquoteConfig {
  /**
   * Tiptap 编辑器实例
   * 如果未提供，将从上下文自动获取
   */
  editor?: Editor | null
  /**
   * 当 blockquote 不可用时是否隐藏按钮
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * 切换成功后调用的回调函数
   * 在 blockquote 状态成功切换后触发
   */
  onToggled?: () => void
}

/**
 * 检查在当前编辑器状态下是否可以切换 blockquote
 *
 * @param editor - Tiptap 编辑器实例
 * @param turnInto - 是否检查转换为 blockquote 的能力（默认 true）
 *                  false 时仅检查是否可以切换包装
 * @returns 如果可以切换则返回 true，否则返回 false
 *
 * @remarks
 * 检查条件包括：
 * 1. 编辑器存在且可编辑
 * 2. blockquote 节点在 schema 中存在
 * 3. 当前未选中图片节点
 * 4. 如果 turnInto 为 false，检查是否可以切换包装
 * 5. 如果 turnInto 为 true，检查是否可以找到有效的节点位置
 */
export function canToggleBlockquote(editor: Editor | null, turnInto: boolean = true): boolean {
  // 基础检查：编辑器存在且可编辑
  if (!editor || !editor.isEditable) return false

  // 检查 blockquote 是否在 schema 中，以及是否选中了图片节点
  if (!isNodeInSchema('blockquote', editor) || isNodeTypeSelected(editor, ['image'])) return false

  // 如果不需要转换为 blockquote，仅检查是否可以切换包装
  if (!turnInto) {
    return editor.can().toggleWrap('blockquote')
  }

  // 检查是否可以找到有效的节点位置进行转换
  try {
    const view = editor.view
    const state = view.state
    const selection = state.selection

    // 如果选择为空或是文本选择，需要找到节点位置
    if (selection.empty || selection instanceof TextSelection) {
      // 获取当前选中节点的位置
      const pos = findNodePosition({
        editor,
        node: state.selection.$anchor.node(1)
      })?.pos

      // 验证位置是否有效
      if (!isValidPosition(pos)) return false
    }

    return true
  } catch {
    // 发生任何错误都返回 false
    return false
  }
}

/**
 * 切换指定节点或当前选择的 blockquote 格式
 *
 * @param editor - Tiptap 编辑器实例
 * @returns 如果切换成功返回 true，否则返回 false
 *
 * @remarks
 * 切换逻辑：
 * 1. 如果没有选择或选择是文本选择，找到节点位置并创建节点选择
 * 2. 如果是节点选择，提取节点内容并清除节点格式
 * 3. 根据当前是否处于 blockquote 状态，执行包装或解除包装
 * 4. 切换后将光标移动到文本块末尾
 */
export function toggleBlockquote(editor: Editor | null): boolean {
  // 基础检查
  if (!editor || !editor.isEditable) return false
  if (!canToggleBlockquote(editor)) return false

  try {
    const view = editor.view
    let state = view.state
    let tr = state.tr

    // 如果没有选择或选择是文本选择，需要找到节点位置
    if (state.selection.empty || state.selection instanceof TextSelection) {
      // 查找当前光标所在节点的位置
      const pos = findNodePosition({
        editor,
        node: state.selection.$anchor.node(1)
      })?.pos

      // 如果位置无效，返回 false
      if (!isValidPosition(pos)) return false

      // 创建节点选择并更新状态
      tr = tr.setSelection(NodeSelection.create(state.doc, pos))
      view.dispatch(tr)
      state = view.state
    }

    const selection = state.selection

    // 创建命令链并聚焦编辑器
    let chain = editor.chain().focus()

    // 处理节点选择的情况
    if (selection instanceof NodeSelection) {
      // 获取节点的第一个和最后一个子节点
      const firstChild = selection.node.firstChild?.firstChild
      const lastChild = selection.node.lastChild?.lastChild

      // 计算文本选择的起始位置（排除第一个子节点）
      const from = firstChild ? selection.from + firstChild.nodeSize : selection.from + 1

      // 计算文本选择的结束位置（排除最后一个子节点）
      const to = lastChild ? selection.to - lastChild.nodeSize : selection.to - 1

      // 设置文本选择并清除节点格式
      chain = chain.setTextSelection({ from, to }).clearNodes()
    }

    // 根据当前是否处于 blockquote 状态，执行相应的操作
    // 如果已激活，则解除 blockquote 包装；否则包装为 blockquote
    const toggle = editor.isActive('blockquote')
      ? chain.lift('blockquote') // 解除 blockquote 包装
      : chain.wrapIn('blockquote') // 包装为 blockquote

    // 执行切换操作
    toggle.run()

    // 聚焦编辑器并将光标移动到文本块末尾
    editor.chain().focus().selectTextblockEnd().run()

    return true
  } catch {
    // 发生任何错误都返回 false
    return false
  }
}

/**
 * 判断是否应该显示 blockquote 按钮
 *
 * @param props - 包含编辑器实例和隐藏配置的对象
 * @param props.editor - Tiptap 编辑器实例
 * @param props.hideWhenUnavailable - 当不可用时是否隐藏
 * @returns 如果应该显示按钮返回 true，否则返回 false
 *
 * @remarks
 * 显示条件：
 * 1. 编辑器存在且可编辑
 * 2. blockquote 节点在 schema 中存在
 * 3. 如果 hideWhenUnavailable 为 true 且不在代码块中，检查是否可以切换
 * 4. 否则默认显示
 */
export function shouldShowButton(props: { editor: Editor | null; hideWhenUnavailable: boolean }): boolean {
  const { editor, hideWhenUnavailable } = props

  // 基础检查：编辑器存在且可编辑
  if (!editor || !editor.isEditable) return false

  // 检查 blockquote 是否在 schema 中
  if (!isNodeInSchema('blockquote', editor)) return false

  // 如果需要隐藏且当前不在代码块中，检查是否可以切换
  if (hideWhenUnavailable && !editor.isActive('code')) {
    return canToggleBlockquote(editor)
  }

  // 默认显示按钮
  return true
}

/**
 * 提供 Tiptap 编辑器 blockquote 功能的自定义 Hook
 *
 * 该 Hook 封装了 blockquote 的切换逻辑、状态管理和事件处理，
 * 提供了完整的 blockquote 功能接口。
 *
 * @param config - 可选的配置对象
 * @returns 返回包含以下属性的对象：
 *   - isVisible: 按钮是否可见
 *   - isActive: 当前是否处于 blockquote 状态
 *   - handleToggle: 切换 blockquote 的处理函数
 *   - canToggle: 是否可以切换 blockquote
 *   - label: 按钮标签文本
 *   - shortcutKeys: 快捷键字符串
 *   - Icon: 图标组件
 *
 * @example
 * ```tsx
 * // 简单用法 - 不需要参数
 * function MySimpleBlockquoteButton() {
 *   const { isVisible, handleToggle, isActive } = useBlockquote()
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleToggle}>引用</button>
 * }
 *
 * // 高级用法 - 带配置
 * function MyAdvancedBlockquoteButton() {
 *   const { isVisible, handleToggle, label, isActive } = useBlockquote({
 *     editor: myEditor,
 *     hideWhenUnavailable: true,
 *     onToggled: () => console.log('引用已切换!')
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <MyButton
 *       onClick={handleToggle}
 *       aria-label={label}
 *       aria-pressed={isActive}
 *     >
 *       切换引用
 *     </MyButton>
 *   )
 * }
 * ```
 */
export function useBlockquote(config?: UseBlockquoteConfig) {
  // 从配置中提取参数，使用默认值
  const { editor: providedEditor, hideWhenUnavailable = false, onToggled } = config || {}

  // 获取编辑器实例（如果未提供则从上下文获取）
  const { editor } = useTiptapEditor(providedEditor)

  // 按钮可见性状态，默认为可见
  const [isVisible, setIsVisible] = React.useState<boolean>(true)

  // 是否可以切换 blockquote
  const canToggle = canToggleBlockquote(editor)

  // 当前是否处于 blockquote 状态
  const isActive = editor?.isActive('blockquote') || false

  // 监听编辑器选择更新，动态更新按钮可见性
  React.useEffect(() => {
    if (!editor) return

    // 处理选择更新的回调函数
    const handleSelectionUpdate = () => {
      setIsVisible(shouldShowButton({ editor, hideWhenUnavailable }))
    }

    // 立即执行一次以设置初始状态
    handleSelectionUpdate()

    // 监听选择更新事件
    editor.on('selectionUpdate', handleSelectionUpdate)

    // 清理函数：移除事件监听器
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
    }
  }, [editor, hideWhenUnavailable])

  // 切换 blockquote 的处理函数
  const handleToggle = React.useCallback(() => {
    if (!editor) return false

    // 执行切换操作
    const success = toggleBlockquote(editor)

    // 如果切换成功，调用回调函数
    if (success) {
      onToggled?.()
    }

    return success
  }, [editor, onToggled])

  // 返回 Hook 提供的所有接口
  return {
    isVisible, // 按钮是否可见
    isActive, // 当前是否处于 blockquote 状态
    handleToggle, // 切换 blockquote 的处理函数
    canToggle, // 是否可以切换 blockquote
    label: 'Blockquote', // 按钮标签文本
    shortcutKeys: BLOCKQUOTE_SHORTCUT_KEY, // 快捷键字符串
    Icon: BlockquoteIcon // 图标组件
  }
}
