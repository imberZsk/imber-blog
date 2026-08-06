import { cn } from '@/lib/utils'
import { PADDING_TOP } from '../const'
import Client from './client'
import { getPosts } from '@/lib/posts'

/** 渲染当前原创文集；目录为空时显示空状态。 */
const Page = async () => {
  /** 从 Markdown 目录自动生成的原创文章。 */
  const posts = getPosts()
  /** 当前文集中全部唯一分类。 */
  const categories = Array.from(new Set(posts.flatMap((post) => post.tags)))

  return (
    <div className={cn('mx-auto max-w-4xl px-4 py-6', PADDING_TOP)}>
      <Client posts={posts} categories={categories} />
    </div>
  )
}

export default Page
