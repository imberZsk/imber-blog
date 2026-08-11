import { InteractiveMindmap } from '@/components/interactive-mindmap'

/** 思维导图画布的客户端参数。 */
interface MindmapViewerProps {
  markdown: string
  title: string
}

/**
 * 把 Markdown 层级渲染为可缩放、拖动和折叠的 SVG 思维导图。
 * @param props 当前思维导图的原始 Markdown 与标题。
 */
export function MindmapViewer({ markdown, title }: MindmapViewerProps) {
  return <InteractiveMindmap markdown={markdown} title={title} variant="page" />
}
