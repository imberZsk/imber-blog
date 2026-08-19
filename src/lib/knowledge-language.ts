/** 知识文章和思维导图支持的代码语言。 */
export type KnowledgeLanguage = 'typescript' | 'python'

/** 没有显式选择时使用的代码语言。 */
export const DEFAULT_KNOWLEDGE_LANGUAGE: KnowledgeLanguage = 'typescript'

/** 语言切换控件使用的稳定配置。 */
export const KNOWLEDGE_LANGUAGES: ReadonlyArray<{ value: KnowledgeLanguage; label: string }> = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' }
]

/** LangChain 独立文章树中语言目录所在的模块名。 */
const LANGCHAIN_MODULE_SEGMENT = '01-LangChain'

/**
 * 从知识文章路径中读取独立语言目录。
 * @param articlePath 不含 `/knowledge` 前缀的文章路径。
 * @returns 路径声明的语言；非双语言文章返回 null。
 */
export function getKnowledgeLanguageFromPath(articlePath: string): KnowledgeLanguage | null {
  /** 当前文章路径按目录拆分后的片段。 */
  const pathSegments = articlePath.split('/')
  /** LangChain 模块在当前路径中的位置。 */
  const moduleSegmentIndex = pathSegments.indexOf(LANGCHAIN_MODULE_SEGMENT)
  /** LangChain 模块后的语言目录。 */
  const languageSegment = moduleSegmentIndex >= 0 ? pathSegments[moduleSegmentIndex + 1] : undefined

  return languageSegment === 'typescript' || languageSegment === 'python' ? languageSegment : null
}

/**
 * 把 LangChain 文章路径替换为另一套语言目录。
 * @param articlePath 当前语言文章路径。
 * @param language 目标代码语言。
 * @returns 对应语言文章路径；非双语言文章保持原路径。
 */
export function replaceKnowledgeLanguageInPath(
  articlePath: string,
  language: KnowledgeLanguage
): string {
  /** 当前文章路径按目录拆分后的片段。 */
  const pathSegments = articlePath.split('/')
  /** LangChain 模块在当前路径中的位置。 */
  const moduleSegmentIndex = pathSegments.indexOf(LANGCHAIN_MODULE_SEGMENT)
  /** 当前路径中可能存在的语言目录。 */
  const currentLanguage = moduleSegmentIndex >= 0 ? pathSegments[moduleSegmentIndex + 1] : undefined

  if (currentLanguage !== 'typescript' && currentLanguage !== 'python') {
    return articlePath
  }

  pathSegments[moduleSegmentIndex + 1] = language
  return pathSegments.join('/')
}

/** 条件内容块开始标记。 */
const KNOWLEDGE_LANGUAGE_START_PATTERN = /^<!--\s*knowledge-language:(typescript|python):start\s*-->$/

/** 条件内容块结束标记。 */
const KNOWLEDGE_LANGUAGE_END_PATTERN = /^<!--\s*knowledge-language:end\s*-->$/

/** Markdown 围栏开始或结束行。 */
const MARKDOWN_FENCE_PATTERN = /^\s*(```|~~~)/

/** 可直接判断为 Python 或 TypeScript 的代码围栏语言。 */
const LANGUAGE_CODE_FENCE_PATTERN = /^\s*(?:```|~~~)(python|py|typescript|ts)(?:\s|$)/i

/**
 * 把未知 URL 或调用方输入规范化为受支持的知识语言。
 * @param value URL 查询参数或调用方传入的语言值。
 * @returns 受支持的语言；无效值回退到 TypeScript。
 */
export function parseKnowledgeLanguage(value: string | null | undefined): KnowledgeLanguage {
  /** 去掉聊天软件或 Markdown 链接容易误带到查询参数末尾的中英文标点。 */
  const normalizedValue = value?.trim().replace(/[，,。.;；]+$/u, '').toLowerCase()

  return normalizedValue === 'python' ? 'python' : DEFAULT_KNOWLEDGE_LANGUAGE
}

/**
 * 根据语言条件标记投影 Markdown，共享内容在两种语言中都会保留。
 * @param markdown 包含可选语言条件块的原始 Markdown。
 * @param language 当前需要生成的代码语言版本。
 * @returns 已移除控制标记和另一语言专属内容的 Markdown。
 */
export function projectKnowledgeMarkdown(markdown: string, language: KnowledgeLanguage): string {
  /** 当前正在处理的条件块语言；null 表示共享内容。 */
  let activeLanguage: KnowledgeLanguage | null = null
  /** 当前是否位于代码围栏内，围栏中的相似注释必须按源码保留。 */
  let activeFence: string | null = null
  /** 当前代码围栏是否属于另一语言；另一语言的围栏及源码都不进入派生内容。 */
  let shouldKeepActiveFence = true
  /** 当前语言最终保留的 Markdown 行。 */
  const projectedLines: string[] = []

  for (const markdownLine of markdown.split('\n')) {
    /** 当前行可能使用的 Markdown 围栏符号。 */
    const fenceMatch = markdownLine.match(MARKDOWN_FENCE_PATTERN)
    /** 当前行是否正在关闭已经打开的代码围栏。 */
    const isClosingFence = Boolean(activeFence && fenceMatch?.[1] === activeFence)

    if (!activeFence && fenceMatch?.[1]) {
      /** 围栏声明的代码语言，用于自动排除另一语言的静态示例和沙盒。 */
      const codeLanguage = markdownLine.match(LANGUAGE_CODE_FENCE_PATTERN)?.[1]?.toLowerCase()
      /** `py`/`python` 属于 Python，其余匹配值属于 TypeScript。 */
      const fenceLanguage: KnowledgeLanguage | null = codeLanguage
        ? codeLanguage === 'python' || codeLanguage === 'py'
          ? 'python'
          : 'typescript'
        : null
      activeFence = fenceMatch[1]
      shouldKeepActiveFence = fenceLanguage === null || fenceLanguage === language
    }

    if (!activeFence) {
      /** 当前行是否开始一个语言条件块。 */
      const startMatch = markdownLine.match(KNOWLEDGE_LANGUAGE_START_PATTERN)
      if (startMatch?.[1]) {
        activeLanguage = startMatch[1] as KnowledgeLanguage
        continue
      }

      if (KNOWLEDGE_LANGUAGE_END_PATTERN.test(markdownLine)) {
        activeLanguage = null
        continue
      }
    }

    if ((activeLanguage === null || activeLanguage === language) && shouldKeepActiveFence) {
      projectedLines.push(markdownLine)
    }

    if (isClosingFence) {
      activeFence = null
      shouldKeepActiveFence = true
    }
  }

  /** 已完成条件块和代码围栏过滤的语言正文。 */
  const projectedMarkdown = projectedLines.join('\n')

  if (language === 'python') {
    // LangChain 官方文档的 Python 与 JavaScript 路由结构平行，参考链接必须跟随正文语言切换。
    return projectedMarkdown
      .replaceAll('https://docs.langchain.com/oss/javascript/', 'https://docs.langchain.com/oss/python/')
      .replace(/\[([^\]]*)JavaScript([^\]]*)\]/g, '[$1Python$2]')
  }

  return projectedMarkdown
}
