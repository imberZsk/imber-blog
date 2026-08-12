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
  /^(?:学习目标|学习边界|在线运行|页面运行|本地查看|预期输出(?:（节选）)?|重点观察|动手实践|动手改|参考资料)$/

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
    /** 当前文章已有的有效知识点数量。 */
    let currentKnowledgePointCount = 0

    const flushArticle = () => {
      if (currentArticleTitle && currentKnowledgePointCount === 0) {
        failures.push(`${fileName} 的“${currentArticleTitle}”没有有效知识点。`)
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

      /** 文章下的知识点或来源行。 */
      const pointMatch = line.match(/^    - (.+)$/)
      if (!pointMatch || /^\[来源：/.test(pointMatch[1])) continue
      if (GENERIC_MINDMAP_POINT_PATTERN.test(pointMatch[1])) {
        failures.push(`${fileName} 的“${currentArticleTitle}”使用了通用操作标签：${pointMatch[1]}`)
      } else {
        currentKnowledgePointCount += 1
      }
    }
    flushArticle()
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
auditPathMigrations(articlePaths)
auditModuleSequences(articlePaths)

if (failures.length > 0) {
  console.error(`知识质量审计失败，共 ${failures.length} 项：`)
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exitCode = 1
} else {
  console.log(`知识质量审计通过：${articleFiles.length} 篇文章与三张思维导图严格一一对应。`)
}
