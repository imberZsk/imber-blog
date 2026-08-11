'use client'

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { KnowledgeCodeSandbox } from '@/components/knowledge-code-sandbox'
import type { KnowledgeSandbox, KnowledgeSandboxFile } from '@/lib/knowledge-sandbox'

/**
 * 把 Tiptap 节点属性收敛为在线实验组件需要的可信结构。
 * @param nodeAttributes 当前 codeSandbox 节点保存的属性。
 */
function createSandboxFromNodeAttributes(nodeAttributes: NodeViewProps['node']['attrs']): KnowledgeSandbox {
  /** 节点中合法的 Python 或 HTML 执行环境。 */
  const runtime = nodeAttributes.runtime === 'html' ? 'html' : 'python'
  /** 节点中经过扩展解析的实验文件数组。 */
  const files = Array.isArray(nodeAttributes.files)
    ? nodeAttributes.files.filter(
        (file): file is KnowledgeSandboxFile =>
          typeof file === 'object' && file !== null && typeof file.name === 'string' && typeof file.content === 'string'
      )
    : []

  return {
    id: typeof nodeAttributes.id === 'string' ? nodeAttributes.id : 'tiptap-code-sandbox',
    runtime,
    title: typeof nodeAttributes.title === 'string' ? nodeAttributes.title : '在线实验',
    description: typeof nodeAttributes.description === 'string' ? nodeAttributes.description : '运行并观察代码结果。',
    entryFile: typeof nodeAttributes.entryFile === 'string' ? nodeAttributes.entryFile : 'main.py',
    files
  }
}

/**
 * 在 Tiptap 编辑器中渲染不可直接编辑的在线实验原子节点。
 * @param props Tiptap 注入的节点视图属性。
 */
export function CodeSandboxNodeView(props: NodeViewProps) {
  /** 当前节点属性转换后的在线实验配置。 */
  const sandbox = createSandboxFromNodeAttributes(props.node.attrs)

  return (
    <NodeViewWrapper className="code-sandbox-node" contentEditable={false}>
      <KnowledgeCodeSandbox sandbox={sandbox} />
    </NodeViewWrapper>
  )
}
