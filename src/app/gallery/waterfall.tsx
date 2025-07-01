'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ExternalLink, Download } from 'lucide-react'
import { GITHUB_CONFIG } from '@/services/gallery/const'
import { useCallback, useEffect, useState } from 'react'
import Loading from '@/components/Loading'
import { GitHubFile } from '@/services/gallery/types'
// import { DEFAULT_ESTIMATED_ITEM_SIZE } from './const'
import { Position } from './type'

// 缓冲区
const buffer = 5
const gap = 20 // 间隙
const minWidth = 300 // 最小宽度

// 生成图片 CDN URL
const getImageCDNUrl = (file: GitHubFile) => {
  return `https://cdn.jsdelivr.net/gh/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${file.path}`
}

// 获取宽高比，用于计算元素高度
const getAspectRatio = (fileName: string) => {
  const fileNameParts = fileName.split('/').pop()?.split('-')
  const dimensions = fileNameParts?.[1]?.split('x')
  const originalWidth = parseInt(dimensions?.[0] || '0')
  const originalHeight = parseInt(dimensions?.[1] || '0')

  return originalHeight / originalWidth
}

// 虚拟列表获取开始的索引
const getStartIndex = (scrollTop: number, newPositions: Position[]) => {
  for (let i = 0; i < newPositions.length; i++) {
    // 如果当前元素的 top 加上高度大于 scrollTop，则返回当前索引
    if (newPositions[i].top + newPositions[i].height > scrollTop) {
      return i
    }
  }
  return 0
}

// 虚拟列表获取结束的索引
const getEndIndex = (scrollTop: number, viewportHeight: number, newPositions: Position[]) => {
  // 可见区域底部
  const visibleBottom = scrollTop + viewportHeight
  // 遍历每个元素，如果当前元素的 top 大于可见区域底部，则返回当前索引
  for (let i = 0; i < newPositions.length; i++) {
    if (newPositions[i].top > visibleBottom) {
      return i
    }
  }
  return newPositions.length - 1
}

const Waterfall = ({ data }: { data: GitHubFile[] }) => {
  const [positions, setPositions] = useState<Position[]>([])
  const [containerHeight, setContainerHeight] = useState(0)

  const [scrollTop, setScrollTop] = useState(0)
  const [startIndex, setStartIndex] = useState(0)
  const [endIndex, setEndIndex] = useState(0)

  // 滚动事件
  const onScroll = useCallback(() => {
    setScrollTop(window.scrollY)
  }, [])

  // 监听全局滚动
  useEffect(() => {
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])

  // 计算瀑布流，计算每个 item 的 position
  useEffect(() => {
    const getPositions = () => {
      const container = document.querySelector('.waterfall-container') as HTMLElement
      const containerWidth = container?.clientWidth

      if (!containerWidth) return

      // 1. 计算理论列数
      let columns = Math.floor(containerWidth / minWidth)

      // 2. 计算理论宽度
      let itemWidth = (containerWidth - (columns - 1) * gap) / columns

      // 3. 如果宽度小于最小值，减少列数
      while (itemWidth < minWidth && columns > 1) {
        columns--
        itemWidth = (containerWidth - (columns - 1) * gap) / columns
      }

      // 4. 初始化列高度数组
      const columnsArr = Array(columns).fill(0)
      const newPositions: { top: number; left: number; width: number; height: number }[] = []

      // 5. 计算每个图片的位置
      data.forEach((file) => {
        const fileName = getImageCDNUrl(file)

        // 获取宽高比
        const aspectRatio = getAspectRatio(fileName)

        // 计算高度
        const height = Math.floor(itemWidth * aspectRatio)

        // 找到最短的列
        const minIndex = columnsArr.indexOf(Math.min(...columnsArr))
        const top = columnsArr[minIndex]
        const left = minIndex * itemWidth + minIndex * gap

        // 添加位置信息
        newPositions.push({ top, left, width: itemWidth, height })

        // 更新该列的高度
        columnsArr[minIndex] = top + height + gap
      })

      // 6. 一次性设置所有位置
      setPositions(newPositions)
      setContainerHeight(Math.max(...columnsArr))
    }

    // 延迟执行确保DOM已渲染
    const timer = setTimeout(getPositions, 100)

    // 监听窗口大小变化
    const handleResize = () => {
      getPositions()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [data, gap, minWidth])

  // 独立的 useEffect 处理滚动时的虚拟列表计算
  useEffect(() => {
    if (positions.length === 0) return

    const viewportHeight = window.innerHeight

    const start = Math.max(0, getStartIndex(scrollTop, positions) - buffer)
    const end = Math.min(positions.length - 1, getEndIndex(scrollTop, viewportHeight, positions) + buffer)

    setStartIndex(start)
    setEndIndex(end)
  }, [scrollTop, positions])

  return (
    <div className="waterfall-container relative mx-auto w-full max-w-[1920px]">
      {/* 撑开滚动条的容器 */}
      <div className="relative w-full" style={{ height: `${containerHeight}px` }}>
        {positions.length !== data.length && <Loading />}

        {positions.length === data.length &&
          Array.from({ length: endIndex - startIndex + 1 }, (_, i) => {
            const realIndex = startIndex + i
            const file = data[realIndex]
            const fileName = getImageCDNUrl(file)

            if (file.name.endsWith('.mp4')) {
              return (
                <div
                  key={realIndex}
                  className="group absolute overflow-hidden rounded-xs bg-zinc-50 object-contain shadow-sm ring-1 ring-zinc-200 transition-all hover:shadow-lg hover:ring-zinc-300 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:ring-zinc-600"
                  style={{
                    top: `${positions[realIndex].top}px`,
                    left: `${positions[realIndex].left}px`,
                    width: `${positions[realIndex].width}px`,
                    height: `${positions[realIndex].height}px`
                  }}
                >
                  <video
                    src={fileName}
                    controls
                    preload="metadata"
                    width={positions[realIndex].width}
                    height={positions[realIndex].height}
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    style={{
                      width: '100%',
                      height: '100%'
                    }}
                  />
                </div>
              )
            }

            return (
              <div
                key={realIndex}
                className="group absolute overflow-hidden rounded-xs bg-zinc-50 object-contain shadow-sm ring-1 ring-zinc-200 transition-all hover:shadow-lg hover:ring-zinc-300 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:ring-zinc-600"
                style={{
                  top: `${positions[realIndex].top}px`,
                  left: `${positions[realIndex].left}px`,
                  width: `${positions[realIndex].width}px`,
                  height: `${positions[realIndex].height}px`
                }}
              >
                {/* 图片 */}
                <Image
                  src={fileName}
                  alt={file.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                />

                {/* 悬停遮罩 */}
                <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/20" />

                {/* 操作按钮 */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="flex gap-2">
                    {/* 在新窗口打开 */}
                    <Link
                      href={getImageCDNUrl(file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-white/90 p-2 text-zinc-900 shadow-lg transition-all hover:scale-105 hover:bg-white dark:bg-zinc-800/90 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      title="在新窗口打开"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>

                    {/* 下载图片 */}
                    <Link
                      href={file.download_url}
                      download={file.name}
                      className="rounded-full bg-white/90 p-2 text-zinc-900 shadow-lg transition-all hover:scale-105 hover:bg-white dark:bg-zinc-800/90 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      title="下载图片"
                    >
                      <Download className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                {/* 文件名 */}
                <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <p className="truncate text-sm text-white">{file.name}</p>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default Waterfall
