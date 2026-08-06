import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Network } from 'lucide-react'
import { PADDING_TOP } from '@/app/const'
import { cn } from '@/lib/utils'
import { getMindmaps } from '@/lib/mindmaps'

/** 思维导图列表页的搜索引擎元数据。 */
export const metadata: Metadata = {
  title: '思维导图',
  description: '浏览全栈开发、AI 编程和 AI 大模型应用开发三张学习地图。'
}

/** 渲染三张按成长路线排列的思维导图。 */
export default function MindmapsPage() {
  /** 从 Markdown 目录生成的思维导图列表。 */
  const mindmaps = getMindmaps()

  return (
    <main className={cn('mx-auto max-w-5xl px-4 pb-20', PADDING_TOP)}>
      <header className="mb-10 max-w-2xl border-b border-zinc-200 pb-7 dark:border-zinc-800">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-white">思维导图</h1>
        <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          三张地图记录了从全栈工程、AI 辅助开发到大模型应用落地的完整能力路径。
        </p>
      </header>

      <div className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {mindmaps.map((mindmap, index) => (
          <Link
            key={mindmap.slug}
            href={mindmap.href}
            className="group grid gap-4 py-7 transition-colors hover:bg-zinc-50 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center dark:hover:bg-zinc-900/50"
          >
            <div className="flex h-10 w-10 items-center justify-center border border-zinc-200 text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              {String(index + 1).padStart(2, '0')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 shrink-0 text-zinc-400" />
                <h2 className="text-lg font-medium text-zinc-950 dark:text-white">{mindmap.title}</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{mindmap.description}</p>
              <p className="mt-2 text-xs text-zinc-400">{mindmap.nodeCount.toLocaleString('zh-CN')} 个知识节点</p>
            </div>
            <ArrowRight className="hidden h-5 w-5 text-zinc-400 transition-transform group-hover:translate-x-1 sm:block" />
          </Link>
        ))}
      </div>
    </main>
  )
}
