'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronsDownUp, ChevronsUpDown, Maximize2, Minus, Network, Plus } from 'lucide-react'
import { Transformer, type ITransformResult } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import { Button } from '@/components/ui'

/** 思维导图在独立页面或文章内的展示方式。 */
export type InteractiveMindmapVariant = 'page' | 'article'

/** 可复用交互式思维导图的参数。 */
interface InteractiveMindmapProps {
  /** 具有标题层级的 Markmap Markdown。 */
  markdown: string
  /** 画布的无障碍名称与页面标题。 */
  title: string
  /** 当前画布采用全屏页还是文章内嵌布局。 */
  variant: InteractiveMindmapVariant
  /** 独立页面用于替换静态标题的可交互标题控件。 */
  pageTitleControl?: ReactNode
  /** 文章内显示的知识节点数量。 */
  nodeCount?: number
}

/** Markdown 到 Markmap 数据树的共享转换器。 */
const transformer = new Transformer()

/** navigator.platform 中用于识别 macOS 的关键词。 */
const MACOS_PLATFORM_KEYWORD = 'mac'

/** 非 macOS 平台沿用 Markmap 默认滚轮缩放提示。 */
const DEFAULT_ZOOM_GESTURE_LABEL = '滚轮缩放'

/** macOS 平台使用 Command 配合滚轮进行缩放。 */
const MACOS_ZOOM_GESTURE_LABEL = '⌘ + 滚轮缩放'

/** Markmap 转换结果中可直接交给画布渲染的根节点。 */
type MarkmapRootNode = ITransformResult['root']

/**
 * 递归设置所有分支的折叠状态，用于文章思维导图的全部展开与收起。
 * @param node 当前处理的 Markmap 节点。
 * @param fold 目标折叠状态，0 表示展开，1 表示收起当前分支。
 * @param isRoot 当前节点是否为根节点，根节点必须保持展开才能看到一级知识点。
 */
function setMindmapFoldState(node: MarkmapRootNode, fold: 0 | 1, isRoot = true): void {
  /** 当前节点是否拥有可展开或收起的子节点。 */
  const hasChildren = node.children.length > 0

  if (!isRoot && hasChildren) {
    node.payload = { ...node.payload, fold }
  }

  node.children.forEach((childNode) => setMindmapFoldState(childNode, fold, false))
}

/**
 * 将 Markdown 知识树渲染为可拖动、缩放和折叠的 Markmap。
 * @param props 思维导图内容、标题、布局和可选节点数。
 */
