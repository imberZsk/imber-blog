'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { navigationSections } from '@/app/lab/animation/config'

/** 动画详情的分类导航；children 为保留原交互的动画示例。 */
export function AnimationNavigation({ children }: { children: ReactNode }) {
  /** 当前路由，用于在列表页隐藏详情侧栏。 */
  const pathname = usePathname()
  if (pathname === '/lab/animation') return <>{children}</>

  return (
    <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-border bg-card border-b p-3 md:sticky md:top-28 md:h-[calc(100svh-7rem)] md:overflow-y-auto md:border-r md:border-b-0">
        <Link href="/lab/animation" className="text-mint mb-3 block px-3 text-sm font-semibold">
          ← 全部动画
        </Link>
        <nav className="flex gap-1 overflow-x-auto md:block" aria-label="动画实验索引">
          {navigationSections.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              aria-current={pathname === item.path ? 'page' : undefined}
              className="text-muted-foreground hover:bg-muted aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground block shrink-0 rounded px-3 py-2 text-sm"
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>
      <main key={pathname} className="lab-animation min-w-0">
        {children}
      </main>
    </div>
  )
}
