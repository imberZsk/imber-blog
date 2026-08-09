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
      <header className="mb-8 max-w-2xl">
        <p className="text-mint mb-3 font-mono text-xs font-semibold">LEARNING MAPS / 03</p>
        <h1 className="text-foreground text-2xl font-semibold">思维导图</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-7">
          三张地图记录了从全栈工程、AI 辅助开发到大模型应用落地的完整能力路径。
        </p>
      </header>

      <div className="border-border border-t">
        {mindmaps.map((mindmap, index) => (
          <Link
            key={mindmap.slug}
            href={mindmap.href}
            className="border-border hover:bg-accent/50 group grid grid-cols-[44px_minmax(0,1fr)] gap-4 border-b px-4 py-7 transition-colors sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center sm:px-5"
          >
            <div className="border-mint/40 text-mint flex h-9 w-9 items-center justify-center border font-mono text-xs font-semibold">
              {String(index + 1).padStart(2, '0')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Network className="text-mint h-4 w-4 shrink-0" />
                <h2 className="text-foreground text-lg font-medium">{mindmap.title}</h2>
              </div>
              <p className="text-muted-foreground mt-2 text-sm leading-6">{mindmap.description}</p>
              <p className="text-mint mt-2 font-mono text-xs">{mindmap.nodeCount.toLocaleString('zh-CN')} 个知识节点</p>
            </div>
            <ArrowRight className="text-muted-foreground group-hover:text-mint hidden h-5 w-5 transition-all group-hover:translate-x-1 sm:block" />
          </Link>
        ))}
      </div>
    </main>
  )
}
