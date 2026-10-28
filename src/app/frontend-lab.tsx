import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

/** 前端实验室区块标题的元素标识，供 section 的 aria-labelledby 引用。 */
const LAB_TITLE_ID = 'frontend-lab-title'

/** 前端实验室入口及其展示内容，按配置顺序纵向排列。 */
const LAB_ENTRIES: Array<{
  id: string
  cta: string
  eyebrow: string
  title: string
  description: string
  items: string[]
  href: string
  media: 'video' | 'image'
  image: string
  imageAlt: string
}> = [
  {
    id: 'animation', // 分类或实验的稳定标识。
    cta: '进入动画实验', // 入口链接文案。
    eyebrow: '01 / MOTION', // 当前类别的展示序号与技术方向。
    title: 'Web Animation Gallery', // 页面展示标题。
    description: '用 GSAP 与 Framer Motion 对照实现文字、布局、滚动和时间轴动画，保留可运行示例与源码。', // 面向访问者的功能说明。
    items: ['GSAP ScrollTrigger 与时间轴', 'Framer Motion 布局与退出动画', '响应式视频预览'], // 分类介绍中展示的主要功能。
    href: '/lab/animation', // 博客内部的功能入口。
    media: 'video', // 决定使用视频还是图片预览。
    image: '/frontend-lab/animation-cover.png', // 本地预览素材路径或文件名。
    imageAlt: 'Web Animation Gallery 动画预览' // 预览素材的无障碍说明。
  },
  {
    id: 'three', // 分类或实验的稳定标识。
    cta: '进入 3D 实验', // 入口链接文案。
    eyebrow: '02 / THREE.JS', // 当前类别的展示序号与技术方向。
    title: 'Interactive 3D Scenes', // 页面展示标题。
    description: '覆盖基础场景、天空盒、全景看房、3D 地球与模型动画，呈现浏览器中的空间交互。', // 面向访问者的功能说明。
    items: ['Three.js 场景与材质', '全景贴图与天空盒', 'GLTF / FBX 模型动画'], // 分类介绍中展示的主要功能。
    href: '/lab/3d', // 博客内部的功能入口。
    media: 'image', // 决定使用视频还是图片预览。
    image: '/frontend-lab/three-cover.png', // 本地预览素材路径或文件名。
    imageAlt: 'Three.js 3D 场景预览' // 预览素材的无障碍说明。
  },
  {
    id: 'docs', // 分类或实验的稳定标识。
    cta: '阅读技术文档', // 入口链接文案。
    eyebrow: '03 / KNOWLEDGE', // 当前类别的展示序号与技术方向。
    title: 'Frontend Notes', // 页面展示标题。
    description: '围绕 React、Next.js、编辑器、工程化与 AI 编程积累的长篇笔记，保留完整目录和图片资源。', // 面向访问者的功能说明。
    items: ['React 与 Next.js 原理', '编辑器与前端工程化', 'AI 工具与 MCP 实践'], // 分类介绍中展示的主要功能。
    href: '/lab/docs', // 博客内部的功能入口。
    media: 'image', // 决定使用视频还是图片预览。
    image: '/frontend-lab/docs-cover.png', // 本地预览素材路径或文件名。
    imageAlt: '前端技术文档预览' // 预览素材的无障碍说明。
  }
]

/** 展示源前端项目的三个方向入口，纵向排列并映射到博客现有页面。 */
export function FrontendLab() {
  return (
    <section
      className="border-border mx-auto max-w-7xl border-t px-5 py-16 sm:py-20"
      aria-labelledby={LAB_TITLE_ID}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-mint mb-3 text-xs font-semibold tracking-wide">SELECTED WORK</p>
          <h2 id={LAB_TITLE_ID} className="text-foreground text-3xl font-semibold sm:text-5xl">
            三个方向，一个前端工作台
          </h2>
        </div>
        <p className="text-muted-foreground max-w-md text-sm leading-6">
          查看可运行示例、场景预览与技术文档。
        </p>
      </div>

      <ul className="mt-10 flex flex-col gap-12">
        {LAB_ENTRIES.map((entry) => (
          <li
            key={entry.id}
            className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-center"
          >
            <div className="border-border bg-muted overflow-hidden rounded-lg border">
              {entry.media === 'video' ? (
                <video
                  className="aspect-video w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster={entry.image}
                >
                  <source src="/frontend-lab/animation-preview.mp4" type="video/mp4" />
                </video>
              ) : (
                <Image
                  src={entry.image}
                  alt={entry.imageAlt}
                  width={960}
                  height={600}
                  className="aspect-video w-full object-cover"
                />
              )}
            </div>
            <div>
              <p className="text-mint text-xs font-semibold tracking-wide">{entry.eyebrow}</p>
              <h3 className="text-foreground mt-3 text-2xl font-semibold">{entry.title}</h3>
              <p className="text-muted-foreground mt-3 text-sm leading-7">{entry.description}</p>
              <ul className="text-muted-foreground mt-5 space-y-2 text-sm">
                {entry.items.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
              <Link
                href={entry.href}
                className="text-mint hover:text-warm mt-6 inline-flex items-center gap-1 text-sm font-semibold transition-colors"
              >
                {entry.cta}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
