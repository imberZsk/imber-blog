import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import {
  BaseLLM,
  Settings,
  type ChatResponse,
  type ChatResponseChunk,
  type LLMChatParamsNonStreaming,
  type LLMChatParamsStreaming,
  type LLMMetadata,
  type MessageContent
} from 'llamaindex'
import { NextResponse } from 'next/server'

/** 模型代理只使用 Node.js 运行时，以便在请求前解析并校验目标地址。 */
export const runtime = 'nodejs'

/** 单次模型调用最长等待时间。 */
const MODEL_REQUEST_TIMEOUT_MS = 45_000
/** 用户问题最大字符数，避免公开接口承载超大请求。 */
const MAX_PROMPT_LENGTH = 4_000
/** 模型名最大字符数。 */
const MAX_MODEL_NAME_LENGTH = 120
/** Base URL 最大字符数。 */
const MAX_BASE_URL_LENGTH = 500
/** 自定义 LlamaIndex LLM 适配器所需的保守上下文窗口元数据。 */
const LLAMAINDEX_ADAPTER_CONTEXT_WINDOW = 128_000

/** 页面允许选择的模型实验框架。 */
type ModelSandboxFramework = 'langchain' | 'llamaindex'

/** 浏览器提交的模型实验请求。 */
interface ModelSandboxRequestBody {
  /** 当前文章声明的模型框架。 */
  framework?: unknown
  /** OpenAI 兼容接口的根地址。 */
  baseUrl?: unknown
  /** 只用于当前请求的供应商密钥。 */
  apiKey?: unknown
  /** 当前供应商支持的模型标识。 */
  model?: unknown
  /** 本轮发送给模型的问题。 */
  prompt?: unknown
}

/** LlamaIndex 适配器调用 OpenAI 兼容接口所需的连接信息。 */
interface LlamaIndexModelConnection {
  /** 已通过公网与 HTTPS 校验的接口根地址。 */
  baseUrl: URL
  /** 只在当前请求栈中存活的模型密钥。 */
  apiKey: string
  /** 用户选择的供应商模型标识。 */
  model: string
}

/** OpenAI 兼容 Chat Completions 响应中本实验实际读取的字段。 */
interface CompatibleChatCompletionResponse {
  /** 供应商确认的实际模型名。 */
  model?: unknown
  /** 至少应包含一个助手消息候选。 */
  choices?: Array<{
    /** 当前候选的助手消息。 */
    message?: {
      /** 当前实验只接受文本正文。 */
      content?: unknown
    }
  }>
  /** 供应商可选的 Token 用量。 */
  usage?: {
    /** 输入 Token 数。 */
    prompt_tokens?: unknown
    /** 输出 Token 数。 */
    completion_tokens?: unknown
    /** 总 Token 数。 */
    total_tokens?: unknown
  }
}

/**
 * 将 LlamaIndex 消息内容收敛为 OpenAI 兼容接口接受的纯文本。
 * @param content LlamaIndex 允许的字符串或多模态消息内容。
 * @returns 保留文本片段后的消息正文。
 */
function getLlamaIndexMessageText(content: MessageContent): string {
  if (typeof content === 'string') {
    return content
  }

  /** 多模态消息中只有文本片段能交给当前文本实验。 */
  const textParts = content
    .filter((contentPart) => contentPart.type === 'text')
    .map((contentPart) => contentPart.text)
  return textParts.join('\n')
}

/**
 * 用受控 OpenAI 兼容接口实现 LlamaIndex 的 BaseLLM 契约。
 * 该适配器避免依赖已废弃的供应商集成包，并让 LlamaIndex 实验支持用户自定义 Base URL。
 */
class OpenAICompatibleLlamaIndexLLM extends BaseLLM {
  /** LlamaIndex 在 Prompt 预算与运行记录中读取的模型元数据。 */
  readonly metadata: LLMMetadata

  /** 当前请求独占的模型连接。 */
  private readonly connection: LlamaIndexModelConnection

  /**
   * 创建单次请求使用的 LlamaIndex 模型适配器。
   * @param connection 已通过服务端安全校验的模型连接。
   */
  constructor(connection: LlamaIndexModelConnection) {
    super()
    this.connection = connection
    this.metadata = {
      model: connection.model, // 记录用户实际选择的模型。
      temperature: 0, // 验证实验优先保证可复现。
      topP: 1, // 不额外裁剪候选概率分布。
      contextWindow: LLAMAINDEX_ADAPTER_CONTEXT_WINDOW, // 仅作为框架预算元数据，本实验不会填满窗口。
      tokenizer: undefined, // 供应商兼容接口未暴露可靠的本地 Tokenizer。
      structuredOutput: false // 本实验只请求普通文本。
    }
  }

