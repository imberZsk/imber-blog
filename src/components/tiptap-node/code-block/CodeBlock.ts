import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { parseRunnableCodeBlockMetadata, serializeRunnableCodeBlockInfo } from '@/lib/runnable-code-block'
import { RunnableCodeBlockNodeView } from './runnable-code-block-node'
import { all, createLowlight } from 'lowlight'

/** 代码节点使用的完整语言语法高亮注册表。 */
const lowlight = createLowlight(all)

/** 同时支持 Markdown 往返、语法高亮和在线执行的 Tiptap 代码块。 */
export const CodeBlock = CodeBlockLowlight.extend({
  /** 为普通代码块补充少量可序列化执行元数据，源码仍保存在节点正文。 */
  addAttributes() {
    return {
      ...this.parent?.(),
      runnable: {
        default: false, // 普通代码默认只展示，不误执行片段。
        parseHTML: (element) => element.getAttribute('data-runnable') === 'true', // 从静态 HTML 恢复执行开关。
        renderHTML: (attributes) => attributes.runnable ? { 'data-runnable': 'true' } : {} // 仅启用时输出标记。
      },
      fileName: {
        default: '', // 普通代码不需要虚拟文件名。
        parseHTML: (element) => element.getAttribute('data-file-name') || '', // 恢复沙盒入口文件。
        renderHTML: (attributes) => attributes.fileName ? { 'data-file-name': attributes.fileName } : {} // 避免空属性污染 HTML。
      },
      sandboxTitle: {
        default: '', // 未声明时由 NodeView 使用“在线运行”。
        parseHTML: (element) => element.getAttribute('data-sandbox-title') || '', // 恢复实验标题。
        renderHTML: (attributes) => attributes.sandboxTitle ? { 'data-sandbox-title': attributes.sandboxTitle } : {} // 仅保存显式标题。
      },
      sandboxDescription: {
        default: '', // 未声明时展示通用观察说明。
        parseHTML: (element) => element.getAttribute('data-sandbox-description') || '', // 恢复实验说明。
        renderHTML: (attributes) => attributes.sandboxDescription
          ? { 'data-sandbox-description': attributes.sandboxDescription }
          : {} // 仅保存显式说明。
      }
    }
  },

  /** 将 fenced code token 解析为普通可编辑代码块及执行属性。 */
  parseMarkdown(token, helpers) {
    /** marked 把语言和扩展属性一起放在 lang 中。 */
    const [language = '', ...metadataParts] = String(token.lang || '').trim().split(/\s+/)
    /** 当前围栏经过安全收敛的执行配置。 */
    const metadata = parseRunnableCodeBlockMetadata(language, metadataParts.join(' '))
    return helpers.createNode(
      'codeBlock',
      {
        language: metadata?.language || language || null,
        runnable: metadata?.runnable || false,
        fileName: metadata?.fileName || '',
        sandboxTitle: metadata?.title || '',
        sandboxDescription: metadata?.description || ''
      },
      token.text ? [helpers.createTextNode(token.text)] : []
    )
  },

  /** 把节点重新输出为标准 fenced code，执行属性保存在 fence info 中。 */
  renderMarkdown(node, helpers) {
    /** 当前节点的可执行围栏信息。 */
    const fenceInfo = serializeRunnableCodeBlockInfo({
      language: node.attrs?.language || '',
      runnable: node.attrs?.runnable === true,
      fileName: node.attrs?.fileName || '',
      title: node.attrs?.sandboxTitle || '',
      description: node.attrs?.sandboxDescription || ''
    })
    /** 当前代码块的可编辑文本内容。 */
    const sourceCode = node.content ? helpers.renderChildren(node.content) : ''
    return `\`\`\`${fenceInfo}\n${sourceCode}\n\`\`\``
  },

  /** 使用 React NodeView 将运行结果附着在同一代码节点下。 */
  addNodeView() {
    return ReactNodeViewRenderer(RunnableCodeBlockNodeView)
  }
}).configure({
  lowlight,
  defaultLanguage: 'javascript'
})
