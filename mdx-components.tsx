import { CodeSandbox } from '@/components/CodeSandbox'
import type { MDXComponents } from 'mdx/types'
import type { SandpackFile } from '@codesandbox/sandpack-react'

// 用于存储已使用的 ID 和它们的计数
const usedIds = new Map<string, number>()

const createUniqueId = (text: string) => {
  if (typeof text !== 'string') return ''

  // 基础 ID
  const baseId = text
    .toLowerCase()
    .replace(/\s+/g, '-') // 将空格替换为连字符
    .replace(/[^a-z0-9-]/g, '') // 移除所有非字母数字和连字符的字符
    .replace(/^-+|-+$/g, '') // 移除开头和结尾的连字符
    .replace(/-+/g, '-') // 将多个连字符替换为单个连字符

  // 如果 ID 为空，生成一个随机 ID
  if (!baseId) {
    return `heading-${Math.random().toString(36).substr(2, 9)}`
  }

  // 如果 ID 已存在，添加数字后缀
  if (usedIds.has(baseId)) {
    const count = usedIds.get(baseId)! + 1
    usedIds.set(baseId, count)
    return `${baseId}-${count}`
  } else {
    usedIds.set(baseId, 1)
    return baseId
  }
}

export const AppJSPath = `/App.js`
export const StylesCSSPath = `/styles.css`

const createFileMap = (children: any): Record<string, SandpackFile> => {
  const result: Record<string, SandpackFile> = {}

  // 递归查找所有 pre 元素
  function findPreElements(node: any): any[] {
    if (!node) return []

    if (Array.isArray(node)) {
      return node.flatMap(findPreElements)
    }

    // 检查是否是 pre 元素
    if (node.type === 'pre' || (node.type && (node.type as any).mdxName === 'pre')) {
      return [node]
    }

    // 递归检查 children
    if (node.props && node.props.children) {
      return findPreElements(node.props.children)
    }

    return []
  }

  const preElements = findPreElements(children)

  preElements.forEach((codeSnippet) => {
    const codeElement = codeSnippet.props.children
    if (!codeElement || !codeElement.props) return

    const { props } = codeElement
    let filePath: string
    let fileHidden = false
    let fileActive = false

    if (props.meta) {
      const [name, ...params] = props.meta.split(' ')
      filePath = '/' + name
      if (params.includes('hidden')) {
        fileHidden = true
      }
      if (params.includes('active')) {
        fileActive = true
      }
    } else {
      if (props.className === 'language-js' || props.className === 'language-javascript') {
        filePath = AppJSPath
      } else if (props.className === 'language-css') {
        filePath = StylesCSSPath
      } else {
        // 默认作为 JS 文件处理
        filePath = AppJSPath
      }
    }

    if (result[filePath]) {
      throw new Error(`文件 ${filePath} 被定义了多次。每个文件片段应该有唯一的路径名`)
    }

    result[filePath] = {
      code: (props.children || '') as string,
      hidden: fileHidden,
      active: fileActive
    }
  })

  return result
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  // 重置 ID 计数器
  usedIds.clear()

  return {
    h1: (props) => {
      const id = createUniqueId(props.children?.toString())
      return (
        <h1 id={id} {...props}>
          {props.children}
        </h1>
      )
    },
    h2: (props) => {
      const id = createUniqueId(props.children?.toString())
      return (
        <h2 id={id} {...props}>
          {props.children}
        </h2>
      )
    },
    h3: (props) => {
      const id = createUniqueId(props.children?.toString())
      return (
        <h3 id={id} {...props}>
          {props.children}
        </h3>
      )
    },
    Sandpack: (props) => {
      try {
        const files = createFileMap(props.children)
        return <CodeSandbox template={props.template} customSetup={props.customSetup} files={files} />
      } catch (error) {
        console.error('解析 Sandpack 文件时出错:', error)
        // 回退到原来的单文件模式
        function extractCode(node: any): string {
          if (typeof node === 'string') return node
          if (Array.isArray(node)) return node.map(extractCode).join('')
          if (node && node.props && node.props.children) return extractCode(node.props.children)
          return ''
        }
        const code = extractCode(props.children)
        return (
          <CodeSandbox
            template={props.template}
            customSetup={props.customSetup}
            files={{ [AppJSPath]: { code, active: true } }}
          />
        )
      }
    },
    ...components
  }
}
