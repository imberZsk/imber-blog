import { PADDING_TOP } from '../const'
import { cn } from '../../../lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { projectsConfig, layoutConfig, themeConfig } from './config'

const Page = async () => {
  return (
    <div className={cn(`mx-auto ${layoutConfig.maxWidth} ${layoutConfig.spacing.padding}`, PADDING_TOP)}>
      {/* 页面标题 */}
      <div className="mb-12">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-medium tracking-wide text-zinc-800 dark:text-zinc-200">Projects</h1>
        </div>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-500">个人作品与公司项目展示</p>
      </div>

      {/* 项目网格 - PC端3行布局 */}
      <div
        className={cn(
          'grid',
          layoutConfig.grid.mobile,
          layoutConfig.grid.tablet,
          layoutConfig.grid.desktop,
          layoutConfig.spacing.gap
        )}
      >
        {projectsConfig.map((project, index) => (
          <Link key={project.id} href={project.link} className="group block">
            <div
              className={cn(
                'relative overflow-hidden rounded-xl backdrop-blur-sm transition-all duration-300',
                themeConfig.card.border,
                themeConfig.card.background,
                themeConfig.card.hover.border,
                themeConfig.card.hover.background,
                themeConfig.card.hover.shadow
              )}
            >
              {/* 项目截图 */}
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800/30">
                <Image
                  src={project.image}
                  alt={project.name}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-all duration-500 group-hover:scale-105"
                  priority={index < 3}
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                  quality={85}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>

                {/* 项目类型标签 */}
                <div className="absolute top-3 left-3">
                  <span
                    className={cn(
                      'rounded-full px-2 py-1 text-xs font-medium backdrop-blur-sm',
                      project.type === 'personal'
                        ? `${themeConfig.typeColors.personal.light} ${themeConfig.typeColors.personal.dark}`
                        : `${themeConfig.typeColors.company.light} ${themeConfig.typeColors.company.dark}`
                    )}
                  >
                    {project.type === 'personal' ? '个人' : '公司'}
                  </span>
                </div>

                {/* 悬浮时的链接指示器 */}
                <div className="absolute top-3 right-3 opacity-0 transition-opacity duration-200 group-hover:opacity-90">
                  <div className="rounded-full bg-black/40 p-2 backdrop-blur-sm">
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
                  <div className="absolute top-3 right-12 opacity-0 transition-opacity duration-200 group-hover:opacity-90">
                    <div className="rounded-full bg-black/40 p-2 backdrop-blur-sm">
                      <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* 项目信息 */}
              <div className="p-4">
                {/* 项目名称 */}
                <h3 className="mb-2 text-lg font-medium text-zinc-800 transition-colors duration-200 group-hover:text-zinc-900 dark:text-zinc-200 dark:group-hover:text-white">
                  {project.name}
                </h3>

                {/* 项目描述 */}
                <p className="mb-3 line-clamp-2 text-sm text-zinc-600 transition-colors duration-200 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-300">
                  {project.description}
                </p>

                {/* 技术标签 */}
                <div className="flex flex-wrap gap-1.5">
                  {project.tech.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-md bg-zinc-100/80 px-2 py-1 text-xs text-zinc-600 transition-colors duration-200 group-hover:bg-zinc-200/80 group-hover:text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:group-hover:bg-zinc-700/60 dark:group-hover:text-zinc-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* 整体悬浮效果 */}
              <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            </div>
          </Link>
        ))}
      </div>

      {/* 底部装饰 */}
      <div className="mt-16 flex justify-center">
        <div className="flex gap-1">
          <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
          <div className="h-1 w-1 rounded-full bg-zinc-400 dark:bg-zinc-600"></div>
          <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
        </div>
      </div>
    </div>
  )
}

export default Page
