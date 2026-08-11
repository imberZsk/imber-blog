import { existsSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, relative, sep } from 'node:path'
import { remark } from 'remark'

/** 知识库 Markdown 的绝对根目录。 */
const KNOWLEDGE_ROOT = join(process.cwd(), 'src', 'content', 'knowledge')

/** 只有显式传入 --write 才修改正文和删除已合并的 Demo README。 */
const SHOULD_WRITE = process.argv.includes('--write')

/** 共享沙盒 README 只承载运行资源，不合并进任何单篇文章。 */
const SHARED_LAB_DIRECTORY_NAME = '_shared-labs'

/** 标记已经并入主文章的实验内容，防止脚本重复追加。 */
const MERGED_LAB_MARKER = '<!-- knowledge-lab-merged -->'

/** 读者页面不应展示的写作过程或重复导航章节。 */
const EDITORIAL_SECTION_PATTERN = /(?:可视化规格|作者自审|下一篇|继续阅读|相关阅读)/

/** 批量生成 Lab 时遗留、没有主题信息的通用实践模板。 */
const GENERIC_LAB_TEMPLATE_PATTERN = /本 Lab 用最小输入验证“当前主题”的核心行为/

/** 通用 Lab 模板中应删除的低信息章节。 */
const GENERIC_LAB_SECTION_PATTERN = /(?:实践目标|实践验收|常见问题)/

/** 已经具备明确学习目标的正文关键词。 */
const LEARNING_GOAL_PATTERN = /(?:读完你能|学完你能|学习目标|一句话目标|本章目标|你将学会|目标[：:])/i

/** Markdown 文件支持的扩展名。 */
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx'])

/** Markdown AST 中脚本需要访问的最小节点结构。 */
/** @typedef {{type?: string, depth?: number, value?: string, children?: MarkdownNode[], position?: {start?: {offset?: number}, end?: {offset?: number}}}} MarkdownNode */

/**
 * 递归找出知识库中的 Markdown 文件。
 * @param {string} directory 当前扫描目录。
 * @returns {string[]} Markdown 文件绝对路径。
 */
function findMarkdownFiles(directory) {
  /** 当前目录及子目录中的 Markdown 文件。 */
  const markdownFiles = []

  for (const directoryEntry of readdirSync(directory, { withFileTypes: true })) {
    /** 当前目录项的绝对路径。 */
    const entryPath = join(directory, directoryEntry.name)

    if (directoryEntry.isDirectory()) {
      markdownFiles.push(...findMarkdownFiles(entryPath))
      continue
    }

    if (directoryEntry.isFile() && MARKDOWN_EXTENSIONS.has(extname(directoryEntry.name).toLowerCase())) {
      markdownFiles.push(entryPath)
    }
  }

  return markdownFiles
}

/**
 * 提取 Markdown AST 节点中的可见文本。
 * @param {MarkdownNode} node 当前节点。
 * @returns {string} 合并后的可见文本。
 */
