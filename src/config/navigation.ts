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
    path: '/knowledge',
    name: '知识库',
    title: '知识库',
    enabled: true
  },
  {
    path: '/mindmaps',
    name: '思维导图',
    title: '思维导图',
    enabled: true
  },
  {
    path: '/gallery',
    name: '画廊',
    title: '画廊',
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
  link: 'px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-mint',
  container: '',
  list: 'flex items-center gap-5'
}
