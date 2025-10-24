export interface Project {
  id: string
  name: string
  description: string
  tech: string[]
  link: string
  github?: string
  image: string
  type: 'personal' | 'company'
}

// 项目配置数据
export const projectsConfig: Project[] = [
  // 个人作品
  {
    id: '1',
    name: '新写的博客',
    description: '基于 Next.js 的博客',
    tech: ['Next.js'],
    link: 'https://imber.netlify.app',
    image: '/posts/friends/blog.png',
    type: 'personal'
  },
  {
    id: '2',
    name: 'GSAP & Framer Motion 动画效果',
    description: 'Framer Motion & GSAP 实现的酷炫动画效果集合',
    tech: ['Framer Motion', 'GSAP'],
    link: 'https://imber-animation.netlify.app',
    image: '/posts/friends/screenshot.png',
    type: 'personal'
  },
  {
    id: '3',
    name: '富文本编辑器',
    description: '基于 tiptap3.x 的现代化富文本编辑器',
    tech: ['Tiptap', 'Next.js'],
    link: 'http://imber-editor.netlify.app/simple',
    image: '/posts/friends/editor.png',
    type: 'personal'
  },
  {
    id: '4',
    name: '面试题',
    description: 'ProcessOn 记录的面试题脑图',
    tech: ['面试题'],
    link: 'https://www.processon.com/mindmap/62ce8cea1efad406ff8300bf',
    image: '/posts/friends/ProcessOn.png',
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
    id: '6',
    name: '领克 Z10 官网',
    description: '领克 Z10 官网，使用了 Next.js、SEO、Amap、响应式、Tailwind CSS、GSAP、Framer Motion',
    tech: ['Next.js', 'GSAP', 'Framer Motion'],
    link: 'https://www.xjmzstarauto.com/starbuff',
    image: '/posts/friends/z10.png',
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