function getNodeText(node) {
  if (typeof node.value === 'string') {
    return node.value
  }

  /** 当前节点所有子节点的可见文本。 */
  const childTexts = (node.children || []).map(getNodeText)
  return childTexts.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * 去掉标题开头的中文或数字章节序号，便于识别章节语义。
 * @param {string} headingText Markdown 标题文本。
 * @returns {string} 不含章节序号的标题。
 */
function normalizeHeadingText(headingText) {
  return headingText
    .replace(/^[一二三四五六七八九十百]+[、.．]\s*/, '')
    .replace(/^\d+(?:\.\d+)*[、.．]\s*/, '')
    .trim()
}

/**
 * 使用 AST 的源码位置删除匹配章节，同时保持其他 Markdown 原格式不变。
 * @param {string} markdown 原始 Markdown。
 * @param {RegExp} sectionPattern 需要删除的章节标题规则。
 * @returns {string} 删除目标章节后的 Markdown。
 */
function removeMarkdownSections(markdown, sectionPattern) {
  /** 当前 Markdown 的语法树。 */
  const markdownTree = /** @type {MarkdownNode} */ (remark().parse(markdown))
  /** 文档顶层节点，章节边界只在同级节点之间计算。 */
  const topLevelNodes = markdownTree.children || []
  /** 等待从源码中删除的字符区间。 */
  const removalRanges = []

  for (const [nodeIndex, markdownNode] of topLevelNodes.entries()) {
    if (markdownNode.type !== 'heading' || !markdownNode.depth) {
      continue
    }

    /** 去掉章节序号后的当前标题。 */
    const headingText = normalizeHeadingText(getNodeText(markdownNode))
    if (!sectionPattern.test(headingText)) {
      continue
    }

    /** 当前待删除章节的起始字符位置。 */
    const startOffset = markdownNode.position?.start?.offset
    if (typeof startOffset !== 'number') {
      continue
    }

    /** 下一个同级或更高层标题，作为当前章节的结束边界。 */
    const nextSectionNode = topLevelNodes
      .slice(nodeIndex + 1)
      .find((candidateNode) => candidateNode.type === 'heading' && (candidateNode.depth || 7) <= markdownNode.depth)
    /** 当前章节结束字符位置；末章直接删除到文件末尾。 */
    const endOffset = nextSectionNode?.position?.start?.offset ?? markdown.length
    removalRanges.push({ startOffset, endOffset })
  }

  /** 从后向前删除，避免前一个区间的字符位置因编辑发生偏移。 */
  let optimizedMarkdown = markdown
  for (const removalRange of removalRanges.sort(
    (leftRange, rightRange) => rightRange.startOffset - leftRange.startOffset
  )) {
    optimizedMarkdown =
      optimizedMarkdown.slice(0, removalRange.startOffset) + optimizedMarkdown.slice(removalRange.endOffset)
  }

  return optimizedMarkdown.replace(/\n{4,}/g, '\n\n\n').trimEnd()
}

/**
 * 删除来源、导入日期等写作元数据，保留真正面向读者的导语。
 * @param {string} markdown 当前 Markdown。
 * @returns {string} 清理元数据后的 Markdown。
 */
function removeEditorialMetadata(markdown) {
  /** 按原顺序保留的有效 Markdown 行。 */
  const contentLines = markdown.split('\n').filter((markdownLine) => {
    /** 去掉引用符号后用于识别元数据的行内容。 */
    const normalizedLine = markdownLine.replace(/^>\s*/, '').trim()
    return !/^(?:来源|导入与重写日期|截图目录|原始路径|对应截图|可试读|主分类|关联标签|VISUAL_STRATEGY|DIAGRAM_DESCRIPTION|SCREENSHOT_DESCRIPTION)[：:]/i.test(
      normalizedLine
    )
  })

  return contentLines
    .join('\n')
    .replace(/(?:^|\n)>\s*(?=\n|$)/g, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trimEnd()
}

/**
 * 根据文章真实章节生成简短学习目标，只用于原文完全没有目标的文章。
 * @param {string} markdown 已清理的主文章 Markdown。
 * @returns {string} 补充目标后的 Markdown。
 */
function ensureLearningGoal(markdown) {
  if (LEARNING_GOAL_PATTERN.test(markdown)) {
    return markdown
  }

  /** 当前主文章的 Markdown 语法树。 */
  const markdownTree = /** @type {MarkdownNode} */ (remark().parse(markdown))
  /** 文档顶层节点。 */
  const topLevelNodes = markdownTree.children || []
  /** 文章首个一级标题节点。 */
  const titleNode = topLevelNodes.find((markdownNode) => markdownNode.type === 'heading' && markdownNode.depth === 1)
  /** 文章首个一级标题的结束字符位置。 */
  const titleEndOffset = titleNode?.position?.end?.offset

  if (!titleNode || typeof titleEndOffset !== 'number') {
    return markdown
  }

  /** 去掉旧编号后的文章标题。 */
  const articleTitle = getNodeText(titleNode)
    .replace(/^[^（）()\n]{1,80}[（(]\s*\d+\s*[）)]\s*[-—–:：]\s*/, '')
    .replace(/^\d+\s*[-—–:：]\s*/, '')
    .trim()
  /** 可用于构造学习目标的正文章节标题。 */
  const sectionHeadings = topLevelNodes
    .filter((markdownNode) => markdownNode.type === 'heading' && markdownNode !== titleNode)
    .map((markdownNode) => normalizeHeadingText(getNodeText(markdownNode)))
    .filter(
      (headingText) => headingText && !/(?:总结|参考资料|附录|动手实践|常见问题|常见错误|排障|面试)/.test(headingText)
    )
    .slice(0, 2)

  if (sectionHeadings.length === 0) {
    return markdown
  }

  /** 用真实标题和章节组成的文章开篇目标。 */
  const learningGoal =
    sectionHeadings.length === 1
      ? `> 读完你能：围绕“${articleTitle}”理解“${sectionHeadings[0]}”，并结合正文示例验证结果。`
      : `> 读完你能：围绕“${articleTitle}”理解“${sectionHeadings[0]}”与“${sectionHeadings[1]}”，并结合正文示例完成实践与排障。`

  return `${markdown.slice(0, titleEndOffset)}\n\n${learningGoal}${markdown.slice(titleEndOffset)}`
}

/**
 * 清理一篇主文章中的写作元数据、重复导航并补齐学习目标。
 * @param {string} markdown 主文章 Markdown。
 * @returns {string} 面向读者的正文。
 */
function optimizeMainArticle(markdown) {
  /** 删除编辑过程章节后的正文。 */
  const withoutEditorialSections = removeMarkdownSections(markdown, EDITORIAL_SECTION_PATTERN)
  /** 删除来源和导入记录后的正文。 */
  const withoutEditorialMetadata = removeEditorialMetadata(withoutEditorialSections)
  return ensureLearningGoal(withoutEditorialMetadata).trimEnd()
}

/**
 * 清理实验 README，并提取适合并入主文章的实践说明。
 * @param {string} markdown 实验 README Markdown。
 * @returns {{title: string, body: string}} 实践标题与正文。
 */
function optimizeLabArticle(markdown) {
  /** 实验 README 的 Markdown 语法树。 */
  const markdownTree = /** @type {MarkdownNode} */ (remark().parse(markdown))
  /** 实验 README 的首个一级标题。 */
  const titleNode = (markdownTree.children || []).find(
    (markdownNode) => markdownNode.type === 'heading' && markdownNode.depth === 1
  )
  /** 合并后显示在“动手实践”后的实验名称。 */
  const labTitle = (titleNode ? getNodeText(titleNode) : '验证核心链路')
    .replace(/^\d+\s*[-—–:：]\s*/, '')
    .replace(/\s+Demo\s*$/i, '')
    .trim()
  /** 去掉独立 Demo 标题后的实验正文。 */
  const titleEndOffset = titleNode?.position?.end?.offset
  /** 实验标题后的原始正文。 */
  const labBodyWithoutTitle =
    typeof titleEndOffset === 'number' ? markdown.slice(titleEndOffset).replace(/^\s+/, '') : markdown
  /** 删除实验写作元数据后的正文。 */
  let optimizedLabBody = removeEditorialMetadata(removeMarkdownSections(labBodyWithoutTitle, EDITORIAL_SECTION_PATTERN))

  if (GENERIC_LAB_TEMPLATE_PATTERN.test(optimizedLabBody)) {
    optimizedLabBody = removeMarkdownSections(optimizedLabBody, GENERIC_LAB_SECTION_PATTERN)
  }

  /** 删除并入主文章后失去意义的“配套文章”开场句。 */
  const contentWithoutPairingSentence = optimizedLabBody.replace(
    /^(?:本目录是|本 demo 配套|本 Demo 配套)[^\n]*(?:\n|$)/i,
    ''
  )

  return {
    title: labTitle || '验证核心链路',
    body: contentWithoutPairingSentence.replace(/\n{4,}/g, '\n\n\n').trim()
  }
}

/**
 * 找到一个实验 README 对应的唯一主文章。
 * @param {string} labReadmePath 实验 README 绝对路径。
 * @returns {string} 主文章绝对路径。
 */
function resolveMainArticlePath(labReadmePath) {
  /** lab 目录所属的课程目录。 */
  const courseDirectory = dirname(dirname(labReadmePath))
  /** 项目约定的主文章文件候选。 */
  const articleCandidates = ['chapter.md', 'course.md']
    .map((fileName) => join(courseDirectory, fileName))
    .filter((filePath) => existsSync(filePath) && statSync(filePath).isFile())

  if (articleCandidates.length !== 1) {
    throw new Error(
      `实验 README 无法确定唯一主文章：${relative(KNOWLEDGE_ROOT, labReadmePath)}，候选 ${articleCandidates.length} 个。`
    )
  }

  return articleCandidates[0]
}

/**
 * 执行一次全库正文清理和 Demo 合并迁移。
 * @returns {{optimizedArticleCount: number, mergedLabCount: number}} 本次处理数量。
 */
function optimizeKnowledgeArticles() {
  /** 知识库中的全部 Markdown 文件。 */
  const markdownFiles = findMarkdownFiles(KNOWLEDGE_ROOT)
  /** 除共享沙盒外、需要合并到主文章的实验 README。 */
  const labReadmePaths = markdownFiles.filter((filePath) => {
    /** 当前文件相对知识库的标准路径。 */
    const relativePath = relative(KNOWLEDGE_ROOT, filePath).split(sep).join('/')
    return relativePath.endsWith('/lab/README.md') && !relativePath.startsWith(`${SHARED_LAB_DIRECTORY_NAME}/`)
  })
  /** 实验 README 对应的主文章绝对路径。 */
  const mainArticleByLab = new Map(
    labReadmePaths.map((labReadmePath) => [labReadmePath, resolveMainArticlePath(labReadmePath)])
  )
  /** 需要按正文规则统一清理的非 Lab 文章。 */
  const mainArticlePaths = markdownFiles.filter((filePath) => !filePath.split(sep).includes('lab'))
  /** 主文章绝对路径到清理后 Markdown 的内存映射，检查模式也能验证完整合并结果。 */
  const optimizedMainArticleByPath = new Map()

  for (const mainArticlePath of mainArticlePaths) {
    /** 当前主文章的原始 Markdown。 */
    const originalMarkdown = readFileSync(mainArticlePath, 'utf8')
    /** 清理写作元数据并补齐学习目标后的正文。 */
    const optimizedMarkdown = optimizeMainArticle(originalMarkdown)
    optimizedMainArticleByPath.set(mainArticlePath, `${optimizedMarkdown}\n`)
    if (SHOULD_WRITE) {
      writeFileSync(mainArticlePath, `${optimizedMarkdown}\n`)
    }
  }

  for (const labReadmePath of labReadmePaths) {
    /** 当前实验对应的主文章绝对路径。 */
    const mainArticlePath = mainArticleByLab.get(labReadmePath)
    if (!mainArticlePath) {
      throw new Error(`实验 README 缺少已解析主文章：${labReadmePath}`)
    }

    /** 已清理过编辑元数据的主文章正文。 */
    const mainMarkdown = (
      optimizedMainArticleByPath.get(mainArticlePath) || readFileSync(mainArticlePath, 'utf8')
    ).trimEnd()
    /** 当前实验 README 原文。 */
    const labMarkdown = readFileSync(labReadmePath, 'utf8')
    /** 准备并入主文章的实验标题和实践说明。 */
    const optimizedLab = optimizeLabArticle(labMarkdown)
    /** 主文章中最终追加的实践章节。 */
    const mergedLabSection = [MERGED_LAB_MARKER, `# 动手实践：${optimizedLab.title}`, optimizedLab.body]
      .filter(Boolean)
      .join('\n\n')

    if (mainMarkdown.includes(MERGED_LAB_MARKER)) {
      throw new Error(`主文章已经包含实验合并标记：${relative(KNOWLEDGE_ROOT, mainArticlePath)}`)
    }

    if (SHOULD_WRITE) {
      writeFileSync(mainArticlePath, `${mainMarkdown}\n\n${mergedLabSection}\n`)
      // Demo 已完整写入主文章，删除独立 README 以避免网站再次生成重复文章；Git 可恢复原文件。
      unlinkSync(labReadmePath)
    }
  }

  return {
    optimizedArticleCount: mainArticlePaths.length,
    mergedLabCount: labReadmePaths.length
  }
}

/** 全库优化和合并的执行结果。 */
const optimizationResult = optimizeKnowledgeArticles()
console.log(
  `${SHOULD_WRITE ? '知识文章优化完成' : '知识文章优化检查通过'}：清理 ${optimizationResult.optimizedArticleCount} 篇主文章，合并 ${optimizationResult.mergedLabCount} 个 Demo。`
)
