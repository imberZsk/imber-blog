import fs from 'node:fs'
import path from 'node:path'

/** 正式知识文章根目录。 */
const KNOWLEDGE_ROOT = path.join(process.cwd(), 'src', 'content', 'knowledge')

/** 审查报告默认写入桌面，方便后续人工复核。 */
const REPORT_FILE = '/Users/imber/Desktop/文章主题衔接审查.md'

/** 不作为文章主题的目录。 */
const NON_ARTICLE_DIRECTORIES = new Set(['assets', '_shared-labs', 'lab', 'data', 'docs', 'static', 'tests'])

/** 标题中表示同一条处理链的关系词。 */
const CHAIN_SIGNAL_PATTERN = /从|到|与|和|及|边界|流程|闭环|选型|协议|生命周期|治理|优化|排障|故障|调用|部署|评测|验收|缓存|预算|生成|解析|索引|分块|检索|执行循环|实现|交互|方案|middleware|\+|：/i

/** 显式记录本轮真正拆分的旧标题及其新职责，避免审查结果只剩关键词。 */
const SPLIT_DECISIONS = [{
  oldTitle: '大模型基础（01） - Token、上下文窗口与生成机制',
  reason: 'Tokenizer 输入契约、上下文预算和自回归生成分别拥有独立对象、独立最小实践和独立验收指标。',
  newTitles: [
    '大模型基础（01） - Token 与 Tokenizer：文本如何变成模型输入',
    '大模型基础（02） - 上下文窗口与长上下文：预算、裁剪和位置偏差',
    '大模型基础（03） - 自回归生成与采样延迟：从 Logit 到首 Token'
  ]
}]

/** 显式记录改成链路标题而不是拆分的文章，防止把同一调用链误拆成碎片。 */
const RETITLED_CHAINS = [
  ['大模型基础（10） - 从能力选型到可靠调用：模型能力、消息协议与 API 稳定性', '能力选择、消息契约和失败恢复是同一条模型调用链。'],
  ['大模型基础（11） - 多模态输入任务选型：OCR、ASR、TTS 与视觉模型边界', 'OCR、ASR、TTS 和视觉模型共同回答输入类型与生产验收边界。'],
  ['模型工程（06） - 从数学基础到训练评测：模型工程的必要知识', '数学、学习和评测按前置知识到发布验收形成递进关系。'],
  ['生产工程（08） - AI 应用成本控制：Token、缓存与模型分级', 'Token 计费、缓存命中和模型分级都是成本控制决策链。']
]

/** 递归收集正式 Markdown 文章。 */
function findArticleFiles(directory) {
  /** 当前目录下发现的文章文件。 */
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    /** 当前目录项绝对路径。 */
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (!NON_ARTICLE_DIRECTORIES.has(entry.name)) files.push(...findArticleFiles(entryPath))
      continue
    }
    if (entry.isFile() && /\.mdx?$/i.test(entry.name)) files.push(entryPath)
  }
  return files
}

/** 提取文章一级标题。 */
function getArticleTitle(markdown, filePath) {
  /** 正文首个一级标题，缺失时退回文件名。 */
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || path.basename(filePath, path.extname(filePath))
}

