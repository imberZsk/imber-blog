/** Markdown 可执行代码围栏支持的运行时。 */
export type RunnableCodeRuntime = 'python' | 'html'

/** 可执行代码围栏中经过校验的元数据。 */
export interface RunnableCodeBlockMetadata {
  /** 代码围栏声明的语法高亮语言。 */
  language: string
  /** 当前代码块是否允许在文章内执行。 */
  runnable: boolean
  /** 沙盒中展示和执行的文件名。 */
  fileName: string
  /** 在线实验面板使用的简短标题。 */
  title: string
  /** 运行前告诉读者应观察什么。 */
  description: string
}

/** 可执行围栏允许保存的安全文件名。 */
const RUNNABLE_FILE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/

/** 解析围栏键值时匹配引号值或不含空格的普通值。 */
const FENCE_ATTRIBUTE_PATTERN = /([a-z][a-z\d-]*)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/gi

/** 不同代码语言默认使用的沙盒入口文件。 */
const DEFAULT_FILE_NAMES: Readonly<Record<RunnableCodeRuntime, string>> = {
  python: 'main.py', // Python 在 Pyodide Worker 中从 main.py 启动。
  html: 'index.html' // HTML 在隔离 iframe 中直接预览 index.html。
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
  /** 当前语言对应的浏览器运行时。 */
  const runtime: RunnableCodeRuntime | null = /^(?:python|py)$/.test(normalizedLanguage)
    ? 'python'
    : /^(?:html|htm)$/.test(normalizedLanguage)
      ? 'html'
      : null

  if (!runtime) {
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

  /** file 属性必须是直接文件名，拒绝目录穿越和路径分隔符。 */
  const requestedFileName = attributes.get('file') || ''
  /** 通过白名单校验的沙盒文件名。 */
  const fileName = RUNNABLE_FILE_NAME_PATTERN.test(requestedFileName)
    ? requestedFileName
    : DEFAULT_FILE_NAMES[runtime]

  return {
    language: runtime,
    runnable: /(?:^|\s)runnable(?:\s|$)/i.test(meta || ''),
    fileName,
    title: attributes.get('title') || '',
    description: attributes.get('description') || ''
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
        `file=${metadata.fileName}`,
        metadata.title ? `title=${JSON.stringify(metadata.title)}` : '',
        metadata.description ? `description=${JSON.stringify(metadata.description)}` : ''
      ].filter(Boolean)
    : []

  return [metadata.language, ...runnableAttributes].filter(Boolean).join(' ')
}
