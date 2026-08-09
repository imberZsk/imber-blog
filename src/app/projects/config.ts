export interface Project {
  id: string
  name: string
  description: string
  tech: string[]
  link: string
  github?: string
  releaseUrl?: string
  image: string
  type: 'personal' | 'company'
}

// 项目配置数据
export const projectsConfig: Project[] = [
  // 个人作品
  {
    id: 'visual-worktree',
    name: 'Visual Worktree',
    description: '以任务为单位管理多个 Git 仓库与 Worktree 的桌面开发工作台',
    tech: ['Electron', 'React', 'Git'],
    link: 'https://imber-visual-docs.netlify.app/visual-worktree',
    github: 'https://github.com/imberZsk/visual-worktree',
    releaseUrl: 'https://github.com/imberZsk/visual-worktree/releases/latest',
    image: '/posts/friends/visual-worktree.png',
    type: 'personal'
  },
  {
    id: 'visual-ai-coding',
    name: 'Visual AI Coding',
    description: '统一管理 Claude Code、Codex 配置、插件、Skill 与本地工具状态',
    tech: ['Electron', 'React', 'AI Coding'],
    link: 'https://imber-visual-docs.netlify.app/visual-ai-coding/',
    github: 'https://github.com/imberZsk/visual-ai-coding',
    releaseUrl: 'https://github.com/imberZsk/visual-ai-coding/releases/latest',
    image: '/posts/friends/visual-ai-coding-product.png',
    type: 'personal'
  },
  {
    id: 'visual-lark-bridge',
    name: 'Visual Lark Bridge',
    description: '连接飞书与本机 AI 编程工具，并通过流式卡片展示执行进度',
    tech: ['Electron', 'React', 'Lark'],
    link: 'https://imber-visual-docs.netlify.app/visual-lark-bridge/',
    github: 'https://github.com/imberZsk/visual-lark-bridge',
    releaseUrl: 'https://github.com/imberZsk/visual-lark-bridge/releases/latest',
    image: '/posts/friends/visual-lark-bridge-product.png',
    type: 'personal'
  },
  {
    id: 'visual-learn',
    name: 'Visual Learn',
    description: '阅读和管理本地 Markdown 学习资料，追踪进度、标注与总结',
    tech: ['Electron', 'React', 'Markdown'],
    link: 'https://imber-visual-docs.netlify.app/visual-learn/',
    github: 'https://github.com/imberZsk/visual-learn',
    releaseUrl: 'https://github.com/imberZsk/visual-learn/releases/latest',
    image: '/posts/friends/visual-learn-product.png',
    type: 'personal'
  },
  {
    id: 'visual-muse',
    name: 'Visual Muse',
    description: '面向多平台内容创作、Markdown 预览与发布准备的桌面工作台',
    tech: ['Electron', 'React', 'Markdown'],
    link: 'https://imber-visual-docs.netlify.app/visual-muse/',
    github: 'https://github.com/imberZsk/visual-muse',
    releaseUrl: 'https://github.com/imberZsk/visual-muse/releases/latest',
    image: '/posts/friends/visual-muse-product.png',
    type: 'personal'
  },
  {
    id: 'imber-frontend',
    name: 'Imber Frontend',
    description: 'Web 动画、3D 交互与前端工程实践的可运行实验场和知识库',
    tech: ['GSAP', 'Three.js', 'Next.js'],
    link: 'https://imber-frontend.netlify.app/',
    github: 'https://github.com/imberZsk/imber-frontend',
    image: '/posts/friends/imber-frontend.png',
    type: 'personal'
  },
  // 公司项目
  {
    id: '5',
    name: '魅族全球官网',
    description: '魅族全球官网，使用 Next.js APP Router 服务端渲染、i18n 国际化 和 SEO 优化、响应式、Tailwind CSS',
    tech: ['Next.js', 'i18n', 'SEO'],
    link: 'https://www.meizu.com/global',
    image: '/posts/friends/meizu-global.png',
    type: 'company'
  },
  {
    id: '7',
    name: '魅族社区',
    description: '魅族社区，React、Vite、主题切换、瀑布流、响应式',
    tech: ['React', 'Vite'],
    link: 'https://www.meizu.cn/',
    image: '/posts/friends/meizu-myplus.png',
    type: 'company'
  },
  {
    id: '8',
    name: '星纪魅族集团官网',
    description: '星纪魅族集团官网，Nextjs SSG，TailwindCSS、GSAP、Three.js',
    tech: ['Next.js', 'GSAP', 'Three.js'],
    link: 'https://www.dreamsmart.com/',
    image: '/posts/friends/dreamsmart.png',
    type: 'company'
  }
]

// PC端布局配置
export const layoutConfig = {
  // 响应式网格配置
  grid: {
    mobile: 'grid-cols-1',
    tablet: 'sm:grid-cols-2',
    desktop: 'lg:grid-cols-3'
  },
  // 容器最大宽度
  maxWidth: 'max-w-6xl',
  // 间距配置
  spacing: {
    gap: 'gap-6',
    padding: 'px-6 py-8'
  }
}

// 主题配置
export const themeConfig = {
  // 项目类型颜色配置
  typeColors: {
    personal: {
      light: 'bg-blue-500/20 text-blue-700',
      dark: 'dark:text-blue-300'
    },
    company: {
      light: 'bg-purple-500/20 text-purple-700',
      dark: 'dark:text-purple-300'
    }
  },
  // 卡片样式配置
  card: {
    border: 'border-zinc-200/60 dark:border-zinc-800/40',
    background: 'bg-white/60 dark:bg-zinc-900/40',
    hover: {
      border: 'hover:border-zinc-300/80 dark:hover:border-zinc-700/60',
      background: 'hover:bg-white/80 dark:hover:bg-zinc-800/60',
      shadow: 'hover:shadow-lg hover:shadow-zinc-200/40 dark:hover:shadow-black/20'
    }
  }
}
