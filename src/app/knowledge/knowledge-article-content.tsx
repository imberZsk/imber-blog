'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy } from 'lucide-react'
import { KnowledgeCodeSandbox } from '@/components/knowledge-code-sandbox'
import { Button } from '@/components/ui'
import type { KnowledgeSandbox } from '@/lib/knowledge-sandbox'

/** 复制成功状态保持的毫秒数。 */
const COPY_SUCCESS_DURATION_MS = 1600

/** 文章正文组件接收的服务端渲染 HTML。 */
interface KnowledgeArticleContentProps {
  content: string
  /** 当前文章允许直接运行的仓库可信实验。 */
  sandboxes: KnowledgeSandbox[]
}

/** 单个代码块及其 React 操作按钮挂载信息。 */
interface KnowledgeCodeBlockPortal {
  id: string
  code: string
  mountNode: HTMLDivElement
  codeElement: HTMLPreElement
  wrapperNode: HTMLDivElement
}

/** Mermaid 源代码块与渲染后图形之间的恢复信息。 */
interface KnowledgeMermaidDiagram {
  sourceElement: HTMLPreElement
  renderedElement: HTMLElement
}

/** 在线实验及其正文内 React 挂载节点。 */
interface KnowledgeSandboxPortal {
  /** 当前白名单实验的完整配置。 */
  sandbox: KnowledgeSandbox
  /** 插入“可运行源码”标题前的 React 挂载节点。 */
  mountNode: HTMLDivElement
}

/**
 * 渲染知识文章正文，并为其中的块级代码添加复制操作。
 * @param props 服务端生成的文章 HTML。
 */
