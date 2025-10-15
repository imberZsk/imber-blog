// import { UserCircle2 } from 'lucide-react'

import Link from 'next/link'
import Image from 'next/image'
import { MobileNav } from '@/components/layout'
import { ModeToggle } from '@/components/common'

const Header = () => {
  return (
    <header className="fixed top-0 z-10 w-full border-b border-zinc-200/50 bg-white/90 backdrop-blur dark:border-zinc-800/50 dark:bg-[#1a1a1a]/90">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between">
          {/* 左侧移动端菜单按钮 */}
          <MobileNav />

          {/* 中间Logo */}
          <div className="absolute left-1/2 -translate-x-1/2 lg:static lg:left-0 lg:translate-x-0">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/avatar.jpg" alt="Logo" width={32} height={32} priority className="rounded-full" />
            </Link>
          </div>

          {/* 中间导航 - 桌面端显示 */}
          <nav className="hidden lg:absolute lg:left-1/2 lg:block lg:-translate-x-1/2">
            <div className="rounded-full bg-zinc-100/80 px-6 py-2 backdrop-blur-md dark:bg-white/5">
              <ul className="flex items-center gap-6 text-sm">
                <li>
                  <Link
                    href="/"
                    className="text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
                  >
                    首页
                  </Link>
                </li>
                <li>
                  <Link
                    href="/posts"
                    className="text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
                  >
                    文集
                  </Link>
                </li>
                {/* <li>
                  <Link
                    href="/ideas"
                    className="text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
                  >
                    思考
                  </Link>
                </li> */}
                {/* <li>
                  <Link
                    href="/gallery"
                    className="text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
                  >
                    画廊
                  </Link>
                </li> */}
                <li>
                  <Link
                    href="/todos"
                    className="text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
                  >
                    清单
                  </Link>
                </li>
                <li>
                  <Link
                    href="/friends"
                    className="text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
                  >
                    友链
                  </Link>
                </li>
                {/* <li>
                  <Link
                    href="/tools"
                    className="text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
                  >
                    工具
                  </Link>
                </li> */}
              </ul>
            </div>
          </nav>

          {/* 右侧用户按钮 */}
          {/* <button className="rounded-full p-2 text-zinc-300 transition-colors hover:bg-white/5 hover:text-zinc-100">
            <UserCircle2 className="h-6 w-6" />
          </button> */}
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}

export default Header
