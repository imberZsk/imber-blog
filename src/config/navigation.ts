export interface NavItem {
  path: string
  name: string
  title?: string
  enabled?: boolean
}

// 统一导航配置
export const navigationConfig: NavItem[] = [
  {
    path: '/',
    name: '首页',
    title: '首页',
    enabled: true
  },
  {
    path: '/posts',
    name: '文集',
    title: '文集',
    enabled: true
  },
  {
    path: '/ideas',
    name: '思考',
    title: '思考',
    enabled: false
  },
  {
    path: '/gallery',
    name: '画廊',
    title: '画廊',
    enabled: false
  },
  {
    path: '/todos',
    name: '清单',
    title: '清单',
    enabled: false
  },
  {
    path: '/projects',
    name: '作品',
    title: '作品',
    enabled: true
  },
  {
    path: '/about',
    name: '关于',
    title: '关于我',
    enabled: true
  },
  {
    path: '/simple',
    name: '编辑器',
    title: '编辑器',
    enabled: false
  },
  {
    path: '/tools',
    name: '工具',
    title: '工具',
    enabled: false
  }
]

// 获取启用的导航项
export const getEnabledNavItems = (): NavItem[] => {
  return navigationConfig.filter((item) => item.enabled)
}

// 导航样式配置
export const navStyles = {
  link: 'text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400',
  container: 'rounded-full bg-zinc-100/80 px-6 py-2 backdrop-blur-md dark:bg-white/5',
  list: 'flex items-center gap-6 text-sm'
}
