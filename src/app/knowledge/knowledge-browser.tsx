'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import type { KnowledgeArticle, KnowledgeArticleKind } from '@/lib/knowledge'
import { Button, Input } from '@/components/ui'

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
  topics: string[]
}

/**
 * 提供知识文章的主题筛选、搜索和列表导航。
 * @param props 全部文章元数据和一级主题列表。
 */
export function KnowledgeBrowser({ articles, topics }: KnowledgeBrowserProps) {
  /** 用户当前输入的搜索关键词。 */
  const [query, setQuery] = useState('')
  /** 用户当前选中的一级主题。 */
  const [activeTopic, setActiveTopic] = useState('全部')
  /** 当前允许展示的最大文章数量。 */
  const [visibleCount, setVisibleCount] = useState(ARTICLE_PAGE_SIZE)
  /** 经过主题和关键词过滤后的文章列表。 */
  const filteredArticles = useMemo(() => {
    /** 便于进行不区分大小写匹配的关键词。 */
    const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN')

    return articles.filter((article) => {
      /** 当前文章是否属于所选主题。 */
      const matchesTopic = activeTopic === '全部' || article.topic === activeTopic
      /** 当前文章的标题或路径是否命中关键词。 */
      const matchesQuery =
        normalizedQuery.length === 0 ||
        article.title.toLocaleLowerCase('zh-CN').includes(normalizedQuery) ||
        article.displayPath.toLocaleLowerCase('zh-CN').includes(normalizedQuery)

      return matchesTopic && matchesQuery
    })
  }, [activeTopic, articles, query])
  /** 当前已进入页面 DOM 的文章列表。 */
  const visibleArticles = filteredArticles.slice(0, visibleCount)

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="flex max-w-full gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {['全部', ...topics].map((topic) => (
            <Button
              key={topic}
              type="button"
              variant="ghost"
              onClick={() => {
                setActiveTopic(topic)
                setVisibleCount(ARTICLE_PAGE_SIZE)
              }}
              className={`h-auto shrink-0 justify-start rounded-none border-l-2 px-3 py-2 text-left text-sm transition-colors ${
                activeTopic === topic
                  ? 'border-mint bg-accent text-mint font-medium'
                  : 'text-muted-foreground hover:border-border hover:text-foreground border-transparent'
              }`}
            >
              {topic}
            </Button>
          ))}
        </div>
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
