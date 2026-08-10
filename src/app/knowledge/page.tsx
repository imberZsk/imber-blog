import type { Metadata } from 'next'
import { DEFAULT_KNOWLEDGE_TRACK } from './config'
import { KnowledgePageView } from './knowledge-page-view'

/** 知识库列表页的搜索引擎元数据。 */
export const metadata: Metadata = {
  title: '知识库',
  description: '沿着全栈开发、AI 编程和 AI 大模型应用开发三条路线浏览学习笔记。'
}

/** 渲染默认全栈路线的静态知识索引。 */
export default function KnowledgePage() {
  return <KnowledgePageView activeTrack={DEFAULT_KNOWLEDGE_TRACK} />
}
