'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ExternalLink, Download } from 'lucide-react'
import { GitHubFile } from './types'
import { GITHUB_CONFIG } from '@/services/gallery/const'
import { useEffect, useState } from 'react'
import Loading from '@/components/Loading'

// 生成图片 CDN URL
const getImageCDNUrl = (file: GitHubFile) => {
  return `https://cdn.jsdelivr.net/gh/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${file.path}`
}

const Waterfall = ({ data }: { data: GitHubFile[] }) => {
  const gap = 20 // 间隙
  const minWidth = 300 // 最小宽度

  const [positions, setPositions] = useState<{ top: number; left: number; width: number; height: number }[]>([])
  const [containerHeight, setContainerHeight] = useState(0)

  useEffect(() => {
    const getPositions = () => {
      // 容器的宽度
      const containerWidth = document.querySelector('.waterfall-container')?.clientWidth

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
    const timer = setTimeout(getPositions, 1000)

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

  const getAspectRatio = (fileName: string) => {
    const fileNameParts = fileName.split('/').pop()?.split('-')
    const dimensions = fileNameParts?.[1]?.split('x')
    const originalWidth = parseInt(dimensions?.[0] || '0')
    const originalHeight = parseInt(dimensions?.[1] || '0')

    return originalHeight / originalWidth
  }

  return (
    <div
      className="waterfall-container relative mx-auto w-full max-w-[1920px]"
      style={{ height: `${containerHeight}px` }}
    >
      {positions.length !== data.length && <Loading />}

      {positions.length === data.length &&
        data.map((file, index) => {
          const fileName = getImageCDNUrl(file)

          return (
            <div
              key={index}
              className="group absolute overflow-hidden rounded-xs bg-zinc-50 object-contain shadow-sm ring-1 ring-zinc-200 transition-all hover:shadow-lg hover:ring-zinc-300 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:ring-zinc-600"
              style={{
                top: `${positions[index].top}px`,
                left: `${positions[index].left}px`,
                width: `${positions[index].width}px`,
                height: `${positions[index].height}px`
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
  )
}

export default Waterfall
