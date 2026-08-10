import 'server-only'

import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, posix, relative, resolve, sep } from 'node:path'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import html from 'remark-html'
import { KNOWLEDGE_MODULE_LABELS, type KnowledgeTrackSlug } from '@/app/knowledge/config'
import { createKnowledgeQuiz, type KnowledgeQuizQuestion } from '@/lib/knowledge-quiz'

/** 知识文章在列表页和阅读页共用的元数据。 */
export interface KnowledgeArticle {
  slug: string[]
  path: string
  displayPath: string
  sourcePath: string
  href: string
  title: string
  /** 文章在所属模块中从 01 开始的连续顺序。 */
  sequence: number
  topic: string
  /** 文章在一级模块中的课程或技术细分类。 */
  subtopic: string
  track: KnowledgeTrackSlug | null
  kind: KnowledgeArticleKind
  breadcrumbs: string[]
}

/** 知识文章在学习路径中的用途。 */
export type KnowledgeArticleKind = 'guide' | 'lesson' | 'practice' | 'reference'

/** 阅读页相邻文章导航所需的最小元数据。 */
export type KnowledgeArticleLink = Pick<KnowledgeArticle, 'href' | 'sequence' | 'title' | 'topic'>

/** 单篇知识文章阅读页需要的完整数据。 */
export interface KnowledgeArticlePageData extends KnowledgeArticle {
  /** Markdown 转换后的文章 HTML。 */
  content: string
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
  url?: string
  children?: MarkdownNode[]
}

/** 新知识目录前缀与已发布旧路径之间的映射。 */
interface KnowledgeDirectoryMigration {
  currentPrefix: string
  legacyPrefix: string
}

/** 知识文章的仓库内根目录。 */
const KNOWLEDGE_CONTENT_ROOT = join(process.cwd(), 'src', 'content', 'knowledge')

/** 知识文章引用的本地媒体根目录。 */
const KNOWLEDGE_ASSET_ROOT = join(process.cwd(), 'public', 'knowledge-assets')

/** 支持作为知识文章读取的扩展名。 */
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx'])

/** 判断 URL 是否已经是无需改写的绝对地址或页内锚点。 */
const EXTERNAL_URL_PATTERN = /^(?:[a-z][a-z\d+.-]*:|\/|#)/i

/** 匹配 Obsidian 的图片嵌入语法，并保留可选的显示别名。 */
const OBSIDIAN_IMAGE_PATTERN = /!\[\[([^\]]+)\]\]/g

/** 作为目录正文入口、不应直接出现在展示路径中的文件名。 */
const DIRECTORY_ENTRY_NAMES = new Set(['chapter'])

/** 全栈开发内容所在的路线目录名称。 */
const FULL_STACK_SECTION_NAME = '全栈开发'

/** AI 应用内容所在的路线目录名称。 */
const AI_APP_TRACK_SECTION_NAME = 'AI大模型应用开发'

/** 全栈路线中后端内容所在的模块目录名称。 */
const BACKEND_SECTION_NAME = '后端'

/** AI 编程内容所在的顶层板块名称。 */
const AI_CODING_SECTION_NAME = 'AI编程'

/** 全栈路线中前端内容所在的顶层板块名称。 */
const FRONTEND_SECTION_NAME = '前端'

/** 全栈路线中测试内容所在的顶层板块名称。 */
const TESTING_SECTION_NAME = '测试'

/** 匹配课程目录开头用于排序和分组的数字。 */
const COURSE_ORDER_PATTERN = /^(\d+)-/

