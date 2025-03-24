'use client'

import { Sandpack } from '@codesandbox/sandpack-react'

interface CodeEditorProps {
  files?: Record<string, string>
  template?: 'react' | 'react-ts' | 'nextjs' | 'vite'
}

export default function CodeEditor({
  files = {
    '/App.tsx': `export default function App() {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
}`
  },
  template = 'react-ts'
}: CodeEditorProps) {
  return (
    <div className="my-8">
      <Sandpack
        template={template}
        files={files}
        options={{
          showNavigator: true,
          showTabs: true,
          showLineNumbers: true,
          showInlineErrors: true,
          wrapContent: true,
          editorHeight: 400,
          classes: {
            'sp-wrapper': 'custom-wrapper',
            'sp-layout': 'custom-layout',
            'sp-tab-button': 'custom-tab'
          }
        }}
        theme="dark"
        customSetup={{
          dependencies: {
            react: '^18.0.0',
            'react-dom': '^18.0.0'
          }
        }}
      />
    </div>
  )
}
