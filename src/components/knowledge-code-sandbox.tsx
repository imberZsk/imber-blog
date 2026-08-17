'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Check, CircleCheck, Copy, FileCode2, KeyRound, LoaderCircle, Play, RotateCcw, Square } from 'lucide-react'
import { common, createLowlight } from 'lowlight'
import { Button, Input } from '@/components/ui'
import type { KnowledgeSandbox } from '@/lib/knowledge-sandbox'

/** Python 运行时首次下载允许的最长时间。 */
const PYTHON_INITIALIZATION_TIMEOUT_MS = 60_000
/** Python 代码开始执行后的最长时间。 */
const PYTHON_EXECUTION_TIMEOUT_MS = 10_000
/** Python Worker 的同源静态资源路径。 */
const PYTHON_WORKER_URL = '/knowledge-python-worker.mjs'
/** Python Worker 使用 ES module，以便加载同源 Pyodide ESM 入口。 */
const PYTHON_WORKER_OPTIONS: WorkerOptions = {
  type: 'module' // 启用 Worker 内的静态 import 语法。
}
/** HTML 预览 iframe 的固定标题前缀。 */
const HTML_PREVIEW_TITLE_PREFIX = '在线实验预览：'
/** 复制成功状态的展示时长。 */
const COPY_SUCCESS_DURATION_MS = 1600
/** 浏览器等待同源模型代理的最长时间。 */
const MODEL_REQUEST_TIMEOUT_MS = 50_000
/** OpenAI 兼容接口默认地址。 */
const DEFAULT_MODEL_BASE_URL = 'https://api.openai.com/v1'
/** 常用模型选项；最后一项允许用户输入供应商自定义模型名。 */
const MODEL_OPTIONS = [
  ['gpt-4o-mini', 'OpenAI · gpt-4o-mini'],
  ['gpt-4.1-mini', 'OpenAI · gpt-4.1-mini'],
  ['custom', '自定义模型']
] as const
/** 在线实验源码使用的常见语言高亮器。 */
const sandboxCodeHighlighter = createLowlight(common)

/** 在线实验当前所处的执行状态。 */
type KnowledgeSandboxStatus = 'idle' | 'loading' | 'running' | 'success' | 'error' | 'stopped'

/** Python Worker 可能回传的消息。 */
interface PythonWorkerMessage {
  /** 消息对应的运行阶段或输出类型。 */
  type: 'stage' | 'ready' | 'stdout' | 'stderr' | 'complete' | 'error'
  /** 标准输出、标准错误或异常详情。 */
  text?: string
}

/** 同源模型代理的成功响应。 */
interface ModelSandboxResponse {
  /** 模型返回的正文。 */
  content?: string
  /** 供应商确认的模型名。 */
  model?: string
  /** 本轮请求的 Token 用量。 */
  usage?: {
    /** 输入 Token 数；供应商未返回时为 null。 */
    promptTokens?: number | null
    /** 输出 Token 数；供应商未返回时为 null。 */
    completionTokens?: number | null
    /** 总 Token 数；供应商未返回时为 null。 */
    totalTokens?: number | null
  }
  /** 安全校验或供应商返回的错误。 */
  error?: string
}

/** 文章在线实验组件接收的可信实验配置。 */
interface KnowledgeCodeSandboxProps {
  /** 服务端根据显式白名单生成的实验文件和元数据。 */
  sandbox: KnowledgeSandbox
  /** Tiptap NodeView 已直接展示可编辑源码时隐藏重复源码面板。 */
  showSource?: boolean
}

/** Lowlight 返回的安全语法树节点。 */
interface SandboxSyntaxNode {
  /** 文本或高亮元素节点类型。 */
  type: 'text' | 'element'
  /** 文本节点保存的源码片段。 */
  value?: string
  /** 元素节点携带的 hljs 样式类。 */
  properties?: {
    /** Lowlight 生成的一个或多个样式类。 */
    className?: string | string[]
  }
  /** 元素节点包含的嵌套语法片段。 */
  children?: SandboxSyntaxNode[]
}

