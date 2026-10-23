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
    path: '/geekbang', // 直接打开迁入内容的专题目录。
    name: '极客知识库', // 替换没有文章的文集 Tab。
    title: '极客知识库目录', // 明确该入口提供课程和章节导航。
    enabled: true // 桌面和手机导航统一展示目录入口。
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
    path: '/lab', // 统一承载动画、3D 场景和原前端文档。
    name: '实验室', // 主导航中的功能集合名称。
    title: '前端实验室', // 导航链接的说明。
    enabled: true // 桌面和移动导航均展示迁移功能入口。
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
