import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Bot, Braces, Github, Mail, Network } from 'lucide-react'
import { PADDING_TOP } from '../const'
import { cn } from '@/lib/utils'

/** 关于页面的搜索引擎元数据。 */
export const metadata: Metadata = {
  title: '关于',
  description: 'Imber，高级前端背景的 AI 应用开发工程师。'
}

/** 三条核心能力主线。 */
const capabilityAreas = [
  {
    title: '全栈开发',
    description: '从复杂前端体验出发，能够贯通接口、数据、服务与部署，独立完成产品交付。',
    icon: Braces
  },
  {
    title: 'AI 编程',
    description: '把 AI 用于需求理解、代码阅读、实现、测试、审查和交付，同时保留人的判断与验收。',
    icon: Bot
  },
  {
    title: '大模型应用开发',
    description: '围绕模型 API、Prompt、RAG、Agent、工具调用、评测与可观测性构建可落地的 AI 产品。',
    icon: Network
  }
]

/** 当前能力覆盖的技术与工程关键词。 */
const expertiseGroups = [
  {
    title: '产品与前端',
    items: ['React', 'Vue', 'Next.js', 'TypeScript', '复杂交互', '富文本编辑器']
  },
  {
    title: '服务与工程',
    items: ['Node.js', 'Python', 'FastAPI', '数据库', '缓存与搜索', '工程化交付']
  },
  {
    title: 'AI 应用',
    items: ['Prompt', 'RAG', 'Agent', 'MCP', 'Skills', '评测与可观测性']
  }
]

/** 对外联系方式。 */
const contactLinks = [
  {
    name: 'GitHub',
    href: 'https://github.com/imberZsk',
    description: '代码与开源项目',
    icon: Github
  },
  {
    name: 'Email',
    href: 'mailto:a1157911285@163.com',
    description: '工作与技术交流',
    icon: Mail
  }
]

/** 渲染简洁的个人经历、能力范围和联系方式。 */
export default function AboutPage() {
  return (
    <main className={cn('mx-auto max-w-5xl px-5 pb-20', PADDING_TOP)}>
      <section className="border-border grid gap-10 border-b pb-12 md:grid-cols-[128px_minmax(0,1fr)] md:items-start">
        <Image
          src="/avatar.jpg"
          alt="Imber"
          width={112}
          height={112}
          className="border-border aspect-square rounded-lg border object-cover"
          priority
        />

        <div className="max-w-3xl">
          <p className="text-mint text-sm">AI 应用开发工程师</p>
          <h1 className="text-foreground mt-2 text-4xl font-semibold">Imber</h1>
          <p className="text-foreground mt-6 text-lg leading-8">
            我从高级前端开发走向 AI
            应用开发。过去长期处理复杂交互、前端架构和工程质量，现在把这套产品与工程经验延伸到全栈开发、AI
            编程以及大模型应用落地。
          </p>
          <p className="text-muted-foreground mt-4 leading-7">
            我关注的不只是模型能不能回答问题，而是如何把
            Prompt、RAG、Agent、工具调用、评测和可观测性组织成真正可用、可维护的产品能力。
          </p>
          <Link
            href="/mindmaps"
            className="border-mint text-mint hover:text-warm mt-7 inline-flex items-center gap-2 border-b pb-1 text-sm font-medium transition-colors"
          >
            查看我的能力地图
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="py-12">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="text-mint text-xs font-semibold uppercase">Focus</p>
            <h2 className="text-foreground mt-2 text-2xl font-semibold">能力主线</h2>
          </div>
          <p className="text-muted-foreground hidden max-w-sm text-right text-sm leading-6 sm:block">
            从界面与产品体验，延伸到服务端和 AI 系统工程。
          </p>
        </div>

        <div className="border-border divide-border grid border-y md:grid-cols-3 md:divide-x">
          {capabilityAreas.map((area) => {
            /** 当前能力主线对应的图标组件。 */
            const AreaIcon = area.icon

            return (
              <article
                key={area.title}
                className="border-border border-b px-0 py-7 last:border-b-0 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0"
              >
                <AreaIcon className="text-mint h-5 w-5" />
                <h3 className="text-foreground mt-5 font-medium">{area.title}</h3>
                <p className="text-muted-foreground mt-3 text-sm leading-6">{area.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="border-border grid gap-10 border-t py-12 md:grid-cols-[180px_minmax(0,1fr)]">
        <div>
          <p className="text-mint text-xs font-semibold uppercase">Experience</p>
          <h2 className="text-foreground mt-2 text-2xl font-semibold">技术范围</h2>
        </div>
        <div className="divide-border divide-y">
          {expertiseGroups.map((group) => (
            <div key={group.title} className="grid gap-3 py-5 first:pt-0 sm:grid-cols-[140px_minmax(0,1fr)]">
              <h3 className="text-foreground text-sm font-medium">{group.title}</h3>
              <p className="text-muted-foreground text-sm leading-6">{group.items.join(' · ')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-border grid gap-10 border-t pt-12 md:grid-cols-[180px_minmax(0,1fr)]">
        <div>
          <p className="text-mint text-xs font-semibold uppercase">Contact</p>
          <h2 className="text-foreground mt-2 text-2xl font-semibold">联系我</h2>
        </div>
        <div className="divide-border border-border divide-y border-y">
          {contactLinks.map((contact) => {
            /** 当前联系方式对应的图标组件。 */
            const ContactIcon = contact.icon

            return (
              <Link
                key={contact.name}
                href={contact.href}
                className="text-foreground group flex items-center gap-4 py-5"
              >
                <ContactIcon className="text-muted-foreground group-hover:text-mint h-5 w-5 transition-colors" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-muted-foreground mt-1 text-sm">{contact.description}</p>
                </div>
                <ArrowUpRight className="text-muted-foreground group-hover:text-mint h-4 w-4 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
