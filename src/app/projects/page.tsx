import Image from 'next/image'
import Link from 'next/link'
import { Download, ExternalLink } from 'lucide-react'

import { Badge, Button, Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import { PADDING_TOP } from '../const'
import { layoutConfig, projectsConfig } from './config'

/** 展示个人作品与参与交付的公司项目。 */
const Page = async () => {
  return (
    <div className={cn('mx-auto max-w-6xl px-4 py-8 sm:px-6', PADDING_TOP)}>
      <header className="border-border mb-8 border-b pb-6">
        <h1 className="text-foreground text-2xl font-semibold">作品</h1>
        <p className="text-muted-foreground mt-2 text-sm">个人产品实验与参与交付的商业项目。</p>
      </header>

      <div
        className={cn('grid', layoutConfig.grid.mobile, layoutConfig.grid.tablet, layoutConfig.grid.desktop, 'gap-5')}
      >
        {projectsConfig.map((project, index) => (
          <Card
            key={project.id}
            className="group bg-card hover:border-foreground/30 h-full overflow-hidden transition-colors"
          >
            <Link
              href={project.link}
              className="block"
              target="_blank"
              rel="noreferrer"
              aria-label={`查看${project.name}`}
            >
              <div className="border-border bg-muted relative aspect-video w-full overflow-hidden border-b">
                <Image
                  src={project.image}
                  alt={project.name}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  priority={index < 3}
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                  quality={85}
                />
                <Badge variant="outline" className="bg-background/95 absolute top-3 left-3 backdrop-blur-sm">
                  <span className="bg-mint size-1.5 rounded-full" aria-hidden="true" />
                  {project.type === 'personal' ? '个人' : '公司'}
                </Badge>
              </div>
            </Link>

            <CardContent className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={project.link}
                  className="group/link flex min-w-0 items-start gap-2"
                  target="_blank"
                  rel="noreferrer"
                >
                  <h2 className="text-foreground text-base font-semibold">{project.name}</h2>
                  <ExternalLink
                    className="text-muted-foreground group-hover/link:text-foreground mt-0.5 size-4 shrink-0 transition-colors"
                    aria-hidden="true"
                  />
                </Link>
              </div>
              <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-6">{project.description}</p>
              <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                <div className="flex flex-wrap gap-1.5">
                  {project.tech.map((tech) => (
                    <Badge key={tech} variant="secondary" className="text-muted-foreground font-normal">
                      {tech}
                    </Badge>
                  ))}
                </div>
                {project.releaseUrl ? (
                  <Button asChild variant="outline" size="sm" className="rounded-md">
                    <Link
                      href={project.releaseUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`下载${project.name}最新版本`}
                    >
                      <Download aria-hidden="true" />
                      下载
                    </Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default Page
