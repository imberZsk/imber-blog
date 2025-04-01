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
    <div className={cn('mx-auto max-w-4xl px-4 py-8', PADDING_TOP)}>
      {/* 分类选择器 */}
      <PostCategories categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

      {/* 文章列表 */}
      <div className="space-y-8">
        {filteredPosts.map((post, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Link
              href={post.href}
              className="group block space-y-3 rounded-lg bg-zinc-900/50 p-6 transition-all hover:bg-zinc-900/80 hover:shadow-lg hover:shadow-zinc-900/20"
            >
              <h2 className="text-xl font-semibold text-zinc-100 transition-colors group-hover:text-amber-300/90">
                {post.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{post.date}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {post.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className={cn(
                        'rounded bg-zinc-800 px-2 py-0.5 text-xs',
                        tag === activeCategory && 'bg-blue-500/20 text-blue-400'
                      )}
                    >
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
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default Page