/**
 * 根据实验文件名推断语法高亮语言。
 * @param fileName 当前实验文件名。
 * @returns Lowlight 支持的语言名。
 */
function getSandboxFileLanguage(fileName: string): string {
  /** 文件名中最后一段小写扩展名。 */
  const extension = fileName.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'py':
      return 'python'
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'htm':
    case 'html':
      return 'html'
    case 'yml':
    case 'yaml':
      return 'yaml'
    case 'md':
      return 'markdown'
    case 'json':
    case 'css':
    case 'bash':
    case 'sh':
    case 'sql':
      return extension
    default:
      return 'text'
  }
}

/**
 * 将 Lowlight 语法树转换为 React 节点，不注入 HTML 字符串。
 * @param syntaxNodes 当前需要渲染的语法树节点。
 * @returns 可直接放入 code 元素的 React 节点。
 */
function renderSandboxSyntaxNodes(syntaxNodes: SandboxSyntaxNode[]): ReactNode[] {
  return syntaxNodes.map((syntaxNode, syntaxNodeIndex) => {
    if (syntaxNode.type === 'text') {
      return syntaxNode.value || ''
    }

    /** 仅保留 Lowlight 约定的安全样式类。 */
    const classNames = Array.isArray(syntaxNode.properties?.className)
      ? syntaxNode.properties.className
      : syntaxNode.properties?.className
        ? [syntaxNode.properties.className]
        : []
    /** 用于 React 列表差异识别的当前节点标识。 */
    const syntaxNodeKey = `${syntaxNodeIndex}-${classNames.join('-')}`

    return (
      <span
        key={syntaxNodeKey}
        className={classNames.filter((className) => /^hljs-[a-z\d_-]+$/i.test(className)).join(' ')}
      >
        {renderSandboxSyntaxNodes(syntaxNode.children || [])}
      </span>
    )
  })
}

/**
 * 在文章中运行仓库内可信 Python 或 HTML Demo。
 * @param props 当前文章关联的白名单实验配置。
 */
