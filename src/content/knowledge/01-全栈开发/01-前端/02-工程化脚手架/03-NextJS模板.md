# Imber CLI NextJS 模板详解

## 概述

Imber CLI 的 NextJS 模板是一个现代化的 React 全栈开发模板，基于 Next.js 14+ 和最新的 React 18 特性构建。该模板集成了 TypeScript、Tailwind CSS、ESLint、Prettier 等现代开发工具，为开发者提供了一个开箱即用的生产级项目基础。

## 模板特性

### 核心特性

- **Next.js 14+**：最新的 App Router 和 Server Components
- **TypeScript**：完整的类型安全支持
- **Tailwind CSS**：原子化 CSS 框架
- **ESLint + Prettier**：代码质量和格式化
- **Jest + Testing Library**：单元测试和集成测试
- **Storybook**：组件开发和文档
- **PWA 支持**：渐进式 Web 应用
- **SEO 优化**：内置 SEO 最佳实践

### 技术栈

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  },
  "devDependencies": {
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.0.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  }
}
```

## 项目结构

### 目录结构

```
{{projectNameKebab}}/
├── src/
│   ├── app/                    # App Router 目录
│   │   ├── globals.css        # 全局样式
│   │   ├── layout.tsx         # 根布局
│   │   ├── page.tsx           # 首页
│   │   ├── loading.tsx        # 加载页面
│   │   ├── error.tsx          # 错误页面
│   │   └── not-found.tsx      # 404 页面
│   ├── components/            # 可复用组件
│   │   ├── ui/               # 基础 UI 组件
│   │   ├── layout/           # 布局组件
│   │   └── common/           # 通用组件
│   ├── lib/                   # 工具库
│   │   ├── utils.ts          # 工具函数
│   │   ├── validations.ts    # 表单验证
│   │   └── constants.ts       # 常量定义
│   ├── hooks/                 # 自定义 Hooks
│   ├── types/                 # TypeScript 类型
│   └── styles/                # 样式文件
├── public/                    # 静态资源
├── stories/                   # Storybook 故事
├── __tests__/                 # 测试文件
├── .env.local                 # 环境变量
├── .gitignore                 # Git 忽略文件
├── next.config.js            # Next.js 配置
├── tailwind.config.js        # Tailwind 配置
├── tsconfig.json             # TypeScript 配置
├── jest.config.js            # Jest 配置
└── package.json              # 项目配置
```

## 核心配置

### 1. Next.js 配置

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['@prisma/client']
  },
  images: {
    domains: ['example.com'],
    formats: ['image/webp', 'image/avif']
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  poweredByHeader: false,
  compress: true,
  swcMinify: true
}

module.exports = nextConfig
```

### 2. TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 3. Tailwind CSS 配置

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    }
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography'), require('@tailwindcss/aspect-ratio')]
}
```

## 核心组件

### 1. 根布局组件

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: '{{projectName}}',
    template: '%s | {{projectName}}'
  },
  description: '{{projectName}} - 现代化的 Next.js 应用',
  keywords: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
  authors: [{ name: '{{author}}' }],
  creator: '{{author}}',
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'https://example.com',
    title: '{{projectName}}',
    description: '{{projectName}} - 现代化的 Next.js 应用',
    siteName: '{{projectName}}'
  },
  twitter: {
    card: 'summary_large_image',
    title: '{{projectName}}',
    description: '{{projectName}} - 现代化的 Next.js 应用'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className={inter.className}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="relative flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  )
}
```

### 2. 首页组件

