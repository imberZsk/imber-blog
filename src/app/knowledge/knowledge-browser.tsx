'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Network, Search } from 'lucide-react'
import type { KnowledgeArticle, KnowledgeArticleKind } from '@/lib/knowledge'
import { Button, Input } from '@/components/ui'
import { KNOWLEDGE_TRACKS, type KnowledgeTrackSlug } from './config'

/** 知识库列表每次展示或追加的文章数量。 */
const ARTICLE_PAGE_SIZE = 80

/** 匹配文章标题中不再需要重复展示的数字或中文顺序前缀。 */
const ARTICLE_TITLE_ORDER_PATTERN = /^(?:\d{1,3}|[一二三四五六七八九十]+)[\s、.．·-]+/

/** 文章用途对应的初学者友好名称。 */
const ARTICLE_KIND_LABELS: Record<KnowledgeArticleKind, string> = {
  guide: '学习指南',
  lesson: '主课',
  practice: '实践',
  reference: '扩展'
}

/** 知识库列表页的可交互参数。 */
interface KnowledgeBrowserProps {
  articles: KnowledgeArticle[]
  activeTrack: KnowledgeTrackSlug
}

/**
 * 提供知识文章的主题筛选、搜索和列表导航。
 * @param props 全部文章元数据和当前 URL 选中的学习主线。
 */
export function KnowledgeBrowser({ articles, activeTrack }: KnowledgeBrowserProps) {
  /** 用户当前输入的搜索关键词。 */
  const [query, setQuery] = useState('')
  /** 当前允许展示的最大文章数量。 */
  const [visibleCount, setVisibleCount] = useState(ARTICLE_PAGE_SIZE)
  /** 当前主线对应的标签和思维导图链接。 */
  const activeTrackConfig = KNOWLEDGE_TRACKS.find((track) => track.slug === activeTrack) || KNOWLEDGE_TRACKS[0]
  /** 经过主题和关键词过滤后的文章列表。 */
  const filteredArticles = useMemo(() => {
    /** 便于进行不区分大小写匹配的关键词。 */
    const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN')

    return articles.filter((article) => {
      /** 总览文章在每条主线中可见，其余文章按主线归类。 */
      const matchesTrack = article.track === null || article.track === activeTrack
      /** 当前文章的标题或路径是否命中关键词。 */
      const matchesQuery =
        normalizedQuery.length === 0 ||
        article.title.toLocaleLowerCase('zh-CN').includes(normalizedQuery) ||
        article.displayPath.toLocaleLowerCase('zh-CN').includes(normalizedQuery)

      return matchesTrack && matchesQuery
    })
  }, [activeTrack, articles, query])
  /** 当前已进入页面 DOM 的文章列表。 */
  const visibleArticles = filteredArticles.slice(0, visibleCount)

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <nav
          className="flex max-w-full gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible"
          aria-label="知识主线"
        >
          {KNOWLEDGE_TRACKS.map((track, index) => {
            /** 当前导航项是否与 URL 中选中的主线一致。 */
            const isActive = track.slug === activeTrack
            /** 当前主线包含的公开文章数量。 */
            const articleCount = articles.filter(
              (article) => article.track === null || article.track === track.slug
            ).length

            return (
              <Link
                key={track.slug}
                href={`/knowledge?track=${track.slug}`}
                aria-current={isActive ? 'page' : undefined}
                className={`group grid min-w-[220px] shrink-0 grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2 border-l-2 px-3 py-3 transition-colors lg:min-w-0 ${
                  isActive
                    ? 'border-mint bg-accent text-foreground'
                    : 'text-muted-foreground hover:border-border hover:bg-accent/50 hover:text-foreground border-transparent'
                }`}
              >
                <span className="text-mint font-mono text-xs font-semibold">{String(index + 1).padStart(2, '0')}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{track.label}</span>
                  <span className="mt-1 block text-xs leading-5">{track.description}</span>
                </span>
                <span className="text-mint font-mono text-[11px]">{articleCount}</span>
              </Link>
            )
          })}
        </nav>

        <Link
          href={activeTrackConfig.mindmapHref}
          className="text-muted-foreground hover:text-mint mt-3 flex items-center gap-2 px-3 text-xs transition-colors"
        >
          <Network className="h-3.5 w-3.5" aria-hidden="true" />
          查看对应思维导图
          <ArrowUpRight className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </aside>

      <section className="min-w-0">
        <div className="mb-5 flex items-center gap-3">
          <Search className="text-mint h-4 w-4 shrink-0" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题或路径"
            aria-label="搜索知识文章"
            className="min-w-0 flex-1"
          />
          <span className="text-mint shrink-0 font-mono text-xs">{filteredArticles.length} 篇</span>
        </div>

        <div className="divide-border divide-y">
          {visibleArticles.map((article, index) => {
            /** 当前筛选结果中从 01 开始的统一展示顺序。 */
            const displayOrder = String(index + 1).padStart(2, '0')
            /** 去掉来源标题中不统一的顺序前缀后的列表标题。 */
            const displayTitle = article.title.replace(ARTICLE_TITLE_ORDER_PATTERN, '')

            return (
              <Link
                key={article.path}
                href={article.href}
                className="hover:bg-accent/50 group flex gap-4 px-3 py-4 transition-colors"
              >
                <span className="text-mint mt-0.5 w-7 shrink-0 font-mono text-xs font-semibold">{displayOrder}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-foreground text-sm font-medium group-hover:underline">{displayTitle}</h2>
                    <span className="border-mint/40 text-mint border px-1.5 py-0.5 font-mono text-[11px]">
                      {ARTICLE_KIND_LABELS[article.kind]}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 truncate text-xs">{article.displayPath}</p>
                </div>
              </Link>
            )
          })}
        </div>

        {filteredArticles.length === 0 && (
          <p className="text-muted-foreground py-16 text-center text-sm">没有找到匹配的文章</p>
        )}

        {visibleArticles.length < filteredArticles.length && (
          <div className="pt-6 text-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setVisibleCount((currentCount) => currentCount + ARTICLE_PAGE_SIZE)}
            >
              加载更多
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
