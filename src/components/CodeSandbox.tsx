import { Sandpack } from '@codesandbox/sandpack-react'

interface CodeSandboxProps {
  code: string
}

export function CodeSandbox({ code }: CodeSandboxProps) {
  return (
    <div className="my-4">
      <Sandpack
        template="react"
        theme={'dark'}
        files={{
          '/App.js': {
            code,
            active: true
          }
        }}
        options={{
          // showInlineErrors: true,
          // showNavigator: true,
          // showTabs: true,
          // closableTabs: true,
          wrapContent: false,
          showConsole: true,
          showConsoleButton: true,
          // editorHeight: 500,
          editorWidthPercentage: 60 // 代码占的百分比
          // showConsole: true,
          // showConsoleButton: true
        }}
      />
    </div>
  )
}
