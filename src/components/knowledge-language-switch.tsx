'use client'

import { useReducedMotion } from 'framer-motion'
import { useLayoutEffect, useRef, useState } from 'react'
import { KNOWLEDGE_LANGUAGES, type KnowledgeLanguage } from '@/lib/knowledge-language'

/** 语言切换背景完成一次水平移动所需的毫秒数。 */
const ACTIVE_BACKGROUND_TRANSITION_DURATION_MS = 300
/** 语言切换背景与桌面导航一致的平滑减速曲线。 */
const ACTIVE_BACKGROUND_TRANSITION_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'

/** 语言切换控件的当前值与变更回调。 */
interface KnowledgeLanguageSwitchProps {
  /** 当前展示的代码语言。 */
  language: KnowledgeLanguage
  /** 用户选择另一种代码语言时触发。 */
  onLanguageChange: (language: KnowledgeLanguage) => void
}

/**
 * 展示通过单个主题色背景层水平移动的代码语言切换控件。
 * @param props 当前语言与切换回调。
 */
export function KnowledgeLanguageSwitch({ language, onLanguageChange }: KnowledgeLanguageSwitchProps) {
  /** 用户是否要求减少动画。 */
  const shouldReduceMotion = useReducedMotion()
  /** 两个语言按钮及滑动背景所在的容器。 */
  const switchContainerRef = useRef<HTMLDivElement>(null)
  /** 唯一的主题色滑动背景。 */
  const activeBackgroundRef = useRef<HTMLSpanElement>(null)
  /** 滑动背景是否已经完成首次尺寸和位置测量。 */
  const [hasPositionedActiveBackground, setHasPositionedActiveBackground] = useState(false)

  /** 在语言或控件尺寸变化后同步背景层的位置。 */
  useLayoutEffect(() => {
    /** 当前语言切换容器。 */
    const switchContainerElement = switchContainerRef.current
    /** 当前唯一滑动背景元素。 */
    const activeBackgroundElement = activeBackgroundRef.current
    /** 当前被选中的语言按钮。 */
    const activeButtonElement = switchContainerElement?.querySelector<HTMLElement>('[aria-pressed="true"]')

    if (!switchContainerElement || !activeBackgroundElement || !activeButtonElement) {
      return
    }

    /** 根据选中按钮的真实尺寸更新背景宽度和水平位移。 */
    const updateActiveBackgroundPosition = () => {
      activeBackgroundElement.style.width = `${activeButtonElement.offsetWidth}px`
      activeBackgroundElement.style.transform = `translateX(${activeButtonElement.offsetLeft}px)`
      activeBackgroundElement.style.opacity = '1'
      setHasPositionedActiveBackground(true)
    }

    updateActiveBackgroundPosition()

    /** 监听容器和选中按钮尺寸，避免响应式布局或字体加载后背景错位。 */
    const switchResizeObserver = new ResizeObserver(updateActiveBackgroundPosition)
    switchResizeObserver.observe(switchContainerElement)
    switchResizeObserver.observe(activeButtonElement)

    /** 组件更新或卸载时停止监听旧按钮。 */
    return () => switchResizeObserver.disconnect()
  }, [language])

  return (
    <div
      ref={switchContainerRef}
      className="border-primary/30 bg-muted relative grid h-9 w-52 shrink-0 grid-cols-2 overflow-hidden border"
      role="group"
      aria-label="切换代码语言"
    >
      <span
        ref={activeBackgroundRef}
        aria-hidden="true"
        className="bg-primary pointer-events-none absolute inset-y-0 left-0 opacity-0 will-change-transform"
        style={{
          transitionProperty: shouldReduceMotion ? 'none' : 'transform, width',
          transitionDuration: shouldReduceMotion ? '0ms' : `${ACTIVE_BACKGROUND_TRANSITION_DURATION_MS}ms`,
          transitionTimingFunction: ACTIVE_BACKGROUND_TRANSITION_EASING
        }}
      />
      {KNOWLEDGE_LANGUAGES.map((languageOption) => {
        /** 当前按钮是否对应正在展示的语言。 */
        const isActiveLanguage = language === languageOption.value

        return (
          <button
            key={languageOption.value}
            type="button"
            className={`relative z-10 h-full min-w-0 cursor-pointer whitespace-nowrap px-3 text-sm font-medium transition-colors duration-300 ${
              isActiveLanguage
                ? `${hasPositionedActiveBackground ? '' : 'bg-primary'} text-primary-foreground`
                : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
            }`}
            aria-pressed={isActiveLanguage}
            onClick={() => onLanguageChange(languageOption.value)}
          >
            {languageOption.label}
          </button>
        )
      })}
    </div>
  )
}
