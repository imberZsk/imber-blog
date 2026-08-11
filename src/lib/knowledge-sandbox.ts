/** 知识文章在线实验支持的执行环境。 */
export type KnowledgeSandboxRuntime = 'python' | 'html'

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
