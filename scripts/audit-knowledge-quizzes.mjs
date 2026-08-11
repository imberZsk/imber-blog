import { readdirSync, readFileSync } from 'node:fs'
import { basename, extname, join, relative, sep } from 'node:path'
import { createKnowledgeMindmap } from '../src/lib/knowledge-mindmap.ts'
import { auditKnowledgeQuizQuestions, createKnowledgeQuiz } from '../src/lib/knowledge-quiz.ts'
import { isBrowserRunnablePythonSource } from '../src/lib/knowledge-sandbox.ts'

/** 知识库 Markdown 的绝对根目录。 */
const KNOWLEDGE_CONTENT_ROOT = join(process.cwd(), 'src/content/knowledge')

/** 不生成文章页的资料目录。 */
const NON_ARTICLE_DIRECTORY_NAMES = new Set(['assets', '_shared-labs'])

/** 能被知识库读取的 Markdown 后缀。 */
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx'])

/** 扁平化后仍属于工具书、不生成课程自测与思维导图的文件名。 */
const REFERENCE_ARTICLE_FILE_PATTERN =
  /(?:陷阱对照|常用命令|速查表|疑问记录|运行指南|项目结构速查|代码审查要点|配置模板)$/

/** AI 大模型应用开发文章的稳定目录前缀。 */
const AI_APP_ARTICLE_PATH_PREFIX = '03-AI大模型应用开发/'

/** 思维导图中禁止出现的写作元数据。 */
const FORBIDDEN_MINDMAP_CONTENT_PATTERN =
  /(?:VISUAL_STRATEGY|DIAGRAM_DESCRIPTION|SCREENSHOT_DESCRIPTION|可视化规格|作者自审|下一篇)/

