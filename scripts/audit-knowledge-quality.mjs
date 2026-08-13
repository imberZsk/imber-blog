import fs from 'node:fs'
import path from 'node:path'
import { remark } from 'remark'

/** 正式知识文章根目录。 */
const KNOWLEDGE_ROOT = path.join(process.cwd(), 'src', 'content', 'knowledge')

/** 三张路线思维导图所在目录。 */
const MINDMAP_ROOT = path.join(process.cwd(), 'src', 'content', 'mindmaps')

/** 旧知识路径到当前文章路径的迁移表。 */
const MIGRATION_FILE = path.join(process.cwd(), 'src', 'content', 'knowledge-path-migrations.json')

/** 不参与正式文章质量审计的目录。 */
const NON_ARTICLE_DIRECTORIES = new Set(['assets', '_shared-labs', 'lab'])

/** 三张路线思维导图文件名。 */
const MINDMAP_FILE_NAMES = ['01-全栈开发.md', '02-AI编程.md', '03-AI大模型应用开发.md']

/** 不允许作为导图知识点的写作结构或实验操作标签。 */
const GENERIC_MINDMAP_POINT_PATTERN =
  /^(?:学习目标|学习边界|在线运行|页面运行|本地查看|预期输出(?:（节选）)?|重点观察|动手实践|动手改|参考资料|本篇定位|与进阶篇的分工|一个真实场景|先从一个真实场景|工程上真正会踩的坑(?:（本篇独有）)?|一句话面试答法|复述答法|这一章怎么读|前言|复习导航|问题清单|怎么跑|看点|main\.py|一张 Mermaid 图|真实.+怎么用)$/i

/** 每篇文章在路线导图中至少需要展示的具体知识节点数。 */
const MIN_MINDMAP_POINTS = 3

/** 每篇文章在路线导图中最多允许展示的具体知识节点数。 */
const MAX_MINDMAP_POINTS = 10

/** 每个路线导图知识主题至少需要的正文解释数量。 */
const MIN_MINDMAP_DETAILS = 2

/** 每个路线导图知识主题最多允许的正文解释数量。 */
const MAX_MINDMAP_DETAILS = 3

/** 导图解释节点不能是代码、命令、表格残片或未完成的引导语。 */
const INVALID_MINDMAP_DETAIL_PATTERN =
  /^(?:https?:\/\/|pnpm |npm |npx |pip |docker |kubectl |curl |import |export |const |let |function |class |@returns|@param|\/|\{|\}|\||javascript$|typescript$|tsx$|jsx$|python$|bash$|json$|yaml$|markdown$)/i

