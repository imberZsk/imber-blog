'use client'

import { useEffect, useRef } from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import { Button } from '@/components/ui'

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
    <div className="bg-background relative mt-[72px] h-[calc(100vh-72px)] min-h-[560px] overflow-hidden">
      <div className="absolute top-5 left-5 z-10 max-w-[calc(100%-10rem)]">
        <h1 className="text-foreground truncate text-sm font-medium">{title}</h1>
        <p className="text-muted-foreground mt-1 text-xs">拖动画布，滚轮缩放，点击节点展开或收起</p>
      </div>

      <div className="border-border bg-card absolute top-4 right-4 z-10 flex gap-1 rounded-[18px] border p-1 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="缩小"
          aria-label="缩小思维导图"
          onClick={() => void markmapRef.current?.rescale(0.8)}
        >
          <Minus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="放大"
          aria-label="放大思维导图"
          onClick={() => void markmapRef.current?.rescale(1.25)}
        >
          <Plus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="适应画布"
          aria-label="让思维导图适应画布"
          onClick={() => void markmapRef.current?.fit()}
        >
          <Maximize2 aria-hidden="true" />
        </Button>
      </div>

      <svg ref={svgRef} className="mindmap-canvas h-full w-full" aria-label={`${title}思维导图`} />
    </div>
  )
}
