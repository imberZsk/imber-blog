import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isKnowledgeTrackSlug, KNOWLEDGE_TRACKS } from '../../config'
import { KnowledgePageView } from '../../knowledge-page-view'

/** 学习路线静态页面接收的路径参数。 */
interface KnowledgeTrackPageProps {
  /** 当前 URL 中的学习路线。 */
  params: Promise<{ track: string }>
}

/** 学习路线页面的搜索引擎元数据。 */
export const metadata: Metadata = {
  title: '知识库',
  description: '沿着全栈开发、AI 编程和 AI 大模型应用开发三条路线浏览学习笔记。'
}

/** 为构建阶段返回三条固定学习路线。 */
export function generateStaticParams(): Array<{ track: string }> {
  return KNOWLEDGE_TRACKS.map((knowledgeTrack) => ({ track: knowledgeTrack.slug }))
}

/** 禁止访问配置之外的学习路线。 */
export const dynamicParams = false

/**
 * 渲染指定学习路线的静态知识索引。
 * @param props 当前 URL 携带的路线参数。
 */
export default async function KnowledgeTrackPage({ params }: KnowledgeTrackPageProps) {
  /** 当前 URL 中请求的学习路线。 */
  const { track } = await params

  if (!isKnowledgeTrackSlug(track)) {
    notFound()
  }

  return <KnowledgePageView activeTrack={track} />
}
