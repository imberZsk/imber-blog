'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText, Search } from 'lucide-react'
import type { KnowledgeArticle, KnowledgeArticleKind } from '@/lib/knowledge'

/** 知识库列表每次展示或追加的文章数量。 */
const ARTICLE_PAGE_SIZE = 80

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
            <button
              key={topic}
              type="button"
              onClick={() => {
                setActiveTopic(topic)
                setVisibleCount(ARTICLE_PAGE_SIZE)
              }}
              className={`shrink-0 border-l-2 px-3 py-2 text-left text-sm transition-colors ${
                activeTopic === topic
                  ? 'border-zinc-900 bg-zinc-100 font-medium text-zinc-950 dark:border-zinc-100 dark:bg-zinc-900 dark:text-white'
                  : 'border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-950 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </aside>

      <section className="min-w-0">
        <div className="mb-5 flex items-center gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题或路径"
            aria-label="搜索知识文章"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
          <span className="shrink-0 text-xs text-zinc-500">{filteredArticles.length} 篇</span>
        </div>

        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {visibleArticles.map((article) => (
            <Link
              key={article.path}
              href={article.href}
              className="group flex gap-3 py-4 transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-900/60"
            >
              <FileText className="mt-1 h-4 w-4 shrink-0 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-medium text-zinc-900 group-hover:underline dark:text-zinc-100">
                    {article.title}
                  </h2>
                  <span className="border border-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    {ARTICLE_KIND_LABELS[article.kind]}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-zinc-500">{article.displayPath}</p>
              </div>
            </Link>
          ))}
        </div>

        {filteredArticles.length === 0 && <p className="py-16 text-center text-sm text-zinc-500">没有找到匹配的文章</p>}

        {visibleArticles.length < filteredArticles.length && (
          <div className="pt-6 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((currentCount) => currentCount + ARTICLE_PAGE_SIZE)}
              className="border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition-colors hover:border-zinc-500 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white"
            >
              加载更多
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
