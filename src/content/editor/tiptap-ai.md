# TipTap 编辑器（7）- 集成 AI 功能

## AI 辅助编辑功能

基于 EventSource API (SSE) 和 `@microsoft/fetch-event-source` 实现流式数据解码，为 TipTap 编辑器集成强大的 AI 辅助功能。
![](/editor/ai.png)

### 功能特性

- 🤖 **智能文本处理**：支持扩展、改进、总结、翻译等 6 种 AI 功能
- ⚡ **流式响应**：实时显示 AI 生成内容，提供流畅的用户体验
- 🎯 **精确选择**：仅在有文本选中时显示 AI 按钮，避免误操作
- 🔄 **错误恢复**：AI 处理失败时自动恢复原始文本
- 🛡️ **安全可靠**：支持多种 AI 服务提供商，灵活配置

### 核心实现

#### 1. AI 下拉菜单组件 (ai-dropdown-menu.tsx)

```typescript
'use client'

import * as React from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { SparklesIcon } from '@/components/tiptap-icons/sparkles-icon'
import { ChevronDownIcon } from '@/components/tiptap-icons/chevron-down-icon'
import { useTiptapEditor } from '@/hooks/use-tiptap-editor'
import { Button } from '@/components/tiptap-ui-primitive/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/tiptap-ui-primitive/dropdown-menu'
import { Card, CardBody } from '@/components/tiptap-ui-primitive/card'

/**
 * AI 功能选项配置
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

export const AIDropdownMenu = React.forwardRef<HTMLButtonElement, AIDropdownMenuProps>(
  ({ editor: providedEditor, portal = false, onOpenChange, onAIAction, ...buttonProps }, ref) => {
    const { editor } = useTiptapEditor(providedEditor)
    const [isOpen, setIsOpen] = React.useState(false)

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
                }
              } catch (parseError) {
                console.error('解析流式数据失败:', parseError)
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
```

#### 2. AI API 路由 (api/ai/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  try {
    const { action, text } = await req.json()

    if (!action || !text) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 提示词映射
    const promptMap: Record<string, string> = {
      improve: '请改进以下文本，使其更加清晰、流畅和专业：',
      summarize: '请为以下文本生成一个简洁的摘要：',
      expand: '请扩展以下文本，使其更加详细和丰富：',
      translate: '请将以下文本翻译成英文：',
      'fix-grammar': '请检查并修正以下文本的语法错误：',
      'change-tone': '请将以下文本调整为更正式的语调：'
    }

    const realPrompt = promptMap[action] || '请处理以下文本：'
    const fullPrompt = `${realPrompt}\n\n${text}`

    // 使用流式响应
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const apiKey = process.env.NEXT_PUBLIC_AI_API_KEY
          const baseUrl = process.env.NEXT_PUBLIC_AI_BASE_URL
          const model = process.env.NEXT_PUBLIC_AI_MODEL || 'gpt-4'

          if (!apiKey) {
            throw new Error('API 密钥未配置')
          }

          // 初始化 OpenAI 客户端
          const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: baseUrl || 'https://api.openai.com/v1'
          })

          // 使用 OpenAI SDK 处理流式响应
          const stream = await openai.chat.completions.create({
            model: model,
            messages: [
              {
                role: 'user',
                content: fullPrompt
              }
            ],
            stream: true
          })

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            const finishReason = chunk.choices[0]?.finish_reason

            if (content) {
              // 发送流式数据
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'content',
                    content: content
                  })}\n\n`
                )
              )
            }

            if (finishReason) {
              if (finishReason === 'stop' || finishReason === 'length') {
                controller.close()
                return
              }
            }
          }
        } catch (error) {
          console.error('AI 流式处理失败:', error)

          // 发送错误信息
          const errorMessage = error instanceof Error ? error.message : 'AI 处理失败'
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: errorMessage
              })}\n\n`
            )
          )
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    })
  } catch (error) {
    console.error('AI API 错误:', error)
    return NextResponse.json({ error: 'AI 处理失败' }, { status: 500 })
  }
}
```

### 技术亮点

#### 1. **流式响应处理**

- **实时更新**：使用 `fetchEventSource` 处理 SSE 流式数据
- **累积内容**：智能管理内容更新，避免重复插入
- **错误处理**：完善的错误捕获和恢复机制

#### 2. **智能文本选择**

- **选择检测**：仅在文本选中时显示 AI 按钮
- **内容验证**：确保选中的文本不为空
- **位置保持**：精确维护插入位置

#### 3. **用户体验优化**

- **即时反馈**：流式显示 AI 生成内容
- **错误恢复**：AI 失败时自动恢复原始文本
- **状态管理**：智能的加载状态和错误处理

#### 4. **配置灵活性**

- **多服务支持**：支持 OpenAI、通义千问等多种 AI 服务
- **环境变量**：通过环境变量灵活配置 API 密钥和模型
- **提示词定制**：可自定义各种 AI 功能的提示词

### 环境配置

```bash
# .env.local
NEXT_PUBLIC_AI_API_KEY=your_api_key_here
NEXT_PUBLIC_AI_BASE_URL=https://api.openai.com/v1
NEXT_PUBLIC_AI_MODEL=gpt-4
```

### 使用方式

```typescript
// 在编辑器中集成 AI 功能
import { AIDropdownMenu } from '@/components/tiptap-ui/ai-dropdown-menu/ai-dropdown-menu'

// 在工具栏中添加
<AIDropdownMenu
  editor={editor}
  onAIAction={(action) => console.log('AI 动作:', action)}
/>
```

### 支持的 AI 功能

1. **扩展内容** - 丰富和详细化文本
2. **改进文本** - 优化表达和语法
3. **总结内容** - 生成简洁摘要
4. **翻译文本** - 多语言翻译支持
5. **修正语法** - 语法检查和修正
6. **调整语调** - 改变文本风格

### 技术架构

```
用户选择文本 → AI 下拉菜单 → 流式 API 调用 → 实时内容更新
     ↓              ↓              ↓              ↓
  文本检测      功能选择       SSE 流式响应    编辑器更新
```
