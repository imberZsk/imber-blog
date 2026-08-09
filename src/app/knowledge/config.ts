/** 知识库与思维导图共用的三条学习主线标识。 */
export type KnowledgeTrackSlug = 'full-stack' | 'ai-coding' | 'ai-apps'

/** 知识库主线导航所需的展示与链接信息。 */
export interface KnowledgeTrack {
  slug: KnowledgeTrackSlug
  label: string
  description: string
  mindmapHref: string
}

/** 与三张思维导图一一对应的知识库主线。 */
export const KNOWLEDGE_TRACKS: KnowledgeTrack[] = [
  {
    slug: 'full-stack',
    label: '全栈开发',
    description: '前端、后端与工程测试',
    mindmapHref: '/mindmaps/01-%E5%85%A8%E6%A0%88%E5%BC%80%E5%8F%91'
  },
  {
    slug: 'ai-coding',
    label: 'AI 编程',
    description: '工具、工作流与协作方法',
    mindmapHref: '/mindmaps/02-AI%E7%BC%96%E7%A8%8B'
  },
  {
    slug: 'ai-apps',
    label: 'AI 大模型应用开发',
    description: '模型、RAG、Agent 与产品实践',
    mindmapHref: '/mindmaps/03-AI%E5%A4%A7%E6%A8%A1%E5%9E%8B%E5%BA%94%E7%94%A8%E5%BC%80%E5%8F%91'
  }
]

/** 未指定 URL 参数时默认展示的知识主线。 */
export const DEFAULT_KNOWLEDGE_TRACK: KnowledgeTrackSlug = KNOWLEDGE_TRACKS[0].slug

/**
 * 判断 URL 参数是否为已发布的知识主线。
 * @param value 待校验的 track 查询参数。
 */
export function isKnowledgeTrackSlug(value: string | undefined): value is KnowledgeTrackSlug {
  return KNOWLEDGE_TRACKS.some((track) => track.slug === value)
}
