import { PADDING_TOP } from '../const'
import { cn } from '../../../lib/utils'
import Client from './client'
import { fetchFriends } from '@/services/friends'

interface Friend {
  id: string
  name: string
  description: string
  avatar: string
  link?: string
}

const Page = async () => {
  const friends: { data: Friend[] } = await fetchFriends()

  return (
    <div className={cn('mx-auto max-w-5xl px-6 py-8', PADDING_TOP)}>
      {/* 极简标题 */}
      <div className="mb-12">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium tracking-wide text-zinc-200">Friends</h1>
        </div>
        <p className="mt-3 text-xs text-zinc-500">海内存知己，天涯若比邻</p>
      </div>

      <Client friends={friends.data} />

      {/* 底部装饰 */}
      <div className="mt-16 flex justify-center">
        <div className="flex gap-1">
          <div className="h-1 w-1 rounded-full bg-zinc-700"></div>
          <div className="h-1 w-1 rounded-full bg-zinc-800"></div>
          <div className="h-1 w-1 rounded-full bg-zinc-700"></div>
        </div>
      </div>
    </div>
  )
}

export default Page
