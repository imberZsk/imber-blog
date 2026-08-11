/** 知识库与思维导图共用的三条学习主线标识。 */
export type KnowledgeTrackSlug = 'full-stack' | 'ai-coding' | 'ai-apps'

/** 知识库主线导航所需的展示与链接信息。 */
export interface KnowledgeTrack {
  slug: KnowledgeTrackSlug
  label: string
  description: string
  mindmapHref: string
  modules: readonly string[]
}

/** 三条知识路线与思维导图共用的一级模块名称。 */
export const KNOWLEDGE_MODULE_LABELS = {
  fullStack: {
    frontend: '前端',
    backend: '后端',
    testing: '测试',
    operations: '运维',
    business: '业务'
  },
  aiCoding: {
    promptEngineering: '提示词工程',
    claudeCode: 'Claude Code',
    codex: 'Codex',
    skills: 'Skills',
    agentHarness: 'Agent Harness',
    superpowers: 'Superpowers'
  },
  aiApps: {
    agentEngineering: 'Agent 工程',
    enterpriseKnowledge: '企业级知识库',
    soloCompany: '一人公司'
  }
} as const

/** 与三张思维导图一一对应的知识库主线。 */
export const KNOWLEDGE_TRACKS: KnowledgeTrack[] = [
  {
    slug: 'full-stack',
    label: '全栈开发',
    description: '前后端工程实践',
    mindmapHref: '/mindmaps/01-%E5%85%A8%E6%A0%88%E5%BC%80%E5%8F%91',
    modules: Object.values(KNOWLEDGE_MODULE_LABELS.fullStack)
  },
  {
    slug: 'ai-coding',
    label: 'AI 编程',
    description: 'AI 驱动研发实践',
    mindmapHref: '/mindmaps/02-AI%E7%BC%96%E7%A8%8B',
    modules: Object.values(KNOWLEDGE_MODULE_LABELS.aiCoding)
  },
  {
    slug: 'ai-apps',
    label: 'AI 大模型应用开发',
    description: '大模型应用工程',
    mindmapHref: '/mindmaps/03-AI%E5%A4%A7%E6%A8%A1%E5%9E%8B%E5%BA%94%E7%94%A8%E5%BC%80%E5%8F%91',
    modules: Object.values(KNOWLEDGE_MODULE_LABELS.aiApps)
  }
]

/** 未指定 URL 参数时默认展示的知识主线。 */
export const DEFAULT_KNOWLEDGE_TRACK: KnowledgeTrackSlug = KNOWLEDGE_TRACKS[0].slug

/**
 * 判断 URL 参数是否为已发布的知识主线。
 * @param value 待校验的 track 查询参数。
 */
export function isKnowledgeTrackSlug(value: string | null | undefined): value is KnowledgeTrackSlug {
  return KNOWLEDGE_TRACKS.some((track) => track.slug === value)
}
