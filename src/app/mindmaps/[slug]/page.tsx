import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMindmap, getMindmaps } from '@/lib/mindmaps'
import { MindmapViewer } from './mindmap-viewer'

/** 思维导图详情页的异步路由参数。 */
interface MindmapPageProps {
  params: Promise<{ slug: string }>
}

/**
 * 为思维导图生成独立页面标题。
 * @param props 当前导图的路由参数。
 */
export async function generateMetadata({ params }: MindmapPageProps): Promise<Metadata> {
  /** 当前 URL 中的思维导图标识。 */
  const { slug } = await params
  /** 与标识匹配的思维导图。 */
  const mindmap = await getMindmap(slug)

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
export default async function MindmapPage({ params }: MindmapPageProps) {
  /** 当前 URL 中的思维导图标识。 */
  const { slug } = await params
  /** 已读取的思维导图及原始 Markdown。 */
  const mindmap = await getMindmap(slug)

  if (!mindmap) {
    notFound()
  }

  return <MindmapViewer markdown={mindmap.markdown} title={mindmap.title} />
}
