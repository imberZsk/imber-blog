import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import type { KnowledgeArticleKind } from './knowledge-article-kind.ts'

/** 可以生成文章知识点思维导图的文章用途。 */
export type KnowledgeMindmapArticleKind = KnowledgeArticleKind

/** 单篇文章构建期生成的思维导图数据。 */
export interface KnowledgeMindmapData {
  /** 与文章 H1 一致的导图根标题。 */
  title: string
  /** 交给 Markmap 渲染的精简 Markdown 知识树。 */
  markdown: string
  /** 根节点、章节和知识点的总数量。 */
  nodeCount: number
  /** 文章页和路线总图共同消费的规范知识分支。 */
  sections: KnowledgeMindmapSection[]
}

/** Markdown AST 中知识树提取会访问的字段。 */
interface MindmapMarkdownNode {
  /** 当前节点的 Markdown 语义类型。 */
  type?: string
  /** 标题节点的层级。 */
  depth?: number
  /** 文本或行内代码节点的内容。 */
  value?: string
  /** 围栏代码声明的语言；无语言的步骤清单可能属于教学内容。 */
  lang?: string
  /** 当前节点包含的子节点。 */
  children?: MindmapMarkdownNode[]
}

/** 思维导图中的一个一级知识分支。 */
export interface KnowledgeMindmapSection {
  /** 章节标题。 */
  title: string
  /** 从章节正文提取的关键结论。 */
  points: string[]
}

/** 普通文章允许展示的最大章节分支数。 */
const DEFAULT_SECTION_LIMIT = 7

/** AI 应用开发文章允许展示的最大章节分支数。 */
const AI_APP_SECTION_LIMIT = 12

/** 普通文章每个章节允许展示的最大知识点数。 */
const DEFAULT_POINT_LIMIT = 3

/** AI 应用开发文章每个章节允许展示的最大知识点数。 */
const AI_APP_POINT_LIMIT = 4

/** 每个分支至少需要两条正文结论，避免路线总图只剩章节目录。 */
const MIN_SECTION_POINT_COUNT = 2

/** 单个知识点允许展示的最大字符数；超过限制时换用其他完整结论，不做硬截断。 */
const MAX_POINT_LENGTH = 140

/** 不属于文章知识体系的写作、导航和资源章节。 */
const EXCLUDED_SECTION_PATTERN =
  /^(?:(?:[一二三四五六七八九十]+、|\d+(?:\.\d+)*[.、]?\s*))?(?:下一篇|继续阅读|参考资料|事实来源|可视化规格|作者自审|可运行源码(?:[：:].*)?|附录(?:[：:].*)?|延伸阅读|相关阅读|学习目标|学习边界|核心知识清单|验收清单|学完验收|自测(?:题)?|总结|小结|代码\s*↔\s*概念对应|动手实践(?:[：:].*)?|如何验证.+关键结论)$/

/** 不应进入导图的写作说明和图片规格。 */
const EXCLUDED_POINT_PATTERN =
  /(?:VISUAL_STRATEGY|DIAGRAM_DESCRIPTION|SCREENSHOT_DESCRIPTION)|^(?:本文围绕|本章将|本 demo 配套|更新日期|如下图|图示说明|接下来|下面|上面|当前|这就是|下一课|下一章|继续阅读|代码\s*↔\s*概念对应|现象[：:]常见根因|环节[：:]要回答的问题|概念[：:]在\s*main\.py\s*哪里|\d+[.、]\s*(?:运行|选择|执行|配置|安装))/i

/** 表头、导航和不完整句不能作为脱离正文展示的末级节点。 */
const NON_STANDALONE_POINT_PATTERN =
  /(?:\.\.\.|…)$|[：:]$|[？?][”’」』】）)]?$|(?:只有|分为|包括|包含|归纳为|拆成|经过|需要|做|完成)(?:以下|如下)?[一二三四五六七八九十两\d]+(?:个|步|类|种|层|部分|阶段|方面|件事)(?:内容|对象|流程|步骤)?[：:]?$|^(?:(?:它|这(?:个|些|种|一)|其|其中|两者|前者|后者)(?:是|不|会|能|可以|负责|处理|用于|表示|对应|包含|依赖|支持|与)|不是|而不是|并不是|不能|不要)|^(?:现象|环节|状态|项目|维度|步骤|编号)[：:]?(?:常见根因|要回答的问题)?$/i