/** 三条路线中用于聚合同一系统课程的目录深度。 */
const COURSE_GROUP_DEPTH_BY_TRACK_SECTION: Partial<Record<string, number>> = {
  [FULL_STACK_SECTION_NAME]: 3,
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

/** 各文章用途在同一课程中的阅读阶段。 */
const ARTICLE_SEQUENCE_GROUP: Record<KnowledgeArticleKind, number> = {
  guide: 0,
  lesson: 1,
  practice: 1,
  reference: 2
}

/** 匹配目录或文件名前用于控制顺序的数字前缀。 */
const ORDER_PREFIX_PATTERN = /^\d+-/

/** 匹配标题中已经存在的课程、实践或附录前缀。 */
const ARTICLE_TITLE_PREFIX_PATTERN =
  /^(?:第\s*\d+\s*课(?:实践)?|附录\s*\d+|\d+\s*(?:[-·:]\s*demo\s*[：:]?|[-·:]|demo\s*[：:]))\s*[：:]?\s*/i

/** 不参与普通课程序号展示的目录控制编号。 */
const RESERVED_ARTICLE_ORDERS = new Set([0, 98, 99])

/** 清理旧标题中已经存在的学习指南语义前缀。 */
const GUIDE_TITLE_PREFIX_PATTERN = /^(?:学习指南|学习路线)\s*[：:]\s*/

/** 匹配页面统一生成的模块内课号前缀。 */
const SEQUENCED_TITLE_PREFIX_PATTERN = /^第\s*\d+\s*课(?:实践|扩展)?[：:]\s*/

/** 需要使用标准技术品牌大小写的细分类名称。 */
const KNOWLEDGE_SUBTOPIC_LABELS: Record<string, string> = {
  java: 'Java',
  python: 'Python',
  playwright: 'Playwright'
}

/** 可供 Obsidian 图片语法按文件名查找的全部媒体相对路径。 */
const KNOWLEDGE_ASSET_PATHS = fs.existsSync(KNOWLEDGE_ASSET_ROOT)
  ? (fs.readdirSync(KNOWLEDGE_ASSET_ROOT, { recursive: true }) as string[])
      .map((assetPath) => assetPath.split(sep).join('/'))
      .filter((assetPath) => fs.statSync(join(KNOWLEDGE_ASSET_ROOT, assetPath)).isFile())
  : []

/** 生产构建中复用的文章目录，避免每个静态页面重复扫描全部 Markdown。 */
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
      files.push(...findMarkdownFiles(entryPath))
      continue
    }

    if (entry.isFile() && MARKDOWN_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(entryPath)
    }
  }

  return files
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
 * 清理源文章中已经存在的课号和用途前缀。
 * @param rawTitle Markdown 中声明的原始标题。
 * @param sourceArticlePath 不含扩展名的源文章相对路径。
 */
function getBaseArticleTitle(rawTitle: string, sourceArticlePath: string): string {
  /** 从正文所在目录得出的课程编号。 */
  const articleOrder = getArticleOrder(sourceArticlePath)
  /** 匹配与路径课号相同、但没有分隔符的旧标题编号。 */
  const matchingOrderPrefixPattern = articleOrder
    ? new RegExp(`^0*${articleOrder}(?:\\s+章\\s+Demo\\s*[·:：-]?|\\s+)`, 'i')
    : null
  /** 先清理带分隔符的通用旧标题前缀。 */
  const titleWithoutKnownPrefix = rawTitle.replace(ARTICLE_TITLE_PREFIX_PATTERN, '')
  /** 去掉旧课号、Demo 和学习指南标记后的标题正文。 */
  const normalizedTitle = (
    matchingOrderPrefixPattern
      ? titleWithoutKnownPrefix.replace(matchingOrderPrefixPattern, '')
      : titleWithoutKnownPrefix
  )
    .replace(GUIDE_TITLE_PREFIX_PATTERN, '')
    .trim()

  return normalizedTitle || rawTitle
}

/**
 * 生成与模块内连续顺序一致的列表和正文标题。
 * @param baseTitle 已清理旧顺序前缀的文章标题。
 * @param kind 当前文章在学习路径中的用途。
 * @param sequence 当前文章在所属模块中的顺序。
 */
