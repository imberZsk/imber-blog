import { PADDING_TOP } from '@/app/const'
import { cn } from '@/lib/utils'
import { getKnowledgeArticles, type KnowledgeListArticle } from '@/lib/knowledge'
import { KnowledgeBrowser } from './knowledge-browser'
import { KNOWLEDGE_TRACKS, type KnowledgeTrackSlug } from './config'

/** 各学习路线对应的文章数量。 */
export type KnowledgeTrackArticleCounts = Record<KnowledgeTrackSlug, number>

/** 静态知识库视图所需的当前学习路线。 */
interface KnowledgePageViewProps {
  /** 构建阶段需要生成索引的学习路线。 */
  activeTrack: KnowledgeTrackSlug
}

/**
 * 构建一条学习路线的静态知识索引页面。
 * @param props 当前需要生成的学习路线。
 */
export function KnowledgePageView({ activeTrack }: KnowledgePageViewProps) {
  /** 构建阶段从 Markdown 目录生成的全部文章元数据。 */
  const allArticles = getKnowledgeArticles()
  /** 各学习路线包含公共内容后的文章数量。 */
  const trackArticleCounts = KNOWLEDGE_TRACKS.reduce<KnowledgeTrackArticleCounts>(
    (articleCounts, knowledgeTrack) => {
      articleCounts[knowledgeTrack.slug] = allArticles.filter(
        (article) => article.track === null || article.track === knowledgeTrack.slug
      ).length
      return articleCounts
    },
    { 'full-stack': 0, 'ai-coding': 0, 'ai-apps': 0 }
  )
  /** 当前路线需要传给客户端的最小文章索引。 */
  const routeArticles: KnowledgeListArticle[] = allArticles
    .filter((article) => article.track === null || article.track === activeTrack)
    .map((article) => ({
      path: article.path,
      href: article.href,
      title: article.title,
      sequence: article.sequence,
      topic: article.topic,
      subtopic: article.subtopic,
      kind: article.kind
    }))
  /** 当前路线的展示信息。 */
  const activeTrackConfig = KNOWLEDGE_TRACKS.find((knowledgeTrack) => knowledgeTrack.slug === activeTrack)

  return (
    <main className={cn('mx-auto max-w-6xl px-4 pb-16', PADDING_TOP)}>
      <header className="border-border mb-8 border-b pb-6">
        <p className="text-mint mb-3 font-mono text-xs font-semibold">LEARNING LIBRARY / 03</p>
        <h1 className="text-foreground text-2xl font-semibold">知识库</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {allArticles.length} 篇公开学习内容，沿三条学习路线和对应模块整理；当前为
          {activeTrackConfig?.label || '全栈开发'}。
        </p>
      </header>
      <KnowledgeBrowser articles={routeArticles} activeTrack={activeTrack} trackArticleCounts={trackArticleCounts} />
    </main>
  )
}