```typescript
// src/app/page.tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          欢迎使用 <span className="text-primary">{{projectName}}</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          基于 Next.js 14+ 和 TypeScript 构建的现代化 Web 应用
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button size="lg">开始使用</Button>
          <Button variant="outline" size="lg">
            查看文档
          </Button>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>🚀 性能优化</CardTitle>
            <CardDescription>
              内置性能优化，支持 SSR、SSG 和 ISR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• 自动代码分割</li>
              <li>• 图片优化</li>
              <li>• 字体优化</li>
              <li>• 缓存策略</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🎨 现代设计</CardTitle>
            <CardDescription>
              基于 Tailwind CSS 的响应式设计系统
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• 响应式布局</li>
              <li>• 暗色模式</li>
              <li>• 无障碍访问</li>
              <li>• 动画效果</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🛠️ 开发体验</CardTitle>
            <CardDescription>
              完整的开发工具链和最佳实践
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• TypeScript 支持</li>
              <li>• ESLint + Prettier</li>
              <li>• 热重载</li>
              <li>• 调试工具</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">技术栈</h2>
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="secondary">Next.js 14+</Badge>
          <Badge variant="secondary">React 18</Badge>
          <Badge variant="secondary">TypeScript</Badge>
          <Badge variant="secondary">Tailwind CSS</Badge>
          <Badge variant="secondary">ESLint</Badge>
          <Badge variant="secondary">Prettier</Badge>
          <Badge variant="secondary">Jest</Badge>
          <Badge variant="secondary">Storybook</Badge>
        </div>
      </div>
    </div>
  )
}
```

### 3. UI 组件库

```typescript
// src/components/ui/button.tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

## 开发工具配置

### 1. ESLint 配置

```javascript
// .eslintrc.js
module.exports = {
  extends: ['next/core-web-vitals', 'eslint:recommended', '@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  },
  ignorePatterns: ['node_modules/', '.next/', 'out/']
}
```

### 2. Prettier 配置

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "none",
  "printWidth": 80,
  "endOfLine": "lf"
}
```

### 3. Jest 配置

```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './'
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testEnvironment: 'jest-environment-jsdom'
}

module.exports = createJestConfig(customJestConfig)
```

## 最佳实践

### 1. 组件设计原则

```typescript
// 组件应该遵循单一职责原则
interface ComponentProps {
  // 使用明确的类型定义
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

// 使用 forwardRef 支持 ref 传递
const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ title, description, children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('base-styles', className)} {...props}>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {children}
      </div>
    )
  }
)
```

### 2. 数据获取模式

```typescript
// 使用 Server Components 进行数据获取
async function getData() {
  const res = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 } // 1小时缓存
  })

  if (!res.ok) {
    throw new Error('Failed to fetch data')
  }

  return res.json()
}

// 在 Server Component 中使用
export default async function Page() {
  const data = await getData()

  return (
    <div>
      <h1>{data.title}</h1>
      <p>{data.description}</p>
    </div>
  )
}
```

### 3. 状态管理

```typescript
// 使用 Zustand 进行状态管理
import { create } from 'zustand'

interface AppState {
  count: number
  increment: () => void
  decrement: () => void
}

const useAppStore = create<AppState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 }))
}))

// 在组件中使用
function Counter() {
  const { count, increment, decrement } = useAppStore()

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  )
}
```

## 部署配置

### 1. Vercel 部署

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["hkg1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### 2. Docker 配置

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

## 性能优化

### 1. 图片优化

```typescript
import Image from 'next/image'

// 使用 Next.js Image 组件
function OptimizedImage({ src, alt, width, height }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority // 关键图片预加载
      placeholder="blur" // 模糊占位符
      blurDataURL="data:image/jpeg;base64,..." // 自定义占位符
    />
  )
}
```

### 2. 代码分割

```typescript
import dynamic from 'next/dynamic'

// 动态导入组件
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false // 禁用服务端渲染
})

// 条件加载
const AdminPanel = dynamic(() => import('./AdminPanel'), {
  loading: () => <p>Loading admin panel...</p>
})
```

## 总结

Imber CLI 的 NextJS 模板提供了一个完整的现代化 React 开发环境：

1. **现代化技术栈**：Next.js 14+、React 18、TypeScript
2. **完整工具链**：ESLint、Prettier、Jest、Storybook
3. **性能优化**：内置性能优化和最佳实践
4. **开发体验**：热重载、类型安全、调试工具
5. **生产就绪**：SEO 优化、PWA 支持、部署配置

通过这个模板，开发者可以快速启动一个高质量的 Next.js 项目，专注于业务逻辑而不是基础设施配置。
