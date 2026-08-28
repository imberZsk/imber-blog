import { loadPyodide } from '/vendor/pyodide/pyodide.mjs'

/** Pyodide 运行时及标准库所在的同源固定目录。 */
const PYODIDE_INDEX_URL = '/vendor/pyodide/'
/** 当前 Worker 复用的 Pyodide 初始化任务。 */
let pyodidePromise = null
/** 当前 Worker 已执行的实验次数，用于隔离每次运行的文件。 */
let runSequence = 0

/**
 * 按需加载并复用 Pyodide，避免重复下载 WebAssembly 运行时。
 * @returns {Promise<object>} 已完成初始化的 Pyodide 实例。
 */
async function getPyodide() {
  if (!pyodidePromise) {
    self.postMessage({ type: 'stage', text: '正在初始化同源 Python 3.14 WebAssembly 运行时……' })
    pyodidePromise = loadPyodide({
      indexURL: PYODIDE_INDEX_URL // 让 WASM、标准库和锁文件全部从本站静态目录读取。
    })
  }

  return pyodidePromise
}

/**
 * 把仓库内可信文件写入本次运行的隔离目录。
 * @param {object} pyodide 已初始化的 Pyodide 实例。
 * @param {Array<{name: string, content: string}>} files 当前实验允许使用的文件。
 * @returns {string} 本次实验的绝对工作目录。
 */
function writeSandboxFiles(pyodide, files) {
  runSequence += 1
  /** 本次执行独占的虚拟文件系统目录。 */
  const runDirectory = `/home/pyodide/knowledge-lab-${runSequence}`
  pyodide.FS.mkdirTree(runDirectory)

  for (const file of files) {
    /** 服务端白名单文件的纯文件名，阻止意外路径穿越。 */
    const safeFileName = file.name.split('/').at(-1)
    if (!safeFileName) {
      continue
    }
    pyodide.FS.writeFile(`${runDirectory}/${safeFileName}`, file.content, {
      encoding: 'utf8' // 仓库中的 Python、Markdown、TXT 均按 UTF-8 文本写入。
    })
  }

  return runDirectory
}

/**
 * 执行一次 Python 实验并把标准输出实时回传给文章页面。
 * @param {{entryFile: string, files: Array<{name: string, content: string}>, pythonPackages?: string[]}} request 可信实验文件、入口与受控依赖。
 */
async function runPythonSandbox(request) {
  /** 浏览器中的 Pyodide 实例。 */
  const pyodide = await getPyodide()
  /** 文章围栏声明且服务端已校验格式的 PyPI 依赖。 */
  const pythonPackages = Array.isArray(request.pythonPackages) ? request.pythonPackages : []
  if (pythonPackages.length > 0) {
    self.postMessage({ type: 'stage', text: `正在安装 Python 依赖：${pythonPackages.join('、')}……` })
    await pyodide.loadPackage('micropip')
    pyodide.globals.set('__knowledge_sandbox_packages', pythonPackages)
    try {
      await pyodide.runPythonAsync(`
import micropip
await micropip.install(__knowledge_sandbox_packages)
`)
    } finally {
      pyodide.globals.delete('__knowledge_sandbox_packages')
    }
  }
  self.postMessage({ type: 'ready' })

  pyodide.setStdout({
    batched: (text) => self.postMessage({ type: 'stdout', text }) // 按完整行回传标准输出，避免逐字符刷新页面。
  })
  pyodide.setStderr({
    batched: (text) => self.postMessage({ type: 'stderr', text }) // 把异常诊断与普通输出分开传输。
  })

  /** 本次执行使用的虚拟文件系统目录。 */
  const runDirectory = writeSandboxFiles(pyodide, request.files)
  /** 去掉目录后的可信入口文件名。 */
  const safeEntryFile = request.entryFile.split('/').at(-1)
  if (!safeEntryFile) {
    throw new Error('实验入口文件无效')
  }

  pyodide.globals.set('__knowledge_sandbox_directory', runDirectory)
  pyodide.globals.set('__knowledge_sandbox_entry', safeEntryFile)

  try {
    await pyodide.runPythonAsync(`
import os
from pathlib import Path

run_directory = Path(__knowledge_sandbox_directory)
entry_path = run_directory / __knowledge_sandbox_entry
os.chdir(run_directory)
namespace = {"__name__": "__main__", "__file__": str(entry_path)}

try:
    exec(compile(entry_path.read_text(encoding="utf-8"), str(entry_path), "exec"), namespace)
except SystemExit as error:
    if error.code not in (None, 0):
        raise
`)
  } finally {
    pyodide.globals.delete('__knowledge_sandbox_directory')
    pyodide.globals.delete('__knowledge_sandbox_entry')
  }
}

/**
 * 接收文章页面发来的单次运行请求。
 * @param {MessageEvent} event 包含入口文件和白名单文件内容的 Worker 消息。
 */
self.onmessage = async (event) => {
  try {
    await runPythonSandbox(event.data)
    self.postMessage({ type: 'complete' })
  } catch (error) {
    /** 转换后的错误文本，避免向页面传递不可克隆的异常对象。 */
    const errorMessage = error instanceof Error ? error.stack || error.message : String(error)
    self.postMessage({ type: 'error', text: errorMessage })
  }
}
