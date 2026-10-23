import 'server-only'

import fs from 'node:fs'
import { join, posix } from 'node:path'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import html from 'remark-html'

/** 原项目技术笔记的独立内容目录，不混入博客现有知识课程。 */
const DOCS_ROOT = join(process.cwd(), 'src/content/frontend-docs')
/** 原文媒体资源在博客中的公共路径。 */
const DOCS_ASSET_ROOT = '/frontend-lab/docs'
/** 文章内锚点的固定命名空间，避免标题覆盖页面已有的 DOM 标识。 */
const DOC_HEADING_PREFIX = 'frontend-doc-'
/** 原文分类对应的中文名称。 */
const DOCS_CATEGORIES: Record<string, string> = {
  note: '工程笔记', // 原项目零散实践笔记。
  react: 'React', // React 原理系列。
  next: 'Next.js', // Next.js 与生态实践。
  editor: '富文本编辑器', // 编辑器实现系列。
  animation: '动画开发', // GSAP 与 Framer Motion 笔记。
  cli: '脚手架' // 工程模板与 CLI 实践。
}

/** 文档索引和全文搜索共用的轻量数据。 */
export interface FrontendDoc {
  slug: string
  href: string
  title: string
  category: string
  searchText: string
}

/** AST 中需要读取或改写的字段。 */
interface DocNode {
  type: string
  value?: string
  url?: string
  children?: DocNode[]
  data?: { hProperties?: Record<string, string> }
}

