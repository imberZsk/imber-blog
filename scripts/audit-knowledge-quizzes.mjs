import { readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, extname, join, relative, sep } from 'node:path'
import { remark } from 'remark'
import { getKnowledgeArticleKind } from '../src/lib/knowledge-article-kind.ts'
import { createKnowledgeMindmap } from '../src/lib/knowledge-mindmap.ts'
import { auditKnowledgeQuizQuestions, createKnowledgeQuiz } from '../src/lib/knowledge-quiz.ts'
import { isBrowserRunnablePythonSource, isInlinePythonSandboxCandidate } from '../src/lib/knowledge-sandbox.ts'

/** 知识库 Markdown 的绝对根目录。 */
const KNOWLEDGE_CONTENT_ROOT = join(process.cwd(), 'src/content/knowledge')

/** 不生成文章页的资料目录。 */
const NON_ARTICLE_DIRECTORY_NAMES = new Set(['assets', '_shared-labs'])

/** 能被知识库读取的 Markdown 后缀。 */
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx'])

/** AI 大模型应用开发文章的稳定目录前缀。 */
const AI_APP_ARTICLE_PATH_PREFIX = '03-AI大模型应用开发/'

/** 思维导图中禁止出现的写作元数据。 */
const FORBIDDEN_MINDMAP_CONTENT_PATTERN =
  /(?:VISUAL_STRATEGY|DIAGRAM_DESCRIPTION|SCREENSHOT_DESCRIPTION|可视化规格|作者自审|下一篇)|(?:^|\n)- (?:如下图|图示说明|接下来|下面|上面|当前|这就是|下一课|下一章|继续阅读|现象[：:]常见根因|环节[：:]要回答的问题)|(?:\.\.\.|…)$/m

