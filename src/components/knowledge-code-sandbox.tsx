'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CircleCheck, LoaderCircle, Play, RotateCcw, Square, TerminalSquare } from 'lucide-react'
import { Button } from '@/components/ui'
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

/** 在线实验当前所处的执行状态。 */
type KnowledgeSandboxStatus = 'idle' | 'loading' | 'running' | 'success' | 'error' | 'stopped'

/** Python Worker 可能回传的消息。 */
interface PythonWorkerMessage {
  /** 消息对应的运行阶段或输出类型。 */
  type: 'stage' | 'ready' | 'stdout' | 'stderr' | 'complete' | 'error'
  /** 标准输出、标准错误或异常详情。 */
  text?: string
}

/** 文章在线实验组件接收的可信实验配置。 */
interface KnowledgeCodeSandboxProps {
  /** 服务端根据显式白名单生成的实验文件和元数据。 */
  sandbox: KnowledgeSandbox
}

/**
 * 在文章中运行仓库内可信 Python 或 HTML Demo。
 * @param props 当前文章关联的白名单实验配置。
 */
export function KnowledgeCodeSandbox({ sandbox }: KnowledgeCodeSandboxProps) {
  /** 当前执行状态，用于控制操作按钮和状态文案。 */
  const [status, setStatus] = useState<KnowledgeSandboxStatus>('idle')
  /** Python 标准输出、标准错误及运行提示。 */
  const [outputLines, setOutputLines] = useState<string[]>([])
  /** HTML 预览递增版本，确保重新运行会重建 iframe。 */
  const [htmlPreviewVersion, setHtmlPreviewVersion] = useState(0)
  /** 当前 Python 实验独占的 Worker。 */
  const workerRef = useRef<Worker | null>(null)
  /** 初始化或执行阶段的超时计时器。 */
  const timeoutRef = useRef<number | null>(null)

  /** 当前实验入口对应的完整文件内容。 */
  const entrySource = useMemo(
    () => sandbox.files.find((file) => file.name === sandbox.entryFile)?.content || '',
    [sandbox.entryFile, sandbox.files]
  )
  /** 当前状态是否允许用户主动终止实验。 */
  const canStop = status === 'loading' || status === 'running'
  /** 当前状态是否已经呈现出实际运行区域。 */
  const hasStarted = status !== 'idle'

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
    setStatus('stopped')
    setOutputLines((currentLines) => [...currentLines, '已由用户终止运行。'])
  }, [disposeWorker])

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

  /** 启动当前 HTML 预览或 Python Worker。 */
  const runSandbox = useCallback(() => {
    if (sandbox.runtime === 'html') {
      setHtmlPreviewVersion((currentVersion) => currentVersion + 1)
      setOutputLines([])
      setStatus('success')
      return
    }

    runPythonSandbox()
  }, [runPythonSandbox, sandbox.runtime])

  /** 清空输出并恢复等待运行状态。 */
  const resetSandbox = useCallback(() => {
    disposeWorker()
    setOutputLines([])
    setHtmlPreviewVersion(0)
    setStatus('idle')
  }, [disposeWorker])

  useEffect(() => disposeWorker, [disposeWorker])

  return (
    <section className="knowledge-code-sandbox" aria-label={`${sandbox.title}在线实验`}>
      <header className="knowledge-code-sandbox-header">
        <div className="min-w-0">
          <div className="knowledge-code-sandbox-title-row">
            <TerminalSquare aria-hidden="true" />
            <h3>{sandbox.title}</h3>
            <span className="knowledge-code-sandbox-runtime">
              {sandbox.runtime === 'python' ? 'Python · Pyodide' : 'HTML · iframe'}
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

      {status === 'idle' ? (
        <div className="knowledge-code-sandbox-placeholder">
          <Play aria-hidden="true" />
          <span>点击“运行”，直接查看这段 Demo 的真实结果。</span>
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
    </section>
  )
}
