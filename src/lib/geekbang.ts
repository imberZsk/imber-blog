import 'server-only'

import fs from 'node:fs'
import { join, posix } from 'node:path'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import html from 'remark-html'
import manifest from '@/content/geekbang/manifest.json'

/** 本地备份的课程清单，保持原始目录顺序和来源标识。 */
export const geekbangCourses = manifest
/** 仅允许从迁移后的正文目录读取文章。 */
const CONTENT_ROOT = join(process.cwd(), 'src/content/geekbang')
/** Markdown 变换所需的最小 AST 节点。 */
interface MarkdownNode {
  type: string
  value?: string
  url?: string
  depth?: number
  children?: MarkdownNode[]
  data?: { hProperties: { id: string } }
}

/** 根据课程和章节标识读取已登记的原文；不将路由参数拼接为文件路径。 */
export async function getGeekbangChapter(courseSlug: string, chapterSlug: string) {
  /** 当前课程及其章节，均通过清单严格匹配。 */
  const course = geekbangCourses.find((item) => item.slug === courseSlug)
  /** 当前章节在原始顺序中的位置。 */
  const index = course?.chapters.findIndex((item) => item.slug === chapterSlug) ?? -1
  /** 当前请求对应的章节元数据。 */
  const chapter = course?.chapters[index]
  if (!course || !chapter) return null
  /** 未改写的备份正文。 */
  const markdown = fs.readFileSync(join(CONTENT_ROOT, chapter.path), 'utf8')
  /** 服务端生成的可直接访问的章节目录。 */
  const headings: { id: string; text: string; depth: number }[] = []
  /** 获取标题子节点内的纯文本；node 为当前 Markdown 节点。 */
  function headingText(node: MarkdownNode): string {
    return node.value || node.children?.map(headingText).join('') || ''
  }
  /** 为标题建立锚点并重定位原文相对资源；node 为当前 AST 节点。 */
  function transform(node: MarkdownNode) {
    if (node.type === 'heading') {
      /** 依据正文顺序生成唯一锚点，避免重名标题互相覆盖。 */
      const id = `section-${headings.length}`
      headings.push({ id, text: headingText(node), depth: node.depth || 1 })
      node.data = { hProperties: { id } }
    }
    if (node.url && !/^(?:https?:|mailto:|#)/i.test(node.url)) {
      /** 在原文目录中解析相对 URL，资源只允许进入公开图片目录。 */
      const resolved = posix.normalize(posix.join(posix.dirname(chapter!.path), node.url))
      if (resolved.startsWith('assets/')) node.url = `/geekbang/${resolved}`
      else {
        /** 原文链接若指向另一章节，则替换为博客路由。 */
        const linkedCourse = geekbangCourses.find((item) =>
          item.chapters.some((entry) => entry.path === resolved.replace(/\.html$/, '.md'))
        )
        /** 目标文章的登记信息，未知地址保持为不可跳转的锚点。 */
        const linkedChapter = linkedCourse?.chapters.find((entry) => entry.path === resolved.replace(/\.html$/, '.md'))
        node.url = linkedChapter ? `/geekbang/${linkedCourse?.slug}/${linkedChapter.slug}` : '#'
      }
    }
    node.children?.forEach(transform)
  }
  /** 默认净化 HTML，原文中的代码仅展示而不执行。 */
  const rendered = await remark()
    .use(remarkGfm)
    .use(() => (tree) => transform(tree as MarkdownNode))
    .use(html)
    .process(markdown)
  return {
    course, // 所属知识库和全部同系列章节。
    chapter, // 当前正文的原始标题和文件位置。
    index, // 用于计算上一篇和下一篇。
    headings: headings.filter((item) => item.depth > 1), // 页面已有主标题，目录只显示正文小节。
    content: String(rendered)
      .replace(/id="user-content-section-/g, 'id="section-')
      .replace(/^<h1[^>]*>[\s\S]*?<\/h1>\s*/, '') // 避免原文一级标题与页面标题重复。
  }
}