/** 文章中不应展示的分类和写作流程元数据；图示说明属于桌面文章规范要求。 */
const FORBIDDEN_ARTICLE_CONTENT_PATTERN =
  /^(?:#{1,6}\s+(?:可视化规格|作者自审|下一篇|继续阅读|相关阅读)|>\s*)?(?:主分类|关联标签|VISUAL_STRATEGY)[：:]/m

/** 非参考资料必须明确告诉读者学完可以做到什么。 */
const LEARNING_GOAL_PATTERN =
  /(?:读完你能|读完后[，,]?你应能|学完你能|学习目标|一句话目标|本章目标|你将学会|目标[：:])/i

/** 批量标题改写形成的学习目标没有动作、产物与验收证据。 */
const GENERIC_LEARNING_GOAL_PATTERN =
  /(?:核心对象、职责和失败边界|围绕“[^”]+”完成一次可解释、可验证、可回滚的工程判断|复述本主题的关键数据流|能按顺序说明“[^”]+”的关键阶段|能根据“[^”]+”给出的条件做出方案选择)/

/** 学习产出中可以被检查的交付物或运行证据。 */
const LEARNING_OUTCOME_EVIDENCE_PATTERN =
  /(?:代码|配置|表格|记录|日志|测试|报告|指标|Trace|Diff|输出|结果|样本|引用|命令|截图|证据)/i

/**
 * 判断正文是否有 2～4 条同时包含动作与证据的学习产出。
 * @param markdown 当前文章正文。
 * @returns 学习产出是否可执行、可验收。
 */
function hasSpecificLearningOutcomes(markdown) {
  /** 标题后的学习产出引用块。 */
  const goalMatch = markdown.match(/^>\s*(?:读完|学完)[^\n]*\n((?:^>\s*-.*\n?){2,4})/m)
  /** 引用块中的逐项目标。 */
  const goalItems = goalMatch ? [...goalMatch[1].matchAll(/^>\s*-\s*(.+)$/gm)].map((match) => match[1].trim()) : []
  return (
    goalItems.length >= 2 &&
    goalItems.length <= 4 &&
    goalItems.every(
      (goalItem) =>
        /(?:能|完成|生成|输出|实现|配置|排查|验证|设计|绘制|解释|检验)/.test(goalItem) &&
        LEARNING_OUTCOME_EVIDENCE_PATTERN.test(goalItem)
    )
  )
}

/** 非参考资料类 AI 应用文章必须达到的最少物理行数。 */
const MIN_AI_APP_ARTICLE_LINE_COUNT = 200

/** 短于该长度的正文不足以独立解释一个知识点。 */
const MIN_PROSE_CHARACTER_COUNT = 300

/** AI 应用学习指南需要覆盖路径、边界、实践、风险和验收，使用更高的内容下限。 */
const MIN_AI_APP_GUIDE_PROSE_CHARACTER_COUNT = 800

/** AI 应用学习指南的知识地图至少需要覆盖主要学习分支和关键节点。 */
const MIN_AI_APP_GUIDE_MINDMAP_NODE_COUNT = 12

/** 98、99 是扩展阅读和模板保留号，不参与普通课程连续性审计。 */
const FIRST_RESERVED_ARTICLE_ORDER = 98

/** 长篇课程允许容纳完整机制、代码解释和失败验收；超出后应拆篇而不是截断。 */
const MAX_ARTICLE_PROSE_CHARACTER_COUNT = 14000

/** 附录和速查表需要保留完整映射，因此使用更高的长度上限。 */
const MAX_REFERENCE_PROSE_CHARACTER_COUNT = 14000

/** 构建期需要统计的文章用途。 */
const ARTICLE_KINDS = ['guide', 'lesson', 'practice', 'reference']

/** 每种文章用途的扫描数量。 */
const articleKindCounts = Object.fromEntries(ARTICLE_KINDS.map((articleKind) => [articleKind, 0]))

/** 使用人工设计题的文章数量。 */
let curatedQuizArticleCount = 0

/** 使用正文证据生成题的文章数量。 */
let generatedQuizArticleCount = 0

/** 因属于指南或资料而不出题的文章数量。 */
let skippedQuizArticleCount = 0

/** 全部课程与实验最终展示的题目总数。 */
let totalQuizQuestionCount = 0

/** 按文章去重后累计覆盖的正文知识点数量。 */
let totalCoveredKnowledgePointCount = 0

/** 纯题目质量审计发现的问题数量。 */
let quizAuditIssueCount = 0

/** 成功生成知识点思维导图的文章数量。 */
let mindmapArticleCount = 0

/** 全库题干到文章来源的映射，用于发现跨文章复制。 */
const quizPromptArticlePaths = new Map()

/** 全库选项到文章来源的映射，用于发现万能正确项或干扰项。 */
const quizOptionArticlePaths = new Map()

/** 同一题干或选项允许在相关课程中复用的最大文章数。 */
const MAX_CROSS_ARTICLE_QUIZ_REUSE_COUNT = 5

/** 成功生成知识点思维导图的 AI 应用开发文章数量。 */
let aiAppMindmapArticleCount = 0

/** 可由文章页 Pyodide Worker 直接执行的 Python Lab 数量。 */
let browserRunnablePythonLabCount = 0

/** 因启动服务或依赖外部环境而必须本地运行的 Python Lab 数量。 */
let browserIncompatiblePythonLabCount = 0

/** 从正文完整代码块自动接入的 Python 在线实验数量。 */
let inlinePythonSandboxCount = 0

/** 全库审计发现的问题。 */
const auditFailures = []

/**
 * 统计所有 Python Lab 的浏览器运行覆盖范围。
 * @param directory 当前需要递归扫描的知识目录。
 */
function auditPythonLabSandboxCoverage(directory) {
  for (const directoryEntry of readdirSync(directory, { withFileTypes: true })) {
    /** 当前目录项的绝对路径。 */
    const entryPath = join(directory, directoryEntry.name)
    if (!directoryEntry.isDirectory()) {
      continue
    }

    if (directoryEntry.name === '_shared-labs') {
      continue
    }

    if (directoryEntry.name === 'lab') {
      /** 当前 Lab 约定使用的 Python 入口。 */
      const mainFilePath = join(entryPath, 'main.py')
      try {
        /** 用于判定 Pyodide 兼容性的完整入口源码。 */
        const mainSourceCode = readFileSync(mainFilePath, 'utf8')
        if (isBrowserRunnablePythonSource(mainSourceCode)) {
          browserRunnablePythonLabCount += 1
          /** 可结束运行的入口必须写回文章，避免页面源码依赖隐藏的外部副本。 */
          const labPath = relative(KNOWLEDGE_CONTENT_ROOT, entryPath).split(sep).join('/')
          auditFailures.push(`${labPath}/main.py 可在浏览器运行，但仍未合并进正文。`)
        } else {
          browserIncompatiblePythonLabCount += 1
        }
      } catch (error) {
        /** 不存在 main.py 的 HTML 或配置类 Lab 不参与 Python 覆盖率统计。 */
        const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : null
        if (errorCode !== 'ENOENT') {
          throw error
        }
      }
      continue
    }

    auditPythonLabSandboxCoverage(entryPath)
  }
}

/**
 * 递归找出与网站构建规则一致的文章 Markdown。
 * @param directory 当前需要扫描的绝对目录。
 * @returns 可生成文章页的 Markdown 绝对路径。
 */
function findArticleMarkdownFiles(directory) {
  /** 当前目录及其子目录中的文章文件。 */
  const articleFiles = []

  for (const directoryEntry of readdirSync(directory, { withFileTypes: true })) {
    /** 当前目录项的绝对路径。 */
    const entryPath = join(directory, directoryEntry.name)

    if (directoryEntry.isDirectory()) {
      /** 当前目录是否只保存配图、共享实验或已并入正文的 Lab 源码。 */
      const shouldSkipDirectory = NON_ARTICLE_DIRECTORY_NAMES.has(directoryEntry.name) || directoryEntry.name === 'lab'

      if (!shouldSkipDirectory) {
        articleFiles.push(...findArticleMarkdownFiles(entryPath))
      }
      continue
    }

    /** 当前文件是否使用知识库支持的 Markdown 后缀。 */
    const isMarkdownFile = MARKDOWN_EXTENSIONS.has(extname(directoryEntry.name).toLowerCase())
    if (directoryEntry.isFile() && isMarkdownFile) {
      articleFiles.push(entryPath)
    }
  }

  return articleFiles
}

/**
 * 查找仍未合并进正文的独立 Demo README。
 * @param directory 当前需要扫描的绝对目录。
 * @returns 非共享沙盒目录中的 Demo README 绝对路径。
 */
function findUnmergedLabReadmes(directory) {
  /** 当前目录及子目录中的未合并 Demo README。 */
  const unmergedLabReadmes = []

  for (const directoryEntry of readdirSync(directory, { withFileTypes: true })) {
    /** 当前目录项的绝对路径。 */
    const entryPath = join(directory, directoryEntry.name)

    if (!directoryEntry.isDirectory()) {
      continue
    }

    if (directoryEntry.name === '_shared-labs') {
      continue
    }

    if (directoryEntry.name === 'lab') {
      /** 当前 Lab 目录下是否仍存在对外展示的独立 README。 */
      const hasReadme = readdirSync(entryPath, { withFileTypes: true }).some(
        (labEntry) => labEntry.isFile() && labEntry.name === 'README.md'
      )
      if (hasReadme) {
        unmergedLabReadmes.push(join(entryPath, 'README.md'))
      }
      continue
    }

    unmergedLabReadmes.push(...findUnmergedLabReadmes(entryPath))
  }

  return unmergedLabReadmes
}

/**
 * 计算正文中不含代码块和空白的字符数。
 * @param markdown 当前文章完整 Markdown。
 * @returns 用于约束阅读篇幅的正文字符数。
 */
function countProseCharacters(markdown) {
  /** 删除 fenced code block 后只保留解释性正文。 */
  const proseMarkdown = markdown.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '')
  return proseMarkdown.replace(/\s/g, '').length
}

