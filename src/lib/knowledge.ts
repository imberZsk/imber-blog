import 'server-only'

import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, posix, relative, resolve, sep } from 'node:path'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import html from 'remark-html'
import {
  getKnowledgeDirectoryModuleLabel,
  KNOWLEDGE_MODULE_LABELS,
  type KnowledgeTrackSlug
} from '@/app/knowledge/config'
import { getKnowledgeArticleKind, type KnowledgeArticleKind } from '@/lib/knowledge-article-kind'
import { createKnowledgeMindmap, type KnowledgeMindmapData } from '@/lib/knowledge-mindmap'
import {
  DEFAULT_KNOWLEDGE_LANGUAGE,
  getKnowledgeLanguageFromPath,
  projectKnowledgeMarkdown,
  type KnowledgeLanguage
} from '@/lib/knowledge-language'
import { createKnowledgeQuiz, type KnowledgeQuizQuestion } from '@/lib/knowledge-quiz'
import {
  BROWSER_PYTHON_SUPPORT_FILE_PATTERN,
  isInlinePythonSandboxCandidate,
  type KnowledgeSandbox,
  type KnowledgeSandboxFile
} from '@/lib/knowledge-sandbox'
import { parseRunnableCodeBlockMetadata } from '@/lib/runnable-code-block'

/** 知识文章在列表页和阅读页共用的元数据。 */
export interface KnowledgeArticle {
  slug: string[]
  path: string
  displayPath: string
  sourcePath: string
  href: string
  title: string
  /** 页面标题使用的系列名；可与用于侧栏分组的短专题名不同。 */
  seriesTitle: string
  /** 文章在所属模块中从 01 开始的 UI 连续顺序。 */
  sequence: number
  topic: string
  /** 文章在一级模块中的课程或技术细分类。 */
  subtopic: string
  track: KnowledgeTrackSlug | null
  kind: KnowledgeArticleKind
  breadcrumbs: string[]
}

/** 知识库列表页实际需要下发给浏览器的轻量文章元数据。 */
export type KnowledgeListArticle = Pick<
  KnowledgeArticle,
  'path' | 'href' | 'title' | 'sequence' | 'topic' | 'subtopic' | 'kind'
>

export type { KnowledgeArticleKind } from '@/lib/knowledge-article-kind'

/** 阅读页相邻文章导航所需的最小元数据。 */
export type KnowledgeArticleLink = Pick<KnowledgeArticle, 'href' | 'sequence' | 'title' | 'topic'>

/** 单篇知识文章阅读页需要的完整数据。 */
export interface KnowledgeArticlePageData extends KnowledgeArticle {
  /** Markdown 中的参考资料转换后的 HTML，页面固定显示在思维导图之后。 */
  referenceContent: string
  /** Markdown 转换后的文章 HTML。 */
  content: string
  /** 从正文知识结构生成的可交互思维导图。 */
  mindmap: KnowledgeMindmapData | null
  /** 当前文章允许在浏览器隔离环境中运行的可信实验。 */
  sandboxes: KnowledgeSandbox[]
  /** 当前文章核心知识对应的最小题集。 */
  quiz: KnowledgeQuizQuestion[]
  /** 当前实体模块中的上一篇文章。 */
  previousArticle: KnowledgeArticleLink | null
  /** 当前实体模块中的下一篇文章。 */
  nextArticle: KnowledgeArticleLink | null
}

/** Markdown AST 中本功能会访问的节点字段。 */
interface MarkdownNode {
  type?: string
  depth?: number
  value?: string
  lang?: string
  meta?: string
  url?: string
  children?: MarkdownNode[]
  position?: {
    start?: { offset?: number }
    end?: { offset?: number }
  }
}

/** 页面需要前置展示的资料章节名称。 */
const KNOWLEDGE_REFERENCE_HEADING_PATTERN = /^(?:参考资料|事实来源|延伸阅读)$/i

/**
 * 从文章 Markdown 中拆出资料章节，确保页面可以把它们放在思维导图之后且不在正文末尾重复。
 * @param markdown 已完成图片语法规范化的文章 Markdown。
 * @returns 去除资料章节的正文，以及按原顺序拼接的资料 Markdown。
 */
function splitKnowledgeReferenceSections(markdown: string): { bodyMarkdown: string; referenceMarkdown: string } {
  /** Remark 解析后的根节点用于避开代码围栏中的伪标题。 */
  const markdownRoot = remark().parse(markdown) as MarkdownNode
  /** 根节点中的块级 Markdown 节点。 */
  const markdownNodes = markdownRoot.children || []
  /** 等待从正文移除并前置展示的资料章节范围。 */
  const referenceRanges: Array<{ start: number; end: number }> = []

  for (const [nodeIndex, markdownNode] of markdownNodes.entries()) {
    if (markdownNode.type !== 'heading' || !markdownNode.depth) {
      continue
    }

    /** 当前标题的纯文本，用于识别资料章节。 */
    const headingText =
      markdownNode.children
        ?.map((childNode) => childNode.value || '')
        .join('')
        .trim() || ''
    if (!KNOWLEDGE_REFERENCE_HEADING_PATTERN.test(headingText)) {
      continue
    }

    /** 已确认存在的资料标题层级，用于界定章节结束位置。 */
    const referenceHeadingDepth = markdownNode.depth
    /** 资料章节从标题开头开始。 */
    const sectionStart = markdownNode.position?.start?.offset
    /** 下一个同级或更高层标题结束当前资料章节。 */
    const nextSectionNode = markdownNodes
      .slice(nodeIndex + 1)
      .find((candidateNode) => candidateNode.type === 'heading' && (candidateNode.depth || 0) <= referenceHeadingDepth)
    /** 没有后续同级标题时，资料章节延续到文章末尾。 */
    const sectionEnd = nextSectionNode?.position?.start?.offset ?? markdown.length

    if (sectionStart !== undefined) {
      referenceRanges.push({ start: sectionStart, end: sectionEnd })
    }
  }

  /** 按原文顺序保留所有资料章节。 */
  const referenceMarkdown = referenceRanges
    .map((referenceRange) => markdown.slice(referenceRange.start, referenceRange.end).trim())
    .filter(Boolean)
    .join('\n\n')
  /** 从后向前删除资料章节，避免前方偏移影响后续范围。 */
  let bodyMarkdown = markdown
  for (const referenceRange of [...referenceRanges].reverse()) {
    bodyMarkdown = `${bodyMarkdown.slice(0, referenceRange.start)}${bodyMarkdown.slice(referenceRange.end)}`
  }

  return { bodyMarkdown: bodyMarkdown.replace(/\n{3,}/g, '\n\n').trim(), referenceMarkdown }
}

/** 从正文完整 Python 代码块生成的浏览器实验候选。 */
interface InlinePythonSandboxCandidate {
  /** 最近一个标题提供的实验名称。 */
  title: string
  /** 点击运行时执行的文章内入口文件。 */
  entryFile: string
  /** 同一个可运行源码章节公开的入口和支持文件。 */
  files: KnowledgeSandboxFile[]
}

/** 正在从 Markdown “可运行源码”章节收集的多文件 Python 实验。 */
interface InlinePythonSourceSection {
  /** 生成沙盒名称和执行资格判断的章节标题。 */
  title: string
  /** 用于判断章节结束位置的 Markdown 标题层级。 */
  headingDepth: number
  /** 最近一个文件子标题声明的直接文件名。 */
  currentFileName: string | null
  /** 已从文章代码块收集的入口和支持文件。 */
  files: KnowledgeSandboxFile[]
}

/** 新知识目录前缀与已发布旧路径之间的映射。 */
interface KnowledgeDirectoryMigration {
  currentPrefix: string
  legacyPrefix: string
}

/** AI 应用文章合并为系列小标题时使用的匹配规则。 */
interface AiAppSubtopicRule {
  /** 规则生效的一级模块展示名称。 */
  topic: string
  /** 系列在实体知识目录中的完整目录名。 */
  directoryName: string
  /** 合并后显示在列表和右侧目录中的系列名称。 */
  label: string
  /** 属于当前系列的原始课程目录编号。 */
  courseOrders: ReadonlySet<number>
}

/** 知识文章的仓库内根目录。 */
const KNOWLEDGE_CONTENT_ROOT = join(process.cwd(), 'src', 'content', 'knowledge')

/** 本次知识域扁平化生成的旧路径到规范路径映射文件。 */
const KNOWLEDGE_PATH_MIGRATION_FILE = join(process.cwd(), 'src', 'content', 'knowledge-path-migrations.json')

/** 旧文章路径到当前规范路径的精确映射。 */
const KNOWLEDGE_PATH_MIGRATIONS_BY_LEGACY = new Map<string, string>(
  Object.entries(JSON.parse(fs.readFileSync(KNOWLEDGE_PATH_MIGRATION_FILE, 'utf8')) as Record<string, string>)
)

/** 当前规范路径到全部旧文章路径的反向映射。 */
const KNOWLEDGE_LEGACY_PATHS_BY_CURRENT = new Map<string, string[]>()

for (const [legacyPath, currentPath] of KNOWLEDGE_PATH_MIGRATIONS_BY_LEGACY) {
  /** 当前文章已经登记的历史路径。 */
  const legacyPaths = KNOWLEDGE_LEGACY_PATHS_BY_CURRENT.get(currentPath) || []
  legacyPaths.push(legacyPath)
  KNOWLEDGE_LEGACY_PATHS_BY_CURRENT.set(currentPath, legacyPaths)
}

/** 知识文章引用的本地媒体根目录。 */
const KNOWLEDGE_ASSET_ROOT = join(process.cwd(), 'public', 'knowledge-assets')

/** 支持作为知识文章读取的扩展名。 */
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx'])

/** 正文 Python 沙盒统一使用的入口文件名。 */
const INLINE_PYTHON_SANDBOX_ENTRY_FILE = 'main.py'

/** 判断 URL 是否已经是无需改写的绝对地址或页内锚点。 */
const EXTERNAL_URL_PATTERN = /^(?:[a-z][a-z\d+.-]*:|\/|#)/i

/** 匹配 Obsidian 的图片嵌入语法，并保留可选的显示别名。 */
const OBSIDIAN_IMAGE_PATTERN = /!\[\[([^\]]+)\]\]/g

/** 旧版目录正文入口名，仅用于兼容已发布的 chapter 路径。 */
const DIRECTORY_ENTRY_NAMES = new Set(['chapter'])

/** 已合并到主文章但仍保留真实源码的实验目录名称。 */
const LAB_DIRECTORY_NAME = 'lab'

/** 实验文档在源码索引和旧版公开路径中的固定文件名。 */
const LAB_README_FILE_NAME = 'README'

/** 正文中标记已吸收同目录 Demo 内容的注释。 */
const MERGED_LAB_MARKER = '<!-- knowledge-lab-merged -->'

/** 正文中标记已吸收 Markdown 实践材料的注释。 */
const MERGED_PRACTICE_MARKER = '<!-- knowledge-practice-materials-merged -->'

/** 只保存配图或来源资料、不应作为知识文章发布的目录名称。 */
const NON_ARTICLE_DIRECTORY_NAMES = new Set(['assets', '_shared-labs'])

/** Lab 内只服务于示例运行、不应出现在文章列表的支持目录。 */
const LAB_SUPPORT_DIRECTORY_NAMES = new Set(['data', 'docs'])

/** 全栈开发内容所在的路线目录名称。 */
const FULL_STACK_SECTION_NAME = '全栈开发'

/** AI 应用内容所在的路线目录名称。 */
const AI_APP_TRACK_SECTION_NAME = 'AI大模型应用开发'

/** AI 应用内容在知识库中的完整实体目录名称。 */
const AI_APP_TRACK_DIRECTORY_NAME = '03-AI大模型应用开发'

/** AI 应用路线中面试题内容所在的模块目录名称。 */
const AI_APP_INTERVIEW_SECTION_NAME = 'AI大模型应用面试题'

/** AI 应用路线中 Agent 工程内容所在的模块目录名称。 */
const AI_APP_AGENT_SECTION_NAME = 'Agent工程'

/** AI 应用路线中 LangChain 内容所在的模块目录名称。 */
const AI_APP_LANGCHAIN_SECTION_NAME = 'LangChain实战'

/** AI 应用路线中 LangGraph 内容所在的模块目录名称。 */
const AI_APP_LANGGRAPH_SECTION_NAME = 'LangGraph'

/** AI 应用路线中可观测与评测内容所在的模块目录名称。 */
const AI_APP_OBSERVABILITY_SECTION_NAME = 'LangSmith-LangFuse'

/** AI 应用路线中通用工程内容所在的模块目录名称。 */
const AI_APP_ENGINEERING_FOUNDATION_SECTION_NAME = '工程基础'

/** AI 应用路线中企业级知识库内容所在的模块目录名称。 */
const AI_APP_ENTERPRISE_SECTION_NAME = '企业级知识库'

