'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

/** 目录项的数据结构 */
interface TocItem {
  id: string
  text: string
  level: number
}

/** TableOfContents 组件的属性 */
interface TableOfContentsProps {
  /** 文章容器的选择器，默认为 '.knowledge-article' */
  containerSelector?: string
  /** 自定义类名 */
  className?: string
}

/**
 * 文章目录侧边栏组件
 * 功能：
 * 1. 自动提取文章中的 h1-h6 标题
 * 2. 滚动时高亮当前可视区域的标题
 * 3. 点击目录项平滑滚动到对应位置
 */
export function TableOfContents({ containerSelector = '.knowledge-article', className }: TableOfContentsProps) {
  /** 目录数据列表 */
  const [toc, setToc] = useState<TocItem[]>([])
  /** 当前激活的标题 ID */
  const [activeId, setActiveId] = useState<string>('')
  /** 观察器实例引用 */
  const observerRef = useRef<IntersectionObserver | null>(null)
  /** 标题元素引用映射 */
  const headingElementsRef = useRef<{ [key: string]: IntersectionObserverEntry }>({})

  useEffect(() => {
    /** 文章容器元素 */
    const container = document.querySelector(containerSelector)
    if (!container) return

    /** 文章中的所有标题元素 */
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))

    /** 为每个标题生成唯一 ID 并构建目录数据 */
    const tocItems: TocItem[] = headings.map((heading, index) => {
      /** 标题的层级（1-6） */
      const level = parseInt(heading.tagName.substring(1))
      /** 标题文本内容 */
      const text = heading.textContent || ''
      /** 标题的唯一 ID，优先使用已有 ID，否则生成新 ID */
      let id = heading.id

      if (!id) {
        // 使用文本内容生成 ID，处理中文和特殊字符
        id = `heading-${index}-${text.replace(/\s+/g, '-').toLowerCase()}`
        heading.id = id
      }

      return { id, text, level }
    })

    setToc(tocItems)

    /** 创建 IntersectionObserver 监听标题元素的可见性 */
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        headingElementsRef.current[entry.target.id] = entry
      })

      /** 找到当前可见的标题中位置最靠上的 */
      const visibleHeadings: IntersectionObserverEntry[] = []
      Object.keys(headingElementsRef.current).forEach((key) => {
        const headingElement = headingElementsRef.current[key]
        if (headingElement.isIntersecting) {
          visibleHeadings.push(headingElement)
        }
      })

      if (visibleHeadings.length > 0) {
        // 按照标题在页面中的位置排序
        visibleHeadings.sort((a, b) => {
          return a.boundingClientRect.top - b.boundingClientRect.top
        })
        // 激活第一个可见的标题
        setActiveId(visibleHeadings[0].target.id)
      }
    }

    /** 滚动容器作为 IntersectionObserver 的 root */
    const scrollContainer = document.querySelector('.simple-editor-wrapper')

    observerRef.current = new IntersectionObserver(observerCallback, {
      root: scrollContainer, // 指定自定义滚动容器
      rootMargin: '-100px 0px -70% 0px', // 顶部留出导航栏空间，底部留出大部分空间
      threshold: 0
    })

    /** 观察所有标题元素 */
    headings.forEach((heading) => {
      if (observerRef.current) {
        observerRef.current.observe(heading)
      }
    })

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [containerSelector])

  /**
   * 处理目录项点击事件
   * @param id 目标标题的 ID
   */
  const handleClick = (id: string) => {
    /** 目标标题元素 */
    const element = document.getElementById(id)
    if (!element) return

    /** 滚动容器（文章页面的主滚动容器） */
    const scrollContainer = document.querySelector('.simple-editor-wrapper')

    if (scrollContainer) {
      /** 导航栏高度（用于计算滚动偏移） */
      const navHeight = 100
      /** 标题元素相对于容器顶部的位置 */
      const elementPosition = element.offsetTop
      /** 滚动目标位置（减去导航栏高度） */
      const offsetPosition = elementPosition - navHeight

      scrollContainer.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    } else {
      // 降级方案：使用默认的锚点跳转
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (toc.length === 0) {
    return null
  }

  return (
    <nav className={cn('toc-wrapper', className)} aria-label="目录">
      <div className="toc-container">
        <h2 className="toc-title">目录</h2>
        <ul className="toc-list">
          {toc.map((item) => (
            <li
              key={item.id}
              className={cn('toc-item', `toc-item-${item.level}`, {
                'toc-item-active': activeId === item.id
              })}
            >
              <button
                type="button"
                onClick={() => handleClick(item.id)}
                className="toc-link"
                aria-current={activeId === item.id ? 'location' : undefined}
              >
                {item.text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
