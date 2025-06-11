# 基于 Next.js MDX & Sandpack 的 Blog

一个基于 Next.js、MDX 和 Sandpack 构建的现代化博客平台，支持在线代码编辑和执行。

## ✨ 特性

- 🚀 **Next.js 15** - 基于最新的 Next.js App Router
- 📝 **MDX 支持** - 在 Markdown 中编写 JSX 组件
- 💻 **Sandpack 集成** - 在线代码编辑器，支持实时预览
- 🎨 **现代化设计** - 使用 Tailwind CSS 和 Framer Motion
- 🌙 **深色模式** - 内置主题切换功能
- 📱 **响应式设计** - 适配各种设备
- 🎯 **目录导航** - 自动生成文章目录和滚动高亮
- ⚡ **性能优化** - 静态生成和代码分割
- 🔧 **TypeScript** - 完整的类型支持
- 📦 **组件库** - 基于 shadcn UI 的组件系统

## 🛠️ 技术栈

### 核心框架

- **Next.js 15** - React 全栈框架
- **React 19** - 用户界面库
- **TypeScript** - 类型安全的 JavaScript

### 内容管理

- **MDX** - Markdown + JSX
- **@next/mdx** - Next.js MDX 集成
- **@tailwindcss/typography** - 文章样式

### 在线编辑器

- **@codesandbox/sandpack-react** - 浏览器内代码编辑和执行

### 样式和动画

- **Tailwind CSS 4** - 原子化 CSS 框架
- **Framer Motion** - React 动画库
- **@react-spring/web** - 物理动画库

### 组件库

- **Shadcn UI** - 无障碍组件库
- **Lucide React** - 图标库
- **next-themes** - 主题切换

### 开发工具

- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **Commitlint** - 提交信息规范
- **Simple Git Hooks** - Git 钩子

## 🚀 快速开始

### 环境要求

- Node.js 18.0 或更高版本
- pnpm（推荐）或 npm

### 安装

```bash
# 克隆项目
git clone https://github.com/imberZsk/imber.git
cd imber

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 开发

访问 [http://localhost:3000](http://localhost:3000) 查看博客。

修改 `src/content` 目录下的 MDX 文件即可编辑文章内容。

## 📁 项目结构

```
imber/
├── src/
│   ├── app/                 # Next.js App Router 页面
│   ├── components/          # React 组件
│   ├── content/            # MDX 文章内容
│   └── lib/                # 工具函数
├── public/                 # 静态资源
├── types/                  # TypeScript 类型定义
├── mdx-components.tsx      # MDX 组件配置
├── next.config.ts          # Next.js 配置
└── package.json
```

## ✍️ 写作指南

### 创建新文章

1. 在 `src/content/` 目录下创建新的 `.mdx` 文件
2. 使用 MDX 语法编写内容，支持 Markdown 和 JSX
3. 添加代码块时可以使用 Sandpack 实现在线编辑

### MDX 示例

```mdx
# 文章标题

这是一段普通的 Markdown 文本。

## 在线代码示例

使用 Sandpack 组件展示可编辑的代码：

<Sandpack
  files={{
    'App.js': `export default function App() {
      return <h1>Hello World!</h1>
    }`
  }}
  theme="dark"
/>
```

### 目录生成

文章中的 `h1`、`h2`、`h3` 标题会自动生成侧边栏目录，支持：

- 自动获取标题层级
- 滚动位置高亮
- 点击跳转到对应章节

## 🎨 主要功能

### 1. MDX 支持

- 在 Markdown 中使用 React 组件
- 自定义组件库集成
- 语法高亮和代码块渲染

### 2. Sandpack 在线编辑器

- 支持多文件项目
- 实时预览和错误提示
- 多种主题和语言支持

### 3. 响应式设计

- 移动端友好的布局
- 自适应导航和侧边栏
- 流畅的动画效果

### 4. 性能优化

- 静态生成和增量生成
- 图片优化和懒加载
- 代码分割和预加载

## 📝 可用脚本

```bash
# 开发模式
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 代码检查
pnpm lint
```

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [MDX 文档](https://mdxjs.com/)
- [Sandpack 文档](https://sandpack.codesandbox.io/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
