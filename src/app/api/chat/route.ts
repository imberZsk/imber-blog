import { NextRequest } from 'next/server'

export const runtime = 'edge'

// 消息接口
interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const { message, history } = await req.json()

    if (!message || typeof message !== 'string') {
      return Response.json({ error: '消息格式不正确' }, { status: 400 })
    }

    // 检查API密钥是否配置
    if (!process.env.DASHSCOPE_API_KEY) {
      console.warn('未配置通义千问API密钥，使用模拟响应')
      const mockReply = generateSimpleResponse(message)
      return Response.json({
        reply: mockReply,
        timestamp: new Date().toISOString()
      })
    }

    // 创建系统提示，定义AI助手的个性和行为
    const systemPrompt = `你是一个友好、专业的博客AI助手。
你的名字是智能博客助手。
你擅长回答与博客内容、技术和写作相关的问题。
请用简洁、专业但友好的语气回答用户的问题。
如果你不知道答案，请诚实地告诉用户你不知道，不要编造信息。
用中文回答所有问题。`

    // 准备消息历史
    const messages: Message[] = [{ role: 'system', content: systemPrompt }]

    // 如果有历史记录，添加到消息列表中
    if (Array.isArray(history) && history.length > 0) {
      // 为了防止token超限，仅保留最近的10条消息
      const recentHistory = history.slice(-10)

      recentHistory.forEach((item) => {
        if (item.isUser) {
          messages.push({ role: 'user', content: item.content })
        } else {
          messages.push({ role: 'assistant', content: item.content })
        }
      })
    }

    // 添加当前用户消息
    messages.push({ role: 'user', content: message })

    // 调用通义千问 API (直接使用fetch API)
    const apiKey = process.env.DASHSCOPE_API_KEY
    const model = process.env.AI_MODEL || 'qwen-turbo'
    const maxTokens = parseInt(process.env.AI_MAX_TOKENS || '1000')
    const temperature = parseFloat(process.env.AI_TEMPERATURE || '0.7')

    const response = await fetch('https://dashscope.aliyuncs.com/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-DashScope-SSE': 'disable'
      },
      body: JSON.stringify({
        model: model,
        input: {
          messages: messages
        },
        parameters: {
          max_tokens: maxTokens,
          temperature: temperature
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('通义千问API错误:', errorData)
      throw new Error(errorData.message || '通义千问API请求失败')
    }

    const data = await response.json()

    // 从响应中提取回复
    let reply = '抱歉，我无法生成响应。'
    if (
      data &&
      data.output &&
      data.output.choices &&
      data.output.choices.length > 0 &&
      data.output.choices[0].message
    ) {
      reply = data.output.choices[0].message.content || reply
    }

    // 返回响应
    return Response.json({
      reply,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('聊天API错误:', error)
    return Response.json({ error: '处理请求时发生错误' }, { status: 500 })
  }
}

// 备用的简单响应生成函数，在API密钥未配置时使用
function generateSimpleResponse(message: string): string {
  const responses = [
    `您好！感谢您的消息："${message}"。我是一个简单的通义千问助手，目前还在开发中。`,
    `我收到了您的问题："${message}"。作为通义千问助手，我正在学习中，以后会给您更专业的回答。`,
    `谢谢您的提问："${message}"。作为博客的通义千问助手，我会尽力帮助您解答问题。`,
    `您询问的："${message}"是个很好的问题。作为通义千问助手，我正在不断学习以提供更好的服务。`
  ]

  return responses[Math.floor(Math.random() * responses.length)]
}
