import type { Metadata } from 'next'
import { PADDING_TOP } from '@/app/const'
import { cn } from '@/lib/utils'
import { getKnowledgeArticles } from '@/lib/knowledge'
import { KnowledgeBrowser } from './knowledge-browser'
import { DEFAULT_KNOWLEDGE_TRACK, isKnowledgeTrackSlug, KNOWLEDGE_TRACKS } from './config'

/** 知识库列表页的搜索引擎元数据。 */
export const metadata: Metadata = {
  title: '知识库',
  description: '沿着全栈开发、AI 编程和 AI 大模型应用开发三条路线浏览学习笔记。'
}

/** 知识库页面支持的查询参数。 */
interface KnowledgePageProps {
  searchParams: Promise<{
    track?: string | string[]
    module?: string | string[]
    focus?: string | string[]
  }>
}

/** 渲染知识库的主题筛选和文章索引。 */
export default async function KnowledgePage({ searchParams }: KnowledgePageProps) {
  /** 当前请求携带的知识主线、模块与返回定位参数。 */
  const { track, module, focus } = await searchParams
  /** 只取单个可用于导航的知识主线值。 */
  const requestedTrack = Array.isArray(track) ? track[0] : track
  /** 无效或缺失参数统一回退到第一条学习主线。 */
  const activeTrack = isKnowledgeTrackSlug(requestedTrack) ? requestedTrack : DEFAULT_KNOWLEDGE_TRACK
  /** 从同步内容中生成的全部知识文章元数据。 */
  const articles = getKnowledgeArticles()
  /** 只取单个可用于模块导航的查询参数。 */
  const requestedModule = Array.isArray(module) ? module[0] : module
  /** 仅允许选择当前主线中真实存在的模块，失效链接统一回退到全部模块。 */
  const activeModule =
    requestedModule &&
    articles.some(
      (article) => (article.track === null || article.track === activeTrack) && article.topic === requestedModule
    )
      ? requestedModule
      : null
  /** 只取单个需要恢复位置的文章路径。 */
  const requestedFocus = Array.isArray(focus) ? focus[0] : focus
  /** 仅接受当前筛选范围内真实存在的文章路径作为返回定位目标。 */
  const focusedArticlePath =
    requestedFocus &&
    articles.some(
      (article) =>
        article.path === requestedFocus &&
        (article.track === null || article.track === activeTrack) &&
        (activeModule === null || article.topic === activeModule)
    )
      ? requestedFocus
      : null
  /** 当前主线的展示信息，用于说明知识库与思维导图的对应关系。 */
  const activeTrackConfig = KNOWLEDGE_TRACKS.find((knowledgeTrack) => knowledgeTrack.slug === activeTrack)

  return (
    <main className={cn('mx-auto max-w-6xl px-4 pb-16', PADDING_TOP)}>
      <header className="border-border mb-8 border-b pb-6">
        <p className="text-mint mb-3 font-mono text-xs font-semibold">LEARNING LIBRARY / 03</p>
        <h1 className="text-foreground text-2xl font-semibold">知识库</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {articles.length} 篇公开学习内容，沿三条学习路线和对应模块整理；当前为
          {activeTrackConfig?.label || '全栈开发'} / {activeModule || '全部模块'}。
        </p>
      </header>
      <KnowledgeBrowser
        key={`${activeTrack}:${activeModule || 'all'}:${focusedArticlePath || 'top'}`}
        articles={articles}
        activeTrack={activeTrack}
        activeModule={activeModule}
        focusedArticlePath={focusedArticlePath}
      />
    </main>
  )
}
