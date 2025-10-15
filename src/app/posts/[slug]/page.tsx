import { Tiptap } from '@/components/editor'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { remark } from 'remark'
import html from 'remark-html'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // 根据 slug 拼接文件路径
  // 将 editor0 映射为 tiptap0.md
  const fileName = slug.replace('editor', 'tiptap')
  const filePath = join(process.cwd(), 'src', 'content', 'editor', `${fileName}.md`)

  let content = ''
  try {
    // 读取 md 文件内容
    const markdownContent = await readFile(filePath, 'utf-8')
    // 将 Markdown 转换为 HTML
    const processedContent = await remark().use(html).process(markdownContent)
    content = processedContent.toString()
  } catch (error) {
    console.error('读取文件失败:', error)
    content = '<h1>文件未找到</h1><p>请检查文件路径是否正确。</p>'
  }

  return <Tiptap content={content}></Tiptap>
}

export function generateStaticParams() {
  return [{ slug: 'editor0' }, { slug: 'editor1' }, { slug: 'editor2' }, { slug: 'editor3' }, { slug: 'editor4' }]
}

export const dynamicParams = false
