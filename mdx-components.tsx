import type { MDXComponents } from 'mdx/types'

// 用于存储已使用的 ID 和它们的计数
const usedIds = new Map<string, number>()

const createUniqueId = (text: string) => {
  if (typeof text !== 'string') return ''

  // 基础 ID
  const baseId = text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

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
    ...components
  }
}
