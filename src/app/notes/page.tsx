'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit3, Trash2, Calendar, BookOpen, Search, Filter, Eye, X } from 'lucide-react'
import { PADDING_TOP } from '../const'
import { cn } from '../../../lib/utils'
import BlurText from '@/components/BlurText/BlurText'

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  category: string
  mood: '💭' | '💡' | '🤔' | '✨' | '🚀' | '❤️'
}

const categories = ['全部', '技术思考', '生活感悟', '读书笔记', '工作总结', '随想']
const moods = [
  { emoji: '💭', label: '思考' },
  { emoji: '💡', label: '灵感' },
  { emoji: '🤔', label: '疑惑' },
  { emoji: '✨', label: '顿悟' },
  { emoji: '🚀', label: '计划' },
  { emoji: '❤️', label: '感动' }
]

const Page = () => {
  const [notes, setNotes] = useState<Note[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [viewingNote, setViewingNote] = useState<Note | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    category: '技术思考',
    mood: '💭' as Note['mood']
  })

  // 加载本地存储的笔记
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes')
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes))
    }
  }, [])

  // 处理键盘事件（ESC关闭弹层）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setViewingNote(null)
        setEditingNote(null)
        setIsCreating(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 保存到本地存储
  const saveNotes = (updatedNotes: Note[]) => {
    setNotes(updatedNotes)
    localStorage.setItem('notes', JSON.stringify(updatedNotes))
  }

  // 创建笔记
  const createNote = () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return

    const note: Note = {
      id: Date.now().toString(),
      title: newNote.title,
      content: newNote.content,
      category: newNote.category,
      mood: newNote.mood,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const updatedNotes = [note, ...notes]
    saveNotes(updatedNotes)
    setNewNote({ title: '', content: '', category: '技术思考', mood: '💭' })
    setIsCreating(false)
  }

  // 编辑笔记
  const updateNote = () => {
    if (!editingNote) return

    const updatedNotes = notes.map((note) =>
      note.id === editingNote.id ? { ...editingNote, updatedAt: new Date().toISOString() } : note
    )
    saveNotes(updatedNotes)
    setEditingNote(null)
  }

  // 删除笔记
  const deleteNote = (id: string) => {
    const updatedNotes = notes.filter((note) => note.id !== id)
    saveNotes(updatedNotes)
  }

  // 筛选笔记
  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === '全部' || note.category === selectedCategory
    return matchesSearch && matchesCategory
  })

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
    <div className={cn('mx-auto max-w-6xl px-4 py-8', PADDING_TOP)}>
      {/* 页面标题 */}
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-4xl font-bold">
          <BlurText text="思考手记 " delay={50} direction="bottom" animateBy="words" className="inline-block" />
        </h1>
        <div className="text-zinc-600 dark:text-zinc-400">
          <BlurText
            text="记录平时的思考与感悟，让想法不再飘散"
            delay={100}
            direction="bottom"
            animateBy="words"
            className="inline-block"
          />
        </div>
      </div>

      {/* 工具栏 */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* 搜索和筛选 */}
        <div className="flex flex-1 gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="搜索笔记..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pr-4 pl-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div className="relative">
            <Filter className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none rounded-lg border border-zinc-200 bg-white py-2 pr-8 pl-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 新建按钮 */}
        <motion.button
          onClick={() => setIsCreating(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
        >
          <Plus className="h-4 w-4" />
          新建笔记
        </motion.button>
      </div>

      {/* 创建/编辑表单 */}
      <AnimatePresence>
        {(isCreating || editingNote) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="笔记标题..."
                    value={editingNote ? editingNote.title : newNote.title}
                    onChange={(e) => {
                      if (editingNote) {
                        setEditingNote({ ...editingNote, title: e.target.value })
                      } else {
                        setNewNote({ ...newNote, title: e.target.value })
                      }
                    }}
                    className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                  />

                  <select
                    value={editingNote ? editingNote.category : newNote.category}
                    onChange={(e) => {
                      if (editingNote) {
                        setEditingNote({ ...editingNote, category: e.target.value })
                      } else {
                        setNewNote({ ...newNote, category: e.target.value })
                      }
                    }}
                    className="rounded-lg border border-zinc-200 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                  >
                    {categories
                      .filter((cat) => cat !== '全部')
                      .map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                  </select>

                  <div className="flex gap-1">
                    {moods.map((mood) => (
                      <button
                        key={mood.emoji}
                        onClick={() => {
                          if (editingNote) {
                            setEditingNote({ ...editingNote, mood: mood.emoji as Note['mood'] })
                          } else {
                            setNewNote({ ...newNote, mood: mood.emoji as Note['mood'] })
                          }
                        }}
                        className={cn(
                          'rounded-lg px-3 py-2 text-lg transition-colors',
                          (editingNote ? editingNote.mood : newNote.mood) === mood.emoji
                            ? 'bg-blue-100 dark:bg-blue-900'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'
                        )}
                        title={mood.label}
                      >
                        {mood.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  placeholder="写下你的思考..."
                  value={editingNote ? editingNote.content : newNote.content}
                  onChange={(e) => {
                    if (editingNote) {
                      setEditingNote({ ...editingNote, content: e.target.value })
                    } else {
                      setNewNote({ ...newNote, content: e.target.value })
                    }
                  }}
                  rows={6}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsCreating(false)
                      setEditingNote(null)
                      setNewNote({ title: '', content: '', category: '技术思考', mood: '💭' })
                    }}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  >
                    取消
                  </button>
                  <button
                    onClick={editingNote ? updateNote : createNote}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
                  >
                    {editingNote ? '更新' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 笔记列表 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {filteredNotes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="group relative rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:shadow-zinc-100/20 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:shadow-zinc-900/20"
            >
              {/* 笔记头部 */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{note.mood}</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                    {note.category}
                  </span>
                </div>

                <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setViewingNote(note)}
                    className="rounded p-1 text-zinc-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                    title="查看详情"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingNote(note)}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700"
                    title="编辑"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 笔记标题 */}
              <h3 className="mb-3 line-clamp-2 font-semibold text-zinc-900 dark:text-zinc-100">{note.title}</h3>

              {/* 笔记内容 */}
              <p className="mb-4 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{note.content}</p>

              {/* 笔记时间 */}
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(note.createdAt)}</span>
                {note.updatedAt !== note.createdAt && <span className="ml-2 text-blue-500">已编辑</span>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 空状态 */}
      {filteredNotes.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
          <h3 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {searchTerm || selectedCategory !== '全部' ? '没有找到相关笔记' : '还没有笔记'}
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400">
            {searchTerm || selectedCategory !== '全部'
              ? '试试调整搜索条件或分类筛选'
              : '点击"新建笔记"开始记录你的思考'}
          </p>
        </motion.div>
      )}

      {/* 查看笔记详情模态框 */}
      <AnimatePresence>
        {viewingNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={() => setViewingNote(null)}
          >
            {/* 背景遮罩 */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* 模态框内容 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 模态框头部 */}
              <div className="flex items-center justify-between border-b border-zinc-200 p-6 dark:border-zinc-700">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{viewingNote.mood}</span>
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{viewingNote.title}</h2>
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-700">
                        {viewingNote.category}
                      </span>
                      <span>•</span>
                      <span>{formatDate(viewingNote.createdAt)}</span>
                      {viewingNote.updatedAt !== viewingNote.createdAt && <span className="text-blue-500">已编辑</span>}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setViewingNote(null)}
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 模态框内容 */}
              <div className="max-h-[60vh] overflow-y-auto p-6">
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                  <div className="leading-relaxed whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                    {viewingNote.content}
                  </div>
                </div>
              </div>

              {/* 模态框底部操作按钮 */}
              <div className="flex justify-end gap-2 border-t border-zinc-200 p-6 dark:border-zinc-700">
                <button
                  onClick={() => {
                    setViewingNote(null)
                    setEditingNote(viewingNote)
                  }}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                  <Edit3 className="h-4 w-4" />
                  编辑
                </button>
                <button
                  onClick={() => {
                    deleteNote(viewingNote.id)
                    setViewingNote(null)
                  }}
                  className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Page