/** 重构前高价值知识树中必须持续保留的核心术语，防止目录重生成再次压扁语义。 */
const REQUIRED_KNOWLEDGE_TERMS = {
  '01-全栈开发.md': [
    'HTML 语义化', 'CSS盒模型', '事件循环', 'TypeScript泛型', '浏览器渲染',
    'Vue', 'React', 'Next.js', 'Nuxt', '微信小程序', 'Electron',
    'MongoDB', '对象存储', 'Redis', 'Elasticsearch', 'Kafka',
    'Nginx', 'Docker', 'Kubernetes', 'CI/CD', 'OpenTelemetry', 'Prometheus', 'Grafana', 'trace_id',
    'IndexedDB', 'Service Worker', 'Cache Storage', '离线队列',
    'Pinia', 'Redux Toolkit', 'TanStack Query', 'AbortController', 'Error Boundary',
    '单文件组件 SFC', 'Slots', 'Composable', 'Vue Test Utils',
    'Next App Router', 'Server Action', 'useFetch', 'Nitro Server Routes', 'Runtime Config',
    'Vite', 'Webpack', 'Tree Shaking', 'Turborepo', 'Core Web Vitals',
    'Design Token', 'Storybook', 'Web Components', '国际化',
    'Controller/Router', 'DTO', '统一异常', 'OpenAPI', 'gRPC',
    'OAuth 2.0', 'OpenID Connect', 'RBAC', 'ABAC', 'CSRF', 'TLS',
    'OpenFeign', 'Apollo', 'Nacos', '服务发现', '熔断',
    'Kafka Topic', 'RabbitMQ', 'Transactional Outbox', 'XXL-JOB', '死信队列',
    'JVM', 'Metaspace', '虚拟线程', 'Spring Security', 'Actuator',
    'FastAPI', 'Alembic', 'Celery', 'TestClient',
    '测试金字塔', 'Testcontainers', 'Pact', '负载、压力、容量', '变异测试', 'Flaky Test',
    'StatefulSet', 'PersistentVolume', 'StorageClass', 'Helm Chart', 'Volume Snapshot',
    '微信登录', '创建订单', 'Cache-Aside', '配置灰度', '定时对账', '资源级权限'
  ],
  '02-AI编程.md': [
    '行内补全', 'Agent 执行', '任务粒度', '读、改、跑、验证',
    '上下文工程', 'AGENTS.md', '上下文预算',
    'grill-me', // 防止需求访谈能力再次被压缩进笼统的“需求澄清”。
    'OpenSpec', // 保留存量项目增量规格工作流。
    'Spec Kit', // 保留从项目原则到实现的阶段化规格链。
    '验收标准',
    'Prompt Engineering', 'Context Engineering', 'Harness Engineering', 'Loop Engineering', // 保留从触发到停止、恢复的工程循环。
    '/loop', 'Goal Contract', // 保留周期触发与可验证目标的职责边界，避免重新生成时只剩抽象 Loop。
    'Graph Engineering',
    'loop-me', // 保留重复活动到 workflow spec 的实验性访谈工具。
    'Ralph', // 保留以外部规格和新会话驱动的循环执行方法。
    'Superpowers', // 保留设计、TDD、审查与收尾纪律。
    'gstack', // 保留产品到发布的角色化研发流水线。
    'PUA', // 保留持续排障与主动验证方法，同时要求文章说明边界。
    'GSD', // 保留分阶段上下文和原子任务执行方案。
    'BMAD', // 保留角色化、规模自适应的项目工作流。
    'Agent Loop', 'MCP', 'Skill', 'Subagent', 'Multi-Agent', 'Handoff',
    '任务成功率', '基准任务集', 'Trace', '人工审查', '发布门禁',
    '对话助手', 'IDE Agent', 'CLI 编程 Agent', '后台 Agent', '低代码平台',
    'Diff 范围', '依赖来源', 'Secret 扫描', 'Agent 文件、Shell、网络',
    'AI 生成测试的同源偏差', '真实构建', '基础设施错误',
    'Routing', 'Handoff', 'Supervisor', 'Orchestrator-Worker', 'Pipeline',
    '私有上下文', '委派 Trace', '最终责任',
    'MCP Host', 'Streamable HTTP', 'A2A Agent Card', 'ACP Agent',
    'OPC', '人类创始人', '市场、需求、产品、交付、销售与客服',
    'Company、Goal Alignment、Board 与 CEO', 'Atomic Checkout', 'Heartbeat', 'Runtime Service',
    'Budget', 'Approval', '服务身份', 'Audit Trail', 'Routines',
    '产品发现', 'MVP', '首次价值时间', '任务成功率',
    'AI 驱动研发流水线', 'API 契约', '精准发布', '自愈边界'
  ],
  '03-AI大模型应用开发.md': [
    'BPE', 'WordPiece', 'Query、Key、Value', '多头注意力', '位置编码', '前馈网络', '残差连接',
    'Prefill', 'KV Cache', 'RLAIF', 'DPO', 'Lost in the Middle', 'top_p',
    '滑动窗口', '父子分块', 'HNSW', 'IVF', 'MultiQuery', 'HyDE', '查询分解',
    'Recall@K', 'Precision@K', 'MRR', 'NDCG', 'tenant_id', 'ACL',
    '语义记忆', '情景记忆', '程序性记忆', 'TTL', '衰减', '冲突', '遗忘', 'Mem0',
    'Redis Agent Memory', '工作状态、最近消息、滑动 TTL 与事件流',
    'Redis 检索缓存', '语义缓存', '热点保护', 'Neo4j GraphRAG', '证据回链', '增量一致性',
    'ReAct', 'Plan-and-Execute', 'Reflection', 'Conditional Edge', 'Checkpointer', 'Human-in-the-loop',
    'Supervisor', 'Handoff', 'fan-out', 'fan-in', 'Streamable HTTP',
    'Observation', 'Generation', 'OpenTelemetry', 'LLM-as-Judge', 'Pairwise', 'Annotation Queue', 'Rubric', '校准', 'Baseline',
    'LoRA', 'QLoRA', 'INT8', 'INT4', 'Continuous Batching', 'PagedAttention', '张量并行', 'TTFT', 'TPOT',
    '数据投毒', '网络白名单', '指数退避', '熔断', 'SLO',
    'System、User、Assistant 与 Tool', '结构化输出与工具调用请求', '内容过滤',
    '图片理解、目标识别与视觉问答', 'OCR、版面分析', 'ASR', 'TTS',
    '人工智能、机器学习与深度学习', '生成式 AI、基础模型与大语言模型',
    'Zero-shot', '多候选、自洽与投票', 'Prompt ID', '正常、边界、失败与对抗样例',
    '客户端桥接层', '运行 Run 与事件 Event', 'start、delta、tool_call、tool_result',
    'LangChain v1', 'response_format', 'context_schema', 'wrap_model_call', 'Context Offloading',
    '数据生命周期', 'Parser、Chunker 与 Embedding 版本', 'Alias 切换', '删除传播',
    'Parent-Child Retrieval', 'Contextual Compression', '动态 Top-K', '2-Step RAG',
    'LLM Wiki', 'Raw Sources、Wiki 与 Schema', 'Ingest、Query 与 Lint', '持续知识编译',
    'Reducer', 'Static Edge', 'Orchestrator-Worker', 'Command resume', 'Durable Execution', 'Time Travel',
    'Deep Agents', '虚拟文件系统', 'Summarization', 'Prompt Caching',
    'A2A Agent Card', 'ACP Agent', 'AG-UI Run',
    'LangSmith Run', 'Prompt Version', 'Langfuse Trace', 'Dataset Run', 'Reference-free', 'Trajectory', 'Trial 重置',
    'Agent Server', 'RemoteGraph', 'LangGraph CLI',
    'pytest Fixture', 'Testcontainers', 'Playwright Locator', 'Flaky Test',
    'Startup、Readiness 与 Liveness', 'HPA', 'Rolling Update',
    'Logits', 'Softmax', '交叉熵', '反向传播', '监督学习', '数据泄漏', '过拟合'
  ]
}

