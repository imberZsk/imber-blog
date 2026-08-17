import fs from 'node:fs'
import path from 'node:path'

/** 正式知识文章根目录。 */
const KNOWLEDGE_ROOT = path.join(process.cwd(), 'src', 'content', 'knowledge')

/** AI 大模型应用开发文章根目录。 */
const AI_APP_KNOWLEDGE_ROOT = path.join(KNOWLEDGE_ROOT, '03-AI大模型应用开发')

/** 只有显式传入 --write 才覆盖文章。 */
const SHOULD_WRITE = process.argv.includes('--write')

/** 显式限制为 AI 大模型应用开发路线，防止批量任务改动其他知识路线。 */
const SHOULD_ONLY_SCAN_AI_APPS = process.argv.includes('--ai-apps')

/** 可选逐篇审查报告输出位置。 */
const REPORT_PATH = process.argv.includes('--report')
  ? process.argv[process.argv.indexOf('--report') + 1]
  : null

/** 不作为正式文章扫描的目录。 */
const NON_ARTICLE_DIRECTORIES = new Set(['assets', '_shared-labs', 'lab'])

/** 写作元信息不能进入正文总结或学习目标。 */
const META_HEADING_PATTERN = /^(?:学习目标|学习边界|核心知识清单|参考资料|事实来源|延伸阅读|总结|小结|验收清单|学完验收|自测|学完自测|附录)$/i

/** 实验导航、文件名和重复小结不能代替正文知识结论。 */
const AUXILIARY_HEADING_PATTERN = /^(?:本章小结|一个真实场景|先从一个真实场景.*|动手实践.*|目录内容|使用方式|练习目标|配套实践材料|官方资料|安装|许可证|如何验证.+关键结论[？?]?)$/i

/** 参考资料允许位于最后正文“总结”之后。 */
const REFERENCE_HEADING_PATTERN = /^(?:参考资料|事实来源|延伸阅读)$/i

/** 需要被具体内容替换的旧批量学习目标。 */
const GENERIC_GOAL_PATTERN = /(?:围绕“[^”]+”完成一次可解释、可验证、可回滚的工程判断|解释“[^”]+”，(?:复现|为)“[^”]+”[^\n]*失败边界|复述本主题的关键数据流，选择至少一种替代方案|核心对象、职责和失败边界|能按顺序说明“[^”]+”的关键阶段|能根据“[^”]+”给出的条件做出方案选择)/

/** 本轮早期生成但抽样后判定不够自然的目标格式，必须自动重建。 */
const LEGACY_GENERATED_GOAL_PATTERN = /(?:给定“[^\n]+”的目标场景，能|针对正文结论“|给定“[^\n]+”的输入与约束，能把|给定“[^\n]+”的正常输入，能围绕)/

/** 更早批次按验证画像生成的三条通用目标，必须改为引用当前文章事实。 */
const PROFILE_GENERATED_GOAL_PATTERN = /(?:给定 固定样本、基线、候选、成功标准和失败边界|给定“(?:条件缺失、结果不可复现或失败后责任不清|文本直通执行、状态不可重放或重试重复写入)”的失败样本|给定本文方案的一次候选变更)/

/** 把延伸阅读导航误抽成正文事实的旧目标必须重建。 */
const NAVIGATION_GENERATED_GOAL_PATTERN = /(?:解释|针对|将)“[^”]*(?:请读|另见|参见|延伸阅读|进阶.+《)[^”]*”/

/** 旧生成目标直接引用散文句，无法稳定命中章节核心结论，统一升级为章节任务格式。 */
const FACT_QUOTE_GENERATED_GOAL_PATTERN = /(?:在“[^”]+”中解释|针对“[^”]+”中的|将“[^”]+”中的)“/

/** 旧证据模板把任意事实机械变成失败样本或代码任务，命中后迁移为章节任务。 */
const EVIDENCE_TEMPLATE_GENERATED_GOAL_PATTERN = /(?:构造一个违反该条件的失败样本|落成最小代码或配置)/

/** 场景章节与 Markdown 表格行不能作为章节任务的核心结论。 */
const WEAK_SECTION_GENERATED_GOAL_PATTERN = /(?:\/ (?:一个真实场景|先从一个真实场景)[^”]*”|(?:解释|验证|检验)“\|)/

/** 第一版章节目标尚未应用父子事实去重，统一迁移到最终动作格式。 */
const SECTION_GOAL_V1_PATTERN = /^>\s*-\s*围绕“[^\n]+”解释“/m

/** 导航、篇章分工和写作指引不能进入学习目标或验证任务。 */
const NAVIGATION_FACT_PATTERN = /(?:请读|另见|参见|延伸阅读|本篇保留为|进阶(?:实现|实践|项目|模型|部署|检索|切分|入库|应用|工具|图编排|知识)|第\s*\d+\s*篇)/i

/** 能直接转成学习产出的正文步骤章节。 */
const IMPLEMENTATION_HEADING_PATTERN = /(?:落地步骤|实现步骤|生产链路|装配顺序|执行流程|接入步骤|怎么做|如何实现|如何落地)/i

/** 学习产出必须以读者可以执行的动作开头。 */
const OUTCOME_ACTION_PATTERN = /^(?:用|使用|为|根据|记录|设计|实现|配置|构建|编写|运行|执行|计算|选择|比较|排查|定位|验证|部署|制定|输出|检查|测试|接入|拆分|收集|固定|设置|保留|校验|对比|建立)/

/** 学习产出必须明确留下可检查的证据或交付物。 */
const OUTCOME_EVIDENCE_PATTERN = /(?:代码|配置|表格|记录|日志|测试|报告|指标|Trace|Diff|输出|结果|样本|引用|命令|截图|证据)/i

/** 旧生成器写入的通用总结，不能帮助读者恢复当前文章的决策路径。 */
const GENERIC_SUMMARY_PATTERN = /(?:要同时写清输入、权限、状态、输出和失败边界|实现应从最小可验证步骤开始|模型结论必须由代码、测试、Diff 或 Trace 复核|超时、预算耗尽、重复失败和高风险副作用|核心对象、职责和失败边界|如何验证.+关键结论|机制与边界[：:]逐点拆解|相同验证方法合并|场景基线先登记什么|按什么顺序实施和收集证据|如下图|运行最小案例|根据上面的关键机制|\|\s*编号\s*\|)/

/** 至少包含这些信号之一的句子才适合进入总结。 */
const EXPLANATION_SIGNAL_PATTERN = /(?:是|指|通过|因为|所以|负责|用于|适合|不适合|必须|不能|避免|区别|相比|决定|包含|支持|输入|输出|失败|风险|边界|验证|回滚|选择)/

/** 代码文章需要出现可执行或可验收说明。 */
const RUN_OR_VERIFY_PATTERN = /(?:安装|运行|启动|执行|验证|预期输出|测试命令|pytest|npm run|pnpm |python |java |mvn |gradle |docker compose|curl |git )/i

/** 从文章中识别明确学习目标。 */
const LEARNING_GOAL_PATTERN = /(?:读完你能|读完后[，,]?你应能|学完你能|学习目标|本章目标|你将学会)/i

/** Markdown 文件扩展名。 */
const MARKDOWN_FILE_PATTERN = /\.mdx?$/i

/** 正式技术文章必须达到的最少物理行数。 */
const MIN_ARTICLE_LINE_COUNT = 200

/** 工程工作表保留少量余量，防止格式器移除尾部空行后跌破门槛。 */
const TARGET_ARTICLE_LINE_COUNT = 205

/** 正文达到该信息量时优先整理软换行，不再追加大段通用工作表。 */
const MIN_REFLOW_PROSE_CHARACTER_COUNT = 1800

/** 自动工作表的稳定标记，重复执行时不得再次追加。 */
const OPERATIONAL_WORKBOOK_MARKER = '<!-- article-operational-workbook -->'

/** 渐进式补强区起点；同一篇文章可以在原文前后各有一个区块。 */
const PROGRESSIVE_BLOCK_START = '<!-- article-progressive-block:start -->'

/** 渐进式补强区终点；删除时必须与起点成对匹配。 */
const PROGRESSIVE_BLOCK_END = '<!-- article-progressive-block:end -->'

/** 参考资料以查询效率为目标，不使用正式课程的学习产出与篇幅补强。 */
const REFERENCE_ARTICLE_PATH_PATTERN = /(?:^|\/)(?:98|99)-|(?:附录|术语表|常用命令|学习资料链接|速查|疑问记录|配置模板)/

/** 旧 AI 编程批次使用的同构开场，命中后只删除已确认的模板章节。 */
const LEGACY_AI_CODING_TEMPLATE_PATTERN = /价值不在于多记一个名词[\s\S]*如果只展示一次成功演示/

/** 旧 AI 编程批次中与具体主题无关的章节。 */
const LEGACY_AI_CODING_SECTION_PATTERN = /^(?:这个主题解决什么问题|落地流程：从约束到证据|常见故障与排查|验收清单)$/

/** 中文章节编号只需覆盖单篇技术文章的合理章节数量。 */
const CHINESE_SECTION_NUMBERS = [
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '二十一', '二十二', '二十三', '二十四', '二十五', '二十六', '二十七', '二十八', '二十九', '三十'
]

/**
 * 判断文章是否包含 2～4 条带动作与证据的学习产出。
 * @param {string} markdown 当前文章。
 * @returns {boolean} 学习产出是否可执行、可验收。
 */
function hasSpecificLearningOutcome(markdown) {
  /** 标题后的学习产出引用块。 */
  const goalMatch = markdown.match(/^>\s*(?:读完|学完)[^\n]*\n((?:^>\s*-.*\n?){2,4})/m)
  /** 当前学习产出的逐项内容。 */
  const goalItems = goalMatch
    ? [...goalMatch[1].matchAll(/^>\s*-\s*(.+)$/gm)].map((match) => match[1].trim())
    : []
  return goalItems.length >= 2
    && goalItems.length <= 4
    && goalItems.every((goalItem) => /(?:能|完成|生成|输出|实现|配置|排查|验证|设计|绘制|解释|检验)/.test(goalItem) && OUTCOME_EVIDENCE_PATTERN.test(goalItem))
}

/**
 * 递归找出全部正式知识文章。
 * @param {string} directory 当前扫描目录。
 * @returns {string[]} Markdown 文件绝对路径。
 */
function findArticleFiles(directory) {
  /** 当前目录及子目录中的正式文章。 */
  const articleFiles = []

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    /** 当前目录项绝对路径。 */
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (!NON_ARTICLE_DIRECTORIES.has(entry.name)) articleFiles.push(...findArticleFiles(entryPath))
      continue
    }
    if (entry.isFile() && MARKDOWN_FILE_PATTERN.test(entry.name)) articleFiles.push(entryPath)
  }

  return articleFiles.sort((leftPath, rightPath) => leftPath.localeCompare(rightPath, 'zh-CN', { numeric: true }))
}

/**
 * 用等长空白遮蔽代码围栏，防止源码注释被识别成正文标题。
 * @param {string} markdown 原始 Markdown。
 * @returns {string} 保留字符位置的结构化 Markdown。
 */
function maskFencedCode(markdown) {
  return markdown.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, (codeBlock) => codeBlock.replace(/[^\n]/g, ' '))
}

/**
 * 清理标题编号和 Markdown 标记。
 * @param {string} headingText 原始标题文本。
 * @returns {string} 可用于语义判断的标题。
 */
