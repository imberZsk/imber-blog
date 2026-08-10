import 'server-only'

/** 单道知识题的选择方式。 */
export type KnowledgeQuizQuestionType = 'single' | 'multiple'

/** 知识题中的一个候选答案。 */
export interface KnowledgeQuizOption {
  /** 选项在当前题中的稳定标识。 */
  id: string
  /** 用户看到的选项文案。 */
  label: string
  /** 当前选项是否属于正确答案。 */
  isCorrect: boolean
}

/** 文章底部用于检验核心知识的选择题。 */
export interface KnowledgeQuizQuestion {
  /** 题目在文章中的稳定标识。 */
  id: string
  /** 题目采用单选还是多选。 */
  type: KnowledgeQuizQuestionType
  /** 需要用户判断的核心知识问题。 */
  prompt: string
  /** 当前题可以选择的答案。 */
  options: KnowledgeQuizOption[]
  /** 提交答案后展示的核心知识解释。 */
  explanation: string
}

/** 匹配适合优先生成题目的总结、学习成果类二级标题。 */
const SUMMARY_HEADING_PATTERN = /^##\s+.*(?:小结|总结|核心要点|关键要点|本章要点|你将能够|你能做什么).*$/m

/** 匹配作者明确写出的学习目标，避免用章节标题冒充知识结论。 */
const LEARNING_OUTCOME_PATTERN = /^>\s*(?:本章目标|学习目标|学完你能|读完你能|目标)[:：]\s*(.+)$/gm

/** 排除导航、写作说明等不能用于检验理解的陈述。 */
const NON_ASSESSABLE_STATEMENT_PATTERN = /^(?:下一(?:篇|章)|继续阅读|延伸阅读|参考资料|本文围绕|本章将)/

/** 选择题选项使用的稳定标识。 */
const QUIZ_OPTION_IDS = ['A', 'B', 'C', 'D'] as const

/** 自动生成题中用于识别常见学习误区的错误陈述模板。 */
const GENERIC_INCORRECT_OPTION_TEMPLATES = [
  '学习“{title}”时，只记住术语或 API 名称即可，不必理解适用条件与失败边界。',
  '使用“{title}”时，只要示例能运行，就无需验证输入、输出和异常路径。',
  '遇到不同场景时，应直接照搬“{title}”中的示例，不需要结合约束调整方案。'
] as const

