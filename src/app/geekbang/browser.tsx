'use client'

import { useState } from 'react'
import Link from 'next/link'

/** 分类按钮的默认选项。 */
const ALL_CATEGORIES = '全部主题'
/** 列表只使用课程和章节的必要字段，不发送正文到客户端。 */
interface Course {
  category: string
  name: string
  slug: string
  chapters: { title: string; slug: string }[]
}

/** 按分类与标题筛选原文课程；courses 为服务端整理的轻量目录。 */
export function GeekbangBrowser({ courses }: { courses: Course[] }) {
  /** 当前选中的主题分类。 */
  const [category, setCategory] = useState(ALL_CATEGORIES)
  /** 用于课程名和章节标题匹配的搜索词。 */
  const [query, setQuery] = useState('')
  /** 保持原始顺序的主题选项。 */
  const categories = [ALL_CATEGORIES, ...new Set(courses.map((course) => course.category))]
  /** 忽略大小写及首尾空白后的检索关键词。 */
  const keyword = query.trim().toLocaleLowerCase()
  /** 同时满足分类和标题检索条件的课程。 */
  const filtered = courses.filter(
    (course) =>
      (category === ALL_CATEGORIES || course.category === category) &&
      `${course.name} ${course.chapters.map((chapter) => chapter.title).join(' ')}`
        .toLocaleLowerCase()
        .includes(keyword)
  )
  return (
    <section aria-label="课程检索">
      <label htmlFor="geekbang-search" className="mb-2 block text-sm font-medium">
        搜索知识库或章节
      </label>
      <input
        id="geekbang-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="试试 Codex、RAG、上下文工程…"
        className="border-border bg-background focus:border-mint mb-6 w-full rounded-lg border px-4 py-3 outline-none"
      />
      <div className="mb-6 flex flex-wrap gap-2" aria-label="主题分类">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
            className="border-border text-muted-foreground hover:text-mint aria-pressed:border-mint aria-pressed:text-mint rounded-md border px-3 py-2 text-sm"
          >
            {item}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="text-muted-foreground mb-5 text-sm">
        找到 {filtered.length} 个知识库
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        {filtered.map((course) => (
          <section key={course.slug} className="border-border min-w-0 rounded-xl border p-5 sm:p-6">
            <p className="text-muted-foreground mb-2 text-xs">
              {course.category} · {course.chapters.length} 篇
            </p>
            <h2 className="mb-4 text-xl font-semibold">
              <Link
                href={`/geekbang/${course.slug}/${course.chapters.find((chapter) => chapter.title !== '学习交流群')?.slug || course.chapters[0]?.slug}`}
                className="hover:text-mint"
              >
                {course.name} →
              </Link>
            </h2>
            <details open={keyword ? true : undefined}>
              <summary className="text-mint cursor-pointer text-sm">浏览章节</summary>
              <ol className="mt-3 space-y-3">
                {course.chapters
                  .filter(
                    (chapter) =>
                      !keyword ||
                      course.name.toLocaleLowerCase().includes(keyword) ||
                      chapter.title.toLocaleLowerCase().includes(keyword)
                  )
                  .map((chapter) => (
                    <li key={chapter.slug}>
                      <Link
                        href={`/geekbang/${course.slug}/${chapter.slug}`}
                        className="text-muted-foreground hover:text-mint block text-sm leading-6"
                      >
                        {chapter.title}
                      </Link>
                    </li>
                  ))}
              </ol>
            </details>
          </section>
        ))}
      </div>
      {!filtered.length && (
        <p className="text-muted-foreground py-12 text-center">没有找到匹配内容，试试其他关键词或主题。</p>
      )}
    </section>
  )
}
