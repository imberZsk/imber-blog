'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Dot, Clock } from 'lucide-react'
import { IdeaCategory } from './const'
import { Idea } from './page'

const Client = ({ ideas }: { ideas: Idea[] }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-16">
      <AnimatePresence>
        {ideas.map((idea: Idea, index: number) => (
          <motion.article
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="group relative"
          >
            {/* 想法内容 */}
            <div className="space-y-4">
              {/* 标题和元信息 */}
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-medium text-black transition-colors duration-200 dark:text-zinc-200 dark:group-hover:text-white">
                    {idea.title}
                  </h2>
                </div>
                <div className="ml-4 flex items-center gap-2 text-xs text-zinc-600">
                  <span className="text-base">{idea.type === IdeaCategory.Technology ? '💡' : '💭'}</span>
                  <Dot className="h-3 w-3" />
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(idea.updatedAt)}</span>
                </div>
              </div>

              {/* 内容 */}
              <div className="prose prose-invert prose-zinc max-w-none">
                <p
                  className="leading-relaxed text-zinc-400 transition-colors duration-200 group-hover:text-zinc-300"
                  dangerouslySetInnerHTML={{ __html: idea.content[0].children[0].text }}
                ></p>
              </div>

              {/* 分类标签 */}
              <div className="flex items-center gap-3">
                <span className="border-l-2 border-zinc-700 pl-3 font-mono text-xs text-zinc-600">
                  {/* {idea.category} */}
                  {idea.type === IdeaCategory.Technology ? '技术' : '生活'}
                </span>
              </div>
            </div>

            {/* 底部分割线 */}
            <div className="mt-12 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
          </motion.article>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default Client
