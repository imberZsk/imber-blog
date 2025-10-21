import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  try {
    const { action, text } = await req.json()

    if (!action || !text) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const promptMap: Record<string, string> = {
      improve: '请改进以下文本，使其更加清晰、流畅和专业：',
      summarize: '请为以下文本生成一个简洁的摘要：',
      expand: '请扩展以下文本，使其更加详细和丰富：',
      translate: '请将以下文本翻译成英文：',
      'fix-grammar': '请检查并修正以下文本的语法错误：',
      'change-tone': '请将以下文本调整为更正式的语调：'
    }

    const realPrompt = promptMap[action] || '请处理以下文本：'

    // 构建完整的提示词
    const fullPrompt = `${realPrompt}\n\n${text}`

    console.log('realPrompt:', realPrompt, 'fullPrompt:', fullPrompt)

    // 使用流式响应
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const apiKey = process.env.NEXT_PUBLIC_AI_API_KEY
          const baseUrl = process.env.NEXT_PUBLIC_AI_BASE_URL
          const model = process.env.NEXT_PUBLIC_AI_MODEL || 'gpt-4'

          console.log('调用 OpenAI API:', {
            baseUrl,
            model,
            promptLength: fullPrompt.length,
            hasApiKey: !!apiKey
          })

          if (!apiKey) {
            throw new Error('API 密钥未配置')
          }

          // 初始化 OpenAI 客户端
          const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: baseUrl || 'https://api.openai.com/v1'
          })

          console.log('流式连接已建立')

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
            // temperature: 0.7,  // 控制输出的随机性，0-1之间，0表示最确定，1表示最随机
            // max_tokens: 1000   // 限制生成的最大token数量，控制输出长度
          })

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            const finishReason = chunk.choices[0]?.finish_reason

            console.log('收到 chunk:', { content, finishReason })

            if (content) {
              console.log('发送内容:', content)
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
              console.log('完成原因:', finishReason)
              if (finishReason === 'stop' || finishReason === 'length') {
                console.log('OpenAI 流式响应完成')
                controller.close()
                return
              }
            }
          }
        } catch (error) {
          console.error('AI 流式处理失败:', error)

          // 发送详细的错误信息
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