  /**
   * 声明流式调用返回类型；当前实验会在实现中明确拒绝流式请求。
   * @param params LlamaIndex 流式聊天参数。
   * @returns 本实验不产生流式迭代器。
   */
  chat(params: LLMChatParamsStreaming): Promise<AsyncIterable<ChatResponseChunk>>

  /**
   * 声明非流式调用返回类型。
   * @param params LlamaIndex 非流式聊天参数。
   * @returns 标准 LlamaIndex ChatResponse。
   */
  chat(params: LLMChatParamsNonStreaming): Promise<ChatResponse>

  /**
   * 通过受限 fetch 执行 LlamaIndex 发起的聊天请求。
   * @param params LlamaIndex 标准聊天参数。
   * @returns 非流式助手消息；流式请求会被明确拒绝。
   */
  async chat(
    params: LLMChatParamsStreaming | LLMChatParamsNonStreaming
  ): Promise<AsyncIterable<ChatResponseChunk> | ChatResponse> {
    if (params.stream) {
      throw new Error('当前 LlamaIndex 在线实验只支持非流式验证。')
    }

    /** 只允许访问已批准 Base URL 下的 Chat Completions 路径。 */
    const providerFetch = createRestrictedProviderFetch(this.connection.baseUrl)
    /** 保留 Base URL 的版本前缀并追加标准聊天路径。 */
    const completionUrl = new URL(
      `${this.connection.baseUrl.pathname.replace(/\/+$/, '')}/chat/completions`,
      this.connection.baseUrl.origin
    )
    /** 把 LlamaIndex 消息转换为供应商兼容消息。 */
    const providerMessages = params.messages.map((message) => ({
      role: message.role, // LlamaIndex 与 OpenAI 兼容协议共用标准角色名。
      content: getLlamaIndexMessageText(message.content) // 当前适配器只发送文本片段。
    }))
    /** 真实上游响应受服务端超时与同源限制保护。 */
    const providerResponse = await providerFetch(completionUrl, {
      method: 'POST', // Chat Completions 固定使用 POST。
      headers: {
        Authorization: `Bearer ${this.connection.apiKey}`, // 临时 Key 只进入当前上游请求头。
        'Content-Type': 'application/json' // 请求体使用标准 JSON。
      },
      body: JSON.stringify({
        model: this.connection.model, // 用户选择的模型标识。
        messages: providerMessages, // LlamaIndex 组装后的完整消息。
        temperature: 0, // 验证实验保持确定性。
        stream: false // 页面当前只处理一次性 JSON 响应。
      }),
      signal: AbortSignal.timeout(MODEL_REQUEST_TIMEOUT_MS) // 到时立即中止上游连接。
    })
    /** 上游正文只解析一次，错误时保留有限协议信息。 */
    const providerResponseText = await providerResponse.text()
    if (!providerResponse.ok) {
      throw new Error(`模型供应商返回 HTTP ${providerResponse.status}：${providerResponseText.slice(0, 500)}`)
    }

    /** Chat Completions 必须返回 JSON 对象。 */
    let responseBody: CompatibleChatCompletionResponse
    try {
      responseBody = JSON.parse(providerResponseText) as CompatibleChatCompletionResponse
    } catch {
      throw new Error('模型供应商没有返回有效 JSON。')
    }

    /** 当前实验只接受第一个候选中的非空文本。 */
    const content = responseBody.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('LlamaIndex 收到的模型响应没有文本内容。')
    }

    return {
      message: {
        role: 'assistant', // 上游 Chat Completions 返回助手消息。
        content: content.trim() // 去掉供应商可能附带的首尾空白。
      },
      raw: responseBody // 保留原始模型名和 Usage 供页面验收。
    }
  }
}

/**
 * 判断 IPv4 地址是否属于私网、回环、链路本地或保留网段。
 * @param address 经过 DNS 解析或直接输入的 IPv4 地址。
 * @returns 地址是否不能作为模型代理目标。
 */
