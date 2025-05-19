import { CodeSandbox } from '@/components/CodeSandbox'
import type { MDXComponents } from 'mdx/types'

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
      // 递归提取 children 里的代码字符串
      function extractCode(node: any): string {
        if (typeof node === 'string') return node
        if (Array.isArray(node)) return node.map(extractCode).join('')
        if (node && node.props && node.props.children) return extractCode(node.props.children)
        return ''
      }
      const code = extractCode(props.children)
      return <CodeSandbox code={code} />
    },
    ...components
  }
}
