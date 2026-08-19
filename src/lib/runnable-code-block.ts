import type { KnowledgeModelSandboxFramework, KnowledgeModelSandboxMode } from './knowledge-sandbox'

/** Markdown 可执行代码围栏支持的运行时。 */
export type RunnableCodeRuntime = 'python' | 'typescript' | 'html' | 'model'

/** 可执行代码围栏中经过校验的元数据。 */
export interface RunnableCodeBlockMetadata {
  /** 代码围栏声明的语法高亮语言。 */
  language: string
  /** 当前代码块是否允许在文章内执行。 */
  runnable: boolean
  /** 代码块使用本地浏览器运行时，还是受控的真实模型调用。 */
  runtime: RunnableCodeRuntime
  /** 沙盒中展示和执行的文件名。 */
  fileName: string
  /** 在线实验面板使用的简短标题。 */
  title: string
  /** 运行前告诉读者应观察什么。 */
  description: string
  /** 模型实验运行前预填的非敏感问题。 */
  prompt: string
  /** 模型实验在服务端实际运行的框架。 */
  modelFramework: KnowledgeModelSandboxFramework
  /** LangChain 模型实验执行普通聊天或 Tool 注册验证。 */
  modelMode: KnowledgeModelSandboxMode
}

/** 可执行围栏允许保存的安全文件名。 */
const RUNNABLE_FILE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/

/** 解析围栏键值时匹配引号值或不含空格的普通值。 */
const FENCE_ATTRIBUTE_PATTERN = /([a-z][a-z\d-]*)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/gi

/** 不同代码语言默认使用的沙盒入口文件。 */
const DEFAULT_FILE_NAMES: Readonly<Record<RunnableCodeRuntime, string>> = {
  python: 'main.py', // Python 在 Pyodide Worker 中从 main.py 启动。
  typescript: 'main.ts', // TypeScript 在浏览器 Worker 中编译后执行。
  html: 'index.html', // HTML 在隔离 iframe 中直接预览 index.html。
  model: 'main.ts' // 模型实验展示与服务端一致的 TypeScript LangChain 源码。
}

/**
 * 把 Markdown 围栏的语言和 meta 转为可信执行配置。
 * @param language Markdown 解析器拆出的语言标识。
 * @param meta Markdown 围栏中语言后的属性文本。
 * @returns 只有 Python 或 HTML 才返回规范元数据。
 */
export function parseRunnableCodeBlockMetadata(
  language: string | null | undefined,
  meta: string | null | undefined = ''
): RunnableCodeBlockMetadata | null {
  /** 去掉围栏属性后的规范小写语言。 */
  const normalizedLanguage = (language || '').trim().toLowerCase()
  /** 围栏是否显式声明为真实模型实验。 */
  const isModelSandbox = /(?:^|\s)model-sandbox(?:\s|$)/i.test(meta || '')
  /** 当前围栏的源码语言，模型实验额外允许 TypeScript。 */
  const sourceLanguage: 'python' | 'html' | 'typescript' | null = /^(?:python|py)$/.test(normalizedLanguage)
    ? 'python'
    : /^(?:html|htm)$/.test(normalizedLanguage)
      ? 'html'
      : /^(?:typescript|ts)$/.test(normalizedLanguage)
        ? 'typescript'
        : null

  if (!sourceLanguage) {
    return null
  }

  /** 围栏 meta 中声明的全部键值属性。 */
  const attributes = new Map<string, string>()
  for (const attributeMatch of (meta || '').matchAll(FENCE_ATTRIBUTE_PATTERN)) {
    /** 当前属性名统一为小写，避免同一语义产生多份状态。 */
    const attributeName = attributeMatch[1]?.toLowerCase()
    /** 当前属性值优先读取双引号、单引号，最后读取普通值。 */
    const attributeValue = attributeMatch[2] ?? attributeMatch[3] ?? attributeMatch[4] ?? ''
    if (attributeName) {
      attributes.set(attributeName, attributeValue.trim())
    }
  }

  /** Python 或 TypeScript 围栏可以声明真实模型实验，HTML 继续留在隔离 iframe。 */
  const runtime: RunnableCodeRuntime = sourceLanguage !== 'html' && isModelSandbox
    ? 'model'
    : sourceLanguage === 'html'
      ? 'html'
      : sourceLanguage === 'typescript'
        ? 'typescript'
        : 'python'

  /** 只有显式声明 LlamaIndex 时才切换框架，其余历史文章继续使用 LangChain。 */
  const modelFramework: KnowledgeModelSandboxFramework = attributes.get('framework') === 'llamaindex'
    ? 'llamaindex'
    : 'langchain'
  /** 只有显式声明 tools 时才运行 Tool Calling 实验。 */
  const modelMode: KnowledgeModelSandboxMode = attributes.get('mode') === 'tools' ? 'tools' : 'chat'

  /** file 属性必须是直接文件名，拒绝目录穿越和路径分隔符。 */
  const requestedFileName = attributes.get('file') || ''
  /** 通过白名单校验的沙盒文件名。 */
  const fileName = RUNNABLE_FILE_NAME_PATTERN.test(requestedFileName)
    ? requestedFileName
    : DEFAULT_FILE_NAMES[runtime]

  return {
    language: sourceLanguage,
    runnable: /(?:^|\s)runnable(?:\s|$)/i.test(meta || ''),
    runtime,
    fileName,
    title: attributes.get('title') || '',
    description: attributes.get('description') || '',
    prompt: attributes.get('prompt') || '',
    modelFramework,
    modelMode
  }
}

/**
 * 将 Tiptap 代码块属性序列化为可被普通 Markdown 工具保留的围栏信息串。
 * @param metadata 当前代码块的可信属性。
 * @returns 放在三个反引号后的围栏信息。
 */
export function serializeRunnableCodeBlockInfo(metadata: RunnableCodeBlockMetadata): string {
  /** 仅在启用执行时输出的围栏属性。 */
  const runnableAttributes = metadata.runnable
    ? [
        'runnable',
        metadata.runtime === 'model' ? 'model-sandbox' : '',
        metadata.runtime === 'model' && metadata.modelFramework === 'llamaindex' ? 'framework=llamaindex' : '',
        metadata.runtime === 'model' && metadata.modelMode === 'tools' ? 'mode=tools' : '',
        `file=${metadata.fileName}`,
        metadata.title ? `title=${JSON.stringify(metadata.title)}` : '',
        metadata.description ? `description=${JSON.stringify(metadata.description)}` : '',
        metadata.prompt ? `prompt=${JSON.stringify(metadata.prompt)}` : ''
      ].filter(Boolean)
    : []

  return [metadata.language, ...runnableAttributes].filter(Boolean).join(' ')
}
