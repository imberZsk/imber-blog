'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, BookOpen } from 'lucide-react'
import { PADDING_TOP } from '../const'
import { cn } from '../../../lib/utils'

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  category: string
  mood: '💭' | '💡' | '🤔' | '✨' | '🚀' | '❤️'
}

const defaultNotes: Note[] = [
  {
    id: '1',
    title: '关于代码可读性的思考',
    content:
      '今天在重构代码时，突然意识到好的代码不仅要运行正确，更要让其他开发者能够快速理解。清晰的命名、合理的抽象、恰当的注释，这些看似简单的原则，实际上需要长期的积累和思考。',
    category: '技术思考',
    mood: '💭',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    title: 'Next.js 的学习心得',
    content:
      'Next.js 的服务端渲染和静态生成功能真的很强大，特别是在 SEO 和性能优化方面。App Router 的引入让路由管理变得更加直观，虽然学习曲线有点陡峭，但掌握后开发效率大大提升。',
    category: '技术思考',
    mood: '💡',
    createdAt: '2024-01-14T15:20:00Z',
    updatedAt: '2024-01-14T15:20:00Z'
  },
  {
    id: '3',
    title: '时间管理的重要性',
    content:
      '最近发现合理安排时间对提高工作效率很重要。番茄工作法确实有效，25分钟专注工作，5分钟休息，这样的节奏让我能保持更长时间的高效状态。关键是要坚持执行。',
    category: '生活感悟',
    mood: '✨',
    createdAt: '2024-01-13T09:15:00Z',
    updatedAt: '2024-01-13T09:15:00Z'
  }
]

const Page = () => {
  const [notes, setNotes] = useState<Note[]>([])

  // 加载数据
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes')
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes))
    } else {
      setNotes(defaultNotes)
      localStorage.setItem('notes', JSON.stringify(defaultNotes))
    }
  }, [])

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
    <div className={cn('mx-auto max-w-4xl px-4 py-8', PADDING_TOP)}>
      {/* 笔记列表 - 单行卡片设计 */}
      <div className="space-y-6">
        <AnimatePresence>
          {notes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative"
            >
              {/* 横向卡片 */}
              <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition-all duration-300 hover:shadow-lg hover:ring-zinc-300 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:ring-zinc-600">
                <div className="flex items-start gap-6">
                  {/* 心情图标 */}
                  <div className="flex-shrink-0">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl dark:bg-blue-900/20">
                      {note.mood}
                    </div>
                  </div>

                  {/* 笔记内容 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between">
                      {/* 左侧信息 */}
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="mb-2 flex items-center gap-3">
                          <h3 className="truncate text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                            {note.title}
                          </h3>
                          <span className="inline-block flex-shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                            {note.category}
                          </span>
                        </div>

                        <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {note.content}
                        </p>

                        {/* 时间信息 */}
                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(note.createdAt)}</span>
                          {note.updatedAt !== note.createdAt && <span className="ml-2 text-blue-500">已编辑</span>}
                        </div>
                      </div>

                      {/* 右侧占位 */}
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
      {notes.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
          <h3 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">还没有笔记</h3>
          <p className="text-zinc-600 dark:text-zinc-400">暂无笔记信息</p>
        </motion.div>
      )}
    </div>
  )
}

export default Page