export function KnowledgeArticleContent({ content, sandboxes }: KnowledgeArticleContentProps) {
  /** 文章正文根节点，用于查找服务端生成的代码块。 */
  const contentRef = useRef<HTMLDivElement>(null)
  /** 复制成功状态的清理计时器。 */
  const copyResetTimerRef = useRef<number | null>(null)
  /** 当前正文内可复制代码块的挂载信息。 */
  const [codeBlockPortals, setCodeBlockPortals] = useState<KnowledgeCodeBlockPortal[]>([])
  /** 最近成功复制的代码块标识。 */
  const [copiedCodeBlockId, setCopiedCodeBlockId] = useState<string | null>(null)
  /** 当前文章在线实验在正文内的挂载信息。 */
  const [sandboxPortals, setSandboxPortals] = useState<KnowledgeSandboxPortal[]>([])

  useEffect(() => {
    /** 当前文章正文根节点，Mermaid 只处理其中明确标记的代码块。 */
    const contentElement = contentRef.current
    if (!contentElement) {
      return
    }

    /** 文章中等待转换为图形的 Mermaid 源代码块。 */
    const mermaidSourceElements = Array.from(contentElement.querySelectorAll<HTMLPreElement>('pre')).filter(
      (sourceElement) => Boolean(sourceElement.querySelector('code.language-mermaid'))
    )
    /** Effect 清理后阻止异步渲染继续修改 DOM。 */
    let hasDisposed = false
    /** 已完成替换的图形节点，用于正文变化或卸载时恢复 React 生成的源 DOM。 */
    const renderedDiagrams: KnowledgeMermaidDiagram[] = []

    /** 把每个 Mermaid 源代码块转换为安全 SVG，失败时保留原始代码便于排查。 */
    const renderMermaidDiagrams = async () => {
      /** Mermaid 浏览器运行时按需加载，普通文章不增加首屏执行成本。 */
      const { default: mermaid } = await import('mermaid')
      /** 当前系统颜色模式用于选择与文章背景一致的图形主题。 */
      const diagramTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default'

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: diagramTheme
      })

      for (const [diagramIndex, sourceElement] of mermaidSourceElements.entries()) {
        /** 当前代码块中的 Mermaid 定义文本。 */
        const diagramSource = sourceElement.textContent?.trim()
        if (!diagramSource || hasDisposed) {
          continue
        }

        try {
          /** 当前图在页面中的唯一 DOM 标识。 */
          const diagramId = `knowledge-mermaid-${diagramIndex + 1}-${Date.now()}`
          /** Mermaid 返回的 SVG 和可选交互绑定函数。 */
          const { svg, bindFunctions } = await mermaid.render(diagramId, diagramSource)
          if (hasDisposed || !sourceElement.isConnected) {
            continue
          }

          /** 图形的语义化外层元素。 */
          const figureElement = document.createElement('figure')
          /** 承载宽图横向滚动的内部容器。 */
          const diagramCanvas = document.createElement('div')
          /** 紧随代码块的图示说明，用作无障碍标签。 */
          const diagramDescription = sourceElement.nextElementSibling?.textContent?.trim()

          figureElement.className = 'knowledge-mermaid-diagram'
          figureElement.setAttribute('aria-label', diagramDescription || '文章流程图')
          diagramCanvas.className = 'knowledge-mermaid-canvas'
          diagramCanvas.innerHTML = svg
          figureElement.append(diagramCanvas)
          sourceElement.replaceWith(figureElement)
          bindFunctions?.(diagramCanvas)
          renderedDiagrams.push({ sourceElement, renderedElement: figureElement })
        } catch {
          // 修复无效图表导致整篇正文消失：保留带错误标记的 Mermaid 源码作为可诊断降级。
          sourceElement.classList.add('knowledge-mermaid-source-error')
          sourceElement.setAttribute('title', '图表渲染失败，已保留 Mermaid 源代码')
        }
      }
    }

    void renderMermaidDiagrams()

    return () => {
      hasDisposed = true
      renderedDiagrams.forEach(({ sourceElement, renderedElement }) => {
        if (renderedElement.isConnected) {
          renderedElement.replaceWith(sourceElement)
        }
      })
    }
  }, [content])

  useEffect(() => {
    /** 当前文章正文根节点。 */
    const contentElement = contentRef.current
    if (!contentElement || sandboxes.length === 0) {
      setSandboxPortals([])
      return
    }

    /** 自动附加源码时生成的章节标题，用作在线实验的插入锚点。 */
    const sourceHeading = Array.from(contentElement.querySelectorAll<HTMLHeadingElement>('h2')).find(
      (headingElement) => headingElement.textContent?.trim() === '可运行源码'
    )
    /** 为每个白名单实验创建的正文挂载点。 */
    const nextSandboxPortals = sandboxes.map((sandbox) => {
      /** 当前在线实验的 React 挂载节点。 */
      const mountNode = document.createElement('div')
      mountNode.className = 'knowledge-code-sandbox-mount'

      if (sourceHeading) {
        sourceHeading.before(mountNode)
      } else {
        contentElement.append(mountNode)
      }

      return { sandbox, mountNode }
    })

    setSandboxPortals(nextSandboxPortals)

    return () => {
      nextSandboxPortals.forEach(({ mountNode }) => mountNode.remove())
    }
  }, [content, sandboxes])

  useEffect(() => {
    /** 当前正文内包含实际文本的块级代码元素。 */
    const codeElements = Array.from(contentRef.current?.querySelectorAll<HTMLPreElement>('pre') || []).filter(
      (codeElement) => Boolean(codeElement.textContent?.trim()) && !codeElement.querySelector('code.language-mermaid')
    )
    /** 为每个代码块创建的按钮挂载点。 */
    const nextCodeBlockPortals = codeElements.map((codeElement, index) => {
      /** 包裹代码和悬浮操作按钮的容器。 */
      const codeBlockWrapper = document.createElement('div')
      /** React 复制按钮的挂载节点。 */
      const mountNode = document.createElement('div')
      /** 当前代码块在文章内的稳定标识。 */
      const codeBlockId = `knowledge-code-${index + 1}`

      codeBlockWrapper.className = 'knowledge-code-block'
      mountNode.className = 'knowledge-code-block-actions'
      codeElement.before(codeBlockWrapper)
      codeBlockWrapper.append(codeElement, mountNode)

      return {
        id: codeBlockId,
        code: codeElement.textContent?.trimEnd() || '',
        mountNode,
        codeElement,
        wrapperNode: codeBlockWrapper
      }
    })

    setCodeBlockPortals(nextCodeBlockPortals)

    return () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current)
      }

      nextCodeBlockPortals.forEach((codeBlockPortal) => {
        if (!codeBlockPortal.wrapperNode.isConnected) {
          return
        }

        codeBlockPortal.wrapperNode.before(codeBlockPortal.codeElement)
        codeBlockPortal.wrapperNode.remove()
      })
    }
  }, [content])

  /**
   * 将对应代码块完整复制到系统剪贴板。
   * @param event 代码块复制按钮的点击事件。
   */
  const handleCopyCode = async (event: MouseEvent<HTMLButtonElement>) => {
    /** 当前按钮关联的代码块标识。 */
    const codeBlockId = event.currentTarget.dataset.codeBlockId
    /** 当前按钮关联的代码块内容。 */
    const codeBlock = codeBlockPortals.find((codeBlockPortal) => codeBlockPortal.id === codeBlockId)
    if (!codeBlock || !navigator.clipboard) {
      return
    }

    await navigator.clipboard.writeText(codeBlock.code)
    setCopiedCodeBlockId(codeBlock.id)

    if (copyResetTimerRef.current !== null) {
      window.clearTimeout(copyResetTimerRef.current)
    }

    copyResetTimerRef.current = window.setTimeout(() => {
      setCopiedCodeBlockId(null)
      copyResetTimerRef.current = null
    }, COPY_SUCCESS_DURATION_MS)
  }

  return (
    <div ref={contentRef}>
      <div dangerouslySetInnerHTML={{ __html: content }} />
      {codeBlockPortals.map((codeBlockPortal) =>
        createPortal(
          <Button
            key={codeBlockPortal.id}
            type="button"
            variant="secondary"
            size="icon"
            className="border-border bg-background/90 size-8 rounded-md border backdrop-blur-sm"
            data-code-block-id={codeBlockPortal.id}
            aria-label={copiedCodeBlockId === codeBlockPortal.id ? '代码已复制' : '复制代码'}
            title={copiedCodeBlockId === codeBlockPortal.id ? '已复制' : '复制代码'}
            onClick={handleCopyCode}
          >
            {copiedCodeBlockId === codeBlockPortal.id ? <Check /> : <Copy />}
          </Button>,
          codeBlockPortal.mountNode
        )
      )}
      {sandboxPortals.map(({ sandbox, mountNode }) =>
        createPortal(<KnowledgeCodeSandbox key={sandbox.id} sandbox={sandbox} />, mountNode)
      )}
    </div>
  )
}
