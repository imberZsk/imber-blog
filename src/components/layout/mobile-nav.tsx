'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getEnabledNavItems } from '@/config/navigation'

/** 当前启用的移动端导航项。 */
const navItems = getEnabledNavItems()

/** 展示通过 Portal 隔离的移动端全屏导航。 */
const MobileNav = () => {
  /** 移动端导航是否处于打开状态。 */
  const [isOpen, setIsOpen] = useState(false)
  /** 客户端挂载完成后才允许把菜单 Portal 到 document.body。 */
  const [isMounted, setIsMounted] = useState(false)
  /** 当前页面路径，用于标识选中的导航项。 */
  const pathname = usePathname()

  /** 客户端挂载后启用 Portal，避免服务端渲染访问 document。 */
  useEffect(() => {
    setIsMounted(true)
  }, [])

  /** 菜单打开时锁定页面滚动，关闭或卸载时恢复原始状态。 */
  useEffect(() => {
    if (!isOpen) {
      return
    }

    /** 打开菜单前页面原有的 overflow 样式。 */
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  return (
    <div className="lg:hidden">
      <button
        className="border-border bg-background text-muted-foreground hover:bg-accent hover:text-mint inline-flex size-9 items-center justify-center rounded-[18px] border transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? '关闭导航菜单' : '打开导航菜单'}
      >
        <span className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </span>
      </button>

      {isMounted &&
        isOpen &&
        createPortal(
          <div className="bg-background text-foreground fixed inset-0 z-[100] min-h-svh">
            <div className="border-border flex h-16 items-center border-b px-4">
              <button
                type="button"
                className="text-muted-foreground hover:bg-accent hover:text-mint inline-flex size-9 items-center justify-center rounded-full transition-colors"
                onClick={() => setIsOpen(false)}
                aria-label="关闭导航菜单"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
              <span className="mx-auto pr-9 text-sm font-medium">Imber</span>
            </div>
            <nav className="px-6 pt-10" aria-label="移动端主导航">
              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`border-border block border-b py-4 text-xl font-medium transition-colors ${
                      pathname === item.path ? 'text-mint' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </nav>
          </div>,
          document.body
        )}
    </div>
  )
}

export default MobileNav