/** 返回全部原项目笔记的路径、标题与正文搜索索引。 */
export function getFrontendDocs(): FrontendDoc[] {
  /** 待遍历的相对目录，根目录以空路径开始。 */
  const directories = ['']
  /** 已发现的文章索引。 */
  const docs: FrontendDoc[] = []
  for (const directory of directories) {
    for (const entry of fs.readdirSync(join(DOCS_ROOT, directory), { withFileTypes: true })) {
      /** 当前条目的相对路径。 */
      const relativePath = posix.join(directory, entry.name)
      if (entry.isDirectory()) directories.push(relativePath)
      else if (entry.isFile() && entry.name.endsWith('.md')) {
        /** 保留原文，只为标题和搜索读取内容。 */
        const markdown = fs.readFileSync(join(DOCS_ROOT, relativePath), 'utf8')
        /** 不带扩展名的原始路径。 */
        const slug = relativePath.slice(0, -3)
        docs.push({
          slug, // 用于严格匹配公开路由，拒绝目录穿越。
          href: `/lab/docs/${slug.split('/').map(encodeURIComponent).join('/')}`, // 每段编码以支持中文路径。
          title:
            markdown
              .match(/^#{1,3}\s+(.+)$/m)?.[1]
              ?.replace(/[*`]/g, '')
              .trim() || entry.name.slice(0, -3), // 原文首个标题优先。
          category: DOCS_CATEGORIES[slug.split('/')[0]] || '工程笔记', // 未登记的分类保留通用名称。
          searchText: markdown.toLocaleLowerCase() // 支持原站的正文全文检索。
        })
      }
    }
  }
  return docs.sort((left, right) => left.slug.localeCompare(right.slug, 'zh-CN', { numeric: true }))
}

/** 渲染原文；slug 必须来自已发现的文章清单，媒体和站内链接在 AST 阶段重定位。 */
export async function getFrontendDoc(slug: string) {
  /** 单次读取复用文档索引，避免每个图片或链接重复扫描全部正文。 */
  const docs = getFrontendDocs()
  /** 已登记的文章，用户输入不能直接用作文件路径。 */
  const doc = docs.find((item) => item.slug === slug)
  if (!doc) return null
  /** 原始文档 Markdown，不改写源文件。 */
  const markdown = fs.readFileSync(join(DOCS_ROOT, `${doc.slug}.md`), 'utf8')
  /** 受控媒体占位符及安全 HTML，仅提取真实 HTML 节点，不处理围栏代码。 */
  const media: string[] = []
  /** 重复标题的计数，用于生成稳定且唯一的锚点。 */
  const headingCounts = new Map<string, number>()

  /** 读取标题节点的完整展示文本；node 可包含强调、链接或内联代码。 */
  function getHeadingText(node: DocNode): string {
    return node.value || node.children?.map(getHeadingText).join('') || ''
  }

  /** 将原文 URL 转为博客路由或独立媒体路径；url 为 Markdown/HTML 节点中的路径。 */
  function resolveUrl(url: string): string {
    if (url.startsWith('#')) return `#${DOC_HEADING_PREFIX}${url.slice(1)}`
    if (/^(?:https?:|mailto:|data:image\/)/i.test(url)) return url
    if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//')) return '#'
    /** 与站点根或当前文章目录对应的解析路径。 */
    const resolvedPath = posix.normalize(
      url.startsWith('/') ? url.replace(/^\/(?:docs\/)?/, '') : posix.join(posix.dirname(doc!.slug), url)
    )
    if (resolvedPath.startsWith('../')) return '#'
    /** 分离锚点及查询串，以便判断文档扩展名。 */
    const [, pathname = resolvedPath, rawSuffix = ''] = resolvedPath.match(/^([^?#]*)(.*)$/) || []
    /** 站内文章锚点使用同一前缀，保持原文目录间链接可用。 */
    const suffix = rawSuffix.replace('#', `#${DOC_HEADING_PREFIX}`)
    /** 不带 HTML 或 Markdown 扩展名的候选文章路径。 */
    const articlePath = pathname.replace(/\.(?:md|html)$/, '')
    if (docs.some((item) => item.slug === articlePath)) return `/lab/docs/${articlePath}${suffix}`
    return `${DOCS_ASSET_ROOT}/${resolvedPath}`
  }

  /** 转换链接和安全媒体节点；node 为当前 Markdown AST 节点。 */
  function transformNode(node: DocNode) {
    if (node.url) node.url = resolveUrl(node.url)
    if (node.type === 'heading') {
      /** 与原文标题语义对应的锚点名称。 */
      const baseId =
        getHeadingText(node)
          .trim()
          .toLocaleLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~，。！？、：；（）【】]/g, '') || 'section'
      /** 相同标题此前已经出现的次数。 */
      const count = headingCounts.get(baseId) || 0
      headingCounts.set(baseId, count + 1)
      node.data = { hProperties: { id: `${DOC_HEADING_PREFIX}${baseId}${count ? `-${count}` : ''}` } }
    }
    if (node.type === 'html' && node.value) {
      /** 只迁移原文展示的图片、视频和 iframe；其余原始 HTML 继续交由 remark 的默认净化。 */
      const match = node.value.match(
        /^\s*<(img|video|iframe)\b[^>]*\bsrc=["']([^"']+)["'][^>]*(?:\/>|>[\s\S]*?<\/\1>|>)\s*$/i
      )
      if (match) {
        /** 已重定位且过滤协议的媒体地址。 */
        const url = resolveUrl(match[2]).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
        /** 当前节点对应的安全 HTML 片段。 */
        const safeHtml =
          match[1].toLowerCase() === 'video'
            ? `<video src="${url}" controls playsinline preload="metadata" style="max-width:100%"></video>`
            : match[1].toLowerCase() === 'iframe'
              ? `<iframe src="${url}" title="原文交互示例" loading="lazy" sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer" style="width:100%;height:420px;border:0"></iframe>`
              : `<img src="${url}" alt="原文配图" loading="lazy">`
        node.type = 'paragraph'
        node.value = undefined
        node.children = [{ type: 'text', value: `FRONTENDDOCMEDIA${media.length}END` }]
        media.push(safeHtml)
      }
    }
    node.children?.forEach(transformNode)
  }
  /** GFM 解析与默认 HTML 净化后的文章内容。 */
  const rendered = await remark()
    .use(remarkGfm)
    .use(() => (tree) => transformNode(tree as DocNode))
    .use(html)
    .process(markdown)
  /** 将已净化且仅含固定标签的媒体放回对应位置。 */
  const content = String(rendered)
    .replaceAll(`id="user-content-${DOC_HEADING_PREFIX}`, `id="${DOC_HEADING_PREFIX}`)
    .replace(/<p>FRONTENDDOCMEDIA(\d+)END<\/p>/g, (_, index: string) => media[Number(index)] || '')
  return { ...doc, content }
}
