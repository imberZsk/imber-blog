import 'server-only'

import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import html from 'remark-html'

/** 文集列表展示的一篇原创文章。 */
export interface PostSummary {
  slug: string
  title: string
  href: string
  date: string
  tags: string[]
}

/** 文集 Markdown 的仓库内根目录。 */
const POST_CONTENT_ROOT = join(process.cwd(), 'src', 'content', 'posts')

/** 文集支持读取的 Markdown 扩展名。 */
const POST_EXTENSIONS = new Set(['.md', '.mdx'])

/** 匹配文件名前可选的发布日期。 */
const POST_DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})-/

/** 匹配文章中的首个一级标题。 */
const POST_TITLE_PATTERN = /^#\s+(.+)$/m

/** 返回文集目录中直接存放的全部 Markdown 文件。 */
function findPostFiles(): string[] {
  if (!fs.existsSync(POST_CONTENT_ROOT)) {
    return []
  }

  return fs
    .readdirSync(POST_CONTENT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isFile() && POST_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map((entry) => join(POST_CONTENT_ROOT, entry.name))
}

/**
 * 从 Markdown 文件生成文集列表元数据。
 * @param filePath 文集文章的绝对路径。
 */
function createPostSummary(filePath: string): PostSummary {
  /** 文章相对文集目录的文件名。 */
  const fileName = relative(POST_CONTENT_ROOT, filePath).split(sep).join('/')
  /** 不包含 Markdown 扩展名的公开 slug。 */
  const slug = fileName.slice(0, -extname(fileName).length)
  /** 文章原始 Markdown 内容。 */
  const markdown = fs.readFileSync(filePath, 'utf8')
  /** Markdown 中首个一级标题的匹配结果。 */
  const titleMatch = markdown.match(POST_TITLE_PATTERN)
  /** 文件名中发布日期的匹配结果。 */
  const dateMatch = slug.match(POST_DATE_PATTERN)
  /** 没有一级标题时使用的文件名标题。 */
  const fallbackTitle = slug.replace(POST_DATE_PATTERN, '').replaceAll('-', ' ')

  return {
    slug,
    title: titleMatch?.[1]?.replace(/[`*_~]/g, '').trim() || fallbackTitle || '未命名文章',
    href: `/posts/${encodeURIComponent(slug)}`,
    date: dateMatch?.[1] || '',
    tags: ['文章']
  }
}

/** 返回全部原创文集文章，并按日期和文件名倒序排列。 */
export function getPosts(): PostSummary[] {
  return findPostFiles()
    .map(createPostSummary)
    .sort((leftPost, rightPost) => rightPost.slug.localeCompare(leftPost.slug, 'zh-CN', { numeric: true }))
}

/**
 * 安全解析文集 slug 对应的 Markdown 文件。
 * @param slug URL 中的文集文章标识。
 */
function resolvePostFile(slug: string): string | null {
  /** 解码后的文章标识。 */
  let decodedSlug = ''

  try {
    decodedSlug = decodeURIComponent(slug)
  } catch {
    return null
  }

  if (!decodedSlug || decodedSlug.includes('/') || decodedSlug === '.' || decodedSlug === '..') {
    return null
  }

  /** 文集根目录的规范化前缀。 */
  const postRootPrefix = `${resolve(POST_CONTENT_ROOT)}${sep}`

  for (const extension of POST_EXTENSIONS) {
    /** 当前扩展名对应的候选文件。 */
    const candidatePath = resolve(POST_CONTENT_ROOT, `${decodedSlug}${extension}`)

    if (
      candidatePath.startsWith(postRootPrefix) &&
      fs.existsSync(candidatePath) &&
      fs.statSync(candidatePath).isFile()
    ) {
      return candidatePath
    }
  }

  return null
}

/**
 * 读取并渲染一篇原创文集文章。
 * @param slug URL 中的文集文章标识。
 */
export async function getPost(slug: string): Promise<(PostSummary & { content: string }) | null> {
  /** 已验证且存在的文章文件。 */
  const filePath = resolvePostFile(slug)

  if (!filePath) {
    return null
  }

  /** 文章原始 Markdown 内容。 */
  const markdown = await readFile(filePath, 'utf8')
  /** 文章列表和详情页共用的元数据。 */
  const summary = createPostSummary(filePath)
  /** 支持 GFM 语法的文章 HTML。 */
  const processedContent = await remark().use(remarkGfm).use(html).process(markdown)

  return {
    ...summary,
    content: processedContent.toString()
  }
}
