import { cn } from '@/lib/utils'
import { PADDING_TOP } from '../const'
import { postsConfig } from './config'
import Client from './client'

const Page = async () => {
  // 从所有文章中提取唯一的标签作为分类
  const allTags = postsConfig.flatMap((post) => post.tags)
  const uniqueTags = Array.from(new Set(allTags))
  // 将 'others' 标签放在最后面
  const categories = uniqueTags.sort((a, b) => {
    if (a === 'others') return 1
    if (b === 'others') return -1
    return 0
  })

  return (
    <div className={cn('mx-auto max-w-4xl px-4 py-6', PADDING_TOP)}>
      <Client posts={postsConfig} categories={categories} />
    </div>
  )
}

export default Page