export function InteractiveMindmap({ markdown, title, variant, pageTitleControl, nodeCount }: InteractiveMindmapProps) {
  /** 承载 Markmap SVG 的元素引用。 */
  const svgRef = useRef<SVGSVGElement>(null)
  /** 当前 Markmap 实例引用。 */
  const markmapRef = useRef<Markmap | null>(null)
  /** 根据当前操作系统展示准确的滚轮缩放方式。 */
  const [zoomGestureLabel, setZoomGestureLabel] = useState(DEFAULT_ZOOM_GESTURE_LABEL)

  /** 创建思维导图实例，并配置当前平台对应的缩放手势。 */
  useEffect(() => {
    if (!svgRef.current) {
      return
    }

    /** Markdown 转换后的 Markmap 数据树。 */
    const { root } = transformer.transform(markdown)
    /** 文章画布需要更紧凑的节点宽度和间距。 */
    const isArticleVariant = variant === 'article'
    /** 当前画布创建的 Markmap 实例。 */
    const markmap = Markmap.create(
      svgRef.current,
      {
        autoFit: true,
        duration: 300,
        fitRatio: isArticleVariant ? 0.88 : 0.92,
        initialExpandLevel: 2,
        maxInitialScale: 1.1,
        maxWidth: isArticleVariant ? 240 : 320,
        paddingX: 12,
        spacingHorizontal: isArticleVariant ? 72 : 96,
        spacingVertical: 8
      }
    )
    /**
     * 修复响应式 SVG 未声明原生尺寸时 d3-zoom 读取 SVGLength.value 报错的问题。
     * @returns 基于当前布局尺寸的缩放视口范围。
     */
    markmap.zoom.extent((): [[number, number], [number, number]] => {
      const { width, height } = svgRef.current?.getBoundingClientRect() ?? { width: 0, height: 0 }

      return [
        [0, 0],
        [width, height]
      ]
    })
    /** 在缩放视口准备完成后提交转换后的知识树，确保首次自适应使用动态尺寸。 */
    void markmap.setData(root)
    /** 当前浏览器是否运行在 macOS。 */
    const isMacOS = navigator.platform.toLowerCase().includes(MACOS_PLATFORM_KEYWORD)

    setZoomGestureLabel(isMacOS ? MACOS_ZOOM_GESTURE_LABEL : DEFAULT_ZOOM_GESTURE_LABEL)

    if (isMacOS) {
      /**
       * Markmap 在 macOS 的滚轮平移模式中硬编码了 ctrlKey；这里让 Command+滚轮执行缩放。
       * @param event Markmap 交给 D3 Zoom 的鼠标或滚轮事件。
       */
      const filterMacOSZoomGesture = (event: MouseEvent | WheelEvent): boolean => {
        if (event.type === 'wheel') {
          return event.metaKey && !event.button
        }

        return !event.ctrlKey && !event.button
      }

      markmap.zoom.filter(filterMacOSZoomGesture)
    }

    markmapRef.current = markmap

    return () => {
      markmap.destroy()
      markmapRef.current = null
    }
  }, [markdown, variant])

  /**
   * 按用户命令更新文章思维导图的全部分支，并在重新布局后适应画布。
   * @param shouldExpand true 表示展开全部分支，false 表示仅保留一级知识结构。
   */
  const setAllArticleBranchesExpanded = async (shouldExpand: boolean): Promise<void> => {
    /** 每次从 Markdown 重新转换，避免沿用 Markmap 交互过程中已被修改的节点状态。 */
    const { root } = transformer.transform(markdown)

    setMindmapFoldState(root, shouldExpand ? 0 : 1)
    // 修复显式展开仍被默认层级重新折叠的问题：用户操作后以节点自身的 fold 状态为准。
    await markmapRef.current?.setData(root, { initialExpandLevel: -1 })
    await markmapRef.current?.fit()
  }

  /** 复用于两种布局的缩放与适应画布工具栏。 */
  const controls = (
    <div className="border-border bg-card absolute top-3 right-3 z-10 flex gap-1 rounded-md border p-1 shadow-sm">
      {variant === 'article' ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="全部展开"
            aria-label="展开思维导图的全部知识点"
            onClick={() => void setAllArticleBranchesExpanded(true)}
          >
            <ChevronsUpDown aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="全部收起"
            aria-label="收起思维导图的知识点详情"
            onClick={() => void setAllArticleBranchesExpanded(false)}
          >
            <ChevronsDownUp aria-hidden="true" />
          </Button>
        </>
      ) : null}
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
  )

  if (variant === 'page') {
    return (
      <div className="bg-background relative mt-[72px] h-[calc(100vh-72px)] min-h-[560px] overflow-hidden">
        <div className="absolute top-5 left-5 z-10 max-w-[calc(100%-10rem)]">
          <h1 className={pageTitleControl ? 'sr-only' : 'text-foreground truncate text-sm font-medium'}>{title}</h1>
          {pageTitleControl}
          <p className="text-muted-foreground mt-2 text-xs">拖动画布，{zoomGestureLabel}，点击节点展开或收起</p>
        </div>
        {controls}
        <svg ref={svgRef} className="mindmap-canvas h-full w-full" aria-label={`${title}思维导图`} />
      </div>
    )
  }

  return (
    <section className="knowledge-mindmap" aria-labelledby="knowledge-mindmap-title">
      <header className="knowledge-mindmap-header">
        <Network aria-hidden="true" />
        <div>
          <h2 id="knowledge-mindmap-title">知识点思维导图</h2>
          <p>{nodeCount ? `${nodeCount} 个知识节点` : title}</p>
        </div>
      </header>
      <div className="knowledge-mindmap-canvas-wrap">
        {controls}
        <svg ref={svgRef} className="mindmap-canvas h-full w-full" aria-label={`${title}知识点思维导图`} />
      </div>
    </section>
  )
}