/** AI 应用路线中一人公司内容所在的模块目录名称。 */
const AI_APP_SOLO_COMPANY_SECTION_NAME = '一人公司'

/** 企业级知识库模块的实体目录名称。 */
const AI_APP_ENTERPRISE_CATEGORY_DIRECTORY = '02-企业级知识库'

/** 一人公司模块的实体目录名称。 */
const AI_APP_SOLO_COMPANY_CATEGORY_DIRECTORY = '03-一人公司'

/** 工程基础模块的实体目录名称。 */
const AI_APP_ENGINEERING_FOUNDATION_CATEGORY_DIRECTORY = '08-工程基础'

/** Paperclip 系列重组前使用的目录名称。 */
const AI_APP_LEGACY_PAPERCLIP_DIRECTORY = 'paperclip'

/** Paperclip 系列重组后的实体目录名称。 */
const AI_APP_PAPERCLIP_DIRECTORY = '01-Paperclip'

/** 企业级知识库基础设施系列重组后的实体目录名称。 */
const AI_APP_INFRASTRUCTURE_DIRECTORY = '03-基础设施实战'

/** 工程基础附录重组前使用的目录名称。 */
const AI_APP_LEGACY_APPENDIX_DIRECTORY = 'appendices'

/** 旧 Agent 工程写作指南使用的文件名。 */
const AI_APP_LEGACY_WRITING_GUIDE_NAME = 'writing-guide'

/** 工程基础附录重组后的实体目录名称。 */
const AI_APP_APPENDIX_DIRECTORY = '10-附录'

/** 旧版 Agent 课程在当前知识目录中的统一前缀。 */
const AI_APP_LEGACY_AGENT_CURRENT_PREFIX = '03-AI大模型应用开发/01-Agent工程'

/** 旧版 Agent 课程已经发布的公开 URL 前缀。 */
const AI_APP_LEGACY_AGENT_PUBLIC_PREFIX = '02-Agent'

/** 重分类后 Agent 工程课程保留的原课程编号。 */
const AI_APP_AGENT_ENGINEERING_COURSE_ORDERS = new Set([
  27, 28, 29, 30, 31, 32, 44, 45, 47, 50, 53, 54, 55, 56, 57, 71, 72, 73, 74, 82, 83
])

/** 重分类后归入 LangChain 实战的原课程编号。 */
const AI_APP_LANGCHAIN_COURSE_ORDERS = new Set([35, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 85, 86])

/** 重分类后归入 LangGraph 的原课程编号。 */
const AI_APP_LANGGRAPH_COURSE_ORDERS = new Set([36, 75, 76])

/** 重分类后归入可观测与评测模块的原课程编号。 */
const AI_APP_OBSERVABILITY_COURSE_ORDERS = new Set([40, 81])

/** 从旧 Agent 目录并入企业级知识库的原课程编号。 */
const AI_APP_ENTERPRISE_KNOWLEDGE_COURSE_ORDERS = new Set([43, 91, 92, 93])

