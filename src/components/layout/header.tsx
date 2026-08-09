// import { UserCircle2 } from 'lucide-react'

import Link from 'next/link'
import Image from 'next/image'
import { MobileNav } from '@/components/layout'
import { ModeToggle } from '@/components/common'
import { getEnabledNavItems, navStyles } from '@/config/navigation'

/** 展示全站固定导航、移动端菜单入口和主题切换。 */
const Header = () => {
  return (
    <header className="border-border bg-background/90 fixed top-0 z-20 w-full border-b backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between">
          {/* 左侧移动端菜单按钮 */}
          <MobileNav />

          {/* 中间Logo */}
          <div className="absolute left-1/2 -translate-x-1/2 lg:static lg:left-0 lg:translate-x-0">
            <Link href="/" className="flex items-center gap-2" title="首页">
              <Image src="/avatar.jpg" alt="Logo" width={32} height={32} priority className="rounded-full" />
              <span className="hidden text-base font-semibold sm:block">Imber</span>
            </Link>
          </div>

          {/* 中间导航 - 桌面端显示 */}
          <nav className="hidden lg:absolute lg:left-1/2 lg:block lg:-translate-x-1/2">
            <div className={navStyles.container}>
              <ul className={navStyles.list}>
                {getEnabledNavItems().map((item) => (
                  <li key={item.path}>
                    <Link href={item.path} className={navStyles.link} title={item.title}>
                      {item.name}
                    </Link>
                  </li>
                ))}
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