/** 正文中迁移完成后不应继续存在的旧导航。 */
const STALE_NAVIGATION_PATTERN = /(?:appendices|第\s*\d+\s*篇)/i

/** 正文中不应保留的临时写作任务指令。 */
const WRITING_TASK_ARTIFACT_PATTERN = /(?:只需要\s*step\s*1\s*让我确认|后续任务你持续进行直到完成|Workflow（必须按顺序执行）)/i

/** 批量生成器曾写入的空泛学习目标，无法说明读者最终能解决什么问题。 */
const GENERIC_LEARNING_OUTCOME_PATTERN =
  /(?:>\s*读完你能：围绕“[^”]+”完成一次可解释、可验证、可回滚的工程判断，并说清适用边界。|>\s*读完后[^\n]*(?:“核心机制”|“关键实现”)[^\n]*)/

/** 能说明底层因果、数据流或协议语义的正文信号。 */
const PRINCIPLE_SIGNAL_PATTERN =
  /(?:原理|机制|数据流|调用链|生命周期|状态机|协议|一致性|复杂度|因果|内部实现|为什么|如何工作)/i

/** 能让读者真正落地、复现或做技术取舍的正文信号。 */
const IMPLEMENTATION_SIGNAL_PATTERN =
  /(?:实现|步骤|配置|代码|命令|部署|接入|迁移|验证|测试|选型|决策|检查清单|验收)/i

/** 对生产故障、错误路径和能力边界给出明确处理方法的正文信号。 */
const FAILURE_BOUNDARY_SIGNAL_PATTERN =
  /(?:失败|异常|边界|风险|排查|故障|回滚|降级|超时|重试|陷阱|常见坑|不适用|限制)/i

/** 正式课程需要达到的解释性正文下限，代码不计入篇幅。 */
const MIN_LESSON_PROSE_CHARACTER_COUNT = 650

/** 学习指南需要覆盖路径、实践顺序和验收，因此使用独立下限。 */
const MIN_GUIDE_PROSE_CHARACTER_COUNT = 500

/** 参考资料强调准确映射而非长篇叙述，使用较低下限。 */
const MIN_REFERENCE_PROSE_CHARACTER_COUNT = 350

/** 七项深度指标至少命中六项，防止文章刚好靠表面关键词过线。 */
const MIN_ARTICLE_DEPTH_SCORE = 6

/** 沙盒围栏允许使用的直接入口文件名。 */
const RUNNABLE_FILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/

