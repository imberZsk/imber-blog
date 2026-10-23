import type { Metadata } from 'next'
import Link from 'next/link'
import { geekbangCourses } from '@/lib/geekbang'
import { GeekbangBrowser } from './browser'

/** 备份阅读入口的独立元数据，避免与原创课程混淆。 */
export const metadata: Metadata = {
  title: '极客知识库', // 浏览器和搜索结果中的标题。
  description: '从大模型基础到 Agent 工程，按主题浏览 18 个知识库、320 篇原文备份。' // 描述迁入内容及阅读方式。
}

/** 展示课程分类检索及章节入口。 */
export default function GeekbangPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 pt-24 pb-16">
      <header className="border-border mb-8 border-b pb-8">
        <Link href="/knowledge" className="text-muted-foreground hover:text-mint text-sm">
          ← 博客知识库
        </Link>
        <p className="text-mint mt-8 mb-3 font-mono text-xs tracking-widest">GEEKBANG / READING LIBRARY</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">极客知识库</h1>
        <p className="text-muted-foreground mt-4 max-w-2xl leading-7">
          从大模型基础到 Agent 工程，沿着主题与章节循序阅读。
        </p>
        <p className="text-muted-foreground mt-3 text-sm">18 个知识库 · 320 篇章节 · 原文备份，保留来源与配图</p>
      </header>
      <GeekbangBrowser courses={geekbangCourses} />
    </main>
  )
}
