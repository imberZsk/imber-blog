import fs from 'node:fs'
import path from 'node:path'

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
  /^(?:学习目标|学习边界|在线运行|页面运行|本地查看|预期输出(?:（节选）)?|重点观察|动手实践|动手改|参考资料|本篇定位|与进阶篇的分工|一个真实场景|先从一个真实场景|为什么需要它|核心决策|核心拆解|工程链路|落地步骤|落地建议|决策记录(?:怎么写)?|生产避坑|故障演练|工程上真正会踩的坑(?:（本篇独有）)?|常见坑|一句话面试答法|复述答法|和已有主线的关系|本篇先抓住什么|先确定方向|这一章怎么读|前言|背景|复习导航|问题清单|怎么跑|看点|main\.py|一张 Mermaid 图|真实.+怎么用)$/i

/** 每篇文章在路线导图中至少需要展示的具体知识节点数。 */
const MIN_MINDMAP_POINTS = 3

/** 每篇文章在路线导图中最多允许展示的具体知识节点数。 */
const MAX_MINDMAP_POINTS = 8

/** 重构前高价值知识树中必须持续保留的核心术语，防止目录重生成再次压扁语义。 */
const REQUIRED_KNOWLEDGE_TERMS = {
  '01-全栈开发.md': [
    'HTML语义化', 'CSS盒模型', '事件循环', 'TypeScript泛型', '浏览器渲染',
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
    'Prompt Engineering', 'Context Engineering', 'Harness Engineering', 'Loop Engineering', 'Graph Engineering',
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
    '语义记忆', '情景记忆', '程序性记忆', 'TTL', '衰减', '冲突', '遗忘', 'Mem0', 'Redis',
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

/** 已知主题必须引用的直接来源规则。 */
const TOPIC_SOURCE_RULES = [
  { title: /Coze/i, source: /https?:\/\/(?:www\.)?coze\.(?:cn|com)\//i },
  { title: /Neo4j|Graph\s*RAG/i, source: /https?:\/\/neo4j\.com\//i },
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

/** 清理格式符并统一空白，用于核对导图节点是否确实来自文章正文。 */
function normalizeKnowledgeText(value) {
  return value.replace(/[`*~]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('zh-CN')
}

/** 从实体知识域目录获得显示名称。 */
function getDomainLabel(articlePath) {
  return (articlePath.split('/')[1] || '').replace(/^\d+-/, '').replaceAll('-', ' ')
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
    /** 当前文章公开路径，用于逐节点核对正文来源。 */
    let currentArticlePath = ''
    /** 当前文章正文的规范化文本。 */
    let currentArticleMarkdown = ''
    /** 当前文章已有的有效知识点数量。 */
    let currentKnowledgePointCount = 0

    const flushArticle = () => {
      if (currentArticleTitle && currentKnowledgePointCount < MIN_MINDMAP_POINTS) {
        failures.push(`${fileName} 的“${currentArticleTitle}”只有 ${currentKnowledgePointCount} 个有效知识点，至少需要 ${MIN_MINDMAP_POINTS} 个。`)
      }
      if (currentArticleTitle && currentKnowledgePointCount > MAX_MINDMAP_POINTS) {
        failures.push(`${fileName} 的“${currentArticleTitle}”有 ${currentKnowledgePointCount} 个知识点，最多允许 ${MAX_MINDMAP_POINTS} 个。`)
      }
      currentArticleTitle = ''
      currentArticlePath = ''
      currentArticleMarkdown = ''
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
        currentArticlePath = articlePath
        /** 导图引用不存在的文章会在循环结束后统一报告。 */
        const articleFilePath = getArticleFilePath(articlePath)
        currentArticleMarkdown = fs.existsSync(articleFilePath)
          ? normalizeKnowledgeText(fs.readFileSync(articleFilePath, 'utf8'))
          : ''
        mindmapLinkCounts.set(articlePath, (mindmapLinkCounts.get(articlePath) || 0) + 1)
        continue
      }

      /** 文章下的知识点或来源行。 */
      const pointMatch = line.match(/^    - (.+)$/)
      if (!pointMatch || /^\[来源：/.test(pointMatch[1])) continue
      if (GENERIC_MINDMAP_POINT_PATTERN.test(pointMatch[1])) {
        failures.push(`${fileName} 的“${currentArticleTitle}”使用了通用操作标签：${pointMatch[1]}`)
      } else {
        currentKnowledgePointCount += 1
        if (currentArticlePath && !currentArticleMarkdown.includes(normalizeKnowledgeText(pointMatch[1]))) {
          failures.push(`${fileName} 的“${currentArticleTitle}”包含正文未承载的知识节点：${pointMatch[1]}`)
        }
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
}
