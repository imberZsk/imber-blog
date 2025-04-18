import { Sandpack } from '@codesandbox/sandpack-react'
// import '@codesandbox/sandpack-react/dist/sandpack.css'

interface CodeSandboxProps {
  code: string
}

export function CodeSandbox({ code }: CodeSandboxProps) {
  return (
    <div className="my-4">
      <Sandpack
        template="vanilla"
        theme="dark"
        options={{
          showLineNumbers: true,
          showInlineErrors: true,
          showNavigator: true,
          showTabs: true,
          closableTabs: true,
          wrapContent: true,
          editorHeight: 500,
          editorWidthPercentage: 60,
          showConsole: true,
          showConsoleButton: true
        }}
        files={{
          '/index.html': {
            code: `<!DOCTYPE html>
<html>
  <head>
    <title>Sandbox</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="/index.js"></script>
  </body>
</html>`,
            hidden: true
          },
          '/index.js': {
            code,
            active: true
          }
        }}
        customSetup={{
          entry: '/index.html',
          dependencies: {}
        }}
      />
    </div>
  )
}
