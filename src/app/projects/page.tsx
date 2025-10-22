import { PADDING_TOP } from '../const'
import { cn } from '../../../lib/utils'
import Link from 'next/link'
import Image from 'next/image'
// import Client from './client'
// import { fetchFriends } from '@/services/friends'

// interface Friend {
//   id: string
//   name: string
//   description: string
//   avatar: string
//   link?: string
// }

interface Project {
  id: string
  name: string
  description: string
  tech: string[]
  link: string
  github?: string
  image: string
}

// 作品网站数据
const projects: Project[] = [
  {
    id: '1',
    name: '新写的博客',
    description: '基于 Next.js 的博客，完全手写',
    tech: ['Next.js'],
    link: 'https://imber.netlify.app',
    image: '/posts/friends/blog.png'
  },
  {
    id: '2',
    name: 'GSAP & Framer Motion 动画效果',
    description: 'Framer Motion & GSAP 实现的酷炫动画效果集合',
    tech: ['Framer Motion', 'GSAP'],
    link: 'https://imber-animation.netlify.app',
    image: '/posts/friends/screenshot.png'
  },
  {
    id: '3',
    name: '富文本编辑器',
    description: '基于 tiptap3.x 的现代化富文本编辑器',
    tech: ['Tiptap', 'Next.js'],
    link: 'http://imber-editor.netlify.app/simple',
    image: '/posts/friends/editor.png' // 占位符，等用户提供图片
  },
  {
    id: '4',
    name: '面试题',
    description: 'ProcessOn 记录的面试题脑图',
    tech: ['面试题'],
    link: 'https://www.processon.com/mindmap/62ce8cea1efad406ff8300bf',
    image: '/posts/friends/ProcessOn.png'
  }
]

const companyProjects: Project[] = [
  {
    id: '1',
    name: '魅族全球官网',
    description: '魅族全球官网，使用 Next.js APP Router 服务端渲染、i18n 国际化 和 SEO 优化、响应式、Tailwind CSS',
    tech: ['Next.js i18n SEO'],
    link: 'https://www.meizu.com/global',
    image: '/posts/friends/meizu-global.png'
  },
  {
    id: '2',
    name: '领克 Z10 官网',
    description: '领克 Z10 官网，使用了 Next.js、SEO、Amap、响应式、Tailwind CSS、GSAP、Framer Motion',
    tech: ['Next.js i18n SEO'],
    link: 'https://www.xjmzstarauto.com/starbuff',
    image: '/posts/friends/z10.png'
  },
  {
    id: '3',
    name: '魅族社区',
    description: '魅族社区，React、Vite、主题切换、瀑布流、响应式',
    tech: ['Next.js i18n SEO'],
    link: 'https://www.meizu.cn/',
    image: '/posts/friends/meizu-myplus.png'
  },
  {
    id: '4',
    name: '星纪魅族集团官网',
    description: '星纪魅族集团官网，Nextjs SSG，TailwindCSS、GSAP、Three.js',
    tech: ['Next.js i18n SEO'],
    link: 'https://www.dreamsmart.com/',
    image: '/posts/friends/dreamsmart.png'
  }
]

const Page = async () => {
  // const friends: { data: Friend[] } = await fetchFriends()

  return (
    <div className={cn('mx-auto max-w-5xl px-6 py-8', PADDING_TOP)}>
      {/* 极简标题 */}
      {/* <div className="mb-12">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium tracking-wide text-zinc-800 dark:text-zinc-200">Friends</h1>
        </div>
        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-500">海内存知己，天涯若比邻</p>
      </div> */}

      {/* <Client friends={friends.data} /> */}

      {/* 作品网站展示模块 */}
      <div className="">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-medium tracking-wide text-zinc-800 dark:text-zinc-200">Projects</h2>
          </div>
          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-500">一些个人作品和技术实践</p>
        </div>

        {/* 作品网格 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {projects.map((project) => (
            <Link key={project.id} href={project.link} className="group block">
              <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-xl hover:shadow-zinc-200/50 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:hover:border-zinc-700/60 dark:hover:bg-zinc-800/60 dark:hover:shadow-black/30">
                {/* 项目截图 */}
                <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800/50">
                  <Image
                    src={project.image}
                    alt={project.name}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>

                  {/* 悬浮时的链接指示器 */}
                  <div className="absolute top-3 right-3 opacity-0 transition-opacity duration-200 group-hover:opacity-80">
                    <div className="rounded-full bg-black/50 p-2 backdrop-blur-sm">
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* GitHub 指示器 */}
                  {project.github && (
                    <div className="absolute top-3 left-3 opacity-0 transition-opacity duration-200 group-hover:opacity-80">
                      <div className="rounded-full bg-black/50 p-2 backdrop-blur-sm">
                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* 项目信息 */}
                <div className="p-5">
                  {/* 项目名称 */}
                  <h3 className="mb-2 text-lg font-medium text-zinc-800 transition-colors duration-200 group-hover:text-zinc-900 dark:text-zinc-200 dark:group-hover:text-white">
                    {project.name}
                  </h3>

                  {/* 项目描述 */}
                  <p className="mb-4 line-clamp-2 text-sm text-zinc-600 transition-colors duration-200 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-300">
                    {project.description}
                  </p>

                  {/* 技术标签 */}
                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 transition-colors duration-200 group-hover:bg-zinc-200 group-hover:text-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-400 dark:group-hover:bg-zinc-700/70 dark:group-hover:text-zinc-300"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 整体悬浮效果 */}
                <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 公司项目 */}
      <div className="mt-20">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-medium tracking-wide text-zinc-800 dark:text-zinc-200">Company Projects</h2>
          </div>
          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-500">一些公司项目</p>
        </div>

        {/* 作品网格 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {companyProjects.map((project) => (
            <Link key={project.id} href={project.link} className="group block">
              <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-xl hover:shadow-zinc-200/50 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:hover:border-zinc-700/60 dark:hover:bg-zinc-800/60 dark:hover:shadow-black/30">
                {/* 项目截图 */}
                <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800/50">
                  <Image
                    src={project.image}
                    alt={project.name}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>

                  {/* 悬浮时的链接指示器 */}
                  <div className="absolute top-3 right-3 opacity-0 transition-opacity duration-200 group-hover:opacity-80">
                    <div className="rounded-full bg-black/50 p-2 backdrop-blur-sm">
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* GitHub 指示器 */}
                  {project.github && (
                    <div className="absolute top-3 left-3 opacity-0 transition-opacity duration-200 group-hover:opacity-80">
                      <div className="rounded-full bg-black/50 p-2 backdrop-blur-sm">
                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* 项目信息 */}
                <div className="p-5">
                  {/* 项目名称 */}
                  <h3 className="mb-2 text-lg font-medium text-zinc-800 transition-colors duration-200 group-hover:text-zinc-900 dark:text-zinc-200 dark:group-hover:text-white">
                    {project.name}
                  </h3>

                  {/* 项目描述 */}
                  <p className="mb-4 line-clamp-2 text-sm text-zinc-600 transition-colors duration-200 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-300">
                    {project.description}
                  </p>

                  {/* 技术标签 */}
                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 transition-colors duration-200 group-hover:bg-zinc-200 group-hover:text-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-400 dark:group-hover:bg-zinc-700/70 dark:group-hover:text-zinc-300"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 整体悬浮效果 */}
                <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 底部装饰 */}
      <div className="mt-16 flex justify-center">
        <div className="flex gap-1">
          <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
          <div className="h-1 w-1 rounded-full bg-zinc-400 dark:bg-zinc-800"></div>
          <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
        </div>
      </div>
    </div>
  )
}

export default Page