/** 文章中不应继续展示的写作过程元数据。 */
const FORBIDDEN_ARTICLE_CONTENT_PATTERN =
  /^(?:#{1,6}\s+(?:可视化规格|作者自审|下一篇|继续阅读|相关阅读)|>\s*)?(?:主分类|关联标签|VISUAL_STRATEGY|DIAGRAM_DESCRIPTION|SCREENSHOT_DESCRIPTION)[：:]/m

/** 非参考资料必须明确告诉读者学完可以做到什么。 */
const LEARNING_GOAL_PATTERN = /(?:读完你能|学完你能|学习目标|一句话目标|本章目标|你将学会|目标[：:])/i

/** 短于该长度的正文不足以独立解释一个知识点。 */
const MIN_PROSE_CHARACTER_COUNT = 300

/** 普通课程的非代码字符上限，避免单页阅读负担过重。 */
const MAX_ARTICLE_PROSE_CHARACTER_COUNT = 7500

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

/** 成功生成知识点思维导图的文章数量。 */
let mindmapArticleCount = 0

/** 成功生成知识点思维导图的 AI 应用开发文章数量。 */
let aiAppMindmapArticleCount = 0

/** 可由文章页 Pyodide Worker 直接执行的 Python Lab 数量。 */
let browserRunnablePythonLabCount = 0

/** 因启动服务或依赖外部环境而必须本地运行的 Python Lab 数量。 */
let browserIncompatiblePythonLabCount = 0

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
 * 去掉路径分段前的排序编号。
 * @param pathSegment 可能含两位排序号的目录名。
 * @returns 用于识别“附录”的展示名称。
 */
function getDisplayName(pathSegment) {
  return pathSegment.replace(/^\d{2}[-_\s]*/, '')
}

/**
 * 识别文章是学习指南、课程、实验还是参考资料。
 * @param sourceArticlePath 不含扩展名的知识库相对路径。
 * @returns 与页面构建一致的文章用途。
 */
function getArticleKind(sourceArticlePath) {
  /** 源文章路径的全部分段。 */
  const pathSegments = sourceArticlePath.split('/')
  /** 源文章的无扩展名文件名。 */
  const fileName = pathSegments.at(-1) || ''

  if (
    fileName.startsWith('00-') ||
    fileName === 'course' ||
    fileName.endsWith('-学习指南') ||
    sourceArticlePath === 'index'
  ) {
    return 'guide'
  }

  if (pathSegments.includes('lab')) {
    return 'practice'
  }

  if (
    fileName.startsWith('98-') ||
    fileName.startsWith('99-') ||
    pathSegments.some((pathSegment) => pathSegment.startsWith('98-') || pathSegment.startsWith('99-')) ||
    pathSegments.includes('appendices') ||
    pathSegments.some((pathSegment) => getDisplayName(pathSegment) === '附录') ||
    pathSegments.includes('extras') ||
    pathSegments.includes('raw') ||
    REFERENCE_ARTICLE_FILE_PATTERN.test(fileName.replace(/^\d{2}[-_\s]*/, ''))
  ) {
    return 'reference'
  }

  return 'lesson'
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
  const articleKind = getArticleKind(sourceArticlePath)
  /** 排除代码块后的解释性正文字符数。 */
  const proseCharacterCount = countProseCharacters(markdown)
  /** 当前文章用途允许的正文字符上限。 */
  const maximumProseCharacterCount =
    articleKind === 'reference' ? MAX_REFERENCE_PROSE_CHARACTER_COUNT : MAX_ARTICLE_PROSE_CHARACTER_COUNT
  /** 题干使用的文章主题。 */
  const articleTitle = getArticleTitle(markdown, sourceArticlePath)
  /** 当前文章是否属于 AI 大模型应用开发主线。 */
  const isAiAppArticle = sourceArticlePath.startsWith(AI_APP_ARTICLE_PATH_PREFIX)

  articleKindCounts[articleKind] += 1

  if (proseCharacterCount < MIN_PROSE_CHARACTER_COUNT) {
    auditFailures.push(
      `${articlePath} 正文只有 ${proseCharacterCount} 个非代码字符，低于 ${MIN_PROSE_CHARACTER_COUNT} 字。`
    )
  }
  if (proseCharacterCount > maximumProseCharacterCount) {
    auditFailures.push(
      `${articlePath} 正文有 ${proseCharacterCount} 个非代码字符，超过 ${maximumProseCharacterCount} 字上限。`
    )
  }
  if (FORBIDDEN_ARTICLE_CONTENT_PATTERN.test(markdown)) {
    auditFailures.push(`${articlePath} 仍包含写作过程元数据。`)
  }
  if (articleKind !== 'reference' && !LEARNING_GOAL_PATTERN.test(markdown)) {
    auditFailures.push(`${articlePath} 缺少明确的学习目标。`)
  }
  if (hasUnclosedCodeFence(markdown)) {
    auditFailures.push(`${articlePath} 存在未闭合的 fenced code block。`)
  }

  try {
    /** 按页面构建逻辑得到的最终自测题。 */
    const questions = createKnowledgeQuiz(articlePath, markdown, articleTitle, articleKind)
    /** 二次调用纯审计器，确保脚本即使未来调整生成入口也不会失效。 */
    const articleAuditIssues = auditKnowledgeQuizQuestions(articlePath, articleKind, questions)

    auditFailures.push(...articleAuditIssues.map((auditIssue) => auditIssue.message))

    if (questions.length === 0) {
      skippedQuizArticleCount += 1
    } else if (questions.some((question) => question.id !== 'article-engineering-review')) {
      curatedQuizArticleCount += 1
    } else {
      generatedQuizArticleCount += 1
    }

    /** 按页面构建规则生成的文章知识点思维导图。 */
    const mindmap = createKnowledgeMindmap(markdown, articleTitle, isAiAppArticle, articleKind)
    if (articleKind === 'reference') {
      if (mindmap) {
        auditFailures.push(`${articlePath} 是参考资料，不应生成知识点思维导图。`)
      }
    } else if (!mindmap) {
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
    `Python 在线实验 ${browserRunnablePythonLabCount} 篇，本地服务型示例 ${browserIncompatiblePythonLabCount} 篇。`
  )
}
