import 'server-only'

import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, posix, relative, resolve, sep } from 'node:path'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import html from 'remark-html'
import { KNOWLEDGE_MODULE_LABELS, type KnowledgeTrackSlug } from '@/app/knowledge/config'
import { createKnowledgeMindmap, type KnowledgeMindmapData } from '@/lib/knowledge-mindmap'
import { createKnowledgeQuiz, type KnowledgeQuizQuestion } from '@/lib/knowledge-quiz'
import type { KnowledgeSandbox, KnowledgeSandboxFile, KnowledgeSandboxRuntime } from '@/lib/knowledge-sandbox'

/** 知识文章在列表页和阅读页共用的元数据。 */
export interface KnowledgeArticle {
  slug: string[]
  path: string
  displayPath: string
  sourcePath: string
  href: string
  title: string
  /** 文章在所属模块中从 01 开始的 UI 连续顺序。 */
  sequence: number
  topic: string
  /** 文章在一级模块中的课程或技术细分类。 */
  subtopic: string
  track: KnowledgeTrackSlug | null
  kind: KnowledgeArticleKind
  breadcrumbs: string[]
}

/** 知识库列表页实际需要下发给浏览器的轻量文章元数据。 */
export type KnowledgeListArticle = Pick<
  KnowledgeArticle,
  'path' | 'href' | 'title' | 'sequence' | 'topic' | 'subtopic' | 'kind'
>

/** 知识文章在学习路径中的用途。 */
export type KnowledgeArticleKind = 'guide' | 'lesson' | 'practice' | 'reference'

/** 阅读页相邻文章导航所需的最小元数据。 */
export type KnowledgeArticleLink = Pick<KnowledgeArticle, 'href' | 'sequence' | 'title' | 'topic'>

/** 单篇知识文章阅读页需要的完整数据。 */
export interface KnowledgeArticlePageData extends KnowledgeArticle {
  /** Markdown 转换后的文章 HTML。 */
  content: string
  /** 从正文知识结构生成的可交互思维导图。 */
  mindmap: KnowledgeMindmapData | null
  /** 当前文章允许在浏览器隔离环境中运行的可信实验。 */
  sandboxes: KnowledgeSandbox[]
  /** 当前文章核心知识对应的最小题集。 */
  quiz: KnowledgeQuizQuestion[]
  /** 当前实体模块中的上一篇文章。 */
  previousArticle: KnowledgeArticleLink | null
  /** 当前实体模块中的下一篇文章。 */
  nextArticle: KnowledgeArticleLink | null
}

/** Markdown AST 中本功能会访问的节点字段。 */
interface MarkdownNode {
  type?: string
  depth?: number
  value?: string
  url?: string
  children?: MarkdownNode[]
}

/** 新知识目录前缀与已发布旧路径之间的映射。 */
interface KnowledgeDirectoryMigration {
  currentPrefix: string
  legacyPrefix: string
}

/** AI 应用文章合并为系列小标题时使用的匹配规则。 */
interface AiAppSubtopicRule {
  /** 规则生效的一级模块展示名称。 */
  topic: string
  /** 系列在实体知识目录中的完整目录名。 */
  directoryName: string
  /** 合并后显示在列表和右侧目录中的系列名称。 */
  label: string
  /** 属于当前系列的原始课程目录编号。 */
  courseOrders: ReadonlySet<number>
}

/** 实验页自动展示的源码文件定义。 */
interface LabSourceFileDefinition {
  /** 实验目录中的固定文件名。 */
  fileName: string
  /** Markdown 代码围栏使用的语言标识。 */
  language: string
}

/** 已从磁盘读取、等待附加到实验 README 的源码章节。 */
interface LabSourceSection {
  /** 页面中展示的源码文件名。 */
  fileName: string
  /** Markdown 代码围栏语言。 */
  language: string
  /** 构建期读取的完整源码。 */
  sourceCode: string
}

/** 单篇实验 README 对应的在线运行白名单定义。 */
interface LabSandboxDefinition {
  /** 浏览器使用的隔离执行环境。 */
  runtime: KnowledgeSandboxRuntime
  /** 运行面板展示的实验名称。 */
  title: string
  /** 读者运行后应该观察的核心结果。 */
  description: string
  /** 当前实验的可信入口文件。 */
  entryFile: string
  /** 入口执行时必须一同写入沙盒的支持文件。 */
  fileNames: readonly string[]
  /** 提供运行文件的实验 README 路径；正文直接运行 lab 源码时使用。 */
  fileSourcePath?: string
  /** 共享 HTML 实验套件需要激活的场景编号。 */
  scenarioId?: string
}

/** 知识文章的仓库内根目录。 */
const KNOWLEDGE_CONTENT_ROOT = join(process.cwd(), 'src', 'content', 'knowledge')

/** 知识文章引用的本地媒体根目录。 */
const KNOWLEDGE_ASSET_ROOT = join(process.cwd(), 'public', 'knowledge-assets')

/** 支持作为知识文章读取的扩展名。 */
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx'])

/** lab/README 页面允许自动附加的真实源码文件。 */
const LAB_SOURCE_FILE_DEFINITIONS: readonly LabSourceFileDefinition[] = [
  {
    fileName: 'main.py', // Python 命令行实验的默认入口。
    language: 'python' // 为 Python 源码启用语法高亮。
  },
  {
    fileName: 'rag_core.py', // 企业知识库实验的 RAG 核心实现。
    language: 'python' // 为 RAG Python 源码启用语法高亮。
  },
  {
    fileName: 'server.py', // 前后端或 HTTP 实验的服务入口。
    language: 'python' // 服务端示例均使用 Python。
  },
  {
    fileName: 'quiz.py', // 面试题命令行自测入口。
    language: 'python' // 自测工具均使用 Python。
  },
  {
    fileName: 'index.html', // 浏览器实验的可运行页面。
    language: 'html' // 为 HTML、CSS 和内嵌 JavaScript 启用高亮。
  },
  {
    fileName: 'sandbox.html', // 无需后端和密钥即可在文章中预览的隔离页面。
    language: 'html' // 为沙盒 HTML、CSS 和内嵌 JavaScript 启用高亮。
  },
  {
    fileName: 'Dockerfile', // 容器实验的镜像构建文件。
    language: 'dockerfile' // 为 Dockerfile 启用语法高亮。
  },
  {
    fileName: 'docker-compose.yml', // 多容器实验的编排文件。
    language: 'yaml' // Compose 文件使用 YAML 语法。
  }
]

/** 单个实验文件允许在静态页面数据中携带的最大字节数。 */
const LAB_SANDBOX_FILE_SIZE_LIMIT_BYTES = 256 * 1024

/** 共享 HTML 实验入口中等待构建期替换的场景占位符。 */
const LAB_SANDBOX_SCENARIO_PLACEHOLDER = '__KNOWLEDGE_LAB_SCENARIO__'

/**
 * 创建一条 Python 在线实验白名单定义。
 * @param title 运行面板展示的实验名称。
 * @param description 读者运行后应该观察的核心结果。
 * @param supportingFiles 除 main.py 外必须写入虚拟文件系统的支持文件。
 * @param fileSourcePath 提供运行文件的实验 README 无扩展名路径。
 */
function createPythonSandboxDefinition(
  title: string,
  description: string,
  supportingFiles: readonly string[] = [],
  fileSourcePath?: string
): LabSandboxDefinition {
  return {
    runtime: 'python', // 交给 Web Worker 内的 Pyodide 执行。
    title, // 使用调用方提供的文章内实验名称。
    description, // 使用调用方提供的预期观察结果。
    entryFile: 'main.py', // 这批离线 Python Demo 统一从 main.py 启动。
    fileNames: ['main.py', ...supportingFiles], // 只携带入口和显式声明的支持文件。
    fileSourcePath // 正文实验从关联的 lab 目录读取可信文件。
  }
}

/**
 * 创建一条 HTML 在线实验白名单定义。
 * @param title 运行面板展示的实验名称。
 * @param description 读者运行后应该观察的核心结果。
 * @param fileSourcePath 提供运行文件的实验 README 无扩展名路径。
 */
function createHtmlSandboxDefinition(
  title: string,
  description: string,
  fileSourcePath?: string
): LabSandboxDefinition {
  return {
    runtime: 'html', // 使用不具备同源权限的 iframe 执行内嵌脚本。
    title, // 使用调用方提供的文章内实验名称。
    description, // 使用调用方提供的预期观察结果。
    entryFile: 'sandbox.html', // 只运行专门为无后端预览编写的入口。
    fileNames: ['sandbox.html'], // 不向 iframe 暴露服务端示例或其他支持文件。
    fileSourcePath // 正文实验从关联的 lab 目录读取可信文件。
  }
}

/**
 * 创建一条复用共享 HTML 套件的在线实验白名单定义。
 * @param title 运行面板展示的实验名称。
 * @param description 读者运行后应该观察的核心结果。
 * @param fileSourcePath 提供共享 sandbox.html 的实验 README 无扩展名路径。
 * @param scenarioId 当前文章需要激活的实验场景编号。
 */
function createScenarioSandboxDefinition(
  title: string,
  description: string,
  fileSourcePath: string,
  scenarioId: string
): LabSandboxDefinition {
  return {
    ...createHtmlSandboxDefinition(title, description, fileSourcePath),
    scenarioId // 构建页面数据时写入可信入口，不接受 URL 或用户输入覆盖。
  }
}

/** AI 编程 13 个实验共用的可信源码目录。 */
const AI_CODING_LAB_SUITE_PATH = '_shared-labs/ai-coding/lab/README'

/** AI 应用开发 17 个实验共用的可信源码目录。 */
const AI_APP_LAB_SUITE_PATH = '_shared-labs/ai-app/lab/README'

/**
 * 在线实验采用显式白名单，避免把需要密钥、网络、Docker 或长期进程的 Demo 错当成浏览器实验。
 */
