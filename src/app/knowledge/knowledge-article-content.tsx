'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy } from 'lucide-react'
import { common, createLowlight } from 'lowlight'
import { KnowledgeCodeSandbox } from '@/components/knowledge-code-sandbox'
import { Button } from '@/components/ui'
import type { KnowledgeSandbox } from '@/lib/knowledge-sandbox'

/** 复制成功状态保持的毫秒数。 */
const COPY_SUCCESS_DURATION_MS = 1600

/** Markdown 代码围栏转换为 class 时使用的语言前缀。 */
const CODE_LANGUAGE_CLASS_PREFIX = 'language-'

/** 未声明语言的代码块使用的展示名称。 */
const DEFAULT_CODE_LANGUAGE = 'text'

/** 知识文章正文使用的常见语言语法高亮器。 */
const knowledgeCodeHighlighter = createLowlight(common)

/** Lowlight 返回的安全语法树节点。 */
interface KnowledgeSyntaxNode {
  /** 文本或高亮元素节点类型。 */
  type: 'text' | 'element'
  /** 文本节点保存的源码片段。 */
  value?: string
  /** 元素节点携带的 hljs class。 */
  properties?: {
    /** Lowlight 生成的一个或多个样式类。 */
    className?: string | string[]
  }
  /** 元素节点包含的嵌套语法片段。 */
  children?: KnowledgeSyntaxNode[]
}

/**
 * 从 Markdown 输出的 code class 中提取声明语言。
 * @param codeElement 当前块级代码中的 code 元素。
 * @returns 标准化为小写的语言名，未声明时返回 text。
 */
function getCodeLanguage(codeElement: HTMLElement | null): string {
  /** 当前 code 元素上形如 language-python 的样式类。 */
  const languageClassName = Array.from(codeElement?.classList || []).find((className) =>
    className.startsWith(CODE_LANGUAGE_CLASS_PREFIX)
  )
  return languageClassName?.slice(CODE_LANGUAGE_CLASS_PREFIX.length).toLowerCase() || DEFAULT_CODE_LANGUAGE
}

/**
 * 将 Lowlight 语法树安全转换为浏览器 DOM，不拼接或注入 HTML 字符串。
 * @param parentNode 当前高亮片段应写入的父节点。
 * @param syntaxNode 当前需要渲染的 Lowlight 节点。
 */
function appendSyntaxNode(parentNode: Node, syntaxNode: KnowledgeSyntaxNode): void {
  if (syntaxNode.type === 'text') {
    parentNode.appendChild(document.createTextNode(syntaxNode.value || ''))
    return
  }

  /** Lowlight 语法元素统一使用 span，避免高亮结果引入其他标签。 */
  const spanElement = document.createElement('span')
  /** 仅保留 Lowlight 约定的 hljs class。 */
  const classNames = Array.isArray(syntaxNode.properties?.className)
    ? syntaxNode.properties.className
    : syntaxNode.properties?.className
      ? [syntaxNode.properties.className]
      : []
  spanElement.className = classNames.filter((className) => /^hljs-[a-z\d_-]+$/i.test(className)).join(' ')
  syntaxNode.children?.forEach((childNode) => appendSyntaxNode(spanElement, childNode))
  parentNode.appendChild(spanElement)
}

/**
 * 按 Markdown 声明语言高亮代码；未注册语言使用常见语言自动识别。
 * @param codeElement 当前需要替换子节点的 code 元素。
 * @param language Markdown 围栏声明的语言。
 * @param sourceCode 复制和高亮共用的原始源码。
 */
function highlightCodeElement(codeElement: HTMLElement, language: string, sourceCode: string): void {
  try {
    /** 已声明语言优先精确高亮，未知语言在常见语法中自动匹配。 */
    const syntaxTree = knowledgeCodeHighlighter.registered(language)
      ? knowledgeCodeHighlighter.highlight(language, sourceCode)
      : knowledgeCodeHighlighter.highlightAuto(sourceCode)
    codeElement.replaceChildren()
    syntaxTree.children.forEach((syntaxNode) => appendSyntaxNode(codeElement, syntaxNode as KnowledgeSyntaxNode))
    codeElement.classList.add('hljs')
  } catch {
    // 单个未知或异常语法不能影响文章阅读，失败时保留原始纯文本代码。
    codeElement.textContent = sourceCode
  }
}

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
  /** 替换入口源码或插入源码章节的 React 挂载节点。 */
  mountNode: HTMLDivElement
  /** 被集成式沙盒替换的原始入口代码块。 */
  sourceElement?: HTMLPreElement
}

/**
 * 统一比较 Markdown 代码块与沙盒文件时的换行和首尾空白。
 * @param sourceCode 正文代码块或实验文件的完整源码。
 * @returns 可用于精确匹配的标准化源码。
 */
