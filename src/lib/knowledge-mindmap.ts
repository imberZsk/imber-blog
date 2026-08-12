import { remark } from 'remark'

/** 可以生成文章知识点思维导图的文章用途。 */
export type KnowledgeMindmapArticleKind = 'guide' | 'lesson' | 'practice' | 'reference'

/** 单篇文章构建期生成的思维导图数据。 */
export interface KnowledgeMindmapData {
  /** 交给 Markmap 渲染的精简 Markdown 知识树。 */
  markdown: string
  /** 根节点、章节和知识点的总数量。 */
  nodeCount: number
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
interface KnowledgeMindmapSection {
  /** 章节标题。 */
  title: string
  /** 从章节正文提取的关键结论。 */
  points: string[]
}

/** 普通文章允许展示的最大章节分支数。 */
const DEFAULT_SECTION_LIMIT = 7

/** AI 应用开发文章允许展示的最大章节分支数。 */
const AI_APP_SECTION_LIMIT = 10

/** 普通文章每个章节允许展示的最大知识点数。 */
const DEFAULT_POINT_LIMIT = 3

/** AI 应用开发文章每个章节允许展示的最大知识点数。 */
const AI_APP_POINT_LIMIT = 4

/** 单个知识点允许展示的最大字符数。 */
const MAX_POINT_LENGTH = 100

/** 不属于文章知识体系的写作、导航和资源章节。 */
const EXCLUDED_SECTION_PATTERN = /(?:下一篇|继续阅读|参考资料|可视化规格|作者自审|可运行源码|附录|延伸阅读|相关阅读)/

/** 不应进入导图的写作说明和图片规格。 */
const EXCLUDED_POINT_PATTERN =
  /^(?:VISUAL_STRATEGY|DIAGRAM_DESCRIPTION|SCREENSHOT_DESCRIPTION|本文围绕|本章将|本 demo 配套|更新日期)/i

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
  /** 优先保留完整首句，过长或无标点时按节点上限截断。 */
  const pointText =
    sentenceEndIndex >= 8 ? normalizedText.slice(0, sentenceEndIndex + 1) : normalizedText.slice(0, MAX_POINT_LENGTH)

  return pointText.trim()
}

/**
 * 判断文本是否适合作为独立知识节点。
 * @param text 已压缩的候选知识点。
 */
function isUsefulMindmapPoint(text: string): boolean {
  return text.length >= 6 && !EXCLUDED_POINT_PATTERN.test(text) && !EXCLUDED_SECTION_PATTERN.test(text)
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
  if (articleKind === 'reference') {
    return null
  }

  /** 当前文章解析后的 Markdown AST。 */
  const markdownTree = remark().parse(markdown) as MindmapMarkdownNode
  /** AI 应用文章保留更多全链路章节。 */
  const sectionLimit = isAiAppArticle ? AI_APP_SECTION_LIMIT : DEFAULT_SECTION_LIMIT
  /** AI 应用文章每章保留更多工程知识点。 */
  const pointLimit = isAiAppArticle ? AI_APP_POINT_LIMIT : DEFAULT_POINT_LIMIT
  /** 按正文顺序收集的知识分支。 */
  const sections: KnowledgeMindmapSection[] = []
  /** 位于首个章节之前、可在短文章中作为核心目标的正文结论。 */
  const introductionPoints: string[] = []
  /** 当前正在接收正文知识点的章节。 */
  let currentSection: KnowledgeMindmapSection | null = null
  /** 首个一级标题是文章标题，不重复生成章节节点。 */
  let hasSkippedArticleTitle = false

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
        currentSection = null
        continue
      }

      if (articleKind === 'guide' && headingDepth <= 2) {
        /** 当前指南章节映射后的知识分支名称。 */
        const guideSectionLabel = GUIDE_SECTION_LABELS.get(headingText)
        if (!guideSectionLabel || sections.some((section) => section.title === guideSectionLabel)) {
          currentSection = null
          continue
        }

        currentSection = { title: guideSectionLabel, points: [] }
        sections.push(currentSection)
        continue
      }

      /** 结构很短的文档可能直接从三级标题开始，此时前两个三级标题也作为知识分支。 */
      const shouldCreateSection = headingDepth <= 2 || (headingDepth === 3 && sections.length < 2)
      if (shouldCreateSection) {
        if (sections.length >= sectionLimit || sections.some((section) => section.title === headingText)) {
          currentSection = null
          continue
        }

        currentSection = { title: headingText, points: [] }
        sections.push(currentSection)
        continue
      }

      if (currentSection) {
        appendSectionPoint(currentSection, headingText, pointLimit)
      }
      continue
    }

    if (!currentSection) {
      if (sections.length === 0 && hasSkippedArticleTitle && markdownNode.type === 'paragraph') {
        /** 短实验在首个小标题前给出的核心目标。 */
        const introductionPoint = getMindmapPoint(getNodeText(markdownNode))
        if (isUsefulMindmapPoint(introductionPoint) && !introductionPoints.includes(introductionPoint)) {
          introductionPoints.push(introductionPoint)
        }
      }
      continue
    }

    if (markdownNode.type === 'paragraph' || markdownNode.type === 'blockquote') {
      appendSectionPoint(currentSection, getNodeText(markdownNode), pointLimit)
      continue
    }

    if (markdownNode.type === 'list') {
      for (const listItemNode of markdownNode.children || []) {
        appendSectionPoint(currentSection, getNodeText(listItemNode), pointLimit)
      }
      continue
    }

    if (markdownNode.type === 'code') {
      for (const instructionStep of getInstructionSteps(markdownNode)) {
        appendSectionPoint(currentSection, instructionStep, pointLimit)
      }
    }
  }

  /** 至少两个分支才能形成比正文目录更有价值的知识关系。 */
  const usefulSections = sections.filter((section) => section.points.length > 0)
  if (usefulSections.length < 2 && introductionPoints.length > 0) {
    usefulSections.unshift({ title: '核心目标', points: introductionPoints.slice(0, pointLimit) })
  }
  if (usefulSections.length < 2) {
    return null
  }

  /** 作为 Markmap 根节点的安全文章标题。 */
  const rootTitle = normalizeMindmapText(title).replace(/^#+\s*/, '')
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

  return { markdown: mindmapLines.join('\n'), nodeCount }
}
