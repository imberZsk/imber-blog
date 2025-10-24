import { PADDING_TOP } from '../const'
import { cn } from '../../../lib/utils'
import Image from 'next/image'
import Link from 'next/link'

// 技术栈配置
const techStack = [
  { name: 'HTML', level: 'Expert', color: 'bg-orange-500' },
  { name: 'CSS', level: 'Expert', color: 'bg-blue-500' },
  { name: 'JavaScript', level: 'Expert', color: 'bg-yellow-500' },
  { name: 'TypeScript', level: 'Expert', color: 'bg-blue-600' },
  { name: 'Vue', level: 'Advanced', color: 'bg-green-500' },
  { name: 'React', level: 'Expert', color: 'bg-cyan-500' },
  { name: 'Next.js', level: 'Expert', color: 'bg-black dark:bg-white' },
  { name: 'TipTap', level: 'Advanced', color: 'bg-purple-500' },
  { name: 'GSAP', level: 'Advanced', color: 'bg-green-600' },
  { name: 'Tailwind CSS', level: 'Expert', color: 'bg-teal-500' },
  { name: 'Node.js', level: 'Advanced', color: 'bg-green-700' },
  { name: 'Git', level: 'Advanced', color: 'bg-orange-600' }
]

// 联系方式配置
const contactInfo = [
  {
    name: 'GitHub',
    icon: 'github',
    link: 'https://github.com/imberZsk',
    description: '查看我的开源项目'
  },
  {
    name: 'Email',
    icon: 'email',
    link: 'mailto:a1157911285@163.com',
    description: '联系我'
  }
]

// 图标组件
const Icon = ({ name, className }: { name: string; className?: string }) => {
  const icons = {
    github: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    email: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    )
  }

  return icons[name as keyof typeof icons] || null
}

const AboutPage = () => {
  return (
    <div className={cn('mx-auto max-w-4xl px-6 py-8', PADDING_TOP)}>
      {/* 个人介绍 */}
      <div className="mb-20">
        <div className="flex flex-col items-center text-center lg:flex-row lg:items-start lg:text-left">
          {/* 头像区域 */}
          <div className="mb-8 lg:mr-12 lg:mb-0 lg:flex-shrink-0">
            <div className="relative">
              <Image
                src="/avatar.jpg"
                alt="Imber"
                width={120}
                height={120}
                className="rounded-full border-2 border-zinc-200 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-zinc-700"
                priority
              />
              {/* 装饰性背景 */}
              <div className="absolute -inset-2 -z-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 transition-opacity duration-300 hover:opacity-100"></div>
            </div>
          </div>

          {/* 个人信息 */}
          <div className="flex-1 lg:pt-2">
            <h1 className="mb-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">Imber</h1>
            <div className="mb-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                前端开发工程师
              </span>
              <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                5+ 年经验
              </span>
              <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                全栈开发
              </span>
            </div>
            <p className="text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
              专注于现代前端技术，热爱创造优秀的用户体验。擅长 React、Vue、Next.js 等框架，
              对动画效果和富文本编辑器有深入研究。致力于将技术与设计完美结合，为用户带来流畅、美观的交互体验。
            </p>
          </div>
        </div>
      </div>

      {/* 技术栈 */}
      <div className="mb-16">
        <h2 className="mb-8 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">技术栈</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {techStack.map((tech) => (
            <div
              key={tech.name}
              className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white/60 p-4 transition-all duration-300 hover:border-zinc-300 hover:bg-white/80 hover:shadow-lg dark:border-zinc-800/50 dark:bg-zinc-900/40 dark:hover:border-zinc-700/60 dark:hover:bg-zinc-800/60"
            >
              <div className="flex items-center gap-3">
                <div className={cn('h-3 w-3 rounded-full', tech.color)}></div>
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{tech.name}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{tech.level}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 联系方式 */}
      <div className="mb-16">
        <h2 className="mb-8 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">联系方式</h2>
        <div className="flex flex-col gap-4 sm:flex-row">
          {contactInfo.map((contact) => (
            <Link
              key={contact.name}
              href={contact.link}
              className="group flex flex-1 items-center gap-4 rounded-lg border border-zinc-200 bg-white/60 p-6 transition-all duration-300 hover:border-zinc-300 hover:bg-white/80 hover:shadow-lg dark:border-zinc-800/50 dark:bg-zinc-900/40 dark:hover:border-zinc-700/60 dark:hover:bg-zinc-800/60"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Icon name={contact.icon} className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{contact.name}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">{contact.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 底部装饰 */}
      <div className="flex justify-center">
        <div className="flex gap-1">
          <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
          <div className="h-1 w-1 rounded-full bg-zinc-400 dark:bg-zinc-600"></div>
          <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
        </div>
      </div>
    </div>
  )
}

export default AboutPage
