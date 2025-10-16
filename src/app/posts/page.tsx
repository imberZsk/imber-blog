import { cn } from '@/lib/utils'
import { PADDING_TOP } from '../const'
import Client from './client'
import { postsConfig } from './config'

const Page = async () => {
  // 从 postsConfig 中动态提取所有唯一的分类
  const categories = Array.from(new Set(postsConfig.flatMap((post) => post.tags)))

  return (
    <div className={cn('mx-auto max-w-4xl px-4 py-6', PADDING_TOP)}>
      <Client posts={postsConfig} categories={categories} />
    </div>
  )
}

export default Page