/** AI 应用模块原始目录名称到展示名称的映射。 */
const AI_APP_TOPIC_BY_SECTION_NAME: Readonly<Record<string, string>> = {
  [AI_APP_ENGINEERING_FOUNDATION_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
  [AI_APP_AGENT_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.agentEngineering,
  [AI_APP_LANGCHAIN_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.langChainPractice,
  [AI_APP_LANGGRAPH_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.langGraph,
  [AI_APP_OBSERVABILITY_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.observability,
  [AI_APP_ENTERPRISE_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.enterpriseKnowledge,
  [AI_APP_SOLO_COMPANY_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.soloCompany,
  [AI_APP_INTERVIEW_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.interviewQuestions
}

/** AI 编程内容所在的顶层板块名称。 */
const AI_CODING_SECTION_NAME = 'AI编程'

/** 匹配课程目录开头用于排序和分组的数字。 */
const COURSE_ORDER_PATTERN = /^(\d+)-/

/** 已删除学习指南的历史公开路径，直接迁移到对应模块第一篇有效正文。 */
const KNOWLEDGE_GUIDE_PATH_MIGRATIONS = new Map<string, string>([
  ['01-全栈开发/02-后端/java/course', '01-全栈开发/06-Java/01-Java-环境配置'],
  ['01-全栈开发/02-后端/python/course', '01-全栈开发/07-Python/01-Python-环境配置'],
  ['02-AI编程/01-提示词工程/00-课程路线', '02-AI编程/05-Prompt-Engineering/01-认识提示词工程'],
  ['02-AI编程/01-提示词工程/00-学习指南', '02-AI编程/05-Prompt-Engineering/01-认识提示词工程'],
  ['02-AI编程/02-Claude-Code/00-课程路线', '02-AI编程/02-Claude-Code/01-认识-Claude-Code：它到底是什么'],
  ['02-AI编程/03-Codex/00-课程路线', '02-AI编程/03-Codex/01-Codex-是什么'],
  ['02-AI编程/04-Skills/00-课程路线', '02-AI编程/10-Skill/01-Skill-是什么，解决什么问题'],
  ['02-AI编程/05-Agent-Harness/00-课程路线', '02-AI编程/14-Harness-Engineering/01-Harness-是什么'],
  ['03-AI大模型应用开发/01-Agent工程/course', '03-AI大模型应用开发/11-Agent/01-AI-Agent-开发要学什么？'],
  [
    '03-AI大模型应用开发/02-企业级知识库/course',
    '03-AI大模型应用开发/07-RAG/01-安全文件读取-Tool：从-Demo-到可审计数据入口'
  ],
  ['03-AI大模型应用开发/03-一人公司/01-Paperclip/course', '03-AI大模型应用开发/17-项目实战/01-项目：AI-客服助手'],
  ['03-AI大模型应用开发/04-AI大模型应用面试题/course', '03-AI大模型应用开发/22-面试题/01-高频面试题：Agent'],
  ['03-AI大模型应用开发/05-LangChain实战/course', '03-AI大模型应用开发/01-LangChain/01-LangChain-入门'],
  ['03-AI大模型应用开发/06-LangGraph/course', '03-AI大模型应用开发/09-LangGraph/01-LangGraph-入门'],
  [
    '03-AI大模型应用开发/07-LangSmith-LangFuse/course',
    '03-AI大模型应用开发/14-LangSmith-Langfuse/01-Trace、Span-与-Langfuse-实战'
  ],
  ['03-AI大模型应用开发/08-工程基础/course', '03-AI大模型应用开发/18-大模型基础/01-Token与Tokenizer']
])

/** 全栈与 AI 应用的实体课程目录都位于公开路径第 4 段。 */
const NESTED_COURSE_PATH_SEGMENT_INDEX = 3

/** AI 编程的实体课程目录或指南文件位于公开路径第 3 段。 */
const AI_CODING_COURSE_PATH_SEGMENT_INDEX = 2

/** 三条路线都按“知识域/文章”分组，避免旧目录深度制造重复小标题。 */
const COURSE_GROUP_DEPTH_BY_TRACK_SECTION: Partial<Record<string, number>> = {
  [FULL_STACK_SECTION_NAME]: 2,
  [AI_CODING_SECTION_NAME]: 2,
  [AI_APP_TRACK_SECTION_NAME]: 2
}

/** 重组后的规范目录与旧版公开 URL 前缀。 */
const KNOWLEDGE_DIRECTORY_MIGRATIONS: KnowledgeDirectoryMigration[] = [
  { currentPrefix: '01-全栈开发/01-前端', legacyPrefix: '05-前端' },
  { currentPrefix: '01-全栈开发/02-后端', legacyPrefix: '04-后端' },
  { currentPrefix: '01-全栈开发/03-测试', legacyPrefix: '06-测试' },
  { currentPrefix: '02-AI编程', legacyPrefix: '01-AI编程' },
  { currentPrefix: '03-AI大模型应用开发/01-Agent工程', legacyPrefix: '02-Agent' },
  { currentPrefix: '03-AI大模型应用开发/02-企业级知识库', legacyPrefix: '03-企业级知识库项目' },
  { currentPrefix: '03-AI大模型应用开发/03-一人公司', legacyPrefix: '07-一人公司' }
]

/** 顶层知识目录与三条公开学习主线的对应关系。 */
const KNOWLEDGE_TRACK_BY_SECTION: Partial<Record<string, KnowledgeTrackSlug>> = {
  [FULL_STACK_SECTION_NAME]: 'full-stack',
  [AI_CODING_SECTION_NAME]: 'ai-coding',
  [AI_APP_TRACK_SECTION_NAME]: 'ai-apps'
}

/** 匹配目录或文件名前用于控制顺序的数字前缀。 */
const ORDER_PREFIX_PATTERN = /^\d+-/

/** 匹配标题中已经存在的课程、实践或附录前缀。 */
const ARTICLE_TITLE_PREFIX_PATTERN =
  /^(?:第\s*\d+\s*课(?:实践)?|附录\s*\d+|\d+\s*(?:[-·:]\s*demo\s*[：:]?|[-·:]|demo\s*[：:]))\s*[：:]?\s*/i

/** 匹配旧正文一级标题中没有分隔符的两位以内课号。 */
const PLAIN_ARTICLE_ORDER_PREFIX_PATTERN = /^\d{1,2}\s+/

/** 匹配旧文章标题中“系列名称（序号）-”形式的重复编号。 */
const ARTICLE_SERIES_TITLE_PREFIX_PATTERN = /^[^（）()\n]{1,80}[（(]\s*\d+\s*[）)]\s*[-—–:：]\s*/

/** 不参与普通课程序号展示的目录控制编号。 */
const RESERVED_ARTICLE_ORDERS = new Set([0, 98, 99])

/** 清理旧标题中已经存在的学习指南语义前缀。 */
const GUIDE_TITLE_PREFIX_PATTERN = /^(?:学习指南|学习路线)\s*[：:]\s*/

/** 匹配当前或旧版页面统一生成的课号前缀。 */
const SEQUENCED_TITLE_PREFIX_PATTERN = /^(?:（\d+）\s*-\s*|第\s*\d+\s*课(?:实践|扩展)?[：:]\s*)/

/** 需要使用标准技术品牌大小写的细分类名称。 */
const KNOWLEDGE_SUBTOPIC_LABELS: Record<string, string> = {
  appendices: '附录',
  java: 'Java',
  paperclip: 'Paperclip',
  python: 'Python',
  playwright: 'Playwright'
}

/**
 * 创建一条 AI 应用课程系列归组规则。
 * @param topic 规则生效的一级模块展示名称。
 * @param directoryName 系列在实体知识目录中的完整目录名。
 * @param label 合并后的系列小标题。
 * @param courseOrders 当前系列包含的原始课程编号。
 */
function createAiAppSubtopicRule(
  topic: string,
  directoryName: string,
  label: string,
  courseOrders: readonly number[]
): AiAppSubtopicRule {
  return { topic, directoryName, label, courseOrders: new Set(courseOrders) }
}

/** AI 应用原始课程编号到系列小标题的集中映射。 */
const AI_APP_SUBTOPIC_RULES: readonly AiAppSubtopicRule[] = [
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '02-AI应用开发入门',
    'AI 应用开发入门',
    [1, 2, 3]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '03-Python',
    'Python',
    [4, 5, 6, 7, 8, 9]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '04-大模型API与应用工程',
    '大模型 API 与应用工程',
    [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '05-RAG基础',
    'RAG 基础',
    [20, 21, 22, 23, 24, 25, 26]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '06-应用框架',
    '应用框架',
    [33, 34, 37]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '07-部署成本与排障',
    '部署、成本与排障',
    [38, 39, 41, 42]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '08-项目与求职',
    '项目与求职',
    [46, 48, 49, 51, 52]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '09-生产进阶专题',
    '生产进阶专题',
    [77, 78, 79, 80, 84, 87, 88, 89, 90]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.agentEngineering,
    '02-Agent基础',
    'Agent 基础',
    [27, 28, 29, 30, 31, 32]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.agentEngineering,
    '03-Agent项目与面试',
    'Agent 项目与面试',
    [44, 45, 47, 50]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.agentEngineering,
    '04-Tool-MCP与Skill',
    'Tool、MCP 与 Skill',
    [53, 54, 55, 56, 57]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.agentEngineering,
    '05-任务调度与交互',
    '任务调度与交互',
    [71, 72, 73, 74]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.agentEngineering,
    '06-DeepAgents与Multi-Agent',
    'DeepAgents 与 Multi-Agent',
    [82, 83]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.enterpriseKnowledge,
    '02-RAG核心链路',
    'RAG 核心链路',
    [2, 6, 7, 8]
  ),
  createAiAppSubtopicRule(KNOWLEDGE_MODULE_LABELS.aiApps.enterpriseKnowledge, '03-基础设施实战', '基础设施实战', [3]),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.enterpriseKnowledge,
    '04-企业知识库项目',
    '企业知识库项目',
    [43]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.enterpriseKnowledge,
    '05-企业级RAG进阶',
    '企业级 RAG 进阶',
    [91, 92, 93]
  ),
  createAiAppSubtopicRule(KNOWLEDGE_MODULE_LABELS.aiApps.langChainPractice, '02-LangChain入门', 'LangChain 入门', [35]),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.langChainPractice,
    '03-文档检索与向量库',
    '文档检索与向量库',
    [58, 59, 60, 61, 62]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.langChainPractice,
    '04-Chain输出与上下文',
    'Chain、输出与上下文',
    [63, 64, 65, 66, 67, 68, 69, 70]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.langChainPractice,
    '05-短期与长期记忆',
    '短期与长期记忆',
    [85, 86]
  ),
  createAiAppSubtopicRule(KNOWLEDGE_MODULE_LABELS.aiApps.langGraph, '02-LangGraph入门', 'LangGraph 入门', [36]),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.langGraph,
    '03-图编排与Agentic-RAG',
    '图编排与 Agentic RAG',
    [75, 76]
  ),
  createAiAppSubtopicRule(KNOWLEDGE_MODULE_LABELS.aiApps.observability, '02-可观测性入门', '可观测性入门', [40]),
  createAiAppSubtopicRule(KNOWLEDGE_MODULE_LABELS.aiApps.observability, '03-LangSmith实战', 'LangSmith 实战', [81]),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.interviewQuestions,
    '02-AI大模型应用面试题',
    'AI 大模型应用面试题',
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
  )
]

/** 可供 Obsidian 图片语法按文件名查找的全部媒体相对路径。 */
const KNOWLEDGE_ASSET_PATHS = fs.existsSync(KNOWLEDGE_ASSET_ROOT)
  ? (fs.readdirSync(KNOWLEDGE_ASSET_ROOT, { recursive: true }) as string[])
      .map((assetPath) => assetPath.split(sep).join('/'))
      .filter((assetPath) => fs.statSync(join(KNOWLEDGE_ASSET_ROOT, assetPath)).isFile())
  : []

/** 生产构建中复用的文章目录/** 生产构建中复用的文章目录，避免每个静态页面重复扫描全部 Markdown。 */
let productionKnowledgeArticles: KnowledgeArticle[] | null = null

/**
 * 递归查找目录中的 Markdown 文件。
 * @param directory 当前需要扫描的绝对目录。
 */
function findMarkdownFiles(directory: string): string[] {
  /** 当前目录下找到的文章绝对路径。 */
  const files: string[] = []

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    /** 当前目录项的绝对路径。 */
    const entryPath = join(directory, entry.name)

    if (entry.isDirectory()) {
      // Demo 已合并进主文章，lab 目录只保留运行源码和夹具，不再生成独立文章页。
      if (entry.name === LAB_DIRECTORY_NAME) {
        continue
      }

      /** 当前扫描目录的名称，用于识别 Lab 支持文件。 */
      const parentDirectoryName = directory.split(sep).at(-1) || ''
      /** 配图资料和 Lab 数据不会生成可访问文章页。 */
      const shouldSkipDirectory =
        NON_ARTICLE_DIRECTORY_NAMES.has(entry.name) ||
        (parentDirectoryName === 'lab' && LAB_SUPPORT_DIRECTORY_NAMES.has(entry.name))
      if (shouldSkipDirectory) {
        continue
      }

      files.push(...findMarkdownFiles(entryPath))
      continue
    }

    if (entry.isFile() && MARKDOWN_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      /** Lab 内除 README 外的 Markdown 是 Prompt、规则或测试夹具，不是文章。 */
      const isLabSupportFile = directory.split(sep).includes('lab') && entry.name !== 'README.md'
      if (isLabSupportFile) {
        continue
      }

      files.push(entryPath)
    }
  }

  return files
}

/**
 * 把旧版 Demo 文章路径映射到已经吸收实践内容的主文章源路径。
 * @param articlePath 当前请求或 Markdown 链接中的无扩展名文章路径。
 */
function getMergedDemoArticlePath(articlePath: string): string {
  /** 旧 Demo 页面在知识库中的固定路径后缀。 */
  const labReadmeSuffix = `/${LAB_DIRECTORY_NAME}/${LAB_README_FILE_NAME}`
  if (!articlePath.endsWith(labReadmeSuffix)) {
    return articlePath
  }

  /** 去掉 lab/README 后的课程目录路径。 */
  const coursePath = articlePath.slice(0, -labReadmeSuffix.length)
  /** 扁平化后课程正文与 Lab 所属目录使用同一语义名称。 */
  if (hasKnowledgeArticlePath(coursePath)) {
    return coursePath
  }

  /** 继续兼容迁移前尚未扁平化的目录入口。 */
  const mainArticleEntryNames = ['chapter', 'course']

  for (const entryName of mainArticleEntryNames) {
    /** 当前主文章入口的绝对无扩展名路径。 */
    const candidateBasePath = resolve(KNOWLEDGE_CONTENT_ROOT, ...coursePath.split('/'), entryName)
    /** 当前入口是否存在任一受支持的 Markdown 后缀。 */
    const hasCandidateFile = [...MARKDOWN_EXTENSIONS].some((extension) => {
      /** 当前扩展名对应的完整文件路径。 */
      const candidatePath = `${candidateBasePath}${extension}`
      return fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()
    })

    if (hasCandidateFile) {
      return `${coursePath}/${entryName}`
    }
  }

  return coursePath
}

/**
 * 从 Markdown 的首个一级标题提取文章标题。
 * @param markdown 文章原始 Markdown 内容。
 * @param fallbackTitle 未声明一级标题时使用的文件名。
 */
function extractTitle(markdown: string, fallbackTitle: string): string {
  /** Markdown 中首个一级标题的匹配结果。 */
  const headingMatch = markdown.match(/^#\s+(.+)$/m)

  return headingMatch?.[1]?.replace(/[`*_~]/g, '').trim() || fallbackTitle
}

/**
 * 从文章路径中提取最靠近正文的课程编号。
 * @param sourceArticlePath 不含扩展名的源文章相对路径。
 */
function getArticleOrder(sourceArticlePath: string): number | null {
  /** 从正文文件向课程目录反向检查的路径片段。 */
  const reversedPathSegments = sourceArticlePath.split('/').reverse()

  for (const pathSegment of reversedPathSegments) {
    /** 当前路径片段携带的排序编号。 */
    const articleOrder = getCourseOrder(pathSegment)

    if (articleOrder !== null && !RESERVED_ARTICLE_ORDERS.has(articleOrder)) {
      return articleOrder
    }
  }

  return null
}

/**
 * 返回 AI 应用实体课程在目录重组前使用的全局课号。
 * @param sourceArticlePath 不含扩展名的源文章相对路径。
 */
function getOriginalAiAppCourseOrder(sourceArticlePath: string): number | null {
  /** 源文章路径按目录拆分后的片段。 */
  const pathSegments = sourceArticlePath.split('/')
  if (pathSegments[0] !== AI_APP_TRACK_DIRECTORY_NAME || pathSegments.length < 4) {
    return null
  }

  /** 当前文章所属的 AI 应用实体模块目录。 */
  const categoryDirectory = pathSegments[1] || ''
  /** 当前文章所在的实体系列目录。 */
  const seriesDirectory = pathSegments[2] || ''
  if (
    categoryDirectory === AI_APP_ENTERPRISE_CATEGORY_DIRECTORY &&
    seriesDirectory === AI_APP_INFRASTRUCTURE_DIRECTORY
  ) {
    return null
  }

  /** 当前实体模块对应的页面展示名称。 */
  const topic = getAiAppTopicByCategoryDirectory(categoryDirectory)
  /** 当前实体系列对应的归组规则。 */
  const matchedRule = getAiAppSubtopicRuleByDirectory(topic, seriesDirectory)
  if (!matchedRule) {
    return null
  }

  /** 当前系列内从 01 开始编号的课程目录。 */
  const localCourseDirectory = pathSegments[3] || ''
  /** 当前课程使用的系列内本地课号。 */
  const localCourseOrder = getCourseOrder(localCourseDirectory)
  return localCourseOrder === null ? null : getAiAppOriginalCourseOrder(matchedRule, localCourseOrder)
}

/**
 * 清理源文章中已经存在的课号和用途前缀。
 * @param rawTitle Markdown 中声明的原始标题。
 * @param sourceArticlePath 不含扩展名的源文章相对路径。
 */
function getBaseArticleTitle(rawTitle: string, sourceArticlePath: string): string {
  /** 从正文所在目录得出的课程编号。 */
  const articleOrder = getArticleOrder(sourceArticlePath)
  /** AI 应用课程目录重排前使用的全局课号。 */
  const originalAiAppCourseOrder = getOriginalAiAppCourseOrder(sourceArticlePath)
  /** 当前本地课号和旧全局课号组成的可清理编号集合。 */
  const matchingArticleOrders = [...new Set([articleOrder, originalAiAppCourseOrder].filter((order) => order !== null))]
  /** 匹配与当前或历史路径课号相同、但没有分隔符的旧标题编号。 */
  const matchingOrderPrefixPattern = matchingArticleOrders.length
    ? new RegExp(`^0*(?:${matchingArticleOrders.join('|')})(?:\\s+章\\s+Demo\\s*[·:：-]?|\\s+)`, 'i')
    : null
  /** 先清理带分隔符的通用旧标题前缀。 */
  const titleWithoutKnownPrefix = rawTitle.replace(ARTICLE_TITLE_PREFIX_PATTERN, '')
  /** 先去掉系列名称，避免其后的旧纯数字课号被系列前缀遮挡。 */
  const titleWithoutSeriesPrefix = titleWithoutKnownPrefix.replace(ARTICLE_SERIES_TITLE_PREFIX_PATTERN, '')
  /** 路径有明确课号时，继续清理正文标题中遗留的旧纯数字课号。 */
  const titleWithoutPlainOrder =
    articleOrder === null
      ? titleWithoutSeriesPrefix
      : titleWithoutSeriesPrefix.replace(PLAIN_ARTICLE_ORDER_PREFIX_PATTERN, '')
  /** 去掉旧课号、Demo 和学习指南标记后的标题正文。 */
  const normalizedTitle = (
    matchingOrderPrefixPattern ? titleWithoutPlainOrder.replace(matchingOrderPrefixPattern, '') : titleWithoutPlainOrder
  )
    .replace(GUIDE_TITLE_PREFIX_PATTERN, '')
    .trim()

  return normalizedTitle || rawTitle
}

/**
 * 生成与细分类内连续顺序一致的列表和正文标题。
 * @param baseTitle 已清理旧顺序前缀的文章标题。
 * @param kind 当前文章在学习路径中的用途。
 * @param sequence 当前文章标题需要展示的课程顺序。
 */
function getSequencedArticleTitle(
  baseTitle: string,
  kind: KnowledgeArticleKind,
  sequence: number,
  topic: string
): string {
  /** 统一使用两位数展示的细分类内顺序。 */
  const sequenceLabel = sequence.toString().padStart(2, '0')

  if (kind === 'guide') {
    return `${topic}（${sequenceLabel}） - 学习指南`
  }

  return `${topic}（${sequenceLabel}） - ${baseTitle}`
}

/**
 * 将仓库相对路径编码成可安全用于 URL 的分段路径。
 * @param pathValue 使用正斜杠分隔的仓库相对路径。
 */
function encodePath(pathValue: string): string {
  return pathValue.split('/').map(encodeURIComponent).join('/')
}

/**
 * 将目录入口文件路径转换为对外展示的父目录路径。
 * @param articlePath 不含扩展名的源文章相对路径。
 */
function getPublicArticlePath(articlePath: string): string {
  /** 源文章路径的分段结果。 */
  const pathSegments = articlePath.split('/')

  return DIRECTORY_ENTRY_NAMES.has(pathSegments.at(-1) || '') ? pathSegments.slice(0, -1).join('/') : articlePath
}

/**
 * 将匹配的知识路径前缀替换为目标前缀。
 * @param articlePath 需要转换的文章路径。
 * @param sourcePrefix 当前路径必须匹配的来源前缀。
 * @param targetPrefix 转换后使用的目标前缀。
 */
function replaceKnowledgePathPrefix(articlePath: string, sourcePrefix: string, targetPrefix: string): string | null {
  if (articlePath !== sourcePrefix && !articlePath.startsWith(`${sourcePrefix}/`)) {
    return null
  }

  /** 来源前缀之后需要原样保留的文章子路径。 */
  const pathSuffix = articlePath.slice(sourcePrefix.length)
  return `${targetPrefix}${pathSuffix}`
}

/**
 * 返回已删除指南对应的历史公开路径。
 * @param articlePath 当前规范文章路径。
 */
function getLegacyGuideSequenceArticlePaths(articlePath: string): string[] {
  /** 当前指南路径对应的全部旧指南路径。 */
  const legacyGuidePaths = [...KNOWLEDGE_GUIDE_PATH_MIGRATIONS.entries()]
    .filter(([, currentGuidePath]) => currentGuidePath === articlePath)
    .map(([legacyGuidePath]) => legacyGuidePath)
  if (legacyGuidePaths.length > 0) {
    return legacyGuidePaths
  }
  return []
}

/**
 * 将已删除指南的历史公开路径转换为当前正文路径。
 * @param articlePath URL 中请求的旧版文章路径。
 */
function getCurrentGuideSequenceArticlePath(articlePath: string): string {
  if (hasKnowledgeArticlePath(articlePath)) {
    return articlePath
  }

  /** 旧指南路径直接对应的当前正文路径。 */
  const currentGuidePath = KNOWLEDGE_GUIDE_PATH_MIGRATIONS.get(articlePath)
  return currentGuidePath || articlePath
}

/**
 * 判断一个无扩展名文章路径是否已经存在于当前知识目录。
 * @param articlePath 需要检查的知识库相对路径。
 */
function hasKnowledgeArticlePath(articlePath: string): boolean {
  /** 无扩展名文章路径对应的绝对基础路径。 */
  const articleBasePath = resolve(KNOWLEDGE_CONTENT_ROOT, ...articlePath.split('/'))
  /** 直接 Markdown 文件是否存在。 */
  const hasDirectArticle = [...MARKDOWN_EXTENSIONS].some((extension) => {
    /** 当前检查的直接文章文件。 */
    const candidatePath = `${articleBasePath}${extension}`
    return fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()
  })
  if (hasDirectArticle) {
    return true
  }

  /** 目录入口 Markdown 文件是否存在。 */
  return [...DIRECTORY_ENTRY_NAMES].some((entryName) =>
    [...MARKDOWN_EXTENSIONS].some((extension) => {
      /** 当前检查的目录入口文件。 */
      const candidatePath = join(articleBasePath, `${entryName}${extension}`)
      return fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()
    })
  )
}

/**
 * 返回规范知识路径对应的旧版公开路径，用于保留已发布链接。
 * @param articlePath 重组后的规范文章路径。
 */
export function getLegacyKnowledgeArticlePath(articlePath: string): string | null {
  /** 重分类后的 AI 应用文章对应的旧 Agent 公开路径。 */
  const legacyAiAppArticlePath = getLegacyAiAppArticlePath(articlePath)
  if (legacyAiAppArticlePath) {
    return legacyAiAppArticlePath
  }

  /** 移除新增系列层级后的重组前完整文章路径。 */
  const legacyFlatArticlePath = getLegacyFlatAiAppArticlePath(articlePath) || articlePath

  for (const directoryMigration of KNOWLEDGE_DIRECTORY_MIGRATIONS) {
    /** 当前目录迁移规则转换出的旧版路径。 */
    const legacyArticlePath = replaceKnowledgePathPrefix(
      legacyFlatArticlePath,
      directoryMigration.currentPrefix,
      directoryMigration.legacyPrefix
    )

    if (legacyArticlePath) {
      return legacyArticlePath
    }
  }

  return null
}

/**
 * 返回规范文章需要保留的全部历史路径。
 * @param articlePath 重组后的规范文章路径。
 */
export function getKnowledgeArticleAliasPaths(articlePath: string): string[] {
  /** 本次扁平化前位于旧实体目录中的文章路径。 */
  const taxonomyLegacyPaths = KNOWLEDGE_LEGACY_PATHS_BY_CURRENT.get(articlePath) || []
  /** 更早版本使用的短目录或指南重编号路径。 */
  const taxonomyHistoricalPaths = taxonomyLegacyPaths.flatMap((taxonomyLegacyPath) => [
    getLegacyKnowledgeArticlePath(taxonomyLegacyPath),
    ...getLegacyGuideSequenceArticlePaths(taxonomyLegacyPath)
  ])
  /** 已发布的短公开路径，例如旧版 `/02-Agent/...`。 */
  const legacyPublicPath = getLegacyKnowledgeArticlePath(articlePath)
  /** 新增实体系列目录之前使用的完整扁平路径。 */
  const legacyFlatAiAppPath = getLegacyFlatAiAppArticlePath(articlePath)
  /** 系列目录已存在、但课程仍使用旧全局课号时的历史路径。 */
  const legacyGlobalAiAppSeriesPath = getLegacyGlobalAiAppSeriesArticlePath(articlePath)
  /** 重分类前使用的完整 AI 应用目录路径。 */
  const legacyAiAppCurrentPath = getLegacyAiAppCurrentArticlePath(articlePath)
  /** 学习指南占第 01 篇之前使用的指南或课程路径。 */
  const legacyGuideSequencePaths = getLegacyGuideSequenceArticlePaths(articlePath)
  /** 同时使用旧顶层目录和旧课号的更早版本公开路径。 */
  const legacyGuideSequencePublicPaths = legacyGuideSequencePaths
    .map((legacyGuideSequencePath) => getLegacyKnowledgeArticlePath(legacyGuideSequencePath))
    .filter((legacyGuideSequencePath): legacyGuideSequencePath is string => Boolean(legacyGuideSequencePath))
  /** 使用集合避免未移动文章的别名与规范路径重复。 */
  const aliasPaths = new Set(
    [
      legacyPublicPath,
      legacyFlatAiAppPath,
      legacyGlobalAiAppSeriesPath,
      legacyAiAppCurrentPath,
      ...taxonomyLegacyPaths,
      ...taxonomyHistoricalPaths,
      ...legacyGuideSequencePaths,
      ...legacyGuideSequencePublicPaths
    ].filter((aliasPath): aliasPath is string => Boolean(aliasPath && aliasPath !== articlePath))
  )

  return [...aliasPaths]
}

/**
 * 返回已合并 Demo 对应的旧 `/lab/README` 路径。
 * @param sourceArticlePath 规范文章在知识库中的无扩展名源路径。
 */
export function getMergedDemoAliasPath(sourceArticlePath: string): string | null {
  /** 当前源文章任一受支持扩展名对应的绝对路径。 */
  const articleFilePath = [...MARKDOWN_EXTENSIONS]
    .map((extension) => resolve(KNOWLEDGE_CONTENT_ROOT, ...sourceArticlePath.split('/')) + extension)
    .find((candidatePath) => fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile())
  if (!articleFilePath) {
    return null
  }

  /** 只为确实执行过 Demo 合并的正文保留历史路由。 */
  const articleMarkdown = fs.readFileSync(articleFilePath, 'utf8')
  /** 正文是否吸收过实验说明或 Markdown 实践材料。 */
  const hasMergedDemo = articleMarkdown.includes(MERGED_LAB_MARKER) || articleMarkdown.includes(MERGED_PRACTICE_MARKER)
  if (!hasMergedDemo) {
    return null
  }

  /** 学习指南来自系列根 course.md，其他扁平正文来自同名课程目录。 */
  const labOwnerPath = posix.basename(sourceArticlePath).endsWith('-学习指南')
    ? posix.dirname(sourceArticlePath)
    : sourceArticlePath
  return posix.join(labOwnerPath, LAB_DIRECTORY_NAME, LAB_README_FILE_NAME)
}

/**
 * 将旧版公开文章路径转换为重组后的实际文件路径。
 * @param articlePath URL 中请求的新版或旧版文章路径。
 */
function getCurrentKnowledgeArticlePath(articlePath: string): string {
  /** 本次扁平化后与旧实体文章精确对应的规范路径。 */
  const taxonomyCurrentPath = KNOWLEDGE_PATH_MIGRATIONS_BY_LEGACY.get(articlePath)
  if (taxonomyCurrentPath) {
    return taxonomyCurrentPath
  }

  /** 旧版公开路径按通用目录规则转换后的规范路径。 */
  let migratedArticlePath = articlePath

  for (const directoryMigration of KNOWLEDGE_DIRECTORY_MIGRATIONS) {
    /** 当前目录迁移规则转换出的规范路径。 */
    const currentArticlePath = replaceKnowledgePathPrefix(
      articlePath,
      directoryMigration.legacyPrefix,
      directoryMigration.currentPrefix
    )

    if (currentArticlePath) {
      migratedArticlePath = currentArticlePath
      break
    }
  }

  /** AI 应用旧目录完成重分类后的中间路径。 */
  const currentAiAppArticlePath = getCurrentAiAppArticlePath(migratedArticlePath)
  /** chapter 曾是内部目录入口；扁平化后旧请求直接落到同名正文。 */
  const flattenedArticlePath = currentAiAppArticlePath.endsWith('/chapter')
    ? currentAiAppArticlePath.slice(0, -'/chapter'.length)
    : currentAiAppArticlePath
  return getCurrentGuideSequenceArticlePath(flattenedArticlePath)
}

/**
 * 根据旧 Agent 课程目录名称返回重分类后的 AI 应用模块目录。
 * @param courseDirectoryName 旧 Agent 目录下的课程或附录目录名称。
 */
function getAiAppCategoryDirectory(courseDirectoryName: string): string {
  /** 课程目录开头用于分类的原始课号。 */
  const courseOrder = getCourseOrder(courseDirectoryName)

  if (courseOrder !== null && AI_APP_AGENT_ENGINEERING_COURSE_ORDERS.has(courseOrder)) {
    return '01-Agent工程'
  }

  if (courseOrder !== null && AI_APP_LANGCHAIN_COURSE_ORDERS.has(courseOrder)) {
    return '05-LangChain实战'
  }

  if (courseOrder !== null && AI_APP_LANGGRAPH_COURSE_ORDERS.has(courseOrder)) {
    return '06-LangGraph'
  }

  if (courseOrder !== null && AI_APP_OBSERVABILITY_COURSE_ORDERS.has(courseOrder)) {
    return '07-LangSmith-LangFuse'
  }

  if (courseOrder !== null && AI_APP_ENTERPRISE_KNOWLEDGE_COURSE_ORDERS.has(courseOrder)) {
    return '02-企业级知识库'
  }

  return '08-工程基础'
}

/**
 * 根据 AI 应用实体模块目录返回页面使用的模块展示名称。
 * @param categoryDirectory AI 应用路线下带排序前缀的模块目录。
 */
function getAiAppTopicByCategoryDirectory(categoryDirectory: string): string {
  /** 去除实体排序前缀后的模块目录名称。 */
  const sectionName = getDisplayName(categoryDirectory)
  return AI_APP_TOPIC_BY_SECTION_NAME[sectionName] || getKnowledgeDirectoryModuleLabel(sectionName)
}

/**
 * 查找指定模块和实体系列目录对应的归组规则。
 * @param topic 当前文章所属的一级模块。
 * @param directoryName 当前文章所在的实体系列目录名称。
 */
function getAiAppSubtopicRuleByDirectory(topic: string, directoryName: string): AiAppSubtopicRule | undefined {
  return AI_APP_SUBTOPIC_RULES.find(
    (subtopicRule) => subtopicRule.topic === topic && subtopicRule.directoryName === directoryName
  )
}

/**
 * 查找指定模块和旧课程目录对应的系列归组规则。
 * @param topic 当前文章所属的一级模块。
 * @param courseDirectoryName 重组前直接位于模块下的课程目录名称。
 */
function getAiAppSubtopicRuleByCourseDirectory(
  topic: string,
  courseDirectoryName: string
): AiAppSubtopicRule | undefined {
  /** 旧课程目录保留的原始课号。 */
  const courseOrder = getCourseOrder(courseDirectoryName)
  if (courseOrder === null) {
    return undefined
  }

  return AI_APP_SUBTOPIC_RULES.find(
    (subtopicRule) => subtopicRule.topic === topic && subtopicRule.courseOrders.has(courseOrder)
  )
}

/**
 * 返回旧全局课号在当前系列中的本地课号。
 * @param subtopicRule 当前课程所属的系列规则。
 * @param originalCourseOrder 课程重组前使用的全局课号。
 */
function getAiAppLocalCourseOrder(subtopicRule: AiAppSubtopicRule, originalCourseOrder: number): number | null {
  /** 旧全局课号在系列课程顺序中的下标。 */
  const originalCourseIndex = [...subtopicRule.courseOrders].indexOf(originalCourseOrder)
  return originalCourseIndex >= 0 ? originalCourseIndex + 1 : null
}

/**
 * 返回系列本地课号对应的旧全局课号。
 * @param subtopicRule 当前课程所属的系列规则。
 * @param localCourseOrder 课程在当前系列中从 01 开始的课号。
 */
function getAiAppOriginalCourseOrder(subtopicRule: AiAppSubtopicRule, localCourseOrder: number): number | null {
  /** 当前系列按原始顺序保存的全部旧全局课号。 */
  const originalCourseOrders = [...subtopicRule.courseOrders]
  return originalCourseOrders[localCourseOrder - 1] ?? null
}

/**
 * 替换课程目录的数字前缀并保留课程名称。
 * @param courseDirectoryName 带数字前缀的课程目录名称。
 * @param courseOrder 需要写入目录的两位课程编号。
 */
function replaceCourseDirectoryOrder(courseDirectoryName: string, courseOrder: number): string {
  /** 去掉旧数字前缀后需要原样保留的课程名称。 */
  const courseTitle = courseDirectoryName.replace(COURSE_ORDER_PATTERN, '')
  /** 补齐为两位数的系列内课程编号。 */
  const courseOrderLabel = courseOrder.toString().padStart(2, '0')
  return `${courseOrderLabel}-${courseTitle}`
}

/**
 * 判断规范知识路径是否已经指向现有文件或目录入口。
 * @param articlePath 不带 Markdown 扩展名的知识文章路径。
 */
function doesKnowledgeArticlePathExist(articlePath: string): boolean {
  /** 当前文章路径对应的无扩展名绝对路径。 */
  const articleBasePath = resolve(KNOWLEDGE_CONTENT_ROOT, ...articlePath.split('/'))
  if (fs.existsSync(articleBasePath)) {
    return true
  }

  for (const extension of MARKDOWN_EXTENSIONS) {
    /** 当前尝试匹配的 Markdown 文件路径。 */
    const markdownFilePath = `${articleBasePath}${extension}`
    if (fs.existsSync(markdownFilePath)) {
      return true
    }
  }

  for (const entryName of DIRECTORY_ENTRY_NAMES) {
    for (const extension of MARKDOWN_EXTENSIONS) {
      /** 当前尝试匹配的目录入口文件路径。 */
      const directoryEntryPath = join(articleBasePath, `${entryName}${extension}`)
      if (fs.existsSync(directoryEntryPath)) {
        return true
      }
    }
  }

  return false
}

/**
 * 将模块下的旧扁平课程路径转换为带实体系列目录的规范路径。
 * @param articlePath 已完成模块重分类的 AI 应用文章路径。
 */
function getCurrentAiAppSeriesArticlePath(articlePath: string): string {
  /** 当前文章路径按目录拆分后的片段。 */
  const pathSegments = articlePath.split('/')
  if (pathSegments[0] !== AI_APP_TRACK_DIRECTORY_NAME || pathSegments.length < 3) {
    return articlePath
  }

  /** 当前文章所属的 AI 应用实体模块目录。 */
  const categoryDirectory = pathSegments[1] || ''
  /** 模块下的系列目录或旧课程目录。 */
  const seriesOrCourseDirectory = pathSegments[2] || ''

  if (
    categoryDirectory === AI_APP_SOLO_COMPANY_CATEGORY_DIRECTORY &&
    seriesOrCourseDirectory === AI_APP_LEGACY_PAPERCLIP_DIRECTORY
  ) {
    pathSegments[2] = AI_APP_PAPERCLIP_DIRECTORY
    return pathSegments.join('/')
  }

  if (
    categoryDirectory === AI_APP_ENGINEERING_FOUNDATION_CATEGORY_DIRECTORY &&
    seriesOrCourseDirectory === AI_APP_LEGACY_APPENDIX_DIRECTORY
  ) {
    pathSegments[2] = AI_APP_APPENDIX_DIRECTORY
    return pathSegments.join('/')
  }

  /** 当前实体模块对应的页面展示名称。 */
  const topic = getAiAppTopicByCategoryDirectory(categoryDirectory)
  /** 当前路径第三层已经匹配到的实体系列规则。 */
  const currentSeriesRule = getAiAppSubtopicRuleByDirectory(topic, seriesOrCourseDirectory)
  if (currentSeriesRule) {
    if (doesKnowledgeArticlePathExist(articlePath)) {
      return articlePath
    }

    /** 系列目录下仍使用旧全局课号的历史课程目录。 */
    const legacyCourseDirectory = pathSegments[3] || ''
    /** 历史课程目录携带的旧全局课号。 */
    const originalCourseOrder = getCourseOrder(legacyCourseDirectory)
    /** 旧全局课号换算出的系列内本地课号。 */
    const localCourseOrder =
      originalCourseOrder === null ? null : getAiAppLocalCourseOrder(currentSeriesRule, originalCourseOrder)
    if (localCourseOrder !== null) {
      pathSegments[3] = replaceCourseDirectoryOrder(legacyCourseDirectory, localCourseOrder)
    }

    return pathSegments.join('/')
  }

  /** 旧扁平课程应插入的实体系列目录规则。 */
  const matchedRule = getAiAppSubtopicRuleByCourseDirectory(topic, seriesOrCourseDirectory)
  if (!matchedRule) {
    return articlePath
  }

  /** 旧扁平课程目录携带的全局课号。 */
  const originalCourseOrder = getCourseOrder(seriesOrCourseDirectory)
  /** 当前课程换算出的系列内本地课号。 */
  const localCourseOrder =
    originalCourseOrder === null ? null : getAiAppLocalCourseOrder(matchedRule, originalCourseOrder)
  if (localCourseOrder !== null) {
    pathSegments[2] = replaceCourseDirectoryOrder(seriesOrCourseDirectory, localCourseOrder)
  }

  pathSegments.splice(2, 0, matchedRule.directoryName)
  return pathSegments.join('/')
}

/**
 * 将旧 Agent 规范路径路由到重分类后的实体目录。
 * @param articlePath 通用目录迁移完成后的文章路径。
 */
function getCurrentAiAppArticlePath(articlePath: string): string {
  /** 当前文章路径按目录拆分后的片段。 */
  const pathSegments = articlePath.split('/')
  /** 旧 Agent 模块下的系列目录、课程目录或模块指南文件名。 */
  const agentChildDirectory = pathSegments[2] || ''

  if (pathSegments.slice(0, 2).join('/') === AI_APP_LEGACY_AGENT_CURRENT_PREFIX && agentChildDirectory) {
    /** Agent 工程中已存在的实体系列目录不能再次按系列编号重分类。 */
    const isCurrentAgentSeries = Boolean(
      getAiAppSubtopicRuleByDirectory(KNOWLEDGE_MODULE_LABELS.aiApps.agentEngineering, agentChildDirectory)
    )
    /** 只有旧编号课程和历史附录才需要从 Agent 模块路由到新模块。 */
    const isLegacyAgentChild =
      getCourseOrder(agentChildDirectory) !== null ||
      agentChildDirectory === AI_APP_LEGACY_APPENDIX_DIRECTORY ||
      agentChildDirectory === AI_APP_LEGACY_WRITING_GUIDE_NAME

    if (!isCurrentAgentSeries && isLegacyAgentChild) {
      pathSegments[1] = getAiAppCategoryDirectory(agentChildDirectory)
    }
  }

  return getCurrentAiAppSeriesArticlePath(pathSegments.join('/'))
}

/**
 * 返回新增实体系列目录之前使用的 AI 应用扁平路径。
 * @param articlePath 当前带实体系列目录的规范文章路径。
 */
function getLegacyFlatAiAppArticlePath(articlePath: string): string | null {
  /** 当前文章路径按目录拆分后的片段。 */
  const pathSegments = articlePath.split('/')
  if (pathSegments[0] !== AI_APP_TRACK_DIRECTORY_NAME || pathSegments.length < 3) {
    return null
  }

  /** 当前文章所属的 AI 应用实体模块目录。 */
  const categoryDirectory = pathSegments[1] || ''
  /** 当前文章所在的规范实体系列目录。 */
  const seriesDirectory = pathSegments[2] || ''

  if (categoryDirectory === AI_APP_SOLO_COMPANY_CATEGORY_DIRECTORY && seriesDirectory === AI_APP_PAPERCLIP_DIRECTORY) {
    pathSegments[2] = AI_APP_LEGACY_PAPERCLIP_DIRECTORY
    return pathSegments.join('/')
  }

  if (
    categoryDirectory === AI_APP_ENGINEERING_FOUNDATION_CATEGORY_DIRECTORY &&
    seriesDirectory === AI_APP_APPENDIX_DIRECTORY
  ) {
    pathSegments[2] = AI_APP_LEGACY_APPENDIX_DIRECTORY
    return pathSegments.join('/')
  }

  /** 当前实体模块对应的页面展示名称。 */
  const topic = getAiAppTopicByCategoryDirectory(categoryDirectory)
  /** 当前实体系列对应的归组规则。 */
  const matchedRule = getAiAppSubtopicRuleByDirectory(topic, seriesDirectory)
  if (!matchedRule) {
    return null
  }

  /** 当前系列内从 01 开始编号的课程目录。 */
  const localCourseDirectory = pathSegments[3] || ''
  /** 当前课程使用的系列内本地课号。 */
  const localCourseOrder = getCourseOrder(localCourseDirectory)
  /** 本地课号换算出的旧全局课号。 */
  const originalCourseOrder =
    localCourseOrder === null ? null : getAiAppOriginalCourseOrder(matchedRule, localCourseOrder)
  if (originalCourseOrder !== null) {
    pathSegments[3] = replaceCourseDirectoryOrder(localCourseDirectory, originalCourseOrder)
  }

  pathSegments.splice(2, 1)
  return pathSegments.join('/')
}

/**
 * 返回保留系列目录、但课程仍使用旧全局课号的历史路径。
 * @param articlePath 当前使用系列内本地课号的规范文章路径。
 */
function getLegacyGlobalAiAppSeriesArticlePath(articlePath: string): string | null {
  /** 当前文章路径按目录拆分后的片段。 */
  const pathSegments = articlePath.split('/')
  if (pathSegments[0] !== AI_APP_TRACK_DIRECTORY_NAME || pathSegments.length < 4) {
    return null
  }

  /** 当前文章所属的 AI 应用实体模块目录。 */
  const categoryDirectory = pathSegments[1] || ''
  /** 当前文章所在的实体系列目录。 */
  const seriesDirectory = pathSegments[2] || ''
  /** 当前实体模块对应的页面展示名称。 */
  const topic = getAiAppTopicByCategoryDirectory(categoryDirectory)
  /** 当前实体系列对应的归组规则。 */
  const matchedRule = getAiAppSubtopicRuleByDirectory(topic, seriesDirectory)
  if (!matchedRule) {
    return null
  }

  /** 当前系列内从 01 开始编号的课程目录。 */
  const localCourseDirectory = pathSegments[3] || ''
  /** 当前课程使用的系列内本地课号。 */
  const localCourseOrder = getCourseOrder(localCourseDirectory)
  /** 本地课号换算出的旧全局课号。 */
  const originalCourseOrder =
    localCourseOrder === null ? null : getAiAppOriginalCourseOrder(matchedRule, localCourseOrder)
  if (originalCourseOrder === null || originalCourseOrder === localCourseOrder) {
    return null
  }

  pathSegments[3] = replaceCourseDirectoryOrder(localCourseDirectory, originalCourseOrder)
  return pathSegments.join('/')
}

/**
 * 返回重分类 AI 应用文章原来使用的 Agent 公开路径。
 * @param articlePath 重分类后的规范文章路径。
 */
function getLegacyAiAppArticlePath(articlePath: string): string | null {
  /** 去除新增实体系列层级后才能按旧课程编号判断来源模块。 */
  const legacyFlatArticlePath = getLegacyFlatAiAppArticlePath(articlePath) || articlePath
  /** 可能包含旧 Agent 文章的当前模块目录。 */
  const categoryDirectories = [
    AI_APP_ENTERPRISE_CATEGORY_DIRECTORY,
    '05-LangChain实战',
    '06-LangGraph',
    '07-LangSmith-LangFuse',
    AI_APP_ENGINEERING_FOUNDATION_CATEGORY_DIRECTORY
  ]

  for (const categoryDirectory of categoryDirectories) {
    /** 当前模块在 AI 应用路线中的完整前缀。 */
    const categoryPrefix = `${AI_APP_TRACK_DIRECTORY_NAME}/${categoryDirectory}`
    /** 当前前缀之后可能来自旧 Agent 目录的相对路径。 */
    const categorySuffix = replaceKnowledgePathPrefix(legacyFlatArticlePath, categoryPrefix, '')
    if (!categorySuffix) {
      continue
    }

    /** 当前相对路径的课程目录名。 */
    const courseDirectoryName = categorySuffix.replace(/^\//, '').split('/')[0] || ''
    /** 当前课程原始编号。 */
    const courseOrder = getCourseOrder(courseDirectoryName)
    /** 有编号课程按原分类表核对，防止新建指南争用旧 `/02-Agent/course` 路径。 */
    const isMigratedNumberedCourse =
      courseOrder !== null && getAiAppCategoryDirectory(courseDirectoryName) === categoryDirectory
    /** 旧 Agent 目录中的附录和写作指南已整体迁入工程基础。 */
    const isMigratedEngineeringReference =
      categoryDirectory === AI_APP_ENGINEERING_FOUNDATION_CATEGORY_DIRECTORY &&
      (courseDirectoryName === AI_APP_LEGACY_APPENDIX_DIRECTORY ||
        courseDirectoryName === AI_APP_LEGACY_WRITING_GUIDE_NAME)

    if (!isMigratedNumberedCourse && !isMigratedEngineeringReference) {
      return null
    }

    return `${AI_APP_LEGACY_AGENT_PUBLIC_PREFIX}${categorySuffix}`
  }

  return null
}

/**
 * 返回重分类前位于完整 Agent 目录下的历史路径。
 * @param articlePath 重分类后的规范文章路径。
 */
function getLegacyAiAppCurrentArticlePath(articlePath: string): string | null {
  /** 先复用严格的迁移判断，只有真实迁出课程才存在旧 Agent 路径。 */
  const legacyPublicPath = getLegacyAiAppArticlePath(articlePath)
  if (!legacyPublicPath) {
    return null
  }

  /** 旧短公开前缀之后需要保留的课程相对路径。 */
  const legacyArticleSuffix = replaceKnowledgePathPrefix(legacyPublicPath, AI_APP_LEGACY_AGENT_PUBLIC_PREFIX, '')
  if (!legacyArticleSuffix) {
    return null
  }

  return `${AI_APP_LEGACY_AGENT_CURRENT_PREFIX}${legacyArticleSuffix}`
}

/**
 * 隐藏仅用于文件系统排序的数字前缀。
 * @param name 目录或文件的原始名称。
 */
function getDisplayName(name: string): string {
  return name.replace(ORDER_PREFIX_PATTERN, '')
}

/**
 * 提取课程目录开头用于分类的数字编号。
 * @param courseName 带可选数字前缀的课程目录或文件名。
 */
function getCourseOrder(courseName: string | undefined): number | null {
  /** 课程名称开头的数字前缀匹配结果。 */
  const courseOrderMatch = courseName?.match(COURSE_ORDER_PATTERN)

  return courseOrderMatch?.[1] ? Number.parseInt(courseOrderMatch[1], 10) : null
}

/**
 * 将 AI 应用目录中的单篇课程归并到真正的系列小标题。
 * @param topic 当前文章所属的一级模块。
 * @param courseDirectoryName 当前文章第三层的原始课程目录名称。
 * @param fallbackSubtopic 未命中系列配置时使用的原始细分类名称。
 */
function getAiAppSubtopic(topic: string, courseDirectoryName: string | undefined, fallbackSubtopic: string): string {
  /** 当前课程目录保留的原始排序编号。 */
  const courseOrder = getCourseOrder(courseDirectoryName)
  if (courseOrder === null) {
    return fallbackSubtopic
  }

  /** 同时匹配一级模块和课程编号的系列规则。 */
  const matchedRule = AI_APP_SUBTOPIC_RULES.find(
    (subtopicRule) => subtopicRule.topic === topic && subtopicRule.courseOrders.has(courseOrder)
  )

  return matchedRule?.label || fallbackSubtopic
}

/**
 * 根据文章目录结构生成知识库侧栏使用的一级模块名称。
 * @param trackSectionName 当前文章去除排序前缀后的路线目录名称。
 * @param contentSectionName 当前文章在路线中的模块目录名称。
 */
function getArticleTopic(trackSectionName: string, contentSectionName: string): string {
  if (KNOWLEDGE_TRACK_BY_SECTION[trackSectionName]) {
    // 扁平化后第二层目录就是三条路线共用的规范知识域，页面和思维导图必须读取同一名称。
    /** 将目录连接符转换为页面标题空格后的模块名称。 */
    const normalizedContentSectionName = contentSectionName.replaceAll('-', ' ')
    return getKnowledgeDirectoryModuleLabel(normalizedContentSectionName)
  }

  return contentSectionName
}

/**
 * 把文章文件转换为页面所需的元数据。
 * @param filePath 文章绝对路径。
 */
function createArticleMetadata(filePath: string): KnowledgeArticle {
  /** 文章相对知识库根目录的系统路径。 */
  const systemRelativePath = relative(KNOWLEDGE_CONTENT_ROOT, filePath)
  /** 跨平台统一为正斜杠的文章路径。 */
  const markdownPath = systemRelativePath.split(sep).join('/')
  /** 不包含 Markdown 扩展名的文章路径。 */
  const sourceArticlePath = markdownPath.slice(0, -extname(markdownPath).length)
  /** 隐藏目录入口文件名后的公开文章路径。 */
  const articlePath = getPublicArticlePath(sourceArticlePath)
  /** 文章路径的分段结果。 */
  const slug = articlePath.split('/')
  /** 文章原始内容，用来提取显示标题。 */
  const markdown = fs.readFileSync(filePath, 'utf8')
  /** 没有一级标题时使用的文件名。 */
  const fallbackTitle = slug.at(-1) || '未命名文章'
  /** 当前文章在学习路径中的用途。 */
  const kind = getKnowledgeArticleKind(sourceArticlePath)
  /** Markdown 中声明或由文件名回退得到的原始标题。 */
  const rawTitle = extractTitle(markdown, fallbackTitle)
  /** 清理源文件旧课号后等待模块内重新编号的标题。 */
  const title = getBaseArticleTitle(rawTitle, sourceArticlePath)
  /** 当前文章所属的顶层路线目录名称。 */
  const trackSectionName = getDisplayName(slug[0] || '其他')
  /** 当前文章在路线中的实体模块目录名称。 */
  const contentSectionName = getDisplayName(slug[1] || trackSectionName)
  /** 与实体目录一一对应的模块名称。 */
  const topic = getArticleTopic(trackSectionName, contentSectionName)
  /** LangChain 独立文章树从路径读取的代码语言。 */
  const articleLanguage = getKnowledgeLanguageFromPath(articlePath)
  /** 全栈路线使用“路线/模块/专题/文章”四级结构，存量模块仍允许扁平文章。 */
  const isNestedFullStackArticle = trackSectionName === FULL_STACK_SECTION_NAME && slug.length >= 4
  /** 嵌套全栈文章按真实专题分组，避免不同技术系列混成一个目录。 */
  const subtopic = articleLanguage
    ? articleLanguage === 'typescript'
      ? 'TypeScript'
      : 'Python'
    : isNestedFullStackArticle
      ? getDisplayName(slug[2] || topic)
      : topic
  /** 手写 H1 中显式声明的系列名，例如目录“脚手架”对应文章系列“工程化脚手架”。 */
  const declaredSeriesTitle = rawTitle.match(/^([^（）()\n]{1,80})[（(]\s*\d+\s*[）)]\s*[-—–:：]\s*/)?.[1]?.trim()
  /** 全栈手写文章即使目录扁平化，也优先保留 H1 显式声明的系列名。 */
  const seriesTitle = trackSectionName === FULL_STACK_SECTION_NAME ? declaredSeriesTitle || subtopic : topic
  /** 当前文章所属的公开学习主线；总览等公共文章不限定主线。 */
  const track = KNOWLEDGE_TRACK_BY_SECTION[trackSectionName] || null

  return {
    slug,
    path: articlePath,
    displayPath: articlePath,
    sourcePath: sourceArticlePath,
    href: `/knowledge/${encodePath(articlePath)}`,
    title,
    seriesTitle,
    sequence: 0,
    topic,
    subtopic,
    track,
    kind,
    breadcrumbs: slug.slice(0, -1)
  }
}

/**
 * 将 Markdown 的首个一级标题替换为元数据中的统一有序标题。
 * @param orderedTitle 列表和阅读页共用的规范标题。
 */
function rewriteArticleHeading(orderedTitle: string) {
  return (tree: MarkdownNode) => {
    /** Markdown 中首个一级标题节点。 */
    const headingNode = tree.children?.find((node) => node.type === 'heading' && node.depth === 1)

    if (!headingNode) {
      // 配套提示词和角色配置常省略 H1；阅读页仍需展示与侧栏一致的可定位标题。
      tree.children = [
        { type: 'heading', depth: 1, children: [{ type: 'text', value: orderedTitle }] },
        ...(tree.children || [])
      ]
      return
    }

    headingNode.children = [{ type: 'text', value: orderedTitle }]
  }
}

/**
 * 返回文章实体路径中的系列内课程号。
 * @param article 当前需要生成标题的文章元数据。
 */
function getPhysicalCourseSequence(article: KnowledgeArticle): number | null {
  if (!article.track) {
    return null
  }

  /** 文章规范路径按目录拆分后的片段。 */
  const pathSegments = article.path.split('/')
  /** 嵌套全栈知识域比扁平模块多一层专题目录，文章课号位于第四段。 */
  const isNestedFullStackArticle =
    getDisplayName(pathSegments[0] || '') === FULL_STACK_SECTION_NAME && pathSegments.length >= 4
  /** LangChain 双语言文章比原模块多一层语言目录。 */
  const isLanguageSpecificLangChainArticle = getKnowledgeLanguageFromPath(article.path) !== null
  /** 当前文章真正携带顺序前缀的文件路径片段。 */
  const coursePathSegment = pathSegments[isNestedFullStackArticle || isLanguageSpecificLangChainArticle ? 3 : 2] || ''
  return getCourseOrder(coursePathSegment)
}

/** 返回全部知识文章元数据，并按原目录与编号顺序排列。 */
export function getKnowledgeArticles(): KnowledgeArticle[] {
  if (process.env.NODE_ENV === 'production' && productionKnowledgeArticles) {
    return productionKnowledgeArticles
  }

  /** 按实体模块和文件数字前缀完成基础排序的文章。 */
  const sortedArticles = findMarkdownFiles(KNOWLEDGE_CONTENT_ROOT)
    .map(createArticleMetadata)
    .sort((leftArticle, rightArticle) => {
      /** 左侧文章用于聚合同一课程的路径。 */
      const leftSegments = leftArticle.path.split('/')
      /** 右侧文章用于聚合同一课程的路径。 */
      const rightSegments = rightArticle.path.split('/')
      /** 左侧文章所属的路线目录名称。 */
      const leftTrackSectionName = getDisplayName(leftSegments[0] || '')
      /** 左侧路线需要保留到课程层的目录深度。 */
      const leftGroupDepth = COURSE_GROUP_DEPTH_BY_TRACK_SECTION[leftTrackSectionName] || 1
      /** 左侧文章的课程分组路径。 */
      const leftGroupPath = leftSegments.slice(0, leftGroupDepth).join('/')
      /** 右侧文章所属的路线目录名称。 */
      const rightTrackSectionName = getDisplayName(rightSegments[0] || '')
      /** 右侧路线需要保留到课程层的目录深度。 */
      const rightGroupDepth = COURSE_GROUP_DEPTH_BY_TRACK_SECTION[rightTrackSectionName] || 1
      /** 右侧文章的课程分组路径。 */
      const rightGroupPath = rightSegments.slice(0, rightGroupDepth).join('/')
      /** 两篇文章所属课程的排序结果。 */
      const groupComparison = leftGroupPath.localeCompare(rightGroupPath, 'zh-CN', { numeric: true })

      if (groupComparison !== 0) {
        return groupComparison
      }

      // 扁平化后的文件数字前缀是标题、URL 和 UI 共用的唯一顺序，文章类型只影响标签，不能再次重排。
      return leftArticle.path.localeCompare(rightArticle.path, 'zh-CN', { numeric: true })
    })

  /** 各学习主线与实体模块已经分配到的 UI 文章数量。 */
  const sequenceByModule = new Map<string, number>()
  /** 各学习主线、实体模块与细分类已经分配到的标题回退顺序。 */
  const sequenceBySubtopic = new Map<string, number>()
  /** 补齐模块 UI 课号、细分类标题课号和最终标题后的文章目录。 */
  const sequencedArticles = sortedArticles.map((article) => {
    /** 当前文章所属主线和实体模块组成的 UI 分组键。 */
    const moduleKey = `${article.track || 'shared'}:${article.topic}`
    /** 当前文章所属主线、实体模块和细分类组成的唯一分组键。 */
    const subtopicKey = `${article.track || 'shared'}:${article.topic}:${article.subtopic}`
    /** 当前文章在所属模块中从 01 开始、由列表 UI 单独显示的顺序。 */
    const moduleSequence = (sequenceByModule.get(moduleKey) || 0) + 1
    /** 当前文章在所属细分类中从 01 开始、写入标题的顺序。 */
    const subtopicSequence = (sequenceBySubtopic.get(subtopicKey) || 0) + 1
    /** 实体目录中与路径保持一致的系列内课程号。 */
    const physicalCourseSequence = getPhysicalCourseSequence(article)
    /** 页面列表、标题和 URL 共用的最终课号；非实体公共文章才回退到分组顺序。 */
    const resolvedSequence = physicalCourseSequence ?? subtopicSequence
    sequenceByModule.set(moduleKey, moduleSequence)
    sequenceBySubtopic.set(subtopicKey, subtopicSequence)

    return {
      ...article,
      sequence: resolvedSequence,
      title: getSequencedArticleTitle(article.title, article.kind, resolvedSequence, article.seriesTitle)
    }
  })

  if (process.env.NODE_ENV === 'production') {
    productionKnowledgeArticles = sequencedArticles
  }

  return sequencedArticles
}

/**
 * 安全解码一个 URL 路径片段，无法解码时返回空值。
 * @param segment URL 中的单个路径片段。
 */
function decodePathSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

/**
 * 验证并解析用户请求的文章路径，防止通过路径片段越出知识库目录。
 * @param slug URL 中的文章路径片段。
 */
function resolveArticleFile(slug: string[]): string | null {
  /** 解码并去掉无效值后的文章路径片段。 */
  const normalizedSlug = slug.map(decodePathSegment).filter((segment): segment is string => Boolean(segment))

  if (
    normalizedSlug.length !== slug.length ||
    normalizedSlug.length === 0 ||
    normalizedSlug.some((segment) => segment === '.' || segment === '..')
  ) {
    return null
  }

  /** URL 中经过安全校验的新版或旧版文章路径。 */
  const requestedArticlePath = normalizedSlug.join('/')
  /** 旧版路径迁移后对应的实际规范文章路径。 */
  const currentArticlePath = getMergedDemoArticlePath(getCurrentKnowledgeArticlePath(requestedArticlePath))
  /** 未携带扩展名的文章绝对路径。 */
  const articleBasePath = resolve(KNOWLEDGE_CONTENT_ROOT, ...currentArticlePath.split('/'))
  /** 知识库根目录的规范化前缀。 */
  const knowledgeRootPrefix = `${resolve(KNOWLEDGE_CONTENT_ROOT)}${sep}`

  if (!articleBasePath.startsWith(knowledgeRootPrefix)) {
    return null
  }

  for (const extension of MARKDOWN_EXTENSIONS) {
    /** 当前尝试读取的文章文件路径。 */
    const candidatePath = `${articleBasePath}${extension}`

    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return candidatePath
    }
  }

  for (const entryName of DIRECTORY_ENTRY_NAMES) {
    for (const extension of MARKDOWN_EXTENSIONS) {
      /** 当前目录入口文件的候选绝对路径。 */
      const candidatePath = join(articleBasePath, `${entryName}${extension}`)

      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
        return candidatePath
      }
    }
  }

  return null
}

/**
 * 拆分链接主体以及查询参数或锚点后缀。
 * @param url Markdown 节点中的原始链接。
 */
function splitUrlSuffix(url: string): { pathname: string; suffix: string } {
  /** 查询参数或锚点开始的位置。 */
  const suffixIndex = url.search(/[?#]/)

  if (suffixIndex === -1) {
    return { pathname: url, suffix: '' }
  }

  return {
    pathname: url.slice(0, suffixIndex),
    suffix: url.slice(suffixIndex)
  }
}

/**
 * 将文章中的相对图片和 Markdown 内链改写为博客可访问地址。
 * @param articlePath 当前文章相对知识库根目录的路径。
 */
function rewriteKnowledgeLinks(articlePath: string) {
  /** 当前文章所在的相对目录。 */
  const articleDirectory = posix.dirname(articlePath)

  /**
   * 遍历并改写 Markdown AST。
   * @param tree 当前文章的 Markdown AST 根节点。
   */
  return (tree: MarkdownNode): void => {
    /**
     * 递归处理一个 Markdown AST 节点。
     * @param node 当前需要处理的节点。
     */
    const visitNode = (node: MarkdownNode): void => {
      if ((node.type === 'image' || node.type === 'link') && node.url && !EXTERNAL_URL_PATTERN.test(node.url)) {
        /** 链接路径与查询参数或锚点的拆分结果。 */
        const { pathname, suffix } = splitUrlSuffix(node.url)
        /** 相对当前文章解析后的知识库路径。 */
        const resolvedPath = posix.normalize(posix.join(articleDirectory, pathname))

        if (!resolvedPath.startsWith('../')) {
          if (node.type === 'image') {
            node.url = `/knowledge-assets/${encodePath(resolvedPath)}${suffix}`
          } else if (MARKDOWN_EXTENSIONS.has(posix.extname(resolvedPath).toLowerCase())) {
            /** 去掉 Markdown 扩展名后的目标文章路径。 */
            const targetArticlePath = getMergedDemoArticlePath(
              resolvedPath.slice(0, -posix.extname(resolvedPath).length)
            )
            /** 隐藏目录入口文件名后的目标公开路径。 */
            const publicTargetArticlePath = getPublicArticlePath(targetArticlePath)
            node.url = `/knowledge/${encodePath(publicTargetArticlePath)}${suffix}`
          } else {
            node.url = `/knowledge-assets/${encodePath(resolvedPath)}${suffix}`
          }
        }
      }

      node.children?.forEach(visitNode)
    }

    visitNode(tree)
  }
}

/**
 * 把 Markdown 标题节点转为纯文本实验名。
 * @param headingNode 当前 Python 代码块之前最近的标题节点。
 * @returns 去掉序号后的简洁标题。
 */
function getInlineSandboxHeadingText(headingNode: MarkdownNode): string {
  /** 标题中所有直接文本节点的拼接结果。 */
  const headingText = (headingNode.children || [])
    .map((childNode) => childNode.value || '')
    .join('')
    .trim()
  return headingText.replace(/^(?:[一-十]+|\d+)[、.\s．-]*/, '').trim()
}

/**
 * 从正文 Markdown 中找到可在 Pyodide 内独立结束运行的完整 Python 示例。
 * @param markdown 当前文章原始 Markdown。
 * @returns 按文章顺序排列的高信心实验候选。
 */
function findInlinePythonSandboxCandidates(
  sourceArticlePath: string,
  markdown: string
): InlinePythonSandboxCandidate[] {
  /** Remark 解析后的文章根节点。 */
  const markdownTree = remark().parse(markdown) as MarkdownNode
  /** 遍历时最近的结构标题，用于命名代码单元。 */
  let currentHeading = '正文 Python 示例'
  /** 符合安全与完整性标准的正文程序。 */
  const candidates: InlinePythonSandboxCandidate[] = []
  /** 正在收集的“可运行源码”多文件章节。 */
  let sourceSection: InlinePythonSourceSection | null = null

  /**
   * 校验并保存当前多文件源码章节。
   * 章节缺少 main.py 或入口不满足浏览器运行规则时不生成沙盒。
   */
  const flushSourceSection = (): void => {
    if (!sourceSection) {
      return
    }

    /** 当前源码章节中真正执行的 Python 入口。 */
    const entryFile = sourceSection.files.find((file) => file.name === INLINE_PYTHON_SANDBOX_ENTRY_FILE)
    /** 同一沙盒内可被入口直接导入的 Python 模块名。 */
    const localModuleNames = new Set(
      sourceSection.files.filter((file) => file.name.endsWith('.py')).map((file) => file.name.slice(0, -'.py'.length))
    )
    if (
      entryFile &&
      isInlinePythonSandboxCandidate(sourceArticlePath, sourceSection.title, entryFile.content.trim(), localModuleNames)
    ) {
      /** 去掉功能前缀后的实验标题，避免面板重复显示“可运行源码”。 */
      const sandboxTitle = sourceSection.title.replace(/^可运行源码\s*[：:]?\s*/, '').trim()
      candidates.push({
        title: sandboxTitle || '正文 Python 示例',
        entryFile: INLINE_PYTHON_SANDBOX_ENTRY_FILE,
        files: sourceSection.files
      })
    }

    sourceSection = null
  }

  for (const node of markdownTree.children || []) {
    if (node.type === 'heading') {
      /** 当前标题的纯文本内容。 */
      const headingText = getInlineSandboxHeadingText(node) || currentHeading
      /** 当前标题层级；缺失时按正文二级标题处理。 */
      const headingDepth = node.depth || 2

      if (sourceSection && headingDepth <= sourceSection.headingDepth) {
        flushSourceSection()
      }

      currentHeading = headingText
      if (/可运行源码/.test(headingText)) {
        sourceSection = {
          title: headingText,
          headingDepth,
          currentFileName: null,
          files: []
        }
        continue
      }

      if (sourceSection && headingDepth > sourceSection.headingDepth) {
        /** 文件子标题必须是单个 Markdown 行内代码节点。 */
        const inlineFileNameNode =
          node.children?.length === 1 && node.children[0]?.type === 'inlineCode' ? node.children[0] : null
        /** 拒绝目录穿越和不受支持的二进制文件。 */
        const sourceFileName = inlineFileNameNode?.value?.trim() || ''
        sourceSection.currentFileName =
          sourceFileName &&
          posix.basename(sourceFileName) === sourceFileName &&
          BROWSER_PYTHON_SUPPORT_FILE_PATTERN.test(sourceFileName)
            ? sourceFileName
            : null
      }
      continue
    }

    /** 当前围栏中与执行能力有关的显式元数据。 */
    const runnableMetadata = node.type === 'code' ? parseRunnableCodeBlockMetadata(node.lang, node.meta) : null
    /** 只对明确声明为 Python 的围栏代码做自动执行。 */
    const isPythonCodeBlock = node.type === 'code' && /^(?:python|py)$/i.test(node.lang || '')

    if (sourceSection && node.type === 'code' && node.value) {
      /** 未声明文件子标题的单文件章节默认把 Python 代码作为 main.py。 */
      const sourceFileName =
        sourceSection.currentFileName || (isPythonCodeBlock ? INLINE_PYTHON_SANDBOX_ENTRY_FILE : '')
      if (sourceFileName && !sourceSection.files.some((file) => file.name === sourceFileName)) {
        sourceSection.files.push({
          name: sourceFileName,
          content: node.value.trim()
        })
      }
      continue
    }

    if (!isPythonCodeBlock || !node.value) {
      continue
    }

    /** 当前候选程序的完整源码。 */
    const sourceCode = node.value.trim()
    /** 显式 runnable 围栏仍必须通过浏览器依赖与完整性检查。 */
    const sandboxHeading = runnableMetadata?.title || currentHeading
    if (
      !isInlinePythonSandboxCandidate(
        sourceArticlePath,
        runnableMetadata?.runnable ? `可运行 ${sandboxHeading}` : sandboxHeading,
        sourceCode
      )
    ) {
      continue
    }

    candidates.push({
      title: sandboxHeading, // 优先使用围栏标题，否则沿用正文知识点名称。
      entryFile: runnableMetadata?.fileName || INLINE_PYTHON_SANDBOX_ENTRY_FILE, // 显式围栏可以声明直接文件名。
      files: [
        {
          name: runnableMetadata?.fileName || INLINE_PYTHON_SANDBOX_ENTRY_FILE,
          content: sourceCode
        }
      ] // 运行与正文展示共用同一份内容。
    })
  }

  flushSourceSection()

  return candidates
}

/**
 * 从 Markdown 中提取显式标记为 runnable 的完整 HTML 页面。
 * @param sourceArticlePath 当前文章无扩展名路径。
 * @param markdown 当前文章 Markdown 原文。
 * @param sandboxOffset 当前文章已有实验数量。
 * @returns 直接以文章围栏源码运行的 HTML 实验。
 */
function createInlineHtmlSandboxes(
  sourceArticlePath: string,
  markdown: string,
  sandboxOffset: number
): KnowledgeSandbox[] {
  /** 当前文章解析后的 Markdown 根节点。 */
  const markdownTree = remark().parse(markdown) as MarkdownNode
  /** 遍历时最近的正文标题。 */
  let currentHeading = '正文 HTML 示例'
  /** 已通过完整性检查的 HTML 沙盒。 */
  const sandboxes: KnowledgeSandbox[] = []

  for (const node of markdownTree.children || []) {
    if (node.type === 'heading') {
      currentHeading = getInlineSandboxHeadingText(node) || currentHeading
      continue
    }

    /** 当前 HTML 围栏声明的执行属性。 */
    const metadata = node.type === 'code' ? parseRunnableCodeBlockMetadata(node.lang, node.meta) : null
    /** HTML 沙盒必须显式启用，且源码是完整文档而不是局部标签。 */
    const sourceCode = node.value?.trim() || ''
    if (
      !metadata?.runnable ||
      metadata.language !== 'html' ||
      !/^<!doctype\s+html>/i.test(sourceCode) ||
      !/<script(?:\s|>)/i.test(sourceCode)
    ) {
      continue
    }

    /** 当前 HTML 实验的直接入口文件。 */
    const entryFile = metadata.fileName || 'index.html'
    sandboxes.push({
      id: `${sourceArticlePath}:inline-html-${sandboxOffset + sandboxes.length + 1}`,
      runtime: 'html',
      title: metadata.title || currentHeading,
      description: metadata.description || '运行文章中的完整 HTML 页面，直接观察交互和状态变化。',
      entryFile,
      files: [{ name: entryFile, content: sourceCode }]
    })
  }

  return sandboxes
}

/**
 * 从 Markdown 中提取显式标记为 runnable 的完整 TypeScript 程序。
 * @param sourceArticlePath 当前文章无扩展名路径。
 * @param markdown 当前语言投影后的 Markdown 原文。
 * @param sandboxOffset 当前文章已有实验数量。
 * @returns 在隔离浏览器 Worker 中编译并执行的 TypeScript 实验。
 */
function createInlineTypeScriptSandboxes(
  sourceArticlePath: string,
  markdown: string,
  sandboxOffset: number
): KnowledgeSandbox[] {
  /** 当前文章解析后的 Markdown 根节点。 */
  const markdownTree = remark().parse(markdown) as MarkdownNode
  /** 遍历时最近的正文标题。 */
  let currentHeading = '正文 TypeScript 示例'
  /** 已显式启用的 TypeScript 沙盒。 */
  const sandboxes: KnowledgeSandbox[] = []

  for (const node of markdownTree.children || []) {
    if (node.type === 'heading') {
      currentHeading = getInlineSandboxHeadingText(node) || currentHeading
      continue
    }

    /** 当前 TypeScript 围栏声明的可信运行属性。 */
    const metadata = node.type === 'code' ? parseRunnableCodeBlockMetadata(node.lang, node.meta) : null
    /** 当前需要在 Worker 中执行的完整源码。 */
    const sourceCode = node.value?.trim() || ''
    if (!metadata?.runnable || metadata.runtime !== 'typescript' || !sourceCode) {
      continue
    }

    /** TypeScript 沙盒的直接入口文件。 */
    const entryFile = metadata.fileName || 'main.ts'
    sandboxes.push({
      id: `${sourceArticlePath}:inline-typescript-${sandboxOffset + sandboxes.length + 1}`,
      runtime: 'typescript',
      title: metadata.title || currentHeading,
      description: metadata.description || '编译并运行文章中的 TypeScript 程序，观察标准输出。',
      entryFile,
      files: [{ name: entryFile, content: sourceCode }]
    })
  }

  return sandboxes
}

/**
 * 从 Markdown 中提取需要用户临时凭据的真实模型实验。
 * @param sourceArticlePath 当前文章无扩展名路径。
 * @param markdown 当前文章 Markdown 原文。
 * @param sandboxOffset 当前文章已有实验数量。
 * @returns 只包含显式 model-sandbox 围栏的实验。
 */
function createInlineModelSandboxes(
  sourceArticlePath: string,
  markdown: string,
  sandboxOffset: number
): KnowledgeSandbox[] {
  /** Remark 解析后的文章根节点。 */
  const markdownTree = remark().parse(markdown) as MarkdownNode
  /** 遍历时最近的正文标题。 */
  let currentHeading = '真实模型调用'
  /** 已通过显式声明检查的模型实验。 */
  const sandboxes: KnowledgeSandbox[] = []

  for (const node of markdownTree.children || []) {
    if (node.type === 'heading') {
      currentHeading = getInlineSandboxHeadingText(node) || currentHeading
      continue
    }

    /** 当前代码围栏声明的运行方式与表单默认值。 */
    const metadata = node.type === 'code' ? parseRunnableCodeBlockMetadata(node.lang, node.meta) : null
    /** 模型实验必须位于 AI 应用路线、显式 runnable，并提供完整 Python 源码。 */
    const sourceCode = node.value?.trim() || ''
    if (
      !sourceArticlePath.startsWith('03-AI大模型应用开发/') ||
      !metadata?.runnable ||
      metadata.runtime !== 'model' ||
      !['python', 'typescript'].includes(metadata.language) ||
      !sourceCode ||
      !/(?:ChatOpenAI|init_chat_model|Settings\.withLLM|BaseLLM)/.test(sourceCode) ||
      !/(?:\.invoke|\.chat)\s*\(/.test(sourceCode)
    ) {
      continue
    }

    /** 真实模型实验展示和本地复制共用的 Python 文件名。 */
    const entryFile = metadata.fileName || (metadata.language === 'typescript' ? 'main.ts' : 'main.py')
    sandboxes.push({
      id: `${sourceArticlePath}:inline-model-${sandboxOffset + sandboxes.length + 1}`,
      runtime: 'model',
      title: metadata.title || currentHeading,
      description: metadata.description || '使用临时连接信息调用 OpenAI 兼容模型，返回真实响应与用量。',
      entryFile,
      files: [{ name: entryFile, content: sourceCode }],
      modelRequest: {
        framework: metadata.modelFramework, // 围栏明确决定服务端执行 LangChain 还是 LlamaIndex。
        mode: metadata.modelMode, // 围栏明确决定执行普通聊天或 Tool 注册实验。
        prompt:
          metadata.prompt ||
          (metadata.modelFramework === 'llamaindex'
            ? '请用一句话解释 LlamaIndex 的核心价值。'
            : '请用一句话解释 LangChain 的核心价值。')
      }
    })
  }

  return sandboxes
}

/**
 * 将正文完整 Python 程序转换为集成式在线代码单元。
 * @param sourceArticlePath 当前文章无扩展名路径。
 * @param markdown 当前文章 Markdown。
 * @param sandboxOffset 文章已有实验数，用于生成唯一标识。
 * @param excludedSourceCodes 已由 Lab 或显式白名单运行的入口源码。
 * @returns 可交给前端替换对应代码块的实验数组。
 */
function createInlinePythonSandboxes(
  sourceArticlePath: string,
  markdown: string,
  sandboxOffset: number,
  excludedSourceCodes: readonly string[]
): KnowledgeSandbox[] {
  /** 标准化后的已接入源码，防止自动附加的 main.py 再生成第二个沙盒。 */
  const excludedSourceCodeSet = new Set(excludedSourceCodes.map((sourceCode) => sourceCode.trim()))
  /** 去掉与现有实验重复的正文候选。 */
  const uniqueCandidates = findInlinePythonSandboxCandidates(sourceArticlePath, markdown).filter((candidate) => {
    /** 当前正文沙盒的入口源码。 */
    const entrySource = candidate.files.find((file) => file.name === candidate.entryFile)?.content || ''
    return !excludedSourceCodeSet.has(entrySource.trim())
  })

  return uniqueCandidates.map((candidate, candidateIndex) => ({
    id: `${sourceArticlePath}:inline-${sandboxOffset + candidateIndex + 1}`, // 与 Lab 实验共用顺序空间避免重复。
    runtime: 'python', // 已通过 Pyodide 兼容性筛选。
    title: `${candidate.title}·在线运行`, // 明确该单元属于当前知识点。
    description: '运行正文中的完整 Python 示例，对照源码观察真实输出。', // 不暗示使用外部服务。
    entryFile: candidate.entryFile, // 执行文章源码章节明确声明的入口。
    files: candidate.files // 入口和夹具全部来自正文公开代码块。
  }))
}

/**
 * 读取并渲染一篇知识文章。
 * @param slug URL 中的文章路径片段。
 * @param language 当前文章需要投影的代码语言。
 */
export async function getKnowledgeArticle(
  slug: string[],
  language: KnowledgeLanguage = DEFAULT_KNOWLEDGE_LANGUAGE
): Promise<KnowledgeArticlePageData | null> {
  /** 已验证且实际存在的文章文件路径。 */
  const filePath = resolveArticleFile(slug)

  if (!filePath) {
    return null
  }

  /**
   * 文章原始 Markdown 内容。
   * 文章路径已由静态参数完整枚举；忽略动态路径追踪，避免 Netlify 函数误打包整个工作区。
   */
  const markdown = projectKnowledgeMarkdown(
    await readFile(/* turbopackIgnore: true */ filePath, 'utf8'),
    language
  )
  /** 当前文件在知识库中的无扩展名源路径。 */
  const sourceArticlePath = relative(KNOWLEDGE_CONTENT_ROOT, filePath)
    .split(sep)
    .join('/')
    .replace(/\.(?:md|mdx)$/i, '')
  /** 全部文章的连续编号元数据，用于定位当前文章和相邻文章。 */
  const knowledgeArticles = getKnowledgeArticles()
  /** 文章列表和页面共用的连续编号元数据。 */
  const metadata = knowledgeArticles.find((article) => article.sourcePath === sourceArticlePath)

  if (!metadata) {
    return null
  }
  /** 当前实体模块中按阅读顺序排列的全部文章。 */
  const moduleArticles = knowledgeArticles.filter(
    (article) =>
      article.track === metadata.track &&
      article.topic === metadata.topic &&
      getKnowledgeLanguageFromPath(article.path) === getKnowledgeLanguageFromPath(metadata.path)
  )
  /** 当前文章在实体模块阅读序列中的位置。 */
  const currentArticleIndex = moduleArticles.findIndex((article) => article.path === metadata.path)
  /** 当前文章之前的相邻文章；模块第一篇没有上一篇。 */
  const previousArticle = currentArticleIndex > 0 ? moduleArticles[currentArticleIndex - 1] || null : null
  /** 当前文章之后的相邻文章；模块最后一篇没有下一篇。 */
  const nextArticle = currentArticleIndex >= 0 ? moduleArticles[currentArticleIndex + 1] || null : null
  /** 去掉页面课号、用于生成题目兜底文案的文章名称。 */
  const quizTitle = metadata.title.replace(SEQUENCED_TITLE_PREFIX_PATTERN, '')
  /** 将 Obsidian 图片语法转换为标准 Markdown 后的文章内容。 */
  const normalizedMarkdown = markdown.replace(OBSIDIAN_IMAGE_PATTERN, (source, target: string) => {
    /** 去掉可选显示别名后的图片文件名。 */
    const assetName = target.split('|')[0]?.trim()
    /** 按文件名匹配到的同步媒体路径。 */
    const assetPath = assetName
      ? KNOWLEDGE_ASSET_PATHS.find((candidatePath) => posix.basename(candidatePath) === assetName)
      : undefined

    return assetPath ? `![${assetName}](/knowledge-assets/${encodePath(assetPath)})` : source
  })
  /** 页面正文与需要紧随思维导图展示的资料章节。 */
  const { bodyMarkdown, referenceMarkdown } = splitKnowledgeReferenceSections(normalizedMarkdown)
  /** 资料章节经过 GFM 和相对链接处理后的 HTML。 */
  const processedReferenceContent = referenceMarkdown
    ? await remark()
        .use(remarkGfm)
        .use(() => rewriteKnowledgeLinks(metadata.sourcePath))
        .use(html)
        .process(referenceMarkdown)
    : null
  /** 经过 GFM 和相对链接处理后的 HTML 内容。 */
  const processedContent = await remark()
    .use(remarkGfm)
    .use(() => rewriteArticleHeading(metadata.title))
    .use(() => rewriteKnowledgeLinks(metadata.sourcePath))
    .use(html)
    .process(bodyMarkdown)
  /** 正文中经完整性与浏览器安全筛选的 Python 实验。 */
  const inlinePythonSandboxes = createInlinePythonSandboxes(metadata.sourcePath, normalizedMarkdown, 0, [])
  /** 正文中显式声明 runnable 的完整 TypeScript 实验。 */
  const inlineTypeScriptSandboxes = createInlineTypeScriptSandboxes(
    metadata.sourcePath,
    normalizedMarkdown,
    inlinePythonSandboxes.length
  )
  /** 正文中显式声明、需要临时用户凭据的模型实验。 */
  const inlineModelSandboxes = createInlineModelSandboxes(
    metadata.sourcePath,
    normalizedMarkdown,
    inlinePythonSandboxes.length + inlineTypeScriptSandboxes.length
  )
  /** 正文中显式声明 runnable 的完整 HTML 实验。 */
  const inlineHtmlSandboxes = createInlineHtmlSandboxes(
    metadata.sourcePath,
    normalizedMarkdown,
    inlinePythonSandboxes.length + inlineTypeScriptSandboxes.length + inlineModelSandboxes.length
  )

  return {
    ...metadata,
    referenceContent: processedReferenceContent?.toString() || '',
    content: processedContent.toString(),
    mindmap: createKnowledgeMindmap(markdown, quizTitle, metadata.track === 'ai-apps', metadata.kind),
    sandboxes: [
      ...inlinePythonSandboxes,
      ...inlineTypeScriptSandboxes,
      ...inlineModelSandboxes,
      ...inlineHtmlSandboxes
    ],
    quiz: createKnowledgeQuiz(metadata.path, markdown, quizTitle, metadata.kind),
    previousArticle,
    nextArticle
  }
}