/** 已通过全库深度门禁的文章数量。 */
let depthQualifiedArticleCount = 0

/** 源码直接位于 Markdown 的可执行围栏数量。 */
let inlineRunnableCodeBlockCount = 0

/** 已知主题必须引用的直接来源规则。 */
const TOPIC_SOURCE_RULES = [
  { title: /Coze/i, source: /https?:\/\/(?:www\.)?coze\.(?:cn|com)\//i },
  { title: /Neo4j|Graph\s*RAG/i, source: /https?:\/\/neo4j\.com\//i },
  { title: /LLM\s*Wiki/i, source: /https?:\/\/gist\.github\.com\/karpathy\//i },
  { title: /流式响应|SSE/i, source: /https?:\/\/developer\.mozilla\.org\/.*server-sent_events/i }
]

/** 全库质量问题。 */
const failures = []

/** 递归查找正式 Markdown 文章。 */
function findArticleFiles(directory) {
  /** 当前目录及子目录中的文章文件。 */
  const articleFiles = []

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    /** 当前目录项绝对路径。 */
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (!NON_ARTICLE_DIRECTORIES.has(entry.name)) articleFiles.push(...findArticleFiles(entryPath))
      continue
    }
    if (entry.isFile() && /\.mdx?$/i.test(entry.name)) articleFiles.push(entryPath)
  }

  return articleFiles
}

/** 将文章路径转换为公开无扩展名路径。 */
function getArticlePath(filePath) {
  return path.relative(KNOWLEDGE_ROOT, filePath).replace(/\.mdx?$/i, '').split(path.sep).join('/')
}

/** 将公开文章路径解析为本地 Markdown 文件。 */
function getArticleFilePath(articlePath) {
  /** 当前公开路径对应的 Markdown 候选文件。 */
  const markdownFilePath = path.join(KNOWLEDGE_ROOT, `${articlePath}.md`)
  if (fs.existsSync(markdownFilePath)) return markdownFilePath
  return path.join(KNOWLEDGE_ROOT, `${articlePath}.mdx`)
}

/** 从实体知识域目录获得显示名称。 */
function getDomainLabel(articlePath) {
  return (articlePath.split('/')[1] || '').replace(/^\d+-/, '').replaceAll('-', ' ')
}

/**
 * 计算删除围栏代码和空白后的解释性正文长度。
 * @param markdown 当前文章完整 Markdown。
 * @returns 不把大段源码当作文章深度的正文字符数。
 */
function countProseCharacters(markdown) {
  /** 删除 fenced code block 后的正文。 */
  const proseMarkdown = markdown.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '')
  return proseMarkdown.replace(/\s/g, '').length
}

/**
 * 判断当前文章是否是以映射、命令或附录为主的参考资料。
 * @param articlePath 当前文章公开路径。
 * @returns 是否使用参考资料的篇幅下限。
 */
function isReferenceArticle(articlePath) {
  /** 当前文章不含目录的文件名。 */
  const fileName = articlePath.split('/').at(-1) || ''
  return /^(?:98|99)-/.test(fileName) || /(?:附录|速查|命令|疑问记录|陷阱对照|配置模板)/.test(fileName)
}

/**
 * 按文章用途返回最低解释性正文长度。
 * @param articlePath 当前文章公开路径。
 * @returns 当前类型的正文字符下限。
 */
function getMinimumProseCharacterCount(articlePath) {
  if (isReferenceArticle(articlePath)) return MIN_REFERENCE_PROSE_CHARACTER_COUNT
  if (/\/01-学习指南$/.test(articlePath)) return MIN_GUIDE_PROSE_CHARACTER_COUNT
  return MIN_LESSON_PROSE_CHARACTER_COUNT
}

/**
 * 审计源码内联沙盒围栏，保证运行器不会再次依赖隐藏脚本。
 * @param articlePath 当前文章公开路径。
 * @param markdown 当前文章完整 Markdown。
 */
