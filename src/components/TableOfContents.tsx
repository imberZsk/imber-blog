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
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

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
  }, [])

  useEffect(() => {
    const TOP_OFFSET = 100 // 考虑固定头部的高度

    const updateActiveLink = () => {
      const pageHeight = document.body.scrollHeight
      const scrollPosition = window.scrollY + window.innerHeight

      if (scrollPosition >= 0 && pageHeight - scrollPosition <= 0) {
        // 滚动到页面底部
        setSelectedIndex(headings.length - 1)
        return
      }

      let index = -1
      while (index < headings.length - 1) {
        const heading = headings[index + 1]
        const element = document.getElementById(heading.id)

        if (!element) {
          index += 1
          continue
        }

        const { top } = element.getBoundingClientRect()

        if (top >= TOP_OFFSET) {
          break
        }
        index += 1
      }

      const activeIndex = Math.max(index, 0)
      setSelectedIndex(activeIndex)
    }

    // 初始化时执行一次
    updateActiveLink()

    // 监听滚动事件
    const handleScroll = () => {
      updateActiveLink()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [headings])

  if (headings.length === 0) {
    return null
  }

  return (
    <nav
      className={cn(
        'fixed right-[max(0px,calc(50%-45rem))] hidden w-[19rem] overflow-y-auto pr-4 pb-16 pl-8 xl:block',
        PADDING_TOP
      )}
    >
      <h2 className="font-semibold dark:text-zinc-100">目录</h2>
      <ul className="mt-4 space-y-1 text-sm">
        {headings.map((heading, index) => (
          <li
            key={`heading-${heading.id}-${index}`}
            className={cn('rounded-l-xl px-2', selectedIndex === index ? 'bg-blue-50 dark:bg-blue-900/20' : null, {
              'pl-4': heading.level === 3,
              hidden: heading.level > 3
            })}
          >
            <a
              href={`#${heading.id}`}
              className={cn(
                selectedIndex === index
                  ? 'font-semibold text-blue-600 dark:text-blue-400'
                  : 'text-zinc-500 dark:text-zinc-400',
                'block py-2 leading-normal transition-colors hover:text-blue-600 dark:hover:text-blue-400'
              )}
              onClick={() => {
                // 手动设置选中状态，提供即时反馈
                setSelectedIndex(index)
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
