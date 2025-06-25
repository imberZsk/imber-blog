'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Dot } from 'lucide-react'
import { PADDING_TOP } from '../const'
import { cn } from '../../../lib/utils'

interface Note {
  title: string
  content: string
  createdAt: string
  updatedAt: string
  category: string
  mood: '💭' | '💡' | '🤔' | '✨' | '🚀' | '❤️'
}

const defaultNotes: Note[] = [
  {
    title: '回头看看博客已经做了哪些事情',
    content:
      '可能明天数据存储搞好，这些事情就可以放进清单完成事项里。1、项目基础架构，比如基本的文章渲染方案，代码提交规范，项目响应式的实现，首页的实现，主题切换；2、基于 Nextjs 实现的 MDX 渲染，实现了文集页面，文章页面；3、Sandpack 集成到文章里，这里踩了不少坑，现在也不太完美，先将就，后需引入编辑器还会看；4、实现了想法页面；5、实现了画廊页面，涉及瀑布流，虚拟列表（待完成），github 图床，jsdeliver CDN；6、回头优化了一版 UI，肉眼可见变好看了；7、实现了清单页面；8、实现了朋友页面；9、实现了 Strapi 和 Supabase 接入，还差部署，估计今天或者明天搞定，大约是做了这些内容。按道理花了不少时间，还有一些时间去写文章去了，比如重新总结了自适应和响应式，还有 Cursor 怎么写一个 MCP 等',
    category: '技术思考',
    mood: '💡',
    createdAt: '2025-06-24T10:30:00Z',
    updatedAt: '2025-06-24T10:30:00Z'
  },
  {
    title: 'Strapi 部署问题',
    content:
      '发现 strapi 不能直接部署到 netlify，因为netlify 和 vercel 都是属于静态托管一类的，strapi 的 node 服务不能这样部署，所以得买个服务器用 docker 部署，它自己的 cloud 有免费额度，用着先',
    category: '技术思考',
    mood: '💡',
    createdAt: '2025-06-24T10:30:00Z',
    updatedAt: '2025-06-24T10:30:00Z'
  },
  {
    title: '克服拖延症！',
    content:
      '发现很容易说后面，后续怎么样怎么样，结果可能又忘记了，或者没做，这类后需往往自己不太熟悉的，对于陌生的东西总有些抵触，也算一种拖延症，需要克服下，所以下面这条想法一定要做，就是接入 Strapi 和 Supabase 数据库！否则就会被卡住博客进度',
    category: '生活思考',
    mood: '💭',
    createdAt: '2025-06-24T10:30:00Z',
    updatedAt: '2025-06-24T10:30:00Z'
  },
  {
    title: '部署 Strapi ',
    content:
      'Strapi 对公司业务来说很有用，所以思考下，先部署个 Strapi ，然后接入 Supabase 数据库，但后需还是需要 Prisma，多种方案都用用吧',
    category: '技术思考',
    mood: '💭',
    createdAt: '2025-06-24T10:30:00Z',
    updatedAt: '2025-06-24T10:30:00Z'
  },
  {
    title: '实现 TODO LIST 来记录偶尔的想法',
    content:
      '偶尔会出现一些想做的事，但可能因为懒惰，或者因为其他原因，没有去做，所以准备加一个 TODO LIST 来记录。因为这是个人博客，所以不能存到 LocalStorage，准备接入 Supabase 数据库和 Prisma ORM 来实现。',
    category: '技术思考',
    mood: '💭',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    title: '实现画廊',
    content:
      '这个想法是因为经常给女儿拍一些照片和视频，用来记录她的成长，所以想实现一个画廊，用来展示这些照片和视频，使用了瀑布流，虚拟列表，github 图床，jsdeliver CDN。',
    category: '技术思考',
    mood: '✨',
    createdAt: '2024-01-13T09:15:00Z',
    updatedAt: '2024-01-13T09:15:00Z'
  },
  {
    title: '实现文集，支持在线展示',
    content:
      '文章是博客的基础，因为在初期阶段就在做，目前支持了 MDX 文章，文章侧边目录，Sandpack 在线编辑器集成，但还需要接入TipTap编辑器，以及数据库存储，然后还有性能监控等。',
    category: '技术思考',
    mood: '✨',
    createdAt: '2024-01-13T09:15:00Z',
    updatedAt: '2024-01-13T09:15:00Z'
  },
  {
    title: '聚合自己熟悉的技术',
    content: '想在这个博客体现和聚合自己做过的，熟悉的技术，边学习边沉淀。',
    category: '技术思考',
    mood: '💡',
    createdAt: '2024-01-14T15:20:00Z',
    updatedAt: '2024-01-14T15:20:00Z'
  },
  {
    title: '做一个属于自己的博客',
    content:
      '做一个属于自己的博客，相信很多程序员都会有这个想法，但是这个过程并不简单，我也曾经放弃过；思考下之前失败的原因，一个是设计困难，前端不是 UI ，博客 UI 不好看也就没有了兴趣；另一个是时间，做一个博客需要大量的时间花费在上面；最后是技术，需要很多前后端技术来支撑博客。那为什么现在又重新开始做了呢？因为有了 AI 后，上面的这些问题都可以迎刃而解，除了时间上，AI 也可以节省很多时间，所以现在又重新开始做了。',
    category: '技术思考',
    mood: '💭',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  }
]

const Page = () => {
  const [notes, setNotes] = useState<Note[]>([])

  // 加载数据
  useEffect(() => {
    setNotes(defaultNotes)
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={cn('mx-auto max-w-3xl px-6 py-12', PADDING_TOP)}>
      {/* 页面标题 */}
      <div className="mb-16">
        <h1 className="text-3xl font-light tracking-wide text-zinc-100">思考</h1>
        <p className="mt-2 text-sm text-zinc-500">记录瞬间的思考与灵感</p>
      </div>

      {/* 笔记列表 - 极简设计 */}
      <div className="space-y-16">
        <AnimatePresence>
          {notes.map((note, index) => (
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
                    <h2 className="text-lg font-medium text-zinc-200 transition-colors duration-200 group-hover:text-white">
                      {note.title}
                    </h2>
                  </div>
                  <div className="ml-4 flex items-center gap-2 text-xs text-zinc-600">
                    <span className="text-base">{note.mood}</span>
                    <Dot className="h-3 w-3" />
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(note.createdAt)}</span>
                  </div>
                </div>

                {/* 内容 */}
                <div className="prose prose-invert prose-zinc max-w-none">
                  <p className="leading-relaxed text-zinc-400 transition-colors duration-200 group-hover:text-zinc-300">
                    {note.content}
                  </p>
                </div>

                {/* 分类标签 */}
                <div className="flex items-center gap-3">
                  <span className="border-l-2 border-zinc-700 pl-3 font-mono text-xs text-zinc-600">
                    {note.category}
                  </span>
                </div>
              </div>

              {/* 底部分割线 */}
              <div className="mt-12 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      {/* 空状态 */}
      {notes.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 text-center">
          <div className="mb-6 text-4xl text-zinc-700">💭</div>
          <h3 className="mb-2 text-lg font-light text-zinc-400">暂无想法记录</h3>
          <p className="text-sm text-zinc-600">记录下你的第一个想法吧</p>
        </motion.div>
      )}
    </div>
  )
}

export default Page
