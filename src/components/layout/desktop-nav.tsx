'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { getEnabledNavItems } from '@/config/navigation'

/** 当前启用的桌面端导航项。 */
const navItems = getEnabledNavItems()

/** 展示带共享滑动背景的桌面端主导航。 */
const DesktopNav = () => {
  /** 当前页面路径，用于确定滑动背景所在的导航项。 */
  const pathname = usePathname()
  /** 用户是否要求减少动画。 */
  const shouldReduceMotion = useReducedMotion()
  /** 与当前路径匹配的一级导航路径。 */
  const activePath =
    navItems.find((item) => (item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)))?.path ?? '/'

  return (
    <nav className="hidden lg:absolute lg:left-1/2 lg:block lg:-translate-x-1/2" aria-label="主导航">
      <ul className="border-border bg-card/80 flex items-center rounded-md border p-1 shadow-sm backdrop-blur-sm">
        {navItems.map((item) => (
          <li key={item.path} className="relative">
            {activePath === item.path ? (
              <motion.span
                layoutId="desktop-nav-active-background"
                className="bg-primary absolute inset-0 rounded-[4px]"
                transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
                aria-hidden="true"
              />
            ) : null}
            <Link
              href={item.path}
              className={`relative z-10 block px-3 py-2 text-sm font-medium transition-colors ${
                activePath === item.path ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title={item.title}
              aria-current={activePath === item.path ? 'page' : undefined}
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default DesktopNav
