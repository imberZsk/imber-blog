import Link from 'next/link'
import { postsConfig } from '../../../config'
import { Calendar, Tag, Eye } from 'lucide-react'
import { PADDING_TOP } from '../const'
import { cn } from '../../../lib/utils'

const Page = () => {
  return (
    <div className={cn('mx-auto max-w-4xl px-4 py-8', PADDING_TOP)}>
      <div className="space-y-8">
        {postsConfig.map((post, index) => (
          <Link
            href={post.href}
            key={index}
            className="group block space-y-3 rounded-lg bg-zinc-900/50 p-6 transition-all hover:bg-zinc-900/70"
          >
            <h2 className="text-xl font-semibold text-zinc-100 group-hover:text-blue-400">{post.title}</h2>

            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{post.date}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Tag className="h-4 w-4" />
                {post.tags.map((tag, tagIndex) => (
                  <span key={tagIndex} className="rounded bg-zinc-800 px-2 py-0.5 text-xs">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{post.views}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Page