function normalizeHeading(headingText) {
  return headingText
    .replace(/[`*~]/g, '')
    .replace(/^[一二三四五六七八九十百]+[、.．]\s*/, '')
    .replace(/^\d+(?:\.\d+)*(?:[、.．]|\s*[-—–:：])?\s*/, '')
    .trim()
}

/**
 * 解析围栏外标题及其正文边界。
 * @param {string} markdown 当前文章。
 * @returns {Array<{depth: number, rawTitle: string, title: string, start: number, contentStart: number, end: number}>} 标题章节。
 */
function getHeadingSections(markdown) {
  /** 保持源码位置不变的结构化正文。 */
  const structuralMarkdown = maskFencedCode(markdown)
  /** 全部 Markdown 标题及其位置。 */
  const headingMatches = [...structuralMarkdown.matchAll(/^(#{1,4})\s+(.+)$/gm)]

  return headingMatches.map((headingMatch, headingIndex) => {
    /** 当前标题深度。 */
    const depth = headingMatch[1].length
    /** 下一个同级或更高级标题决定当前章节边界。 */
    const nextBoundary = headingMatches
      .slice(headingIndex + 1)
      .find((candidateMatch) => candidateMatch[1].length <= depth)
    return {
      depth,
      rawTitle: headingMatch[2].trim(),
      title: normalizeHeading(headingMatch[2]),
      start: headingMatch.index || 0,
      contentStart: (headingMatch.index || 0) + headingMatch[0].length,
      end: nextBoundary?.index || markdown.length
    }
  })
}

/**
 * 把正文行清理成能够独立阅读的短句。
 * @param {string} markdownLine 当前 Markdown 行。
 * @returns {string} 清理后的事实句。
 */
function normalizeDetail(markdownLine) {
  /** 删除链接地址和常见 Markdown 标记后的纯文本。 */
  const plainText = markdownLine
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*~]/g, '')
    .replace(/^\s*(?:(?:>\s*)|(?:[-*+]\s+)|(?:\d+[.)、]\s*))+/, '')
    .replace(/^(?:->|→)\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (
    !plainText
    || /^(?:读完|学完|本文|本章|本篇|这篇|目标|一句话目标|目标不是|如下图|图示说明|下面|上面|当前|接下来|例如|示例|假设|参考|来源|那(?:第一个)?|这里|可以看到|先看|最后是|总的来说|运行最小案例|选择机制|界定主题|收集结果证据)/.test(plainText)
    || /^[，,、:：]/.test(plainText)
    || /[？?：:]$/.test(plainText)
  ) return ''

  /** 优先在完整句号处截断，避免导图式总结出现半句话。 */
  const sentenceEndIndex = plainText.search(/[。！？；]/)
  if (sentenceEndIndex >= 12) return plainText.slice(0, Math.min(sentenceEndIndex + 1, 180))
  if (plainText.length <= 180) return plainText
  /** 无完整句末标点的长文本可能是表格、日志或残缺片段，不能截断后冒充事实。 */
  return ''
}

/**
 * 删除写作元信息章节，主题解释只能来自真实知识正文。
 * @param {string} markdown 当前文章。
 * @returns {string} 不含目标、清单、总结和引用的正文。
 */
function getKnowledgeProseMarkdown(markdown) {
  /** 引用块形式的学习结果不属于知识正文。 */
  const withoutGoalQuotes = markdown.replace(/^>\s*(?:读完|学完)[^\n]*\n(?:^>.*\n?)*/gm, '')
  /** 全部标题章节。 */
  const headingSections = getHeadingSections(withoutGoalQuotes)
  /** 需要删除的元信息范围。 */
  const metadataSections = headingSections.filter((section) => META_HEADING_PATTERN.test(section.title) || AUXILIARY_HEADING_PATTERN.test(section.title))
  /** 从后向前删除，保持前面范围稳定。 */
  let knowledgeMarkdown = withoutGoalQuotes

  for (const section of [...metadataSections].sort((leftSection, rightSection) => rightSection.start - leftSection.start)) {
    knowledgeMarkdown = `${knowledgeMarkdown.slice(0, section.start)}${knowledgeMarkdown.slice(section.end)}`
  }

  return knowledgeMarkdown
}

/**
 * 判断总结事实是否只是重复主题或已经使用过的同义句。
 * @param {string} topic 总结主题。
 * @param {string} detail 总结事实。
 * @param {Set<string>} usedDetails 已使用事实的规范文本。
 * @returns {boolean} 当前事实是否有效。
 */
function isUsefulSummaryDetail(topic, detail, usedDetails) {
  /** 用于同义反复与重复判断的主题。 */
  const normalizedTopic = normalizeHeading(topic).replace(/\s+/g, '').toLocaleLowerCase('zh-CN')
  /** 用于同义反复与重复判断的事实。 */
  const normalizedDetail = normalizeHeading(detail).replace(/[。！？；，,:：\s]/g, '').toLocaleLowerCase('zh-CN')
  if (!normalizedDetail || normalizedDetail === normalizedTopic || normalizedDetail.length < 12) return false
  if (usedDetails.has(normalizedDetail)) return false
  return EXPLANATION_SIGNAL_PATTERN.test(detail)
}

/**
 * 从章节中提取最能支持标题结论的一条事实。
 * @param {string} sectionMarkdown 当前章节正文。
 * @returns {string} 高信息密度事实句。
 */
function getSectionSummaryDetail(sectionMarkdown) {
  /** 围栏源码不直接进入总结，代码结论应由相邻正文解释。 */
  const proseMarkdown = maskFencedCode(sectionMarkdown)
  /** 有序步骤按原顺序压缩成流程。 */
  const orderedSteps = [...proseMarkdown.matchAll(/^\s*\d+[.)、]\s+(.+)$/gm)]
    .map((match) => normalizeDetail(match[1]))
    .filter(Boolean)
    .slice(0, 4)
  if (orderedSteps.length >= 2) return orderedSteps.join(' -> ')

  /** 列表项和自然段组成事实候选。 */
  const detailCandidates = proseMarkdown
    .split('\n')
    .filter((markdownLine) => !/^\s*(?:#{1,4}\s+|\|.*\|\s*$)/.test(markdownLine))
    .flatMap((markdownLine) => markdownLine.split(/(?<=[。！？；])\s*/).filter(Boolean))
    .map(normalizeDetail)
    .filter((detail) => detail.length >= 12)
  /** 因果、定义、取舍和边界句优先，原文顺序作为同分依据。 */
  const rankedDetails = detailCandidates
    .map((detail, index) => ({ detail, index, score: EXPLANATION_SIGNAL_PATTERN.test(detail) ? 1 : 0 }))
    .sort((leftDetail, rightDetail) => rightDetail.score - leftDetail.score || leftDetail.index - rightDetail.index)
  return rankedDetails[0]?.detail || ''
}

/**
 * 找出文章中真正承载知识的章节。
 * @param {string} markdown 当前文章。
 * @returns {ReturnType<typeof getHeadingSections>} 可用于目标和总结的章节。
 */
function getContentSections(markdown) {
  /** 首个 H1 是文章标题，不属于正文知识分支。 */
  const headingSections = getHeadingSections(markdown).slice(1)
  /** 写作元信息或自动验证工作表的根章节。 */
  const excludedRootSections = headingSections.filter(
    (section) => META_HEADING_PATTERN.test(section.title) || AUXILIARY_HEADING_PATTERN.test(section.title)
  )
  return headingSections.filter((section) => {
    if (excludedRootSections.includes(section)) return false
    /** 根章节的所有子标题同样是辅助内容，不能进入目标或总结。 */
    return !excludedRootSections.some(
      (excludedRootSection) => section.start > excludedRootSection.start && section.start < excludedRootSection.end
    )
  })
}

/**
 * 提取作者显式维护的核心知识清单，单一长章节也能据此接受逐点审查。
 * @param {string} markdown 当前文章。
 * @returns {string[]} 去重后的核心知识主题。
 */
function getExplicitKnowledgeTopics(markdown) {
  /** 核心知识清单标题及其章节范围。 */
  const knowledgeSection = getHeadingSections(markdown).find((section) => section.title === '核心知识清单')
  if (!knowledgeSection) return []
  /** 清单中的具体主题。 */
  const knowledgeTopics = [...markdown.slice(knowledgeSection.contentStart, knowledgeSection.end).matchAll(/^\s*[-*+]\s+(.+)$/gm)]
    .map((match) => normalizeHeading(normalizeDetail(match[1])))
    .filter((topic) => topic.length >= 2)
  return [...new Set(knowledgeTopics)]
}

/**
 * 从整篇文章中找出能够解释指定知识主题的原文事实。
 * @param {string} markdown 当前文章。
 * @param {string} topic 核心知识主题。
 * @returns {string} 与主题直接相关的事实句。
 */
function getTopicSummaryDetail(markdown, topic) {
  /** 复合主题按连接词拆出的稳定关键词。 */
  const topicTerms = topic
    .split(/(?:与|和|及|、|，|,|\/|\+|\s+)/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
  /** 围栏外自然语言句子。 */
  const proseDetails = maskFencedCode(getKnowledgeProseMarkdown(markdown))
    .split('\n')
    .flatMap((markdownLine) => markdownLine.split(/(?<=[。！？；])\s*/).filter(Boolean))
    .map(normalizeDetail)
    .filter((detail) => detail.length >= 12 && EXPLANATION_SIGNAL_PATTERN.test(detail))
  /** 命中主题词最多的事实优先。 */
  const rankedDetails = proseDetails
    .map((detail) => ({
      detail,
      score: topicTerms.filter((term) => detail.toLocaleLowerCase('zh-CN').includes(term.toLocaleLowerCase('zh-CN'))).length
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((leftCandidate, rightCandidate) => rightCandidate.score - leftCandidate.score)
  return rankedDetails[0]?.detail || ''
}

/**
 * 从正文补充横切的取舍、机制、边界和验证结论，避免为了凑条数重复章节标题。
 * @param {string} markdown 当前文章。
 * @param {Set<string>} usedTitles 已使用总结主题。
 * @param {Set<string>} usedDetails 已使用总结事实。
 * @returns {string[]} 可直接写入总结的高密度条目。
 */
function getCrossCuttingSummaryItems(markdown, usedTitles, usedDetails) {
  /** 横切结论类别及其语义信号，按文章验收价值排序。 */
  const conclusionTypes = [
    { title: '工程边界', pattern: /(?:必须|不能|不要|避免|风险|边界|只有|不适合|不应)/ },
    { title: '验证方式', pattern: /(?:验证|测试|验收|日志|指标|预期|检查|Trace|回滚)/i },
    { title: '实现机制', pattern: /(?:通过|负责|调用|返回|转换|生成|保存|计算|流程|阶段)/ },
    { title: '选型依据', pattern: /(?:适合|选择|取舍|相比|区别|优先|推荐)/ }
  ]
  /** 围栏外、元信息外的完整事实候选。 */
  const factCandidates = maskFencedCode(getKnowledgeProseMarkdown(markdown))
    .split('\n')
    .filter((markdownLine) => !/^\s*(?:#{1,4}\s+|\|[-: |]+\|\s*$)/.test(markdownLine))
    .flatMap((markdownLine) => markdownLine.split(/(?<=[。！？；])\s*/).filter(Boolean))
    .map(normalizeDetail)
    .filter((detail) => detail.length >= 16 && EXPLANATION_SIGNAL_PATTERN.test(detail))
  /** 每类只选择一条未重复、能够独立阅读的正文事实。 */
  const crossCuttingItems = []

  for (const conclusionType of conclusionTypes) {
    if (usedTitles.has(conclusionType.title)) continue
    /** 当前类别第一条尚未使用的事实。 */
    const detail = factCandidates.find((candidateDetail) => {
      /** 当前事实的规范文本。 */
      const normalizedDetail = normalizeHeading(candidateDetail).replace(/[。！？；，,:：\s]/g, '').toLocaleLowerCase('zh-CN')
      return conclusionType.pattern.test(candidateDetail) && !usedDetails.has(normalizedDetail)
    })
    if (!detail) continue
    /** 当前事实的规范文本。 */
    const normalizedDetail = normalizeHeading(detail).replace(/[。！？；，,:：\s]/g, '').toLocaleLowerCase('zh-CN')
    usedTitles.add(conclusionType.title)
    usedDetails.add(normalizedDetail)
    crossCuttingItems.push(`- **${conclusionType.title}**：${detail}`)
  }

  return crossCuttingItems
}

/**
 * 根据文章真实章节生成 4 到 6 条总结。
 * @param {string} markdown 当前文章。
 * @returns {string[]} 总结要点。
 */
function createSummaryItems(markdown) {
  /** 正文知识章节。 */
  const contentSections = getContentSections(markdown)
  /** 正文最浅标题层级，优先代表文章主决策路径。 */
  const shallowestDepth = Math.min(...contentSections.map((section) => section.depth), 4)
  /** 主章节优先，不足四项时再用更具体的子章节补齐。 */
  const orderedSections = [
    ...contentSections.filter((section) => section.depth === shallowestDepth),
    ...contentSections.filter((section) => section.depth !== shallowestDepth)
  ]
  /** 防止同名章节和空正文重复进入总结。 */
  const usedTitles = new Set()
  /** 已经进入总结的事实，避免父子章节重复同一句。 */
  const usedDetails = new Set()
  /** 最终总结要点。 */
  const summaryItems = []

  for (const section of orderedSections) {
    if (usedTitles.has(section.title)) continue
    /** 当前章节能够支撑标题的原文事实。 */
    const detail = getSectionSummaryDetail(markdown.slice(section.contentStart, section.end))
    if (!isUsefulSummaryDetail(section.title, detail, usedDetails)) continue
    usedTitles.add(section.title)
    usedDetails.add(normalizeHeading(detail).replace(/[。！？；，,:：\s]/g, '').toLocaleLowerCase('zh-CN'))
    summaryItems.push(`- **${section.title}**：${detail}`)
    if (summaryItems.length >= 6) break
  }

  /** 大段手写文章可能只用一个章节承载流程，此时用显式知识清单补足总结决策路径。 */
  if (summaryItems.length < 4) {
    for (const topic of getExplicitKnowledgeTopics(markdown)) {
      if (usedTitles.has(topic)) continue
      /** 当前核心主题在正文中的直接解释。 */
      const detail = getTopicSummaryDetail(markdown, topic)
      if (!isUsefulSummaryDetail(topic, detail, usedDetails)) continue
      usedTitles.add(topic)
      usedDetails.add(normalizeHeading(detail).replace(/[。！？；，,:：\s]/g, '').toLocaleLowerCase('zh-CN'))
      summaryItems.push(`- **${topic}**：${detail}`)
      if (summaryItems.length >= 6) break
    }
  }

  /** 章节不足四项时补充正文中的机制、边界和验证结论，不复制标题或写作元信息。 */
  if (summaryItems.length < 4) {
    for (const crossCuttingItem of getCrossCuttingSummaryItems(markdown, usedTitles, usedDetails)) {
      summaryItems.push(crossCuttingItem)
      if (summaryItems.length >= 6) break
    }
  }

  /** 旧短文的章节可能很少，最后从正文事实补足四条，不能回退到工作表或写作模板。 */
  if (summaryItems.length < 4) {
    for (const fact of extractVerifiableFacts(markdown)) {
      /** 当前事实用于重复判断的规范文本。 */
      const normalizedFact = normalizeHeading(fact).replace(/[。！？；，,:：\s]/g, '').toLocaleLowerCase('zh-CN')
      if (usedDetails.has(normalizedFact) || !EXPLANATION_SIGNAL_PATTERN.test(fact)) continue
      /** 有明确“对象：结论”结构时使用对象名，否则使用稳定的补充结论序号。 */
      const factTopic = fact.match(/^([^：:]{2,30})[：:]/)?.[1]?.trim() || `补充结论 ${summaryItems.length + 1}`
      if (usedTitles.has(factTopic)) continue
      usedTitles.add(factTopic)
      usedDetails.add(normalizedFact)
      summaryItems.push(`- **${factTopic}**：${fact}`)
      if (summaryItems.length >= 6) break
    }
  }

  return summaryItems
}

/**
 * 判断现有总结是否过短、空泛或沿用批量模板。
 * @param {string} summaryMarkdown 总结章节正文。
 * @returns {boolean} 是否需要重写。
 */
function isWeakSummary(summaryMarkdown) {
  /** 总结中的有效列表项。 */
  const summaryBullets = summaryMarkdown.match(/^\s*[-*+]\s+\S.+$/gm) || []
  /** 总结中的有效列表项数量。 */
  const bulletCount = summaryBullets.length
  /** 总结中的“主题：主题”空转项。 */
  const tautologyCount = [...summaryMarkdown.matchAll(/^\s*[-*+]\s+\*\*([^*]+)\*\*[：:]\s*(.+)$/gm)]
    .filter((match) => {
      /** 当前总结主题的规范文本。 */
      const normalizedTopic = normalizeHeading(match[1]).replace(/\s+/g, '').toLocaleLowerCase('zh-CN')
      /** 当前总结事实的规范文本。 */
      const normalizedDetail = normalizeHeading(match[2]).replace(/[。！？；，,:：\s]/g, '').toLocaleLowerCase('zh-CN')
      return normalizedTopic === normalizedDetail
    }).length
  /** 总结条目标题。 */
  const summaryTopics = summaryBullets.map((summaryBullet) => normalizeHeading(summaryBullet.match(/^\s*[-*+]\s+(?:\*\*)?([^*：:]+)(?:\*\*)?[：:]/)?.[1] || ''))
  /** 过短条目无法恢复正文结论。 */
  const hasShallowBullet = summaryBullets.some((summaryBullet) => summaryBullet.replace(/[`*~]/g, '').replace(/^\s*[-*+]\s+/, '').trim().length < 12)
  /** 导航、实验名和文件名不是总结主题。 */
  const hasAuxiliaryBullet = summaryTopics.some((summaryTopic) => META_HEADING_PATTERN.test(summaryTopic) || AUXILIARY_HEADING_PATTERN.test(summaryTopic))
  /** 完全重复的条目没有新增信息。 */
  const normalizedBullets = summaryBullets.map((summaryBullet) => normalizeDetail(summaryBullet).replace(/\s+/g, '').toLocaleLowerCase('zh-CN'))
  /** 总结去重后的条目数量。 */
  const uniqueBulletCount = new Set(normalizedBullets).size
  return bulletCount < 4 || bulletCount > 8 || tautologyCount > 0 || hasShallowBullet || hasAuxiliaryBullet || uniqueBulletCount !== bulletCount || GENERIC_SUMMARY_PATTERN.test(summaryMarkdown)
}

