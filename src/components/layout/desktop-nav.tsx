'use client'

import { useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLayoutEffect, useRef } from 'react'

import { getEnabledNavItems } from '@/config/navigation'

/** 当前启用的桌面端导航项。 */
const navItems = getEnabledNavItems()
/** 导航高亮背景完成一次水平移动所需的毫秒数。 */
const ACTIVE_BACKGROUND_TRANSITION_DURATION_MS = 300
/** 导航高亮背景使用的平滑减速曲线。 */
const ACTIVE_BACKGROUND_TRANSITION_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'

/** 展示带共享滑动背景的桌面端主导航。 */
const DesktopNav = () => {
  /** 当前页面路径，用于确定滑动背景所在的导航项。 */
  const pathname = usePathname()
  /** 用户是否要求减少动画。 */
  const shouldReduceMotion = useReducedMotion()
  /** 与当前路径匹配的一级导航路径。 */
  const activePath =
    navItems.find((item) => (item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)))?.path ?? '/'
  /** 桌面导航列表，用于计算当前导航项在容器内的位置。 */
  const navigationListRef = useRef<HTMLUListElement>(null)
  /** 唯一的导航高亮背景，只在当前 Header 内水平移动。 */
  const activeBackgroundRef = useRef<HTMLSpanElement>(null)

  /** 在路由或导航尺寸变化后同步高亮层的位置。 */
  useLayoutEffect(() => {
    /** 当前桌面导航列表元素。 */
    const navigationListElement = navigationListRef.current
    /** 当前导航高亮背景元素。 */
    const activeBackgroundElement = activeBackgroundRef.current
    /** 与当前路由匹配的导航链接。 */
    const activeLinkElement = navigationListElement?.querySelector<HTMLElement>('[aria-current="page"]')
    /** 承载当前导航链接的列表项，用于读取容器内横向位置。 */
    const activeItemElement = activeLinkElement?.parentElement

    if (!navigationListElement || !activeBackgroundElement || !activeItemElement) {
      return
    }

    /** 根据当前导航项更新高亮层的水平位置和宽度。 */
    const updateActiveBackgroundPosition = () => {
      activeBackgroundElement.style.width = `${activeItemElement.offsetWidth}px`
      activeBackgroundElement.style.transform = `translateX(${activeItemElement.offsetLeft}px)`
      activeBackgroundElement.style.opacity = '1'
    }

    updateActiveBackgroundPosition()

    /** 监听导航布局变化，避免字体或视口尺寸改变后高亮位置偏移。 */
    const navigationResizeObserver = new ResizeObserver(updateActiveBackgroundPosition)
    navigationResizeObserver.observe(navigationListElement)
    navigationResizeObserver.observe(activeItemElement)

    /** 组件更新或卸载时停止监听旧导航项。 */
    return () => navigationResizeObserver.disconnect()
  }, [activePath])

  return (
    <nav className="hidden lg:absolute lg:left-1/2 lg:block lg:-translate-x-1/2" aria-label="主导航">
      <ul
        ref={navigationListRef}
        className="border-border bg-card/80 relative flex items-center rounded-md border p-1 shadow-sm backdrop-blur-sm"
      >
        <span
          ref={activeBackgroundRef}
          className="bg-primary pointer-events-none absolute top-1 bottom-1 left-0 rounded-[4px] opacity-0"
          style={{
            transitionProperty: shouldReduceMotion ? 'none' : 'transform, width',
            transitionDuration: shouldReduceMotion ? '0ms' : `${ACTIVE_BACKGROUND_TRANSITION_DURATION_MS}ms`,
            transitionTimingFunction: ACTIVE_BACKGROUND_TRANSITION_EASING
          }}
          aria-hidden="true"
        />
        {navItems.map((item) => (
          <li key={item.path} className="relative">
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
