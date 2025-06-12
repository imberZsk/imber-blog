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

type CustomNextjsTemplate = 'customNextjs'

interface CodeSandboxProps {
  files: Record<string, SandpackFile>
  template?: SandpackTemplate | CustomNextjsTemplate
  customSetup?: SandpackSetup
}

function createCustomNextjsFiles(userFiles: Record<string, SandpackFile>): Record<string, SandpackFile> {
  return {
    // App Router 文件
    '/app/layout.tsx': {
      code: `export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}`
    },
    '/app/page.tsx': {
      code: `export default function Home() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🎉 Next.js App Router</h1>
      <p>自定义 Next.js App Router 模板</p>
      <p>这里是 /app/page.tsx 的内容</p>
    </div>
  )
}`
    },
    // 添加 next.config.js 来确保 App Router 被启用
    '/next.config.js': {
      code: `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig`
    },
    '/package.json': {
      code: `{
  "name": "nextjs-app-router",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "react-dom": "^18"
  },
  "main": "server.js"
}`
    },
    '/server.js': {
      code: `const { spawn } = require('child_process');

// 启动 Next.js 开发服务器
const nextDev = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

nextDev.on('close', (code) => {
  console.log(\`Next.js dev server exited with code \${code}\`);
});`
    },
    ...userFiles
  }
}

function createCustomNextjsSetup(): SandpackSetup {
  return {
    dependencies: {
      next: '^14',
      react: '^18',
      'react-dom': '^18'
    },
    devDependencies: {
      typescript: '^5'
    },
    entry: 'server.js',
    environment: 'node'
  }
}

export function CodeSandbox({ files, template = 'react', customSetup }: CodeSandboxProps) {
  if (template === 'customNextjs') {
    files = createCustomNextjsFiles(files)
    customSetup = createCustomNextjsSetup()
  }

  return (
    <div className="my-4">
      <Sandpack
        template={template === 'customNextjs' ? 'node' : template}
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
