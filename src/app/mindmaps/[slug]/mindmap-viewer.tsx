'use client'

import { useEffect, useRef } from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'

/** 思维导图画布的客户端参数。 */
interface MindmapViewerProps {
  markdown: string
  title: string
}

/** Markdown 到 Markmap 数据树的共享转换器。 */
const transformer = new Transformer()

/**
 * 把 Markdown 层级渲染为可缩放、拖动和折叠的 SVG 思维导图。
 * @param props 当前思维导图的原始 Markdown 与标题。
 */
export function MindmapViewer({ markdown, title }: MindmapViewerProps) {
  /** 承载 Markmap SVG 的元素引用。 */
  const svgRef = useRef<SVGSVGElement>(null)
  /** 当前 Markmap 实例引用。 */
  const markmapRef = useRef<Markmap | null>(null)

  useEffect(() => {
    if (!svgRef.current) {
      return
    }

    /** Markdown 转换后的 Markmap 数据树。 */
    const { root } = transformer.transform(markdown)
    /** 当前画布创建的 Markmap 实例。 */
    const markmap = Markmap.create(
      svgRef.current,
      {
        autoFit: true,
        duration: 300,
        fitRatio: 0.92,
        initialExpandLevel: 2,
        maxInitialScale: 1.1,
        maxWidth: 320,
        paddingX: 12,
        spacingHorizontal: 96,
        spacingVertical: 8
      },
      root
    )

    markmapRef.current = markmap

    return () => {
      markmap.destroy()
      markmapRef.current = null
    }
  }, [markdown])

  return (
    <div className="relative mt-[72px] h-[calc(100vh-72px)] min-h-[560px] overflow-hidden bg-white dark:bg-zinc-950">
      <div className="absolute top-5 left-5 z-10 max-w-[calc(100%-10rem)]">
        <h1 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</h1>
        <p className="mt-1 text-xs text-zinc-500">拖动画布，滚轮缩放，点击节点展开或收起</p>
      </div>

      <div className="absolute top-4 right-4 z-10 flex border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <button
          type="button"
          title="缩小"
          aria-label="缩小思维导图"
          onClick={() => void markmapRef.current?.rescale(0.8)}
          className="flex h-9 w-9 items-center justify-center border-r border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="放大"
          aria-label="放大思维导图"
          onClick={() => void markmapRef.current?.rescale(1.25)}
          className="flex h-9 w-9 items-center justify-center border-r border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="适应画布"
          aria-label="让思维导图适应画布"
          onClick={() => void markmapRef.current?.fit()}
          className="flex h-9 w-9 items-center justify-center text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      <svg ref={svgRef} className="mindmap-canvas h-full w-full" aria-label={`${title}思维导图`} />
    </div>
  )
}