/**
 * 检查 Markdown 围栏代码块是否成对闭合。
 * @param markdown 当前文章完整 Markdown。
 * @returns 是否存在未闭合的反引号或波浪线代码块。
 */
function hasUnclosedCodeFence(markdown) {
  /** 使用反引号声明的代码围栏数量。 */
  const backtickFenceCount = markdown.match(/^```/gm)?.length || 0
  /** 使用波浪线声明的代码围栏数量。 */
  const tildeFenceCount = markdown.match(/^~~~/gm)?.length || 0
  return backtickFenceCount % 2 !== 0 || tildeFenceCount % 2 !== 0
}

/**
 * 返回没有正文或子章节的 Markdown 标题。
 * @param markdown 当前文章完整 Markdown。
 * @returns 需要作者补充或删除的空标题文本。
 */
function findEmptySectionHeadings(markdown) {
  /** Remark 解析后的顶层 Markdown 节点。 */
  const markdownTree = remark().parse(markdown)
  /** 当前文章中没有承载任何内容的章节标题。 */
  const emptySectionHeadings = []
  /** 文档第一个标题是文章标题，不作为可为空的正文章节。 */
  const articleTitleNodeIndex = (markdownTree.children || []).findIndex(
    (markdownNode) => markdownNode.type === 'heading'
  )

  for (const [nodeIndex, markdownNode] of (markdownTree.children || []).entries()) {
    if (markdownNode.type !== 'heading' || nodeIndex === articleTitleNodeIndex) {
      continue
    }

    /** 当前标题之后的第一个顶层节点。 */
    const nextMarkdownNode = markdownTree.children?.[nodeIndex + 1]
    /** 同级或更高层标题表示当前章节在开始正文前已经结束。 */
    const isEmptySection =
      !nextMarkdownNode || (nextMarkdownNode.type === 'heading' && nextMarkdownNode.depth <= markdownNode.depth)
    if (!isEmptySection) {
      continue
    }

    /** 当前空章节用于审计提示的纯文本标题。 */
    const headingText = (markdownNode.children || [])
      .map((childNode) => childNode.value || '')
      .join('')
      .trim()
    emptySectionHeadings.push(headingText || '未命名标题')
  }

  return emptySectionHeadings
}

/**
 * 审计所有“指南占 01”的目录是否存在同号或缺号。
 * @param guideFilePath 01-学习指南.md 的绝对路径。
 */
function auditGuideSiblingSequence(guideFilePath) {
  /** 指南与后续课程共同所在的系列目录。 */
  const guideDirectory = dirname(guideFilePath)
  /** 系列目录中按课号归组的 Markdown 和子目录名称。 */
  const entryNamesByOrder = new Map()

  for (const directoryEntry of readdirSync(guideDirectory, { withFileTypes: true })) {
    /** 文章文件旁仅承载沙盒源码的同名目录不代表另一篇课程。 */
    const isSandboxOwnerDirectory =
      directoryEntry.isDirectory() &&
      readdirSync(join(guideDirectory, directoryEntry.name), { withFileTypes: true }).every(
        (childEntry) => childEntry.name === 'lab'
      )
    if (isSandboxOwnerDirectory) {
      continue
    }

    /** 当前目录项是否属于网站可读取的课程或子目录。 */
    const isKnowledgeEntry =
      directoryEntry.isDirectory() ||
      (directoryEntry.isFile() && MARKDOWN_EXTENSIONS.has(extname(directoryEntry.name).toLowerCase()))
    if (!isKnowledgeEntry) {
      continue
    }

    /** 当前目录项名称中声明的两位课程号。 */
    const orderMatch = directoryEntry.name.match(/^(\d+)-/)
    /** 当前目录项的数字课号；无课号资料不参与连续性判断。 */
    const articleOrder = orderMatch ? Number.parseInt(orderMatch[1], 10) : null
    if (articleOrder === null || articleOrder >= FIRST_RESERVED_ARTICLE_ORDER) {
      continue
    }

    /** 与当前课号重复的目录或文件名称。 */
    const entryNames = entryNamesByOrder.get(articleOrder) || []
    entryNames.push(directoryEntry.name)
    entryNamesByOrder.set(articleOrder, entryNames)
  }

  /** 系列目录相对知识根目录的稳定路径。 */
  const guideDirectoryPath = relative(KNOWLEDGE_CONTENT_ROOT, guideDirectory).split(sep).join('/')
  for (const [articleOrder, entryNames] of entryNamesByOrder) {
    if (entryNames.length > 1) {
      auditFailures.push(
        `${guideDirectoryPath} 的 ${articleOrder.toString().padStart(2, '0')} 课号重复：${entryNames.join('、')}。`
      )
    }
  }

  /** 当前系列普通课程实际使用的最大课号。 */
  const maximumArticleOrder = Math.max(0, ...entryNamesByOrder.keys())
  for (let expectedOrder = 1; expectedOrder <= maximumArticleOrder; expectedOrder += 1) {
    if (!entryNamesByOrder.has(expectedOrder)) {
      auditFailures.push(
        `${guideDirectoryPath} 缺少 ${expectedOrder.toString().padStart(2, '0')} 课号，指南和正文必须从 01 连续编号。`
      )
    }
  }
}

/**
 * 统计当前正文会被页面自动转换为沙盒的 Python 代码块。
 * @param sourceArticlePath 当前文章无扩展名的知识库相对路径。
 * @param markdown 当前文章完整 Markdown。
 * @returns 当前文章的正文自动 Python 实验数量。
 */
function countInlinePythonSandboxes(sourceArticlePath, markdown) {
  /** Remark 解析后的顶层 Markdown 节点。 */
  const markdownTree = remark().parse(markdown)
  /** 遍历时最近的标题，用于判断代码是否明确声明可运行。 */
  let currentHeading = '正文 Python 示例'
  /** 当前代码块所属“可运行源码”章节的标题。 */
  let runnableSourceHeading = ''
  /** 当前文章符合自动沙盒规则的代码块数量。 */
  let sandboxCount = 0

  for (const markdownNode of markdownTree.children || []) {
    if (markdownNode.type === 'heading') {
      currentHeading = (markdownNode.children || [])
        .map((childNode) => childNode.value || '')
        .join('')
        .replace(/^(?:[一-十]+|\d+)[、.\s．-]*/, '')
        .trim()
      if (/可运行源码/.test(currentHeading)) {
        runnableSourceHeading = currentHeading
      } else if (markdownNode.depth <= 2) {
        runnableSourceHeading = ''
      }
      continue
    }

    /** 当前顶层节点是否为明确标注语言的 Python 代码块。 */
    const isPythonCodeBlock = markdownNode.type === 'code' && /^(?:python|py)$/i.test(markdownNode.lang || '')
    if (
      isPythonCodeBlock &&
      markdownNode.value &&
      isInlinePythonSandboxCandidate(
        sourceArticlePath,
        runnableSourceHeading || currentHeading,
        markdownNode.value.trim()
      )
    ) {
      sandboxCount += 1
      /** 一个源码章节只生成一个多文件沙盒。 */
      if (runnableSourceHeading) {
        runnableSourceHeading = ''
      }
    }
  }

  return sandboxCount
}

/**
 * 从 Markdown 首个一级标题提取审计用标题。
 * @param markdown 当前文章完整 Markdown。
 * @param sourceArticlePath 当前文章无扩展名相对路径。
 * @returns 自测题题干使用的主题名称。
 */
function getArticleTitle(markdown, sourceArticlePath) {
  /** Markdown 中首个一级标题。 */
  const headingMatch = markdown.match(/^#\s+(.+)$/m)
  /** 找不到一级标题时使用文件名兜底。 */
  const rawTitle = headingMatch?.[1]?.trim() || basename(sourceArticlePath)

  return rawTitle
    .replace(/^[（(]\s*\d{1,2}\s*[）)]\s*[-—–:：]?\s*/, '')
    .replace(/^\d{1,2}\s*[-—–:：]\s*/, '')
    .replace(/^学习指南\s*[:：]\s*/, '')
    .trim()
}

/**
 * 将目录入口文件转换为网站实际使用的公开文章路径。
 * @param sourceArticlePath 当前文章无扩展名相对路径。
 * @returns 传给题库的稳定公开路径。
 */
function getPublicArticlePath(sourceArticlePath) {
  return sourceArticlePath.endsWith('/chapter') ? sourceArticlePath.slice(0, -'/chapter'.length) : sourceArticlePath
}

/** 全部可发布文章的 Markdown 绝对路径。 */
const articleFiles = findArticleMarkdownFiles(KNOWLEDGE_CONTENT_ROOT)
/** 仍以独立页面形式存在、必须合并回正文的 Demo README。 */
const unmergedLabReadmes = findUnmergedLabReadmes(KNOWLEDGE_CONTENT_ROOT)

for (const guideFilePath of articleFiles.filter((articleFile) => basename(articleFile) === '01-学习指南.md')) {
  auditGuideSiblingSequence(guideFilePath)
}

for (const unmergedLabReadme of unmergedLabReadmes) {
  /** 便于开发者定位的知识库相对路径。 */
  const unmergedLabPath = relative(KNOWLEDGE_CONTENT_ROOT, unmergedLabReadme).split(sep).join('/')
  auditFailures.push(`${unmergedLabPath} 仍是独立 Demo 页面，必须合并进对应正文。`)
}

for (const articleFile of articleFiles) {
  /** 使用正斜杠且不含扩展名的源文章路径。 */
  const sourceArticlePath = relative(KNOWLEDGE_CONTENT_ROOT, articleFile)
    .split(sep)
    .join('/')
    .replace(/\.(?:md|mdx)$/i, '')
  /** 目录入口文件折叠后的公开文章路径。 */
  const articlePath = getPublicArticlePath(sourceArticlePath)
  /** 当前文章的完整 Markdown。 */
  const markdown = readFileSync(articleFile, 'utf8')
  /** 当前文章在学习路径中的用途。 */
  const articleKind = getKnowledgeArticleKind(sourceArticlePath)
  /** 题干使用的文章主题。 */
  const articleTitle = getArticleTitle(markdown, sourceArticlePath)
  /** 当前文章是否属于 AI 大模型应用开发主线。 */
  const isAiAppArticle = sourceArticlePath.startsWith(AI_APP_ARTICLE_PATH_PREFIX)

  articleKindCounts[articleKind] += 1
  inlinePythonSandboxCount += countInlinePythonSandboxes(sourceArticlePath, markdown)

  if (hasUnclosedCodeFence(markdown)) {
    auditFailures.push(`${articlePath} 存在未闭合的 fenced code block。`)
  }

  try {
    /** 按页面构建逻辑得到的最终自测题。 */
    const questions = createKnowledgeQuiz(articlePath, markdown, articleTitle, articleKind)
    /** 二次调用纯审计器，确保脚本即使未来调整生成入口也不会失效。 */
    const articleAuditIssues = auditKnowledgeQuizQuestions(articlePath, articleKind, questions)

    auditFailures.push(...articleAuditIssues.map((auditIssue) => auditIssue.message))
    quizAuditIssueCount += articleAuditIssues.length
    totalQuizQuestionCount += questions.length
    for (const question of questions) {
      /** 当前题干已经出现过的文章集合。 */
      const promptArticlePaths = quizPromptArticlePaths.get(question.prompt) || new Set()
      promptArticlePaths.add(articlePath)
      quizPromptArticlePaths.set(question.prompt, promptArticlePaths)
      for (const option of question.options) {
        /** 当前选项已经出现过的文章集合。 */
        const optionArticlePaths = quizOptionArticlePaths.get(option.label) || new Set()
        optionArticlePaths.add(articlePath)
        quizOptionArticlePaths.set(option.label, optionArticlePaths)
      }
    }
    /** 当前文章题组覆盖且去重后的正文知识点。 */
    const coveredKnowledgePoints = new Set(
      questions.flatMap((question) => question.knowledgePoints || []).map((knowledgePoint) => knowledgePoint.trim())
    )
    totalCoveredKnowledgePointCount += coveredKnowledgePoints.size

    if (questions.length === 0) {
      skippedQuizArticleCount += 1
    } else if (questions.some((question) => !question.id.startsWith('article-core-'))) {
      curatedQuizArticleCount += 1
    } else {
      generatedQuizArticleCount += 1
    }

    /** 按页面构建规则生成的文章知识点思维导图。 */
    const mindmap = createKnowledgeMindmap(markdown, articleTitle, isAiAppArticle, articleKind)
    if (!mindmap) {
      auditFailures.push(`${articlePath} 缺少至少两个包含有效知识点的思维导图分支。`)
    } else {
      if (mindmap.nodeCount < 5) {
        auditFailures.push(`${articlePath} 的思维导图节点不足，实际为 ${mindmap.nodeCount} 个。`)
      }
      if (FORBIDDEN_MINDMAP_CONTENT_PATTERN.test(mindmap.markdown)) {
        auditFailures.push(`${articlePath} 的思维导图混入写作元数据。`)
      }

      mindmapArticleCount += 1
      if (isAiAppArticle) {
        aiAppMindmapArticleCount += 1
      }
    }
  } catch (error) {
    /** 无法生成合格题目时保留文章路径和具体错误。 */
    const failureMessage = error instanceof Error ? error.message : String(error)
    auditFailures.push(`${articlePath}: ${failureMessage}`)
  }
}

auditPythonLabSandboxCoverage(KNOWLEDGE_CONTENT_ROOT)

for (const [prompt, articlePaths] of quizPromptArticlePaths) {
  if (articlePaths.size <= MAX_CROSS_ARTICLE_QUIZ_REUSE_COUNT) continue
  /** 重复题干的少量来源示例。 */
  const sourceExamples = [...articlePaths].slice(0, 3).join('、')
  auditFailures.push(`同一题干跨 ${articlePaths.size} 篇文章重复：“${prompt}”；示例：${sourceExamples}。`)
}

for (const [option, articlePaths] of quizOptionArticlePaths) {
  if (articlePaths.size <= MAX_CROSS_ARTICLE_QUIZ_REUSE_COUNT) continue
  /** 重复选项的少量来源示例。 */
  const sourceExamples = [...articlePaths].slice(0, 3).join('、')
  auditFailures.push(`同一选项跨 ${articlePaths.size} 篇文章重复：“${option}”；示例：${sourceExamples}。`)
}

/** 实际拥有题目的课程与实验文章数量。 */
const assessableQuizArticleCount = curatedQuizArticleCount + generatedQuizArticleCount
/** 按文章用途计算出的应当拥有自测题的文章数量。 */
const expectedAssessableQuizArticleCount = articleKindCounts.lesson + articleKindCounts.practice
/** 每篇可评测文章的平均题数。 */
const averageQuizQuestionCount =
  assessableQuizArticleCount === 0 ? 0 : totalQuizQuestionCount / assessableQuizArticleCount

console.log(
  `自测题覆盖：${assessableQuizArticleCount} 篇课程与实验，共 ${totalQuizQuestionCount} 题，平均每篇 ${averageQuizQuestionCount.toFixed(2)} 题，累计覆盖 ${totalCoveredKnowledgePointCount} 个正文知识点。`
)
if (quizAuditIssueCount === 0 && assessableQuizArticleCount === expectedAssessableQuizArticleCount) {
  console.log('自测题质量门禁通过：全部课程与实验均满足题数、选项、解析和核心知识覆盖要求。')
}

if (auditFailures.length > 0) {
  console.error(`知识内容审计失败，共 ${auditFailures.length} 个问题：`)
  for (const auditFailure of auditFailures) {
    console.error(`- ${auditFailure}`)
  }
  process.exitCode = 1
} else {
  console.log(`知识内容审计通过：共扫描 ${articleFiles.length} 篇文章。`)
  console.log(
    `课程 ${articleKindCounts.lesson} 篇，实验 ${articleKindCounts.practice} 篇，指南 ${articleKindCounts.guide} 篇，参考资料 ${articleKindCounts.reference} 篇。`
  )
  console.log(
    `人工题 ${curatedQuizArticleCount} 篇，正文证据题 ${generatedQuizArticleCount} 篇，不强行出题 ${skippedQuizArticleCount} 篇。`
  )
  console.log(`知识点思维导图 ${mindmapArticleCount} 篇，其中 AI 应用开发 ${aiAppMindmapArticleCount} 篇。`)
  console.log(
    `Python Lab 在线实验 ${browserRunnablePythonLabCount} 篇，正文自动 Python 实验 ${inlinePythonSandboxCount} 个，本地服务型示例 ${browserIncompatiblePythonLabCount} 篇。`
  )
}
