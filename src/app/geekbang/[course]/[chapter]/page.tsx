import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { geekbangCourses, getGeekbangChapter } from '@/lib/geekbang'
import './reader.css'

/** 当前文章页面的异步路由参数。 */
interface ChapterProps {
  params: Promise<{ course: string; chapter: string }>
}

/** 仅允许访问迁移清单中的章节，未知路径直接返回 404。 */
export const dynamicParams = false

/** 预生成全部原文页面，让正文不依赖客户端脚本。 */
export function generateStaticParams() {
  return geekbangCourses.flatMap((course) =>
    course.chapters.map((chapter) => ({
      course: course.slug, // 原知识库稳定标识。
      chapter: chapter.slug // 原始清单顺序对应的章节标识。
    }))
  )
}

/** 为每篇原文设置可区分的标题；params 包含课程和章节标识。 */
export async function generateMetadata({ params }: ChapterProps): Promise<Metadata> {
  /** 本次请求的课程与章节标识。 */
  const { course, chapter } = await params
  /** 用清单查找标题，元数据阶段不必渲染整篇文章。 */
  const collection = geekbangCourses.find((item) => item.slug === course)
  /** 清单登记的章节标题。 */
  const entry = collection?.chapters.find((item) => item.slug === chapter)
  return {
    title: entry ? `${entry.title} · ${collection?.name}` : '章节不存在', // 每篇文章的唯一标题。
    description: `${collection?.name || '极客知识库'}的原文备份，保留出处与章节顺序。` // 明确转载来源属性。
  }
}

/** 展示备份原文、系列目录和前后篇；params 为已登记路由。 */
export default async function GeekbangChapterPage({ params }: ChapterProps) {
  /** 当前文章的路由标识。 */
  const { course, chapter } = await params
  /** 经过路径白名单和 HTML 净化的正文。 */
  const article = await getGeekbangChapter(course, chapter)
  if (!article) notFound()
  /** 当前系列中的相邻章节，不跨课程跳转。 */
  const previous = article.course.chapters[article.index - 1]
  /** 当前系列中的下一篇，末篇没有下一篇入口。 */
  const next = article.course.chapters[article.index + 1]
  return (
    <main className="geekbang-reader mx-auto max-w-7xl px-5 pt-24 pb-16">
      <Link href="/geekbang" className="text-muted-foreground hover:text-mint text-sm">
        ← 全部极客知识库
      </Link>
      <div className="mt-8 grid gap-10 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <details className="border-border rounded-lg border p-4 lg:sticky lg:top-24" open>
            <summary className="cursor-pointer text-sm font-semibold">
              {article.course.name} · {article.course.chapters.length} 篇
            </summary>
            <nav aria-label="系列章节" className="mt-4 max-h-52 space-y-2 overflow-y-auto lg:max-h-[65svh]">
              {article.course.chapters.map((item) => (
                <Link
                  key={item.slug}
                  href={`/geekbang/${course}/${item.slug}`}
                  aria-current={item.slug === chapter ? 'page' : undefined}
                  className="text-muted-foreground hover:text-mint aria-[current=page]:text-mint block rounded px-1 py-1 text-sm leading-6"
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </details>
        </aside>
        <article className="max-w-3xl min-w-0">
          <header className="border-border mb-8 border-b pb-6">
            <p className="text-mint mb-3 text-sm">
              {article.course.category} / {article.course.name}
            </p>
            <h1 className="text-2xl leading-snug font-semibold sm:text-3xl">{article.chapter.title}</h1>
            <p className="text-muted-foreground mt-4 text-sm">
              原文备份 · 第 {article.index + 1} / {article.course.chapters.length} 篇 ·{' '}
              <a
                href={`https://time.geekbang.org/space/wiki/${article.course.slug}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-mint underline underline-offset-4"
              >
                查看极客时间原知识库 ↗
              </a>
            </p>
          </header>
          {article.headings.length > 0 && (
            <details className="border-border mb-8 rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-medium">本篇目录 · {article.headings.length} 节</summary>
              <nav aria-label="本篇目录" className="mt-4 space-y-2">
                {article.headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className="text-muted-foreground hover:text-mint block text-sm leading-6"
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </details>
          )}
          <div className="knowledge-article" dangerouslySetInnerHTML={{ __html: article.content }} />
          <nav aria-label="前后章节" className="border-border mt-12 grid gap-4 border-t pt-6 sm:grid-cols-2">
            {previous ? (
              <Link href={`/geekbang/${course}/${previous.slug}`} className="hover:text-mint min-w-0 text-sm leading-6">
                <span className="text-muted-foreground mb-1 block text-xs">← 上一篇</span>
                {previous.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/geekbang/${course}/${next.slug}`}
                className="hover:text-mint min-w-0 text-sm leading-6 sm:text-right"
              >
                <span className="text-muted-foreground mb-1 block text-xs">下一篇 →</span>
                {next.title}
              </Link>
            )}
          </nav>
        </article>
      </div>
    </main>
  )
}
