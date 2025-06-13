import { Sandpack } from '@codesandbox/sandpack-react'
import type { SandpackSetup, SandpackFile } from '@codesandbox/sandpack-react'
// import { Sandpack } from '@codesandbox/sandpack-react/unstyled'

type SandpackTemplate =
  | 'react'
  | 'react-ts'
  | 'nextjs'
  | 'vanilla'
  | 'vanilla-ts'
  | 'vite'
  | 'vite-react'
  | 'vite-react-ts'
  | 'vue'
  | 'vue-ts'
  | 'angular'
  | 'svelte'
  | 'solid'
  | 'static'
  | 'node'
  | 'test-ts'

interface CodeSandboxProps {
  files: Record<string, SandpackFile>
  template?: SandpackTemplate
  customSetup?: SandpackSetup
}

export function CodeSandbox({ files, template = 'react', customSetup }: CodeSandboxProps) {
  return (
    <div className="my-4">
      <Sandpack
        template={template}
        theme={'dark'}
        files={files}
        customSetup={customSetup}
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
          // showConsoleButton: true,
        }}
      />
    </div>
  )
}
