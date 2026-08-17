import fs from 'node:fs'
import path from 'node:path'
import { remark } from 'remark'
import {
  getKnowledgeDirectoryModuleLabel,
  KNOWLEDGE_TRACK_MODULES
} from '../src/app/knowledge/config.ts'
import { getKnowledgeArticleKind } from '../src/lib/knowledge-article-kind.ts'
import { createKnowledgeMindmap } from '../src/lib/knowledge-mindmap.ts'

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

/** 全栈路线的实体目录名。 */
const FULL_STACK_DIRECTORY_NAME = '01-全栈开发'

/** 嵌套全栈文章采用“路线/模块/专题/文章”的路径段数。 */
const NESTED_FULL_STACK_ARTICLE_SEGMENT_COUNT = 4

/** 目录短名称与作者手写文章系列名之间的明确映射。 */
const NESTED_ARTICLE_SERIES_LABELS = {
  脚手架: '工程化脚手架', // 历史手写文章沿用“工程化脚手架”系列名。
  'CI CD': 'CI/CD', // 文件系统以连字符替代斜杠，H1 和思维导图保留正式术语。
  'LangSmith Langfuse': 'LangSmith / Langfuse', // 目录不能包含斜杠，页面保留两个产品的正式组合名称。
  'Tool与Function Calling': 'Tool 与 Function Calling', // 文件系统名称保持紧凑，H1 恢复工具协议模块正式名称。
  LoRA与微调: 'LoRA 与微调' // 文件系统名称保持紧凑，H1 与导航使用更易读的正式名称。
}

/** 不允许作为导图知识点的写作结构或实验操作标签。 */
const GENERIC_MINDMAP_POINT_PATTERN =
  /^(?:学习目标|学习边界|在线运行|页面运行|本地查看|预期输出(?:（节选）)?|重点观察|动手实践.*|动手改.*|参考资料|本篇定位|与进阶篇的分工|一个真实场景|先从一个真实场景|工程上真正会踩的坑(?:（本篇独有）)?|一句话面试答法|复述答法|这一章怎么读|前言|复习导航|问题清单|怎么跑|看点|main\.py|一张 Mermaid 图|真实.+怎么用|如何验证.+关键结论)$/i

/** 每篇文章至少需要两个带解释的知识分支，与桌面文章规范一致。 */
const MIN_MINDMAP_POINTS = 2

/** 所有正式知识文章统一要求的最少物理行数。 */
const MIN_ARTICLE_LINE_COUNT = 200

/** 每篇文章在路线导图中最多允许展示的具体知识节点数。 */
const MAX_MINDMAP_POINTS = 12

/** 每个路线导图知识主题至少需要的正文解释数量。 */
const MIN_MINDMAP_DETAILS = 2

/** 每个路线导图知识主题最多允许的正文解释数量。 */
const MAX_MINDMAP_DETAILS = 5

/** 导图解释节点不能是代码、命令、表格残片或未完成的引导语。 */
const INVALID_MINDMAP_DETAIL_PATTERN =
  /(?:VISUAL_STRATEGY|DIAGRAM_DESCRIPTION|SCREENSHOT_DESCRIPTION)|^(?:(?:\d+[.)、]\s*)?(?:注入与|运行最小案例|选择机制)|如下图|图示说明|接下来|下面|上面|当前|这就是|下一课|下一章|继续阅读|现象[：:]常见根因|环节[：:]要回答的问题|概念[：:]在\s*main\.py\s*哪里|为什么|为何|如何|是否|什么|哪些|怎么|怎样|能否|有没有|谁|哪里|哪一|几种|多少|何时|什么时候|https?:\/\/|pnpm |npm |npx |pip |docker |kubectl |curl |import |export |const |let |function |class |@returns|@param|\/|\{|\}|\||javascript$|typescript$|tsx$|jsx$|python$|bash$|json$|yaml$|markdown$)/i

/** 同一末级结论跨过多文章复用时视为模板污染。 */
const MAX_MINDMAP_DETAIL_REUSE_COUNT = 5

/** 同一条知识正文跨文章复用上限；标题、表头、来源链接和代码不参与统计。 */
const MAX_ARTICLE_PROSE_REUSE_COUNT = 5

/** 已确认的 170 篇 AI 编程通用骨架不得再次进入正文。 */
const LEGACY_BULK_ARTICLE_PATTERN = /价值不在于多记一个名词[\s\S]*如果只展示一次成功演示/

