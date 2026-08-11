import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import type { KnowledgeSandboxFile } from '@/lib/knowledge-sandbox'
import { CodeSandboxNodeView } from './code-sandbox-node'

/**
 * 安全解析静态 HTML 中保存的实验文件。
 * @param serializedFiles data-files 属性中的 JSON 字符串。
 */
function parseSandboxFiles(serializedFiles: string | null): KnowledgeSandboxFile[] {
  if (!serializedFiles) {
    return []
  }

  try {
    /** data-files 属性反序列化后的未知值。 */
    const parsedFiles: unknown = JSON.parse(serializedFiles)
    return Array.isArray(parsedFiles) ? (parsedFiles as KnowledgeSandboxFile[]) : []
  } catch {
    return []
  }
}

/** Tiptap 在线代码实验原子节点。 */
export const CodeSandboxNode = Node.create({
  name: 'codeSandbox', // 节点在 Tiptap Schema 和 JSON 中的唯一名称。
  group: 'block', // 作为块级内容插入段落之间。
  atom: true, // 整个运行面板作为单个不可拆分节点选择。
  draggable: true, // 编辑状态下允许整体调整实验位置。

  /** 声明在线实验序列化时保存的全部属性。 */
  addAttributes() {
    return {
      id: {
        default: 'tiptap-code-sandbox', // 没有显式编号时使用的稳定兜底标识。
        parseHTML: (element) => element.getAttribute('data-sandbox-id'), // 从静态 HTML 恢复实验标识。
        renderHTML: (attributes) => ({ 'data-sandbox-id': attributes.id }) // 把实验标识写入静态 HTML。
      },
      runtime: {
        default: 'python', // 未声明时使用 Python Worker 环境。
        parseHTML: (element) => element.getAttribute('data-runtime'), // 从静态 HTML 恢复执行环境。
        renderHTML: (attributes) => ({ 'data-runtime': attributes.runtime }) // 把执行环境写入静态 HTML。
      },
      title: {
        default: '在线实验', // 运行面板标题的兜底值。
        parseHTML: (element) => element.getAttribute('data-title'), // 从静态 HTML 恢复实验标题。
        renderHTML: (attributes) => ({ 'data-title': attributes.title }) // 把实验标题写入静态 HTML。
      },
      description: {
        default: '运行并观察代码结果。', // 预期观察结果的兜底说明。
        parseHTML: (element) => element.getAttribute('data-description'), // 从静态 HTML恢复实验说明。
        renderHTML: (attributes) => ({ 'data-description': attributes.description }) // 把实验说明写入静态 HTML。
      },
      entryFile: {
        default: 'main.py', // Python 实验入口的兜底文件名。
        parseHTML: (element) => element.getAttribute('data-entry-file'), // 从静态 HTML 恢复入口文件。
        renderHTML: (attributes) => ({ 'data-entry-file': attributes.entryFile }) // 把入口文件写入静态 HTML。
      },
      files: {
        default: [], // 没有文件时保留空数组，运行面板会明确失败而不是执行未知内容。
        parseHTML: (element) => parseSandboxFiles(element.getAttribute('data-files')), // 安全恢复序列化文件。
        renderHTML: (attributes) => ({ 'data-files': JSON.stringify(attributes.files) }) // 把可信文件序列化到节点 HTML。
      }
    }
  },

  /** 声明可以恢复为在线实验节点的静态 HTML 标记。 */
  parseHTML() {
    return [
      {
        tag: 'div[data-knowledge-code-sandbox]' // 只匹配明确标记的沙盒节点。
      }
    ]
  },

  /**
   * 输出可被 Tiptap 再次解析的静态占位节点。
   * @param props Tiptap 汇总后的 HTML 属性。
   */
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-knowledge-code-sandbox': '' // 标识该 div 需要恢复为在线实验节点。
      })
    ]
  },

  /** 使用 React 组件渲染完整的交互运行面板。 */
  addNodeView() {
    return ReactNodeViewRenderer(CodeSandboxNodeView)
  }
})
