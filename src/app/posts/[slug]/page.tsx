import { readFile } from 'fs/promises'
import { remark } from 'remark'
import html from 'remark-html'
import fs from 'node:fs'
import { join } from 'node:path'
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // 定义内容目录映射
  const contentDirs = ['editor', 'cli', 'ai', 'performance', 'nextjs', 'sentry']

  let content = ''
  let filePath = ''

  // 尝试在不同目录中查找文件
  for (const dir of contentDirs) {
    try {
      // 处理不同的命名规则
      let fileName = slug

      // 特殊处理：editor 目录中的文件命名规则
      if (dir === 'editor') {
        // 如果 slug 以 tiptap 开头，直接使用
        if (slug.startsWith('tiptap')) {
          fileName = slug
        }
        // 如果 slug 以 editor 开头，转换为 tiptap
        else if (slug.startsWith('editor')) {
          fileName = slug.replace('editor', 'tiptap')
        }
        // 其他情况直接使用原 slug
        else {
          fileName = slug
        }
      }

      filePath = join(process.cwd(), 'src', 'content', dir, `${fileName}.md`)

      // 尝试读取文件
      const markdownContent = await readFile(filePath, 'utf-8')
      const processedContent = await remark().use(html).process(markdownContent)
      content = processedContent.toString()

      // 如果成功读取，跳出循环
      break
    } catch (error) {
      // 如果当前目录找不到文件，继续尝试下一个目录
      console.warn(`目录 ${dir} 找不到文件 ${error}`)
      continue
    }
  }

  // 如果所有目录都找不到文件
  if (!content) {
    console.error('在所有目录中都找不到文件:', slug)
    content = '<h1>文件未找到</h1><p>请检查文件路径是否正确。</p>'
  }

  return <SimpleEditor content={content} editable={false}></SimpleEditor>
}

export function generateStaticParams() {
  // 定义内容目录
  const contentDirs = ['editor', 'cli', 'ai', 'performance', 'nextjs', 'sentry']

  // 读取所有目录中的文章
  const allPosts: string[] = []

  contentDirs.forEach((dir) => {
    try {
      const dirPath = join(process.cwd(), 'src', 'content', dir)
      const posts = fs.readdirSync(dirPath)

      // 处理不同的命名规则
      posts.forEach((post) => {
        const slug = post.replace('.md', '')

        // 对于 editor 目录，保持原文件名作为 slug
        // 不需要转换，因为文件本身就是 tiptap-xxx.md
        allPosts.push(slug)
      })
    } catch (error) {
      // 如果目录不存在，跳过
      console.warn(`目录 ${dir} 不存在，跳过 ${error}`)
    }
  })

  return allPosts.map((post) => ({ slug: post }))
}

export const dynamicParams = false
