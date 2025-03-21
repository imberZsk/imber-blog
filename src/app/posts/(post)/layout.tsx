import type { Metadata } from 'next'
import './mdx.css'
import { TableOfContents } from '@/components/TableOfContents'
import { MDXContent } from '@/components/MDXContent'
import { postsConfig } from '../../../../config'

interface PageParams {
  slug?: string
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  // 从 URL 路径中获取当前文章的 slug
  const slug = params.slug || ''

  // 在 postsConfig 中查找对应的文章
  const post = postsConfig.find((post) => {
    const postSlug = post.href.split('/').pop()
    return postSlug === slug
  })

  if (!post) {
    return {
      title: 'Blog Post',
      description: 'A blog post'
    }
  }

  return {
    title: `${post.title} | Imber's Blog`,
    description: post.title,
    openGraph: {
      title: post.title,
      description: post.title,
      type: 'article',
      authors: ['Imber'],
      publishedTime: post.date
    }
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="relative mx-auto max-w-7xl">
      <TableOfContents />
      <MDXContent>{children}</MDXContent>
    </div>
  )
}
