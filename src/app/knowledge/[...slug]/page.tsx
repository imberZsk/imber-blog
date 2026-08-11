import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getKnowledgeArticle, getKnowledgeArticles, getLegacyKnowledgeArticlePath } from '@/lib/knowledge'
import { KnowledgeArticleContent } from '../knowledge-article-content'
import { KnowledgeQuiz } from '../knowledge-quiz'
import { KNOWLEDGE_RETURN_LINK_CLASS_NAME, KnowledgeReturnLink } from '../knowledge-return-link'
import '@/components/tiptap-templates/simple/simple-editor.scss'

/** 知识文章路由接收的异步参数。 */
interface KnowledgeArticlePageProps {
  params: Promise<{ slug: string[] }>
}

/**
 * 为知识文章生成独立页面标题。
 * @param props 当前文章的路由参数。
 */
export async function generateMetadata({ params }: KnowledgeArticlePageProps): Promise<Metadata> {
  /** 当前 URL 中的文章路径。 */
  const { slug } = await params
  /** 与文章路径匹配的知识文章。 */
  const article = await getKnowledgeArticle(slug)

  return {
    title: article?.title || '文章未找到',
    description: article ? `${article.topic}知识笔记：${article.title}` : undefined
  }
}

/** 为构建阶段返回全部知识文章路径。 */
export function generateStaticParams(): Array<{ slug: string[] }> {
  return getKnowledgeArticles().flatMap((article) => {
    /** 当前规范文章路径对应的旧版公开路径。 */
    const legacyArticlePath = getLegacyKnowledgeArticlePath(article.path)
    /** 构建阶段需要生成的规范路径。 */
    const articleParams = [{ slug: article.slug }]

    if (legacyArticlePath) {
      articleParams.push({ slug: legacyArticlePath.split('/') })
    }

    return articleParams
  })
}

/** 禁止访问未同步到仓库的动态文章路径。 */
export const dynamicParams = false

/**
 * 渲染单篇知识文章及返回索引的导航。
 * @param props 当前文章的路由参数。
 */
export default async function KnowledgeArticlePage({ params }: KnowledgeArticlePageProps) {
  /** 当前 URL 中的文章路径。 */
  const { slug } = await params
  /** 已解析并完成链接改写的知识文章。 */
  const article = await getKnowledgeArticle(slug)

  if (!article) {
    notFound()
  }

  /** 当前请求中的新版或旧版文章路径。 */
  const requestedArticlePath = slug.map((pathSegment) => decodeURIComponent(pathSegment)).join('/')
  // 修复规范路径自跳转：生产环境路由参数保留 URL 编码，必须解码后再与中文文章路径比较。
  if (requestedArticlePath !== article.path) {
    redirect(article.href)
  }

  return (
    <main className="simple-editor-wrapper">
      <div className="simple-editor-content">
        <article className="tiptap ProseMirror simple-editor knowledge-article">
          <nav className="mb-8 border-b border-zinc-200 pb-5 dark:border-zinc-800" aria-label="知识文章路径">
            <Suspense
              fallback={
                <span className={KNOWLEDGE_RETURN_LINK_CLASS_NAME}>
                  <ArrowLeft className="h-4 w-4" />
                  返回知识库
                </span>
              }
            >
              <KnowledgeReturnLink
                articlePath={article.path}
                articleTrack={article.track}
                articleTopic={article.topic}
              />
            </Suspense>
            <p className="mt-4 text-xs break-all text-zinc-500">{article.displayPath}</p>
          </nav>

          <KnowledgeArticleContent content={article.content} />
          <KnowledgeQuiz questions={article.quiz} />

          <nav className="knowledge-article-navigation" aria-label="上一篇和下一篇">
            {article.previousArticle ? (
              <Link href={article.previousArticle.href} className="knowledge-article-navigation-link">
                <span className="knowledge-article-navigation-label">
                  <ArrowLeft aria-hidden="true" />
                  上一篇
                </span>
                <span className="knowledge-article-navigation-title">{article.previousArticle.title}</span>
              </Link>
            ) : (
              <span aria-hidden="true" />
            )}

            {article.nextArticle ? (
              <Link
                href={article.nextArticle.href}
                className="knowledge-article-navigation-link knowledge-article-navigation-link-next"
              >
                <span className="knowledge-article-navigation-label">
                  下一篇
                  <ArrowRight aria-hidden="true" />
                </span>
                <span className="knowledge-article-navigation-title">{article.nextArticle.title}</span>
              </Link>
            ) : (
              <span aria-hidden="true" />
            )}
          </nav>
        </article>
      </div>
    </main>
  )
}
