import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
  getKnowledgeArticle,
  getKnowledgeArticleAliasPaths,
  getKnowledgeArticles,
  getMergedDemoAliasPath
} from '@/lib/knowledge'
import { KnowledgeLanguageView, type KnowledgeLanguageArticleVariant } from '../knowledge-language-view'
import { KNOWLEDGE_RETURN_LINK_CLASS_NAME, KnowledgeReturnLink } from '../knowledge-return-link'
import { TableOfContents } from '@/components/table-of-contents'
import {
  DEFAULT_KNOWLEDGE_LANGUAGE,
  getKnowledgeLanguageFromPath,
  replaceKnowledgeLanguageInPath
} from '@/lib/knowledge-language'
import '@/components/tiptap-templates/simple/simple-editor.scss'
import '@/components/table-of-contents.scss'

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
  /** 当前 URL 解码后声明的独立文章语言。 */
  const articlePath = slug.map((pathSegment) => decodeURIComponent(pathSegment)).join('/')
  /** 元数据必须读取当前物理文章，避免 Python 页面复用 TypeScript 投影。 */
  const articleLanguage = getKnowledgeLanguageFromPath(articlePath) || DEFAULT_KNOWLEDGE_LANGUAGE
  /** 与文章路径匹配的知识文章。 */
  const article = await getKnowledgeArticle(slug, articleLanguage)

  return {
    title: article?.title || '文章未找到',
    description: article ? `${article.topic}知识笔记：${article.title}` : undefined
  }
}

/** 为构建阶段返回全部知识文章路径。 */
export function generateStaticParams(): Array<{ slug: string[] }> {
  return getKnowledgeArticles().flatMap((article) => {
    /** 当前规范文章需要继续响应的全部历史路径。 */
    const aliasArticlePaths = getKnowledgeArticleAliasPaths(article.path)
    /** 已吸收进正文的 Demo 需要继续响应的旧页面路径。 */
    const mergedDemoAliasPath = getMergedDemoAliasPath(article.sourcePath)
    /** 构建阶段生成规范路径和所有不重复的历史别名。 */
    const staticArticlePaths = new Set([
      article.path,
      ...aliasArticlePaths,
      ...(mergedDemoAliasPath ? [mergedDemoAliasPath] : [])
    ])
    return [...staticArticlePaths].map((articlePath) => ({ slug: articlePath.split('/') }))
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
  /** 当前请求中的新版或旧版文章路径。 */
  const requestedArticlePath = slug.map((pathSegment) => decodeURIComponent(pathSegment)).join('/')
  /** 当前独立文章路径声明的语言。 */
  const articleLanguage = getKnowledgeLanguageFromPath(requestedArticlePath) || DEFAULT_KNOWLEDGE_LANGUAGE
  /** 只读取当前路由对应的单一语言文章。 */
  const article = await getKnowledgeArticle(slug, articleLanguage)

  if (!article) {
    notFound()
  }

  // 修复规范路径自跳转：生产环境路由参数保留 URL 编码，必须解码后再与中文文章路径比较。
  if (requestedArticlePath !== article.path) {
    redirect(article.href)
  }

  /** 当前语言文章交给客户端渲染的完整派生数据。 */
  const articleVariant: KnowledgeLanguageArticleVariant = {
    referenceContent: article.referenceContent,
    content: article.content,
    mindmap: article.mindmap,
    sandboxes: article.sandboxes,
    quiz: article.quiz
  }
  /** 另一套语言文章中与当前课号对应的规范路径。 */
  const alternateLanguage = articleLanguage === 'typescript' ? 'python' : 'typescript'
  /** 语言切换按钮导航到的另一套独立文章 URL。 */
  const alternateLanguageHref = `/knowledge/${replaceKnowledgeLanguageInPath(article.path, alternateLanguage)
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`

  return (
    <main className="simple-editor-wrapper">
      <TableOfContents key={article.path} />
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

          <KnowledgeLanguageView
            title={article.title}
            article={articleVariant}
            previousArticle={article.previousArticle}
            nextArticle={article.nextArticle}
            language={articleLanguage}
            alternateLanguageHref={alternateLanguageHref}
          />
        </article>
      </div>
    </main>
  )
}