/** 不能脱离正文成为知识结论的地址、命令和纯文件路径。 */
const NON_KNOWLEDGE_POINT_PATTERN = /^(?:https?:\/\/|\/[\w.-]+\/|[\w.-]+\.(?:py|ts|tsx|js|jsx|json|ya?ml|md|txt)$|(?:pnpm|npm|npx|pip|docker|kubectl|curl)\s)/i

/** 跨主题复用的执行模板、环境说明和答题套路不能代替文章自身知识。 */
const GENERIC_PROCESS_POINT_PATTERN =
  /(?:证明结果可复现且没有引入新的副作用|遇到生产排障或系统设计题|先固定现象、时间、版本、输入和影响范围|再沿调用链寻找第一个异常事实|不能用一个模式包打天下|最小验证案例|把它和任务一起提交|并记录退出码|模型只负责需要推理的部分|新增工具、目录或网络域名时要单独评审权限|没有验证器的契约只能算计划|临时任务事实留在任务上下文|保存为\s*\w+\.py|预期输出从根规则到最近子目录规则排列|脚本只演示作用域发现|否则旧索引会让 Agent 修改|只覆盖已生成实现的快乐路径|不能把整段对话当数据库|任何片段都能回到文件与行号|保存为当前文章专用的验收记录|expected 必须替换成服务实际声明|通过条件：合法调用符合协商后的 Schema|两者都需要超时和失败策略|父 Agent 维护依赖图并负责最终聚合|不能把重试次数当进展|恢复时核对图版本和已提交副作用|恢复前要验证代码、工具和权限是否仍兼容|恢复后是否能用同一数据集证明质量没有退化|只有错误日志、没有用户影响和恢复证据|成功标准不是“命令退出了”|而是无空白错误、Diff 只包含目标文件|随后运行项目真实的类型检查和测试|非法参数、越权资源或不兼容版本返回机器可判断的错误|选择机制：根据上面的关键机制|以及必须由宿主代码执行的校验、权限和状态更新|演练必须能回答三个问题|是否会越权或产生重复副作用|原理题\s*：|选型题\s*：|零依赖[，,]|对应的失败条件.*Trace|源码、复制内容和实际运行入口保持一致)/i

/** 学习指南只保留能回答“学什么”和“学到什么程度”的知识分支。 */
const GUIDE_SECTION_LABELS = new Map([
  ['学习目标', '核心知识'],
  ['实践方法', '验证方法'],
  ['常见误区', '失败边界'],
  ['学完验收', '验收能力']
])

/**
 * 递归提取 Markdown 节点中的可见文本。
 * @param node 当前需要读取的 Markdown AST 节点。
 */
function getNodeText(node: MindmapMarkdownNode): string {
  if (typeof node.value === 'string') {
    return node.value
  }

  /** 当前节点全部子节点的可见文本。 */
  const childTexts = (node.children || []).map(getNodeText)
  return childTexts.join(' ')
}

/**
 * 清理将要展示在思维导图节点中的文本。
 * @param text Markdown AST 中提取的原始可见文本。
 */
function normalizeMindmapText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^[-–—:：·\s]+|[-–—:：·\s]+$/g, '')
    // Markmap 会把尖括号内容解析成 HTML；使用可见数学括号保留术语，同时避免未闭合标签吞掉后续节点。
    .replaceAll('<', '‹')
    .replaceAll('>', '›')
    .trim()
}

/**
 * 将长段落压缩成适合思维导图扫描的一条结论。
 * @param text 已提取的段落或列表项文本。
 */
function getMindmapPoint(text: string): string {
  /** 完成空白和边缘标点清理的候选知识点。 */
  const normalizedText = normalizeMindmapText(text)
  /** 第一处完整句末标点的位置。 */
  const sentenceEndIndex = normalizedText.search(/[。；;！!?？]/)
  /** 优先保留完整首句；无完整句且过长时放弃该候选，防止出现半句话。 */
  const pointText = sentenceEndIndex >= 8
    ? normalizedText.slice(0, sentenceEndIndex + 1)
    : normalizedText.length <= MAX_POINT_LENGTH
      ? normalizedText
      : ''

  return pointText.trim()
}

/**
 * 将一个正文节点拆成可以独立阅读的完整结论候选。
 * @param text 段落、引用或列表项的原始可见文本。
 */