const LAB_SANDBOX_DEFINITIONS: ReadonlyMap<string, LabSandboxDefinition> = new Map([
  [
    '03-AI大模型应用开发/08-工程基础/03-大模型API与应用工程/08-文件上传与文档解析/lab/README',
    createPythonSandboxDefinition(
      '文档解析与切分',
      '读取同目录 Markdown、纯文本样例，输出带 source 与 section 元数据的 chunk。',
      ['sample.md', 'sample.txt']
    )
  ],
  [
    '03-AI大模型应用开发/08-工程基础/04-RAG基础/01-RAG是什么/lab/README',
    createPythonSandboxDefinition('最小 RAG 链路', '运行离线检索、上下文拼装和带来源回答的完整闭环。')
  ],
  [
    '03-AI大模型应用开发/08-工程基础/04-RAG基础/02-文档切分Chunk/lab/README',
    createPythonSandboxDefinition('Chunk 参数对比', '对同一文档比较过大、过小和带 overlap 三种切分结果。')
  ],
  [
    '03-AI大模型应用开发/08-工程基础/04-RAG基础/03-Embedding向量化/lab/README',
    createPythonSandboxDefinition('Embedding 相似度', '把问题和候选资料向量化，并按余弦相似度输出排序。')
  ],
  [
    '03-AI大模型应用开发/08-工程基础/04-RAG基础/04-向量数据库/lab/README',
    createPythonSandboxDefinition('内存向量检索', '完成向量写入、metadata 过滤和 Top-K 相似度检索。')
  ],
  [
    '03-AI大模型应用开发/08-工程基础/04-RAG基础/05-检索与重排Rerank/lab/README',
    createPythonSandboxDefinition('召回与 Rerank', '对比低成本初排和意图感知重排后的候选顺序。')
  ],
  [
    '03-AI大模型应用开发/08-工程基础/04-RAG基础/06-RAG回答生成与引用来源/lab/README',
    createPythonSandboxDefinition('回答与引用校验', '生成带来源编号的回答，并验证每条引用都能回溯到证据。')
  ],
  [
    '03-AI大模型应用开发/08-工程基础/04-RAG基础/07-RAG评测与调优/lab/README',
    createPythonSandboxDefinition('RAG 离线评测', '计算命中率、答案覆盖和引用正确性等最小评测指标。')
  ],
  [
    '03-AI大模型应用开发/01-Agent工程/01-Agent基础/02-Function-Calling工具调用/lab/README',
    createPythonSandboxDefinition('Function Calling 安全闭环', '依次验证合法调用、参数错误、越权和未知工具。')
  ],
  [
    '03-AI大模型应用开发/01-Agent工程/01-Agent基础/03-ReAct模式/lab/README',
    createPythonSandboxDefinition('ReAct 决策循环', '观察 Thought、Action、Observation 到 Final Answer 的状态变化。')
  ],
  [
    '03-AI大模型应用开发/01-Agent工程/01-Agent基础/04-多工具Agent/lab/README',
    createPythonSandboxDefinition('多工具 Agent 路由', '让同一 Agent 按任务选择检索、计算和订单查询工具。')
  ],
  [
    '03-AI大模型应用开发/01-Agent工程/01-Agent基础/05-Agent记忆与状态/chapter',
    createPythonSandboxDefinition(
      '短期与长期记忆',
      '观察滑动窗口淘汰旧消息，以及用户偏好如何跨会话持久化和读取。',
      [],
      '03-AI大模型应用开发/01-Agent工程/01-Agent基础/05-Agent记忆与状态/lab/README'
    )
  ],
  [
    '03-AI大模型应用开发/01-Agent工程/01-Agent基础/06-Agent安全边界/lab/README',
    createPythonSandboxDefinition('Agent 安全边界', '验证工具白名单、参数校验、权限判断和高风险确认。')
  ],
  [
    '03-AI大模型应用开发/05-LangChain实战/01-LangChain入门/01-LangChain入门/lab/README',
    createPythonSandboxDefinition('LCEL 最小链', '运行 Retriever、Prompt、LLM、Parser 的管道组合。')
  ],
  [
    '03-AI大模型应用开发/05-LangChain实战/03-Chain输出与上下文/01-Memory-管理的三大策略-截断-总结-检索/chapter',
    createPythonSandboxDefinition(
      'Memory 三策略与 Token 预算',
      '对同一段历史执行截断、滚动摘要和长期记忆检索，再按预算组装最终上下文。',
      [],
      '03-AI大模型应用开发/05-LangChain实战/03-Chain输出与上下文/01-Memory-管理的三大策略-截断-总结-检索/lab/README'
    )
  ],
  [
    '03-AI大模型应用开发/05-LangChain实战/03-Chain输出与上下文/02-结构化大模型输出-output-parser-还是-tool/chapter',
    createPythonSandboxDefinition(
      '结构化输出校验与重试',
      '依次观察脏 JSON 解析失败、修复重试、Schema 校验和业务规则拦截。',
      [],
      '03-AI大模型应用开发/05-LangChain实战/03-Chain输出与上下文/02-结构化大模型输出-output-parser-还是-tool/lab/README'
    )
  ],
  [
    '03-AI大模型应用开发/05-LangChain实战/03-Chain输出与上下文/05-Runnable-把写逻辑变成组装-chain/chapter',
    createPythonSandboxDefinition(
      'Runnable 数据契约与分支',
      '查看组件如何通过统一输入输出串联，并在校验失败时走显式 fallback。',
      [],
      '03-AI大模型应用开发/05-LangChain实战/03-Chain输出与上下文/05-Runnable-把写逻辑变成组装-chain/lab/README'
    )
  ],
  [
    '03-AI大模型应用开发/05-LangChain实战/03-Chain输出与上下文/06-实战练习-LCEL-组装-chain/chapter',
    createPythonSandboxDefinition(
      'LCEL RAG 与 Callback Trace',
      '运行检索、Prompt、模型、Parser 固定流水线，并查看每一步的数据形状和耗时。',
      [],
      '03-AI大模型应用开发/05-LangChain实战/03-Chain输出与上下文/06-实战练习-LCEL-组装-chain/lab/README'
    )
  ],
  [
    '03-AI大模型应用开发/05-LangChain实战/04-短期与长期记忆/01-Redis-实现-Agent-短期记忆存储的最佳方案/chapter',
    createPythonSandboxDefinition(
      'Redis Session Memory 机制',
      '在离线存储中复现租户隔离、滑动窗口、TTL 刷新和过期降级。',
      [],
      '03-AI大模型应用开发/05-LangChain实战/04-短期与长期记忆/01-Redis-实现-Agent-短期记忆存储的最佳方案/lab/README'
    )
  ],
  [
    '03-AI大模型应用开发/05-LangChain实战/04-短期与长期记忆/02-Mem0-分层记忆-三路召回的长期记忆方案/chapter',
    createHtmlSandboxDefinition(
      'Mem0 记忆生命周期',
      '逐轮写入偏好，直观看到 ADD、UPDATE、NOOP、DELETE 以及多路召回结果。',
      '03-AI大模型应用开发/05-LangChain实战/04-短期与长期记忆/02-Mem0-分层记忆-三路召回的长期记忆方案/lab/README'
    )
  ],
  [
    '03-AI大模型应用开发/06-LangGraph/01-LangGraph入门/01-LangGraph入门/lab/README',
    createPythonSandboxDefinition('LangGraph 状态机', '运行带条件分支、循环次数上限和终止节点的最小状态图。')
  ],
  [
    '03-AI大模型应用开发/06-LangGraph/02-图编排与Agentic-RAG/01-图编排引擎-LangGraph-和多-Agent-架构/chapter',
    createPythonSandboxDefinition(
      'Multi-Agent、Checkpoint 与 HIL',
      '观察 Supervisor 路由、最小权限、状态归并、人工中断和断点恢复。',
      [],
      '03-AI大模型应用开发/06-LangGraph/02-图编排与Agentic-RAG/01-图编排引擎-LangGraph-和多-Agent-架构/lab/README'
    )
  ],
  [
    '03-AI大模型应用开发/06-LangGraph/02-图编排与Agentic-RAG/02-Agentic-RAG-基于-LangGraph-自主决策-RAG-闭环/chapter',
    createPythonSandboxDefinition(
      'Agentic RAG 自纠错闭环',
      '观察路由、检索、证据评分、Query 改写、有限重试、回答和拒答路径。',
      [],
      '03-AI大模型应用开发/06-LangGraph/02-图编排与Agentic-RAG/02-Agentic-RAG-基于-LangGraph-自主决策-RAG-闭环/lab/README'
    )
  ],
  [
    '03-AI大模型应用开发/07-LangSmith-LangFuse/01-可观测性入门/01-AI应用日志与可观测性/lab/README',
    createPythonSandboxDefinition('AI Trace 观测', '记录一次 RAG 调用的阶段耗时、Token 和错误字段。')
  ],
  [
    '03-AI大模型应用开发/08-工程基础/03-大模型API与应用工程/03-结构化输出与JSON/lab/README',
    createPythonSandboxDefinition(
      '结构化输出校验与兜底',
      '运行五类模型输出，观察 JSON 解析、Schema 校验、错误标识和稳定兜底结果。'
    )
  ],
  [
    '03-AI大模型应用开发/08-工程基础/03-大模型API与应用工程/07-前端调用AI接口/lab/README',
    createHtmlSandboxDefinition('流式回答状态机', '直接操作提问、取消和重试，观察流式输出与 UI 状态切换。')
  ],
  [
    '03-AI大模型应用开发/08-工程基础/07-项目与求职/01-项目-前端AI-Copilot组件/lab/README',
    createHtmlSandboxDefinition('前端 AI Copilot', '体验上下文白名单、建议生成、Diff 预览和写入前确认。')
  ],
  [
    '02-AI编程/01-提示词工程/04-提示词的结构化设计/chapter',
    createScenarioSandboxDefinition(
      'Prompt 结构与回归对比器',
      '切换角色、上下文、约束、示例和输出契约，实时观察 Prompt 完整度与冲突诊断。',
      AI_CODING_LAB_SUITE_PATH,
      'AC-01'
    )
  ],
  [
    '02-AI编程/03-Codex/03-上下文与AGENTS/chapter',
    createScenarioSandboxDefinition(
      '上下文预算与指令优先级',
      '调整上下文窗口和日志体积，观察保留、摘要、裁剪以及规则覆盖结果。',
      AI_CODING_LAB_SUITE_PATH,
      'AC-02'
    )
  ],
  [
    '02-AI编程/02-Claude-Code/06-权限模式与PlanMode/chapter',
    createScenarioSandboxDefinition(
      '权限、Plan Mode 与 Diff 审批',
      '选择工具动作与授权模式，观察允许、询问、拒绝和审批后的状态迁移。',
      AI_CODING_LAB_SUITE_PATH,
      'AC-03'
    )
  ],
  [
    '02-AI编程/05-Agent-Harness/02-agent核心循环/chapter',
    createScenarioSandboxDefinition(
      'Agent Harness 核心循环',
      '逐步执行观察、计划、工具、验证、重试和终止，比较跳过验证造成的错误完成。',
      AI_CODING_LAB_SUITE_PATH,
      'AC-04'
    )
  ],
  [
    '02-AI编程/05-Agent-Harness/04-工具调用进阶/chapter',
    createScenarioSandboxDefinition(
      '编程工具调用与路径安全',
      '验证工具 Schema、工作区边界、补丁检查和危险命令拦截。',
      AI_CODING_LAB_SUITE_PATH,
      'AC-05'
    )
  ],
  [
    '02-AI编程/05-Agent-Harness/09-子代理编排/chapter',
    createScenarioSandboxDefinition(
      'Subagent 任务图与并发预算',
      '调整并发槽位和失败注入，观察 DAG 依赖、冲突、等待与取消传播。',
      AI_CODING_LAB_SUITE_PATH,
      'AC-06'
    )
  ],
  [
    '02-AI编程/04-Skills/05-description触发开关/chapter',
    createScenarioSandboxDefinition(
      'Skill 触发与渐进式披露',
      '比较 Skill 描述的匹配质量、冲突与资源加载成本。',
      AI_CODING_LAB_SUITE_PATH,
      'AC-07'
    )
  ],
  [
    '02-AI编程/06-Superpowers/04-TDD与系统化调试/chapter',
    createScenarioSandboxDefinition(
      'TDD 与系统化调试闭环',
      '观察失败测试、根因定位、最小修复与回归检查，识别只修表象的路径。',
      AI_CODING_LAB_SUITE_PATH,
      'AC-08'
    )
  ],
  [
    '02-AI编程/02-Claude-Code/13-GitWorktrees并行不打架/chapter',
    createScenarioSandboxDefinition(
      'Git Worktree 并行冲突',
      '模拟并行分支、脏工作区、共享文件冲突与安全收尾。',
      AI_CODING_LAB_SUITE_PATH,
      'AC-09'
    )
  ],
  [
    '02-AI编程/02-Claude-Code/04-工作循环与检查点回溯/chapter',
    createScenarioSandboxDefinition(
      'Checkpoint、回溯与上下文压缩',
      '比较撤销代码、恢复执行状态和压缩对话三种操作的影响边界。',
      AI_CODING_LAB_SUITE_PATH,
      'AC-10'
    )
  ],
  [
    '02-AI编程/02-Claude-Code/18-Hooks与Skills与Automation/chapter',
    createScenarioSandboxDefinition(
      'Hooks 与 CI 质量门禁',
      '查看 PreTool、PostTool、Stop、Lint、Test 和 Build 的触发顺序与阻断结果。',
      AI_CODING_LAB_SUITE_PATH,
      'AC-11'
    )
  ],
  [
    '02-AI编程/02-Claude-Code/21-MCP外部工具集成/chapter',
    createScenarioSandboxDefinition(
      'MCP 工具发现与权限检查',
      '检查 Server、Tool Schema、授权范围、超时与 Prompt Injection 防护。',
      AI_CODING_LAB_SUITE_PATH,
      'AC-12'
    )
  ],
  [
    '02-AI编程/05-Agent-Harness/12-走向生产/chapter',
    createScenarioSandboxDefinition(
      'Prompt 与 Agent 回归评测矩阵',
      '对比多个版本的成功率、工具选择准确率、Token、延迟和回归项。',
      AI_CODING_LAB_SUITE_PATH,
      'AC-13'
    )
  ],
  [
    '03-AI大模型应用开发/02-企业级知识库/04-企业级RAG进阶/02-企业级-RAG-全链路-离线建库到在线问答/chapter',
    createScenarioSandboxDefinition(
      '企业 RAG 全链路控制台',
      '从解析、切分、Embedding、ACL 到检索、重排、生成和引用校验逐阶段观察数据流。',
      AI_APP_LAB_SUITE_PATH,
      'AA-01'
    )
  ],
  [
    '03-AI大模型应用开发/08-工程基础/04-RAG基础/02-文档切分Chunk/chapter',
    createScenarioSandboxDefinition(
      'Chunking 策略实验室',
      '比较固定、递归、标题、父子和语义切分的边界、重复率与命中表现。',
      AI_APP_LAB_SUITE_PATH,
      'AA-02'
    )
  ],
  [
    '03-AI大模型应用开发/08-工程基础/04-RAG基础/03-Embedding向量化/chapter',
    createScenarioSandboxDefinition(
      'Embedding 选型与向量成本',
      '根据维度、文档规模、精度和模型版本计算存储、批次与重建成本。',
      AI_APP_LAB_SUITE_PATH,
      'AA-03'
    )
  ],
  [
    '03-AI大模型应用开发/08-工程基础/08-生产进阶专题/02-ElasticSearch-全文检索-倒排索引-IK-分词器-BM25/chapter',
    createScenarioSandboxDefinition(
      'ES 倒排索引与 BM25 拆解',
      '逐项查看分词、TF、DF、IDF、长度归一化和字段权重如何形成最终排名。',
      AI_APP_LAB_SUITE_PATH,
      'AA-04'
    )
  ],
  [
    '03-AI大模型应用开发/02-企业级知识库/01-RAG核心链路/04-混合检索与RRF实战/chapter',
    createScenarioSandboxDefinition(
      'BM25、Vector 与 RRF 混合检索',
      '调整两路 Top K、RRF k、元数据过滤与重排数量，观察候选排名变化。',
      AI_APP_LAB_SUITE_PATH,
      'AA-05'
    )
  ],
  [
    '03-AI大模型应用开发/02-企业级知识库/03-企业知识库项目/01-项目-企业知识库RAG/chapter',
    createScenarioSandboxDefinition(
      'RAG ACL 与跨租户泄漏',
      '比较召回前鉴权和召回后过滤，并检查缓存键与引用接口的二次鉴权。',
      AI_APP_LAB_SUITE_PATH,
      'AA-06'
    )
  ],
  [
    '03-AI大模型应用开发/02-企业级知识库/04-企业级RAG进阶/03-RAG-生产排障-坏案例与修复手册/chapter',
    createScenarioSandboxDefinition(
      '增量建库、删除传播与索引版本',
      '对文档执行新增、更新和删除，观察 Chunk Diff、蓝绿切换、Tombstone 与回滚。',
      AI_APP_LAB_SUITE_PATH,
      'AA-07'
    )
  ],
  [
    '03-AI大模型应用开发/07-LangSmith-LangFuse/02-LangSmith实战/01-LangSmith-全链路观测-Agent-调试到-RAG-量化评估/chapter',
    createScenarioSandboxDefinition(
      'LangSmith 与 LangFuse Trace 排障',
      '展开 Span、检索文档、Prompt、Token、耗时、费用与错误，完成根因定位。',
      AI_APP_LAB_SUITE_PATH,
      'AA-08'
    )
  ],
  [
    '03-AI大模型应用开发/08-工程基础/06-部署成本与排障/04-生产问题排查清单/chapter',
    createScenarioSandboxDefinition(
      '模型路由、限流、重试与熔断',
      '注入 429、超时和 5xx，观察退避、熔断、备用模型与非幂等保护。',
      AI_APP_LAB_SUITE_PATH,
      'AA-09'
    )
  ],
  [
    '03-AI大模型应用开发/02-企业级知识库/01-RAG核心链路/03-RAG在线问答链路/chapter',
    createScenarioSandboxDefinition(
      'Multi-Query、Rewrite 与 HyDE',
      '比较原始问题、多查询、查询改写和假设文档的召回与去重效果。',
      AI_APP_LAB_SUITE_PATH,
      'AA-10'
    )
  ],
  [
    '03-AI大模型应用开发/08-工程基础/04-RAG基础/05-检索与重排Rerank/chapter',
    createScenarioSandboxDefinition(
      'Rerank 阈值、预算与延迟',
      '调整召回量、Rerank Top N 和阈值，观察命中率、费用及延迟的权衡。',
      AI_APP_LAB_SUITE_PATH,
      'AA-11'
    )
  ],
  [
    '03-AI大模型应用开发/08-工程基础/04-RAG基础/07-RAG评测与调优/chapter',
    createScenarioSandboxDefinition(
      'RAG 评测与坏案例归因',
      '计算 Hit@K、MRR、正确性、忠实度与引用准确率，并定位问题阶段。',
      AI_APP_LAB_SUITE_PATH,
      'AA-12'
    )
  ],
  [
    '03-AI大模型应用开发/08-工程基础/03-大模型API与应用工程/09-异步任务与队列基础/chapter',
    createScenarioSandboxDefinition(
      '异步建库队列与死信处理',
      '观察任务从 Pending 到 Done、Retry 或 Dead Letter 的状态和幂等处理。',
      AI_APP_LAB_SUITE_PATH,
      'AA-13'
    )
  ],
  [
    '03-AI大模型应用开发/01-Agent工程/05-DeepAgents与Multi-Agent/01-DeepAgents-开箱即用的-skill-上下文压缩-middleware/chapter',
    createScenarioSandboxDefinition(
      'DeepAgents 上下文压缩与专家分工',
      '比较单 Agent、Subagents 和 Middleware 压缩后的上下文、调用次数和失败边界。',
      AI_APP_LAB_SUITE_PATH,
      'AA-14'
    )
  ],
  [
    '03-AI大模型应用开发/08-工程基础/08-生产进阶专题/04-Neo4j-知识图谱和-Graph-RAG/chapter',
    createScenarioSandboxDefinition(
      'GraphRAG 实体关系与路径召回',
      '从文本抽取实体关系，比较向量候选、图路径和社区摘要融合结果。',
      AI_APP_LAB_SUITE_PATH,
      'AA-15'
    )
  ],
  [
    '03-AI大模型应用开发/02-企业级知识库/04-企业级RAG进阶/01-企业级知识库项目-多模态-RAG-流程梳理/chapter',
    createScenarioSandboxDefinition(
      '多模态 RAG：OCR、表格与图片引用',
      '观察页面、图片、表格块解析、坐标保留、跨模态召回和可视化引用。',
      AI_APP_LAB_SUITE_PATH,
      'AA-16'
    )
  ],
  [
    '03-AI大模型应用开发/08-工程基础/06-部署成本与排障/03-成本控制与缓存/chapter',
    createScenarioSandboxDefinition(
      '语义缓存与成本计算器',
      '比较精确缓存和语义缓存，并验证权限、模型、Prompt 与知识库版本对缓存键的影响。',
      AI_APP_LAB_SUITE_PATH,
      'AA-17'
    )
  ]
])