/** 去掉课号和 Markdown 标记，得到标题主题。 */
function getTopic(title) {
  return title.replace(/^.+?（\d+）\s*[-—:：]\s*/, '').replace(/[`*_~]/g, '').trim()
}

/** 把标题中的并列对象拆成候选主题词。 */
function getTopicTerms(topic) {
  return topic.split(/、|\s+与\s+|\s+和\s+|\s+及\s+|\s*\+\s*/).map((term) => term.trim()).filter((term) => term.length >= 2)
}

/** 提取正文最浅一级章节，用于判断标题对象是否真的有内容承接。 */
function getTopLevelHeadings(markdown) {
  return [...markdown.matchAll(/^#\s+(.+)$/gm)].slice(1).map((match) => match[1].replace(/^[一二三四五六七八九十百]+、\s*/, '').trim())
}

/** 依据标题关系词、章节承接和显式决策给出审查结论。 */
function classifyArticle(title, markdown) {
  /** 标题中去掉系列课号后的主题。 */
  const topic = getTopic(title)
  /** 标题中可独立解释的并列对象。 */
  const terms = getTopicTerms(topic)
  /** 当前文章的主章节名称。 */
  const headings = getTopLevelHeadings(markdown)
  /** 标题主题是否有足够的关系词组成一条处理链。 */
  const hasChainSignal = CHAIN_SIGNAL_PATTERN.test(topic)
  /** 每个并列对象是否至少在标题或章节中留下可追踪证据。 */
  const coveredTermCount = terms.filter((term) => markdown.includes(term) || headings.some((heading) => heading.includes(term))).length
  if (terms.length < 2) return { status: 'COHESIVE', reason: '标题只有一个主对象。' }
  if (hasChainSignal && coveredTermCount === terms.length) return { status: 'CHAIN', reason: '标题对象均有正文承接，且存在输入、状态、输出或边界关系。' }
  if (coveredTermCount < terms.length) return { status: 'MISMATCH', reason: `标题对象仅 ${coveredTermCount}/${terms.length} 个能在正文追踪。` }
  return { status: 'REVIEW', reason: '标题有多个对象，需人工确认是否可独立定义、实践和验收。' }
}

/** 生成全库主题衔接审查报告。 */
function createReport(rows) {
  /** 各类审查结论计数。 */
  const counts = rows.reduce((result, row) => {
    result[row.status] = (result[row.status] || 0) + 1
    return result
  }, {})
  /** 报告正文行。 */
  const lines = [
    '# 全库文章主题衔接审查',
    '',
    `审查时间：${new Date().toISOString()}`, 
    `文章总数：${rows.length}；COHESIVE ${counts.COHESIVE || 0}；CHAIN ${counts.CHAIN || 0}；REVIEW ${counts.REVIEW || 0}；MISMATCH ${counts.MISMATCH || 0}。`,
    '',
    '## 判定规则',
    '',
    '- 只有一个主对象，或多个对象按输入、状态、输出、边界形成单一处理链：保留一篇，但标题必须直接表达关系。',
    '- 多个对象能够分别定义、分别运行最小实践、分别设置通过指标，且正文没有共同状态：拆分。',
    '- 标题对象在正文无法追踪：先修复标题或正文，不允许用通用“核心决策”段落掩盖缺口。',
    '- 文章编号必须从 01 连续，拆分后的旧 URL 通过迁移表指向最接近的新职责。',
    '',
    '## 本轮拆分',
    '',
    ...SPLIT_DECISIONS.flatMap((decision) => [
      `- **${decision.oldTitle}**：${decision.reason}`,
      ...decision.newTitles.map((title) => `  - ${title}`)
    ]),
    '',
    '## 本轮链路化改名',
    '',
    ...RETITLED_CHAINS.map(([title, reason]) => `- **${title}**：${reason}`),
    '',
    '## 需要人工复核的标题',
    '',
    '| 文章 | 结论 | 原因 |',
    '| --- | --- | --- |',
    ...rows.filter((row) => row.status === 'REVIEW' || row.status === 'MISMATCH').map((row) => `| ${row.path} | ${row.status} | ${row.reason} |`),
    '',
    '## 全库结果',
    '',
    '本次审查将“拆分”和“链路化改名”分开处理，没有把所有带“、”的标题机械切碎。后续新增文章必须先写出唯一主线，再决定是否拆分；不能依靠自动补充段落把不相关知识拼成一篇。',
    ''
  ]
  return lines.join('\n')
}

/** 执行审查并输出桌面报告。 */
function main() {
  /** 全库文章文件。 */
  const files = findArticleFiles(KNOWLEDGE_ROOT)
  /** 每篇文章的主题衔接结论。 */
  const rows = files.map((filePath) => {
    /** 当前文章 Markdown。 */
    const markdown = fs.readFileSync(filePath, 'utf8')
    /** 当前文章相对知识库路径。 */
    const relativePath = path.relative(KNOWLEDGE_ROOT, filePath).split(path.sep).join('/')
    /** 当前文章标题。 */
    const title = getArticleTitle(markdown, filePath)
    /** 当前文章分类结论。 */
    const classification = classifyArticle(title, markdown)
    return { path: relativePath, title, ...classification }
  }).sort((left, right) => left.path.localeCompare(right.path, 'zh-CN', { numeric: true }))
  fs.writeFileSync(REPORT_FILE, createReport(rows))
  console.log(`主题衔接审查完成：${rows.length} 篇文章，报告写入 ${REPORT_FILE}。`)
}

main()
