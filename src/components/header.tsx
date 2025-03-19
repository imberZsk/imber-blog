import { UserCircle2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import MobileNav from './MobileNav'

const Header = () => {
  return (
    <header className="fixed top-0 z-10 w-full bg-[#1a1a1a]/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between">
          {/* 左侧移动端菜单按钮 */}
          <MobileNav />

          {/* 中间Logo */}
          <div className="absolute left-1/2 -translate-x-1/2 lg:static lg:left-0 lg:translate-x-0">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/avatar.jpg" alt="Logo" width={32} height={32} className="rounded-full" />
            </Link>
          </div>

          {/* 中间导航 - 桌面端显示 */}
          <nav className="hidden lg:absolute lg:left-1/2 lg:block lg:-translate-x-1/2">
            <div className="rounded-full bg-white/5 px-6 py-2 backdrop-blur-md">
              <ul className="flex items-center gap-6 text-sm">
                <li>
                  <Link href="/posts" className="text-zinc-100 transition-colors hover:text-zinc-400">
                    文集
                  </Link>
                </li>
                <li>
                  <Link href="/notes" className="text-zinc-100 transition-colors hover:text-zinc-400">
                    手记
                  </Link>
                </li>
                <li>
                  <Link href="/friends" className="text-zinc-100 transition-colors hover:text-zinc-400">
                    朋友
                  </Link>
                </li>
                <li>
                  <Link href="/more" className="text-zinc-100 transition-colors hover:text-zinc-400">
                    更多
                  </Link>
                </li>
              </ul>
            </div>
          </nav>

          {/* 右侧用户按钮 */}
          <button className="rounded-full p-2 text-zinc-300 transition-colors hover:bg-white/5 hover:text-zinc-100">
            <UserCircle2 className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
