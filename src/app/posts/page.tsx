'use client'

import Link from 'next/link'
import { postsConfig } from './config'
import { Calendar, Tag, Eye } from 'lucide-react'
import { PADDING_TOP } from '../const'
import { cn } from '../../../lib/utils'
import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import PostCategories from '@/components/PostCategories'

const Page = () => {
  const [activeCategory, setActiveCategory] = useState('all')

  // 从所有文章中提取唯一的标签作为分类
  const categories = useMemo(() => {
    const allTags = postsConfig.flatMap((post) => post.tags)
    return Array.from(new Set(allTags))
  }, [])

  // 根据选中的分类筛选文章
  const filteredPosts = useMemo(() => {
    if (activeCategory === 'all') {
      return postsConfig
    }
    return postsConfig.filter((post) => post.tags.includes(activeCategory))
  }, [activeCategory])

  return (
    <div className={cn('mx-auto max-w-4xl px-4 py-6', PADDING_TOP)}>
      {/* 分类选择器 */}
      <PostCategories categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

      {/* 文章列表 */}
      <div className="space-y-4">
        {filteredPosts.map((post, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
          >
            <Link
              href={post.href}
              className="group block space-y-2 rounded-md border border-zinc-200/50 bg-white/80 p-4 transition-all hover:border-zinc-300 hover:bg-zinc-50/90 hover:shadow-sm dark:border-zinc-800/50 dark:bg-zinc-950/80 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/90"
            >
              <h2 className="text-lg font-medium text-zinc-800 transition-colors group-hover:text-zinc-900 dark:text-zinc-200 dark:group-hover:text-white">
                {post.title}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{post.date}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag className="h-3 w-3" />
                  {post.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-xs transition-colors',
                        tag === activeCategory
                          ? 'bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{post.views}</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default Page
