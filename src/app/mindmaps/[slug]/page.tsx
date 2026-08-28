import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMindmap, getMindmaps } from '@/lib/mindmaps'
import { parseKnowledgeLanguage } from '@/lib/knowledge-language'
import { MindmapViewer } from './mindmap-viewer'

/** 思维导图详情页的异步路由参数。 */
interface MindmapPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string | string[] }>
}

/**
 * 为思维导图生成独立页面标题。
 * @param props 当前导图的路由参数。
 */
export async function generateMetadata({ params }: MindmapPageProps): Promise<Metadata> {
  /** 当前 URL 中的思维导图标识。 */
  const { slug } = await params
  /** 与标识匹配的思维导图。 */
  const mindmap = await getMindmap(slug, 'typescript')

  return {
    title: mindmap?.title || '思维导图未找到',
    description: mindmap?.description
  }
}

/** 为构建阶段返回三张思维导图路径。 */
export function generateStaticParams(): Array<{ slug: string }> {
  return getMindmaps().map((mindmap) => ({ slug: mindmap.slug }))
}

/** 禁止访问未同步到仓库的动态思维导图。 */
export const dynamicParams = false

/**
 * 渲染一张交互式 Markdown 思维导图。
 * @param props 当前导图的路由参数。
 */
export default async function MindmapPage({ params, searchParams }: MindmapPageProps) {
  /** 当前 URL 中的思维导图标识。 */
  const { slug } = await params
  /** 当前请求显式选择的代码语言；重复参数只采用第一个值。 */
  const { lang } = await searchParams
  /** 服务端首屏和客户端状态共用的规范语言值。 */
  const initialLanguage = parseKnowledgeLanguage(Array.isArray(lang) ? lang[0] : lang)
  /** 可在详情页直接切换的全部思维导图。 */
  const mindmaps = getMindmaps('typescript')
  /** 已读取的 TypeScript 与 Python 思维导图 Markdown。 */
  const [mindmap, pythonMindmap] = await Promise.all([getMindmap(slug, 'typescript'), getMindmap(slug, 'python')])

  if (!mindmap || !pythonMindmap) {
    notFound()
  }

  return (
    <MindmapViewer
      currentSlug={mindmap.slug}
      markdownByLanguage={{ typescript: mindmap.markdown, python: pythonMindmap.markdown }}
      mindmaps={mindmaps}
      title={mindmap.title}
      initialLanguage={initialLanguage}
    />
  )
}