function getMindmapPointCandidates(text: string): string[] {
  /** 保留 Markdown 软换行的初步句子；作者常用逐行陈述表达并列职责。 */
  const lineCandidates = text.split(/\n+/).map((lineCandidate) => lineCandidate.trim()).filter(Boolean)
  /** 按完整句末标点继续拆分后的候选结论。 */
  const sentenceCandidates = lineCandidates.flatMap((lineCandidate) => {
    /** 当前行中包含句末标点的完整句子。 */
    const completeSentences = lineCandidate.match(/[^。；;！!?？]+[。；;！!?？]?/g) || []
    return completeSentences.map((sentenceCandidate) => sentenceCandidate.trim()).filter(Boolean)
  })
  /** 去除重复、过长和不完整节点后的最终候选。 */
  const usefulCandidates: string[] = []

  for (const sentenceCandidate of sentenceCandidates) {
    /** 当前候选压缩后的思维导图结论。 */
    const pointText = getMindmapPoint(sentenceCandidate)
    if (isUsefulMindmapPoint(pointText) && !usefulCandidates.includes(pointText)) {
      usefulCandidates.push(pointText)
    }
  }

  return usefulCandidates
}

/**
 * 判断文本是否适合作为独立知识节点。
 * @param text 已压缩的候选知识点。
 */
function isUsefulMindmapPoint(text: string): boolean {
  return text.length >= 6
    && text.length <= MAX_POINT_LENGTH
    && !EXCLUDED_POINT_PATTERN.test(text)
    && !EXCLUDED_SECTION_PATTERN.test(text)
    && !NON_STANDALONE_POINT_PATTERN.test(text)
    && !NON_KNOWLEDGE_POINT_PATTERN.test(text)
    && !GENERIC_PROCESS_POINT_PATTERN.test(text)
}

/**
 * 将父子标题转换为仅保留主题词的比较文本，用于识别“核心包 / 核心包地图”式重复节点。
 * @param headingText 已完成 Markdown 语法清理的标题。
 */
function getComparableHeadingText(headingText: string): string {
  return headingText
    .replace(/^(?:[一二三四五六七八九十]+、|\d+(?:\.\d+)*[.、]?\s*)/, '')
    .replace(/(?:TypeScript|Python|JavaScript|LangChain|地图|一览|概览|总览|详解|说明|职责|的)/gi, '')
    .replace(/[\p{P}\p{S}\s]+/gu, '')
    .trim()
}

/**
 * 判断更深层标题是否只是重复当前章主题，避免父子节点换一种说法重复出现。
 * @param sectionTitle 当前章级节点标题。
 * @param childHeadingTitle 当前更深层标题。
 */
function isRepeatedChildHeading(sectionTitle: string, childHeadingTitle: string): boolean {
  /** 当前章标题去掉编号、语言名和“地图”等展示词后的主题。 */
  const comparableSectionTitle = getComparableHeadingText(sectionTitle)
  /** 子标题去掉编号、语言名和“地图”等展示词后的主题。 */
  const comparableChildTitle = getComparableHeadingText(childHeadingTitle)
  if (comparableSectionTitle.length < 4 || comparableChildTitle.length < 4) {
    return false
  }

  return comparableSectionTitle.includes(comparableChildTitle) || comparableChildTitle.includes(comparableSectionTitle)
}

/**
 * 去掉子标题的章节编号，导图通过真实缩进表达层级，不再显示容易误解为平级章节的 3.1。
 * @param headingText 正文中的完整子标题。
 */
function getMindmapChildHeadingLabel(headingText: string): string {
  return headingText.replace(/^\d+(?:\.\d+)+[.、]?\s*/, '').trim()
}

/**
 * 向章节追加一条不重复且有信息量的知识点。
 * @param section 当前接收知识点的章节。
 * @param candidateText 从段落、列表或子标题提取的文本。
 * @param pointLimit 当前文章每个章节允许展示的节点上限。
 */
function appendSectionPoint(section: KnowledgeMindmapSection, candidateText: string, pointLimit: number): void {
  if (section.points.length >= pointLimit) {
    return
  }

  /** 当前候选文本压缩后的知识点。 */
  const pointText = getMindmapPoint(candidateText)
  if (!isUsefulMindmapPoint(pointText) || section.points.includes(pointText)) {
    return
  }

  section.points.push(pointText)
}

