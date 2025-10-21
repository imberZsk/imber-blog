'use client'

import * as React from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'

// --- Icons ---
import { SparklesIcon } from '@/components/tiptap-icons/sparkles-icon'
import { ChevronDownIcon } from '@/components/tiptap-icons/chevron-down-icon'

// --- Hooks ---
import { useTiptapEditor } from '@/hooks/use-tiptap-editor'

// --- UI Primitives ---
import type { ButtonProps } from '@/components/tiptap-ui-primitive/button'
import { Button } from '@/components/tiptap-ui-primitive/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/tiptap-ui-primitive/dropdown-menu'
import { Card, CardBody } from '@/components/tiptap-ui-primitive/card'

export interface AIDropdownMenuProps extends Omit<ButtonProps, 'type'> {
  /**
   * Tiptap editor instance
   */
  editor?: any
  /**
   * Whether to render the dropdown menu in a portal
   * @default false
   */
  portal?: boolean
  /**
   * Callback for when the dropdown opens or closes
   */
  onOpenChange?: (isOpen: boolean) => void
  /**
   * Callback for AI actions
   */
  onAIAction?: (action: string) => void
}

/**
 * AI 功能选项
 */
const AI_ACTIONS = [
  {
    id: 'expand',
    label: '扩展内容',
    description: '扩展和丰富文本内容'
  },
  {
    id: 'improve',
    label: '改进文本',
    description: '优化文本表达和语法'
  },
  {
    id: 'summarize',
    label: '总结内容',
    description: '生成文本摘要'
  },
  {
    id: 'translate',
    label: '翻译文本',
    description: '翻译为其他语言'
  },
  {
    id: 'fix-grammar',
    label: '修正语法',
    description: '检查并修正语法错误'
  },
  {
    id: 'change-tone',
    label: '调整语调',
    description: '改变文本的语调风格'
  }
]

/**
 * AI 下拉菜单组件
 *
 * 提供各种 AI 辅助功能，如文本改进、总结、扩展等。
 * 基于 HeadingDropdownMenu 的设计模式实现。
 */
export const AIDropdownMenu = React.forwardRef<HTMLButtonElement, AIDropdownMenuProps>(
  ({ editor: providedEditor, portal = false, onOpenChange, onAIAction, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor)
    const [isOpen, setIsOpen] = React.useState(false)

    const handleOpenChange = React.useCallback(
      (open: boolean) => {
        if (!editor) return
        setIsOpen(open)
        onOpenChange?.(open)
      },
      [editor, onOpenChange]
    )

    const handleAIAction = React.useCallback(
      async (actionId: string) => {
        if (!editor) return

        const { selection } = editor.state
        const { from, to } = selection

        if (from === to) {
          console.warn('没有选中文本')
          return
        }

        const selectedText = editor.state.doc.textBetween(from, to, ' ')

        if (!selectedText.trim()) {
          console.warn('选中的文本为空')
          return
        }

        try {
          // 显示加载状态
          console.log('执行 AI 动作:', actionId, '文本:', selectedText)

          // 先删除选中的文本，准备插入流式内容
          editor.commands.deleteRange({ from, to })
          const insertPos = from
          let accumulatedContent = ''

          // 使用 fetchEventSource 处理流式响应
          await fetchEventSource('/api/ai', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: actionId,
              text: selectedText
            }),
            async onopen(response) {
              if (response.ok) {
                console.log('流式连接已建立')
              } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
              }
            },
            onmessage(event) {
              try {
                if (event.data === '[DONE]') {
                  return
                }

                // 添加调试信息
                console.log('收到流式数据:', event.data)

                const data = JSON.parse(event.data)

                if (data.type === 'content' && data.content) {
                  // 累积内容并更新
                  accumulatedContent += data.content

                  // 删除之前的内容，插入新的累积内容
                  const currentLength = accumulatedContent.length - data.content.length
                  if (currentLength > 0) {
                    editor.commands.deleteRange({ from: insertPos, to: insertPos + currentLength })
                  }
                  editor.commands.insertContentAt(insertPos, accumulatedContent)
                } else if (data.type === 'error') {
                  console.error('AI 处理错误:', data.error)
                  throw new Error(data.error)
                } else {
                  console.warn('未知的流式数据类型:', data)
                }
              } catch (parseError) {
                console.error('解析流式数据失败:', parseError)
                console.error('原始数据:', event.data)
                // 不要抛出错误，继续处理其他数据
              }
            },
            onerror(error) {
              console.error('流式连接错误:', error)
              throw error
            }
          })

          onAIAction?.(actionId)
          setIsOpen(false)
        } catch (error) {
          console.error('AI 处理失败:', error)
          // 恢复原始文本
          editor.commands.insertContentAt(from, selectedText)
        }
      },
      [editor, onAIAction]
    )

    // 检查是否有选中的文本
    const hasSelection = editor && !editor.state.selection.empty

    if (!hasSelection) {
      return null
    }

    return (
      <DropdownMenu modal open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            data-style="ghost"
            role="button"
            tabIndex={-1}
            aria-label="AI 辅助功能"
            tooltip="AI 辅助"
            {...buttonProps}
            ref={ref}
          >
            <SparklesIcon className="tiptap-button-icon" />
            <ChevronDownIcon className="tiptap-button-dropdown-small" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" portal={portal}>
          <Card>
            <CardBody className="p-1">
              <div className="space-y-0.5">
                {AI_ACTIONS.map((action) => (
                  <DropdownMenuItem
                    key={action.id}
                    onClick={() => handleAIAction(action.id)}
                    className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="font-medium">{action.label}</div>
                  </DropdownMenuItem>
                ))}
              </div>
            </CardBody>
          </Card>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)

AIDropdownMenu.displayName = 'AIDropdownMenu'

export default AIDropdownMenu