/** 判断 URL 是否已经是无需改写的绝对地址或页内锚点。 */
const EXTERNAL_URL_PATTERN = /^(?:[a-z][a-z\d+.-]*:|\/|#)/i

/** 匹配 Obsidian 的图片嵌入语法，并保留可选的显示别名。 */
const OBSIDIAN_IMAGE_PATTERN = /!\[\[([^\]]+)\]\]/g

/** 作为目录正文入口、不应直接出现在展示路径中的文件名。 */
const DIRECTORY_ENTRY_NAMES = new Set(['chapter'])

/** 已合并到主文章但仍保留真实源码的实验目录名称。 */
const LAB_DIRECTORY_NAME = 'lab'

/** 实验文档在源码索引和旧版公开路径中的固定文件名。 */
const LAB_README_FILE_NAME = 'README'

/** 正文中标记已吸收同目录 Demo 内容的注释。 */
const MERGED_LAB_MARKER = '<!-- knowledge-lab-merged -->'

/** 只保存配图或来源资料、不应作为知识文章发布的目录名称。 */
const NON_ARTICLE_DIRECTORY_NAMES = new Set(['assets', '_shared-labs'])

/** Lab 内只服务于示例运行、不应出现在文章列表的支持目录。 */
const LAB_SUPPORT_DIRECTORY_NAMES = new Set(['data', 'docs'])

/** 全栈开发内容所在的路线目录名称。 */
const FULL_STACK_SECTION_NAME = '全栈开发'

/** AI 应用内容所在的路线目录名称。 */
const AI_APP_TRACK_SECTION_NAME = 'AI大模型应用开发'

/** AI 应用内容在知识库中的完整实体目录名称。 */
const AI_APP_TRACK_DIRECTORY_NAME = '03-AI大模型应用开发'

/** AI 应用路线中面试题内容所在的模块目录名称。 */
const AI_APP_INTERVIEW_SECTION_NAME = 'AI大模型应用面试题'

/** AI 应用路线中 Agent 工程内容所在的模块目录名称。 */
const AI_APP_AGENT_SECTION_NAME = 'Agent工程'

/** AI 应用路线中 LangChain 内容所在的模块目录名称。 */
const AI_APP_LANGCHAIN_SECTION_NAME = 'LangChain实战'

/** AI 应用路线中 LangGraph 内容所在的模块目录名称。 */
const AI_APP_LANGGRAPH_SECTION_NAME = 'LangGraph'

/** AI 应用路线中可观测与评测内容所在的模块目录名称。 */
const AI_APP_OBSERVABILITY_SECTION_NAME = 'LangSmith-LangFuse'

/** AI 应用路线中通用工程内容所在的模块目录名称。 */
const AI_APP_ENGINEERING_FOUNDATION_SECTION_NAME = '工程基础'

/** AI 应用路线中企业级知识库内容所在的模块目录名称。 */
const AI_APP_ENTERPRISE_SECTION_NAME = '企业级知识库'

/** AI 应用路线中一人公司内容所在的模块目录名称。 */
const AI_APP_SOLO_COMPANY_SECTION_NAME = '一人公司'

/** 企业级知识库模块的实体目录名称。 */
const AI_APP_ENTERPRISE_CATEGORY_DIRECTORY = '02-企业级知识库'

/** 一人公司模块的实体目录名称。 */
const AI_APP_SOLO_COMPANY_CATEGORY_DIRECTORY = '03-一人公司'

/** 工程基础模块的实体目录名称。 */
const AI_APP_ENGINEERING_FOUNDATION_CATEGORY_DIRECTORY = '08-工程基础'

/** Paperclip 系列重组前使用的目录名称。 */
const AI_APP_LEGACY_PAPERCLIP_DIRECTORY = 'paperclip'

/** Paperclip 系列重组后的实体目录名称。 */
const AI_APP_PAPERCLIP_DIRECTORY = '01-Paperclip'

/** 企业级知识库基础设施系列重组前使用的目录名称。 */
const AI_APP_LEGACY_INFRASTRUCTURE_DIRECTORY = '03-基础设施实战'

/** 企业级知识库基础设施系列重组后的实体目录名称。 */
const AI_APP_INFRASTRUCTURE_DIRECTORY = '02-基础设施实战'

/** 工程基础附录重组前使用的目录名称。 */
const AI_APP_LEGACY_APPENDIX_DIRECTORY = 'appendices'

/** 旧 Agent 工程写作指南使用的文件名。 */
const AI_APP_LEGACY_WRITING_GUIDE_NAME = 'writing-guide'

/** 工程基础附录重组后的实体目录名称。 */
const AI_APP_APPENDIX_DIRECTORY = '09-附录'

/** 旧版 Agent 课程在当前知识目录中的统一前缀。 */
const AI_APP_LEGACY_AGENT_CURRENT_PREFIX = '03-AI大模型应用开发/01-Agent工程'

/** 旧版 Agent 课程已经发布的公开 URL 前缀。 */
const AI_APP_LEGACY_AGENT_PUBLIC_PREFIX = '02-Agent'

/** 重分类后 Agent 工程课程保留的原课程编号。 */
const AI_APP_AGENT_ENGINEERING_COURSE_ORDERS = new Set([
  27, 28, 29, 30, 31, 32, 44, 45, 47, 50, 53, 54, 55, 56, 57, 71, 72, 73, 74, 82, 83
])

/** 重分类后归入 LangChain 实战的原课程编号。 */
const AI_APP_LANGCHAIN_COURSE_ORDERS = new Set([35, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 85, 86])

/** 重分类后归入 LangGraph 的原课程编号。 */
const AI_APP_LANGGRAPH_COURSE_ORDERS = new Set([36, 75, 76])

/** 重分类后归入可观测与评测模块的原课程编号。 */
const AI_APP_OBSERVABILITY_COURSE_ORDERS = new Set([40, 81])

/** 从旧 Agent 目录并入企业级知识库的原课程编号。 */
const AI_APP_ENTERPRISE_KNOWLEDGE_COURSE_ORDERS = new Set([43, 91, 92, 93])