function isBlockedIpv4Address(address: string): boolean {
  /** IPv4 的四段十进制数字。 */
  const octets = address.split('.').map((octet) => Number(octet))
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return true
  }

  /** 四段地址分别用于判断特殊网段。 */
  const [firstOctet, secondOctet, thirdOctet] = octets
  return (
    firstOctet === 0 ||
    firstOctet === 10 ||
    firstOctet === 127 ||
    (firstOctet === 100 && secondOctet >= 64 && secondOctet <= 127) ||
    (firstOctet === 169 && secondOctet === 254) ||
    (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) ||
    (firstOctet === 192 && secondOctet === 0 && thirdOctet === 0) ||
    (firstOctet === 192 && secondOctet === 168) ||
    (firstOctet === 198 && (secondOctet === 18 || secondOctet === 19)) ||
    firstOctet >= 224
  )
}

/**
 * 判断 IP 地址是否不能作为服务端外连目标。
 * @param address IPv4 或 IPv6 地址。
 * @returns 私网、回环、链路本地、组播和未指定地址返回 true。
 */
function isBlockedIpAddress(address: string): boolean {
  /** 去掉 IPv6 可能携带的 zone id，并统一大小写。 */
  const normalizedAddress = address.split('%')[0]?.toLowerCase() || ''
  /** 当前地址的 IP 协议版本。 */
  const addressFamily = isIP(normalizedAddress)
  if (addressFamily === 4) {
    return isBlockedIpv4Address(normalizedAddress)
  }
  if (addressFamily !== 6) {
    return true
  }

  /** IPv4 映射 IPv6 地址仍按 IPv4 网段检查。 */
  const mappedIpv4Address = normalizedAddress.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1]
  if (mappedIpv4Address) {
    return isBlockedIpv4Address(mappedIpv4Address)
  }

  return (
    normalizedAddress === '::' ||
    normalizedAddress === '::1' ||
    /^f[cd]/.test(normalizedAddress) ||
    /^fe[89ab]/.test(normalizedAddress) ||
    /^ff/.test(normalizedAddress)
  )
}

/**
 * 校验用户提供的模型 Base URL，并阻止服务端请求内网资源。
 * @param rawBaseUrl 页面提交的 Base URL。
 * @returns 通过协议、主机和 DNS 校验的 URL。
 */
async function validateModelBaseUrl(rawBaseUrl: string): Promise<URL> {
  /** 超长地址没有合法业务用途，也会增加解析和日志风险。 */
  if (!rawBaseUrl || rawBaseUrl.length > MAX_BASE_URL_LENGTH) {
    throw new Error('Base URL 长度不合法。')
  }

  /** 使用标准 URL 解析器拒绝模糊地址。 */
  let parsedBaseUrl: URL
  try {
    parsedBaseUrl = new URL(rawBaseUrl)
  } catch {
    throw new Error('Base URL 不是有效地址。')
  }

  if (parsedBaseUrl.protocol !== 'https:') {
    throw new Error('Base URL 必须使用 HTTPS。')
  }
  if (parsedBaseUrl.username || parsedBaseUrl.password) {
    throw new Error('Base URL 不能包含用户名或密码。')
  }

  /** 先拒绝常见本地主机名，再执行 DNS 校验。 */
  const normalizedHostname = parsedBaseUrl.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (
    normalizedHostname === 'localhost' ||
    /(?:^|\.)(?:localhost|local|internal|home|lan)$/.test(normalizedHostname)
  ) {
    throw new Error('Base URL 不能指向本机或内网主机。')
  }

  /** IP 字面量不需要 DNS 查询，但必须通过网段检查。 */
  if (isIP(normalizedHostname)) {
    if (isBlockedIpAddress(normalizedHostname)) {
      throw new Error('Base URL 不能指向私网、回环或保留地址。')
    }
    return parsedBaseUrl
  }

  /** 域名的全部解析结果都必须是公网地址，避免双栈绕过。 */
  const resolvedAddresses = await lookup(normalizedHostname, { all: true, verbatim: true })
  if (resolvedAddresses.length === 0 || resolvedAddresses.some((entry) => isBlockedIpAddress(entry.address))) {
    throw new Error('Base URL 的域名解析到了非公网地址。')
  }

  return parsedBaseUrl
}

/**
 * 从未知输入中读取非空字符串并执行长度限制。
 * @param value 请求体中的未知字段。
 * @param fieldName 面向用户的字段名。
 * @param maximumLength 字段最大字符数。
 * @returns 去掉首尾空白的字符串。
 */
