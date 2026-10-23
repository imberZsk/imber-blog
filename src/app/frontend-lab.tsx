'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useId, useState, type KeyboardEvent } from 'react'
import { ArrowUpRight } from 'lucide-react'

/** 首页前端实验室可切换的内容分类。 */
type LabTab = 'animation' | 'three' | 'docs'

/** 前端实验室分类及其展示内容。 */
const LAB_TABS: Array<{
  id: LabTab
  label: string
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
    label: '动画实验', // 分类按钮显示名称。
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
    label: '3D 场景', // 分类按钮显示名称。
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
    label: '技术文档', // 分类按钮显示名称。
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

/** 展示源前端项目的三类作品切换，并将入口映射到博客现有页面。 */
export function FrontendLab() {
  /** 当前组件实例的无障碍标识，兼容首页与实验室页面复用。 */
  const tabGroupId = useId()
  /** 当前选中的作品分类。 */
  const [activeTab, setActiveTab] = useState<LabTab>('animation')
  /** 当前选中的作品内容。 */
  const activeContent = LAB_TABS.find((tab) => tab.id === activeTab) || LAB_TABS[0]

  /** 根据键盘方向切换分类；event 为当前标签键盘事件。 */
  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    /** 允许通过方向键与首尾键在三个分类间循环。 */
    const navigationKeys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!navigationKeys.includes(event.key)) return
    event.preventDefault()
    /** 当前分类在配置清单中的位置。 */
    const currentIndex = LAB_TABS.findIndex((tab) => tab.id === activeTab)
    /** 按键计算出的下一分类位置。 */
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? LAB_TABS.length - 1
          : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + LAB_TABS.length) % LAB_TABS.length
    /** 已验证存在的下一分类。 */
    const nextTab = LAB_TABS[nextIndex]
    if (!nextTab) return
    setActiveTab(nextTab.id)
    document.getElementById(`${tabGroupId}-${nextTab.id}`)?.focus()
  }

  return (
    <section
      className="border-border mx-auto max-w-7xl border-t px-5 py-16 sm:py-20"
      aria-labelledby={`${tabGroupId}-title`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-mint mb-3 text-xs font-semibold tracking-wide">SELECTED WORK</p>
          <h2 id={`${tabGroupId}-title`} className="text-foreground text-3xl font-semibold sm:text-5xl">
            三个方向，一个前端工作台
          </h2>
        </div>
        <p className="text-muted-foreground max-w-md text-sm leading-6">
          切换分类，查看可运行示例、场景预览与技术文档。
        </p>
      </div>

      <div className="border-border mt-10 grid grid-cols-3 border-b" role="tablist" aria-label="前端作品分类">
        {LAB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${tabGroupId}-${tab.id}`}
            aria-controls={`${tabGroupId}-panel`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onKeyDown={handleTabKeyDown}
            aria-selected={activeTab === tab.id}
            className="aria-selected:border-primary aria-selected:text-foreground text-muted-foreground hover:text-foreground border-b-2 border-transparent px-2 py-4 text-sm font-semibold transition-colors"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-center"
        role="tabpanel"
        id={`${tabGroupId}-panel`}
        aria-labelledby={`${tabGroupId}-${activeTab}`}
      >
        <div className="border-border bg-muted overflow-hidden rounded-lg border">
          {activeContent.media === 'video' ? (
            <video
              className="aspect-video w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              poster={activeContent.image}
            >
              <source src="/frontend-lab/animation-preview.mp4" type="video/mp4" />
            </video>
          ) : (
            <Image
              src={activeContent.image}
              alt={activeContent.imageAlt}
              width={960}
              height={600}
              className="aspect-video w-full object-cover"
            />
          )}
        </div>
        <div>
          <p className="text-mint text-xs font-semibold tracking-wide">{activeContent.eyebrow}</p>
          <h3 className="text-foreground mt-3 text-2xl font-semibold">{activeContent.title}</h3>
          <p className="text-muted-foreground mt-3 text-sm leading-7">{activeContent.description}</p>
          <ul className="text-muted-foreground mt-5 space-y-2 text-sm">
            {activeContent.items.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
          <Link
            href={activeContent.href}
            target={activeContent.href.startsWith('http') ? '_blank' : undefined}
            rel={activeContent.href.startsWith('http') ? 'noreferrer' : undefined}
            className="text-mint hover:text-warm mt-6 inline-flex items-center gap-1 text-sm font-semibold transition-colors"
          >
            {activeTab === 'docs' ? '阅读技术文档' : activeTab === 'three' ? '进入 3D 实验' : '进入动画实验'}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
