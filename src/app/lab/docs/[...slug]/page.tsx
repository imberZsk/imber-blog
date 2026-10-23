import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getFrontendDoc, getFrontendDocs } from '@/lib/frontend-docs'
import { TableOfContents } from '@/components/table-of-contents'
import '@/components/table-of-contents.scss'

/** 读取原文 slug 对应的技术笔记，保留所属分类与相邻文档导航。 */
export default async function FrontendDocPage({ params }: { params: Promise<{ slug: string[] }> }) {
  /** 当前文章的原目录路径。 */
  const { slug } = await params
  /** 经安全路径匹配与资源重定位后的文档。 */
  const doc = await getFrontendDoc(slug.join('/'))
  if (!doc) notFound()
  /** 与当前文章属于同一分类的文档。 */
  const relatedDocs = getFrontendDocs().filter((item) => item.category === doc.category)

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="min-w-0">
        <Link href="/lab/docs" className="text-mint text-sm">
          ← 全部技术文档
        </Link>
        <details className="mt-5" open>
          <summary className="mb-3 cursor-pointer text-sm font-semibold">
            {doc.category} · {relatedDocs.length} 篇
          </summary>
          <nav
            aria-label="同分类文档"
            className="max-h-72 space-y-1 overflow-y-auto lg:sticky lg:top-32 lg:max-h-[70svh]"
          >
            {relatedDocs.map((item) => (
              <Link
                key={item.slug}
                href={item.href}
                aria-current={item.slug === doc.slug ? 'page' : undefined}
                className="text-muted-foreground hover:text-mint aria-[current=page]:text-mint block py-1 text-sm"
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </details>
      </aside>
      <article className="min-w-0">
        <header className="border-border mb-8 border-b pb-5">
          <p className="text-mint mb-2 text-xs">{doc.category}</p>
          <h1 className="text-3xl font-semibold">{doc.title}</h1>
        </header>
        <details className="border-border mb-6 rounded-lg border p-4">
          <summary className="cursor-pointer text-sm font-semibold">本篇目录</summary>
          <TableOfContents key={doc.slug} className="lab-docs-toc" />
        </details>
        <div className="knowledge-article" dangerouslySetInnerHTML={{ __html: doc.content }} />
        {!doc.content.trim() ? <p className="text-muted-foreground">原项目中的这篇笔记尚未填写正文。</p> : null}
      </article>
    </main>
  )
}