/** 最新确认知识树中必须持续保留的核心术语，防止目录重生成再次压扁语义。 */
const REQUIRED_KNOWLEDGE_TERMS = {
  '01-全栈开发.md': [
    'React', 'Next.js', 'Tiptap', 'ProseMirror', 'Yjs', 'Electron',
    'Redis', 'Elasticsearch', 'Kafka',
    'Nginx', 'Docker', 'Kubernetes', 'CI/CD', 'OpenTelemetry', 'Prometheus', 'Grafana', 'trace_id',
    'App Router', 'Server Component', 'Client Component', 'Route Handler', 'Server Action',
    'Monorepo', 'NPM', 'Vue3', 'Vite', 'Create', 'Generate', 'Core Web Vitals',
    '主进程', '预加载脚本', 'IPC', '上下文隔离', '自动更新', '代码签名',
    'DTO', 'OpenAPI', 'OAuth 2.0', 'OpenID Connect', 'RBAC', 'ABAC', 'CSRF', 'TLS',
    'Apollo', '服务发现', '熔断',
    'XXL-JOB',
    'JVM', 'Metaspace', '虚拟线程',
    'FastAPI', 'Alembic', 'Celery', 'TestClient',
    '测试金字塔', 'Testcontainers', 'Pact', '负载、压力、容量', '变异测试', 'Flaky Test',
    'StatefulSet', 'PersistentVolume', 'StorageClass', 'Helm Chart', 'Volume Snapshot',
    '创建订单', 'Cache-Aside'
  ],
  '02-AI编程.md': [
    '行内补全', 'Agent 执行', '任务粒度', '读、改、跑、验证',
    '上下文工程', 'AGENTS.md', '上下文预算',
    'grill-me', // 防止需求访谈能力再次被压缩进笼统的“需求澄清”。
    'OpenSpec', // 保留存量项目增量规格工作流。
    'Spec Kit', // 保留从项目原则到实现的阶段化规格链。
    '验收标准',
    'Prompt Engineering', 'Context Engineering', 'Harness Engineering', 'Loop Engineering', // 保留从触发到停止、恢复的工程循环。
    'Zero-shot', '多候选、自洽与投票', 'Prompt ID', '正常、边界、失败与对抗样例', // AI 应用 Prompt 合并后由 AI 编程路线承接。
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
    'Redis Agent Memory', '工作状态', '最近消息', '滑动 TTL', '事件流',
    'Redis 检索缓存', '语义缓存', '热点保护', 'Neo4j GraphRAG', '证据回链', '增量一致性',
    'ReAct', 'Plan-and-Execute', 'Reflection', 'Conditional Edge', 'Checkpointer', 'Human-in-the-loop',
    'Supervisor', 'Handoff', 'fan-out', 'fan-in', 'Streamable HTTP',
    'Observation', 'Generation', 'OpenTelemetry', 'LLM-as-Judge', 'Pairwise', 'Annotation Queue', 'Rubric', '校准', 'Baseline',
    'LoRA', 'QLoRA', 'INT8', 'INT4', 'Continuous Batching', 'PagedAttention', '张量并行', 'TTFT', 'TPOT',
    '数据投毒', '网络白名单', '指数退避', '熔断', 'SLO',
    'System、User、Assistant 与 Tool', '结构化输出与工具调用请求', '内容过滤',
    '图片理解、目标识别与视觉问答', 'OCR、版面分析', 'ASR', 'TTS',
    '人工智能、机器学习与深度学习', '生成式 AI、基础模型与大语言模型',
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

/** LangChain 入门文章要求每段可执行源码都有沙盒，并且真实模型配置只出现一次。 */
const LANGCHAIN_INTRO_ARTICLE_PATH = '03-AI大模型应用开发/01-LangChain/01-LangChain-入门'

/** LlamaIndex 入门文章同样要求全部源码可运行，且只在答案生成处请求模型凭据。 */
const LLAMAINDEX_INTRO_ARTICLE_PATH = '03-AI大模型应用开发/02-LlamaIndex/01-LlamaIndex-入门'

/** 批量生成器曾写入的空泛学习目标，无法说明读者最终能解决什么问题。 */
const GENERIC_LEARNING_OUTCOME_PATTERN =
  /(?:>\s*读完你能：围绕“[^”]+”完成一次可解释、可验证、可回滚的工程判断，并说清适用边界。|>\s*读完后[^\n]*(?:“核心机制”|“关键实现”)[^\n]*|核心对象、职责和失败边界|能按顺序说明“[^”]+”的关键阶段|能根据“[^”]+”给出的条件做出方案选择|(?:解释|针对|将)“[^”]*(?:请读|另见|参见|延伸阅读|进阶.+《)[^”]*”|(?:在“[^”]+”中解释|针对“[^”]+”中的|将“[^”]+”中的)“|构造一个违反该条件的失败样本|落成最小代码或配置|\/ (?:一个真实场景|先从一个真实场景)[^”]*”|(?:解释|验证|检验)“\||^>\s*-\s*围绕“[^\n]+”解释“)/m

/** 学习产出中可以被检查的交付物或运行证据。 */
const LEARNING_OUTCOME_EVIDENCE_PATTERN = /(?:代码|配置|表格|记录|日志|测试|报告|指标|Trace|Diff|输出|结果|样本|引用|命令|截图|证据)/i

/**
 * 判断正文是否有 2～4 条同时包含动作与证据的学习产出。
 * @param {string} markdown 当前文章正文。
 * @returns {boolean} 学习产出是否可执行、可验收。
 */
function hasSpecificLearningOutcomes(markdown) {
  /** 标题后的学习产出引用块。 */
  const goalMatch = markdown.match(/^>\s*(?:读完|学完)[^\n]*\n((?:^>\s*-.*\n?){2,4})/m)
  /** 引用块中的逐项目标。 */
  const goalItems = goalMatch
    ? [...goalMatch[1].matchAll(/^>\s*-\s*(.+)$/gm)].map((match) => match[1].trim())
    : []
  return goalItems.length >= 2
    && goalItems.length <= 4
    && goalItems.every((goalItem) => /(?:能|完成|生成|输出|实现|配置|排查|验证|设计|绘制|解释|检验)/.test(goalItem) && LEARNING_OUTCOME_EVIDENCE_PATTERN.test(goalItem))
}

/** 能说明底层因果、数据流或协议语义的正文信号。 */
const PRINCIPLE_SIGNAL_PATTERN =
  /(?:原理|机制|数据流|调用链|链路|流程|生命周期|状态机|协议|一致性|复杂度|因果|内部实现|为什么|如何工作|调度|队列|算法|解析)/i

/** 能让读者真正落地、复现或做技术取舍的正文信号。 */
const IMPLEMENTATION_SIGNAL_PATTERN =
  /(?:实现|步骤|配置|代码|命令|部署|接入|迁移|验证|测试|选型|决策|检查清单|验收|```(?:js|jsx|ts|tsx|python|java|bash|sql|json|ya?ml))/i

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
  /** 当前文章路径的全部实体段。 */
  const pathSegments = articlePath.split('/')
  /** 新全栈层级需要使用三级专题名生成 H1，而不是统一显示为二级模块。 */
  const domainSegment =
    pathSegments[0] === FULL_STACK_DIRECTORY_NAME &&
    pathSegments.length >= NESTED_FULL_STACK_ARTICLE_SEGMENT_COUNT
      ? pathSegments[2]
      : pathSegments[1]
  /** 去掉物理编号后的专题短名称。 */
  const domainLabel = (domainSegment || '').replace(/^\d+-/, '').replaceAll('-', ' ')
  return NESTED_ARTICLE_SERIES_LABELS[domainLabel] || domainLabel
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
  /** 当前文章中除图表和纯文本外的可执行源码块数量。 */
  let executableCodeBlockCount = 0
  /** 当前文章中显式启用的可执行源码块数量。 */
  let runnableCodeBlockCount = 0
  /** 当前文章中需要临时模型连接的源码块数量。 */
  let modelSandboxCount = 0
  for (const markdownNode of markdownTree.children || []) {
    if (markdownNode.type !== 'code') continue

    /** Mermaid 和纯文本属于图表或输出，不是可执行源码。 */
    const language = (markdownNode.lang || '').toLowerCase()
    if (!['mermaid', 'text', 'markdown', 'md'].includes(language)) {
      executableCodeBlockCount += 1
    }
    if (!/(?:^|\s)runnable(?:\s|$)/i.test(markdownNode.meta || '')) continue

    runnableCodeBlockCount += 1
    if (/(?:^|\s)model-sandbox(?:\s|$)/i.test(markdownNode.meta || '')) {
      modelSandboxCount += 1
    }

    inlineRunnableCodeBlockCount += 1
    /** 当前可执行围栏声明的直接入口文件。 */
    const fileName = (markdownNode.meta || '').match(/(?:^|\s)file=(?:"([^"]+)"|'([^']+)'|([^\s]+))/i)?.slice(1).find(Boolean) || ''
    /** 当前可执行围栏的源码。 */
    const sourceCode = markdownNode.value?.trim() || ''

    /** 真实模型实验允许 TypeScript，其余 runnable 仍只接受 Python 或 HTML。 */
    const isModelSandbox = /(?:^|\s)model-sandbox(?:\s|$)/i.test(markdownNode.meta || '')
    if (!['python', 'py', 'html', 'htm'].includes(language) && !(isModelSandbox && ['typescript', 'ts'].includes(language))) {
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

  if (
    [LANGCHAIN_INTRO_ARTICLE_PATH, LLAMAINDEX_INTRO_ARTICLE_PATH].includes(articlePath) &&
    (executableCodeBlockCount !== runnableCodeBlockCount || modelSandboxCount !== 1)
  ) {
    failures.push(
      `${articlePath} 必须让全部 ${executableCodeBlockCount} 个可执行源码块进入沙盒，并且只允许 1 个真实模型凭据表单。`
    )
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
  /** 参考资料按查询效率组织，其余正式课程都必须提供可验收学习产出。 */
  const requiresSpecificLearningOutcomes = !isReferenceArticle(articlePath)
  /** 当前文章除首个 H1 外的有效章节数量；保留原文章既有 H1/H2 风格。 */
  const sectionHeadingCount = Math.max(0, (markdown.match(/^#{1,2}\s+/gm)?.length || 0) - 1)
  /** 去重后的事实来源链接。 */
  const sourceLinks = new Set(markdown.match(/https?:\/\/[^\s)>]+/g) || [])
  /** 七项深度指标的逐项结果，便于失败时指出真正缺口。 */
  const depthSignals = [
    {
      name: '明确学习产出',
      passed: isReferenceArticle(articlePath)
        || (requiresSpecificLearningOutcomes
          ? hasSpecificLearningOutcomes(markdown)
          : /(?:读完你能|读完后[，,]?你应能|学完你能|学习目标|本章目标)/i.test(markdown))
    },
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
  if (/^#{1,6}\s+.*如何验证.+关键结论[？?]?$/m.test(markdown)) {
    failures.push(`${articlePath} 仍用总括问句承载整篇验证内容。`)
  }
  /** 新版渐进式区块可以位于原文前后，审计时需要合并全部自动补强内容。 */
  const progressiveDepthSections = [...markdown.matchAll(/<!-- article-progressive-block:start -->([\s\S]*?)<!-- article-progressive-block:end -->/g)]
    .map((progressiveDepthMatch) => progressiveDepthMatch[1])
  /** 旧工作表仍需被门禁识别，防止历史结构回流。 */
  const legacyDepthSection = markdown.includes('<!-- article-operational-workbook -->')
    ? markdown.slice(markdown.indexOf('<!-- article-operational-workbook -->'))
    : ''
  /** 全部自动补强正文用于机械结构检查。 */
  const generatedDepthSection = [...progressiveDepthSections, legacyDepthSection].filter(Boolean).join('\n')
  if (/^#{2,6}\s+(?:步骤\s*\d+|逐结论复核索引)[：:]?/m.test(generatedDepthSection)) {
    failures.push(`${articlePath} 仍按步骤编号或逐结论索引堆叠补强内容。`)
  }
  if (/^#{1,6}\s+.*(?:机制与边界[：:]逐点拆解|知识点与实验如何对应)$/m.test(generatedDepthSection)) {
    failures.push(`${articlePath} 仍用附录式总章节重复正文知识点。`)
  }
  if (/(?:核心结论|验证入口)[^\n]*结论\s*\d+/m.test(generatedDepthSection)) {
    failures.push(`${articlePath} 仍把正文逐句复制成“结论 N”索引。`)
  }
  if (/```ya?ml[\s\S]*?(?:baseline_run|changed_variable|decision_topic)|"runId"\s*:\s*"required"/m.test(generatedDepthSection)) {
    failures.push(`${articlePath} 仍用跨主题证据模板补篇幅。`)
  }
  if (progressiveDepthSections.length > 0) {
    /** 渐进式文章六个关键阶段在完整正文中的实际位置。 */
    const progressionIndexes = [
      markdown.search(/^#{1,6}\s+.*先建立全局[：:]/m),
      markdown.search(/^#{1,6}\s+.*核心对象之间怎样衔接/m),
      markdown.search(/^#{1,6}\s+.*再看失败[：:]/m),
      markdown.search(/^#{1,6}\s+.*动手验证[：:]/m),
      markdown.search(/^#{1,6}\s+.*用一张矩阵验证/m),
      markdown.search(/^#{1,6}\s+.*结果解释$/m),
      markdown.search(/^#{1,6}\s+.*发布判断$/m)
    ]
    /** 每个阶段必须存在，并严格按全局定义、对象关系、失败、实践、逐章验证、解释、发布顺序出现。 */
    const hasProgressiveOrder = progressionIndexes.every((progressionIndex) => progressionIndex >= 0)
      && progressionIndexes.every((progressionIndex, progressionIndexPosition) =>
        progressionIndexPosition === 0 || progressionIndex > progressionIndexes[progressionIndexPosition - 1]
      )
    if (!hasProgressiveOrder) {
      failures.push(`${articlePath} 未按全局定义、对象关系、失败、实践、逐章验证、结果解释、发布判断的顺序组织补强内容。`)
    }
    /** 验证矩阵至少引用三个不同原文章节或知识主题，不能退回一套通用工作表。 */
    const verificationMatrix = generatedDepthSection.match(/\| 正文章节 \| 已解释的结论 \| 本轮唯一变量 \| 必须保存的证据 \|\n\|[- |]+\|\n((?:\|.+\|\n?)+)/m)?.[1] || ''
    /** 表头与分隔行之后的实际结论行数。 */
    const citedConclusionCount = (verificationMatrix.match(/^\|.+\|$/gm) || []).length
    if (citedConclusionCount < 3) {
      failures.push(`${articlePath} 的自动补强没有逐条绑定至少三个原文结论。`)
    }
    if (/(?:要回答的)?问题[ \t]*\|[ \t]*失败信号|^#{1,6}[ \t]+[^\n]*题[ \t]*\|/m.test(markdown)) {
      failures.push(`${articlePath} 仍包含被截断的旧模板表头。`)
    }
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
    /** 当前正式文章的物理行数；行数通过不能替代其余内容深度门禁。 */
    const articleLineCount = markdown.split('\n').length
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
    if (articleLineCount < MIN_ARTICLE_LINE_COUNT) {
      failures.push(`${articlePath} 只有 ${articleLineCount} 行，正式文章至少需要 ${MIN_ARTICLE_LINE_COUNT} 行。`)
    }
    if (isAiApplicationArticle && STALE_NAVIGATION_PATTERN.test(markdown)) {
      failures.push(`${articlePath} 仍包含旧篇号或旧 appendices 导航。`)
    }
    if (WRITING_TASK_ARTIFACT_PATTERN.test(markdown)) failures.push(`${articlePath} 仍包含临时写作任务指令。`)
    if (LEGACY_BULK_ARTICLE_PATTERN.test(markdown)) failures.push(`${articlePath} 仍包含跨文章复用的旧 AI 编程模板。`)
    auditArticleDepth(articlePath, markdown)
    auditRunnableCodeBlocks(articlePath, markdown)

    // Neo4j 核心知识集中在独立专题；RAG 文章只保留跨链路实践和明确引用。
    if (isAiApplicationArticle && /^Neo4j（/i.test(heading) && !articlePath.startsWith('03-AI大模型应用开发/08-Neo4j/')) {
      failures.push(`${articlePath} 的 Neo4j 主文应归入 AI 应用开发的 Neo4j 知识域。`)
    }
    // Redis 短期记忆必须归入记忆系统；RAG 目录中的 Redis 只承载缓存、限流和热点保护。
    if (isAiApplicationArticle && /Redis.*(?:短期记忆|Agent Memory)/i.test(heading) && !articlePath.startsWith('03-AI大模型应用开发/10-记忆系统/')) {
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

/**
 * 审计跨文章完全相同的正文，阻止批处理模板再次伪装成文章深度。
 * @param {string[]} articleFiles 全部正式文章文件。
 */
function auditCrossArticleProseReuse(articleFiles) {
  /** 规范正文行到包含该行的文章路径集合。 */
  const articlePathsByProseLine = new Map()

  for (const filePath of articleFiles) {
    /** 当前文章公开路径。 */
    const articlePath = getArticlePath(filePath)
    /** 当前文章尚未去重的正文行。 */
    const markdownLines = fs.readFileSync(filePath, 'utf8').split('\n')
    /** 当前是否位于代码围栏内部。 */
    let insideCodeFence = false
    /** 当前文章已经登记的正文行，防止单篇内部重复放大跨文章数量。 */
    const articleProseLines = new Set()

    for (const markdownLine of markdownLines) {
      /** 围栏标记切换源码状态，源码复用由代码审计负责。 */
      if (/^\s*(?:```|~~~)/.test(markdownLine)) {
        insideCodeFence = !insideCodeFence
        continue
      }
      if (insideCodeFence) continue

      /** 去除 Markdown 强调符后的稳定正文。 */
      const normalizedLine = markdownLine.replace(/[`*~]/g, '').replace(/\s+/g, ' ').trim()
      /** 结构标记、短标签、表格、链接和自动标记允许合理复用。 */
      if (
        normalizedLine.length < 28
        || /^(?:#{1,6}\s|\||<!--|>\s*读完|参考资料)/.test(normalizedLine)
        || /https?:\/\//.test(normalizedLine)
      ) continue
      articleProseLines.add(normalizedLine)
    }

    for (const proseLine of articleProseLines) {
      /** 当前正文行已经出现的文章集合。 */
      const articlePaths = articlePathsByProseLine.get(proseLine) || new Set()
      articlePaths.add(articlePath)
      articlePathsByProseLine.set(proseLine, articlePaths)
    }
  }

  for (const [proseLine, articlePaths] of articlePathsByProseLine) {
    if (articlePaths.size <= MAX_ARTICLE_PROSE_REUSE_COUNT) continue
    /** 少量文章路径用于在失败输出中快速定位模板来源。 */
    const articleExamples = [...articlePaths].slice(0, 3).join('、')
    failures.push(`正文跨 ${articlePaths.size} 篇文章重复：“${proseLine}”；示例：${articleExamples}。`)
  }
}

/** 审计三张思维导图是否与文章严格一一对应且包含有效知识点。 */
function auditMindmaps(articlePaths) {
  /** 每条文章路径在三张导图中出现的次数。 */
  const mindmapLinkCounts = new Map()
  /** 每条末级结论出现过的文章标题，用于识别跨文章模板。 */
  const detailArticleTitles = new Map()

  for (const fileName of MINDMAP_FILE_NAMES) {
    /** 当前思维导图 Markdown。 */
    const markdown = fs.readFileSync(path.join(MINDMAP_ROOT, fileName), 'utf8')
    if (/<\/?[A-Za-z][^>]*>/.test(markdown)) {
      failures.push(`${fileName} 含有未转义 HTML 标签，可能导致 Markmap 截断后续知识节点。`)
    }
    for (const line of markdown.split('\n')) {
      /** 导图中的文章链接行。 */
      const articleMatch = line.match(/^(\s*)- \[([^\]]+)\]\(\/knowledge\/([^)]+)\)$/)
      if (!articleMatch) continue
      /** 解码后的公开文章路径。 */
      const articlePath = articleMatch[3].split('/').map(decodeURIComponent).join('/')
      mindmapLinkCounts.set(articlePath, (mindmapLinkCounts.get(articlePath) || 0) + 1)
    }
  }

  /** 三张总图按实际缩进解析出的文章知识树。 */
  const routeArticleTrees = getRouteMindmapArticleTrees()
  for (const routeArticleTree of routeArticleTrees.values()) {
    if (routeArticleTree.sections.length < MIN_MINDMAP_POINTS) {
      failures.push(`路线总图中的“${routeArticleTree.title}”只有 ${routeArticleTree.sections.length} 个有效知识分支。`)
    }
    if (routeArticleTree.sections.length > MAX_MINDMAP_POINTS) {
      failures.push(`路线总图中的“${routeArticleTree.title}”有 ${routeArticleTree.sections.length} 个知识分支，超过 ${MAX_MINDMAP_POINTS} 个。`)
    }
    for (const section of routeArticleTree.sections) {
      if (GENERIC_MINDMAP_POINT_PATTERN.test(section.title)) {
        failures.push(`路线总图中的“${routeArticleTree.title}”使用了通用分支：${section.title}`)
      }
      if (section.points.length < MIN_MINDMAP_DETAILS || section.points.length > MAX_MINDMAP_DETAILS) {
        failures.push(`路线总图中的“${routeArticleTree.title} / ${section.title}”有 ${section.points.length} 条结论，应为 ${MIN_MINDMAP_DETAILS}～${MAX_MINDMAP_DETAILS} 条。`)
      }
      for (const detail of section.points) {
        /** 当前结论对应的文章集合；同一文章内部重复由章节审计负责。 */
        const articleTitles = detailArticleTitles.get(detail) || new Set()
        articleTitles.add(routeArticleTree.title)
        detailArticleTitles.set(detail, articleTitles)
        if (/[：:]$/.test(detail) || /[？?][”’」』】）)]?\s*$/.test(detail)) {
          failures.push(`路线总图中的“${routeArticleTree.title} / ${section.title}”包含不完整或仅提问的结论：${detail}`)
        }
      }
    }
  }

  for (const [detail, articleTitles] of detailArticleTitles) {
    if (articleTitles.size <= MAX_MINDMAP_DETAIL_REUSE_COUNT) continue
    /** 只展示少量来源，完整数量已经能够证明模板污染。 */
    const sourceExamples = [...articleTitles].slice(0, 3).join('、')
    failures.push(`三张路线总图的末级结论跨 ${articleTitles.size} 篇文章重复：“${detail}”；示例：${sourceExamples}。`)
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

/**
 * 将正文或导图结论规范成可比较的证据文本。
 * @param {string} text Markdown 正文或知识节点文本。
 * @returns 去除展示语法和空白后的稳定文本。
 */
function normalizeMindmapEvidenceText(text) {
  return text
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[\p{P}\p{S}\s]+/gu, '')
    .trim()
}

/**
 * 从三张路线总图读取每篇文章实际展示的标题、分支与叶子结论。
 * @returns 文章公开路径到总图知识树的映射。
 */
function getRouteMindmapArticleTrees() {
  /** 三张路线总图中全部文章的实际知识树。 */
  const articleTrees = new Map()

  for (const fileName of MINDMAP_FILE_NAMES) {
    /** 当前路线总图的 Markdown 行。 */
    const mindmapLines = fs.readFileSync(path.join(MINDMAP_ROOT, fileName), 'utf8').split('\n')
    /** 当前文章链接在总图中的缩进。 */
    let articleIndent = -1
    /** 当前正在收集的文章知识树。 */
    let currentArticleTree = null

    for (const line of mindmapLines) {
      /** 路线总图中的文章链接节点。 */
      const articleMatch = line.match(/^(\s*)- \[([^\]]+)]\(\/knowledge\/([^)]+)\)$/)
      if (articleMatch) {
        /** 解码后的文章公开路径。 */
        const articlePath = articleMatch[3].split('/').map(decodeURIComponent).join('/')
        articleIndent = articleMatch[1].length
        currentArticleTree = {
          title: articleMatch[2], // 总图中的文章标题必须与文章开头导图根节点一致。
          sections: [] // 后续分支严格按总图出现顺序收集。
        }
        articleTrees.set(articlePath, currentArticleTree)
        continue
      }
      if (!currentArticleTree || articleIndent < 0) continue

      /** 当前文章下直接缩进两格的知识分支。 */
      const sectionMatch = line.match(new RegExp(`^\\s{${articleIndent + 2}}- (.+)$`))
      if (sectionMatch) {
        if (/^\[来源：/.test(sectionMatch[1])) continue
        currentArticleTree.sections.push({
          title: sectionMatch[1], // 分支标题必须逐字来自文章开头导图。
          points: [] // 后续缩进四格的叶子结论归入当前分支。
        })
        continue
      }

      /** 当前分支下直接缩进四格的叶子结论。 */
      const pointMatch = line.match(new RegExp(`^\\s{${articleIndent + 4}}- (.+)$`))
      if (!pointMatch) continue
      /** 总图中最近出现的知识分支。 */
      const currentSection = currentArticleTree.sections.at(-1)
      if (currentSection) currentSection.points.push(pointMatch[1])
    }
  }

  return articleTrees
}

/**
 * 全量审计文章开头导图、路线总图和文章正文是否使用同一知识树。
 * @param {string[]} articleFiles 全部正式文章文件。
 */
function auditMindmapSemanticCorrespondence(articleFiles) {
  /** 三张路线总图中逐篇解析出的实际知识树。 */
  const routeArticleTrees = getRouteMindmapArticleTrees()

  for (const filePath of articleFiles) {
    /** 当前文章公开路径。 */
    const articlePath = getArticlePath(filePath)
    /** 当前文章完整 Markdown。 */
    const markdown = fs.readFileSync(filePath, 'utf8')
    /** 当前文章 H1；缺失时使用文件名帮助定位，但文章深度门禁会另行报错。 */
    const articleTitle = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || path.basename(filePath, path.extname(filePath))
    /** 页面运行时与审计共用的文章用途。 */
    const articleKind = getKnowledgeArticleKind(articlePath)
    /** 文章开头实际使用的规范知识树。 */
    const articleMindmap = createKnowledgeMindmap(
      markdown,
      articleTitle,
      articlePath.startsWith('03-AI大模型应用开发/'),
      articleKind
    )
    if (!articleMindmap) {
      failures.push(`${articlePath} 无法生成文章开头思维导图。`)
      continue
    }

    /** 路线总图中与当前文章链接对应的知识树。 */
    const routeArticleTree = routeArticleTrees.get(articlePath)
    if (!routeArticleTree) {
      failures.push(`${articlePath} 在三张路线总图中没有对应知识树。`)
      continue
    }

    if (routeArticleTree.title !== articleMindmap.title) {
      failures.push(`${articlePath} 的文章导图标题“${articleMindmap.title}”与路线总图标题“${routeArticleTree.title}”不一致。`)
    }
    if (JSON.stringify(routeArticleTree.sections) !== JSON.stringify(articleMindmap.sections)) {
      failures.push(`${articlePath} 的文章开头导图与路线总图分支或叶子结论不一致。`)
    }

    /** 去除 Markdown 展示语法后的完整正文证据。 */
    const normalizedMarkdown = normalizeMindmapEvidenceText(markdown)
    for (const section of articleMindmap.sections) {
      if (section.points.length < MIN_MINDMAP_DETAILS) {
        failures.push(`${articlePath} 的“${section.title}”只有 ${section.points.length} 条正文结论。`)
      }
      for (const point of section.points) {
        /** 当前叶子结论去除展示语法后的稳定文本。 */
        const normalizedPoint = normalizeMindmapEvidenceText(point)
        if (!normalizedPoint || !normalizedMarkdown.includes(normalizedPoint)) {
          failures.push(`${articlePath} 的导图结论无法回到正文：“${point}”。`)
        }
      }
    }
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
    const rawModuleName = moduleDirectory.replace(/^\d+-/, '').replaceAll('-', ' ')
    /** 按页面运行时使用的同一映射恢复正式模块名称。 */
    const moduleName = getKnowledgeDirectoryModuleLabel(rawModuleName)
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
        .map((line) => line.replace(/^- /, '').trim().replace(/^\d+\s*-\s*/, ''))
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
    /** 新全栈文章是否包含独立的三级专题目录。 */
    const isNestedFullStackArticle =
      pathSegments[0] === FULL_STACK_DIRECTORY_NAME &&
      pathSegments.length >= NESTED_FULL_STACK_ARTICLE_SEGMENT_COUNT
    /** 当前文章所属的连续编号目录；嵌套全栈内容按专题独立从 01 编号。 */
    const modulePath = pathSegments.slice(0, isNestedFullStackArticle ? 3 : 2).join('/')
    /** 当前文章文件名中的数字前缀。 */
    const sequenceSegment = pathSegments[isNestedFullStackArticle ? 3 : 2]
    /** 当前文章解析出的数字课号。 */
    const sequence = Number.parseInt(sequenceSegment?.match(/^(\d+)-/)?.[1] || '', 10)
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

/** 审计 AI 应用实体目录、页面模块配置与实际阅读顺序完全一致。 */
function auditAiApplicationModuleOrder() {
  /** AI 应用开发实体目录根路径。 */
  const aiApplicationRoot = path.join(KNOWLEDGE_ROOT, '03-AI大模型应用开发')
  /** 按文件系统编号得到的实际模块展示顺序。 */
  const actualModules = fs
    .readdirSync(aiApplicationRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !NON_ARTICLE_DIRECTORIES.has(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'zh-CN', { numeric: true }))
    .map((directoryName) => getKnowledgeDirectoryModuleLabel(directoryName.replace(/^\d+-/, '').replaceAll('-', ' ')))
  /** 页面路线配置声明的预期模块顺序。 */
  const expectedModules = [...KNOWLEDGE_TRACK_MODULES.aiApps]

  if (actualModules.join('\n') !== expectedModules.join('\n')) {
    failures.push(`AI 应用模块顺序与页面配置不一致：实体目录为 ${actualModules.join(' -> ')}；页面配置为 ${expectedModules.join(' -> ')}。`)
  }
}

/** 全部正式文章文件。 */
const articleFiles = findArticleFiles(KNOWLEDGE_ROOT)
/** 全部正式文章公开路径。 */
const articlePaths = new Set(articleFiles.map(getArticlePath))
auditArticles(articleFiles)
auditCrossArticleProseReuse(articleFiles)
auditMindmaps(articlePaths)
auditMindmapSemanticCorrespondence(articleFiles)
auditMindmapModuleCoverage(articlePaths)
auditAiApplicationModuleOrder()
auditPathMigrations(articlePaths)
auditModuleSequences(articlePaths)

if (failures.length > 0) {
  console.error(`知识质量审计失败，共 ${failures.length} 项：`)
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exitCode = 1
} else {
  console.log(`知识质量审计通过：${articleFiles.length} 篇文章的标题、分支和叶子结论与三张思维导图严格一一对应。`)
  console.log(`深度门禁通过 ${depthQualifiedArticleCount} 篇，Markdown 内联可执行代码块 ${inlineRunnableCodeBlockCount} 个。`)
}
