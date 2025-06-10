import { Sandpack } from '@codesandbox/sandpack-react'
import type { SandpackFile } from '@codesandbox/sandpack-react'

interface CodeSandboxProps {
  files: Record<string, SandpackFile>
}

export function CodeSandbox({ files }: CodeSandboxProps) {
  return (
    <div className="my-4">
      <Sandpack
        template="react"
        theme={'dark'}
        files={files}
        options={{
          // externalResources: ['https://cdn.tailwindcss.com'],
          // showInlineErrors: true,
          // showNavigator: true,
          // showTabs: true,
          // closableTabs: true,
          // wrapContent: false,
          // showConsole: true,
          // showConsoleButton: true,
          // editorHeight: 500,
          editorWidthPercentage: 60 // 代码占的百分比
          // showConsole: true,
          // showConsoleButton: true
        }}
      />
    </div>
  )
}
