'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui'

/** 复制成功状态保持的毫秒数。 */
const COPY_SUCCESS_DURATION_MS = 1600

/** 文章正文组件接收的服务端渲染 HTML。 */
interface KnowledgeArticleContentProps {
  content: string
}

/** 单个代码块及其 React 操作按钮挂载信息。 */
interface KnowledgeCodeBlockPortal {
  id: string
  code: string
  mountNode: HTMLDivElement
  codeElement: HTMLPreElement
  wrapperNode: HTMLDivElement
}

/**
 * 渲染知识文章正文，并为其中的块级代码添加复制操作。
 * @param props 服务端生成的文章 HTML。
 */
export function KnowledgeArticleContent({ content }: KnowledgeArticleContentProps) {
  /** 文章正文根节点，用于查找服务端生成的代码块。 */
  const contentRef = useRef<HTMLDivElement>(null)
  /** 复制成功状态的清理计时器。 */
  const copyResetTimerRef = useRef<number | null>(null)
  /** 当前正文内可复制代码块的挂载信息。 */
  const [codeBlockPortals, setCodeBlockPortals] = useState<KnowledgeCodeBlockPortal[]>([])
  /** 最近成功复制的代码块标识。 */
  const [copiedCodeBlockId, setCopiedCodeBlockId] = useState<string | null>(null)

  useEffect(() => {
    /** 当前正文内包含实际文本的块级代码元素。 */
    const codeElements = Array.from(contentRef.current?.querySelectorAll<HTMLPreElement>('pre') || []).filter(
      (codeElement) => Boolean(codeElement.textContent?.trim())
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
    </div>
  )
}
