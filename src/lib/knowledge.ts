import 'server-only'

import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, posix, relative, resolve, sep } from 'node:path'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import html from 'remark-html'

/** 知识文章在列表页和阅读页共用的元数据。 */
export interface KnowledgeArticle {
  slug: string[]
  path: string
  displayPath: string
  sourcePath: string
  href: string
  title: string
  topic: string
  kind: KnowledgeArticleKind
  breadcrumbs: string[]
}

/** 知识文章在学习路径中的用途。 */
export type KnowledgeArticleKind = 'guide' | 'lesson' | 'practice' | 'reference'

/** Markdown AST 中本功能会访问的节点字段。 */
interface MarkdownNode {
  type?: string
  url?: string
  children?: MarkdownNode[]
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

/** 需要按下一级目录拆分筛选项的知识主题。 */
const BACKEND_TOPIC_NAME = '后端'

/** 后端语言目录对应的筛选项显示名称。 */
const BACKEND_TOPIC_LABELS: Record<string, string> = {
  java: 'Java',
  python: 'Python'
}

/** 需要按第二层课程目录拆分筛选项的顶层板块。 */
const SERIES_TOPIC_NAMES = new Set(['AI编程', '前端'])

/** 需要按前两层路径分别排序的课程型板块。 */
const SERIES_GROUP_NAMES = new Set(['AI编程', '前端', '后端', '测试'])

/** 各文章用途在同一课程中的阅读阶段。 */
const ARTICLE_SEQUENCE_GROUP: Record<KnowledgeArticleKind, number> = {
  guide: 0,
  lesson: 1,
  practice: 1,
  reference: 2
}

/** 匹配目录或文件名前用于控制顺序的数字前缀。 */
const ORDER_PREFIX_PATTERN = /^\d+-/

/** 可供 Obsidian 图片语法按文件名查找的全部媒体相对路径。 */
const KNOWLEDGE_ASSET_PATHS = fs.existsSync(KNOWLEDGE_ASSET_ROOT)
  ? (fs.readdirSync(KNOWLEDGE_ASSET_ROOT, { recursive: true }) as string[])
      .map((assetPath) => assetPath.split(sep).join('/'))
      .filter((assetPath) => fs.statSync(join(KNOWLEDGE_ASSET_ROOT, assetPath)).isFile())
  : []

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
 * 隐藏仅用于文件系统排序的数字前缀。
 * @param name 目录或文件的原始名称。
 */
function getDisplayName(name: string): string {
  return name.replace(ORDER_PREFIX_PATTERN, '')
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
  /** 列表和阅读页显示的文章标题。 */
  const title = extractTitle(markdown, fallbackTitle)
  /** 当前文章所属的顶层板块名称。 */
  const sectionName = getDisplayName(slug[0] || '其他')
  /** 按课程拆分后的筛选项名称。 */
  const topic =
    SERIES_TOPIC_NAMES.has(sectionName) && slug[1]
      ? getDisplayName(slug[1])
      : sectionName === BACKEND_TOPIC_NAME && slug[1]
        ? BACKEND_TOPIC_LABELS[slug[1].toLowerCase()] || slug[1]
        : slug.length === 1
          ? '总览'
          : sectionName
  /** 当前文章在学习路径中的用途。 */
  const kind = getArticleKind(sourceArticlePath)

  return {
    slug,
    path: articlePath,
    displayPath: articlePath,
    sourcePath: sourceArticlePath,
    href: `/knowledge/${encodePath(articlePath)}`,
    title,
    topic,
    kind,
    breadcrumbs: slug.slice(0, -1)
  }
}

/** 返回全部知识文章元数据，并按原目录与编号顺序排列。 */
export function getKnowledgeArticles(): KnowledgeArticle[] {
  return findMarkdownFiles(KNOWLEDGE_CONTENT_ROOT)
    .map(createArticleMetadata)
    .sort((leftArticle, rightArticle) => {
      /** 左侧文章用于聚合同一课程的路径。 */
      const leftSegments = leftArticle.path.split('/')
      /** 右侧文章用于聚合同一课程的路径。 */
      const rightSegments = rightArticle.path.split('/')
      /** 左侧文章的课程分组路径。 */
      const leftGroupPath = leftSegments
        .slice(0, SERIES_GROUP_NAMES.has(getDisplayName(leftSegments[0] || '')) ? 2 : 1)
        .join('/')
      /** 右侧文章的课程分组路径。 */
      const rightGroupPath = rightSegments
        .slice(0, SERIES_GROUP_NAMES.has(getDisplayName(rightSegments[0] || '')) ? 2 : 1)
        .join('/')
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

  /** 未携带扩展名的文章绝对路径。 */
  const articleBasePath = resolve(KNOWLEDGE_CONTENT_ROOT, ...normalizedSlug)
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
export async function getKnowledgeArticle(slug: string[]): Promise<(KnowledgeArticle & { content: string }) | null> {
  /** 已验证且实际存在的文章文件路径。 */
  const filePath = resolveArticleFile(slug)

  if (!filePath) {
    return null
  }

  /** 文章原始 Markdown 内容。 */
  const markdown = await readFile(filePath, 'utf8')
  /** 文章列表和页面标题所需的元数据。 */
  const metadata = createArticleMetadata(filePath)
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
    .use(() => rewriteKnowledgeLinks(metadata.sourcePath))
    .use(html)
    .process(normalizedMarkdown)

  return {
    ...metadata,
    content: processedContent.toString()
  }
}