function normalizeSandboxSource(sourceCode: string): string {
  return sourceCode.replace(/\r\n?/g, '\n').trim()
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
    /** 正文中可能与沙盒入口文件完全匹配的非 Mermaid 代码块。 */
    const sourceCodeElements = Array.from(contentElement.querySelectorAll<HTMLPreElement>('pre')).filter(
      (sourceElement) => !sourceElement.querySelector('code.language-mermaid')
    )
    /** 已分配给其他沙盒的源码块，防止多实验重复替换。 */
    const claimedSourceElements = new Set<HTMLPreElement>()
    /** 无匹配代码时的插入锚点，优先放在源码章节说明之后。 */
    let fallbackAnchorElement: Element | null =
      sourceHeading?.nextElementSibling?.tagName === 'P' ? sourceHeading.nextElementSibling : sourceHeading || null
    /** 为每个白名单实验创建的正文挂载点。 */
    const nextSandboxPortals = sandboxes.map((sandbox) => {
      /** 当前在线实验的 React 挂载节点。 */
      const mountNode = document.createElement('div')
      /** 当前实验入口文件的仓库源码。 */
      const entrySource = sandbox.files.find((file) => file.name === sandbox.entryFile)?.content || ''
      /** 正文中与实际执行入口完全一致的代码块。 */
      const matchingSourceElement = entrySource
        ? sourceCodeElements.find(
            (sourceElement) =>
              !claimedSourceElements.has(sourceElement) &&
              normalizeSandboxSource(sourceElement.textContent || '') === normalizeSandboxSource(entrySource)
          )
        : undefined
      /** 与实验标题匹配的正文知识点标题。 */
      const contextualHeadingElement = Array.from(
        contentElement.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4, h5, h6')
      ).find((headingElement) => headingElement.textContent?.includes(sandbox.title))
      /** 知识点标题后第一个代码块，HTML 实验会紧跟它展示且保留服务端示例。 */
      let contextualSourceElement: HTMLPreElement | null = null
      /** 知识点标题后最后一个 Python 代码块，优先于依赖清单等辅助代码。 */
      let contextualPythonSourceElement: HTMLPreElement | null = null
      /** 从标题后的同级内容中寻找当前知识点代码块。 */
      let contextualSiblingElement = contextualHeadingElement?.nextElementSibling || null
      while (contextualSiblingElement && !/^H[1-6]$/.test(contextualSiblingElement.tagName)) {
        if (contextualSiblingElement.tagName === 'PRE') {
          contextualSourceElement = contextualSiblingElement as HTMLPreElement
          if (contextualSiblingElement.querySelector('code.language-python')) {
            contextualPythonSourceElement = contextualSourceElement
          }
        }
        contextualSiblingElement = contextualSiblingElement.nextElementSibling
      }
      contextualSourceElement = contextualPythonSourceElement || contextualSourceElement
      mountNode.className = 'knowledge-code-sandbox-mount'

      if (matchingSourceElement) {
        claimedSourceElements.add(matchingSourceElement)
        matchingSourceElement.replaceWith(mountNode)
      } else if (sandbox.runtime === 'html' && contextualSourceElement) {
        contextualSourceElement.after(mountNode)
      } else if (fallbackAnchorElement) {
        fallbackAnchorElement.after(mountNode)
        fallbackAnchorElement = mountNode
      } else {
        contentElement.append(mountNode)
      }

      return { sandbox, mountNode, sourceElement: matchingSourceElement }
    })

    setSandboxPortals(nextSandboxPortals)

    return () => {
      nextSandboxPortals.forEach(({ mountNode, sourceElement }) => {
        if (sourceElement && mountNode.isConnected) {
          mountNode.replaceWith(sourceElement)
          return
        }

        mountNode.remove()
      })
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
      /** 当前 pre 内由 Markdown 生成的 code 元素。 */
      const sourceCodeElement = codeElement.querySelector<HTMLElement>('code')
      /** 当前代码块声明的语言。 */
      const codeLanguage = getCodeLanguage(sourceCodeElement)
      /** 高亮前保留的原始源码，同时用于复制。 */
      const sourceCode = codeElement.textContent?.trimEnd() || ''
      /** 代码块左上角的语言标识。 */
      const languageLabelElement = document.createElement('span')
      /** React 复制按钮的挂载节点。 */
      const mountNode = document.createElement('div')
      /** 当前代码块在文章内的稳定标识。 */
      const codeBlockId = `knowledge-code-${index + 1}`

      codeBlockWrapper.className = 'knowledge-code-block'
      codeBlockWrapper.dataset.language = codeLanguage
      languageLabelElement.className = 'knowledge-code-language'
      languageLabelElement.textContent = codeLanguage.toUpperCase()
      mountNode.className = 'knowledge-code-block-actions'
      if (sourceCodeElement) {
        highlightCodeElement(sourceCodeElement, codeLanguage, sourceCode)
      }
      codeElement.before(codeBlockWrapper)
      codeBlockWrapper.append(languageLabelElement, codeElement, mountNode)

      return {
        id: codeBlockId,
        code: sourceCode,
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
