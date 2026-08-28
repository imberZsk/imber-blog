'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Code2 } from 'lucide-react'
import { InteractiveMindmap } from '@/components/interactive-mindmap'
import { KnowledgeLanguageSwitch } from '@/components/knowledge-language-switch'
import type { KnowledgeLanguage } from '@/lib/knowledge-language'
import type { KnowledgeMindmapData } from '@/lib/knowledge-mindmap'
import type { KnowledgeQuizQuestion } from '@/lib/knowledge-quiz'
import type { KnowledgeSandbox } from '@/lib/knowledge-sandbox'
import type { KnowledgeArticleLink } from '@/lib/knowledge'
import { KnowledgeArticleContent } from './knowledge-article-content'
import { KnowledgeQuiz } from './knowledge-quiz'

/** 单个语言版本在浏览器中渲染所需的文章数据。 */
export interface KnowledgeLanguageArticleVariant {
  /** 资料章节经过服务端解析后的 HTML。 */
  referenceContent: string
  /** 正文章节经过服务端解析后的 HTML。 */
  content: string
  /** 从当前语言正文生成的文章内思维导图。 */
  mindmap: KnowledgeMindmapData | null
  /** 当前语言正文中允许执行的沙盒。 */
  sandboxes: KnowledgeSandbox[]
  /** 从当前语言正文生成的自测题。 */
  quiz: KnowledgeQuizQuestion[]
}

/** 文章语言视图接收的两套派生内容与导航信息。 */
interface KnowledgeLanguageViewProps {
  /** 文章标题，用于文章内思维导图的无障碍名称。 */
  title: string
  /** 当前路由对应的单一语言文章数据。 */
  article: KnowledgeLanguageArticleVariant
  /** 同模块中的上一篇文章。 */
  previousArticle: KnowledgeArticleLink | null
  /** 同模块中的下一篇文章。 */
  nextArticle: KnowledgeArticleLink | null
  /** 当前独立文章树使用的代码语言。 */
  language: KnowledgeLanguage
  /** 另一语言中与当前文章一一对应的独立路由。 */
  alternateLanguageHref: string
}

/**
 * 渲染可原子切换的正文、沙盒、提问和文章思维导图。
 * @param props 两种语言文章版本及相邻文章导航。
 */
export function KnowledgeLanguageView({
  title,
  article,
  previousArticle,
  nextArticle,
  language,
  alternateLanguageHref
}: KnowledgeLanguageViewProps) {
  /** 在两套独立文章路由之间执行客户端导航。 */
  const router = useRouter()

  /**
   * 切换文章及其所有派生区域使用的代码语言。
   * @param nextLanguage 用户选择的新语言。
   */
  const handleLanguageChange = (nextLanguage: KnowledgeLanguage): void => {
    if (nextLanguage !== language) {
      router.push(alternateLanguageHref)
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-zinc-200 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <Code2 className="h-4 w-4" aria-hidden="true" />
          代码语言
        </div>
        <KnowledgeLanguageSwitch language={language} onLanguageChange={handleLanguageChange} />
      </div>

      <div>
        {article.mindmap && (
          <InteractiveMindmap
            markdown={article.mindmap.markdown}
            title={title}
            variant="article"
            nodeCount={article.mindmap.nodeCount}
          />
        )}
        {article.referenceContent && <KnowledgeArticleContent content={article.referenceContent} sandboxes={[]} />}
        <KnowledgeArticleContent content={article.content} sandboxes={article.sandboxes} />
        <KnowledgeQuiz questions={article.quiz} />
      </div>

      <nav className="knowledge-article-navigation" aria-label="上一篇和下一篇">
        {previousArticle ? (
          <Link href={previousArticle.href} className="knowledge-article-navigation-link">
            <span className="knowledge-article-navigation-label">
              <ArrowLeft aria-hidden="true" />
              上一篇
            </span>
            <span className="knowledge-article-navigation-title">{previousArticle.title}</span>
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}

        {nextArticle ? (
          <Link
            href={nextArticle.href}
            className="knowledge-article-navigation-link knowledge-article-navigation-link-next"
          >
            <span className="knowledge-article-navigation-label">
              下一篇
              <ArrowRight aria-hidden="true" />
            </span>
            <span className="knowledge-article-navigation-title">{nextArticle.title}</span>
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
      </nav>
    </>
  )
}