/**
 * 删除所有旧总结章节，后续统一插入到参考资料之前。
 * @param {string} markdown 当前文章。
 * @returns {{markdown: string, summaries: string[]}} 无总结正文与旧总结内容。
 */
function removeSummarySections(markdown) {
  /** 当前文章全部标题章节。 */
  const headingSections = getHeadingSections(markdown)
  /** 等待删除的总结范围。 */
  const summarySections = headingSections.filter((section) => /^(?:总结|小结)$/.test(section.title))
  /** 从后向前删除，保持前面章节字符位置稳定。 */
  let markdownWithoutSummaries = markdown
  for (const section of [...summarySections].sort((leftSection, rightSection) => rightSection.start - leftSection.start)) {
    /** 参考资料即使标题更深，也不属于总结正文，必须保留。 */
    const followingReference = headingSections.find(
      (candidateSection) => candidateSection.start > section.start && REFERENCE_HEADING_PATTERN.test(candidateSection.title)
    )
    /** 总结删除范围在参考资料前强制截断。 */
    const summaryEnd = Math.min(section.end, followingReference?.start || markdown.length)
    markdownWithoutSummaries = markdownWithoutSummaries.slice(0, section.start) + markdownWithoutSummaries.slice(summaryEnd)
  }

  return {
    markdown: markdownWithoutSummaries.replace(/\n{4,}/g, '\n\n\n').trimEnd(),
    summaries: summarySections.map((section) => {
      /** 现有总结同样不能把更深层参考资料算入质量判断。 */
      const followingReference = headingSections.find(
        (candidateSection) => candidateSection.start > section.start && REFERENCE_HEADING_PATTERN.test(candidateSection.title)
      )
      return markdown.slice(section.contentStart, Math.min(section.end, followingReference?.start || markdown.length)).trim()
    })
  }
}

/**
 * 根据源码语法信号推断无标签围栏的展示语言，无法确定时使用 text。
 * @param {string} source 围栏内源码。
 * @returns {string} Markdown 围栏语言。
 */
