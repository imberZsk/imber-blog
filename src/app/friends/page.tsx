'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Github, Mail } from 'lucide-react'
import { PADDING_TOP } from '../const'
import { cn } from '../../../lib/utils'
import Link from 'next/link'
import Image from 'next/image'

interface Friend {
  id: string
  name: string
  description: string
  website: string
  avatar: string
  category: string
  social?: {
    github?: string
    twitter?: string
    email?: string
  }
  createdAt: string
}

const defaultFriends: Friend[] = [
  {
    id: '1',
    name: 'Vercel',
    description: '现代化的前端开发平台，提供快速的部署和优化的开发体验',
    website: '/',
    avatar: '/avatar.jpg',
    category: '技术博客',
    social: {
      github: 'https://github.com/vercel'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Next.js',
    description: 'React 的生产级框架，提供最佳的开发者体验和性能优化',
    website: '/',
    avatar: '/avatar.jpg',
    category: '技术博客',
    social: {
      github: 'https://github.com/vercel/next.js'
    },
    createdAt: new Date().toISOString()
  }
]

const Page = () => {
  const [friends, setFriends] = useState<Friend[]>([])

  // 加载数据
  useEffect(() => {
    const savedFriends = localStorage.getItem('friends')
    if (savedFriends) {
      setFriends(JSON.parse(savedFriends))
    } else {
      setFriends(defaultFriends)
      localStorage.setItem('friends', JSON.stringify(defaultFriends))
    }
  }, [])

  return (
    <div className={cn('mx-auto max-w-4xl px-4 py-8', PADDING_TOP)}>
      {/* 朋友列表 - 单行卡片设计 */}
      <div className="space-y-6">
        <AnimatePresence>
          {friends.map((friend, index) => (
            <motion.div
              key={friend.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative"
            >
              {/* 横向卡片 */}
              <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition-all duration-300 hover:shadow-lg hover:ring-zinc-300 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:ring-zinc-600">
                <div className="flex items-center gap-6">
                  {/* 头像 */}
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md dark:ring-zinc-700">
                    <Image
                      src={friend.avatar}
                      alt={friend.name}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/avatar.jpg'
                      }}
                    />
                  </div>

                  {/* 信息内容 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between">
                      {/* 左侧信息 */}
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="mb-2 flex items-center gap-3">
                          <h3 className="truncate text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                            {friend.name}
                          </h3>
                          <span className="inline-block flex-shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                            {friend.category}
                          </span>
                        </div>

                        <p className="line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {friend.description}
                        </p>

                        {/* 社交媒体 */}
                        {(friend.social?.github || friend.social?.twitter || friend.social?.email) && (
                          <div className="mt-3 flex items-center gap-2">
                            {friend.social?.github && (
                              <Link
                                href={friend.social.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg bg-zinc-100 p-2 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600"
                              >
                                <Github className="h-4 w-4" />
                              </Link>
                            )}

                            {friend.social?.email && (
                              <Link
                                href={`mailto:${friend.social.email}`}
                                className="rounded-lg bg-zinc-100 p-2 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600"
                              >
                                <Mail className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 右侧访问按钮 */}
                      <div className="flex-shrink-0"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 空状态 */}
      {friends.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
          <h3 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">还没有朋友</h3>
          <p className="text-zinc-600 dark:text-zinc-400">暂无朋友信息</p>
        </motion.div>
      )}
    </div>
  )
}

export default Page
