'use client'

import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { KnowledgeCodeSandbox } from '@/components/knowledge-code-sandbox'
import type { KnowledgeSandbox, KnowledgeSandboxRuntime } from '@/lib/knowledge-sandbox'

/**
 * 将当前 Tiptap 代码块转换为运行面板使用的即时配置。
 * @param props Tiptap 注入的代码块节点属性和文本。
 * @returns 源码直接来自节点正文的在线实验配置。
 */
function createSandboxFromCodeBlock(props: NodeViewProps): KnowledgeSandbox {
  /** 代码块声明的规范运行时。 */
  const runtime: KnowledgeSandboxRuntime = props.node.attrs.sandboxRuntime === 'model'
    ? 'model'
    : props.node.attrs.language === 'html'
      ? 'html'
      : /^(?:typescript|ts)$/.test(props.node.attrs.language || '')
        ? 'typescript'
        : 'python'
  /** 未声明文件名时按运行时选择直接入口。 */
  const entryFile =
    typeof props.node.attrs.fileName === 'string' && props.node.attrs.fileName
      ? props.node.attrs.fileName
      : runtime === 'html'
        ? 'index.html'
        : runtime === 'model'
          ? 'main.ts'
          : runtime === 'typescript'
            ? 'main.ts'
          : 'main.py'

  return {
    id: `tiptap-runnable-${props.getPos()}`,
    runtime,
    title: typeof props.node.attrs.sandboxTitle === 'string' && props.node.attrs.sandboxTitle
      ? props.node.attrs.sandboxTitle
      : '在线运行',
    description:
      typeof props.node.attrs.sandboxDescription === 'string' && props.node.attrs.sandboxDescription
        ? props.node.attrs.sandboxDescription
        : '运行当前代码块，源码修改会直接进入下一次执行。',
    entryFile,
    files: [{ name: entryFile, content: props.node.textContent }],
    modelRequest: runtime === 'model'
      ? {
          framework: props.node.attrs.sandboxFramework === 'llamaindex' ? 'llamaindex' : 'langchain', // 模型框架来自围栏白名单属性。
          mode: props.node.attrs.sandboxMode === 'tools' ? 'tools' : 'chat', // 模型模式来自围栏白名单属性。
          prompt: typeof props.node.attrs.sandboxPrompt === 'string' ? props.node.attrs.sandboxPrompt : '' // 默认问题允许读者在运行前修改。
        }
      : undefined
  }
}

/**
 * 用同一个可编辑代码节点同时承载 Markdown 源码和运行结果。
 * @param props Tiptap 代码块 NodeView 属性。
 */
export function RunnableCodeBlockNodeView(props: NodeViewProps) {
  /** 当前代码块是否显式允许执行。 */
  const isRunnable = props.node.attrs.runnable === true
  /** 当前代码块生成的即时实验配置。 */
  const sandbox = createSandboxFromCodeBlock(props)

  return (
    <NodeViewWrapper className={isRunnable ? 'tiptap-runnable-code-block' : 'tiptap-code-block'}>
      <NodeViewContent
        className={`tiptap-code-block-content language-${props.node.attrs.language || 'text'}`}
      />
      {isRunnable ? <KnowledgeCodeSandbox sandbox={sandbox} showSource={false} /> : null}
    </NodeViewWrapper>
  )
}
