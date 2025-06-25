import { PADDING_TOP } from '../const'
import { cn } from '../../../lib/utils'
import Client from './client'
import { IdeaCategory } from './const'

export interface Idea {
  title: string
  content: {
    children: {
      text: string
    }[]
  }[]
  createdAt: string
  updatedAt: string
  category: string
  // | '🤔' | '✨' | '🚀' | '❤️'
  mood: '💭' | '💡'
  type: IdeaCategory
}

const Page = async () => {
  const data = await fetch('https://grounded-crystal-d6a5ec67a5.strapiapp.com/api/ideas')

  const ideas = await data.json()

  return (
    <div className={cn('mx-auto max-w-3xl px-6 py-12', PADDING_TOP)}>
      {/* 页面标题 */}
      <div className="mb-16">
        <h1 className="text-3xl font-light tracking-wide text-zinc-100">思考</h1>
        <p className="mt-2 text-sm text-zinc-500">记录瞬间的思考与灵感</p>
      </div>

      <Client ideas={ideas.data} />

      {/* 空状态 */}
      {ideas.data.length === 0 && (
        <div className="py-32 text-center">
          <div className="mb-6 text-4xl text-zinc-700">💭</div>
          <h3 className="mb-2 text-lg font-light text-zinc-400">暂无想法记录</h3>
          <p className="text-sm text-zinc-600">记录下你的第一个想法吧</p>
        </div>
      )}
    </div>
  )
}

export default Page