function getSequencedArticleTitle(baseTitle: string, kind: KnowledgeArticleKind, sequence: number): string {
  /** 统一使用两位数展示的模块内顺序。 */
  const sequenceLabel = sequence.toString().padStart(2, '0')

  if (kind === 'guide') {
    return `第 ${sequenceLabel} 课：学习指南：${baseTitle}`
  }

  if (kind === 'reference') {
    return `第 ${sequenceLabel} 课扩展：${baseTitle}`
  }

  if (kind === 'practice') {
    return `第 ${sequenceLabel} 课实践：${baseTitle}`
  }

  return `第 ${sequenceLabel} 课：${baseTitle}`
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
 * 返回规范知识路径对应的旧版公开路径，用于保留已发布链接。
 * @param articlePath 重组后的规范文章路径。
 */
export function getLegacyKnowledgeArticlePath(articlePath: string): string | null {
  for (const directoryMigration of KNOWLEDGE_DIRECTORY_MIGRATIONS) {
    /** 当前目录迁移规则转换出的旧版路径。 */
    const legacyArticlePath = replaceKnowledgePathPrefix(
      articlePath,
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
 * 将旧版公开文章路径转换为重组后的实际文件路径。
 * @param articlePath URL 中请求的新版或旧版文章路径。
 */
function getCurrentKnowledgeArticlePath(articlePath: string): string {
  for (const directoryMigration of KNOWLEDGE_DIRECTORY_MIGRATIONS) {
    /** 当前目录迁移规则转换出的规范路径。 */
    const currentArticlePath = replaceKnowledgePathPrefix(
      articlePath,
      directoryMigration.legacyPrefix,
      directoryMigration.currentPrefix
    )

    if (currentArticlePath) {
      return currentArticlePath
    }
  }

  return articlePath
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
 * 根据全栈文章路径返回与思维导图一致的一级模块。
 * @param sectionName 当前文章去除排序前缀后的顶层板块名称。
 */
function getFullStackTopic(sectionName: string): string {
  if (sectionName === FRONTEND_SECTION_NAME) {
    return KNOWLEDGE_MODULE_LABELS.fullStack.frontend
  }

  if (sectionName === TESTING_SECTION_NAME) {
    return KNOWLEDGE_MODULE_LABELS.fullStack.testing
  }

  if (sectionName !== BACKEND_SECTION_NAME) {
    return KNOWLEDGE_MODULE_LABELS.fullStack.business
  }

  // 修复系统课程被按课号拆散的问题：Java 与 Python 应保持完整后端学习路线，不归入运维、测试或业务。
  return KNOWLEDGE_MODULE_LABELS.fullStack.backend
}

/**
 * 根据文章目录结构生成知识库侧栏使用的一级模块名称。
 * @param trackSectionName 当前文章去除排序前缀后的路线目录名称。
 * @param contentSectionName 当前文章在路线中的模块目录名称。
 */
function getArticleTopic(trackSectionName: string, contentSectionName: string): string {
  if (trackSectionName === AI_CODING_SECTION_NAME) {
    // 修复带连字符的实体目录无法命中页面模块配置：目录仍保留 URL 语义，展示名称统一使用空格。
    return contentSectionName.replaceAll('-', ' ')
  }

  if (trackSectionName === AI_APP_TRACK_SECTION_NAME) {
    return contentSectionName === 'Agent工程' ? KNOWLEDGE_MODULE_LABELS.aiApps.agentEngineering : contentSectionName
  }

  return getFullStackTopic(contentSectionName)
}

/**
 * 识别文章在初学者学习路径中的用途。
 * @param sourceArticlePath 不含扩展名的源文章相对路径。
 */
function getArticleKind(sourceArticlePath: string): KnowledgeArticleKind {
  /** 源文章路径的分段结果。 */
  const pathSegments = sourceArticlePath.split('/')
  /** 源文章不含目录的文件名。 */
  const fileName = pathSegments.at(-1) || ''

  if (fileName.startsWith('00-') || fileName === 'course' || sourceArticlePath === 'index') {
    return 'guide'
  }

  if (pathSegments.includes('lab')) {
    return 'practice'
  }

  if (
    fileName.startsWith('98-') ||
    fileName.startsWith('99-') ||
    pathSegments.some((segment) => segment.startsWith('98-') || segment.startsWith('99-')) ||
    pathSegments.includes('appendices') ||
    pathSegments.includes('extras') ||
    pathSegments.includes('raw')
  ) {
    return 'reference'
  }

  return 'lesson'
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
  const kind = getArticleKind(sourceArticlePath)
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
  /** 仅全栈路线保留 Java、Python 等真正有助于阅读的技术细分类。 */
  const subtopicPathSegment = trackSectionName === FULL_STACK_SECTION_NAME ? slug[2] : slug[1]
  /** 文章路径对应的原始课程或技术细分类名称。 */
  const rawSubtopic = getDisplayName(subtopicPathSegment || contentSectionName)
  /** 使用标准技术名称或去除路径分隔符后的细分类展示名称。 */
  const subtopic = KNOWLEDGE_SUBTOPIC_LABELS[rawSubtopic.toLowerCase()] || rawSubtopic.replaceAll('-', ' ')
  /** 当前文章所属的公开学习主线；总览等公共文章不限定主线。 */
  const track = KNOWLEDGE_TRACK_BY_SECTION[trackSectionName] || null

  return {
    slug,
    path: articlePath,
    displayPath: articlePath,
    sourcePath: sourceArticlePath,
    href: `/knowledge/${encodePath(articlePath)}`,
    title,
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

/** 返回全部知识文章元数据，并按原目录与编号顺序排列。 */
export function getKnowledgeArticles(): KnowledgeArticle[] {
  if (process.env.NODE_ENV === 'production' && productionKnowledgeArticles) {
    return productionKnowledgeArticles
  }

  /** 按实体模块、文章用途和源路径完成基础排序的文章。 */
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

      /** 两篇文章所属阅读阶段的排序结果。 */
      const sequenceGroupComparison =
        ARTICLE_SEQUENCE_GROUP[leftArticle.kind] - ARTICLE_SEQUENCE_GROUP[rightArticle.kind]

      return sequenceGroupComparison || leftArticle.path.localeCompare(rightArticle.path, 'zh-CN', { numeric: true })
    })

  /** 各学习主线与实体模块已经分配到的文章数量。 */
  const sequenceByModule = new Map<string, number>()
  /** 补齐模块内连续课号和最终标题后的文章目录。 */
  const sequencedArticles = sortedArticles.map((article) => {
    /** 当前文章所属主线和实体模块组成的唯一分组键。 */
    const moduleKey = `${article.track || 'shared'}:${article.topic}`
    /** 当前文章在所属模块中从 01 开始的连续顺序。 */
    const sequence = (sequenceByModule.get(moduleKey) || 0) + 1
    sequenceByModule.set(moduleKey, sequence)

    return {
      ...article,
      sequence,
      title: getSequencedArticleTitle(article.title, article.kind, sequence)
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
  const currentArticlePath = getCurrentKnowledgeArticlePath(requestedArticlePath)
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
            const targetArticlePath = resolvedPath.slice(0, -posix.extname(resolvedPath).length)
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
 * 读取并渲染一篇知识文章。
 * @param slug URL 中的文章路径片段。
 */
export async function getKnowledgeArticle(slug: string[]): Promise<KnowledgeArticlePageData | null> {
  /** 已验证且实际存在的文章文件路径。 */
  const filePath = resolveArticleFile(slug)

  if (!filePath) {
    return null
  }

  /** 文章原始 Markdown 内容。 */
  const markdown = await readFile(filePath, 'utf8')
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
    (article) => article.track === metadata.track && article.topic === metadata.topic
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
  /** 经过 GFM 和相对链接处理后的 HTML 内容。 */
  const processedContent = await remark()
    .use(remarkGfm)
    .use(() => rewriteArticleHeading(metadata.title))
    .use(() => rewriteKnowledgeLinks(metadata.sourcePath))
    .use(html)
    .process(normalizedMarkdown)

  return {
    ...metadata,
    content: processedContent.toString(),
    quiz: createKnowledgeQuiz(metadata.path, markdown, quizTitle),
    previousArticle,
    nextArticle
  }
}