/** 重点课程人工设计的核心知识题。 */
const CURATED_QUIZZES: Record<string, KnowledgeQuizQuestion[]> = {
  '02-AI编程/06-Superpowers/01-工作流总览': [
    {
      id: 'superpowers-workflow',
      type: 'multiple',
      prompt: 'Superpowers 工作流中，哪些做法属于完成实现前必须保留的工程约束？',
      options: [
        { id: 'A', label: '需求未确认前先进行 brainstorming。', isCorrect: true },
        { id: 'B', label: '实现后用新鲜的命令输出证明验证结果。', isCorrect: true },
        { id: 'C', label: '为了提高速度，可以跳过计划直接修改多个模块。', isCorrect: false },
        { id: 'D', label: '代理声称完成即可替代代码审查。', isCorrect: false }
      ],
      explanation: 'Superpowers 用设计、计划、验证和审查约束实现过程；速度不能替代可检查的交付证据。'
    }
  ],
  '02-AI编程/06-Superpowers/02-需求澄清与实施计划': [
    {
      id: 'brainstorming-before-plans',
      type: 'single',
      prompt: 'Brainstorming 与 Writing Plans 的正确先后关系是什么？',
      options: [
        { id: 'A', label: '先确认目标、边界和验收标准，再拆实施步骤。', isCorrect: true },
        { id: 'B', label: '先写完整计划，再询问用户真正需要什么。', isCorrect: false },
        { id: 'C', label: '两者没有区别，只保留任意一个即可。', isCorrect: false },
        { id: 'D', label: '先编码验证想法，最后补写设计。', isCorrect: false }
      ],
      explanation: '方案决定做什么，计划决定怎样做；未经确认的假设不应先固化为任务。'
    }
  ],
  '02-AI编程/06-Superpowers/03-隔离工作区与执行计划': [
    {
      id: 'worktree-plan-execution',
      type: 'multiple',
      prompt: '使用 Worktree 执行长计划时，哪些做法正确？',
      options: [
        { id: 'A', label: '先记录独立工作树的构建和测试基线。', isCorrect: true },
        { id: 'B', label: '按小批次执行，并在每批后验证和复盘。', isCorrect: true },
        { id: 'C', label: '复用一个已有脏工作树承载所有无关任务。', isCorrect: false },
        { id: 'D', label: '计划一旦写完就不能根据证据调整。', isCorrect: false }
      ],
      explanation: '隔离工作区解决修改污染，小批次执行解决长任务偏航，两者都依赖可验证基线。'
    }
  ],
  '02-AI编程/06-Superpowers/04-TDD与系统化调试': [
    {
      id: 'tdd-debugging',
      type: 'single',
      prompt: '修复一个历史偶发故障时，最合理的第一步是什么？',
      options: [
        { id: 'A', label: '稳定复现并收集调用链证据，再提出可证伪假设。', isCorrect: true },
        { id: 'B', label: '连续尝试多个超时和空判断，直到故障消失。', isCorrect: false },
        { id: 'C', label: '直接重构相关模块，顺便消除潜在问题。', isCorrect: false },
        { id: 'D', label: '先删除失败测试，避免影响发布。', isCorrect: false }
      ],
      explanation: '历史故障先走系统化调试定位根因；确认根因后再用回归测试固定场景。'
    }
  ],
  '02-AI编程/06-Superpowers/05-子代理与并行任务': [
    {
      id: 'parallel-agents-boundary',
      type: 'multiple',
      prompt: '哪些任务适合交给多个子代理并行处理？',
      options: [
        { id: 'A', label: '分别调查三个互不依赖的测试失败。', isCorrect: true },
        { id: 'B', label: '分别审查互不重叠的模块，并由主代理汇总。', isCorrect: true },
        { id: 'C', label: '两个代理同时修改同一个核心文件。', isCorrect: false },
        { id: 'D', label: '根因未知且多个故障可能来自同一状态。', isCorrect: false }
      ],
      explanation: '并行只适用于依赖和写入边界清楚的任务，共享状态或根因未知时应先串行调查。'
    }
  ],
  '02-AI编程/06-Superpowers/06-审查验证与分支收尾': [
    {
      id: 'verification-before-finishing',
      type: 'single',
      prompt: '准备宣布分支完成时，哪一项可以作为有效证据？',
      options: [
        { id: 'A', label: '刚刚运行的目标测试、构建和 diff 检查结果。', isCorrect: true },
        { id: 'B', label: '代理在上一轮说测试应该能通过。', isCorrect: false },
        { id: 'C', label: '相似功能上周曾经通过测试。', isCorrect: false },
        { id: 'D', label: '页面看起来没有明显问题。', isCorrect: false }
      ],
      explanation: '完成前验证要求能够直接支持当前结论的新鲜证据，而不是推测、旧结果或自我声明。'
    }
  ],
  '03-AI大模型应用开发/02-企业级知识库/06-RAG文档向量化与语义搜索': [
    {
      id: 'rag-offline-indexing',
      type: 'multiple',
      prompt: 'RAG 离线建库链路中，哪些工作应在用户提问前完成？',
      options: [
        { id: 'A', label: '解析、清洗并切分原始文档。', isCorrect: true },
        { id: 'B', label: '计算文档向量并写入索引。', isCorrect: true },
        { id: 'C', label: '根据当前问题组装最终回答 Prompt。', isCorrect: false },
        { id: 'D', label: '为当前答案执行引用校验。', isCorrect: false }
      ],
      explanation: '离线链路生产可检索索引；问题改写、Context 组装和答案校验属于在线问答。'
    }
  ],
  '03-AI大模型应用开发/02-企业级知识库/07-RAG在线问答链路': [
    {
      id: 'rag-online-diagnosis',
      type: 'single',
      prompt: '正确证据没有进入 Top K 时，应该优先排查什么？',
      options: [
        { id: 'A', label: '查询改写、权限过滤、召回和重排。', isCorrect: true },
        { id: 'B', label: '只修改最终回答的语气。', isCorrect: false },
        { id: 'C', label: '增加模型输出长度。', isCorrect: false },
        { id: 'D', label: '隐藏答案引用。', isCorrect: false }
      ],
      explanation: '证据未召回是检索问题；只有证据正确但答案失真时，才优先检查生成规则和模型。'
    }
  ],
  '03-AI大模型应用开发/02-企业级知识库/08-混合检索与RRF实战': [
    {
      id: 'hybrid-rrf',
      type: 'multiple',
      prompt: '关于混合检索和 RRF，哪些说法正确？',
      options: [
        { id: 'A', label: 'BM25 适合错误码、型号和专有名词。', isCorrect: true },
        { id: 'B', label: 'RRF 可以只根据多路排名融合结果。', isCorrect: true },
        { id: 'C', label: '应直接相加不同检索器不可比较的原始分数。', isCorrect: false },
        { id: 'D', label: '有了混合检索就不再需要评测集。', isCorrect: false }
      ],
      explanation: '稀疏与稠密召回互补，RRF 用排名规避原始分数量纲差异，参数仍需通过评测集验证。'
    }
  ]
}

