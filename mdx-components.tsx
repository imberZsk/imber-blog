import { CodeSandbox } from '@/components/CodeSandbox'
import type { MDXComponents } from 'mdx/types'
import type { SandpackFile } from '@codesandbox/sandpack-react'

export const AppJSPath = `/App.js`
export const StylesCSSPath = `/styles.css`

const createFileMap = (children: any): Record<string, SandpackFile> => {
  const result: Record<string, SandpackFile> = {}

  const preElements = Array.isArray(children) ? children : [children]

  preElements.forEach((codeSnippet: { props: { children: any } }) => {
    const codeElement = codeSnippet.props.children // 实际的 <code> 元素
    if (!codeElement || !codeElement.props) return

    const { props } = codeElement
    let filePath: string // 文件路径
    const fileHidden = false // 是否隐藏文件
    const fileActive = false // 当有多个文件时，决定哪个文件默认被选中和显示

    // js 表示普通 react 项目
    if (props.className === 'language-js' || props.className === 'language-javascript') {
      filePath = AppJSPath
    } else if (props.className === 'language-tsx') {
      // tsx 表示 nextjs 项目
      filePath = '/app/page.tsx'
    } else if (props.className === 'language-css') {
      filePath = StylesCSSPath
    } else {
      // 默认作为 JS 文件处理
      filePath = AppJSPath
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
  return {
    h1: (props) => {
      const id = props.children?.toString()
      return (
        <h1 id={id} {...props}>
          {props.children}
        </h1>
      )
    },
    h2: (props) => {
      const id = props.children?.toString()
      return (
        <h2 id={id} {...props}>
          {props.children}
        </h2>
      )
    },
    h3: (props) => {
      const id = props.children?.toString()
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
        console.log(error, 'error解析出错啦')
      }
    },
    SandpackNextJS: (props) => {
      try {
        const files = createFileMap(props.children)

        return <CodeSandbox template={props.template} customSetup={props.customSetup} files={files} />
      } catch (error) {
        console.log(error, 'error解析出错啦')
      }
    },
    ...components
  }
}
