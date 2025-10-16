import { cn } from '@/lib/utils'
import { PADDING_TOP } from '../const'
// import { postsConfig } from './config'
import Client from './client'
import fs from 'node:fs'
import { join } from 'node:path'

const Page = async () => {
  // 从所有文章中提取唯一的标签作为分类
  // const allTags = postsConfig.flatMap((post) => post.tags)
  // const uniqueTags = Array.from(new Set(allTags))
  // // 将 'others' 标签放在最后面
  // const categories = uniqueTags.sort((a, b) => {
  //   if (a === 'others') return 1
  //   if (b === 'others') return -1
  //   return 0
  // })

  // 读取所有文章
  const posts = fs.readdirSync(join(process.cwd(), 'src', 'content', 'editor'))

  // 根据文件名映射到实际标题
  const titleMap: Record<string, string> = {
    tiptap0: 'TipTap 编辑器（0）- 功能测试',
    tiptap1: 'TipTap 编辑器（1）- 入门指南',
    tiptap2: 'TipTap 编辑器（2）- 样式隔离',
    tiptap3: 'TipTap 编辑器（3）- 菜单栏',
    tiptap4: 'TipTap 编辑器（4）- 插件开发',
    tiptap5: 'TipTap 编辑器（5）- 高级功能'
  }

  const postsConfig = posts.map((post) => {
    const fileName = post.replace('.md', '')
    return {
      title: titleMap[fileName] || fileName,
      href: `/posts/${fileName}`,
      date: '2025-07-29',
      tags: ['editor']
    }
  })

  const categories = ['editor']

  return (
    <div className={cn('mx-auto max-w-4xl px-4 py-6', PADDING_TOP)}>
      <Client posts={postsConfig} categories={categories} />
    </div>
  )
}

export default Page
