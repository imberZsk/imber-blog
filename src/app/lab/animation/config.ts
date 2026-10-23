// ANIMATION_BASE_PATH 表示动画应用在统一站点中的公共资源前缀。
export const ANIMATION_BASE_PATH = '/frontend-lab/animation'

interface NavigationSection {
  id: string
  name: string
  path: string
  src: string
}

export const navigationSections: NavigationSection[] = [
  {
    id: 'split', // 分类或实验的稳定标识。
    name: 'Split Text - GSAP', // 实验索引和侧栏显示名称。
    path: '/lab/animation/split', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/split.mov` // 迁移后的视频预览资源地址。
  },
  { id: 'blur', name: 'Blur Text', path: '/lab/animation/blur', src: `${ANIMATION_BASE_PATH}/animations/blur.mov` },
  { id: 'add', name: 'Add Text', path: '/lab/animation/add', src: `${ANIMATION_BASE_PATH}/animations/add.mov` },
  {
    id: 'shiny', // 分类或实验的稳定标识。
    name: 'Shiny Text - CSS', // 实验索引和侧栏显示名称。
    path: '/lab/animation/shiny', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/shiny.mov` // 迁移后的视频预览资源地址。
  },
  {
    id: 'stagger-framer', // 分类或实验的稳定标识。
    name: 'Stagger - Framer Motion', // 实验索引和侧栏显示名称。
    path: '/lab/animation/stagger/framer', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/stagger.mov` // 迁移后的视频预览资源地址。
  },
  {
    id: 'stagger-gsap', // 分类或实验的稳定标识。
    name: 'Stagger - GSAP', // 实验索引和侧栏显示名称。
    path: '/lab/animation/stagger/gsap', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/stagger.mov` // 迁移后的视频预览资源地址。
  },
  {
    id: 'timeline-framer', // 分类或实验的稳定标识。
    name: 'Timeline - Framer Motion', // 实验索引和侧栏显示名称。
    path: '/lab/animation/timeline/framer', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/timeline.mp4` // 迁移后的视频预览资源地址。
  },
  {
    id: 'timeline-gsap', // 分类或实验的稳定标识。
    name: 'Timeline - GSAP', // 实验索引和侧栏显示名称。
    path: '/lab/animation/timeline/gsap', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/timeline.mp4` // 迁移后的视频预览资源地址。
  },
  {
    id: 'exit-framer', // 分类或实验的稳定标识。
    name: 'Exit - Framer Motion', // 实验索引和侧栏显示名称。
    path: '/lab/animation/exit/framer', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/exit.mov` // 迁移后的视频预览资源地址。
  },
  {
    id: 'exit-gsap', // 分类或实验的稳定标识。
    name: 'Exit - GSAP', // 实验索引和侧栏显示名称。
    path: '/lab/animation/exit/gsap', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/exit.mov` // 迁移后的视频预览资源地址。
  },
  {
    id: 'layout', // 分类或实验的稳定标识。
    name: 'Layout - Framer Motion', // 实验索引和侧栏显示名称。
    path: '/lab/animation/layout', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/layout.mov` // 迁移后的视频预览资源地址。
  },
  { id: 'flip', name: 'Flip - GSAP', path: '/lab/animation/flip', src: `${ANIMATION_BASE_PATH}/animations/flip.mp4` },
  {
    id: 'tab', // 分类或实验的稳定标识。
    name: 'Tab - Framer Motion', // 实验索引和侧栏显示名称。
    path: '/lab/animation/tab', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/tab.mov` // 迁移后的视频预览资源地址。
  },
  {
    id: 'scroll', // 分类或实验的稳定标识。
    name: 'Scroll - GSAP', // 实验索引和侧栏显示名称。
    path: '/lab/animation/scroll/gsap', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/scroll.mp4` // 迁移后的视频预览资源地址。
  },
  {
    id: 'scroll', // 分类或实验的稳定标识。
    name: 'Scroll - Framer Motion', // 实验索引和侧栏显示名称。
    path: '/lab/animation/scroll/framer', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/scroll.mp4` // 迁移后的视频预览资源地址。
  },
  {
    id: 'scrub', // 分类或实验的稳定标识。
    name: 'Scrub - GSAP', // 实验索引和侧栏显示名称。
    path: '/lab/animation/scrub/gsap', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/scrub.mp4` // 迁移后的视频预览资源地址。
  },
  {
    id: 'scrub', // 分类或实验的稳定标识。
    name: 'Scrub - Framer Motion', // 实验索引和侧栏显示名称。
    path: '/lab/animation/scrub/framer', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/scrub.mp4` // 迁移后的视频预览资源地址。
  },
  { id: 'pin', name: 'Pin - GSAP', path: '/lab/animation/pin/gsap', src: `${ANIMATION_BASE_PATH}/animations/pin.mp4` },
  {
    id: 'vertical', // 分类或实验的稳定标识。
    name: 'Vertical - GSAP', // 实验索引和侧栏显示名称。
    path: '/lab/animation/vertical', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/vertical.mp4` // 迁移后的视频预览资源地址。
  },
  {
    id: 'horizontal', // 分类或实验的稳定标识。
    name: 'Horizontal - GSAP', // 实验索引和侧栏显示名称。
    path: '/lab/animation/horizontal', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/horizontal.mp4` // 迁移后的视频预览资源地址。
  },
  {
    id: 'parallax', // 分类或实验的稳定标识。
    name: 'Parallax - GSAP', // 实验索引和侧栏显示名称。
    path: '/lab/animation/parallax/gsap', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/parallax.mp4` // 迁移后的视频预览资源地址。
  },
  {
    id: 'multipart-scrollTrigger', // 分类或实验的稳定标识。
    name: 'multipart ScrollTrigger - GSAP', // 实验索引和侧栏显示名称。
    path: '/lab/animation/multipart-scrollTrigger', // 实验的博客内部路由。
    src: `${ANIMATION_BASE_PATH}/animations/multipart-scrollTrigger.mp4` // 迁移后的视频预览资源地址。
  }
]
