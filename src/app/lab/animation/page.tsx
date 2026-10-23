'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { navigationSections } from './config'

// ANIMATION_SEARCH_PLACEHOLDER 描述动画实验搜索框可检索的内容。
const ANIMATION_SEARCH_PLACEHOLDER = '搜索动画名称、框架或效果'

/** 渲染动画实验的统一索引页。 */
export default function Page() {
  // searchQuery 存储用户输入的动画实验搜索词。
  const [searchQuery, setSearchQuery] = useState('')
  // filteredSections 存储名称或标识命中搜索词的动画实验。
  const filteredSections = useMemo(() => {
    // normalizedQuery 存储去除首尾空格并统一为小写的搜索词。
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase()

    if (!normalizedQuery) {
      return navigationSections
    }

    return navigationSections.filter((item) => `${item.name} ${item.id}`.toLocaleLowerCase().includes(normalizedQuery))
  }, [searchQuery])

  /** 同步用户输入的动画实验搜索词。 */
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value)
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1180px] px-5 py-10 md:px-8">
      <header className="border-border mb-8 grid gap-6 border-b pb-10 md:grid-cols-[1fr_360px] md:items-end">
        <div>
          <p className="text-mint mb-4 font-mono text-xs font-bold">MOTION STUDIES / 22 EXPERIMENTS</p>
          <h1 className="text-foreground max-w-3xl text-3xl leading-tight font-semibold md:text-4xl">动画实验</h1>
        </div>
        <p className="text-muted-foreground m-0 text-sm leading-7 md:text-base">
          用 GSAP 与 Framer Motion 对照拆解文字、布局、滚动和时间轴动画。选择一个实验，查看真实交互与实现源码。
        </p>
      </header>

      <section
        className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        aria-label="搜索动画实验"
      >
        <label className="border-border bg-card focus-within:border-mint flex h-12 w-full max-w-xl items-center gap-3 rounded-md border px-4 transition-colors">
          <Search className="text-mint h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">搜索动画实验</span>
          <input
            className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={ANIMATION_SEARCH_PLACEHOLDER}
          />
        </label>
        <p className="text-muted-foreground m-0 font-mono text-xs">
          {filteredSections.length} / {navigationSections.length} EXPERIMENTS
        </p>
      </section>

      {filteredSections.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSections.map((item) => {
            // originalIndex 存储案例在完整实验列表中的稳定序号。
            const originalIndex = navigationSections.indexOf(item)
            return <VideoCard key={`${item.id}-${item.path}`} item={item} index={originalIndex} />
          })}
        </div>
      ) : (
        <div className="border-border text-muted-foreground flex min-h-60 items-center justify-center rounded-lg border border-dashed text-sm">
          没有找到匹配的动画实验
        </div>
      )}
    </main>
  )
}

interface VideoCardProps {
  index: number
  item: {
    name: string
    path: string
    src: string
  }
}

/** 渲染单个动画实验卡片，并根据可见性和悬停状态控制预览视频。 */
function VideoCard({ item, index }: VideoCardProps) {
  // videoRef 存储当前卡片预览视频的 DOM 引用。
  const videoRef = useRef<HTMLVideoElement>(null)
  // containerRef 存储卡片容器的 DOM 引用，用于观察可见性。
  const containerRef = useRef<HTMLDivElement>(null)
  // isVisible 记录卡片是否已进入视口，以延迟加载视频资源。
  const [isVisible, setIsVisible] = useState(false)
  // isHovered 记录指针是否停留在卡片上，以控制视频播放。
  const [isHovered, setIsHovered] = useState(false)

  // 懒加载实现
  useEffect(() => {
    // observer 监听卡片进入视口，并在首次命中后停止观察。
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // hover播放控制
  useEffect(() => {
    // video 存储当前预览视频元素，元素不存在时不执行播放控制。
    const video = videoRef.current
    if (!video || !isVisible) return

    if (isHovered) {
      video.play().catch(() => {
        // 忽略播放错误
      })
    } else {
      video.pause()
      video.currentTime = 0 // 重置到开始
    }
  }, [isHovered, isVisible])

  /** 标记指针进入卡片，触发可见视频播放。 */
  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  /** 标记指针离开卡片，将视频重置到起始帧。 */
  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  // displayNumber 存储卡片在实验列表中的两位序号。
  const displayNumber = String(index + 1).padStart(2, '0')

  return (
    <article
      ref={containerRef}
      className="group border-border bg-card hover:border-mint overflow-hidden rounded-lg border transition-colors"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={item.path}>
        <div className="border-border bg-muted aspect-[16/10] w-full overflow-hidden border-b">
          {isVisible ? (
            <video
              ref={videoRef}
              src={item.src}
              width={600}
              height={400}
              className="h-full w-full object-cover"
              poster="/frontend-lab/animation-cover.png"
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="bg-muted flex h-full w-full items-center justify-center">
              <div className="text-muted-foreground font-mono text-xs">PREPARING PREVIEW</div>
            </div>
          )}
        </div>
        <div className="flex min-h-20 items-center justify-between gap-4 p-4">
          <div>
            <p className="text-mint mb-1 font-mono text-[11px] font-bold">{displayNumber} / MOTION</p>
            <h2 className="text-foreground m-0 text-base font-semibold">{item.name}</h2>
          </div>
          <span
            className="text-muted-foreground group-hover:text-mint text-lg transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </div>
      </Link>
    </article>
  )
}