/** AI 应用模块原始目录名称到展示名称的映射。 */
const AI_APP_TOPIC_BY_SECTION_NAME: Readonly<Record<string, string>> = {
  [AI_APP_ENGINEERING_FOUNDATION_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
  [AI_APP_AGENT_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.agentEngineering,
  [AI_APP_LANGCHAIN_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.langChainPractice,
  [AI_APP_LANGGRAPH_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.langGraph,
  [AI_APP_OBSERVABILITY_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.observability,
  [AI_APP_ENTERPRISE_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.enterpriseKnowledge,
  [AI_APP_SOLO_COMPANY_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.soloCompany,
  [AI_APP_INTERVIEW_SECTION_NAME]: KNOWLEDGE_MODULE_LABELS.aiApps.interviewQuestions
}

/** 全栈路线中后端内容所在的模块目录名称。 */
const BACKEND_SECTION_NAME = '后端'

/** AI 编程内容所在的顶层板块名称。 */
const AI_CODING_SECTION_NAME = 'AI编程'

/** 全栈路线中前端内容所在的顶层板块名称。 */
const FRONTEND_SECTION_NAME = '前端'

/** 全栈路线中测试内容所在的顶层板块名称。 */
const TESTING_SECTION_NAME = '测试'

/** 匹配课程目录开头用于排序和分组的数字。 */
const COURSE_ORDER_PATTERN = /^(\d+)-/

/** 带独立学习指南的系列需要把第一篇正文从 02 开始编号。 */
const GUIDE_SEQUENCE_SERIES_PREFIXES = new Set([
  '01-全栈开发/02-后端/java', // Java 的 course.md 作为第 01 篇学习指南。
  '01-全栈开发/02-后端/python', // Python 的 course.md 作为第 01 篇学习指南。
  '02-AI编程/01-提示词工程', // 提示词工程使用 01-学习指南.md 作为第 01 篇。
  '02-AI编程/02-Claude-Code', // Claude Code 使用 01-学习指南.md 作为第 01 篇。
  '02-AI编程/03-Codex', // Codex 使用 01-学习指南.md 作为第 01 篇。
  '02-AI编程/04-Skills', // Skills 使用 01-学习指南.md 作为第 01 篇。
  '02-AI编程/05-Agent-Harness', // Agent Harness 使用 01-学习指南.md 作为第 01 篇。
  '03-AI大模型应用开发/03-一人公司/01-Paperclip' // Paperclip 的 course.md 作为第 01 篇学习指南。
])

/** AI 编程学习指南改名前后的公开路径，用于兼容已发布链接。 */
const KNOWLEDGE_GUIDE_PATH_MIGRATIONS = new Map<string, string>([
  ['02-AI编程/01-提示词工程/00-课程路线', '02-AI编程/01-提示词工程/01-学习指南'], // 保留原课程路线 URL。
  ['02-AI编程/01-提示词工程/00-学习指南', '02-AI编程/01-提示词工程/01-学习指南'], // 合并重复的旧学习指南 URL。
  ['02-AI编程/02-Claude-Code/00-课程路线', '02-AI编程/02-Claude-Code/01-学习指南'], // 保留 Claude Code 旧指南 URL。
  ['02-AI编程/03-Codex/00-课程路线', '02-AI编程/03-Codex/01-学习指南'], // 保留 Codex 旧指南 URL。
  ['02-AI编程/04-Skills/00-课程路线', '02-AI编程/04-Skills/01-学习指南'], // 保留 Skills 旧指南 URL。
  ['02-AI编程/05-Agent-Harness/00-课程路线', '02-AI编程/05-Agent-Harness/01-学习指南'] // 保留 Agent Harness 旧指南 URL。
])

/** 路径中普通课程允许参与“指南后移一位”兼容转换的最小旧课号。 */
const FIRST_GUIDE_OFFSET_LESSON_ORDER = 1

/** 98、99 保留给模板和扩展阅读，因此普通课程兼容转换最多处理到 96。 */
const LAST_GUIDE_OFFSET_LESSON_ORDER = 96

/** 全栈与 AI 应用的实体课程目录都位于公开路径第 4 段。 */
const NESTED_COURSE_PATH_SEGMENT_INDEX = 3

/** AI 编程的实体课程目录或指南文件位于公开路径第 3 段。 */
const AI_CODING_COURSE_PATH_SEGMENT_INDEX = 2

/** 三条路线中用于聚合同一系统课程的目录深度。 */
const COURSE_GROUP_DEPTH_BY_TRACK_SECTION: Partial<Record<string, number>> = {
  [FULL_STACK_SECTION_NAME]: 3,
  [AI_CODING_SECTION_NAME]: 2,
  [AI_APP_TRACK_SECTION_NAME]: 2
}

/** 重组后的规范目录与旧版公开 URL 前缀。 */
const KNOWLEDGE_DIRECTORY_MIGRATIONS: KnowledgeDirectoryMigration[] = [
  { currentPrefix: '01-全栈开发/01-前端', legacyPrefix: '05-前端' },
  { currentPrefix: '01-全栈开发/02-后端', legacyPrefix: '04-后端' },
  { currentPrefix: '01-全栈开发/03-测试', legacyPrefix: '06-测试' },
  { currentPrefix: '02-AI编程', legacyPrefix: '01-AI编程' },
  { currentPrefix: '03-AI大模型应用开发/01-Agent工程', legacyPrefix: '02-Agent' },
  { currentPrefix: '03-AI大模型应用开发/02-企业级知识库', legacyPrefix: '03-企业级知识库项目' },
  { currentPrefix: '03-AI大模型应用开发/03-一人公司', legacyPrefix: '07-一人公司' }
]

/** 顶层知识目录与三条公开学习主线的对应关系。 */
const KNOWLEDGE_TRACK_BY_SECTION: Partial<Record<string, KnowledgeTrackSlug>> = {
  [FULL_STACK_SECTION_NAME]: 'full-stack',
  [AI_CODING_SECTION_NAME]: 'ai-coding',
  [AI_APP_TRACK_SECTION_NAME]: 'ai-apps'
}

/** 各文章用途在同一课程中的阅读阶段。 */
const ARTICLE_SEQUENCE_GROUP: Record<KnowledgeArticleKind, number> = {
  guide: 0,
  lesson: 1,
  practice: 1,
  reference: 2
}

/** 匹配目录或文件名前用于控制顺序的数字前缀。 */
const ORDER_PREFIX_PATTERN = /^\d+-/

/** 匹配标题中已经存在的课程、实践或附录前缀。 */
const ARTICLE_TITLE_PREFIX_PATTERN =
  /^(?:第\s*\d+\s*课(?:实践)?|附录\s*\d+|\d+\s*(?:[-·:]\s*demo\s*[：:]?|[-·:]|demo\s*[：:]))\s*[：:]?\s*/i

/** 匹配旧正文一级标题中没有分隔符的两位以内课号。 */
const PLAIN_ARTICLE_ORDER_PREFIX_PATTERN = /^\d{1,2}\s+/

/** 匹配旧文章标题中“系列名称（序号）-”形式的重复编号。 */
const ARTICLE_SERIES_TITLE_PREFIX_PATTERN = /^[^（）()\n]{1,80}[（(]\s*\d+\s*[）)]\s*[-—–:：]\s*/

/** 不参与普通课程序号展示的目录控制编号。 */
const RESERVED_ARTICLE_ORDERS = new Set([0, 98, 99])

/** 清理旧标题中已经存在的学习指南语义前缀。 */
const GUIDE_TITLE_PREFIX_PATTERN = /^(?:学习指南|学习路线)\s*[：:]\s*/

/** 匹配当前或旧版页面统一生成的课号前缀。 */
const SEQUENCED_TITLE_PREFIX_PATTERN = /^(?:（\d+）\s*-\s*|第\s*\d+\s*课(?:实践|扩展)?[：:]\s*)/

/** 需要使用标准技术品牌大小写的细分类名称。 */
const KNOWLEDGE_SUBTOPIC_LABELS: Record<string, string> = {
  appendices: '附录',
  java: 'Java',
  paperclip: 'Paperclip',
  python: 'Python',
  playwright: 'Playwright'
}

/**
 * 创建一条 AI 应用课程系列归组规则。
 * @param topic 规则生效的一级模块展示名称。
 * @param directoryName 系列在实体知识目录中的完整目录名。
 * @param label 合并后的系列小标题。
 * @param courseOrders 当前系列包含的原始课程编号。
 */
function createAiAppSubtopicRule(
  topic: string,
  directoryName: string,
  label: string,
  courseOrders: readonly number[]
): AiAppSubtopicRule {
  return { topic, directoryName, label, courseOrders: new Set(courseOrders) }
}

/** AI 应用原始课程编号到系列小标题的集中映射。 */
const AI_APP_SUBTOPIC_RULES: readonly AiAppSubtopicRule[] = [
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '01-AI应用开发入门',
    'AI 应用开发入门',
    [1, 2, 3]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '02-Python',
    'Python',
    [4, 5, 6, 7, 8, 9]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '03-大模型API与应用工程',
    '大模型 API 与应用工程',
    [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '04-RAG基础',
    'RAG 基础',
    [20, 21, 22, 23, 24, 25, 26]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '05-应用框架',
    '应用框架',
    [33, 34, 37]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '06-部署成本与排障',
    '部署、成本与排障',
    [38, 39, 41, 42]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '07-项目与求职',
    '项目与求职',
    [46, 48, 49, 51, 52]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.engineeringFoundation,
    '08-生产进阶专题',
    '生产进阶专题',
    [77, 78, 79, 80, 84, 87, 88, 89, 90]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.agentEngineering,
    '01-Agent基础',
    'Agent 基础',
    [27, 28, 29, 30, 31, 32]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.agentEngineering,
    '02-Agent项目与面试',
    'Agent 项目与面试',
    [44, 45, 47, 50]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.agentEngineering,
    '03-Tool-MCP与Skill',
    'Tool、MCP 与 Skill',
    [53, 54, 55, 56, 57]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.agentEngineering,
    '04-任务调度与交互',
    '任务调度与交互',
    [71, 72, 73, 74]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.agentEngineering,
    '05-DeepAgents与Multi-Agent',
    'DeepAgents 与 Multi-Agent',
    [82, 83]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.enterpriseKnowledge,
    '01-RAG核心链路',
    'RAG 核心链路',
    [2, 6, 7, 8]
  ),
  createAiAppSubtopicRule(KNOWLEDGE_MODULE_LABELS.aiApps.enterpriseKnowledge, '02-基础设施实战', '基础设施实战', [3]),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.enterpriseKnowledge,
    '03-企业知识库项目',
    '企业知识库项目',
    [43]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.enterpriseKnowledge,
    '04-企业级RAG进阶',
    '企业级 RAG 进阶',
    [91, 92, 93]
  ),
  createAiAppSubtopicRule(KNOWLEDGE_MODULE_LABELS.aiApps.langChainPractice, '01-LangChain入门', 'LangChain 入门', [35]),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.langChainPractice,
    '02-文档检索与向量库',
    '文档检索与向量库',
    [58, 59, 60, 61, 62]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.langChainPractice,
    '03-Chain输出与上下文',
    'Chain、输出与上下文',
    [63, 64, 65, 66, 67, 68, 69, 70]
  ),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.langChainPractice,
    '04-短期与长期记忆',
    '短期与长期记忆',
    [85, 86]
  ),
  createAiAppSubtopicRule(KNOWLEDGE_MODULE_LABELS.aiApps.langGraph, '01-LangGraph入门', 'LangGraph 入门', [36]),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.langGraph,
    '02-图编排与Agentic-RAG',
    '图编排与 Agentic RAG',
    [75, 76]
  ),
  createAiAppSubtopicRule(KNOWLEDGE_MODULE_LABELS.aiApps.observability, '01-可观测性入门', '可观测性入门', [40]),
  createAiAppSubtopicRule(KNOWLEDGE_MODULE_LABELS.aiApps.observability, '02-LangSmith实战', 'LangSmith 实战', [81]),
  createAiAppSubtopicRule(
    KNOWLEDGE_MODULE_LABELS.aiApps.interviewQuestions,
    '01-AI大模型应用面试题',
    'AI 大模型应用面试题',
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
  )
]

/** 可供 Obsidian 图片语法按文件名查找的全部媒体相对路径。 */
const KNOWLEDGE_ASSET_PATHS = fs.existsSync(KNOWLEDGE_ASSET_ROOT)
  ? (fs.readdirSync(KNOWLEDGE_ASSET_ROOT, { recursive: true }) as string[])
      .map((assetPath) => assetPath.split(sep).join('/'))
      .filter((assetPath) => fs.statSync(join(KNOWLEDGE_ASSET_ROOT, assetPath)).isFile())
  : []

/**
 * 构建实验 README 到同目录源码的索引。
 * 扫描范围固定在知识内容根目录，避免每个页面渲染时触发动态文件追踪。
 */
function createLabSourceIndex(): ReadonlyMap<string, readonly LabSourceSection[]> {
  /** README 相对路径到源码章节的索引。 */
  const sourceIndex = new Map<string, LabSourceSection[]>()
  /** 知识内容根目录下的全部相对路径。 */
  const contentPaths = fs.existsSync(KNOWLEDGE_CONTENT_ROOT)
    ? (fs.readdirSync(KNOWLEDGE_CONTENT_ROOT, { recursive: true }) as string[])
    : []

  for (const contentPath of contentPaths) {
    /** 使用 URL 风格分隔符的知识内容路径。 */
    const normalizedContentPath = contentPath.split(sep).join('/')
    /** 与当前文件名匹配的可展示源码定义。 */
    const sourceDefinition = LAB_SOURCE_FILE_DEFINITIONS.find(
      (definition) => posix.basename(normalizedContentPath) === definition.fileName
    )

    if (!sourceDefinition || posix.basename(posix.dirname(normalizedContentPath)) !== 'lab') {
      continue
    }

    /** 当前源码所在实验的 README 相对路径。 */
    const readmePath = posix.join(posix.dirname(normalizedContentPath), 'README.md')
    /** 当前源码绝对路径。 */
    const sourceFilePath = join(KNOWLEDGE_CONTENT_ROOT, contentPath)

    if (!fs.statSync(sourceFilePath).isFile()) {
      continue
    }

    /** 当前 README 已收集的源码章节。 */
    const sourceSections = sourceIndex.get(readmePath) || []
    sourceSections.push({
      fileName: sourceDefinition.fileName,
      language: sourceDefinition.language,
      sourceCode: fs.readFileSync(sourceFilePath, 'utf8')
    })
    sourceIndex.set(readmePath, sourceSections)
  }

  return sourceIndex
}

/** 所有实验 README 在页面中展示的真实源码索引。 */
const LAB_SOURCE_INDEX = createLabSourceIndex()

/**
 * 构建实验 README 到同目录直接子文件的索引。
 * 该索引只为显式白名单实验提供文件，不扫描 data 等嵌套目录。
 */
function createLabSandboxFileIndex(): ReadonlyMap<string, readonly KnowledgeSandboxFile[]> {
  /** 无扩展名 README 相对路径到同目录文件的索引。 */
  const sandboxFileIndex = new Map<string, KnowledgeSandboxFile[]>()
  /** 知识内容根目录下等待筛选的全部相对路径。 */
  const contentPaths = fs.existsSync(KNOWLEDGE_CONTENT_ROOT)
    ? (fs.readdirSync(KNOWLEDGE_CONTENT_ROOT, { recursive: true }) as string[])
    : []

  for (const contentPath of contentPaths) {
    /** 使用 URL 风格分隔符的知识内容路径。 */
    const normalizedContentPath = contentPath.split(sep).join('/')
    /** 当前候选文件的直接父目录名称。 */
    const parentDirectoryName = posix.basename(posix.dirname(normalizedContentPath))
    /** 当前候选文件的纯文件名。 */
    const fileName = posix.basename(normalizedContentPath)

    if (parentDirectoryName !== 'lab' || fileName === 'README.md') {
      continue
    }

    /** 当前候选文件的绝对路径。 */
    const absoluteFilePath = join(KNOWLEDGE_CONTENT_ROOT, contentPath)
    /** 当前候选文件的磁盘信息。 */
    const fileStats = fs.statSync(absoluteFilePath)
    if (!fileStats.isFile() || fileStats.size > LAB_SANDBOX_FILE_SIZE_LIMIT_BYTES) {
      continue
    }

    /** 当前实验 README 的无扩展名相对路径。 */
    const readmeSourcePath = posix.join(posix.dirname(normalizedContentPath), 'README')
    /** 当前实验已经收集的直接子文件。 */
    const sandboxFiles = sandboxFileIndex.get(readmeSourcePath) || []
    sandboxFiles.push({
      name: fileName,
      content: fs.readFileSync(absoluteFilePath, 'utf8')
    })
    sandboxFileIndex.set(readmeSourcePath, sandboxFiles)
  }

  return sandboxFileIndex
}

/** 所有实验 README 可供白名单选择的直接子文件索引。 */
const LAB_SANDBOX_FILE_INDEX = createLabSandboxFileIndex()

/** 生产构建中复用的文章目录，避免每个静态页面重复扫描全部 Markdown。 */
let productionKnowledgeArticles: KnowledgeArticle[] | null = null

/**
 * 递归查找目录中的 Markdown 文件。
 * @param directory 当前需要扫描的绝对目录。
 */
function findMarkdownFiles(directory: string): string[] {
  /** 当前目录下找到的文章绝对路径。 */
  const files: string[] = []

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    /** 当前目录项的绝对路径。 */
    const entryPath = join(directory, entry.name)

    if (entry.isDirectory()) {
      // Demo 已合并进主文章，lab 目录只保留运行源码和夹具，不再生成独立文章页。
      if (entry.name === LAB_DIRECTORY_NAME) {
        continue
      }

      /** 当前扫描目录的名称，用于识别 Lab 支持文件。 */
      const parentDirectoryName = directory.split(sep).at(-1) || ''
      /** 配图资料和 Lab 数据不会生成可访问文章页。 */
      const shouldSkipDirectory =
        NON_ARTICLE_DIRECTORY_NAMES.has(entry.name) ||
        (parentDirectoryName === 'lab' && LAB_SUPPORT_DIRECTORY_NAMES.has(entry.name))
      if (shouldSkipDirectory) {
        continue
      }

      files.push(...findMarkdownFiles(entryPath))
      continue
    }

    if (entry.isFile() && MARKDOWN_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      /** Lab 内除 README 外的 Markdown 是 Prompt、规则或测试夹具，不是文章。 */
      const isLabSupportFile = directory.split(sep).includes('lab') && entry.name !== 'README.md'
      if (isLabSupportFile) {
        continue
      }

      files.push(entryPath)
    }
  }

  return files
}

/**
 * 把旧版 Demo 文章路径映射到已经吸收实践内容的主文章源路径。
 * @param articlePath 当前请求或 Markdown 链接中的无扩展名文章路径。
 */
function getMergedDemoArticlePath(articlePath: string): string {
  /** 旧 Demo 页面在知识库中的固定路径后缀。 */
  const labReadmeSuffix = `/${LAB_DIRECTORY_NAME}/${LAB_README_FILE_NAME}`
  if (!articlePath.endsWith(labReadmeSuffix)) {
    return articlePath
  }

  /** 去掉 lab/README 后的课程目录路径。 */
  const coursePath = articlePath.slice(0, -labReadmeSuffix.length)
  /** 绝大多数课程使用 chapter，系列总览实验使用 course。 */
  const mainArticleEntryNames = ['chapter', 'course']

  for (const entryName of mainArticleEntryNames) {
    /** 当前主文章入口的绝对无扩展名路径。 */
    const candidateBasePath = resolve(KNOWLEDGE_CONTENT_ROOT, ...coursePath.split('/'), entryName)
    /** 当前入口是否存在任一受支持的 Markdown 后缀。 */
    const hasCandidateFile = [...MARKDOWN_EXTENSIONS].some((extension) => {
      /** 当前扩展名对应的完整文件路径。 */
      const candidatePath = `${candidateBasePath}${extension}`
      return fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()
    })

    if (hasCandidateFile) {
      return `${coursePath}/${entryName}`
    }
  }

  return coursePath
}

/**
 * 从 Markdown 的首个一级标题提取文章标题。
 * @param markdown 文章原始 Markdown 内容。
 * @param fallbackTitle 未声明一级标题时使用的文件名。
 */
function extractTitle(markdown: string, fallbackTitle: string): string {
  /** Markdown 中首个一级标题的匹配结果。 */
  const headingMatch = markdown.match(/^#\s+(.+)$/m)

  return headingMatch?.[1]?.replace(/[`*_~]/g, '').trim() || fallbackTitle
}

/**
 * 从文章路径中提取最靠近正文的课程编号。
 * @param sourceArticlePath 不含扩展名的源文章相对路径。
 */
function getArticleOrder(sourceArticlePath: string): number | null {
  /** 从正文文件向课程目录反向检查的路径片段。 */
  const reversedPathSegments = sourceArticlePath.split('/').reverse()

  for (const pathSegment of reversedPathSegments) {
    /** 当前路径片段携带的排序编号。 */
    const articleOrder = getCourseOrder(pathSegment)

    if (articleOrder !== null && !RESERVED_ARTICLE_ORDERS.has(articleOrder)) {
      return articleOrder
    }
  }

  return null
}

/**
 * 返回 AI 应用实体课程在目录重组前使用的全局课号。
 * @param sourceArticlePath 不含扩展名的源文章相对路径。
 */
function getOriginalAiAppCourseOrder(sourceArticlePath: string): number | null {
  /** 源文章路径按目录拆分后的片段。 */
  const pathSegments = sourceArticlePath.split('/')
  if (pathSegments[0] !== AI_APP_TRACK_DIRECTORY_NAME || pathSegments.length < 4) {
    return null
  }

  /** 当前文章所属的 AI 应用实体模块目录。 */
  const categoryDirectory = pathSegments[1] || ''
  /** 当前文章所在的实体系列目录。 */
  const seriesDirectory = pathSegments[2] || ''
  if (
    categoryDirectory === AI_APP_ENTERPRISE_CATEGORY_DIRECTORY &&
    seriesDirectory === AI_APP_INFRASTRUCTURE_DIRECTORY
  ) {
    return null
  }

  /** 当前实体模块对应的页面展示名称。 */
  const topic = getAiAppTopicByCategoryDirectory(categoryDirectory)
  /** 当前实体系列对应的归组规则。 */
  const matchedRule = getAiAppSubtopicRuleByDirectory(topic, seriesDirectory)
  if (!matchedRule) {
    return null
  }

  /** 当前系列内从 01 开始编号的课程目录。 */
  const localCourseDirectory = pathSegments[3] || ''
  /** 当前课程使用的系列内本地课号。 */
  const localCourseOrder = getCourseOrder(localCourseDirectory)
  return localCourseOrder === null ? null : getAiAppOriginalCourseOrder(matchedRule, localCourseOrder)
}

/**
 * 清理源文章中已经存在的课号和用途前缀。
 * @param rawTitle Markdown 中声明的原始标题。
 * @param sourceArticlePath 不含扩展名的源文章相对路径。
 */
function getBaseArticleTitle(rawTitle: string, sourceArticlePath: string): string {
  /** 从正文所在目录得出的课程编号。 */
  const articleOrder = getArticleOrder(sourceArticlePath)
  /** AI 应用课程目录重排前使用的全局课号。 */
  const originalAiAppCourseOrder = getOriginalAiAppCourseOrder(sourceArticlePath)
  /** 当前本地课号和旧全局课号组成的可清理编号集合。 */
  const matchingArticleOrders = [...new Set([articleOrder, originalAiAppCourseOrder].filter((order) => order !== null))]
  /** 匹配与当前或历史路径课号相同、但没有分隔符的旧标题编号。 */
  const matchingOrderPrefixPattern = matchingArticleOrders.length
    ? new RegExp(`^0*(?:${matchingArticleOrders.join('|')})(?:\\s+章\\s+Demo\\s*[·:：-]?|\\s+)`, 'i')
    : null
  /** 先清理带分隔符的通用旧标题前缀。 */
  const titleWithoutKnownPrefix = rawTitle.replace(ARTICLE_TITLE_PREFIX_PATTERN, '')
  /** 先去掉系列名称，避免其后的旧纯数字课号被系列前缀遮挡。 */
  const titleWithoutSeriesPrefix = titleWithoutKnownPrefix.replace(ARTICLE_SERIES_TITLE_PREFIX_PATTERN, '')
  /** 路径有明确课号时，继续清理正文标题中遗留的旧纯数字课号。 */
  const titleWithoutPlainOrder =
    articleOrder === null
      ? titleWithoutSeriesPrefix
      : titleWithoutSeriesPrefix.replace(PLAIN_ARTICLE_ORDER_PREFIX_PATTERN, '')
  /** 去掉旧课号、Demo 和学习指南标记后的标题正文。 */
  const normalizedTitle = (
    matchingOrderPrefixPattern ? titleWithoutPlainOrder.replace(matchingOrderPrefixPattern, '') : titleWithoutPlainOrder
  )
    .replace(GUIDE_TITLE_PREFIX_PATTERN, '')
    .trim()

  return normalizedTitle || rawTitle
}

/**
 * 生成与细分类内连续顺序一致的列表和正文标题。
 * @param baseTitle 已清理旧顺序前缀的文章标题。
 * @param kind 当前文章在学习路径中的用途。
 * @param sequence 当前文章标题需要展示的课程顺序。
 */
function getSequencedArticleTitle(baseTitle: string, kind: KnowledgeArticleKind, sequence: number): string {
  /** 统一使用两位数展示的细分类内顺序。 */
  const sequenceLabel = sequence.toString().padStart(2, '0')

  if (kind === 'guide') {
    return `（${sequenceLabel}） - 学习指南：${baseTitle}`
  }

  return `（${sequenceLabel}） - ${baseTitle}`
}

/**
 * 将仓库相对路径编码成可安全用于 URL 的分段路径。
 * @param pathValue 使用正斜杠分隔的仓库相对路径。
 */
function encodePath(pathValue: string): string {
  return pathValue.split('/').map(encodeURIComponent).join('/')
}

/**
 * 将目录入口文件路径转换为对外展示的父目录路径。
 * @param articlePath 不含扩展名的源文章相对路径。
 */
function getPublicArticlePath(articlePath: string): string {
  /** 源文章路径的分段结果。 */
  const pathSegments = articlePath.split('/')

  return DIRECTORY_ENTRY_NAMES.has(pathSegments.at(-1) || '') ? pathSegments.slice(0, -1).join('/') : articlePath
}

/**
 * 将匹配的知识路径前缀替换为目标前缀。
 * @param articlePath 需要转换的文章路径。
 * @param sourcePrefix 当前路径必须匹配的来源前缀。
 * @param targetPrefix 转换后使用的目标前缀。
 */
function replaceKnowledgePathPrefix(articlePath: string, sourcePrefix: string, targetPrefix: string): string | null {
  if (articlePath !== sourcePrefix && !articlePath.startsWith(`${sourcePrefix}/`)) {
    return null
  }

  /** 来源前缀之后需要原样保留的文章子路径。 */
  const pathSuffix = articlePath.slice(sourcePrefix.length)
  return `${targetPrefix}${pathSuffix}`
}

/**
 * 返回文章所属的“指南占第 01 篇”系列路径。
 * @param articlePath 需要检查的规范或旧版文章路径。
 */
function getGuideSequenceSeriesPrefix(articlePath: string): string | null {
  /** 与文章路径匹配的系列根路径。 */
  const seriesPrefix = [...GUIDE_SEQUENCE_SERIES_PREFIXES].find(
    (candidatePrefix) => articlePath === candidatePrefix || articlePath.startsWith(`${candidatePrefix}/`)
  )

  return seriesPrefix || null
}

/**
 * 替换系列根目录后第一个路径片段的课号。
 * @param articlePath 需要替换课号的文章路径。
 * @param seriesPrefix 文章所属的系列根路径。
 * @param targetOrder 替换后使用的课号。
 */
function replaceGuideSequenceOrder(articlePath: string, seriesPrefix: string, targetOrder: number): string | null {
  /** 系列根目录之后的文章路径片段。 */
  const articlePathSegments = articlePath.slice(seriesPrefix.length + 1).split('/')
  /** 携带课号的第一个课程路径片段。 */
  const coursePathSegment = articlePathSegments[0] || ''
  if (getCourseOrder(coursePathSegment) === null) {
    return null
  }

  /** 去掉旧课号后需要原样保留的课程目录名称。 */
  const courseName = coursePathSegment.replace(COURSE_ORDER_PATTERN, '')
  /** 使用两位课号重建的课程目录名称。 */
  const migratedCoursePathSegment = `${targetOrder.toString().padStart(2, '0')}-${courseName}`
  articlePathSegments[0] = migratedCoursePathSegment

  return `${seriesPrefix}/${articlePathSegments.join('/')}`
}

/**
 * 返回指南占位重编号之前使用的文章路径。
 * @param articlePath 当前规范文章路径。
 */
function getLegacyGuideSequenceArticlePaths(articlePath: string): string[] {
  /** 当前指南路径对应的全部旧指南路径。 */
  const legacyGuidePaths = [...KNOWLEDGE_GUIDE_PATH_MIGRATIONS.entries()]
    .filter(([, currentGuidePath]) => currentGuidePath === articlePath)
    .map(([legacyGuidePath]) => legacyGuidePath)
  if (legacyGuidePaths.length > 0) {
    return legacyGuidePaths
  }

  /** 当前文章所属的指南占位系列。 */
  const seriesPrefix = getGuideSequenceSeriesPrefix(articlePath)
  if (!seriesPrefix || articlePath === seriesPrefix) {
    return []
  }

  /** 当前路径中的实体课程号。 */
  const currentOrder = getCourseOrder(articlePath.slice(seriesPrefix.length + 1).split('/')[0] || '')
  /** 当前课号减去指南占用的一位后得到的旧课号。 */
  const legacyOrder = currentOrder === null ? null : currentOrder - 1
  if (
    legacyOrder === null ||
    legacyOrder < FIRST_GUIDE_OFFSET_LESSON_ORDER ||
    legacyOrder > LAST_GUIDE_OFFSET_LESSON_ORDER
  ) {
    return []
  }

  /** 将当前课程路径恢复为重编号前路径的结果。 */
  const legacyArticlePath = replaceGuideSequenceOrder(articlePath, seriesPrefix, legacyOrder)
  return legacyArticlePath ? [legacyArticlePath] : []
}

/**
 * 将指南占位重编号之前的文章路径转换为当前规范路径。
 * @param articlePath URL 中请求的旧版文章路径。
 */
function getCurrentGuideSequenceArticlePath(articlePath: string): string {
  if (hasKnowledgeArticlePath(articlePath)) {
    return articlePath
  }

  /** 旧 AI 编程指南路径直接对应的当前指南路径。 */
  const currentGuidePath = KNOWLEDGE_GUIDE_PATH_MIGRATIONS.get(articlePath)
  if (currentGuidePath) {
    return currentGuidePath
  }

  /** 当前文章所属的指南占位系列。 */
  const seriesPrefix = getGuideSequenceSeriesPrefix(articlePath)
  if (!seriesPrefix || articlePath === seriesPrefix) {
    return articlePath
  }

  /** 旧路径中的实体课程号。 */
  const legacyOrder = getCourseOrder(articlePath.slice(seriesPrefix.length + 1).split('/')[0] || '')
  if (
    legacyOrder === null ||
    legacyOrder < FIRST_GUIDE_OFFSET_LESSON_ORDER ||
    legacyOrder > LAST_GUIDE_OFFSET_LESSON_ORDER
  ) {
    return articlePath
  }

  /** 旧课号加上学习指南占用的一位后得到的当前课号。 */
  const currentOrder = legacyOrder + 1
  return replaceGuideSequenceOrder(articlePath, seriesPrefix, currentOrder) || articlePath
}

/**
 * 判断一个无扩展名文章路径是否已经存在于当前知识目录。
 * @param articlePath 需要检查的知识库相对路径。
 */
function hasKnowledgeArticlePath(articlePath: string): boolean {
  /** 无扩展名文章路径对应的绝对基础路径。 */
  const articleBasePath = resolve(KNOWLEDGE_CONTENT_ROOT, ...articlePath.split('/'))
  /** 直接 Markdown 文件是否存在。 */
  const hasDirectArticle = [...MARKDOWN_EXTENSIONS].some((extension) => {
    /** 当前检查的直接文章文件。 */
    const candidatePath = `${articleBasePath}${extension}`
    return fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()
  })
  if (hasDirectArticle) {
    return true
  }

  /** 目录入口 Markdown 文件是否存在。 */
  return [...DIRECTORY_ENTRY_NAMES].some((entryName) =>
    [...MARKDOWN_EXTENSIONS].some((extension) => {
      /** 当前检查的目录入口文件。 */
      const candidatePath = join(articleBasePath, `${entryName}${extension}`)
      return fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()
    })
  )
}

/**
 * 返回规范知识路径对应的旧版公开路径，用于保留已发布链接。
 * @param articlePath 重组后的规范文章路径。
 */
export function getLegacyKnowledgeArticlePath(articlePath: string): string | null {
  /** 重分类后的 AI 应用文章对应的旧 Agent 公开路径。 */
  const legacyAiAppArticlePath = getLegacyAiAppArticlePath(articlePath)
  if (legacyAiAppArticlePath) {
    return legacyAiAppArticlePath
  }

  /** 移除新增系列层级后的重组前完整文章路径。 */
  const legacyFlatArticlePath = getLegacyFlatAiAppArticlePath(articlePath) || articlePath

  for (const directoryMigration of KNOWLEDGE_DIRECTORY_MIGRATIONS) {
    /** 当前目录迁移规则转换出的旧版路径。 */
    const legacyArticlePath = replaceKnowledgePathPrefix(
      legacyFlatArticlePath,
      directoryMigration.currentPrefix,
      directoryMigration.legacyPrefix
    )

    if (legacyArticlePath) {
      return legacyArticlePath
    }
  }

  return null
}

/**
 * 返回规范文章需要保留的全部历史路径。
 * @param articlePath 重组后的规范文章路径。
 */
export function getKnowledgeArticleAliasPaths(articlePath: string): string[] {
  /** 已发布的短公开路径，例如旧版 `/02-Agent/...`。 */
  const legacyPublicPath = getLegacyKnowledgeArticlePath(articlePath)
  /** 新增实体系列目录之前使用的完整扁平路径。 */
  const legacyFlatAiAppPath = getLegacyFlatAiAppArticlePath(articlePath)
  /** 系列目录已存在、但课程仍使用旧全局课号时的历史路径。 */
  const legacyGlobalAiAppSeriesPath = getLegacyGlobalAiAppSeriesArticlePath(articlePath)
  /** 重分类前使用的完整 AI 应用目录路径。 */
  const legacyAiAppCurrentPath = getLegacyAiAppCurrentArticlePath(articlePath)
  /** 学习指南占第 01 篇之前使用的指南或课程路径。 */
  const legacyGuideSequencePaths = getLegacyGuideSequenceArticlePaths(articlePath)
  /** 同时使用旧顶层目录和旧课号的更早版本公开路径。 */
  const legacyGuideSequencePublicPaths = legacyGuideSequencePaths
    .map((legacyGuideSequencePath) => getLegacyKnowledgeArticlePath(legacyGuideSequencePath))
    .filter((legacyGuideSequencePath): legacyGuideSequencePath is string => Boolean(legacyGuideSequencePath))
  /** 使用集合避免未移动文章的别名与规范路径重复。 */
  const aliasPaths = new Set(
    [
      legacyPublicPath,
      legacyFlatAiAppPath,
      legacyGlobalAiAppSeriesPath,
      legacyAiAppCurrentPath,
      ...legacyGuideSequencePaths,
      ...legacyGuideSequencePublicPaths
    ].filter((aliasPath): aliasPath is string => Boolean(aliasPath && aliasPath !== articlePath))
  )

  return [...aliasPaths]
}

/**
 * 返回已合并 Demo 对应的旧 `/lab/README` 路径。
 * @param sourceArticlePath 规范文章在知识库中的无扩展名源路径。
 */
export function getMergedDemoAliasPath(sourceArticlePath: string): string | null {
  /** 只有目录入口文章可以吸收同目录的 Demo。 */
  const articleEntryName = posix.basename(sourceArticlePath)
  if (!['chapter', 'course'].includes(articleEntryName)) {
    return null
  }

  /** 当前源文章任一受支持扩展名对应的绝对路径。 */
  const articleFilePath = [...MARKDOWN_EXTENSIONS]
    .map((extension) => resolve(KNOWLEDGE_CONTENT_ROOT, ...sourceArticlePath.split('/')) + extension)
    .find((candidatePath) => fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile())
  if (!articleFilePath) {
    return null
  }

  /** 只为确实执行过 Demo 合并的正文保留历史路由。 */
  const hasMergedDemo = fs.readFileSync(articleFilePath, 'utf8').includes(MERGED_LAB_MARKER)
  if (!hasMergedDemo) {
    return null
  }

  return posix.join(posix.dirname(sourceArticlePath), LAB_DIRECTORY_NAME, LAB_README_FILE_NAME)
}

/**
 * 将旧版公开文章路径转换为重组后的实际文件路径。
 * @param articlePath URL 中请求的新版或旧版文章路径。
 */
function getCurrentKnowledgeArticlePath(articlePath: string): string {
  /** 旧版公开路径按通用目录规则转换后的规范路径。 */
  let migratedArticlePath = articlePath

  for (const directoryMigration of KNOWLEDGE_DIRECTORY_MIGRATIONS) {
    /** 当前目录迁移规则转换出的规范路径。 */
    const currentArticlePath = replaceKnowledgePathPrefix(
      articlePath,
      directoryMigration.legacyPrefix,
      directoryMigration.currentPrefix
    )

    if (currentArticlePath) {
      migratedArticlePath = currentArticlePath
      break
    }
  }

  /** AI 应用旧目录完成重分类后的中间路径。 */
  const currentAiAppArticlePath = getCurrentAiAppArticlePath(migratedArticlePath)
  return getCurrentGuideSequenceArticlePath(currentAiAppArticlePath)
}

/**
 * 根据旧 Agent 课程目录名称返回重分类后的 AI 应用模块目录。
 * @param courseDirectoryName 旧 Agent 目录下的课程或附录目录名称。
 */
function getAiAppCategoryDirectory(courseDirectoryName: string): string {
  /** 课程目录开头用于分类的原始课号。 */
  const courseOrder = getCourseOrder(courseDirectoryName)

  if (courseOrder !== null && AI_APP_AGENT_ENGINEERING_COURSE_ORDERS.has(courseOrder)) {
    return '01-Agent工程'
  }

  if (courseOrder !== null && AI_APP_LANGCHAIN_COURSE_ORDERS.has(courseOrder)) {
    return '05-LangChain实战'
  }

  if (courseOrder !== null && AI_APP_LANGGRAPH_COURSE_ORDERS.has(courseOrder)) {
    return '06-LangGraph'
  }

  if (courseOrder !== null && AI_APP_OBSERVABILITY_COURSE_ORDERS.has(courseOrder)) {
    return '07-LangSmith-LangFuse'
  }

  if (courseOrder !== null && AI_APP_ENTERPRISE_KNOWLEDGE_COURSE_ORDERS.has(courseOrder)) {
    return '02-企业级知识库'
  }

  return '08-工程基础'
}

/**
 * 根据 AI 应用实体模块目录返回页面使用的模块展示名称。
 * @param categoryDirectory AI 应用路线下带排序前缀的模块目录。
 */
function getAiAppTopicByCategoryDirectory(categoryDirectory: string): string {
  /** 去除实体排序前缀后的模块目录名称。 */
  const sectionName = getDisplayName(categoryDirectory)
  return AI_APP_TOPIC_BY_SECTION_NAME[sectionName] || sectionName
}

/**
 * 查找指定模块和实体系列目录对应的归组规则。
 * @param topic 当前文章所属的一级模块。
 * @param directoryName 当前文章所在的实体系列目录名称。
 */
function getAiAppSubtopicRuleByDirectory(topic: string, directoryName: string): AiAppSubtopicRule | undefined {
  return AI_APP_SUBTOPIC_RULES.find(
    (subtopicRule) => subtopicRule.topic === topic && subtopicRule.directoryName === directoryName
  )
}

/**
 * 查找指定模块和旧课程目录对应的系列归组规则。
 * @param topic 当前文章所属的一级模块。
 * @param courseDirectoryName 重组前直接位于模块下的课程目录名称。
 */
function getAiAppSubtopicRuleByCourseDirectory(
  topic: string,
  courseDirectoryName: string
): AiAppSubtopicRule | undefined {
  /** 旧课程目录保留的原始课号。 */
  const courseOrder = getCourseOrder(courseDirectoryName)
  if (courseOrder === null) {
    return undefined
  }

  return AI_APP_SUBTOPIC_RULES.find(
    (subtopicRule) => subtopicRule.topic === topic && subtopicRule.courseOrders.has(courseOrder)
  )
}

/**
 * 返回旧全局课号在当前系列中的本地课号。
 * @param subtopicRule 当前课程所属的系列规则。
 * @param originalCourseOrder 课程重组前使用的全局课号。
 */
function getAiAppLocalCourseOrder(subtopicRule: AiAppSubtopicRule, originalCourseOrder: number): number | null {
  /** 旧全局课号在系列课程顺序中的下标。 */
  const originalCourseIndex = [...subtopicRule.courseOrders].indexOf(originalCourseOrder)
  return originalCourseIndex >= 0 ? originalCourseIndex + 1 : null
}

/**
 * 返回系列本地课号对应的旧全局课号。
 * @param subtopicRule 当前课程所属的系列规则。
 * @param localCourseOrder 课程在当前系列中从 01 开始的课号。
 */
function getAiAppOriginalCourseOrder(subtopicRule: AiAppSubtopicRule, localCourseOrder: number): number | null {
  /** 当前系列按原始顺序保存的全部旧全局课号。 */
  const originalCourseOrders = [...subtopicRule.courseOrders]
  return originalCourseOrders[localCourseOrder - 1] ?? null
}

/**
 * 替换课程目录的数字前缀并保留课程名称。
 * @param courseDirectoryName 带数字前缀的课程目录名称。
 * @param courseOrder 需要写入目录的两位课程编号。
 */
function replaceCourseDirectoryOrder(courseDirectoryName: string, courseOrder: number): string {
  /** 去掉旧数字前缀后需要原样保留的课程名称。 */
  const courseTitle = courseDirectoryName.replace(COURSE_ORDER_PATTERN, '')
  /** 补齐为两位数的系列内课程编号。 */
  const courseOrderLabel = courseOrder.toString().padStart(2, '0')
  return `${courseOrderLabel}-${courseTitle}`
}

/**
 * 判断规范知识路径是否已经指向现有文件或目录入口。
 * @param articlePath 不带 Markdown 扩展名的知识文章路径。
 */
function doesKnowledgeArticlePathExist(articlePath: string): boolean {
  /** 当前文章路径对应的无扩展名绝对路径。 */
  const articleBasePath = resolve(KNOWLEDGE_CONTENT_ROOT, ...articlePath.split('/'))
  if (fs.existsSync(articleBasePath)) {
    return true
  }

  for (const extension of MARKDOWN_EXTENSIONS) {
    /** 当前尝试匹配的 Markdown 文件路径。 */
    const markdownFilePath = `${articleBasePath}${extension}`
    if (fs.existsSync(markdownFilePath)) {
      return true
    }
  }

  for (const entryName of DIRECTORY_ENTRY_NAMES) {
    for (const extension of MARKDOWN_EXTENSIONS) {
      /** 当前尝试匹配的目录入口文件路径。 */
      const directoryEntryPath = join(articleBasePath, `${entryName}${extension}`)
      if (fs.existsSync(directoryEntryPath)) {
        return true
      }
    }
  }

  return false
}

/**
 * 将模块下的旧扁平课程路径转换为带实体系列目录的规范路径。
 * @param articlePath 已完成模块重分类的 AI 应用文章路径。
 */
function getCurrentAiAppSeriesArticlePath(articlePath: string): string {
  /** 当前文章路径按目录拆分后的片段。 */
  const pathSegments = articlePath.split('/')
  if (pathSegments[0] !== AI_APP_TRACK_DIRECTORY_NAME || pathSegments.length < 3) {
    return articlePath
  }

  /** 当前文章所属的 AI 应用实体模块目录。 */
  const categoryDirectory = pathSegments[1] || ''
  /** 模块下的系列目录或旧课程目录。 */
  const seriesOrCourseDirectory = pathSegments[2] || ''

  if (
    categoryDirectory === AI_APP_SOLO_COMPANY_CATEGORY_DIRECTORY &&
    seriesOrCourseDirectory === AI_APP_LEGACY_PAPERCLIP_DIRECTORY
  ) {
    pathSegments[2] = AI_APP_PAPERCLIP_DIRECTORY
    return pathSegments.join('/')
  }

  if (
    categoryDirectory === AI_APP_ENTERPRISE_CATEGORY_DIRECTORY &&
    seriesOrCourseDirectory === AI_APP_LEGACY_INFRASTRUCTURE_DIRECTORY
  ) {
    pathSegments[2] = AI_APP_INFRASTRUCTURE_DIRECTORY
    return pathSegments.join('/')
  }

  if (
    categoryDirectory === AI_APP_ENGINEERING_FOUNDATION_CATEGORY_DIRECTORY &&
    seriesOrCourseDirectory === AI_APP_LEGACY_APPENDIX_DIRECTORY
  ) {
    pathSegments[2] = AI_APP_APPENDIX_DIRECTORY
    return pathSegments.join('/')
  }

  /** 当前实体模块对应的页面展示名称。 */
  const topic = getAiAppTopicByCategoryDirectory(categoryDirectory)
  /** 当前路径第三层已经匹配到的实体系列规则。 */
  const currentSeriesRule = getAiAppSubtopicRuleByDirectory(topic, seriesOrCourseDirectory)
  if (currentSeriesRule) {
    if (doesKnowledgeArticlePathExist(articlePath)) {
      return articlePath
    }

    /** 系列目录下仍使用旧全局课号的历史课程目录。 */
    const legacyCourseDirectory = pathSegments[3] || ''
    /** 历史课程目录携带的旧全局课号。 */
    const originalCourseOrder = getCourseOrder(legacyCourseDirectory)
    /** 旧全局课号换算出的系列内本地课号。 */
    const localCourseOrder =
      originalCourseOrder === null ? null : getAiAppLocalCourseOrder(currentSeriesRule, originalCourseOrder)
    if (localCourseOrder !== null) {
      pathSegments[3] = replaceCourseDirectoryOrder(legacyCourseDirectory, localCourseOrder)
    }

    return pathSegments.join('/')
  }

  /** 旧扁平课程应插入的实体系列目录规则。 */
  const matchedRule = getAiAppSubtopicRuleByCourseDirectory(topic, seriesOrCourseDirectory)
  if (!matchedRule) {
    return articlePath
  }

  /** 旧扁平课程目录携带的全局课号。 */
  const originalCourseOrder = getCourseOrder(seriesOrCourseDirectory)
  /** 当前课程换算出的系列内本地课号。 */
  const localCourseOrder =
    originalCourseOrder === null ? null : getAiAppLocalCourseOrder(matchedRule, originalCourseOrder)
  if (localCourseOrder !== null) {
    pathSegments[2] = replaceCourseDirectoryOrder(seriesOrCourseDirectory, localCourseOrder)
  }

  pathSegments.splice(2, 0, matchedRule.directoryName)
  return pathSegments.join('/')
}

/**
 * 将旧 Agent 规范路径路由到重分类后的实体目录。
 * @param articlePath 通用目录迁移完成后的文章路径。
 */
function getCurrentAiAppArticlePath(articlePath: string): string {
  /** 当前文章路径按目录拆分后的片段。 */
  const pathSegments = articlePath.split('/')
  /** 旧 Agent 模块下的系列目录、课程目录或模块指南文件名。 */
  const agentChildDirectory = pathSegments[2] || ''

  if (pathSegments.slice(0, 2).join('/') === AI_APP_LEGACY_AGENT_CURRENT_PREFIX && agentChildDirectory) {
    /** Agent 工程中已存在的实体系列目录不能再次按系列编号重分类。 */
    const isCurrentAgentSeries = Boolean(
      getAiAppSubtopicRuleByDirectory(KNOWLEDGE_MODULE_LABELS.aiApps.agentEngineering, agentChildDirectory)
    )
    /** 只有旧编号课程和历史附录才需要从 Agent 模块路由到新模块。 */
    const isLegacyAgentChild =
      getCourseOrder(agentChildDirectory) !== null ||
      agentChildDirectory === AI_APP_LEGACY_APPENDIX_DIRECTORY ||
      agentChildDirectory === AI_APP_LEGACY_WRITING_GUIDE_NAME

    if (!isCurrentAgentSeries && isLegacyAgentChild) {
      pathSegments[1] = getAiAppCategoryDirectory(agentChildDirectory)
    }
  }

  return getCurrentAiAppSeriesArticlePath(pathSegments.join('/'))
}

/**
 * 返回新增实体系列目录之前使用的 AI 应用扁平路径。
 * @param articlePath 当前带实体系列目录的规范文章路径。
 */
function getLegacyFlatAiAppArticlePath(articlePath: string): string | null {
  /** 当前文章路径按目录拆分后的片段。 */
  const pathSegments = articlePath.split('/')
  if (pathSegments[0] !== AI_APP_TRACK_DIRECTORY_NAME || pathSegments.length < 3) {
    return null
  }

  /** 当前文章所属的 AI 应用实体模块目录。 */
  const categoryDirectory = pathSegments[1] || ''
  /** 当前文章所在的规范实体系列目录。 */
  const seriesDirectory = pathSegments[2] || ''

  if (categoryDirectory === AI_APP_SOLO_COMPANY_CATEGORY_DIRECTORY && seriesDirectory === AI_APP_PAPERCLIP_DIRECTORY) {
    pathSegments[2] = AI_APP_LEGACY_PAPERCLIP_DIRECTORY
    return pathSegments.join('/')
  }

  if (
    categoryDirectory === AI_APP_ENTERPRISE_CATEGORY_DIRECTORY &&
    seriesDirectory === AI_APP_INFRASTRUCTURE_DIRECTORY
  ) {
    pathSegments[2] = AI_APP_LEGACY_INFRASTRUCTURE_DIRECTORY
    return pathSegments.join('/')
  }

  if (
    categoryDirectory === AI_APP_ENGINEERING_FOUNDATION_CATEGORY_DIRECTORY &&
    seriesDirectory === AI_APP_APPENDIX_DIRECTORY
  ) {
    pathSegments[2] = AI_APP_LEGACY_APPENDIX_DIRECTORY
    return pathSegments.join('/')
  }

  /** 当前实体模块对应的页面展示名称。 */
  const topic = getAiAppTopicByCategoryDirectory(categoryDirectory)
  /** 当前实体系列对应的归组规则。 */
  const matchedRule = getAiAppSubtopicRuleByDirectory(topic, seriesDirectory)
  if (!matchedRule) {
    return null
  }

  /** 当前系列内从 01 开始编号的课程目录。 */
  const localCourseDirectory = pathSegments[3] || ''
  /** 当前课程使用的系列内本地课号。 */
  const localCourseOrder = getCourseOrder(localCourseDirectory)
  /** 本地课号换算出的旧全局课号。 */
  const originalCourseOrder =
    localCourseOrder === null ? null : getAiAppOriginalCourseOrder(matchedRule, localCourseOrder)
  if (originalCourseOrder !== null) {
    pathSegments[3] = replaceCourseDirectoryOrder(localCourseDirectory, originalCourseOrder)
  }

  pathSegments.splice(2, 1)
  return pathSegments.join('/')
}

/**
 * 返回保留系列目录、但课程仍使用旧全局课号的历史路径。
 * @param articlePath 当前使用系列内本地课号的规范文章路径。
 */
function getLegacyGlobalAiAppSeriesArticlePath(articlePath: string): string | null {
  /** 当前文章路径按目录拆分后的片段。 */
  const pathSegments = articlePath.split('/')
  if (pathSegments[0] !== AI_APP_TRACK_DIRECTORY_NAME || pathSegments.length < 4) {
    return null
  }

  /** 当前文章所属的 AI 应用实体模块目录。 */
  const categoryDirectory = pathSegments[1] || ''
  /** 当前文章所在的实体系列目录。 */
  const seriesDirectory = pathSegments[2] || ''
  if (
    categoryDirectory === AI_APP_ENTERPRISE_CATEGORY_DIRECTORY &&
    seriesDirectory === AI_APP_INFRASTRUCTURE_DIRECTORY
  ) {
    return null
  }

  /** 当前实体模块对应的页面展示名称。 */
  const topic = getAiAppTopicByCategoryDirectory(categoryDirectory)
  /** 当前实体系列对应的归组规则。 */
  const matchedRule = getAiAppSubtopicRuleByDirectory(topic, seriesDirectory)
  if (!matchedRule) {
    return null
  }

  /** 当前系列内从 01 开始编号的课程目录。 */
  const localCourseDirectory = pathSegments[3] || ''
  /** 当前课程使用的系列内本地课号。 */
  const localCourseOrder = getCourseOrder(localCourseDirectory)
  /** 本地课号换算出的旧全局课号。 */
  const originalCourseOrder =
    localCourseOrder === null ? null : getAiAppOriginalCourseOrder(matchedRule, localCourseOrder)
  if (originalCourseOrder === null || originalCourseOrder === localCourseOrder) {
    return null
  }

  pathSegments[3] = replaceCourseDirectoryOrder(localCourseDirectory, originalCourseOrder)
  return pathSegments.join('/')
}

/**
 * 返回重分类 AI 应用文章原来使用的 Agent 公开路径。
 * @param articlePath 重分类后的规范文章路径。
 */
function getLegacyAiAppArticlePath(articlePath: string): string | null {
  /** 去除新增实体系列层级后才能按旧课程编号判断来源模块。 */
  const legacyFlatArticlePath = getLegacyFlatAiAppArticlePath(articlePath) || articlePath
  /** 可能包含旧 Agent 文章的当前模块目录。 */
  const categoryDirectories = [
    AI_APP_ENTERPRISE_CATEGORY_DIRECTORY,
    '05-LangChain实战',
    '06-LangGraph',
    '07-LangSmith-LangFuse',
    AI_APP_ENGINEERING_FOUNDATION_CATEGORY_DIRECTORY
  ]

  for (const categoryDirectory of categoryDirectories) {
    /** 当前模块在 AI 应用路线中的完整前缀。 */
    const categoryPrefix = `${AI_APP_TRACK_DIRECTORY_NAME}/${categoryDirectory}`
    /** 当前前缀之后可能来自旧 Agent 目录的相对路径。 */
    const categorySuffix = replaceKnowledgePathPrefix(legacyFlatArticlePath, categoryPrefix, '')
    if (!categorySuffix) {
      continue
    }

    /** 当前相对路径的课程目录名。 */
    const courseDirectoryName = categorySuffix.replace(/^\//, '').split('/')[0] || ''
    /** 当前课程原始编号。 */
    const courseOrder = getCourseOrder(courseDirectoryName)
    /** 有编号课程按原分类表核对，防止新建指南争用旧 `/02-Agent/course` 路径。 */
    const isMigratedNumberedCourse =
      courseOrder !== null && getAiAppCategoryDirectory(courseDirectoryName) === categoryDirectory
    /** 旧 Agent 目录中的附录和写作指南已整体迁入工程基础。 */
    const isMigratedEngineeringReference =
      categoryDirectory === AI_APP_ENGINEERING_FOUNDATION_CATEGORY_DIRECTORY &&
      (courseDirectoryName === AI_APP_LEGACY_APPENDIX_DIRECTORY ||
        courseDirectoryName === AI_APP_LEGACY_WRITING_GUIDE_NAME)

    if (!isMigratedNumberedCourse && !isMigratedEngineeringReference) {
      return null
    }

    return `${AI_APP_LEGACY_AGENT_PUBLIC_PREFIX}${categorySuffix}`
  }

  return null
}

/**
 * 返回重分类前位于完整 Agent 目录下的历史路径。
 * @param articlePath 重分类后的规范文章路径。
 */
function getLegacyAiAppCurrentArticlePath(articlePath: string): string | null {
  /** 先复用严格的迁移判断，只有真实迁出课程才存在旧 Agent 路径。 */
  const legacyPublicPath = getLegacyAiAppArticlePath(articlePath)
  if (!legacyPublicPath) {
    return null
  }

  /** 旧短公开前缀之后需要保留的课程相对路径。 */
  const legacyArticleSuffix = replaceKnowledgePathPrefix(legacyPublicPath, AI_APP_LEGACY_AGENT_PUBLIC_PREFIX, '')
  if (!legacyArticleSuffix) {
    return null
  }

  return `${AI_APP_LEGACY_AGENT_CURRENT_PREFIX}${legacyArticleSuffix}`
}

/**
 * 隐藏仅用于文件系统排序的数字前缀。
 * @param name 目录或文件的原始名称。
 */
function getDisplayName(name: string): string {
  return name.replace(ORDER_PREFIX_PATTERN, '')
}

/**
 * 提取课程目录开头用于分类的数字编号。
 * @param courseName 带可选数字前缀的课程目录或文件名。
 */
function getCourseOrder(courseName: string | undefined): number | null {
  /** 课程名称开头的数字前缀匹配结果。 */
  const courseOrderMatch = courseName?.match(COURSE_ORDER_PATTERN)

  return courseOrderMatch?.[1] ? Number.parseInt(courseOrderMatch[1], 10) : null
}

/**
 * 将 AI 应用目录中的单篇课程归并到真正的系列小标题。
 * @param topic 当前文章所属的一级模块。
 * @param courseDirectoryName 当前文章第三层的原始课程目录名称。
 * @param fallbackSubtopic 未命中系列配置时使用的原始细分类名称。
 */
function getAiAppSubtopic(topic: string, courseDirectoryName: string | undefined, fallbackSubtopic: string): string {
  /** 当前课程目录保留的原始排序编号。 */
  const courseOrder = getCourseOrder(courseDirectoryName)
  if (courseOrder === null) {
    return fallbackSubtopic
  }

  /** 同时匹配一级模块和课程编号的系列规则。 */
  const matchedRule = AI_APP_SUBTOPIC_RULES.find(
    (subtopicRule) => subtopicRule.topic === topic && subtopicRule.courseOrders.has(courseOrder)
  )

  return matchedRule?.label || fallbackSubtopic
}

/**
 * 根据全栈文章路径返回与思维导图一致的一级模块。
 * @param sectionName 当前文章去除排序前缀后的顶层板块名称。
 */
function getFullStackTopic(sectionName: string): string {
  if (sectionName === FRONTEND_SECTION_NAME) {
    return KNOWLEDGE_MODULE_LABELS.fullStack.frontend
  }

  if (sectionName === TESTING_SECTION_NAME) {
    return KNOWLEDGE_MODULE_LABELS.fullStack.testing
  }

  if (sectionName !== BACKEND_SECTION_NAME) {
    return KNOWLEDGE_MODULE_LABELS.fullStack.business
  }

  // 修复系统课程被按课号拆散的问题：Java 与 Python 应保持完整后端学习路线，不归入运维、测试或业务。
  return KNOWLEDGE_MODULE_LABELS.fullStack.backend
}

/**
 * 根据文章目录结构生成知识库侧栏使用的一级模块名称。
 * @param trackSectionName 当前文章去除排序前缀后的路线目录名称。
 * @param contentSectionName 当前文章在路线中的模块目录名称。
 */
function getArticleTopic(trackSectionName: string, contentSectionName: string): string {
  if (trackSectionName === AI_CODING_SECTION_NAME) {
    // 修复带连字符的实体目录无法命中页面模块配置：目录仍保留 URL 语义，展示名称统一使用空格。
    return contentSectionName.replaceAll('-', ' ')
  }

  if (trackSectionName === AI_APP_TRACK_SECTION_NAME) {
    return AI_APP_TOPIC_BY_SECTION_NAME[contentSectionName] || contentSectionName
  }

  return getFullStackTopic(contentSectionName)
}

/**
 * 识别文章在初学者学习路径中的用途。
 * @param sourceArticlePath 不含扩展名的源文章相对路径。
 */
function getArticleKind(sourceArticlePath: string): KnowledgeArticleKind {
  /** 源文章路径的分段结果。 */
  const pathSegments = sourceArticlePath.split('/')
  /** 源文章不含目录的文件名。 */
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
    pathSegments.some((segment) => segment.startsWith('98-') || segment.startsWith('99-')) ||
    pathSegments.includes('appendices') ||
    pathSegments.some((segment) => getDisplayName(segment) === '附录') ||
    pathSegments.includes('extras') ||
    pathSegments.includes('raw')
  ) {
    return 'reference'
  }

  return 'lesson'
}

/**
 * 把文章文件转换为页面所需的元数据。
 * @param filePath 文章绝对路径。
 */
function createArticleMetadata(filePath: string): KnowledgeArticle {
  /** 文章相对知识库根目录的系统路径。 */
  const systemRelativePath = relative(KNOWLEDGE_CONTENT_ROOT, filePath)
  /** 跨平台统一为正斜杠的文章路径。 */
  const markdownPath = systemRelativePath.split(sep).join('/')
  /** 不包含 Markdown 扩展名的文章路径。 */
  const sourceArticlePath = markdownPath.slice(0, -extname(markdownPath).length)
  /** 隐藏目录入口文件名后的公开文章路径。 */
  const articlePath = getPublicArticlePath(sourceArticlePath)
  /** 文章路径的分段结果。 */
  const slug = articlePath.split('/')
  /** 文章原始内容，用来提取显示标题。 */
  const markdown = fs.readFileSync(filePath, 'utf8')
  /** 没有一级标题时使用的文件名。 */
  const fallbackTitle = slug.at(-1) || '未命名文章'
  /** 当前文章在学习路径中的用途。 */
  const kind = getArticleKind(sourceArticlePath)
  /** Markdown 中声明或由文件名回退得到的原始标题。 */
  const rawTitle = extractTitle(markdown, fallbackTitle)
  /** 清理源文件旧课号后等待模块内重新编号的标题。 */
  const title = getBaseArticleTitle(rawTitle, sourceArticlePath)
  /** 当前文章所属的顶层路线目录名称。 */
  const trackSectionName = getDisplayName(slug[0] || '其他')
  /** 当前文章在路线中的实体模块目录名称。 */
  const contentSectionName = getDisplayName(slug[1] || trackSectionName)
  /** 与实体目录一一对应的模块名称。 */
  const topic = getArticleTopic(trackSectionName, contentSectionName)
  /** 全栈与 AI 应用路线使用第三层实体目录生成可导航的课程细分类。 */
  const subtopicPathSegment =
    trackSectionName === FULL_STACK_SECTION_NAME || trackSectionName === AI_APP_TRACK_SECTION_NAME ? slug[2] : slug[1]
  /** 文章路径对应的原始课程或技术细分类名称。 */
  const rawSubtopic = getDisplayName(subtopicPathSegment || contentSectionName)
  /** 使用标准技术名称或去除路径分隔符后的细分类展示名称。 */
  const normalizedSubtopic = KNOWLEDGE_SUBTOPIC_LABELS[rawSubtopic.toLowerCase()] || rawSubtopic.replaceAll('-', ' ')
  /** AI 应用实体系列目录对应的归组配置。 */
  const physicalAiAppSubtopicRule =
    trackSectionName === AI_APP_TRACK_SECTION_NAME && subtopicPathSegment
      ? getAiAppSubtopicRuleByDirectory(topic, subtopicPathSegment)
      : undefined
  /** 第四层路径存在时，第三层就是实体系列目录，不能把系列序号误当成旧课号。 */
  const hasPhysicalAiAppSubtopic = trackSectionName === AI_APP_TRACK_SECTION_NAME && Boolean(slug[3])
  /** AI 应用优先使用实体系列名称，旧扁平路径仍可按课程编号回退归组。 */
  const subtopic =
    trackSectionName === AI_APP_TRACK_SECTION_NAME
      ? physicalAiAppSubtopicRule?.label ||
        (hasPhysicalAiAppSubtopic
          ? normalizedSubtopic
          : getAiAppSubtopic(topic, subtopicPathSegment, normalizedSubtopic))
      : normalizedSubtopic
  /** 当前文章所属的公开学习主线；总览等公共文章不限定主线。 */
  const track = KNOWLEDGE_TRACK_BY_SECTION[trackSectionName] || null

  return {
    slug,
    path: articlePath,
    displayPath: articlePath,
    sourcePath: sourceArticlePath,
    href: `/knowledge/${encodePath(articlePath)}`,
    title,
    sequence: 0,
    topic,
    subtopic,
    track,
    kind,
    breadcrumbs: slug.slice(0, -1)
  }
}

/**
 * 将 Markdown 的首个一级标题替换为元数据中的统一有序标题。
 * @param orderedTitle 列表和阅读页共用的规范标题。
 */
function rewriteArticleHeading(orderedTitle: string) {
  return (tree: MarkdownNode) => {
    /** Markdown 中首个一级标题节点。 */
    const headingNode = tree.children?.find((node) => node.type === 'heading' && node.depth === 1)

    if (!headingNode) {
      // 配套提示词和角色配置常省略 H1；阅读页仍需展示与侧栏一致的可定位标题。
      tree.children = [
        { type: 'heading', depth: 1, children: [{ type: 'text', value: orderedTitle }] },
        ...(tree.children || [])
      ]
      return
    }

    headingNode.children = [{ type: 'text', value: orderedTitle }]
  }
}

/**
 * 返回文章实体路径中的系列内课程号。
 * @param article 当前需要生成标题的文章元数据。
 */
function getPhysicalCourseSequence(article: KnowledgeArticle): number | null {
  /** 当前路线的课程目录在公开路径中的固定下标。 */
  const coursePathSegmentIndex =
    article.track === 'ai-coding'
      ? AI_CODING_COURSE_PATH_SEGMENT_INDEX
      : article.track === 'full-stack' || article.track === 'ai-apps'
        ? NESTED_COURSE_PATH_SEGMENT_INDEX
        : null

  if (coursePathSegmentIndex === null) {
    return null
  }

  /** 文章规范路径按目录拆分后的片段。 */
  const pathSegments = article.path.split('/')
  /** 文章所属实体课程的目录或文件名。 */
  const coursePathSegment = pathSegments[coursePathSegmentIndex] || ''
  return getCourseOrder(coursePathSegment)
}

/** 返回全部知识文章元数据，并按原目录与编号顺序排列。 */
export function getKnowledgeArticles(): KnowledgeArticle[] {
  if (process.env.NODE_ENV === 'production' && productionKnowledgeArticles) {
    return productionKnowledgeArticles
  }

  /** 按实体模块、文章用途和源路径完成基础排序的文章。 */
  const sortedArticles = findMarkdownFiles(KNOWLEDGE_CONTENT_ROOT)
    .map(createArticleMetadata)
    .sort((leftArticle, rightArticle) => {
      /** 左侧文章用于聚合同一课程的路径。 */
      const leftSegments = leftArticle.path.split('/')
      /** 右侧文章用于聚合同一课程的路径。 */
      const rightSegments = rightArticle.path.split('/')
      /** 左侧文章所属的路线目录名称。 */
      const leftTrackSectionName = getDisplayName(leftSegments[0] || '')
      /** 左侧路线需要保留到课程层的目录深度。 */
      const leftGroupDepth = COURSE_GROUP_DEPTH_BY_TRACK_SECTION[leftTrackSectionName] || 1
      /** 左侧文章的课程分组路径。 */
      const leftGroupPath = leftSegments.slice(0, leftGroupDepth).join('/')
      /** 右侧文章所属的路线目录名称。 */
      const rightTrackSectionName = getDisplayName(rightSegments[0] || '')
      /** 右侧路线需要保留到课程层的目录深度。 */
      const rightGroupDepth = COURSE_GROUP_DEPTH_BY_TRACK_SECTION[rightTrackSectionName] || 1
      /** 右侧文章的课程分组路径。 */
      const rightGroupPath = rightSegments.slice(0, rightGroupDepth).join('/')
      /** 两篇文章所属课程的排序结果。 */
      const groupComparison = leftGroupPath.localeCompare(rightGroupPath, 'zh-CN', { numeric: true })

      if (groupComparison !== 0) {
        return groupComparison
      }

      /** 两篇文章所属阅读阶段的排序结果。 */
      const sequenceGroupComparison =
        ARTICLE_SEQUENCE_GROUP[leftArticle.kind] - ARTICLE_SEQUENCE_GROUP[rightArticle.kind]

      return sequenceGroupComparison || leftArticle.path.localeCompare(rightArticle.path, 'zh-CN', { numeric: true })
    })

  /** 各学习主线与实体模块已经分配到的 UI 文章数量。 */
  const sequenceByModule = new Map<string, number>()
  /** 各学习主线、实体模块与细分类已经分配到的标题回退顺序。 */
  const sequenceBySubtopic = new Map<string, number>()
  /** 补齐模块 UI 课号、细分类标题课号和最终标题后的文章目录。 */
  const sequencedArticles = sortedArticles.map((article) => {
    /** 当前文章所属主线和实体模块组成的 UI 分组键。 */
    const moduleKey = `${article.track || 'shared'}:${article.topic}`
    /** 当前文章所属主线、实体模块和细分类组成的唯一分组键。 */
    const subtopicKey = `${article.track || 'shared'}:${article.topic}:${article.subtopic}`
    /** 当前文章在所属模块中从 01 开始、由列表 UI 单独显示的顺序。 */
    const moduleSequence = (sequenceByModule.get(moduleKey) || 0) + 1
    /** 当前文章在所属细分类中从 01 开始、写入标题的顺序。 */
    const subtopicSequence = (sequenceBySubtopic.get(subtopicKey) || 0) + 1
    /** 实体目录中与路径保持一致的系列内课程号。 */
    const physicalCourseSequence = getPhysicalCourseSequence(article)
    /** 有实体课程号时主课和 demo 共用课号，其他文章继续使用细分类顺序。 */
    const titleSequence = physicalCourseSequence ?? subtopicSequence
    sequenceByModule.set(moduleKey, moduleSequence)
    sequenceBySubtopic.set(subtopicKey, subtopicSequence)

    return {
      ...article,
      sequence: moduleSequence,
      title: getSequencedArticleTitle(article.title, article.kind, titleSequence)
    }
  })

  if (process.env.NODE_ENV === 'production') {
    productionKnowledgeArticles = sequencedArticles
  }

  return sequencedArticles
}

/**
 * 安全解码一个 URL 路径片段，无法解码时返回空值。
 * @param segment URL 中的单个路径片段。
 */
function decodePathSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

/**
 * 验证并解析用户请求的文章路径，防止通过路径片段越出知识库目录。
 * @param slug URL 中的文章路径片段。
 */
function resolveArticleFile(slug: string[]): string | null {
  /** 解码并去掉无效值后的文章路径片段。 */
  const normalizedSlug = slug.map(decodePathSegment).filter((segment): segment is string => Boolean(segment))

  if (
    normalizedSlug.length !== slug.length ||
    normalizedSlug.length === 0 ||
    normalizedSlug.some((segment) => segment === '.' || segment === '..')
  ) {
    return null
  }

  /** URL 中经过安全校验的新版或旧版文章路径。 */
  const requestedArticlePath = normalizedSlug.join('/')
  /** 旧版路径迁移后对应的实际规范文章路径。 */
  const currentArticlePath = getMergedDemoArticlePath(getCurrentKnowledgeArticlePath(requestedArticlePath))
  /** 未携带扩展名的文章绝对路径。 */
  const articleBasePath = resolve(KNOWLEDGE_CONTENT_ROOT, ...currentArticlePath.split('/'))
  /** 知识库根目录的规范化前缀。 */
  const knowledgeRootPrefix = `${resolve(KNOWLEDGE_CONTENT_ROOT)}${sep}`

  if (!articleBasePath.startsWith(knowledgeRootPrefix)) {
    return null
  }

  for (const extension of MARKDOWN_EXTENSIONS) {
    /** 当前尝试读取的文章文件路径。 */
    const candidatePath = `${articleBasePath}${extension}`

    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return candidatePath
    }
  }

  for (const entryName of DIRECTORY_ENTRY_NAMES) {
    for (const extension of MARKDOWN_EXTENSIONS) {
      /** 当前目录入口文件的候选绝对路径。 */
      const candidatePath = join(articleBasePath, `${entryName}${extension}`)

      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
        return candidatePath
      }
    }
  }

  return null
}

/**
 * 拆分链接主体以及查询参数或锚点后缀。
 * @param url Markdown 节点中的原始链接。
 */
function splitUrlSuffix(url: string): { pathname: string; suffix: string } {
  /** 查询参数或锚点开始的位置。 */
  const suffixIndex = url.search(/[?#]/)

  if (suffixIndex === -1) {
    return { pathname: url, suffix: '' }
  }

  return {
    pathname: url.slice(0, suffixIndex),
    suffix: url.slice(suffixIndex)
  }
}

/**
 * 将文章中的相对图片和 Markdown 内链改写为博客可访问地址。
 * @param articlePath 当前文章相对知识库根目录的路径。
 */
function rewriteKnowledgeLinks(articlePath: string) {
  /** 当前文章所在的相对目录。 */
  const articleDirectory = posix.dirname(articlePath)

  /**
   * 遍历并改写 Markdown AST。
   * @param tree 当前文章的 Markdown AST 根节点。
   */
  return (tree: MarkdownNode): void => {
    /**
     * 递归处理一个 Markdown AST 节点。
     * @param node 当前需要处理的节点。
     */
    const visitNode = (node: MarkdownNode): void => {
      if ((node.type === 'image' || node.type === 'link') && node.url && !EXTERNAL_URL_PATTERN.test(node.url)) {
        /** 链接路径与查询参数或锚点的拆分结果。 */
        const { pathname, suffix } = splitUrlSuffix(node.url)
        /** 相对当前文章解析后的知识库路径。 */
        const resolvedPath = posix.normalize(posix.join(articleDirectory, pathname))

        if (!resolvedPath.startsWith('../')) {
          if (node.type === 'image') {
            node.url = `/knowledge-assets/${encodePath(resolvedPath)}${suffix}`
          } else if (MARKDOWN_EXTENSIONS.has(posix.extname(resolvedPath).toLowerCase())) {
            /** 去掉 Markdown 扩展名后的目标文章路径。 */
            const targetArticlePath = getMergedDemoArticlePath(
              resolvedPath.slice(0, -posix.extname(resolvedPath).length)
            )
            /** 隐藏目录入口文件名后的目标公开路径。 */
            const publicTargetArticlePath = getPublicArticlePath(targetArticlePath)
            node.url = `/knowledge/${encodePath(publicTargetArticlePath)}${suffix}`
          } else {
            node.url = `/knowledge-assets/${encodePath(resolvedPath)}${suffix}`
          }
        }
      }

      node.children?.forEach(visitNode)
    }

    visitNode(tree)
  }
}

/**
 * 把实验目录中的真实源码附加到 README，避免运行说明与代码文件脱节。
 * @param filePath 当前 Markdown 文件的绝对路径。
 * @param markdown 当前 Markdown 原文。
 */
function appendLabSourceFiles(filePath: string, markdown: string): string {
  /** 当前 Markdown 相对知识根目录的路径。 */
  const readmePath = relative(KNOWLEDGE_CONTENT_ROOT, filePath).split(sep).join('/')
  /** 构建期索引中与当前 README 对应的源码章节。 */
  /** 主文章同目录下、合并前实验 README 对应的源码索引键。 */
  const siblingLabReadmePath = posix.join(posix.dirname(readmePath), LAB_DIRECTORY_NAME, `${LAB_README_FILE_NAME}.md`)
  /** 优先兼容旧实验页，再为合并后的主文章读取同目录 lab 源码。 */
  const indexedSourceSections = LAB_SOURCE_INDEX.get(readmePath) || LAB_SOURCE_INDEX.get(siblingLabReadmePath) || []

  if (indexedSourceSections.length === 0) {
    return markdown
  }

  /** 转换为 Markdown 代码围栏后的源码章节。 */
  const sourceSections = indexedSourceSections.map(
    (sourceSection) =>
      `### \`${sourceSection.fileName}\`\n\n` +
      `\`\`\`${sourceSection.language}\n${sourceSection.sourceCode.trimEnd()}\n\`\`\``
  )

  return `${markdown.trimEnd()}\n\n## 可运行源码\n\n以下内容直接读取同目录源码文件，页面说明与实际执行代码保持一致。\n\n${sourceSections.join('\n\n')}`
}

/**
 * 根据显式白名单为当前文章构建可序列化的在线实验。
 * @param sourceArticlePath 当前文章相对知识根目录的无扩展名路径。
 */
function createKnowledgeSandboxes(sourceArticlePath: string): KnowledgeSandbox[] {
  /** 主文章同目录下、合并前实验 README 的稳定索引键。 */
  const siblingLabSourcePath = posix.join(posix.dirname(sourceArticlePath), LAB_DIRECTORY_NAME, LAB_README_FILE_NAME)
  /** 直接绑定当前正文的在线实验白名单。 */
  const articleSandboxDefinition = LAB_SANDBOX_DEFINITIONS.get(sourceArticlePath)
  /** 从已合并 Demo 继承的在线实验白名单。 */
  const mergedLabSandboxDefinition = LAB_SANDBOX_DEFINITIONS.get(siblingLabSourcePath)
  /** 当前文章最终使用的在线实验白名单；普通文章没有该配置。 */
  const sandboxDefinition = articleSandboxDefinition || mergedLabSandboxDefinition
  if (!sandboxDefinition) {
    return []
  }

  /**
   * 实际提供运行文件的路径；继承 Demo 配置时必须同步切到 Lab 目录，
   * 否则会错误地在正文目录中查找 main.py 或 sandbox.html。
   */
  const fileSourcePath =
    sandboxDefinition.fileSourcePath || (articleSandboxDefinition ? sourceArticlePath : siblingLabSourcePath)
  /** 构建期从关联 lab 目录读取的全部直接子文件。 */
  const indexedFiles = LAB_SANDBOX_FILE_INDEX.get(fileSourcePath) || []
  /** 严格按白名单顺序挑选入口和支持文件。 */
  const sandboxFiles = sandboxDefinition.fileNames.map((fileName) => {
    /** 与白名单文件名精确匹配的仓库文件。 */
    const indexedFile = indexedFiles.find((file) => file.name === fileName)
    if (!indexedFile) {
      throw new Error(`在线实验缺少白名单文件：${fileSourcePath}/${fileName}`)
    }
    if (fileName !== sandboxDefinition.entryFile || !sandboxDefinition.scenarioId) {
      return indexedFile
    }

    if (!indexedFile.content.includes(LAB_SANDBOX_SCENARIO_PLACEHOLDER)) {
      throw new Error(`共享在线实验缺少场景占位符：${fileSourcePath}/${fileName}`)
    }

    return {
      ...indexedFile,
      content: indexedFile.content.replace(
        LAB_SANDBOX_SCENARIO_PLACEHOLDER,
        JSON.stringify(sandboxDefinition.scenarioId)
      )
    }
  })

  return [
    {
      id: sourceArticlePath, // 使用文章源路径保证跨构建稳定且全局唯一。
      runtime: sandboxDefinition.runtime, // 仅允许白名单声明的 Python 或 HTML 环境。
      title: sandboxDefinition.title, // 显示与文章知识点匹配的实验名称。
      description: sandboxDefinition.description, // 告知读者运行后应该验证什么。
      entryFile: sandboxDefinition.entryFile, // 执行显式声明的入口，不接受页面输入。
      files: sandboxFiles // 只携带入口运行必需的仓库可信文件。
    }
  ]
}

/**
 * 读取并渲染一篇知识文章。
 * @param slug URL 中的文章路径片段。
 */
export async function getKnowledgeArticle(slug: string[]): Promise<KnowledgeArticlePageData | null> {
  /** 已验证且实际存在的文章文件路径。 */
  const filePath = resolveArticleFile(slug)

  if (!filePath) {
    return null
  }

  /** 文章原始 Markdown 内容。 */
  const markdown = await readFile(filePath, 'utf8')
  /** 实验页附加真实源码后的 Markdown 内容。 */
  const markdownWithLabSources = appendLabSourceFiles(filePath, markdown)
  /** 当前文件在知识库中的无扩展名源路径。 */
  const sourceArticlePath = relative(KNOWLEDGE_CONTENT_ROOT, filePath)
    .split(sep)
    .join('/')
    .replace(/\.(?:md|mdx)$/i, '')
  /** 全部文章的连续编号元数据，用于定位当前文章和相邻文章。 */
  const knowledgeArticles = getKnowledgeArticles()
  /** 文章列表和页面共用的连续编号元数据。 */
  const metadata = knowledgeArticles.find((article) => article.sourcePath === sourceArticlePath)

  if (!metadata) {
    return null
  }
  /** 当前实体模块中按阅读顺序排列的全部文章。 */
  const moduleArticles = knowledgeArticles.filter(
    (article) => article.track === metadata.track && article.topic === metadata.topic
  )
  /** 当前文章在实体模块阅读序列中的位置。 */
  const currentArticleIndex = moduleArticles.findIndex((article) => article.path === metadata.path)
  /** 当前文章之前的相邻文章；模块第一篇没有上一篇。 */
  const previousArticle = currentArticleIndex > 0 ? moduleArticles[currentArticleIndex - 1] || null : null
  /** 当前文章之后的相邻文章；模块最后一篇没有下一篇。 */
  const nextArticle = currentArticleIndex >= 0 ? moduleArticles[currentArticleIndex + 1] || null : null
  /** 去掉页面课号、用于生成题目兜底文案的文章名称。 */
  const quizTitle = metadata.title.replace(SEQUENCED_TITLE_PREFIX_PATTERN, '')
  /** 将 Obsidian 图片语法转换为标准 Markdown 后的文章内容。 */
  const normalizedMarkdown = markdownWithLabSources.replace(OBSIDIAN_IMAGE_PATTERN, (source, target: string) => {
    /** 去掉可选显示别名后的图片文件名。 */
    const assetName = target.split('|')[0]?.trim()
    /** 按文件名匹配到的同步媒体路径。 */
    const assetPath = assetName
      ? KNOWLEDGE_ASSET_PATHS.find((candidatePath) => posix.basename(candidatePath) === assetName)
      : undefined

    return assetPath ? `![${assetName}](/knowledge-assets/${encodePath(assetPath)})` : source
  })
  /** 经过 GFM 和相对链接处理后的 HTML 内容。 */
  const processedContent = await remark()
    .use(remarkGfm)
    .use(() => rewriteArticleHeading(metadata.title))
    .use(() => rewriteKnowledgeLinks(metadata.sourcePath))
    .use(html)
    .process(normalizedMarkdown)

  return {
    ...metadata,
    content: processedContent.toString(),
    mindmap: createKnowledgeMindmap(markdown, quizTitle, metadata.track === 'ai-apps', metadata.kind),
    sandboxes: createKnowledgeSandboxes(metadata.sourcePath),
    quiz: createKnowledgeQuiz(metadata.path, markdown, quizTitle, metadata.kind),
    previousArticle,
    nextArticle
  }
}
