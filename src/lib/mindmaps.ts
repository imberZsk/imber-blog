import 'server-only'

import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'
import {
  DEFAULT_KNOWLEDGE_LANGUAGE,
  projectKnowledgeMarkdown,
  type KnowledgeLanguage
} from '@/lib/knowledge-language'

/** 思维导图列表与详情页共用的元数据。 */
export interface MindmapSummary {
  slug: string
  title: string
  description: string
  href: string
  nodeCount: number
}

/** 思维导图 Markdown 的仓库内根目录。 */
const MINDMAP_CONTENT_ROOT = join(process.cwd(), 'src', 'content', 'mindmaps')

/** 思维导图介绍文案与文件名关键词的映射。 */
const MINDMAP_DESCRIPTIONS: Record<string, string> = {
  全栈开发: '从 Web 平台、前后端、数据到基础设施，建立完整的软件交付视角。',
  AI编程: '把 AI 放进需求理解、代码实现、测试审查和交付流程，形成可靠的人机协作方法。',
  AI大模型应用开发: '覆盖模型调用、Prompt、RAG、Agent、评测、可观测性与生产工程。'
}

/** 匹配 Markdown 中的首个一级标题。 */
const MINDMAP_TITLE_PATTERN = /^#\s+(.+)$/m

/** 匹配 Markdown 中构成导图节点的无序列表项。 */
const MINDMAP_NODE_PATTERN = /^\s*[-*+]\s+/gm

/** 匹配文件名前用于控制学习顺序的数字。 */
const MINDMAP_ORDER_PATTERN = /^\d+-/

/** 返回全部思维导图 Markdown 文件。 */
function findMindmapFiles(): string[] {
  if (!fs.existsSync(MINDMAP_CONTENT_ROOT)) {
    return []
  }

  return fs
    .readdirSync(MINDMAP_CONTENT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.md')
    .map((entry) => join(MINDMAP_CONTENT_ROOT, entry.name))
}

/**
 * 从一份 Markdown 生成思维导图列表元数据。
 * @param filePath Markdown 文件的绝对路径。
 * @param language 当前需要统计的代码语言版本。
 */
function createMindmapSummary(
  filePath: string,
  language: KnowledgeLanguage = DEFAULT_KNOWLEDGE_LANGUAGE
): MindmapSummary {
  /** 相对思维导图目录的文件名。 */
  const fileName = relative(MINDMAP_CONTENT_ROOT, filePath).split(sep).join('/')
  /** 不包含扩展名的公开标识。 */
  const slug = fileName.slice(0, -extname(fileName).length)
  /** 思维导图原始 Markdown。 */
  const markdown = projectKnowledgeMarkdown(fs.readFileSync(filePath, 'utf8'), language)
  /** Markdown 中首个一级标题的匹配结果。 */
  const titleMatch = markdown.match(MINDMAP_TITLE_PATTERN)
  /** 去掉文件顺序号后的标题关键词。 */
  const titleKey = slug.replace(MINDMAP_ORDER_PATTERN, '')
  /** 用于展示的思维导图标题。 */
  const title = titleMatch?.[1]?.trim() || titleKey

  return {
    slug,
    title,
    description: MINDMAP_DESCRIPTIONS[titleKey] || '按知识层级展开的学习地图。',
    href: `/mindmaps/${encodeURIComponent(slug)}`,
    nodeCount: markdown.match(MINDMAP_NODE_PATTERN)?.length || 0
  }
}

/** 返回全部思维导图，并按文件名前缀顺序排列。 */
export function getMindmaps(language: KnowledgeLanguage = DEFAULT_KNOWLEDGE_LANGUAGE): MindmapSummary[] {
  return findMindmapFiles()
    .map((filePath) => createMindmapSummary(filePath, language))
    .sort((leftMindmap, rightMindmap) => leftMindmap.slug.localeCompare(rightMindmap.slug, 'zh-CN', { numeric: true }))
}

/**
 * 安全解析思维导图标识对应的 Markdown 文件。
 * @param slug URL 中的思维导图标识。
 */
function resolveMindmapFile(slug: string): string | null {
  /** 解码后的思维导图标识。 */
  let decodedSlug = ''

  try {
    decodedSlug = decodeURIComponent(slug)
  } catch {
    return null
  }

  if (!decodedSlug || decodedSlug.includes('/') || decodedSlug === '.' || decodedSlug === '..') {
    return null
  }

  /** 思维导图根目录的规范化前缀。 */
  const mindmapRootPrefix = `${resolve(MINDMAP_CONTENT_ROOT)}${sep}`
  /** 当前标识对应的候选 Markdown 文件。 */
  const candidatePath = resolve(MINDMAP_CONTENT_ROOT, `${decodedSlug}.md`)

  if (
    candidatePath.startsWith(mindmapRootPrefix) &&
    fs.existsSync(candidatePath) &&
    fs.statSync(candidatePath).isFile()
  ) {
    return candidatePath
  }

  return null
}

/**
 * 读取一份用于浏览器导图解析的原始 Markdown。
 * @param slug URL 中的思维导图标识。
 * @param language 当前需要投影的代码语言。
 */
export async function getMindmap(
  slug: string,
  language: KnowledgeLanguage = DEFAULT_KNOWLEDGE_LANGUAGE
): Promise<(MindmapSummary & { markdown: string }) | null> {
  /** 已验证且存在的思维导图文件。 */
  const filePath = resolveMindmapFile(slug)

  if (!filePath) {
    return null
  }

  /** 思维导图原始 Markdown。 */
  const markdown = projectKnowledgeMarkdown(await readFile(filePath, 'utf8'), language)

  return {
    ...createMindmapSummary(filePath, language),
    markdown
  }
}
