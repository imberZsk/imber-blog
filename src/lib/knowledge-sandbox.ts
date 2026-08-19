/** 知识文章在线实验支持的执行环境。 */
export type KnowledgeSandboxRuntime = 'python' | 'typescript' | 'html' | 'model'

/** 真实模型实验由哪个文章框架负责组装并发起请求。 */
export type KnowledgeModelSandboxFramework = 'langchain' | 'llamaindex'

/** LangChain 真实模型实验验证普通对话，还是只验证 Tool 注册与调用提议。 */
export type KnowledgeModelSandboxMode = 'chat' | 'tools'

/** 真实模型实验在页面中预填的非敏感请求配置。 */
export interface KnowledgeModelSandboxRequest {
  /** 服务端必须使用的框架实现，不能根据文章标题猜测。 */
  framework: KnowledgeModelSandboxFramework
  /** 服务端执行普通聊天或 Tool Calling 注册实验。 */
  mode: KnowledgeModelSandboxMode
  /** 用户可以在运行前修改的默认问题。 */
  prompt: string
}

/** 浏览器 Python 沙盒无法安全完成的依赖、网络监听和系统进程特征。 */
const BROWSER_UNSUPPORTED_PYTHON_SOURCE_PATTERN =
  /(?:\bserve_forever\s*\(|\bThreadingHTTPServer\b|\bHTTPServer\b|\bBaseHTTPRequestHandler\b|\binput\s*\(|\bos\.(?:system|popen|fork|exec\w*)\s*\(|(?:^|\n)\s*from\s+(?:subprocess|socket|urllib|requests|fastapi|uvicorn|langchain|langgraph|openai|pymilvus|redis|neo4j|sqlalchemy|sentence_transformers|numpy|pandas|pydantic|httpx|multiprocessing|threading|ctypes|webbrowser)\b|(?:^|\n)\s*import\s+[^\n]*(?:\bsubprocess\b|\bsocket\b|\burllib\b|\brequests\b|\bfastapi\b|\buvicorn\b|\blangchain\b|\blanggraph\b|\bopenai\b|\bpymilvus\b|\bredis\b|\bneo4j\b|\bsqlalchemy\b|\bsentence_transformers\b|\bnumpy\b|\bpandas\b|\bpydantic\b|\bhttpx\b|\bmultiprocessing\b|\bthreading\b|\bctypes\b|\bwebbrowser\b))/i

/** 正文自动实验只接入足够完整的 Python 程序。 */
const INLINE_PYTHON_SANDBOX_MINIMUM_LINE_COUNT = 12

/** 会导致正文 Python 示例无法独立执行的占位或未完成特征。 */
const INLINE_PYTHON_INCOMPLETE_SOURCE_PATTERN =
  /(?:YOUR_[A-Z_]+|API_KEY\s*=\s*['"][^'"]+|raise\s+NotImplementedError)/i

/** 正文 Python 示例必须包含可观察输出或显式程序入口。 */
const INLINE_PYTHON_EXECUTION_SIGNAL_PATTERN = /(?:\bprint\s*\(|__name__\s*==\s*['"]__main__['"])/

/** 自动实验只覆盖用户重点关注的 AI 编程与 AI 应用主线。 */
const INLINE_SANDBOX_ARTICLE_PATH_PATTERN = /^(?:02-AI编程|03-AI大模型应用开发)\//

/** 只把文档明确声明可独立执行的章节识别为在线实验。 */
const INLINE_SANDBOX_HEADING_PATTERN = /(?:可运行|可执行|完整示例|综合示例)/

/** Pyodide 默认可直接使用的 Python 标准库根模块。 */
const INLINE_PYTHON_STANDARD_LIBRARY_MODULES = new Set([
  '__future__',
  'argparse',
  'asyncio',
  'collections',
  'contextlib',
  'csv',
  'dataclasses',
  'datetime',
  'enum',
  'functools',
  'hashlib',
  'heapq',
  'importlib',
  'itertools',
  'json',
  'math',
  'operator',
  'os',
  'pathlib',
  'platform',
  'random',
  're',
  'shutil',
  'sqlite3',
  'statistics',
  'string',
  'sys',
  'time',
  'typing',
  'unittest',
  'uuid'
])

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

/**
 * 判断正文 Python 代码块是否适合自动转换为在线实验。
 * @param sourceArticlePath 当前文章无扩展名的知识库相对路径。
 * @param headingText 代码块之前最近的标题文本。
 * @param sourceCode 代码块的完整 Python 源码。
 * @param localModuleNames 同一多文件沙盒中允许由入口导入的本地模块名。
 * @returns 同时满足范围、完整性、依赖和浏览器兼容性时返回 true。
 */
export function isInlinePythonSandboxCandidate(
  sourceArticlePath: string,
  headingText: string,
  sourceCode: string,
  localModuleNames: ReadonlySet<string> = new Set()
): boolean {
  /** 源码中 import 和 from 声明引用的根模块名。 */
  const importedModuleNames = Array.from(
    sourceCode.matchAll(/^\s*(?:from|import)\s+([a-zA-Z_]\w*)/gm),
    (match) => match[1]
  )
  /** 当前程序是否只使用 Pyodide 默认可用的标准库。 */
  const usesOnlyAvailableModules = importedModuleNames.every((moduleName) =>
    INLINE_PYTHON_STANDARD_LIBRARY_MODULES.has(moduleName) || localModuleNames.has(moduleName)
  )

  return (
    INLINE_SANDBOX_ARTICLE_PATH_PATTERN.test(sourceArticlePath) &&
    INLINE_SANDBOX_HEADING_PATTERN.test(headingText) &&
    sourceCode.split('\n').length >= INLINE_PYTHON_SANDBOX_MINIMUM_LINE_COUNT &&
    INLINE_PYTHON_EXECUTION_SIGNAL_PATTERN.test(sourceCode) &&
    !INLINE_PYTHON_INCOMPLETE_SOURCE_PATTERN.test(sourceCode) &&
    usesOnlyAvailableModules &&
    isBrowserRunnablePythonSource(sourceCode)
  )
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
  /** 只有 model 运行时才存在的非敏感默认请求。 */
  modelRequest?: KnowledgeModelSandboxRequest
}
