'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { FrontendDoc } from '@/lib/frontend-docs'

/** 在浏览器中筛选全部原文；docs 含分类、标题与正文搜索文本。 */
export function DocsBrowser({ docs }: { docs: FrontendDoc[] }) {
  /** 用户输入的标题或正文关键词。 */
  const [query, setQuery] = useState('')
  /** 当前需要展示的文档分类，空值表示全部。 */
  const [category, setCategory] = useState('')
  /** 从实际文档获取的分类选项。 */
  const categories = [...new Set(docs.map((doc) => doc.category))]
  /** 统一大小写并剔除无意义空格的检索词。 */
  const normalizedQuery = query.trim().toLocaleLowerCase()
  /** 同时符合分类和全文关键词的文章。 */
  const filtered = docs.filter(
    (doc) =>
      (!category || doc.category === category) &&
      `${doc.title} ${doc.searchText}`.toLocaleLowerCase().includes(normalizedQuery)
  )

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-3xl font-semibold">前端技术文档</h1>
      <p className="text-muted-foreground mt-3 text-sm">
        原项目中的 React、Next.js、编辑器、动画与工程笔记，共 {docs.length} 篇。
      </p>
      <div className="my-6 flex flex-col gap-3 sm:flex-row">
        <input
          aria-label="搜索文档标题和正文"
          type="search"
          placeholder="搜索标题或正文"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="border-border bg-card min-w-0 flex-1 rounded-md border px-4 py-3 text-sm"
        />
        <select
          aria-label="文档分类"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="border-border bg-card rounded-md border px-4 py-3 text-sm"
        >
          <option value="">全部分类</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <p role="status" className="text-muted-foreground mb-4 text-sm">
        找到 {filtered.length} 篇文档
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((doc) => (
          <Link
            key={doc.slug}
            href={doc.href}
            className="border-border bg-card hover:border-primary rounded-lg border p-5 transition-colors"
          >
            <p className="text-mint text-xs">{doc.category}</p>
            <h2 className="mt-2 text-base font-semibold">{doc.title}</h2>
          </Link>
        ))}
      </div>
      {filtered.length === 0 ? <p className="text-muted-foreground py-12 text-center">没有找到匹配的技术文档</p> : null}
    </main>
  )
}
