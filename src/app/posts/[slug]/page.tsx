import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPost, getPosts } from '@/lib/posts'
import '@/components/tiptap-templates/simple/simple-editor.scss'

/** 文集详情页的异步路由参数。 */
interface PostPageProps {
  params: Promise<{ slug: string }>
}

/**
 * 为原创文集文章生成页面标题。
 * @param props 当前文章的路由参数。
 */
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  /** 当前 URL 中的文章标识。 */
  const { slug } = await params
  /** 与文章标识匹配的原创文章。 */
  const post = await getPost(slug)

  return {
    title: post?.title || '文章未找到'
  }
}

/** 为构建阶段返回全部原创文章路径。 */
export function generateStaticParams(): Array<{ slug: string }> {
  return getPosts().map((post) => ({ slug: post.slug }))
}

/** 禁止访问未同步到文集目录的动态文章路径。 */
export const dynamicParams = false

/**
 * 渲染一篇原创文集文章。
 * @param props 当前文章的路由参数。
 */
export default async function PostPage({ params }: PostPageProps) {
  /** 当前 URL 中的文章标识。 */
  const { slug } = await params
  /** 已解析并渲染的原创文章。 */
  const post = await getPost(slug)

  if (!post) {
    notFound()
  }

  return (
    <main className="simple-editor-wrapper">
      <div className="simple-editor-content">
        <article
          className="tiptap ProseMirror simple-editor knowledge-article"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>
    </main>
  )
}