/**
 * 清理 Markdown 行中的列表、链接和强调标记。
 * @param markdownLine 需要转换为题目选项的单行 Markdown。
 */
function normalizeQuizStatement(markdownLine: string): string {
  return markdownLine
    .replace(/^\s*>\s*/, '')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/^(?:✅\s*该掌握|⚠️?\s*易混淆)\s*/, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/[；;]\s*$/, '')
    .trim()
}

/**
 * 从总结章节提取最适合作为正确答案的核心陈述。
 * @param markdown 当前文章的原始 Markdown。
 */
function extractSummaryStatements(markdown: string): string[] {
  /** 总结类二级标题在文章中的位置。 */
  const summaryHeadingMatch = SUMMARY_HEADING_PATTERN.exec(markdown)
  if (!summaryHeadingMatch || summaryHeadingMatch.index === undefined) {
    return []
  }

  /** 总结标题之后、下一个二级标题之前的 Markdown。 */
  const summarySection =
    markdown.slice(summaryHeadingMatch.index + summaryHeadingMatch[0].length).split(/^##\s+/m)[0] || ''
  /** 总结章节中长度适合做选择题的列表陈述。 */
  const summaryStatements = summarySection
    .split('\n')
    .filter((line) => /^\s*[-*+]\s+/.test(line))
    .map(normalizeQuizStatement)
    .filter(
      (statement) =>
        statement.length >= 8 && statement.length <= 140 && !NON_ASSESSABLE_STATEMENT_PATTERN.test(statement)
    )

  return Array.from(new Set(summaryStatements)).slice(0, 2)
}

/**
 * 从文章开头明确声明的学习目标中提取可检验陈述。
 * @param markdown 当前文章的原始 Markdown。
 */
function extractLearningOutcomes(markdown: string): string[] {
  /** 当前文章中去重后的明确学习成果。 */
  const learningOutcomes: string[] = []

  for (const outcomeMatch of markdown.matchAll(LEARNING_OUTCOME_PATTERN)) {
    /** 去除 Markdown 标记后的学习成果文本。 */
    const learningOutcome = normalizeQuizStatement(outcomeMatch[1] || '')
    if (
      learningOutcome.length < 8 ||
      learningOutcome.length > 180 ||
      NON_ASSESSABLE_STATEMENT_PATTERN.test(learningOutcome) ||
      learningOutcomes.includes(learningOutcome)
    ) {
      continue
    }

    learningOutcomes.push(learningOutcome)
    if (learningOutcomes.length === 2) {
      break
    }
  }

  return learningOutcomes
}

/**
 * 从正文开头提取一条能够表达概念作用或适用场景的陈述作为最后兜底。
 * @param markdown 当前文章的原始 Markdown。
 * @param title 已移除模块内课号的文章标题。
 */
function extractOpeningStatement(markdown: string, title: string): string {
  /** 正文开头中可能承载主题定义或用途的自然段。 */
  const openingStatement = markdown
    .split('\n')
    .map(normalizeQuizStatement)
    .find(
      (statement) =>
        statement.length >= 20 &&
        statement.length <= 140 &&
        !statement.startsWith('#') &&
        !statement.startsWith('|') &&
        !statement.startsWith('![') &&
        !NON_ASSESSABLE_STATEMENT_PATTERN.test(statement)
    )

  return openingStatement || `“${title}”需要结合具体目标、约束和验证结果来理解与使用。`
}

/**
 * 为没有人工题库的文章生成一题基于知识结论的实践判断题。
 * @param markdown 当前文章的原始 Markdown。
 * @param title 已移除模块内课号的文章标题。
 */
function createGeneratedQuiz(markdown: string, title: string): KnowledgeQuizQuestion[] {
  /** 优先采用作者写在总结中的核心结论。 */
  const summaryStatements = extractSummaryStatements(markdown)
  /** 没有结构化总结时使用作者明确声明的学习成果。 */
  const learningOutcomes = summaryStatements.length > 0 ? [] : extractLearningOutcomes(markdown)
  /** 题目实际检验的一到两个知识结论，禁止使用章节标题作为答案。 */
  const correctStatements =
    summaryStatements.length > 0
      ? summaryStatements
      : learningOutcomes.length > 0
        ? learningOutcomes
        : [extractOpeningStatement(markdown, title)]
  /** 多个独立知识结论使用多选，否则保持单选。 */
  const questionType: KnowledgeQuizQuestionType = correctStatements.length > 1 ? 'multiple' : 'single'
  /** 与当前主题绑定的常见误区，避免出现和文章无关的占位干扰项。 */
  const incorrectStatements = GENERIC_INCORRECT_OPTION_TEMPLATES.map((optionTemplate) =>
    optionTemplate.replace('{title}', title)
  )
  /** 知识结论与常见误区共同组成四个带判题信息的候选答案。 */
  const optionCandidates = [
    ...correctStatements.map((label) => ({ label, isCorrect: true })),
    ...incorrectStatements.map((label) => ({ label, isCorrect: false }))
  ].slice(0, 4)
  /** 使用标题字符得到稳定偏移，避免所有自动题都把正确答案固定放在前面。 */
  const optionRotationOffset =
    Array.from(title).reduce((characterSum, character) => characterSum + (character.codePointAt(0) || 0), 0) %
    optionCandidates.length
  /** 按稳定偏移重新排列后的候选答案。 */
  const orderedOptionCandidates = [
    ...optionCandidates.slice(optionRotationOffset),
    ...optionCandidates.slice(0, optionRotationOffset)
  ]
  /** 带稳定标识和正确性的最终候选答案。 */
  const options = orderedOptionCandidates.map((optionCandidate, index) => ({
    id: QUIZ_OPTION_IDS[index] || String(index + 1),
    ...optionCandidate
  }))

  return [
    {
      id: 'article-core-review',
      type: questionType,
      prompt:
        questionType === 'multiple'
          ? `在“${title}”的实际应用中，哪些判断符合本课内容？`
          : `以下关于“${title}”的判断，哪一项正确？`,
      options,
      explanation: `正确判断是：${correctStatements.join('；')}。其余选项把记忆术语、跑通示例或照搬方案误当成了真正掌握，忽略了适用边界与验证。`
    }
  ]
}

/**
 * 返回文章底部的最小核心知识题集。
 * @param articlePath 当前文章的公开路径。
 * @param markdown 当前文章的原始 Markdown。
 * @param title 已移除模块内课号的文章标题。
 */
export function createKnowledgeQuiz(articlePath: string, markdown: string, title: string): KnowledgeQuizQuestion[] {
  return CURATED_QUIZZES[articlePath] || createGeneratedQuiz(markdown, title)
}
