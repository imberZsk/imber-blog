import Link from 'next/link'
import type { ReactNode } from 'react'
import './lab.css'

/** 实验室各页面共享博客导航下的分类入口；children 为当前实验或文档。 */
export default function LabLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lab-shell pt-16">
      <nav
        aria-label="实验室分类"
        className="border-border bg-background sticky top-16 z-10 flex gap-5 border-b px-5 py-3 text-sm"
      >
        <Link className="text-mint hover:underline" href="/lab">
          实验室
        </Link>
        <Link className="hover:text-mint" href="/lab/animation">
          动画实验
        </Link>
        <Link className="hover:text-mint" href="/lab/3d">
          3D 场景
        </Link>
        <Link className="hover:text-mint" href="/lab/docs">
          技术文档
        </Link>
      </nav>
      {children}
    </div>
  )
}
