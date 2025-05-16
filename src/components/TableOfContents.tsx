'use client'

import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { PADDING_TOP } from '@/app/const'

interface Heading {
  id: string
  text: string
  level: number
}

export function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    // 等待 DOM 完全加载
    const getHeadings = () => {
      const elements = Array.from(document.querySelectorAll('h1[id], h2[id], h3[id]'))
        .filter(
          (element): element is HTMLElement =>
            element instanceof HTMLElement && element.id.length > 0 && element.textContent !== null
        )
        .map((element) => {
          return {
            id: element.id,
            text: element.textContent || '',
            level: parseInt(element.tagName[1])
          }
        })

      if (elements.length > 0) {
        setHeadings(elements)
      }
    }

    // 初始获取
    getHeadings()

    // 监听内容变化
    const observer = new MutationObserver(() => {
      // 增加延迟，确保 MDX 内容已经完全渲染
      setTimeout(getHeadings, 100)
    })

    observer.observe(document.body, { childList: true, subtree: true })

    // 监听滚动位置
    const scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-100px 0% -66%',
        threshold: 1.0
      }
    )

    headings.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) {
        scrollObserver.observe(element)
      }
    })

    return () => {
      observer.disconnect()
      scrollObserver.disconnect()
    }
  }, [headings.length])

  if (headings.length === 0) {
    return null
  }

  return (
    <nav
      className={cn(
        'fixed right-[max(0px,calc(50%-45rem))] hidden w-[19rem] overflow-y-auto pr-4 pb-16 pl-8 lg:block',
        PADDING_TOP
      )}
    >
      <h2 className="font-semibold dark:text-zinc-100">目录</h2>
      <ul className="mt-4 space-y-3 text-sm">
        {headings.map((heading) => (
          <li
            key={heading.id}
            style={{
              paddingLeft: `${(heading.level - 1) * 16}px`
            }}
          >
            <a
              href={`#${heading.id}`}
              className={cn(
                'inline-block text-zinc-400 transition-colors hover:text-zinc-500 dark:hover:text-zinc-100',
                activeId === heading.id && 'font-medium text-blue-400'
              )}
              onClick={(e) => {
                e.preventDefault()
                const element = document.getElementById(heading.id)
                if (element) {
                  const yOffset = -100 // 考虑固定头部的高度
                  const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
                  window.scrollTo({ top: y, behavior: 'smooth' })
                }
              }}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
