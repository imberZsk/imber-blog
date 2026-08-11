import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 当前同步脚本所在的绝对目录。 */
const scriptDirectory = dirname(fileURLToPath(import.meta.url))
/** 博客项目根目录。 */
const projectRoot = dirname(scriptDirectory)
/** pnpm 在项目 node_modules 中暴露的 Pyodide 包目录。 */
const pyodidePackageDirectory = join(projectRoot, 'node_modules', 'pyodide')
/** 浏览器可同源访问的 Pyodide 静态资源目录。 */
const pyodidePublicDirectory = join(projectRoot, 'public', 'vendor', 'pyodide')
/** 浏览器初始化 Python 标准库需要的固定运行文件。 */
const PYODIDE_RUNTIME_FILES = [
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'pyodide-lock.json',
  'python_stdlib.zip'
]

/** 把已锁定版本的 Pyodide 运行文件同步到 Next 静态目录。 */
async function syncPyodideAssets() {
  await mkdir(pyodidePublicDirectory, {
    recursive: true // 首次安装时同时创建 vendor 和 pyodide 两级目录。
  })

  for (const runtimeFileName of PYODIDE_RUNTIME_FILES) {
    /** 当前运行文件在 npm 包中的绝对路径。 */
    const sourcePath = join(pyodidePackageDirectory, runtimeFileName)
    /** 当前运行文件在 public 目录中的绝对路径。 */
    const destinationPath = join(pyodidePublicDirectory, runtimeFileName)
    await copyFile(sourcePath, destinationPath)
  }
}

await syncPyodideAssets()