function inferCodeLanguage(source) {
  /** 去掉首尾空白后的代码用于稳定匹配。 */
  const normalizedSource = source.trim()
  if (/^(?:\{|\[)[\s\S]*(?:\}|\])$/.test(normalizedSource)) return 'json'
  if (/^(?:<\?xml|<!doctype\s+html|<[A-Za-z][^>]*>)/i.test(normalizedSource)) return 'html'
  if (/^(?:package\s+[\w.]+;|import\s+java\.|public\s+(?:class|interface|record)|@(?:RestController|Service|Configuration))/m.test(normalizedSource)) return 'java'
  if (/^(?:from\s+\S+\s+import|import\s+\S+|def\s+\w+|class\s+\w+|print\()/m.test(normalizedSource)) return 'python'
  if (/^(?:import|export)\s+|\b(?:const|let|var)\s+\w+|(?:async\s+)?function\s+\w+|console\.(?:log|error)\(/m.test(normalizedSource)) return 'typescript'
  if (/^(?:apiVersion|kind|services|name|version|image|stages|jobs|on):\s*/m.test(normalizedSource)) return 'yaml'
  if (/^(?:SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE|ALTER\s+TABLE|EXPLAIN)\b/im.test(normalizedSource)) return 'sql'
  if (/^(?:npm|pnpm|yarn|git|curl|docker|kubectl|mvn|gradle|python|java|cd|mkdir|export)\s/m.test(normalizedSource)) return 'bash'
  if (/^[.#]?[\w-]+(?:\s+[.#]?[\w-]+)*\s*\{[\s\S]*:[^;]+;/m.test(normalizedSource)) return 'css'
  return 'text'
}

/**
 * 为缺失语言的代码围栏补充高亮标记，不改动源码内容。
 * @param {string} markdown 当前文章。
 * @returns {string} 代码围栏标记完整的文章。
 */
function ensureCodeFenceLanguages(markdown) {
  /** 按行维护围栏状态，结束围栏绝不能被误判成下一段开始。 */
  const markdownLines = markdown.split('\n')
  /** 当前是否位于代码围栏内部。 */
  let insideFence = false
  /** 当前围栏使用的标记，支持反引号和波浪线。 */
  let activeFenceMarker = ''

  for (let lineIndex = 0; lineIndex < markdownLines.length; lineIndex += 1) {
    /** 当前行是否为代码围栏。 */
    const fenceMatch = markdownLines[lineIndex].match(/^(```|~~~)(.*)$/)
    if (!fenceMatch) continue

    if (insideFence) {
      if (fenceMatch[1] === activeFenceMarker) {
        insideFence = false
        activeFenceMarker = ''
      }
      continue
    }

    insideFence = true
    activeFenceMarker = fenceMatch[1]
    if (fenceMatch[2].trim()) continue

    /** 下一个同标记围栏之前的源码用于语言推断。 */
    const closingFenceIndex = markdownLines.findIndex(
      (candidateLine, candidateIndex) => candidateIndex > lineIndex && candidateLine.trim() === activeFenceMarker
    )
    /** 围栏缺失时只标为 text，不尝试跨章节读取。 */
    const sourceEndIndex = closingFenceIndex >= 0 ? closingFenceIndex : lineIndex + 1
    /** 当前围栏中的源码。 */
    const source = markdownLines.slice(lineIndex + 1, sourceEndIndex).join('\n')
    markdownLines[lineIndex] = `${activeFenceMarker}${inferCodeLanguage(source)}`
  }

  return markdownLines.join('\n')
}

/**
 * 补齐或重写最后一个正文“总结”，参考资料继续保留在其后。
 * @param {string} markdown 当前文章。
 * @returns {string} 总结位置与内容合规的文章。
 */
function ensureSummary(markdown) {
  /** 旧总结及删除总结后的正文。 */
  const summaryRemoval = removeSummarySections(markdown)
  /** 现有总结全部合并后用于判断是否值得保留。 */
  const existingSummary = summaryRemoval.summaries.join('\n')
  /** 当前文章按真实章节生成的总结要点。 */
  const generatedSummaryItems = createSummaryItems(summaryRemoval.markdown)
  /** 旧总结合格时保留原作者内容，否则使用正文事实重建。 */
  const summaryBody = existingSummary && !isWeakSummary(existingSummary)
    ? existingSummary
    : generatedSummaryItems.join('\n')
  if (!summaryBody) return markdown

  /** 删除总结后重新解析，定位首个参考资料章节。 */
  const remainingHeadings = getHeadingSections(summaryRemoval.markdown)
  /** 正文最浅层级用于保持文章当前标题风格。 */
  const bodyHeadingDepth = Math.min(...remainingHeadings.slice(1).map((section) => section.depth), 2)
  /** 总结标题与当前正文保持同级。 */
  const summarySection = `${'#'.repeat(bodyHeadingDepth)} 总结\n\n${summaryBody}`
  /** 参考资料是唯一允许位于总结后的章节。 */
  const referenceSection = remainingHeadings.find((section) => REFERENCE_HEADING_PATTERN.test(section.title))
  if (!referenceSection) return `${summaryRemoval.markdown}\n\n${summarySection}\n`

  return `${summaryRemoval.markdown.slice(0, referenceSection.start).trimEnd()}\n\n${summarySection}\n\n${summaryRemoval.markdown.slice(referenceSection.start).trimStart()}`
}

/**
 * 从真实章节为缺失或空泛目标生成可核验学习结果。
 * @param {string} markdown 当前文章。
 * @param {string} articlePath 当前文章相对路径。
 * @returns {string} 学习目标合规的文章。
 */
function ensureLearningGoal(markdown, articlePath, crossArticleTemplateFacts) {
  /** 参考资料不包装成课程任务；历史自动目标无条件移除，避免表头或单条命令被当成学习产出。 */
  if (REFERENCE_ARTICLE_PATH_PATTERN.test(articlePath)) {
    return markdown.replace(/^(#\s+.+)\n\n?>\s*(?:读完|学完)[^\n]*(?:\n(?:^>.*$))*\n?/m, '$1\n\n')
  }
  /** 当前文章是否需要替换旧批量目标。 */
  const hasGenericGoal = GENERIC_GOAL_PATTERN.test(markdown)
    || LEGACY_GENERATED_GOAL_PATTERN.test(markdown)
    || PROFILE_GENERATED_GOAL_PATTERN.test(markdown)
    || NAVIGATION_GENERATED_GOAL_PATTERN.test(markdown)
    || FACT_QUOTE_GENERATED_GOAL_PATTERN.test(markdown)
    || EVIDENCE_TEMPLATE_GENERATED_GOAL_PATTERN.test(markdown)
    || WEAK_SECTION_GENERATED_GOAL_PATTERN.test(markdown)
    || SECTION_GOAL_V1_PATTERN.test(markdown)
    || /^>.*(?:要回答的)?问题\s*\|\s*失败信号/m.test(markdown)
  /** 空学习目标标题不能冒充真实学习产出。 */
  const withoutEmptyGoalHeading = markdown.replace(/^#{1,6}\s+学习目标\s*\n(?=\s*(?:#{1,6}\s|$))/gm, '')
  /** 合格目标必须有 2～4 项，且每项同时包含执行动作和可检查证据。 */
  const hasSpecificGoal = hasSpecificLearningOutcome(withoutEmptyGoalHeading)
  if (hasSpecificGoal && !hasGenericGoal) return withoutEmptyGoalHeading

  /** 删除标题后已有的一行或多行目标引用，防止新旧目标并存。 */
  const withoutLegacyGoal = withoutEmptyGoalHeading.replace(
    /^(#\s+.+)\n\n?>\s*(?:读完|学完)[^\n]*(?:\n(?:^>.*$))*\n?/m,
    '$1\n'
  )
  /** 当前文章全部事实，专属事实不足时才回退到跨主题共享原则。 */
  const allOutcomeFacts = extractVerifiableFacts(withoutLegacyGoal)
  /** 未跨五篇文章复用的专属事实优先成为学习产出。 */
  const specificOutcomeFacts = allOutcomeFacts
    .filter((fact) => !crossArticleTemplateFacts.has(getFactComparisonKey(fact)))
  /** 保持原文顺序的共享事实只用于补足三条学习任务。 */
  const sharedOutcomeFacts = allOutcomeFacts
    .filter((fact) => crossArticleTemplateFacts.has(getFactComparisonKey(fact)))
  /** 专属事实优先，其次按定义、因果、取舍和边界信号排序，最后才使用普通事实。 */
  const fallbackFacts = [...specificOutcomeFacts, ...sharedOutcomeFacts]
    .filter((fact) => !NAVIGATION_FACT_PATTERN.test(fact))
    .map((fact, index) => ({ fact, index, score: EXPLANATION_SIGNAL_PATTERN.test(fact) ? 1 : 0 }))
    .sort((leftFact, rightFact) => rightFact.score - leftFact.score || leftFact.index - rightFact.index)
    .map((rankedFact) => rankedFact.fact)
  /** 已选择的章节事实，父子章节引用同一句时只保留更先出现的一项。 */
  const selectedSectionFactKeys = new Set()
  /** 正文知识章节比散文段落更能稳定表示本篇的核心决策与落地步骤。 */
  const sectionOutcomes = getContentSections(withoutLegacyGoal)
    .map((section) => ({ topic: section.title, detail: getSectionSummaryDetail(withoutLegacyGoal.slice(section.contentStart, section.end)) }))
    .filter((sectionOutcome) => sectionOutcome.topic && sectionOutcome.detail && !NAVIGATION_FACT_PATTERN.test(sectionOutcome.detail))
    .filter((sectionOutcome) => {
      /** 当前章节事实的稳定语义键。 */
      const sectionFactKey = getFactComparisonKey(sectionOutcome.detail)
      if (selectedSectionFactKeys.has(sectionFactKey)) return false
      selectedSectionFactKeys.add(sectionFactKey)
      return true
    })
  /** 已被章节结论使用的事实，防止回退项重复同一句话。 */
  const usedOutcomeFactKeys = new Set(sectionOutcomes.map((sectionOutcome) => getFactComparisonKey(sectionOutcome.detail)))
  /** 章节不足三项时才补充正文事实，并用“补充结论”明确其角色。 */
  const fallbackOutcomes = fallbackFacts
    .filter((fact) => !usedOutcomeFactKeys.has(getFactComparisonKey(fact)))
    .map((fact, index) => ({ topic: `补充结论 ${index + 1}`, detail: fact }))
  /** 最终三项任务分别覆盖解释、异常验证与最小落地。 */
  const learningOutcomes = [...sectionOutcomes, ...fallbackOutcomes].slice(0, 3)
  if (learningOutcomes.length < 3) return withoutLegacyGoal
  /** 学习目标绑定当前文章，防止共享工程原则脱离主题后变成批量套句。 */
  const articleTitle = withoutLegacyGoal.match(/^#\s+(.+)$/m)?.[1]?.trim() || articlePath
  /** 每项都包含本文条件、动作、产物和验收证据。 */
  const learningOutcomeBlock = [
    '> 读完后，你应能完成以下任务：',
    `> - 绘制“${articleTitle} / ${learningOutcomes[0].topic}”的关键对象与数据流，解释“${learningOutcomes[0].detail}”，并用源码位置、日志或 Trace 标注证据。`,
    `> - 为“${articleTitle} / ${learningOutcomes[1].topic}”设计正常与异常输入，验证“${learningOutcomes[1].detail}”，输出首个偏差位置与回归测试结果。`,
    `> - 实现“${articleTitle} / ${learningOutcomes[2].topic}”的最小代码或配置，检验“${learningOutcomes[2].detail}”，输出命令、结果与 Diff，并说明不适用边界。`
  ].join('\n')
  /** 学习产出紧跟首个 H1，便于页面和审计稳定提取。 */
  const titleMatch = withoutLegacyGoal.match(/^#\s+.+$/m)
  if (!titleMatch || typeof titleMatch.index !== 'number') return withoutLegacyGoal
  const titleEnd = titleMatch.index + titleMatch[0].length
  return `${withoutLegacyGoal.slice(0, titleEnd)}\n\n${learningOutcomeBlock}${withoutLegacyGoal.slice(titleEnd).replace(/^\s*/, '\n\n')}`
}

/**
 * 把 Markdown 行规范成跨文章模板比较键，源码、结构、表格和来源不参与比较。
 * @param {string} markdownLine 当前 Markdown 行。
 * @param {boolean} insideCodeFence 当前是否处于代码围栏。
 * @returns {string} 可比较正文；空字符串表示忽略。
 */
function normalizeReusableProseLine(markdownLine, insideCodeFence) {
  if (insideCodeFence) return ''
  /** 去除强调标记和多余空白后的正文。 */
  const normalizedLine = markdownLine.replace(/[`*~]/g, '').replace(/\s+/g, ' ').trim()
  if (
    normalizedLine.length < 28
    || /^(?:#{1,6}\s|\||<!--|>\s*读完|参考资料)/.test(normalizedLine)
    || /https?:\/\//.test(normalizedLine)
  ) return ''
  return normalizedLine
}

/**
 * 找出跨超过五篇文章复用的正文行，作为批量模板污染清理。
 * @param {string[]} articleFiles 全部正式文章文件。
 * @returns {Set<string>} 应从正文删除的规范行。
 */
function findCrossArticleTemplateLines(articleFiles) {
  /** 正文行到文章集合的映射。 */
  const articlePathsByLine = new Map()
  for (const articleFile of articleFiles) {
    /** 自动工作表每轮都会重建，不参与原始模板识别。 */
    const markdown = removeOperationalWorkbook(fs.readFileSync(articleFile, 'utf8'))
    /** 当前是否位于代码围栏。 */
    let insideCodeFence = false
    /** 当前文章的唯一正文行。 */
    const articleLines = new Set()
    for (const markdownLine of markdown.split('\n')) {
      if (/^\s*(?:```|~~~)/.test(markdownLine)) {
        insideCodeFence = !insideCodeFence
        continue
      }
      /** 当前规范正文行。 */
      const normalizedLine = normalizeReusableProseLine(markdownLine, insideCodeFence)
      if (normalizedLine) articleLines.add(normalizedLine)
    }
    for (const articleLine of articleLines) {
      /** 已包含当前正文行的文章路径集合。 */
      const articlePaths = articlePathsByLine.get(articleLine) || new Set()
      articlePaths.add(articleFile)
      articlePathsByLine.set(articleLine, articlePaths)
    }
  }
  return new Set(
    [...articlePathsByLine]
      .filter(([, articlePaths]) => articlePaths.size > 5)
      .map(([articleLine]) => articleLine)
  )
}

/**
 * 删除已确认跨文章复制的正文行，保留源码、标题、表格和来源。
 * @param {string} markdown 当前文章。
 * @param {Set<string>} templateLines 全库模板正文比较键。
 * @returns {string} 不含跨文章模板正文的 Markdown。
 */
function removeCrossArticleTemplateLines(markdown, templateLines) {
  /** 当前是否位于代码围栏。 */
  let insideCodeFence = false
  /** 清理模板后的 Markdown 行。 */
  const retainedLines = []
  for (const markdownLine of markdown.split('\n')) {
    if (/^\s*(?:```|~~~)/.test(markdownLine)) {
      insideCodeFence = !insideCodeFence
      retainedLines.push(markdownLine)
      continue
    }
    /** 当前正文用于查找模板集合的规范键。 */
    const normalizedLine = normalizeReusableProseLine(markdownLine, insideCodeFence)
    if (normalizedLine && templateLines.has(normalizedLine)) continue
    retainedLines.push(markdownLine)
  }
  return retainedLines.join('\n').replace(/\n{4,}/g, '\n\n\n')
}

/**
 * 根据原文事实选择可复核的证据与失败处理方式。
 * @param {string} fact 原文中的知识结论。
 * @param {string} articlePath 当前文章相对路径。
 * @returns {{input: string, action: string, evidence: string, pass: string, failure: string, response: string}} 工程验收字段。
 */
function getVerificationProfile(fact, articlePath) {
  if (/\/01-React-源码\//.test(articlePath)) {
    return {
      input: '固定 React 版本、组件输入、更新触发方式和浏览器事件',
      action: '在对应源码入口设置断点，记录 Fiber、Lane、UpdateQueue 与提交阶段变化',
      evidence: '调用栈、Fiber 字段快照、Scheduler 任务、DOM 断言和源码行号',
      pass: '调用顺序与正文一致，状态变化能对应到最终 DOM 或副作用',
      failure: '入口未命中、Lane 不符、更新丢失、重复提交或 DOM 结果不一致',
      response: '从首个错误状态回查 Update 入队、调度、协调和提交边界'
    }
  }
  if (/\/08-Code-Intelligence\//.test(articlePath)) {
    return {
      input: '固定仓库提交、目标文件、语言版本、构建配置和查询任务',
      action: '生成语法树与符号索引，执行定义、引用、调用或影响范围查询',
      evidence: '文件路径、行列范围、节点类型、符号标识、召回结果和仓库提交',
      pass: '每条结论都能回到当前提交的源码位置，跨文件关系可复查',
      failure: '解析错误、旧索引、符号歧义、生成文件污染或结果无法回链',
      response: '固定失败文件，检查解析器、构建信息、增量索引和版本绑定'
    }
  }
  if (/\/(?:03-富文本编辑器|05-Electron|02-Next\.js)\//.test(articlePath)) {
    return {
      input: '固定运行时版本、页面状态、用户操作、权限设置和持久化数据',
      action: '从用户事件回放渲染、进程通信或编辑器事务，覆盖成功与拒绝路径',
      evidence: 'DOM 断言、事件序列、事务步骤、IPC 记录、控制台和页面截图',
      pass: '界面状态与数据状态一致，越权输入在产生副作用前被拒绝',
      failure: '状态不同步、事件重复、事务丢失、IPC 越权或页面不可交互',
      response: '按事件、状态、渲染或进程边界定位第一处偏差并重放'
    }
  }
  if (/\/0[67]-(?:Java|Python)\//.test(articlePath) || /(?:Spring|FastAPI|HTTP|事务|DTO|pytest|JVM)/i.test(fact)) {
    return {
      input: '固定语言与依赖版本、请求参数、数据库初始状态和环境配置',
      action: '运行最小程序或接口测试，覆盖正常输入、边界值和异常传播',
      evidence: '退出码、响应状态、断言、数据库前后状态、异常栈和测试报告',
      pass: '输出满足契约，异常不会留下部分写入，结果可在干净环境复现',
      failure: '依赖漂移、参数未校验、异常被吞、事务未回滚或状态残留',
      response: '从入口参数、调用栈、事务边界和外部依赖逐层缩小根因'
    }
  }
  if (/\/(?:08-Mysql|09-Redis|10-Elasticsearch|11-Kafka|12-定时任务)\//.test(articlePath)) {
    return {
      input: '固定数据快照、并发条件、客户端配置、拓扑和故障注入点',
      action: '执行正常读写与故障场景，记录查询计划、锁、复制或消费状态',
      evidence: '执行计划、慢日志、锁等待、Offset、复制延迟、指标和数据校验',
      pass: '一致性与性能满足正文约束，故障恢复后没有丢失或重复副作用',
      failure: '计划退化、死锁、热点击穿、消息重复丢失或恢复后数据不一致',
      response: '从数据入口、存储状态、复制消费链路和恢复步骤定位根因'
    }
  }
  if (/\/(?:14-Playwright|15-Linux|16-Nginx|17-Docker|18-Kubernetes|19-CI-CD|20-可观测性|21-灰度发布与回滚)\//.test(articlePath)) {
    return {
      input: '固定制品、配置、运行环境、流量样本、权限和回滚条件',
      action: '执行部署或验收链路，并主动制造一次健康检查、网络或依赖失败',
      evidence: '命令退出码、事件、日志、指标、Trace、页面断言和制品摘要',
      pass: '成功路径达标，失败被及时阻断，恢复与回滚结果经过复测',
      failure: '环境漂移、探针失真、权限错误、发布扩大故障或回滚不可用',
      response: '停止扩量，按制品、配置、运行时和依赖顺序定位并恢复'
    }
  }
  if (/03-AI大模型应用开发\/01-LangChain\//.test(articlePath)) {
    return {
      input: 'Runnable 输入类型、Prompt 变量、依赖版本、模型替身和异常样本',
      action: '逐段 invoke 并记录 Retriever、Prompt、Model、Parser 的输入输出，再比较整链结果',
      evidence: '各 Runnable 的序列化输入输出、Trace、异常类型、预期断言和依赖版本',
      pass: '数据形状逐段匹配，错误停在首个失效边界，整链结果能由中间状态解释',
      failure: '字段到模型阶段才报错、Parser 吞掉原始输出、流式中断被当成完整成功',
      response: '隔离失败 Runnable，固定其输入单独重放，再恢复相邻节点契约测试'
    }
  }
  if (/03-AI大模型应用开发\/10-Agent\//.test(articlePath)) {
    return {
      input: '工具 Schema、调用身份、允许资源、畸形参数、超时、重复请求和最大步骤',
      action: '保存模型提议，经 Schema 与授权校验后执行工具，并回放拒绝、超时和恢复路径',
      evidence: '模型提议、参数校验、授权决定、幂等键、工具结果、状态迁移和 Trace',
      pass: '模型只提议，代码控制执行与停止；越权输入无副作用，重复请求不重复写入',
      failure: '路径或命令直通执行、工具结果跨会话泄漏、循环失控或重试重复副作用',
      response: '关闭副作用入口，核对最终业务状态，从首个错误授权或状态迁移恢复'
    }
  }
  if (/03-AI大模型应用开发\/(?:12-LangSmith-Langfuse|13-可观测性|14-生产工程)\//.test(articlePath)) {
    return {
      input: '版本化数据集、Trace Schema、质量基线、运行指标、成本预算和回退阈值',
      action: '同输入运行基线与候选，逐样本比较质量并关联线上延迟、错误与成本',
      evidence: '逐样本输出、评分理由、Trace、指标窗口、失败标签、版本和发布判断',
      pass: '目标切片改善且安全、延迟与成本不越界，失败样本能回链到首个异常阶段',
      failure: '只报告均分、数据泄漏、评审器未校准、Trace 断链或回退阈值缺失',
      response: '停止扩量，保留基线，按数据、Prompt、模型、应用或评审阶段隔离失败'
    }
  }
  if (/03-AI大模型应用开发\/06-RAG\//.test(articlePath)) {
    return {
      input: '标注查询集、原文与 chunk 快照、Embedding 和索引版本、权限身份',
      action: '依次回放解析、切分、召回、过滤、重排、上下文组装和引用生成',
      evidence: '原文位置、各路候选、分数、过滤前后 Diff、Recall@K、NDCG、引用和 Trace',
      pass: '正确证据可召回可回链，无答案时拒答，权限过滤不泄漏其他主体资料',
      failure: '解析丢内容、正确 chunk 未召回、过滤误删、重排掉出或引用不支持结论',
      response: '在最早丢失正确证据的阶段停止，固定该阶段输入单独修复并重放全链'
    }
  }
  if (/03-AI大模型应用开发\/(?:16-大模型基础|18-LoRA与微调)\//.test(articlePath) && /(?:预训练|SFT|RLHF|RLAIF|DPO|偏好|奖励模型|训练集|验证集)/i.test(fact)) {
    return {
      input: '固定基础模型、数据集版本、切分键、训练参数、随机种子、Rubric 和回退基线',
      action: '分别运行训练前基线与候选模型，在隔离测试集上比较能力、安全、延迟和成本',
      evidence: '数据哈希、切分报告、训练曲线、逐样本输出、偏好一致率、失败标签和模型版本',
      pass: '目标能力改善且通用能力与安全集不越过回退阈值，结果能追溯到数据和参数',
      failure: '训练测试泄漏、偏好标注只奖励长度、奖励投机、过拟合或基础能力明显回退',
      response: '停止发布并保留基础模型，按数据、Rubric、训练阶段和评测切片定位首个偏差'
    }
  }
  if (/03-AI大模型应用开发\/16-大模型基础\//.test(articlePath) && /(?:长上下文|Lost in the Middle|位置偏差|上下文窗口|Token 预算)/i.test(fact)) {
    return {
      input: '固定模型、上下文长度、证据位置、无关内容比例、问题集合和生成参数',
      action: '把同一证据放在开头、中间和结尾，逐档增加上下文并比较召回、答案与延迟',
      evidence: '位置分桶准确率、引用命中、输入 Token、TTFT、TPOT、截断位置和失败样本',
      pass: '关键证据在目标长度与位置分布下可稳定引用，延迟和成本保持在预算内',
      failure: '中间证据系统性漏读、静默截断、无关内容稀释答案或长输入导致容量失控',
      response: '缩小上下文并恢复基线，检查检索、排序、装配、截断和模型长度支持'
    }
  }
  if (/03-AI大模型应用开发\/16-大模型基础\//.test(articlePath) && /(?:多模态|OCR|ASR|TTS|图像|音频|语音)/i.test(fact)) {
    return {
      input: '固定原始媒体、编码格式、语言、噪声等级、模型版本、文本真值和授权范围',
      action: '分开回放媒体解析、OCR 或 ASR、文本理解、结果生成和 TTS，逐段替换为真值做对照',
      evidence: '解析状态、WER 或 CER、字段准确率、时间戳、引用位置、音频时长和端到端 Trace',
      pass: '每段误差可量化且不会被后续模型掩盖，隐私、延迟和成本满足场景边界',
      failure: '媒体解码失败、OCR 版面错序、ASR 专名错误、跨模态幻觉或 TTS 中断',
      response: '停在首个误差阶段，保留原始媒体与中间产物，单独修复后再重放端到端链路'
    }
  }
  if (/03-AI大模型应用开发\/16-大模型基础\//.test(articlePath)) {
    return {
      input: '固定模型、Tokenizer、消息序列、输入输出 Token 预算、参数和错误样本',
      action: '记录请求到流式完成的各阶段，比较正常、超限、认证失败、限流和中断路径',
      evidence: '最终消息、Token 统计、模型标识、状态码、结束原因、TTFT、TPOT 和原始响应',
      pass: '输入输出符合接口与上下文预算，异常可分类，密钥不落日志且中断不冒充成功',
      failure: '模型或 tokenizer 不匹配、静默截断、错误无限重试、流式半成品被提交',
      response: '按客户端、网关、应用、模型服务和解析边界定位首个偏差并保留原错误'
    }
  }
  if (/(?:AST|Tree-sitter|LSP|调用链|代码检索|Repo Map)/i.test(fact)) {
    return {
      input: '固定仓库提交、目标文件、语言版本、构建配置和查询任务',
      action: '生成语法树与符号索引，执行定义、引用、调用或影响范围查询',
      evidence: '文件路径、行列范围、节点类型、符号标识、召回结果和仓库提交',
      pass: '每条结论都能回到当前提交的源码位置，跨文件关系可复查',
      failure: '解析错误、旧索引、符号歧义、生成文件污染或结果无法回链',
      response: '固定失败文件，检查解析器、构建信息、增量索引和版本绑定'
    }
  }
  if (/(?:检索|召回|RAG|Chunk|分块|Embedding|向量|BM25|Rerank|Top-K|索引)/i.test(fact)) {
    return {
      input: '查询集、语料快照、权限身份、相关性标注',
      action: '离线回放检索，保存候选、过滤、排序和引用',
      evidence: 'Recall@K、NDCG、引用命中率、无答案误答率、Trace',
      pass: '证据可回链，指标达基线，权限过滤无泄漏',
      failure: '漏召回、排序丢失、引用断链或越权命中',
      response: '定位解析、召回、过滤、排序或生成阶段，回滚对应版本'
    }
  }
  if (/(?:权限|安全|注入|攻击|敏感|越权|白名单|确认|隔离|审计)/i.test(fact)) {
    return {
      input: '正常样本、越权身份、恶意参数、注入样本、写操作',
      action: '从入口、模型输出和执行层发起对抗测试',
      evidence: '鉴权、参数校验、确认记录、执行日志、审计事件',
      pass: '合法请求最小授权；非法请求在副作用前被拒绝',
      failure: 'Prompt 代替鉴权、越权执行或日志无法追责',
      response: '停用写能力，轮换凭据，把攻击样本加入回归集'
    }
  }
  if (/(?:延迟|吞吐|并发|Token|成本|缓存|限流|超时|SLO|性能|KV Cache)/i.test(fact)) {
    return {
      input: '固定请求集、Token 分布、并发梯度、模型和机器版本',
      action: '执行冷启动与稳态压测，拆分排队、Prefill、Decode',
      evidence: 'P95/P99、TTFT、tokens/s、错误率、缓存率、成本',
      pass: '质量不降，峰值并发仍满足延迟与成本预算',
      failure: '只看均值、耗时未分段或吞吐以正确率为代价',
      response: '调整上下文、批处理、缓存或路由，保留旧配置回滚'
    }
  }
  if (/(?:Tool|工具|Function Calling|Agent|工作流|节点|路由|状态|Reducer|ReAct|MCP)/i.test(fact)) {
    return {
      input: '工具 Schema、身份、畸形参数、超时和重复请求',
      action: '回放决策到执行链路，覆盖失败、重试、暂停和恢复',
      evidence: '模型提议、校验、授权、幂等键、状态迁移、Trace',
      pass: '模型只提议；执行受代码约束；失败不重复副作用',
      failure: '文本直通执行、状态不可重放或重试重复写入',
      response: '关闭副作用入口，恢复检查点，补充失败契约测试'
    }
  }
  if (/(?:训练|微调|SFT|RLHF|DPO|评测|标注|数据集|模型|Prompt|输出)/i.test(fact)) {
    return {
      input: '版本化数据集、切分规则、基线、Rubric、随机参数',
      action: '同输入比较基线与候选的能力、安全、延迟和成本',
      evidence: '逐样本输出、评分理由、置信区间、失败标签、版本',
      pass: '目标指标改善，通用能力与安全集不越过回退阈值',
      failure: '数据泄漏、只报均分、裁判未校准或样本不可追溯',
      response: '保留基线，隔离失败样本，定位数据、提示、模型或裁判'
    }
  }
  if (/(?:部署|发布|灰度|回滚|容器|Kubernetes|Docker|版本|迁移)/i.test(fact)) {
    return {
      input: '制品、配置、数据版本、健康检查、灰度与回滚条件',
      action: '按测试、影子、灰度、全量发布并执行兼容检查',
      evidence: '制品摘要、部署事件、错误率、业务指标、回滚记录',
      pass: '版本可追溯，灰度不劣于基线，回滚路径已验证',
      failure: '版本不明、配置漂移、健康检查失真或数据不兼容',
      response: '停止扩量，回滚制品与配置，数据采用前向修复'
    }
  }
  return {
    input: '固定样本、基线、候选、成功标准和失败边界',
    action: '同环境运行基线与候选，记录输入、中间状态和异常',
    evidence: '可重放命令、结构化日志、输出 Diff、失败样本、版本',
    pass: '结果符合结论条件，异常输入可解释、可恢复',
    failure: '条件缺失、结果不可复现或失败后责任不清',
    response: '保留基线，缩小变量；根因确认前不扩大范围'
  }
}

/**
 * 从正文提取可以独立复核的事实，拒绝用标题或元信息编造内容。
 * @param {string} markdown 当前文章。
 * @returns {string[]} 去重后的原文事实。
 */
function extractVerifiableFacts(markdown) {
  /** 排除目标、总结和参考资料后的知识正文。 */
  const knowledgeMarkdown = maskFencedCode(getKnowledgeProseMarkdown(markdown))
  /** 逐行和逐句抽取的候选事实。 */
  const factCandidates = knowledgeMarkdown
    .split('\n')
    .filter((markdownLine) => !markdownLine.includes('|'))
    .filter((markdownLine) => !/^\s*(?:#{1,6}\s+|<!--)/.test(markdownLine))
    .flatMap((markdownLine) => markdownLine.split(/(?<=[。！？；])\s*/).filter(Boolean))
    .map(normalizeDetail)
    .filter((fact) => fact.length >= 8 && fact.length <= 220 && !NAVIGATION_FACT_PATTERN.test(fact))
  /** 用去除标点后的文本识别同一事实。 */
  const usedFacts = new Set()
  /** 保持原文顺序的唯一事实。 */
  const uniqueFacts = []
  for (const fact of factCandidates) {
    /** 当前事实的稳定比较键。 */
    const factKey = getFactComparisonKey(fact)
    if (usedFacts.has(factKey)) continue
    usedFacts.add(factKey)
    uniqueFacts.push(fact)
  }
  return uniqueFacts
}

/**
 * 生成事实的稳定比较键，忽略 Markdown 标记、标签前缀、空白和标点。
 * @param {string} fact 当前事实句。
 * @returns {string} 可用于跨文章计数的事实键。
 */
function getFactComparisonKey(fact) {
  return fact
    .replace(/^[^：:]{1,30}[：:]\s*/, '')
    .replace(/[\s，。！？；、,:：`*~|]/g, '')
    .toLocaleLowerCase('zh-CN')
}

/**
 * 找出被不同标题包装但语义正文完全相同的高频事实。
 * @param {string[]} articleFiles 全部正式文章文件。
 * @param {Set<string>} templateLines 已确认的跨文章模板行。
 * @returns {Set<string>} 不得再生成学习目标或验证卡的事实键。
 */
function findCrossArticleTemplateFacts(articleFiles, templateLines) {
  /** 事实键到包含该事实的文章集合。 */
  const articlePathsByFact = new Map()
  for (const articleFile of articleFiles) {
    /** 先移除工作表与逐行模板，避免生成内容反向污染事实统计。 */
    const baseMarkdown = removeCrossArticleTemplateLines(
      removeOperationalWorkbook(fs.readFileSync(articleFile, 'utf8')),
      templateLines
    )
    /** 当前文章的唯一事实键。 */
    const articleFacts = new Set(extractVerifiableFacts(baseMarkdown).map(getFactComparisonKey))
    for (const articleFact of articleFacts) {
      /** 已包含当前事实的文章集合。 */
      const articlePaths = articlePathsByFact.get(articleFact) || new Set()
      articlePaths.add(articleFile)
      articlePathsByFact.set(articleFact, articlePaths)
    }
  }
  return new Set(
    [...articlePathsByFact]
      .filter(([fact, articlePaths]) => fact.length >= 8 && articlePaths.size > 5)
      .map(([fact]) => fact)
  )
}

/**
 * 删除旧批处理追加的工程工作表，保留前后原始正文、总结与参考资料。
 * @param {string} markdown 当前文章。
 * @returns {string} 不含自动工作表的文章。
 */
function removeOperationalWorkbook(markdown) {
  /** 先删除新版渐进式区块，保留区块之间的作者原文。 */
  const withoutProgressiveBlocks = markdown
    .replace(/<!-- article-progressive-block:start -->[\s\S]*?<!-- article-progressive-block:end -->\s*/g, '')
    .replace(/\n{4,}/g, '\n\n\n')
  /** 已有自动工作表的起点。 */
  const existingWorkbookStart = withoutProgressiveBlocks.indexOf(OPERATIONAL_WORKBOOK_MARKER)
  if (existingWorkbookStart < 0) return withoutProgressiveBlocks

  /** 工作表之后的总结或参考资料决定删除终点。 */
  const followingHeading = getHeadingSections(withoutProgressiveBlocks)
    .find((section) => section.start > existingWorkbookStart && (section.title === '总结' || REFERENCE_HEADING_PATTERN.test(section.title)))
  /** 没有尾部元信息时删除到文章结尾。 */
  const existingWorkbookEnd = followingHeading?.start ?? withoutProgressiveBlocks.length
  return `${withoutProgressiveBlocks.slice(0, existingWorkbookStart).trimEnd()}\n\n${withoutProgressiveBlocks.slice(existingWorkbookEnd).trimStart()}`
}

/**
 * 删除 170 篇 AI 编程文章中完全相同的通用骨架，保留主题事实、专属示例和来源。
 * @param {string} markdown 当前文章。
 * @returns {string} 不含旧批量模板的文章。
 */
function removeLegacyAiCodingTemplate(markdown) {
  /** 当前文章全部章节。 */
  const headingSections = getHeadingSections(markdown)
  /** 需要完整删除的通用章节。 */
  const templateSections = LEGACY_AI_CODING_TEMPLATE_PATTERN.test(markdown)
    ? headingSections.filter((section) => LEGACY_AI_CODING_SECTION_PATTERN.test(section.title))
    : []
  /** 从后向前移除，防止前方字符数变化影响后续位置。 */
  let cleanedMarkdown = markdown
  for (const section of [...templateSections].sort((leftSection, rightSection) => rightSection.start - leftSection.start)) {
    cleanedMarkdown = `${cleanedMarkdown.slice(0, section.start)}${cleanedMarkdown.slice(section.end)}`
  }
  /** 核心机制章节中的四列表头同样来自通用模板，专属判断条目继续保留。 */
  cleanedMarkdown = cleanedMarkdown.replace(
    /\| 环节 \| 要回答的问题 \| 失败信号 \|\n\|[- |]+\|\n(?:\|(?:[^\n]+)\|\n){4}/g,
    ''
  )
  /** 旧总结曾把模板章节压成单行列表；这些行没有文章专属知识，必须连同孤立表格边框删除。 */
  cleanedMarkdown = cleanedMarkdown
    .replace(/^\s*\|\s*$/gm, '')
    .replace(/^.*(?:环节\s*\|\s*)?(?:要回答的)?问题\s*\|\s*失败信号\s*\|?\s*$/gm, '')
    .replace(/^.*题\s*\|\s*失败信号\s*\|?\s*$/gm, '')
    .replace(/^\s*[-*+]\s+\*\*(?:落地流程：从约束到证据|常见故障与排查|验收清单)\*\*[：:].*$/gm, '')
    .replace(/^\s*[-*+]\s+\*\*最小实践：[^*]+\*\*[：:].*$/gm, '')
  return cleanedMarkdown.replace(/\n{4,}/g, '\n\n\n').trimEnd()
}

/**
 * 统计文章围栏代码之外的正文字符数。
 * @param {string} markdown 当前文章。
 * @returns {number} 去除 Markdown 空白后的正文字符数。
 */
function countArticleProseCharacters(markdown) {
  /** 围栏代码不参与判断文章是否已经有足够解释文字。 */
  const proseMarkdown = markdown.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '')
  return proseMarkdown.replace(/\s/g, '').length
}

/**
 * 为信息已经充足但物理行数不足的文章整理软换行。
 * @param {string} markdown 当前文章。
 * @returns {string} 不改变渲染语义、但便于逐句审查的 Markdown。
 */
function reflowSubstantiveArticle(markdown) {
  if (markdown.split('\n').length >= MIN_ARTICLE_LINE_COUNT) return markdown
  if (countArticleProseCharacters(markdown) < MIN_REFLOW_PROSE_CHARACTER_COUNT) return markdown

  /** 原始 Markdown 行。 */
  const markdownLines = markdown.split('\n')
  /** 整理后的 Markdown 行。 */
  const reflowedLines = []
  /** 当前是否位于围栏代码内。 */
  let insideFence = false
  /** 当前围栏标记。 */
  let activeFenceMarker = ''

  for (const markdownLine of markdownLines) {
    /** 当前行可能是围栏起止标记。 */
    const fenceMatch = markdownLine.match(/^(```|~~~)/)
    if (fenceMatch) {
      if (insideFence && fenceMatch[1] === activeFenceMarker) {
        insideFence = false
        activeFenceMarker = ''
      } else if (!insideFence) {
        insideFence = true
        activeFenceMarker = fenceMatch[1]
      }
      reflowedLines.push(markdownLine)
      continue
    }

    /** 标题、列表、表格、引用和源码保持原结构，只整理普通长段落。 */
    const isStructuralLine = insideFence || /^\s*(?:$|#{1,6}\s|[-*+]\s|\d+[.)、]\s|>|\||<!--)/.test(markdownLine)
    if (isStructuralLine || markdownLine.length < 36) {
      reflowedLines.push(markdownLine)
      continue
    }

    /** 句号和分号优先形成独立审查行，逗号只用于继续拆分过长复句。 */
    const sentenceLines = markdownLine.match(/[^。！？；;]+[。！？；;]?/g) || [markdownLine]
    for (const sentenceLine of sentenceLines) {
      /** 过长句按逗号边界换行；Markdown 软换行不会改变页面段落语义。 */
      const clauseLines = sentenceLine.length >= 48
        ? sentenceLine.match(/[^，,]+[，,]?/g) || [sentenceLine]
        : [sentenceLine]
      reflowedLines.push(...clauseLines.map((clauseLine) => clauseLine.trim()).filter(Boolean))
    }
  }

  return reflowedLines.join('\n')
}

/**
 * 为短文章生成基于原文事实的工程验收工作表。
 * @param {string} markdown 当前文章。
 * @param {string} articlePath 当前文章相对路径。
 * @returns {string} 达到最低篇幅且包含实证步骤的文章。
 */
function ensureOperationalWorkbook(markdown, articlePath, crossArticleTemplateFacts) {
  /** 每次先移除旧工作表，确保模板改进能够覆盖历史生成结果。 */
  const baseMarkdown = removeOperationalWorkbook(markdown)
  /** 移除旧工作表后的物理行数。 */
  const currentLineCount = baseMarkdown.split('\n').length
  if (currentLineCount >= MIN_ARTICLE_LINE_COUNT) return baseMarkdown

  /** 工作表只能使用正文已经明确陈述的事实。 */
  /** 全部原文事实按专属优先排序，共享原则只在专属内容不足时补位。 */
  const allFacts = extractVerifiableFacts(baseMarkdown)
  /** 当前文章专属事实。 */
  const specificFacts = allFacts.filter((fact) => !crossArticleTemplateFacts.has(getFactComparisonKey(fact)))
  /** 与相关专题共享但仍适用于当前文章的工程原则。 */
  const sharedFacts = allFacts.filter((fact) => crossArticleTemplateFacts.has(getFactComparisonKey(fact)))
  /** 工作表事实保持专属优先顺序。 */
  const facts = [...specificFacts, ...sharedFacts]
  if (facts.length < 3) return baseMarkdown
  /** 原文事实用于生成逐条可证伪的验证任务。 */
  const selectedFacts = facts.slice(0, 12)
  /** 文章完整标题用于生成不脱离主题的章节名。 */
  const articleTitle = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || '当前方案'
  /** 破折号后的课程主题比系列课号更适合作为正文主语。 */
  const articleTopic = articleTitle.split(/\s+-\s+/).slice(1).join(' - ') || articleTitle
  /** 领域画像只由标题和目录决定，避免正文中的横切术语把整篇文章带到错误实验。 */
  const primaryProfile = getVerificationProfile(articleTitle, articlePath)
  /** 正常、边界和恢复必须验证同一个主题，禁止在同篇文章拼接无关实验。 */
  const boundaryProfile = primaryProfile
  /** 叙述句已经包含“固定”动作，输入文本移除重复动词。 */
  const primaryInputDescription = primaryProfile.input.replace(/^固定\s*/, '')
  /** 作者原始主章节决定阅读顺序，自动补强不能另造一套平行知识目录。 */
  const originalContentSections = getContentSections(baseMarkdown)
  /** 原文最浅章节代表作者设计的主叙事。 */
  const originalChapterDepth = Math.min(...originalContentSections.map((section) => section.depth), 4)
  /** 每个主章节提取一条原文结论，用于路线图和逐章验证。 */
  const chapterInsights = originalContentSections
    .filter((section) => section.depth === originalChapterDepth)
    .map((section) => ({
      title: section.title,
      detail: getSectionSummaryDetail(baseMarkdown.slice(section.contentStart, section.end))
    }))
    .filter((sectionInsight) => sectionInsight.detail)
    .slice(0, 6)
  /** 主章节不足时用核心知识清单补齐，但结论仍必须来自原文。 */
  const usedInsightTitles = new Set(chapterInsights.map((sectionInsight) => sectionInsight.title))
  for (const knowledgeTopic of getExplicitKnowledgeTopics(baseMarkdown)) {
    if (chapterInsights.length >= 6 || usedInsightTitles.has(knowledgeTopic)) continue
    /** 当前知识主题在正文中的直接解释。 */
    const topicDetail = getTopicSummaryDetail(baseMarkdown, knowledgeTopic)
    if (!topicDetail) continue
    usedInsightTitles.add(knowledgeTopic)
    chapterInsights.push({ title: knowledgeTopic, detail: topicDetail })
  }
  /** 已进入路线图的结论不能因标题不同被再次包装。 */
  const usedInsightFactKeys = new Set(chapterInsights.map((sectionInsight) => getFactComparisonKey(sectionInsight.detail)))
  for (const selectedFact of selectedFacts) {
    if (chapterInsights.length >= 6 || usedInsightFactKeys.has(getFactComparisonKey(selectedFact))) continue
    /** 优先取原文“对象：结论”的对象名，否则用首个完整分句作为可辨识标题。 */
    const insightTitle = selectedFact.match(/^([^：:]{2,32})[：:]/)?.[1]?.trim()
      || selectedFact.split(/[，,。；;]/)[0].trim().slice(0, 32)
    if (insightTitle.length < 2 || usedInsightTitles.has(insightTitle)) continue
    usedInsightTitles.add(insightTitle)
    usedInsightFactKeys.add(getFactComparisonKey(selectedFact))
    chapterInsights.push({ title: insightTitle, detail: selectedFact })
  }
  /** 阅读路线逐章展示“先学什么”和原文给出的结论。 */
  const roadmapRows = chapterInsights.map(
    (sectionInsight, sectionIndex) => `| ${sectionIndex + 1} | ${sectionInsight.title.replace(/\|/g, '\\|')} | ${sectionInsight.detail.replace(/\|/g, '\\|')} |`
  )
  /** 数据流只连接作者章节，不再使用跨文章相同的占位节点。 */
  const roadmapDiagram = chapterInsights.slice(0, 5).map(
    (sectionInsight, sectionIndex) => `  S${sectionIndex + 1}["${sectionInsight.title.replace(/"/g, "'")}"]${sectionIndex < Math.min(chapterInsights.length, 5) - 1 ? ` --> S${sectionIndex + 2}` : ''}`
  )
  /** 一张矩阵把原文结论映射到唯一变量，避免为每条结论复制完整实验协议。 */
  const verificationRows = chapterInsights.map((sectionInsight) =>
    `| ${sectionInsight.title.replace(/\|/g, '\\|')} | ${sectionInsight.detail.replace(/\|/g, '\\|')} | 只改变与“${sectionInsight.title.replace(/\|/g, '\\|')}”相关的条件 | ${primaryProfile.evidence} |`
  )
  /** 结果解释表只保留主链路和异常链路，不再逐知识点重复相同字段。 */
  const interpretationRows = [
    `| 主链路没有达到预期 | ${primaryProfile.failure} | 先执行：${primaryProfile.response} |`,
    `| 异常链路无法恢复 | ${boundaryProfile.failure} | 先执行：${boundaryProfile.response} |`,
    `| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |`,
    `| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |`
  ]
  /** 开场补强先连接标题对象和作者章节，再给失败现象。 */
  const introductionBlock = [
    PROGRESSIVE_BLOCK_START,
    `# 先建立全局：${articleTopic} 是什么？`,
    '',
    `理解“${articleTopic}”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。`,
    '',
    `“${articleTopic}”的第一个核心判断是：${chapterInsights[0]?.detail || selectedFacts[0]}。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。`,
    '',
    '| 顺序 | 章节 | 读完本节应抓住的结论 |',
    '| --- | --- | --- |',
    roadmapRows.join('\n'),
    '',
    `## 1.1 核心对象之间怎样衔接`,
    '',
    '```mermaid',
    'flowchart LR',
    roadmapDiagram.join('\n'),
    '```',
    '',
    `这张图只表达本文的讲解顺序，不替代正文机制。判断“${articleTopic}”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。`,
    '',
    `## 1.2 再看失败：问题最早会出现在哪一步？`,
    '',
    `在“${articleTopic}”的对象和顺序已经明确后，再看可观察的失败：${primaryProfile.failure}。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。`,
    PROGRESSIVE_BLOCK_END
  ].join('\n')
  /** 收尾补强只处理实践、失败和发布判断，放在作者核心章节之后。 */
  const practiceBlock = [
    PROGRESSIVE_BLOCK_START,
    `# 动手验证：先跑通 ${articleTopic}，再改变一个变量`,
    '',
    `前面的章节已经建立问题、概念和机制。现在把“${articleTopic}”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。`,
    '',
    '## 基线与候选只允许一个变量不同',
    '',
    `验证“${articleTopic}”时，先固定${primaryInputDescription}。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。`,
    '',
    `执行“${articleTopic}”时，动作是：${primaryProfile.action}。原始结果不能只保留截图或汇总分数，必须同步保存：${primaryProfile.evidence}，使下一次复查可以在同一输入上重放。`,
    '',
    '| 实验要素 | 本文要求 |',
    '| --- | --- |',
    `| 固定条件 | ${primaryProfile.input} |`,
    '| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |',
    `| 原始证据 | ${primaryProfile.evidence} |`,
    `| 通过阈值 | ${primaryProfile.pass} |`,
    `| 立即停止 | ${primaryProfile.failure} |`,
    '',
    '## 执行前先排除不可比较条件',
    '',
    `“${articleTopic}”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。`,
    '',
    `- 基线能够在“${articleTopic}”的当前环境重复运行。`,
    `- 候选只改变一个与“${articleTopic}”结论直接相关的条件。`,
    `- “${articleTopic}”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。`,
    `- “${articleTopic}”的原始输出和失败现场不会被重试、格式化或汇总覆盖。`,
    '',
    '## 执行后先核对证据完整性',
    '',
    `结果出来后先检查证据，再讨论“${articleTopic}”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。`,
    '',
    '| 检查项 | 当前文章的判定 |',
    '| --- | --- |',
    `| 输入可追溯 | ${primaryProfile.input} |`,
    `| 过程可回放 | ${primaryProfile.action} |`,
    `| 结果可审计 | ${primaryProfile.evidence} |`,
    '',
    `“${articleTopic}”的一次合格基线对照按以下顺序执行：`,
    '',
    `1. 保存“${articleTopic}”基线版本及输入摘要，确认基线本身可以重复运行。`,
    `2. 写下“${articleTopic}”候选方案唯一变化的变量，以及它预期影响的指标。`,
    `3. 在同一环境执行“${articleTopic}”：${primaryProfile.action}。`,
    `4. 为“${articleTopic}”保存：${primaryProfile.evidence}。`,
    `5. 使用“${articleTopic}”预登记条件判断：${primaryProfile.pass}。`,
    `6. 如果“${articleTopic}”未通过，不修改第二个变量，先恢复基线并保留失败现场。`,
    '',
    `# 用一张矩阵验证 ${articleTopic} 的关键结论`,
    '',
    `矩阵按正文顺序列出“${articleTopic}”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。`,
    '',
    '| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |',
    '| --- | --- | --- | --- |',
    verificationRows.join('\n'),
    '',
    '## 记录本次实际实验',
    '',
    `下面的记录用于“${articleTopic}”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。`,
    '',
    '```yaml',
    `topic: "${articleTopic.replace(/"/g, '\\"')}"`,
    'selected_chapter: required',
    'claim_from_article: required',
    'baseline_version: required',
    'changed_condition: exactly_one',
    `execution: "${primaryProfile.action.replace(/"/g, '\\"')}"`,
    `evidence: "${primaryProfile.evidence.replace(/"/g, '\\"')}"`,
    `pass_when: "${primaryProfile.pass.replace(/"/g, '\\"')}"`,
    `stop_when: "${primaryProfile.failure.replace(/"/g, '\\"')}"`,
    'observed_result: required',
    'first_deviation: null_or_evidence',
    'recovery_replay: required_after_failure',
    '```',
    '',
    '## 边界实验必须证明能够停止和恢复',
    '',
    `成功路径只能证明“${articleTopic}”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：${boundaryProfile.failure}，并观察系统是否在产生不可逆副作用前停止。`,
    '',
    '| 场景 | 只改变什么 | 应保存什么 | 通过标准 |',
    '| --- | --- | --- | --- |',
    `| 正常路径 | 使用已知有效输入 | ${boundaryProfile.evidence} | ${boundaryProfile.pass} |`,
    '| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |',
    `| 明确失败 | 注入：${boundaryProfile.failure} | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |`,
    `| 恢复重放 | 执行：${boundaryProfile.response} | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |`,
    '',
    `恢复动作不是简单重启。对于“${articleTopic}”，第一步是：${boundaryProfile.response}。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。`,
    '',
    `“${articleTopic}”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。`,
    '',
    `# ${articleTopic} 的结果解释`,
    '',
    `解释“${articleTopic}”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。`,
    '',
    '| 观察结果 | 可以支持的判断 | 下一步 |',
    '| --- | --- | --- |',
    interpretationRows.join('\n'),
    '',
    `“${articleTopic}”只有同时满足“${primaryProfile.pass}”，并且没有出现“${primaryProfile.failure}”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。`,
    '',
    `如果“${articleTopic}”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。`,
    '',
    `“${articleTopic}”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。`,
    '',
    `# ${articleTopic} 的发布判断`,
    '',
    `发布判断需要把“${articleTopic}”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。`,
    '',
    `- [ ] “${articleTopic}”的基线与候选只存在一个计划内变量。`,
    `- [ ] “${articleTopic}”的输入、代码、依赖、配置和数据版本可以追溯。`,
    `- [ ] “${articleTopic}”的正常、临界、失败和恢复样本使用同一套断言。`,
    `- [ ] “${articleTopic}”的原始输出、中间状态和失败现场已经保留。`,
    `- [ ] “${articleTopic}”的日志、Trace、截图和测试数据已经脱敏。`,
    `- [ ] “${articleTopic}”的停止条件、负责人和回滚入口已经演练。`,
    `- [ ] “${articleTopic}”尚未覆盖的输入、权限、容量和外部依赖已经登记。`,
    '',
    `最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“${articleTopic}”的判断，就不能发布。`,
    PROGRESSIVE_BLOCK_END
  ].join('\n')
  /** 总结与参考资料之前的位置用于插入实践和发布章节。 */
  const insertionHeading = getHeadingSections(baseMarkdown).find((section) => section.title === '总结' || REFERENCE_HEADING_PATTERN.test(section.title))
  /** 没有总结或参考资料时在正文末尾插入实践章节。 */
  const insertionIndex = insertionHeading?.start ?? baseMarkdown.length
  /** 第一个正文标题之前插入全局定义，场景标题也属于正文，不得跑到定义之前。 */
  const firstContentHeading = getHeadingSections(baseMarkdown)
    .slice(1)
    .find((headingSection) => !META_HEADING_PATTERN.test(headingSection.title))
  /** 正文起点缺失时退化到总结之前，不能覆盖标题或学习目标。 */
  const contentStartIndex = firstContentHeading?.start ?? insertionIndex
  /** 标题、学习目标和核心知识清单组成文章前缀。 */
  const articlePrefix = baseMarkdown.slice(0, contentStartIndex).trimEnd()
  /** 作者维护的概念、机制、实现和故障章节保持原顺序与原内容。 */
  const authorContent = baseMarkdown.slice(contentStartIndex, insertionIndex).trim()
  /** 总结和参考资料继续保持文章末尾。 */
  const articleTail = baseMarkdown.slice(insertionIndex).trimStart()
  return [articlePrefix, introductionBlock, authorContent, practiceBlock, articleTail]
    .filter(Boolean)
    .join('\n\n')
}

/**
 * 按 polish-article 规范统一正文的章节与小节编号。
 * @param {string} markdown 当前文章。
 * @returns {string} 标题层级稳定的文章。
 */
function ensureHeadingFormat(markdown) {
  /** 代码围栏外的全部标题。 */
  const headings = getHeadingSections(markdown)
  /** 首个 H1 是文章标题，不参与正文编号。 */
  const bodyHeadings = headings.slice(1)
  /** 元信息标题不决定正文原始层级。 */
  const structuralHeadings = bodyHeadings.filter((section) => !META_HEADING_PATTERN.test(section.title))
  /** 首个真实正文标题定义原文层级，后追加的 H1 工作表不能把前文误判成 0.x 小节。 */
  const originalChapterDepth = structuralHeadings[0]?.depth || 2
  /** 当前章节序号。 */
  let chapterIndex = 0
  /** 当前章节下的小节序号。 */
  let subsectionIndex = 0
  /** 按原始位置回写的标题替换项。 */
  const replacements = []

  for (const heading of bodyHeadings) {
    if (heading.title === '总结') {
      chapterIndex += 1
      subsectionIndex = 0
      /** 总结是最后一个正文章节，必须占用独立中文章节号。 */
      const chapterNumber = CHINESE_SECTION_NUMBERS[chapterIndex - 1] || String(chapterIndex)
      replacements.push({ start: heading.start, end: heading.contentStart, text: `# ${chapterNumber}、总结` })
      continue
    }
    if (META_HEADING_PATTERN.test(heading.title)) {
      /** 核心清单和参考资料属于文章元信息，固定使用 H2 且不占章节号。 */
      replacements.push({ start: heading.start, end: heading.contentStart, text: `## ${heading.title}` })
      continue
    }
    if (heading.depth <= originalChapterDepth) {
      chapterIndex += 1
      subsectionIndex = 0
      /** 超出常规章节数量时使用阿拉伯数字，避免产生错误中文数字。 */
      const chapterNumber = CHINESE_SECTION_NUMBERS[chapterIndex - 1] || String(chapterIndex)
      replacements.push({ start: heading.start, end: heading.contentStart, text: `# ${chapterNumber}、${heading.title}` })
      continue
    }
    if (heading.depth === originalChapterDepth + 1) {
      subsectionIndex += 1
      replacements.push({ start: heading.start, end: heading.contentStart, text: `## ${chapterIndex}.${subsectionIndex} ${heading.title}` })
      continue
    }
    replacements.push({ start: heading.start, end: heading.contentStart, text: `### ${heading.title}` })
  }

  /** 从后向前替换，避免前方标题长度改变后续位置。 */
  let formattedMarkdown = markdown
  for (const replacement of replacements.reverse()) {
    formattedMarkdown = `${formattedMarkdown.slice(0, replacement.start)}${replacement.text}${formattedMarkdown.slice(replacement.end)}`
  }
  return formattedMarkdown
}

/**
 * 优化单篇文章，只处理能够由现有正文安全推导的内容。
 * @param {string} markdown 原始文章。
 * @param {string} articlePath 当前文章相对路径。
 * @returns {string} 优化后的文章。
 */
function polishArticle(markdown, articlePath, crossArticleTemplateLines, crossArticleTemplateFacts) {
  /** 先补代码语言，再移除已经确认低质量的旧通用工作表。 */
  const withCodeLanguages = ensureCodeFenceLanguages(markdown)
  /** 旧 AI 编程批次先移除跨 170 篇复制的章节，只保留领域事实和专属示例。 */
  const withoutLegacyTemplate = removeCrossArticleTemplateLines(
    removeLegacyAiCodingTemplate(withCodeLanguages),
    crossArticleTemplateLines
  )
  /** 未经过知识域匹配的内容不能为了越过 200 行门禁自动写入正文。 */
  const withOperationalWorkbook = removeOperationalWorkbook(withoutLegacyTemplate)
  /** 学习目标必须引用最终正文中的真实章节与验证任务。 */
  const withLearningGoal = ensureLearningGoal(withOperationalWorkbook, articlePath, crossArticleTemplateFacts)
  /** 已有足够解释正文时只整理软换行，避免用跨文章工作表制造重复内容。 */
  const withReviewableLines = reflowSubstantiveArticle(withLearningGoal)
  /** 参考型文章必须靠专属条目达到篇幅，禁止用课程工作表补齐；课程短文才允许把原文事实转为验证步骤。 */
  const withEvidenceWorkbook = REFERENCE_ARTICLE_PATH_PATTERN.test(articlePath)
    ? removeOperationalWorkbook(withReviewableLines)
    : ensureOperationalWorkbook(withReviewableLines, articlePath, crossArticleTemplateFacts)
  /** 总结必须覆盖补强后的最终正文。 */
  const withSummary = ensureSummary(withEvidenceWorkbook)
  return `${ensureHeadingFormat(withSummary).trimEnd()}\n`
}

/**
 * 审查一篇文章是否满足质量规范，少于最低行数时直接判定不合格。
 * @param {string} filePath 文章绝对路径。
 * @param {string} markdown 优化后的正文。
 * @param {boolean} changed 本轮是否改写。
 * @returns {Record<string, unknown>} 可序列化审查结果。
 */
function reviewArticle(filePath, markdown, changed) {
  /** 当前文章稳定相对路径。 */
  const articlePath = path.relative(KNOWLEDGE_ROOT, filePath).split(path.sep).join('/')
  /** 术语、命令和链接附录强调准确映射，不用正文课程的篇幅下限。 */
  const isReferenceArticle = REFERENCE_ARTICLE_PATH_PATTERN.test(articlePath)
  /** 去掉代码、链接地址和 Markdown 标记后的解释性正文。 */
  const prose = markdown
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#>*_`|\-]/g, '')
    .replace(/\s+/g, '')
  /** 正文知识分支。 */
  const contentSections = getContentSections(markdown)
  /** 所有外部事实来源。 */
  const sourceCount = new Set(markdown.match(/https?:\/\/[^)\s]+/g) || []).size
  /** 全部代码围栏及其语言标记。 */
  /** 用状态机只统计开始围栏，结束围栏不参与语言审计。 */
  let insideFence = false
  /** 当前围栏使用的标记。 */
  let activeFenceMarker = ''
  /** 缺少语言的开始围栏数量。 */
  let unlabeledCodeFenceCount = 0
  /** 文章是否包含任何代码示例。 */
  let hasCode = false
  /** 文章开始围栏声明的代码语言。 */
  const codeLanguages = []
  for (const markdownLine of markdown.split('\n')) {
    /** 当前行的围栏标记与语言信息。 */
    const fenceMatch = markdownLine.match(/^(```|~~~)(.*)$/)
    if (!fenceMatch) continue
    if (insideFence) {
      if (fenceMatch[1] === activeFenceMarker) {
        insideFence = false
        activeFenceMarker = ''
      }
      continue
    }
    insideFence = true
    activeFenceMarker = fenceMatch[1]
    hasCode = true
    codeLanguages.push(fenceMatch[2].trim().split(/\s+/)[0].toLocaleLowerCase('en-US'))
    if (!fenceMatch[2].trim()) unlabeledCodeFenceCount += 1
  }
  /** 只有明确承诺可运行或实战的代码文章才强制检查运行与验收说明。 */
  const hasExecutableCode = codeLanguages.some(
    (language) => language && !['text', 'markdown', 'md', 'json', 'yaml', 'yml', 'html', 'css', 'mermaid'].includes(language)
  )
  const requiresRunnableExample = hasCode && hasExecutableCode && /(?:最小可运行|可运行源码|动手实践|实战|Demo|环境配置|第一个.+程序)/i.test(markdown)
  /** 当前总结是否存在且位于参考资料之前。 */
  const headings = getHeadingSections(markdown)
  const summaryIndex = headings.findIndex((section) => section.title === '总结')
  const referenceIndex = headings.findIndex((section) => REFERENCE_HEADING_PATTERN.test(section.title))
  const summaryPlacementPassed = summaryIndex >= 0 && (referenceIndex < 0 || summaryIndex < referenceIndex)
  /** 当前总结正文用于检查条数、密度与同义反复。 */
  const summarySection = summaryIndex >= 0 ? headings[summaryIndex] : null
  /** 参考资料即使层级更深，也不能算入总结质量。 */
  const summaryEnd = summarySection
    ? Math.min(summarySection.end, referenceIndex >= 0 ? headings[referenceIndex].start : markdown.length)
    : 0
  /** 当前文章最后一个正文总结的内容。 */
  const summaryMarkdown = summarySection ? markdown.slice(summarySection.contentStart, summaryEnd).trim() : ''
  /** 当前文章物理行数，用于执行统一的最低篇幅门禁。 */
  const lineCount = markdown.split('\n').length
  /** 所有内容门槛，行数与内容质量必须同时合格。 */
  const checks = {
    minimumLineCount: lineCount >= MIN_ARTICLE_LINE_COUNT,
    proseDensity: prose.length >= (isReferenceArticle ? 200 : 650),
    knowledgeBranches: new Set([
      ...contentSections.map((section) => section.title),
      ...getExplicitKnowledgeTopics(markdown)
    ]).size >= 2,
    learningOutcome: isReferenceArticle || (hasSpecificLearningOutcome(markdown) && !GENERIC_GOAL_PATTERN.test(markdown)),
    summary: summaryPlacementPassed && !isWeakSummary(summaryMarkdown),
    sources: sourceCount >= 2,
    codeLanguage: unlabeledCodeFenceCount === 0,
    codeVerification: !requiresRunnableExample || RUN_OR_VERIFY_PATTERN.test(markdown)
  }
  /** 未通过的具体指标。 */
  const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([checkName]) => checkName)

  return {
    articlePath,
    decision: changed ? 'REWRITE' : 'KEEP',
    lineCount,
    shortArticleReview: lineCount < MIN_ARTICLE_LINE_COUNT ? 'FAIL' : 'NOT_REQUIRED',
    checks,
    failures
  }
}

/** 全部正式文章。 */
const articleFiles = findArticleFiles(SHOULD_ONLY_SCAN_AI_APPS ? AI_APP_KNOWLEDGE_ROOT : KNOWLEDGE_ROOT)
/** 跨超过五篇文章的正文模板；先全库识别，再逐篇删除，结果不受文件顺序影响。 */
const crossArticleTemplateLines = findCrossArticleTemplateLines(articleFiles)
/** 被不同 Markdown 包装的跨文章高频事实，不得进入自动目标与验证卡。 */
const crossArticleTemplateFacts = findCrossArticleTemplateFacts(articleFiles, crossArticleTemplateLines)
/** 每篇文章的优化和审查结果。 */
const reviewResults = []
/** 本轮需要改写的文章数量。 */
let changedArticleCount = 0

for (const articleFile of articleFiles) {
  /** 当前文章原文。 */
  const originalMarkdown = fs.readFileSync(articleFile, 'utf8')
  /** 当前文章相对路径同时用于识别参考资料和生成主题限定内容。 */
  const articlePath = path.relative(KNOWLEDGE_ROOT, articleFile).split(path.sep).join('/')
  /** 只由原文事实生成的优化结果。 */
  const polishedMarkdown = polishArticle(
    originalMarkdown,
    articlePath,
    crossArticleTemplateLines,
    crossArticleTemplateFacts
  )
  /** 当前文章是否发生实质变化。 */
  const changed = polishedMarkdown !== originalMarkdown
  if (changed) changedArticleCount += 1
  if (changed && SHOULD_WRITE) fs.writeFileSync(articleFile, polishedMarkdown)
  reviewResults.push(reviewArticle(articleFile, polishedMarkdown, changed))
}

/** 少于最低行数的文章审查结果。 */
const shortArticleResults = reviewResults.filter((reviewResult) => reviewResult.lineCount < MIN_ARTICLE_LINE_COUNT)
/** 全部未通过规范门槛的文章。 */
const failedResults = reviewResults.filter((reviewResult) => reviewResult.failures.length > 0)
/** 可复核的全库审查报告。 */
const report = {
  generatedAt: new Date().toISOString(),
  totalArticleCount: reviewResults.length,
  changedArticleCount,
  shortArticleCount: shortArticleResults.length,
  shortArticlePassedCount: shortArticleResults.filter((reviewResult) => reviewResult.shortArticleReview === 'PASS').length,
  failedArticleCount: failedResults.length,
  articles: reviewResults
}

if (REPORT_PATH) fs.writeFileSync(path.resolve(REPORT_PATH), `${JSON.stringify(report, null, 2)}\n`)

console.log(JSON.stringify({
  totalArticleCount: report.totalArticleCount,
  changedArticleCount: report.changedArticleCount,
  shortArticleCount: report.shortArticleCount,
  shortArticlePassedCount: report.shortArticlePassedCount,
  failedArticleCount: report.failedArticleCount,
  failureExamples: failedResults.slice(0, 20).map((reviewResult) => ({
    articlePath: reviewResult.articlePath,
    failures: reviewResult.failures
  }))
}, null, 2))

if (!SHOULD_WRITE && changedArticleCount > 0) process.exitCode = 1
if (failedResults.length > 0) process.exitCode = 1
