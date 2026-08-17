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

/** 文件系统安全名称与页面正式模块名称的共享映射。 */
export const KNOWLEDGE_DIRECTORY_MODULE_LABELS = {
  'LangSmith Langfuse': 'LangSmith / Langfuse', // 目录中的连字符在解析后为空格，页面恢复产品组合名称。
  'Tool与Function Calling': 'Tool 与 Function Calling', // 文件系统名称保持紧凑，页面明确这是工具协议前置模块。
  LoRA与微调: 'LoRA 与微调' // 目录名称保持紧凑，页面标题保留英文缩写与中文之间的空格。
} as const

/**
 * 将解析后的实体目录名称转换为页面使用的正式模块名称。
 * @param directoryLabel 已去除排序编号并把目录连字符转换为空格的名称。
 */
export function getKnowledgeDirectoryModuleLabel(directoryLabel: string): string {
  /** 当前目录是否登记了独立的页面展示名称。 */
  const mappedLabel = KNOWLEDGE_DIRECTORY_MODULE_LABELS[
    directoryLabel as keyof typeof KNOWLEDGE_DIRECTORY_MODULE_LABELS
  ]
  return mappedLabel || directoryLabel
}

/** 三条知识路线与思维导图共用的一级模块名称。 */
export const KNOWLEDGE_MODULE_LABELS = {
  aiCoding: {
    promptEngineering: '提示词工程',
    claudeCode: 'Claude Code',
    codex: 'Codex',
    skills: 'Skills',
    agentHarness: 'Agent Harness',
    superpowers: 'Superpowers'
  },
  aiApps: {
    engineeringFoundation: '工程基础',
    agentEngineering: 'Agent 工程',
    langChainPractice: 'LangChain 实战',
    langGraph: 'LangGraph',
    observability: 'LangSmith / Langfuse',
    enterpriseKnowledge: '企业级知识库',
    soloCompany: '一人公司',
    interviewQuestions: 'AI 大模型应用面试题'
  }
} as const

/** 三条学习路线重构后与实体目录一一对应的知识域。 */
export const KNOWLEDGE_TRACK_MODULES = {
  fullStack: [
    'React 源码',
    'Next.js',
    '富文本编辑器',
    '脚手架',
    'Electron',
    'Java',
    'Python',
    'Mysql',
    'Redis',
    'Elasticsearch',
    'Kafka',
    '定时任务',
    '后端架构与安全',
    'Playwright',
    'Linux',
    'Nginx',
    'Docker',
    'Kubernetes',
    'CI CD',
    '可观测性',
    '灰度发布与回滚',
    '全链路故障排查',
    'Java 面试题',
    'Python 面试题'
  ],
  aiCoding: [
    'AI 编程基础',
    'Claude Code',
    'Codex',
    '编程 Agent 生态与选型',
    'Prompt Engineering',
    'Rules Engineering',
    'Context Engineering',
    'Code Intelligence',
    'Memory',
    'Skill',
    'MCP',
    'Hooks',
    'Subagents',
    'Harness Engineering',
    'Loop Engineering',
    'Graph Engineering',
    'Automation Engineering',
    'Coding Agent SDK 与平台集成',
    'Change Engineering',
    'AI Test Engineering',
    'Browser 与 UI Verification',
    'Sandbox 与 Agent Security',
    '工程化工作流',
    '评测与治理',
    'paperclip',
    '面试题'
  ],
  aiApps: [
    'LangChain', // 先掌握模型、消息、Runnable 与结构化输出的应用骨架。
    'LlamaIndex', // 再认识以数据和索引为中心的另一套应用抽象。
    'Tool 与 Function Calling', // 在 RAG 前掌握模型提议、代码执行和工具结果回传协议。
    '文档切分', // 从原始文件得到可追溯、可检索的文本块。
    'Embedding', // 把文本块和查询映射到可比较的向量空间。
    'Milvus', // 保存向量、元数据与过滤条件，并验证近邻检索。
    'RAG', // 组合解析、索引、检索、重排、生成、引用和评测主链路。
    'Neo4j', // 在基础 RAG 之后处理图关系和受控多跳检索。
    'LangGraph', // 用显式状态图编排可恢复的多步骤工作流。
    '记忆系统', // 区分会话状态、长期记忆、冲突处理和遗忘策略。
    'Agent', // 在工具、RAG、状态图和记忆都具备后再学习自主循环。
    'Deep Agents', // 在基础 Agent 后学习文件系统、Skill、压缩和子 Agent Harness。
    '应用框架', // 对比低代码与应用级框架的适用范围。
    'LangSmith / Langfuse', // 使用 Trace、Dataset 和评测平台观察应用行为。
    '可观测性', // 建立指标、告警、质量回归和人工标注闭环。
    '生产工程', // 处理接口、权限、弹性、成本、安全和部署问题。
    '项目实战', // 把前述能力组合为可验收的完整应用。
    '大模型基础', // 应用主线之后补充模型能力边界和推理基础。
    'Transformer', // 深入注意力、生成和 KV Cache 等底层机制。
    'LoRA 与微调', // 在理解模型机制后学习参数高效微调。
    '模型工程', // 最后进入量化、推理服务和 GPU 工程。
    '面试题' // 用跨模块问题检查能否解释方案与故障边界。
  ]
} as const

/** 与三张思维导图一一对应的知识库主线。 */
export const KNOWLEDGE_TRACKS: KnowledgeTrack[] = [
  {
    slug: 'full-stack',
    label: '全栈开发',
    description: '前后端工程实践',
    mindmapHref: '/mindmaps/01-%E5%85%A8%E6%A0%88%E5%BC%80%E5%8F%91',
    modules: KNOWLEDGE_TRACK_MODULES.fullStack
  },
  {
    slug: 'ai-coding',
    label: 'AI 编程',
    description: 'AI 驱动研发实践',
    mindmapHref: '/mindmaps/02-AI%E7%BC%96%E7%A8%8B',
    modules: KNOWLEDGE_TRACK_MODULES.aiCoding
  },
  {
    slug: 'ai-apps',
    label: 'AI 大模型应用开发',
    description: '大模型应用工程',
    mindmapHref: '/mindmaps/03-AI%E5%A4%A7%E6%A8%A1%E5%9E%8B%E5%BA%94%E7%94%A8%E5%BC%80%E5%8F%91',
    modules: KNOWLEDGE_TRACK_MODULES.aiApps
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
