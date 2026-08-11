/** 知识文章在线实验支持的执行环境。 */
export type KnowledgeSandboxRuntime = 'python' | 'html'

/** 浏览器 Python 沙盒无法安全完成的依赖、网络监听和系统进程特征。 */
const BROWSER_UNSUPPORTED_PYTHON_SOURCE_PATTERN =
  /(?:\bserve_forever\s*\(|\bThreadingHTTPServer\b|\bHTTPServer\b|\bBaseHTTPRequestHandler\b|\binput\s*\(|\bos\.(?:system|popen|fork|exec\w*)\s*\(|(?:^|\n)\s*from\s+(?:subprocess|socket|urllib|requests|fastapi|uvicorn|langchain|langgraph|openai|pymilvus|redis|neo4j|sqlalchemy|sentence_transformers|numpy|pandas|pydantic|httpx|multiprocessing|threading|ctypes|webbrowser)\b|(?:^|\n)\s*import\s+[^\n]*(?:\bsubprocess\b|\bsocket\b|\burllib\b|\brequests\b|\bfastapi\b|\buvicorn\b|\blangchain\b|\blanggraph\b|\bopenai\b|\bpymilvus\b|\bredis\b|\bneo4j\b|\bsqlalchemy\b|\bsentence_transformers\b|\bnumpy\b|\bpandas\b|\bpydantic\b|\bhttpx\b|\bmultiprocessing\b|\bthreading\b|\bctypes\b|\bwebbrowser\b))/i

/** 自动写入 Python 虚拟文件系统的可信文本文件名。 */
export const BROWSER_PYTHON_SUPPORT_FILE_PATTERN = /\.(?:py|json|txt|md|csv|ya?ml)$/i

/**
 * 判断 Python 示例能否在无网络、无系统进程的 Pyodide Worker 中结束运行。
 * @param sourceCode 仓库内 main.py 的完整源码。
 * @returns 不依赖服务监听、外部包或系统进程时返回 true。
 */
export function isBrowserRunnablePythonSource(sourceCode: string): boolean {
  return !BROWSER_UNSUPPORTED_PYTHON_SOURCE_PATTERN.test(sourceCode)
}

/** 在线实验需要写入隔离运行环境的单个文件。 */
export interface KnowledgeSandboxFile {
  /** 文件在实验工作目录中的相对名称。 */
  name: string
  /** 构建期从仓库读取的可信文件内容。 */
  content: string
}

/** 单篇文章内可直接运行的可信实验。 */
export interface KnowledgeSandbox {
  /** 当前实验在文章页面中的稳定标识。 */
  id: string
  /** 浏览器采用的隔离执行环境。 */
  runtime: KnowledgeSandboxRuntime
  /** 运行面板显示的实验名称。 */
  title: string
  /** 说明本次运行能观察到的结果。 */
  description: string
  /** 点击运行时执行或预览的入口文件。 */
  entryFile: string
  /** 入口及其依赖的仓库内可信文件。 */
  files: KnowledgeSandboxFile[]
}