/**
 * 向章节追加一个正文节点中包含的多条独立结论。
 * @param section 当前接收知识点的章节。
 * @param candidateText 段落、引用或列表项的原始可见文本。
 * @param pointLimit 当前文章每个章节允许展示的节点上限。
 */
function appendSectionPoints(section: KnowledgeMindmapSection, candidateText: string, pointLimit: number): void {
  /** 当前正文节点拆分出的完整结论。 */
  const pointCandidates = getMindmapPointCandidates(candidateText)
  for (const pointCandidate of pointCandidates) {
    appendSectionPoint(section, pointCandidate, pointLimit)
  }
}

/**
 * 从表格正文逐行提取最能表达结论的单元格，表头不作为知识点。
 * @param section 当前接收知识点的章节。
 * @param tableNode 当前 Markdown 表格节点。
 * @param pointLimit 当前文章每个章节允许展示的节点上限。
 */
function appendTablePoints(section: KnowledgeMindmapSection, tableNode: MindmapMarkdownNode, pointLimit: number): void {
  /** 表格首行是列名，仅遍历后续数据行。 */
  const tableBodyRows = (tableNode.children || []).slice(1)
  for (const tableRow of tableBodyRows) {
    /** 当前数据行全部非空单元格；组合后才能保留条件、决策和值之间的关系。 */
    const cellTexts = (tableRow.children || []).map((tableCell) => normalizeMindmapText(getNodeText(tableCell))).filter(Boolean)
    /** 用箭头组合整行，避免分号被误当成句末，只留下“固定 Prompt”一类场景标签。 */
    const rowPoint = getMindmapPoint(cellTexts.join(' → '))
    if (rowPoint) {
      appendSectionPoint(section, rowPoint, pointLimit)
    }
  }
}

/**
 * 读取列表项自身的说明段落，排除其下代码围栏和嵌套实现细节。
 * @param listItemNode 当前 Markdown 列表项节点。
 */
function getListItemText(listItemNode: MindmapMarkdownNode): string {
  /** 列表项中直接承担说明作用的段落和引用节点。 */
  const descriptionNodes = (listItemNode.children || []).filter(
    (childNode) => childNode.type === 'paragraph' || childNode.type === 'blockquote'
  )
  return descriptionNodes.map(getNodeText).join('\n')
}

/**
 * 从无语言围栏中提取按数字排列的实验步骤。
 * @param node 当前可能包含操作清单的 Markdown 代码节点。
 */
function getInstructionSteps(node: MindmapMarkdownNode): string[] {
  if (node.type !== 'code' || node.lang || !node.value) {
    return []
  }

  /** 去除空行后的围栏文本行。 */
  const codeLines = node.value.split('\n').map(normalizeMindmapText).filter(Boolean)
  /** 以数字序号开头、可以作为实验步骤的文本行。 */
  const instructionLines = codeLines.filter((codeLine) => /^\d+[.、]/.test(codeLine))

  return instructionLines.length >= 2 ? instructionLines : []
}

/**
 * 从文章标题层级、关键段落和列表构建可交互思维导图。
 * @param markdown 当前文章未经 HTML 转换的 Markdown。
 * @param title 页面已经清理课号后的文章标题。
 * @param isAiAppArticle 当前文章是否属于 AI 大模型应用开发主线。
 * @param articleKind 当前文章在学习路径中的用途。
 */