function readRequiredString(value: unknown, fieldName: string, maximumLength: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName}不能为空。`)
  }
  /** 去掉用户复制时带入的首尾空白。 */
  const normalizedValue = value.trim()
  if (normalizedValue.length > maximumLength) {
    throw new Error(`${fieldName}超过长度限制。`)
  }
  return normalizedValue
}

/**
 * 只保留可展示的供应商用量数字。
 * @param value 供应商返回的未知用量字段。
 * @returns 非负整数或 null。
 */
function normalizeUsageNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

/**
 * 为 LangChain 的 OpenAI 客户端创建禁止跨主机和重定向的 fetch。
 * @param approvedBaseUrl 已通过 DNS 和公网地址校验的供应商根地址。
 * @returns 只能访问同一供应商 API 路径的 fetch 实现。
 */
function createRestrictedProviderFetch(approvedBaseUrl: URL): typeof fetch {
  /** Base URL 路径用于限制 SDK 只能访问当前 API 前缀。 */
  const approvedPathPrefix = approvedBaseUrl.pathname.replace(/\/+$/, '')

  /**
   * 执行 LangChain SDK 发出的供应商请求。
   * @param input SDK 生成的 Request、URL 或字符串地址。
   * @param init SDK 生成的请求选项。
   * @returns 禁止重定向和缓存的供应商响应。
   */
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    /** 从三种标准 fetch 输入中恢复最终请求 URL。 */
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString())
    /** 供应商请求必须保持同源且位于用户批准的 API 路径下。 */
    const usesApprovedPath = requestUrl.pathname === approvedPathPrefix
      || requestUrl.pathname.startsWith(`${approvedPathPrefix}/`)
    if (requestUrl.origin !== approvedBaseUrl.origin || !usesApprovedPath) {
      throw new Error('LangChain 尝试访问 Base URL 之外的地址，已阻止。')
    }

    return fetch(input, {
      ...init, // 保留 LangChain 生成的请求方法、请求体、认证头和中止信号。
      cache: 'no-store', // 模型请求和响应不得进入缓存。
      redirect: 'error' // 禁止携带 Key 跟随到另一个地址。
    })
  }
}

/**
 * 使用用户临时提供的连接信息执行一次 OpenAI 兼容 Chat Completions 请求。
 * @param request 当前同源页面请求。
 * @returns 模型文本、用量或安全错误。
 */
export async function POST(request: Request) {
  /** 只接受来自当前站点页面的浏览器请求，缩小公开代理的滥用面。 */
  const requestOrigin = new URL(request.url).origin
  /** 浏览器发送的 Origin 必须与当前站点完全一致。 */
  const callerOrigin = request.headers.get('origin')
  if (callerOrigin !== requestOrigin) {
    return NextResponse.json({ error: '只允许从当前文章页面运行模型实验。' }, { status: 403 })
  }

  /** 用于在异常文案中消除供应商可能回显的临时 Key。 */
  let sensitiveApiKey = ''

  try {
    /** 解析后的页面请求字段。 */
    const requestBody = await request.json() as ModelSandboxRequestBody
    /** 只存在于本次函数调用栈的临时 API Key。 */
    const apiKey = readRequiredString(requestBody.apiKey, 'API Key', 500)
    sensitiveApiKey = apiKey
    /** 当前供应商模型标识。 */
    const model = readRequiredString(requestBody.model, '模型', MAX_MODEL_NAME_LENGTH)
    /** 本轮模型问题。 */
    const prompt = readRequiredString(requestBody.prompt, 'Prompt', MAX_PROMPT_LENGTH)
    /** 未声明框架的历史文章继续使用 LangChain。 */
    const modelFramework: ModelSandboxFramework = requestBody.framework === 'llamaindex'
      ? 'llamaindex'
      : 'langchain'
    /** 通过公网和 HTTPS 校验的供应商根地址。 */
    const baseUrl = await validateModelBaseUrl(readRequiredString(requestBody.baseUrl, 'Base URL', MAX_BASE_URL_LENGTH))

    if (modelFramework === 'llamaindex') {
      /** 当前请求独占的 LlamaIndex 模型适配器，不污染其他并发实验。 */
      const llamaIndexLlm = new OpenAICompatibleLlamaIndexLLM({
        baseUrl, // 已通过 SSRF 防护的供应商地址。
        apiKey, // 当前请求结束后即可释放的临时密钥。
        model // 用户实际选择的供应商模型。
      })
      /** withLLM 使用 LlamaIndex 的请求作用域设置，避免修改全局默认模型。 */
      const responseMessage = await Settings.withLLM(llamaIndexLlm, () => Settings.llm.chat({
        messages: [
          {
            role: 'system', // 固定系统约束减少无依据扩写。
            content: '你是技术学习助手。回答要准确、简洁，不编造未提供的事实。'
          },
          {
            role: 'user', // 页面中可见且可编辑的验证问题。
            content: prompt
          }
        ]
      }))
      /** 适配器保留的 Chat Completions 原始响应。 */
      const rawResponse = responseMessage.raw as CompatibleChatCompletionResponse
      /** LlamaIndex 标准消息可能是多模态结构，页面只展示文本部分。 */
      const content = getLlamaIndexMessageText(responseMessage.message.content)
      if (!content.trim()) {
        throw new Error('LlamaIndex 返回了空文本。')
      }

      return NextResponse.json(
        {
          content: content.trim(),
          model: typeof rawResponse.model === 'string' ? rawResponse.model : model,
          usage: {
            promptTokens: normalizeUsageNumber(rawResponse.usage?.prompt_tokens),
            completionTokens: normalizeUsageNumber(rawResponse.usage?.completion_tokens),
            totalTokens: normalizeUsageNumber(rawResponse.usage?.total_tokens)
          }
        },
        {
          headers: {
            'Cache-Control': 'no-store' // 响应和临时输入不得进入中间缓存。
          }
        }
      )
    }

    /** 当前请求使用的真实 LangChain ChatModel。 */
    const chatModel = new ChatOpenAI({
      model, // 用户选择的供应商模型。
      apiKey, // 临时 Key 只传给当前 ChatOpenAI 实例。
      temperature: 0, // 验证实验优先复现性。
      maxRetries: 0, // 避免失败请求重复计费。
      timeout: MODEL_REQUEST_TIMEOUT_MS, // SDK 层硬超时。
      configuration: {
        baseURL: baseUrl.toString().replace(/\/+$/, ''), // 用户批准且已校验的 API 根地址。
        fetch: createRestrictedProviderFetch(baseUrl) // 阻止跨主机、跨路径和重定向。
      }
    })
    /** 真实模型实验使用的消息模板。 */
    const promptTemplate = ChatPromptTemplate.fromMessages([
      ['system', '你是技术学习助手。回答要准确、简洁，不编造未提供的事实。'],
      ['human', '{question}']
    ])
    /** LCEL 管道负责把变量格式化成消息并调用真实 ChatModel。 */
    const modelChain = promptTemplate.pipe(chatModel)
    /** 超时会沿 RunnableConfig 中止 LangChain 调用。 */
    const timeoutSignal = AbortSignal.timeout(MODEL_REQUEST_TIMEOUT_MS)
    /** 保留 AIMessage 以读取 LangChain 统一后的 Token 用量。 */
    const responseMessage = await modelChain.invoke({ question: prompt }, { signal: timeoutSignal })
    /** StringOutputParser 把 AIMessage 规范成文章沙盒展示的字符串。 */
    const content = await new StringOutputParser().invoke(responseMessage)
    if (!content.trim()) {
      throw new Error('LangChain 返回了空文本。')
    }

    return NextResponse.json(
      {
        content: content.trim(),
        model,
        usage: {
          promptTokens: normalizeUsageNumber(responseMessage.usage_metadata?.input_tokens),
          completionTokens: normalizeUsageNumber(responseMessage.usage_metadata?.output_tokens),
          totalTokens: normalizeUsageNumber(responseMessage.usage_metadata?.total_tokens)
        }
      },
      {
        headers: {
          'Cache-Control': 'no-store' // 响应中可能包含用户输入，禁止任何中间缓存。
        }
      }
    )
  } catch (error) {
    /** 面向页面的错误只包含安全校验或上游协议信息。 */
    /** 上游异常可能回显请求信息，返回前替换临时 Key。 */
    const rawErrorMessage = error instanceof Error ? error.message : '模型实验执行失败。'
    /** 密钥不为空时执行全量替换，保证不通过错误正文返回浏览器。 */
    const errorMessage = sensitiveApiKey
      ? rawErrorMessage.split(sensitiveApiKey).join('[REDACTED]')
      : rawErrorMessage
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}