function auditRunnableCodeBlocks(articlePath, markdown) {
  /** 与文章构建链一致的 Markdown 语法树。 */
  const markdownTree = remark().parse(markdown)
  for (const markdownNode of markdownTree.children || []) {
    if (markdownNode.type !== 'code' || !/(?:^|\s)runnable(?:\s|$)/i.test(markdownNode.meta || '')) continue

    inlineRunnableCodeBlockCount += 1
    /** 当前可执行围栏声明的语言。 */
    const language = (markdownNode.lang || '').toLowerCase()
    /** 当前可执行围栏声明的直接入口文件。 */
    const fileName = (markdownNode.meta || '').match(/(?:^|\s)file=(?:"([^"]+)"|'([^']+)'|([^\s]+))/i)?.slice(1).find(Boolean) || ''
    /** 当前可执行围栏的源码。 */
    const sourceCode = markdownNode.value?.trim() || ''

    if (!['python', 'py', 'html', 'htm'].includes(language)) {
      failures.push(`${articlePath} 的 runnable 围栏使用了不支持的语言：${language || '未声明'}`)
    }
    if (!RUNNABLE_FILE_NAME_PATTERN.test(fileName)) {
      failures.push(`${articlePath} 的 runnable 围栏缺少安全的 file 入口属性。`)
    }
    if (!sourceCode) failures.push(`${articlePath} 存在空的 runnable 围栏。`)
    if (['html', 'htm'].includes(language) && (!/^<!doctype\s+html>/i.test(sourceCode) || !/<script(?:\s|>)/i.test(sourceCode))) {
      failures.push(`${articlePath} 的 HTML runnable 围栏必须包含完整文档和 script。`)
    }
  }
}

/**
 * 用七项可核验指标审计文章深度，避免只按字数判断质量。
 * @param articlePath 当前文章公开路径。
 * @param markdown 当前文章完整 Markdown。
 */