export function KnowledgeCodeSandbox({ sandbox, showSource = true }: KnowledgeCodeSandboxProps) {
  /** 当前执行状态，用于控制操作按钮和状态文案。 */
  const [status, setStatus] = useState<KnowledgeSandboxStatus>('idle')
  /** Python 标准输出、标准错误及运行提示。 */
  const [outputLines, setOutputLines] = useState<string[]>([])
  /** HTML 预览递增版本，确保重新运行会重建 iframe。 */
  const [htmlPreviewVersion, setHtmlPreviewVersion] = useState(0)
  /** 当前源码面板展示的实验文件名。 */
  const [activeFileName, setActiveFileName] = useState(sandbox.entryFile)
  /** 源码复制成功时用于切换按钮反馈。 */
  const [hasCopiedSource, setHasCopiedSource] = useState(false)
  /** 当前 Python 实验独占的 Worker。 */
  const workerRef = useRef<Worker | null>(null)
  /** 当前真实模型请求的取消控制器。 */
  const modelRequestAbortRef = useRef<AbortController | null>(null)
  /** 初始化或执行阶段的超时计时器。 */
  const timeoutRef = useRef<number | null>(null)
  /** 复制成功状态的清理计时器。 */
  const copyResetTimerRef = useRef<number | null>(null)
  /** 用户本轮输入的 OpenAI 兼容 Base URL，不写入持久存储。 */
  const [modelBaseUrl, setModelBaseUrl] = useState(DEFAULT_MODEL_BASE_URL)
  /** 用户本轮输入的 API Key，只保存在当前组件内存。 */
  const [modelApiKey, setModelApiKey] = useState('')
  /** 当前下拉框选择的常用模型或自定义模式。 */
  const [selectedModel, setSelectedModel] = useState<(typeof MODEL_OPTIONS)[number][0]>('gpt-4o-mini')
  /** 自定义模式下提交给供应商的模型名。 */
  const [customModel, setCustomModel] = useState('')
  /** 本轮发送给真实模型的可编辑问题。 */
  const [modelPrompt, setModelPrompt] = useState(sandbox.modelRequest?.prompt || '')

  /** 当前实验入口对应的完整文件内容。 */
  const entrySource = useMemo(
    () => sandbox.files.find((file) => file.name === sandbox.entryFile)?.content || '',
    [sandbox.entryFile, sandbox.files]
  )
  /** 当前文件选择无效时回退到入口或第一个文件。 */
  const activeFile =
    sandbox.files.find((file) => file.name === activeFileName) ||
    sandbox.files.find((file) => file.name === sandbox.entryFile) ||
    sandbox.files[0]
  /** 当前源码文件对应的高亮语言。 */
  const activeFileLanguage = getSandboxFileLanguage(activeFile?.name || sandbox.entryFile)
  /** 当前源码转换后的安全语法树。 */
  const highlightedSource = useMemo(() => {
    /** 当前文件完整源码。 */
    const sourceCode = activeFile?.content || ''

    try {
      /** 已知语言精确高亮，其他文件使用常见语法自动识别。 */
      const syntaxTree = sandboxCodeHighlighter.registered(activeFileLanguage)
        ? sandboxCodeHighlighter.highlight(activeFileLanguage, sourceCode)
        : sandboxCodeHighlighter.highlightAuto(sourceCode)
      return syntaxTree.children as SandboxSyntaxNode[]
    } catch {
      return [{ type: 'text', value: sourceCode }] satisfies SandboxSyntaxNode[]
    }
  }, [activeFile, activeFileLanguage])
  /** 当前状态是否允许用户主动终止实验。 */
  const canStop = status === 'loading' || status === 'running'
  /** 当前状态是否已经呈现出实际运行区域。 */
  const hasStarted = status !== 'idle'
  /** 模型下拉框或自定义输入最终解析出的模型名。 */
  const resolvedModel = selectedModel === 'custom' ? customModel.trim() : selectedModel

  /**
   * 切换当前源码面板展示的文件。
   * @param event 文件标签按钮点击事件。
   */
  const selectSourceFile = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    /** 按钮数据属性中的目标文件名。 */
    const fileName = event.currentTarget.dataset.fileName
    if (fileName) {
      setActiveFileName(fileName)
      setHasCopiedSource(false)
    }
  }, [])

  /** 复制当前源码文件并给出短暂反馈。 */
  const copyActiveSource = useCallback(async () => {
    if (!activeFile || !navigator.clipboard) {
      return
    }

    await navigator.clipboard.writeText(activeFile.content)
    setHasCopiedSource(true)

    if (copyResetTimerRef.current !== null) {
      window.clearTimeout(copyResetTimerRef.current)
    }

    copyResetTimerRef.current = window.setTimeout(() => {
      setHasCopiedSource(false)
      copyResetTimerRef.current = null
    }, COPY_SUCCESS_DURATION_MS)
  }, [activeFile])

  /** 清除当前初始化或执行超时计时器。 */
  const clearRunTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  /** 销毁当前 Python Worker，释放内存并阻止继续输出。 */
  const disposeWorker = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    clearRunTimeout()
  }, [clearRunTimeout])

  /** 取消当前模型请求并释放对应的超时计时器。 */
  const disposeModelRequest = useCallback(() => {
    modelRequestAbortRef.current?.abort()
    modelRequestAbortRef.current = null
    clearRunTimeout()
  }, [clearRunTimeout])

  /**
   * 为当前运行阶段设置硬超时。
   * @param timeoutMs 当前阶段最多允许占用的毫秒数。
   * @param timeoutMessage 超时后展示给读者的可诊断信息。
   */
  const scheduleTimeout = useCallback(
    (timeoutMs: number, timeoutMessage: string) => {
      clearRunTimeout()
      timeoutRef.current = window.setTimeout(() => {
        disposeWorker()
        setOutputLines((currentLines) => [...currentLines, timeoutMessage])
        setStatus('error')
      }, timeoutMs)
    },
    [clearRunTimeout, disposeWorker]
  )

  /** 停止当前实验并保留已经产生的输出。 */
  const stopSandbox = useCallback(() => {
    disposeWorker()
    disposeModelRequest()
    setStatus('stopped')
    setOutputLines((currentLines) => [...currentLines, '已由用户终止运行。'])
  }, [disposeModelRequest, disposeWorker])

  /** 创建 Worker 并运行当前 Python 白名单实验。 */
  const runPythonSandbox = useCallback(() => {
    disposeWorker()
    setOutputLines(['正在加载浏览器 Python 运行时，首次运行通常需要数秒……'])
    setStatus('loading')

    /** 每次点击运行都创建独立 Worker，确保上一次代码不能残留。 */
    const worker = new Worker(PYTHON_WORKER_URL, PYTHON_WORKER_OPTIONS)
    workerRef.current = worker
    scheduleTimeout(PYTHON_INITIALIZATION_TIMEOUT_MS, 'Python 运行时加载超时，请检查网络后重试。')

    /**
     * 处理 Python Worker 的状态和输出消息。
     * @param event Worker 回传的可克隆消息。
     */
    worker.onmessage = (event: MessageEvent<PythonWorkerMessage>) => {
      /** Worker 当前回传的结构化消息。 */
      const message = event.data

      if (message.type === 'stage') {
        setOutputLines([message.text || '正在初始化 Python 运行时……'])
        return
      }

      if (message.type === 'ready') {
        setStatus('running')
        setOutputLines(['Python 运行时已就绪，开始执行 main.py。'])
        scheduleTimeout(PYTHON_EXECUTION_TIMEOUT_MS, '代码执行超过 10 秒，已自动终止。')
        return
      }

      if (message.type === 'stdout' || message.type === 'stderr') {
        setOutputLines((currentLines) => [...currentLines, message.text || ''])
        return
      }

      clearRunTimeout()
      if (message.type === 'complete') {
        setStatus('success')
        setOutputLines((currentLines) => [...currentLines, '执行完成。'])
        return
      }

      setStatus('error')
      setOutputLines((currentLines) => [...currentLines, message.text || 'Python 执行失败。'])
    }

    /** Worker 脚本或跨域运行时加载失败时给出明确结果。 */
    worker.onerror = () => {
      disposeWorker()
      setStatus('error')
      setOutputLines((currentLines) => [...currentLines, 'Python Worker 加载失败，请检查网络或浏览器策略。'])
    }

    worker.postMessage({ entryFile: sandbox.entryFile, files: sandbox.files })
  }, [clearRunTimeout, disposeWorker, sandbox.entryFile, sandbox.files, scheduleTimeout])

  /** 使用页面内临时连接信息执行一次真实模型调用。 */
  const runModelSandbox = useCallback(async () => {
    disposeWorker()
    disposeModelRequest()

    if (!modelBaseUrl.trim() || !modelApiKey.trim() || !resolvedModel || !modelPrompt.trim()) {
      setStatus('error')
      setOutputLines(['请完整填写 Base URL、API Key、模型和 Prompt。'])
      return
    }

    /** 每次运行使用独立控制器，停止按钮和超时都能中断请求。 */
    const requestAbortController = new AbortController()
    modelRequestAbortRef.current = requestAbortController
    setStatus('running')
    setOutputLines(['正在通过同源安全代理调用模型……'])
    timeoutRef.current = window.setTimeout(() => {
      requestAbortController.abort()
      modelRequestAbortRef.current = null
      timeoutRef.current = null
      setStatus('error')
      setOutputLines(['模型调用超过 50 秒，已自动终止。'])
    }, MODEL_REQUEST_TIMEOUT_MS)

    try {
      /** 页面只向同源代理提交当前实验所需字段。 */
      const response = await fetch('/api/knowledge/model-sandbox', {
        method: 'POST', // 同源模型实验固定使用 POST。
        headers: {
          'Content-Type': 'application/json' // 请求体使用 JSON，Key 不进入 URL。
        },
        body: JSON.stringify({
          framework: sandbox.modelRequest?.framework || 'langchain', // 服务端按文章声明运行对应框架。
          baseUrl: modelBaseUrl.trim(), // 用户指定的 OpenAI 兼容根地址。
          apiKey: modelApiKey.trim(), // 只用于本次请求的临时密钥。
          model: resolvedModel, // 下拉选择或自定义模型名。
          prompt: modelPrompt.trim() // 页面中可见、可编辑的问题。
        }),
        cache: 'no-store', // 浏览器不得缓存包含临时凭据的请求。
        signal: requestAbortController.signal // 停止或超时时中断网络请求。
      })
      /** 同源代理返回的模型结果或安全错误。 */
      const responseBody = await response.json() as ModelSandboxResponse
      if (!response.ok || !responseBody.content) {
        throw new Error(responseBody.error || `模型调用失败：HTTP ${response.status}`)
      }

      clearRunTimeout()
      modelRequestAbortRef.current = null
      /** 供应商用量缺失时保持可读，而不是显示 undefined。 */
      const usageSummary = responseBody.usage
        ? `Token：输入 ${responseBody.usage.promptTokens ?? '未知'}，输出 ${responseBody.usage.completionTokens ?? '未知'}，合计 ${responseBody.usage.totalTokens ?? '未知'}`
        : 'Token：供应商未返回用量'
      setStatus('success')
      setOutputLines([
        `模型：${responseBody.model || resolvedModel}`,
        usageSummary,
        '',
        responseBody.content
      ])
    } catch (error) {
      if (requestAbortController.signal.aborted) {
        return
      }
      clearRunTimeout()
      modelRequestAbortRef.current = null
      setStatus('error')
      setOutputLines([error instanceof Error ? error.message : '模型调用失败。'])
    }
  }, [clearRunTimeout, disposeModelRequest, disposeWorker, modelApiKey, modelBaseUrl, modelPrompt, resolvedModel])

  /** 启动当前 HTML 预览或 Python Worker。 */
  const runSandbox = useCallback(() => {
    if (sandbox.runtime === 'html') {
      setHtmlPreviewVersion((currentVersion) => currentVersion + 1)
      setOutputLines([])
      setStatus('success')
      return
    }

    if (sandbox.runtime === 'model') {
      void runModelSandbox()
      return
    }

    runPythonSandbox()
  }, [runModelSandbox, runPythonSandbox, sandbox.runtime])

  /** 清空输出并恢复等待运行状态。 */
  const resetSandbox = useCallback(() => {
    disposeWorker()
    disposeModelRequest()
    setOutputLines([])
    setHtmlPreviewVersion(0)
    setStatus('idle')
  }, [disposeModelRequest, disposeWorker])

  useEffect(() => {
    /** 卸载时同时释放执行 Worker 和交互反馈计时器。 */
    return () => {
      disposeWorker()
      disposeModelRequest()
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current)
      }
    }
  }, [disposeModelRequest, disposeWorker])

  return (
    <section className="knowledge-code-sandbox" aria-label={`${sandbox.title}在线实验`}>
      <header className="knowledge-code-sandbox-header">
        <div className="min-w-0">
          <div className="knowledge-code-sandbox-title-row">
            <FileCode2 aria-hidden="true" />
            <h3>{sandbox.title}</h3>
            <span className="knowledge-code-sandbox-runtime">
              {sandbox.runtime === 'python'
                ? 'Python · Pyodide'
                : sandbox.runtime === 'model'
                  ? 'LangChain · Real API'
                  : 'HTML · iframe'}
            </span>
          </div>
          <p>{sandbox.description}</p>
        </div>

        <div className="knowledge-code-sandbox-actions">
          {canStop ? (
            <Button type="button" variant="outline" size="sm" onClick={stopSandbox} title="终止当前运行">
              <Square aria-hidden="true" />
              停止
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={runSandbox} title="在浏览器隔离环境中运行">
              <Play aria-hidden="true" />
              {hasStarted ? '重新运行' : '运行'}
            </Button>
          )}
          {hasStarted && !canStop ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={resetSandbox}
              aria-label="重置实验"
              title="重置实验"
            >
              <RotateCcw aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </header>

      {sandbox.runtime === 'model' ? (
        <div className="knowledge-code-sandbox-model-settings">
          <div className="knowledge-code-sandbox-model-settings-title">
            <KeyRound aria-hidden="true" />
            <span>模型连接</span>
            <small>仅用于本次请求，不会保存</small>
          </div>
          <div className="knowledge-code-sandbox-model-fields">
            <label>
              <span>Base URL</span>
              <Input
                type="url"
                value={modelBaseUrl}
                autoComplete="off"
                spellCheck={false}
                placeholder={DEFAULT_MODEL_BASE_URL}
                onChange={(event) => setModelBaseUrl(event.target.value)}
              />
            </label>
            <label>
              <span>API Key</span>
              <Input
                type="password"
                value={modelApiKey}
                autoComplete="new-password"
                spellCheck={false}
                placeholder="sk-..."
                onChange={(event) => setModelApiKey(event.target.value)}
              />
            </label>
            <label>
              <span>模型</span>
              <select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value as (typeof MODEL_OPTIONS)[number][0])}>
                {MODEL_OPTIONS.map(([modelValue, modelLabel]) => (
                  <option key={modelValue} value={modelValue}>{modelLabel}</option>
                ))}
              </select>
            </label>
            {selectedModel === 'custom' ? (
              <label>
                <span>模型名称</span>
                <Input
                  value={customModel}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="provider-model-id"
                  onChange={(event) => setCustomModel(event.target.value)}
                />
              </label>
            ) : null}
          </div>
          <label className="knowledge-code-sandbox-model-prompt">
            <span>Prompt</span>
            <textarea value={modelPrompt} onChange={(event) => setModelPrompt(event.target.value)} />
          </label>
        </div>
      ) : null}

      <div className={`knowledge-code-sandbox-workspace${showSource ? '' : ' knowledge-code-sandbox-workspace-output-only'}`}>
        {showSource ? <div className="knowledge-code-sandbox-source">
          <div className="knowledge-code-sandbox-source-toolbar">
            <div className="knowledge-code-sandbox-file-tabs" role="tablist" aria-label="实验源码文件">
              {sandbox.files.map((file) => (
                <button
                  key={file.name}
                  type="button"
                  role="tab"
                  data-file-name={file.name}
                  aria-selected={file.name === activeFile?.name}
                  title={`查看 ${file.name}`}
                  onClick={selectSourceFile}
                >
                  {file.name}
                </button>
              ))}
            </div>
            <div className="knowledge-code-sandbox-source-actions">
              <span>{activeFileLanguage.toUpperCase()}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={copyActiveSource}
                aria-label={hasCopiedSource ? '源码已复制' : '复制当前源码'}
                title={hasCopiedSource ? '已复制' : '复制源码'}
              >
                {hasCopiedSource ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              </Button>
            </div>
          </div>
          <pre>
            <code className={`language-${activeFileLanguage} hljs`}>{renderSandboxSyntaxNodes(highlightedSource)}</code>
          </pre>
        </div> : null}

        {status === 'idle' ? (
          <div className="knowledge-code-sandbox-placeholder">
            <Play aria-hidden="true" />
            <span>运行结果将显示在这里</span>
          </div>
        ) : sandbox.runtime === 'html' ? (
          <iframe
            key={htmlPreviewVersion}
            className="knowledge-code-sandbox-preview"
            title={`${HTML_PREVIEW_TITLE_PREFIX}${sandbox.title}`}
            sandbox="allow-scripts"
            srcDoc={entrySource}
          />
        ) : (
          <div className="knowledge-code-sandbox-output" role="log" aria-live="polite">
            <div className="knowledge-code-sandbox-output-status">
              {status === 'loading' || status === 'running' ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : null}
              {status === 'success' ? <CircleCheck aria-hidden="true" /> : null}
              <span>
                {status === 'success'
                  ? '运行成功'
                  : status === 'error'
                    ? '运行失败'
                    : status === 'stopped'
                      ? '已停止'
                      : '运行中'}
              </span>
            </div>
            <pre>{outputLines.join('\n')}</pre>
          </div>
        )}
      </div>
    </section>
  )
}
