import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getKnowledgeArticle, getKnowledgeArticles } from '@/lib/knowledge'
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
  return getKnowledgeArticles().map((article) => ({ slug: article.slug }))
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

  return (
    <main className="simple-editor-wrapper">
      <div className="simple-editor-content">
        <article className="tiptap ProseMirror simple-editor knowledge-article">
          <nav className="mb-8 border-b border-zinc-200 pb-5 dark:border-zinc-800" aria-label="知识文章路径">
            <Link
              href="/knowledge"
              className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              返回知识库
            </Link>
            <p className="mt-4 text-xs break-all text-zinc-500">{article.displayPath}</p>
          </nav>

          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </article>
      </div>
    </main>
  )
}
