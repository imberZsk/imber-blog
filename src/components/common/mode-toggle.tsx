'use client'

import React, { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui'

/** 切换博客的浅色和深色显示偏好。 */
export function ModeToggle() {
  /** 当前主题及其更新方法。 */
  const { theme, setTheme } = useTheme()
  /** 客户端已完成挂载，允许读取主题状态。 */
  const [mounted, setMounted] = useState(false)

  /** 客户端挂载后再展示主题按钮，避免服务端与客户端主题不一致。 */
  useEffect(() => {
    setMounted(true)
  }, [])

  /** 当前是否使用深色主题。 */
  const isDark = theme === 'dark'

  if (!mounted) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={`切换到${isDark ? '浅色' : '深色'}模式`}
      title={`切换到${isDark ? '浅色' : '深色'}模式`}
    >
      {isDark ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
    </Button>
  )
}
