import type { Metadata } from 'next'
import { PADDING_TOP } from '@/app/const'
import { cn } from '@/lib/utils'
import { getKnowledgeArticles } from '@/lib/knowledge'
import { KnowledgeBrowser } from './knowledge-browser'

/** 知识库列表页的搜索引擎元数据。 */
export const metadata: Metadata = {
  title: '知识库',
  description: '按主题浏览后端、AI 编程、Agent、测试和一人公司等学习笔记。'
}

/** 渲染知识库的主题筛选和文章索引。 */
export default function KnowledgePage() {
  /** 从同步内容中生成的全部知识文章元数据。 */
  const articles = getKnowledgeArticles()
  /** 按课程在文件系统中的编号顺序生成筛选项。 */
  const topics = Array.from(new Set(articles.map((article) => article.topic)))

  return (
    <main className={cn('mx-auto max-w-6xl px-4 pb-16', PADDING_TOP)}>
      <header className="border-border mb-8 border-b pb-6">
        <h1 className="text-foreground text-2xl font-semibold">知识库</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {articles.length} 篇学习内容，按学习指南、主课、实践和扩展资料依次整理。
        </p>
      </header>
      <KnowledgeBrowser articles={articles} topics={topics} />
    </main>
  )
}