function auditArticleDepth(articlePath, markdown) {
  /** 当前文章解释性正文长度。 */
  const proseCharacterCount = countProseCharacters(markdown)
  /** 当前文章要求的解释性正文下限。 */
  const minimumProseCharacterCount = getMinimumProseCharacterCount(articlePath)
  /** 当前文章除首个 H1 外的有效章节数量；保留原文章既有 H1/H2 风格。 */
  const sectionHeadingCount = Math.max(0, (markdown.match(/^#{1,2}\s+/gm)?.length || 0) - 1)
  /** 去重后的事实来源链接。 */
  const sourceLinks = new Set(markdown.match(/https?:\/\/[^\s)>]+/g) || [])
  /** 七项深度指标的逐项结果，便于失败时指出真正缺口。 */
  const depthSignals = [
    { name: '明确学习产出', passed: isReferenceArticle(articlePath) || /(?:读完你能|读完后[，,]?你应能|学完你能|学习目标|本章目标)/i.test(markdown) },
    { name: '至少四个有效章节', passed: sectionHeadingCount >= 4 },
    { name: '原理或机制', passed: PRINCIPLE_SIGNAL_PATTERN.test(markdown) },
    { name: '实施、代码或决策方法', passed: IMPLEMENTATION_SIGNAL_PATTERN.test(markdown) },
    { name: '失败路径或能力边界', passed: FAILURE_BOUNDARY_SIGNAL_PATTERN.test(markdown) },
    { name: '至少两个事实来源', passed: sourceLinks.size >= 2 },
    { name: `有效正文不少于 ${minimumProseCharacterCount} 字`, passed: proseCharacterCount >= minimumProseCharacterCount }
  ]
  /** 当前文章实际命中的深度指标数量。 */
  const depthScore = depthSignals.filter((depthSignal) => depthSignal.passed).length

  if (GENERIC_LEARNING_OUTCOME_PATTERN.test(markdown)) {
    failures.push(`${articlePath} 仍使用空泛的批量学习目标。`)
  }
  if (depthScore < MIN_ARTICLE_DEPTH_SCORE) {
    /** 当前文章未命中的指标名称。 */
    const missingSignals = depthSignals.filter((depthSignal) => !depthSignal.passed).map((depthSignal) => depthSignal.name)
    failures.push(`${articlePath} 深度评分 ${depthScore}/7，缺少：${missingSignals.join('、')}。`)
    return
  }

  depthQualifiedArticleCount += 1
}

/** 审计每篇正式文章的标题、导航、资源和来源。 */
function auditArticles(articleFiles) {
  for (const filePath of articleFiles) {
    /** 当前文章公开路径。 */
    const articlePath = getArticlePath(filePath)
    /** 当前文章完整 Markdown。 */
    const markdown = fs.readFileSync(filePath, 'utf8')
    /** 当前文章文件名携带的规范课号。 */
    const sequence = path.basename(filePath).match(/^(\d+)-/)?.[1]
    /** 当前文章的规范知识域。 */
    const domain = getDomainLabel(articlePath)
    /** 当前文章一级标题。 */
    const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || ''
    /** 旧篇号导航只在本轮完成全量重构的 AI 应用开发课程中禁用。 */
    const isAiApplicationArticle = articlePath.startsWith('03-AI大模型应用开发/')

    if (!sequence || !heading.startsWith(`${domain}（${sequence}） - `)) {
      failures.push(`${articlePath} 的 H1 未使用“${domain}（${sequence || '??'}） - 主题”。`)
    }
    if (isAiApplicationArticle && STALE_NAVIGATION_PATTERN.test(markdown)) {
      failures.push(`${articlePath} 仍包含旧篇号或旧 appendices 导航。`)
    }
    if (WRITING_TASK_ARTIFACT_PATTERN.test(markdown)) failures.push(`${articlePath} 仍包含临时写作任务指令。`)
    auditArticleDepth(articlePath, markdown)
    auditRunnableCodeBlocks(articlePath, markdown)

    // Neo4j 是 RAG 的关系召回基础设施，不能迁入记忆系统或通用 Agent 目录。
    if (isAiApplicationArticle && /Neo4j/i.test(heading) && !articlePath.startsWith('03-AI大模型应用开发/04-RAG/')) {
      failures.push(`${articlePath} 的 Neo4j 主题应归入 AI 应用开发的 RAG 知识域。`)
    }
    // Redis 短期记忆必须归入记忆系统；RAG 目录中的 Redis 只承载缓存、限流和热点保护。
    if (isAiApplicationArticle && /Redis.*(?:短期记忆|Agent Memory)/i.test(heading) && !articlePath.startsWith('03-AI大模型应用开发/05-记忆系统/')) {
      failures.push(`${articlePath} 的 Redis 短期记忆主题应归入 AI 应用开发的记忆系统。`)
    }

    for (const imageMatch of markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
      /** 当前图片地址。 */
      const imageUrl = imageMatch[1]
      if (/^(?:https?:|data:)/i.test(imageUrl)) continue
      /** 站内绝对地址从 public 根目录解析。 */
      const imagePath = imageUrl.startsWith('/')
        ? path.join(process.cwd(), 'public', imageUrl.replace(/^\/+/, ''))
        : path.resolve(path.dirname(filePath), imageUrl)
      if (!fs.existsSync(imagePath)) failures.push(`${articlePath} 引用了不存在的本地图片：${imageUrl}`)
    }

    for (const rule of TOPIC_SOURCE_RULES) {
      if (rule.title.test(heading) && !rule.source.test(markdown)) {
        failures.push(`${articlePath} 缺少与主题直接匹配的官方来源。`)
      }
    }
  }
}

/** 审计三张思维导图是否与文章严格一一对应且包含有效知识点。 */
function auditMindmaps(articlePaths) {
  /** 每条文章路径在三张导图中出现的次数。 */
  const mindmapLinkCounts = new Map()

  for (const fileName of MINDMAP_FILE_NAMES) {
    /** 当前思维导图 Markdown。 */
    const markdown = fs.readFileSync(path.join(MINDMAP_ROOT, fileName), 'utf8')
    /** 当前正在收集知识点的文章标题。 */
    let currentArticleTitle = ''
    /** 当前文章已有的有效知识点数量。 */
    let currentKnowledgePointCount = 0
    /** 当前知识主题名称。 */
    let currentTopic = ''
    /** 当前知识主题已有的解释节点数量。 */
    let currentTopicDetailCount = 0

    /** 检查当前知识主题是否拥有足够且不过量的解释节点。 */
    const flushTopic = () => {
      if (currentTopic && currentTopicDetailCount < MIN_MINDMAP_DETAILS) {
        failures.push(`${fileName} 的“${currentArticleTitle} / ${currentTopic}”只有 ${currentTopicDetailCount} 条解释，至少需要 ${MIN_MINDMAP_DETAILS} 条。`)
      }
      if (currentTopic && currentTopicDetailCount > MAX_MINDMAP_DETAILS) {
        failures.push(`${fileName} 的“${currentArticleTitle} / ${currentTopic}”有 ${currentTopicDetailCount} 条解释，最多允许 ${MAX_MINDMAP_DETAILS} 条。`)
      }
      currentTopic = ''
      currentTopicDetailCount = 0
    }

    /** 检查并清空当前文章的主题数量和正文上下文。 */
    const flushArticle = () => {
      flushTopic()
      if (currentArticleTitle && currentKnowledgePointCount < MIN_MINDMAP_POINTS) {
        failures.push(`${fileName} 的“${currentArticleTitle}”只有 ${currentKnowledgePointCount} 个有效知识点，至少需要 ${MIN_MINDMAP_POINTS} 个。`)
      }
      if (currentArticleTitle && currentKnowledgePointCount > MAX_MINDMAP_POINTS) {
        failures.push(`${fileName} 的“${currentArticleTitle}”有 ${currentKnowledgePointCount} 个知识点，最多允许 ${MAX_MINDMAP_POINTS} 个。`)
      }
      currentArticleTitle = ''
      currentKnowledgePointCount = 0
    }

    for (const line of markdown.split('\n')) {
      /** 导图中的文章链接行。 */
      const articleMatch = line.match(/^  - \[([^\]]+)\]\(\/knowledge\/([^)]+)\)$/)
      if (articleMatch) {
        flushArticle()
        currentArticleTitle = articleMatch[1]
        /** 解码后的公开文章路径。 */
        const articlePath = articleMatch[2].split('/').map(decodeURIComponent).join('/')
        mindmapLinkCounts.set(articlePath, (mindmapLinkCounts.get(articlePath) || 0) + 1)
        continue
      }

      /** 文章下的知识主题或来源行。 */
      const pointMatch = line.match(/^    - (.+)$/)
      if (pointMatch && /^\[来源：/.test(pointMatch[1])) {
        flushTopic()
        continue
      }
      if (pointMatch) {
        flushTopic()
        currentTopic = pointMatch[1]
      }
      if (!pointMatch) {
        /** 知识主题下的定义、机制、取舍或边界解释。 */
        const detailMatch = line.match(/^      - (.+)$/)
        if (!detailMatch) continue
        /** 当前解释节点的原始文本。 */
        const detail = detailMatch[1]
        currentTopicDetailCount += 1
        if (INVALID_MINDMAP_DETAIL_PATTERN.test(detail) || /[：:]$/.test(detail)) {
          failures.push(`${fileName} 的“${currentArticleTitle} / ${currentTopic}”包含无效解释节点：${detail}`)
        }
        continue
      }
      if (GENERIC_MINDMAP_POINT_PATTERN.test(pointMatch[1])) {
        failures.push(`${fileName} 的“${currentArticleTitle}”使用了通用操作标签：${pointMatch[1]}`)
      } else {
        currentKnowledgePointCount += 1
      }
    }
    flushArticle()

    /** 当前路线历史深层知识中必须保留的核心术语。 */
    const requiredKnowledgeTerms = REQUIRED_KNOWLEDGE_TERMS[fileName] || []
    for (const knowledgeTerm of requiredKnowledgeTerms) {
      if (!markdown.toLocaleLowerCase('zh-CN').includes(knowledgeTerm.toLocaleLowerCase('zh-CN'))) {
        failures.push(`${fileName} 缺少历史核心知识节点：${knowledgeTerm}`)
      }
    }
  }

  for (const articlePath of articlePaths) {
    /** 当前文章在全部导图中的出现次数。 */
    const linkCount = mindmapLinkCounts.get(articlePath) || 0
    if (linkCount !== 1) failures.push(`${articlePath} 在三张思维导图中出现 ${linkCount} 次，应为 1 次。`)
  }
  for (const [articlePath, linkCount] of mindmapLinkCounts) {
    if (!articlePaths.has(articlePath)) failures.push(`思维导图引用了不存在的文章：${articlePath}`)
    if (linkCount !== 1) failures.push(`思维导图中的 ${articlePath} 重复出现 ${linkCount} 次。`)
  }
}

/** 审计三条路线的实体知识域集合是否与对应思维导图完全一致。 */
function auditMindmapModuleCoverage(articlePaths) {
  /** 路线到实体目录展示名称集合的映射。 */
  const directoryModulesByTrack = new Map()
  for (const articlePath of articlePaths) {
    /** 当前文章路径分段，前两段分别是路线和知识域目录。 */
    const [trackDirectory, moduleDirectory] = articlePath.split('/')
    if (!trackDirectory || !moduleDirectory) continue
    /** 去掉文件系统排序前缀后的路线名称。 */
    const trackName = trackDirectory.replace(/^\d+-/, '')
    /** 去掉文件系统排序前缀并还原展示中的短横线。 */
    const moduleName = moduleDirectory.replace(/^\d+-/, '').replaceAll('-', ' ')
    const modules = directoryModulesByTrack.get(trackName) || new Set()
    modules.add(moduleName)
    directoryModulesByTrack.set(trackName, modules)
  }

  for (const fileName of MINDMAP_FILE_NAMES) {
    /** 当前导图的路线展示名称。 */
    const trackName = fileName.replace(/^\d+-/, '').replace(/\.md$/, '')
    /** 导图中以单个短横线开头的一级知识域名称。 */
    const mindmapModules = new Set(
      fs
        .readFileSync(path.join(MINDMAP_ROOT, fileName), 'utf8')
        .split('\n')
        .filter((line) => /^- [^[]/.test(line))
        .map((line) => line.replace(/^- /, '').trim())
    )
    const directoryModules = directoryModulesByTrack.get(trackName) || new Set()
    for (const moduleName of directoryModules) {
      if (!mindmapModules.has(moduleName)) failures.push(`${fileName} 缺少实体目录知识域：${moduleName}`)
    }
    for (const moduleName of mindmapModules) {
      if (!directoryModules.has(moduleName)) failures.push(`${fileName} 引用了不存在的实体知识域：${moduleName}`)
    }
  }
}

/** 审计旧 URL 迁移表是否全部指向当前存在的正式文章。 */
function auditPathMigrations(articlePaths) {
  /** 旧路径到当前路径的迁移映射。 */
  const migrations = JSON.parse(fs.readFileSync(MIGRATION_FILE, 'utf8'))
  for (const [legacyPath, currentPath] of Object.entries(migrations)) {
    if (!articlePaths.has(currentPath)) failures.push(`旧路径 ${legacyPath} 指向不存在的文章：${currentPath}`)
  }
}

/** 审计每个扁平模块的文章文件是否从 01 开始连续编号。 */
function auditModuleSequences(articlePaths) {
  /** 模块路径到文章数字前缀列表的映射。 */
  const sequencesByModule = new Map()
  for (const articlePath of articlePaths) {
    /** 当前文章路径分段。 */
    const pathSegments = articlePath.split('/')
    /** 当前文章所属的路线和模块路径。 */
    const modulePath = pathSegments.slice(0, 2).join('/')
    /** 当前文章文件名中的数字前缀。 */
    const sequence = Number.parseInt(pathSegments[2]?.match(/^(\d+)-/)?.[1] || '', 10)
    if (!Number.isInteger(sequence)) {
      failures.push(`${articlePath} 缺少文章数字前缀。`)
      continue
    }

    /** 当前模块已经收集的文章数字前缀。 */
    const moduleSequences = sequencesByModule.get(modulePath) || []
    moduleSequences.push(sequence)
    sequencesByModule.set(modulePath, moduleSequences)
  }

  for (const [modulePath, moduleSequences] of sequencesByModule) {
    /** 当前模块按数值升序排列的文章数字前缀。 */
    const sortedSequences = [...moduleSequences].sort((left, right) => left - right)
    sortedSequences.forEach((sequence, index) => {
      /** 当前位置期望的从 01 开始连续课号。 */
      const expectedSequence = index + 1
      if (sequence !== expectedSequence) {
        failures.push(`${modulePath} 的课号应为 ${String(expectedSequence).padStart(2, '0')}，实际为 ${String(sequence).padStart(2, '0')}。`)
      }
    })
  }
}

/** 全部正式文章文件。 */
const articleFiles = findArticleFiles(KNOWLEDGE_ROOT)
/** 全部正式文章公开路径。 */
const articlePaths = new Set(articleFiles.map(getArticlePath))
auditArticles(articleFiles)
auditMindmaps(articlePaths)
auditMindmapModuleCoverage(articlePaths)
auditPathMigrations(articlePaths)
auditModuleSequences(articlePaths)

if (failures.length > 0) {
  console.error(`知识质量审计失败，共 ${failures.length} 项：`)
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exitCode = 1
} else {
  console.log(`知识质量审计通过：${articleFiles.length} 篇文章与三张思维导图严格一一对应。`)
  console.log(`深度门禁通过 ${depthQualifiedArticleCount} 篇，Markdown 内联可执行代码块 ${inlineRunnableCodeBlockCount} 个。`)
}