export function createKnowledgeMindmap(
  markdown: string,
  title: string,
  isAiAppArticle: boolean,
  articleKind: KnowledgeMindmapArticleKind
): KnowledgeMindmapData | null {
  /** 自动补强用于文章验收，不得取代作者正文成为思维导图主节点。 */
  const knowledgeMarkdown = markdown.replace(
    /<!-- article-progressive-block:start -->[\s\S]*?<!-- article-progressive-block:end -->\s*/g,
    ''
  )
  /** 当前文章解析后的 Markdown AST。 */
  const markdownTree = remark().use(remarkGfm).parse(knowledgeMarkdown) as MindmapMarkdownNode
  /** AI 应用文章保留更多全链路章节。 */
  const sectionLimit = isAiAppArticle ? AI_APP_SECTION_LIMIT : DEFAULT_SECTION_LIMIT
  /** AI 应用文章每章保留更多工程知识点。 */
  const pointLimit = isAiAppArticle ? AI_APP_POINT_LIMIT : DEFAULT_POINT_LIMIT
  /** 按正文顺序收集的知识分支。 */
  const sections: KnowledgeMindmapSection[] = []
  /** 一级章不足两个有效分支时，用下一层知识标题形成的候选分支。 */
  const fallbackSections: KnowledgeMindmapSection[] = []
  /** 位于首个章节之前、可在短文章中作为核心目标的正文结论。 */
  const introductionPoints: string[] = []
  /** 当前正在接收正文知识点的章节。 */
  let currentSection: KnowledgeMindmapSection | null = null
  /** 当前正在接收正文知识点的下一层候选章节。 */
  let currentFallbackSection: KnowledgeMindmapSection | null = null
  /** 首个一级标题是文章标题，不重复生成章节节点。 */
  let hasSkippedArticleTitle = false
  /** 当前被排除章节的标题层级；该章节的所有子标题同样不能进入导图。 */
  let excludedHeadingDepth = 0
  /** 正文首个有效章节确定的章级深度，后续更深标题只能成为该章的解释节点。 */
  let sectionHeadingDepth: number | null = null

  for (const markdownNode of markdownTree.children || []) {
    if (markdownNode.type === 'heading') {
      /** 当前标题节点的可见文本。 */
      const headingText = normalizeMindmapText(getNodeText(markdownNode))
      /** 当前标题的 Markdown 层级。 */
      const headingDepth = markdownNode.depth || 1

      if (!hasSkippedArticleTitle && headingDepth === 1) {
        hasSkippedArticleTitle = true
        currentSection = null
        continue
      }

      if (!headingText || EXCLUDED_SECTION_PATTERN.test(headingText)) {
        excludedHeadingDepth = headingDepth
        if (sectionHeadingDepth === null || headingDepth <= sectionHeadingDepth) {
          currentSection = null
        }
        currentFallbackSection = null
        continue
      }

      if (excludedHeadingDepth > 0 && headingDepth > excludedHeadingDepth) {
        currentSection = null
        currentFallbackSection = null
        continue
      }
      excludedHeadingDepth = 0

      if (articleKind === 'guide' && headingDepth <= 2) {
        /** 当前指南章节映射后的知识分支名称。 */
        const guideSectionLabel = GUIDE_SECTION_LABELS.get(headingText)
        if (!guideSectionLabel || sections.some((section) => section.title === guideSectionLabel)) {
          currentSection = null
          continue
        }

        currentSection = { title: guideSectionLabel, points: [] }
        currentFallbackSection = null
        sections.push(currentSection)
        continue
      }

      if (sectionHeadingDepth === null) {
        sectionHeadingDepth = headingDepth
      }

      /** 只有正文真实章级标题才能成为平级分支，避免把 3.1 与第三章压到同一层。 */
      const shouldCreateSection = headingDepth <= sectionHeadingDepth
      if (shouldCreateSection) {
        sectionHeadingDepth = Math.min(sectionHeadingDepth, headingDepth)
        /** 十进制编号只属于正文目录，导图分支统一依靠缩进表达层级。 */
        const sectionTitle = getMindmapChildHeadingLabel(headingText)
        if (sections.length >= sectionLimit || sections.some((section) => section.title === sectionTitle)) {
          currentSection = null
          continue
        }

        currentSection = { title: sectionTitle, points: [] }
        currentFallbackSection = null
        sections.push(currentSection)
        continue
      }

      if (currentSection) {
        /** 子标题在导图中依靠缩进表达层级，不继续携带 3.1 一类正文编号。 */
        const childHeadingLabel = getMindmapChildHeadingLabel(headingText)
        // 子标题若只是复述父标题，保留其正文解释即可，不再生成一条重复导图节点。
        if (!isRepeatedChildHeading(currentSection.title, childHeadingLabel)) {
          appendSectionPoint(currentSection, childHeadingLabel, pointLimit)
        }
      }
      /** 下一层候选同样去掉十进制编号，避免回退后再次出现 2.1 伪平级节点。 */
      const fallbackSectionTitle = getMindmapChildHeadingLabel(headingText)
      if (
        headingDepth === sectionHeadingDepth + 1 &&
        !fallbackSections.some((section) => section.title === fallbackSectionTitle)
      ) {
        currentFallbackSection = { title: fallbackSectionTitle, points: [] }
        fallbackSections.push(currentFallbackSection)
      }
      continue
    }

    if (excludedHeadingDepth > 0) {
      continue
    }

    if (!currentSection) {
      if (sections.length === 0 && hasSkippedArticleTitle && markdownNode.type === 'paragraph') {
        /** 短实验在首个小标题前给出的核心目标。 */
        /** 当前导语段落中可以独立阅读的结论。 */
        const introductionCandidates = getMindmapPointCandidates(getNodeText(markdownNode))
        for (const introductionPoint of introductionCandidates) {
          if (!introductionPoints.includes(introductionPoint)) {
            introductionPoints.push(introductionPoint)
          }
        }
      }
      continue
    }

    if (markdownNode.type === 'blockquote' && /^读完后/u.test(normalizeMindmapText(getNodeText(markdownNode)))) {
      // 学习成果引用块是验收说明，不是正文知识结论，不能用来补足思维导图节点。
      continue
    }

    if (markdownNode.type === 'paragraph' || markdownNode.type === 'blockquote') {
      appendSectionPoints(currentSection, getNodeText(markdownNode), pointLimit)
      if (currentFallbackSection) {
        appendSectionPoints(currentFallbackSection, getNodeText(markdownNode), pointLimit)
      }
      continue
    }

    if (markdownNode.type === 'list') {
      for (const listItemNode of markdownNode.children || []) {
        appendSectionPoints(currentSection, getListItemText(listItemNode), pointLimit)
        if (currentFallbackSection) {
          appendSectionPoints(currentFallbackSection, getListItemText(listItemNode), pointLimit)
        }
      }
      continue
    }

    if (markdownNode.type === 'table') {
      appendTablePoints(currentSection, markdownNode, pointLimit)
      if (currentFallbackSection) {
        appendTablePoints(currentFallbackSection, markdownNode, pointLimit)
      }
      continue
    }

    if (markdownNode.type === 'code') {
      for (const instructionStep of getInstructionSteps(markdownNode)) {
        appendSectionPoint(currentSection, instructionStep, pointLimit)
        if (currentFallbackSection) {
          appendSectionPoint(currentFallbackSection, instructionStep, pointLimit)
        }
      }
    }
  }

  /** 至少两个分支才能形成比正文目录更有价值的知识关系。 */
  /** 首选最浅层完整分支；不足两个时回退到下一层，避免单章教程和面试题丢失主题。 */
  const primaryUsefulSections = sections.filter((section) => section.points.length >= MIN_SECTION_POINT_COUNT)
  /** 下一层标题中同样拥有至少两条正文解释的完整候选分支。 */
  const fallbackUsefulSections = fallbackSections.filter((section) => section.points.length >= MIN_SECTION_POINT_COUNT)
  /** 最终用于文章页和路线总图的同层知识分支。 */
  const usefulSections = (
    primaryUsefulSections.length >= 2 ? primaryUsefulSections : fallbackUsefulSections
  ).slice(0, sectionLimit)
  if (usefulSections.length < 2 && introductionPoints.length >= MIN_SECTION_POINT_COUNT) {
    usefulSections.unshift({ title: '核心目标', points: introductionPoints.slice(0, pointLimit) })
  }
  if (usefulSections.length < 2) {
    return null
  }

  /** 正文首个 H1 与阅读页标题同源，调用方标题只在缺失 H1 时兜底。 */
  const sourceArticleTitle = (markdownTree.children || []).find(
    (markdownNode) => markdownNode.type === 'heading' && markdownNode.depth === 1
  )
  /** 作为文章导图和路线总图共同根节点的安全标题。 */
  const rootTitle = normalizeMindmapText(
    sourceArticleTitle ? getNodeText(sourceArticleTitle) : title
  ).replace(/^#+\s*/, '')
  /** 最终输出的层级化 Markdown 行。 */
  const mindmapLines = [`# ${rootTitle}`]

  for (const section of usefulSections) {
    mindmapLines.push(`## ${section.title}`)
    for (const point of section.points) {
      mindmapLines.push(`- ${point}`)
    }
  }

  /** 根节点、章节节点和知识点节点的总数。 */
  const nodeCount =
    1 + usefulSections.reduce((sectionNodeCount, section) => sectionNodeCount + 1 + section.points.length, 0)

  return {
    title: rootTitle,
    markdown: mindmapLines.join('\n'),
    nodeCount,
    sections: usefulSections.map((section) => ({
      title: section.title, // 路线总图必须保留文章导图中的原始分支名称。
      points: [...section.points] // 返回副本，避免任一消费者修改共享知识树。
    }))
  }
}
