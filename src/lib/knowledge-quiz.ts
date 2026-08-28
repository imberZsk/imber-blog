/** 单道知识题的选择方式。 */
export type KnowledgeQuizQuestionType = 'single' | 'multiple'

/** 自测题实际要求读者完成的认知任务。 */
export type KnowledgeQuizAssessmentKind = 'mechanism' | 'diagnosis' | 'decision'

/** 文章在学习路径中的用途，用于决定是否值得生成自测题。 */
export type KnowledgeQuizArticleKind = 'guide' | 'lesson' | 'practice' | 'reference'

/** 知识题中的一个候选答案。 */
export interface KnowledgeQuizOption {
  /** 选项在当前题中的稳定标识。 */
  id: string
  /** 用户看到的选项文案。 */
  label: string
  /** 当前选项是否属于正确答案。 */
  isCorrect: boolean
  /** 提交后展示的逐项判断依据。 */
  reason: string
}

/** 文章底部用于检验核心知识的选择题。 */
export interface KnowledgeQuizQuestion {
  /** 题目在文章中的稳定标识。 */
  id: string
  /** 题目采用单选还是多选。 */
  type: KnowledgeQuizQuestionType
  /** 需要用户判断的工程场景。 */
  prompt: string
  /** 当前题可以选择的答案。 */
  options: KnowledgeQuizOption[]
  /** 提交答案后展示的总结性解析。 */
  explanation: string
  /** 当前题实际检验的正文知识点，用于题组覆盖率审计。 */
  knowledgePoints?: string[]
  /** 当前题属于机制推演、故障诊断还是方案决策。 */
  assessmentKind?: KnowledgeQuizAssessmentKind
}

/** 单条人工题选项在分配 A、B、C、D 前的内容。 */
interface CuratedQuizOptionContent {
  /** 选项展示的工程判断。 */
  label: string
  /** 该判断成立或不成立的具体原因。 */
  reason: string
}

/** 自动题中尚未分配选项标识的判断及其证据。 */
interface GeneratedQuizOptionContent extends CuratedQuizOptionContent {
  /** 当前判断是否应该被用户选中。 */
  isCorrect: boolean
}

/** 正文中的一个可出题知识点及其可独立判断的结论。 */
interface QuizKnowledgeUnit {
  /** 用于题干和覆盖率审计的章节主题。 */
  topic: string
  /** 正文对该主题给出的具体结论。 */
  statement: string
}

/** 自动审计发现的一条题目质量问题。 */
export interface KnowledgeQuizAuditIssue {
  /** 便于 CI 聚合的稳定问题类型。 */
  code: string
  /** 包含文章和题目标识的可读错误信息。 */
  message: string
}

/** 选择题选项使用的稳定标识。 */
const QUIZ_OPTION_IDS = ['A', 'B', 'C', 'D'] as const

/** 每题固定选项数量，避免只有两个选项时靠猜。 */
const REQUIRED_QUIZ_OPTION_COUNT = 4

/** 每道多选题固定正确项数量，让用户必须辨析两条独立知识。 */
const REQUIRED_CORRECT_OPTION_COUNT = 2

/** 每篇可评测文章至少需要三道题，避免一题笼统覆盖全文。 */
const MIN_QUIZ_QUESTION_COUNT = 3

/** 单篇文章最多保留五道题，控制阅读页底部的作答负担。 */
const MAX_QUIZ_QUESTION_COUNT = 5

/** 每组题至少覆盖五个不同知识点；正文不足时由生成器覆盖全部可用知识点。 */
const MIN_QUIZ_KNOWLEDGE_POINT_COUNT = 5

/** 一条选项允许使用的最大字符数。 */
const MAX_QUIZ_STATEMENT_LENGTH = 140

/** 误区名称嵌入选项时允许保留的最大字符数。 */
const MAX_MISTAKE_LABEL_LENGTH = 70

/** 排除导航、配图规范和写作说明等不可评测内容。 */
const NON_ASSESSABLE_STATEMENT_PATTERN =
  /^(?:下一(?:篇|章)|继续阅读|延伸阅读|参考资料|可视化规格|VISUAL_STRATEGY|DIAGRAM_DESCRIPTION|SCREENSHOT_DESCRIPTION|架构图|流程图|思维导图|截图|作者自审|本文围绕|本章将|本 demo 配套|本小册)/i

/** 禁止再次出现的低信息题干模板。 */
const LOW_VALUE_PROMPT_PATTERN =
  /(?:以下关于|哪一项正确|哪些判断符合(?:本课|本文)内容|哪些结论有正文依据|demo[^，。？！]*判断)/i

/** 禁止进入选项的兜底水文。 */
const LOW_VALUE_OPTION_PATTERN =
  /(?:本文围绕|本章围绕|读完后，你应能|输出包含关键对象与数据流的链路图|需要结合具体目标、约束和验证结果来理解|只记住术语或 API 名称|工程上真正会踩的坑|本篇独有|挨个看|示例只要成功运行一次|只核对最终输出|不必验证异常路径|不必记录输入|^(?:讲清|看懂|掌握|学会|理解|写出|能够))/

/**
 * 为人工题组装一题稳定的四选多选题。
 * @param id 当前题的稳定标识。
 * @param prompt 带真实决策语境的题干。
 * @param correctOptions 两条应该选择的判断及理由。
 * @param incorrectOptions 两条不应该选择的判断及理由。
 * @param explanation 当前题最需要记住的总结。
 */
function createCuratedQuizQuestion(
  id: string,
  prompt: string,
  correctOptions: readonly CuratedQuizOptionContent[],
  incorrectOptions: readonly CuratedQuizOptionContent[],
  explanation: string,
  knowledgePoints: readonly string[] = [prompt],
  assessmentKind: KnowledgeQuizAssessmentKind = 'decision'
): KnowledgeQuizQuestion {
  /** 正确项和错误项组成的固定四项候选答案。 */
  const optionCandidates: GeneratedQuizOptionContent[] = [
    ...correctOptions.map((option) => ({ ...option, isCorrect: true })),
    ...incorrectOptions.map((option) => ({ ...option, isCorrect: false }))
  ]
  /** 根据题目标识生成稳定偏移，避免所有人工题都固定选择 A、B。 */
  const optionRotationOffset = getStableRotationOffset(id, optionCandidates.length)
  /** 轮换后的选项保持构建间稳定，同时让正确项分布更自然。 */
  const orderedOptionCandidates = rotateOptions(optionCandidates, optionRotationOffset)

  return {
    id,
    type: 'multiple',
    prompt,
    options: orderedOptionCandidates.map((option, optionIndex) => ({
      id: QUIZ_OPTION_IDS[optionIndex] || String(optionIndex + 1),
      ...option
    })),
    explanation,
    knowledgePoints: [...knowledgePoints],
    assessmentKind
  }
}

/**
 * 为 Python 或 TypeScript LangChain 入门文章生成三道与开篇问题一一对应的自测题。
 * @param corePackage 当前语言的 LangChain core 包名。
 * @param providerPackage 当前语言的 OpenAI 集成包名。
 * @param declaredKnowledgePoints 当前文章核心知识清单中的原文条目。
 * @returns 只覆盖框架选型、包职责和生态边界的三道题。
 */
function createLangChainIntroQuiz(
  corePackage: string,
  providerPackage: string,
  declaredKnowledgePoints: readonly string[]
): KnowledgeQuizQuestion[] {
  return [
    createCuratedQuizQuestion(
      'langchain-intro-when-to-use',
      '一个页面只有固定 Prompt 和一次模型调用；另一个 Agent 需要切换模型、注册多个 Tools 并记录 Trace。应该怎样选择？',
      [
        {
          label: '固定 Prompt 页面直接使用模型供应商 SDK。',
          reason: '只有一次稳定调用时，LangChain 的组合抽象不会带来额外价值。'
        },
        {
          label: '需要切换模型、组合 Tools 和记录 Trace 的 Agent 使用 LangChain。',
          reason: '这些需求正好需要统一 Message、Model、Tool 和运行扩展接口。'
        }
      ],
      [
        {
          label: '两个页面都必须使用 LangChain，因为所有大模型调用都依赖它。',
          reason: 'LangChain 是可选的应用框架，不是调用模型的必需依赖。'
        },
        {
          label: '两个页面都直接使用供应商 SDK，Tools 和 Trace 由 Prompt 自动完成。',
          reason: 'Prompt 不能替应用注册 Tool、管理调用循环或记录完整 Trace。'
        }
      ],
      '是否使用 LangChain 取决于当前是否需要统一和组合多个应用步骤，而不是项目是否调用了大模型。',
      declaredKnowledgePoints.slice(0, 2),
      'decision'
    ),
    createCuratedQuizQuestion(
      'langchain-intro-packages',
      `项目要创建 Agent、复用 Message/Runnable 契约并调用 OpenAI 模型，${corePackage} 与 ${providerPackage} 分别负责什么？`,
      [
        {
          label: `${corePackage} 提供 Message、Runnable、Prompt 和 Tool 等基础契约。`,
          reason: 'core 包保存跨供应商复用的接口，不负责连接某个具体模型。'
        },
        {
          label: `${providerPackage} 负责把统一消息转换为 OpenAI 请求并还原响应。`,
          reason: '供应商集成包负责协议转换和供应商特有配置。'
        }
      ],
      [
        {
          label: `${corePackage} 会自动选择并调用任意模型，不需要供应商集成包。`,
          reason: 'core 只定义契约，本身没有具体模型连接实现。'
        },
        {
          label: `${providerPackage} 负责定义业务权限、Tool 审批和 Agent 流程。`,
          reason: '供应商包只处理模型协议，业务规则和运行流程仍由应用与 LangChain 管理。'
        }
      ],
      `高层 langchain 包组织 Agent，${corePackage} 保存稳定契约，${providerPackage} 连接 OpenAI 模型。`,
      declaredKnowledgePoints.slice(2, 4),
      'mechanism'
    ),
    createCuratedQuizQuestion(
      'langchain-intro-ecosystem',
      '一个 Agent 需要分支、暂停恢复和持久化，同时团队还要查看 Trace 并做回归评测。LangGraph 与 LangSmith 应怎样分工？',
      [
        {
          label: 'LangGraph 管理状态、分支、循环、暂停恢复和持久化执行。',
          reason: '这些能力属于复杂运行流程和状态图，需要由 LangGraph 的执行状态统一管理。'
        },
        {
          label: 'LangSmith 记录 Trace、错误、耗时和评测结果。',
          reason: 'LangSmith 是观测与评测平台，不参与业务答案生成。'
        }
      ],
      [
        {
          label: 'LangSmith 负责执行 Agent 的分支和循环，LangGraph 只展示 Trace。',
          reason: '两者职责正好相反：LangGraph 执行状态图，LangSmith 观察和评估运行。'
        },
        {
          label: '接入 LangGraph 后就不再需要 LangChain 的 Model、Message 和 Tool 接口。',
          reason: 'LangGraph 只承担复杂运行状态，不会替代 LangChain 已经定义的应用组件契约。'
        }
      ],
      'LangChain 组织应用组件，LangGraph 管理复杂执行状态，LangSmith 记录和评估运行过程。',
      declaredKnowledgePoints.slice(4, 6),
      'diagnosis'
    )
  ]
}

/** 重点课程人工设计的核心知识题。 */
const CURATED_QUIZZES: Record<string, KnowledgeQuizQuestion[]> = {
  '03-AI大模型应用开发/01-LangChain/python/01-LangChain-入门': createLangChainIntroQuiz(
    'langchain-core',
    'langchain-openai',
    [
      'LangChain 是大模型应用框架，不是模型，也不会提升模型本身的知识和推理能力',
      'LangChain v1 的高层入口围绕 Agent、Model、Tool、Middleware 等能力组织',
      'langchain-core 保存消息、Runnable、Prompt 和 Tool 等基础契约',
      'langchain-openai 等集成包负责连接具体模型供应商',
      'LangGraph 承担更复杂的状态、分支、循环和持久化执行',
      'LangSmith 用于 Trace、评测与线上观测，不参与业务答案生成'
    ]
  ),
  '03-AI大模型应用开发/01-LangChain/typescript/01-LangChain-入门': createLangChainIntroQuiz(
    '@langchain/core',
    '@langchain/openai',
    [
      'LangChain 是大模型应用框架，不是模型，也不会提升模型本身的知识和推理能力',
      'LangChain v1 的高层入口围绕 Agent、Model、Tool、Middleware 等能力组织',
      '@langchain/core 保存消息、Runnable、Prompt 和 Tool 等基础契约',
      '@langchain/openai 等集成包负责连接具体模型供应商',
      'LangGraph 承担更复杂的状态、分支、循环和持久化执行',
      'LangSmith 用于 Trace、评测与线上观测，不参与业务答案生成'
    ]
  ),
  '01-全栈开发/02-后端/java/17-Spring事务与Transactional': [
    createCuratedQuizQuestion(
      'spring-transaction-boundary',
      '转账服务先扣减付款账户，再增加收款账户；第二条更新失败后付款余额却已减少。哪些修复和排查动作正确？',
      [
        {
          label: '把两条更新放进同一个 Service 公开方法，并配置 @Transactional(rollbackFor = Exception.class)。',
          reason: 'Service 方法表达完整转账动作；统一事务边界和明确回滚类型，才能让第二步异常触发第一步回滚。'
        },
        {
          label: '确认调用经过 Spring 代理、异常没有被吞掉，并检查两条 SQL 是否使用同一事务管理器和连接。',
          reason: '注解存在不代表事务实际生效；代理、异常传播、数据源和连接是定位“未回滚”的关键证据。'
        }
      ],
      [
        {
          label: '把入账方法改为 REQUIRES_NEW，使第二步独立提交，就能保证整个转账操作的原子性。',
          reason: '独立事务会切断原子边界；外层失败时内层可能已经提交，反而更容易产生部分成功。'
        },
        {
          label: '在 catch 中记录错误并正常 return，让 Controller 根据返回值决定是否回滚数据库。',
          reason: '异常被吞掉后事务代理会把方法视为成功并提交；Controller 的返回值不能撤销已经提交的事务。'
        }
      ],
      '事务问题要同时核对业务边界和代理执行链：同一 Service 事务覆盖全部写操作，失败异常必须穿过代理，并使用一致的数据源与连接。'
    )
  ],
  '02-AI编程/05-Agent-Harness/12-综合实战': [
    createCuratedQuizQuestion(
      'agent-harness-integration',
      '团队准备把命令行 Agent 从最小闭环扩展为可维护版本。哪些架构与迭代决策正确？',
      [
        {
          label: '让 run_agent 只负责编排模型、工具结果和终止条件，把工具实现、权限门卫与日志放在清晰边界中。',
          reason: '核心循环越薄，工具、安全和可观测性越能独立测试与替换，故障也更容易定位到具体层。'
        },
        {
          label: '先跑通“循环 + read_file”的最小闭环，每增加一种工具或横切能力都重新验证成功与失败路径。',
          reason: '小步集成能把新增故障限制在最近一次改动，避免十个组件同时接入后无法判断根因。'
        }
      ],
      [
        {
          label: '把工具实现、权限判断、日志和上下文截断全部写进 run_agent，减少函数数量就是降低复杂度。',
          reason: '代码行数减少不等于职责清晰；把横切逻辑塞进循环会造成强耦合、难测试和难替换。'
        },
        {
          label: '模型只要生成了 write_file 调用就立即执行，最终答案正常输出后再补日志即可。',
          reason: '模型输出不是授权；写操作必须先过参数校验和用户确认，日志也要覆盖执行前、执行后和失败阶段。'
        }
      ],
      '综合实战的重点不是把功能堆在一起，而是用薄循环、清晰边界、小步验证把各能力组装成可控系统。'
    )
  ],
  '02-AI编程/05-Agent-Harness/12-综合实战/lab/README': [
    createCuratedQuizQuestion(
      'agent-harness-lab-acceptance',
      '你运行完 Mini Claude Code 离线版，准备接入真实模型。哪些验收动作不能省略？',
      [
        {
          label: '先确认 mock 版完整经过列目录、读文件、写文件确认和工具日志，再替换模型调用层。',
          reason: '离线版用于验证 harness 控制流；先证明编排正确，接入真实模型后才不会把协议问题误判成模型问题。'
        },
        {
          label: '真实版继续保留轮次上限、system 消息、写入确认和工具调用日志，并分别测试拒绝写入与工具失败。',
          reason: '这些控制是生产边界，不是 mock 专用代码；失败和拒绝路径必须与成功路径一起验收。'
        }
      ],
      [
        {
          label: '本地命令行只由开发者使用，可以删除路径边界和写入确认，等部署后再补安全控制。',
          reason: '本地误操作同样会破坏仓库文件，而且先形成无门卫接口后再补权限通常会遗漏调用路径。'
        },
        {
          label: '终端出现最终回答就说明循环正确，无需核对工具调用顺序、参数和日志。',
          reason: '最终文本可能掩盖错误工具、错误参数或未执行操作；Trace 才能证明中间控制流符合预期。'
        }
      ],
      '从 mock 切到真实模型时只替换不确定的模型层，权限、终止、日志和错误处理应作为稳定控制面继续保留。'
    )
  ],
  '03-AI大模型应用开发/08-工程基础/03-Python/06-Python与JavaScript对比': [
    createCuratedQuizQuestion(
      'python-javascript-engineering-differences',
      '前端工程师开始维护 Python AI 服务。哪些迁移判断可以直接用于代码审查？',
      [
        {
          label: 'Python 类型提示默认不在运行时强制校验，需要 mypy、Pydantic 或框架能力才能形成约束。',
          reason: '类型注解主要服务于可读性和静态工具；不能把它误当成 TypeScript 编译器或运行时校验器。'
        },
        {
          label: 'Python 协程需要由事件循环驱动，入口常用 asyncio.run；只调用 async def 得到的是协程对象。',
          reason: '浏览器和 Node 已提供事件循环，而 Python 脚本通常要显式启动并 await 协程。'
        }
      ],
      [
        {
          label: 'Python 的 is 相当于 JavaScript 的 ===，因此字符串和数字比较都应优先使用 is。',
          reason: 'is 判断对象身份，值比较应使用 ==；把它当严格相等会产生偶发且难排查的错误。'
        },
        {
          label: 'pip 与 npm install 一样默认按项目隔离依赖，因此不需要创建 .venv。',
          reason: 'pip 默认可能写入全局或当前解释器环境，项目需要虚拟环境来隔离版本和依赖。'
        }
      ],
      '迁移重点不是背语法，而是弄清运行时语义：协程驱动、类型校验、对象身份和值相等、依赖隔离都不能照搬 JS。'
    )
  ],
  '03-AI大模型应用开发/08-工程基础/03-Python/06-Python与JavaScript对比/lab/README': [
    createCuratedQuizQuestion(
      'python-javascript-demo-review',
      '你要把对照 demo 改成真实的异步 AI 脚本。哪些代码与验收判断正确？',
      [
        {
          label: '拼接检索片段应写成 "\\n".join(chunks)，因为 join 是 Python 字符串方法，不是 list 方法。',
          reason: '这和 JavaScript 的 chunks.join("\\n") 调用方向相反，是从前端迁移时最常见的直接报错点。'
        },
        {
          label: '应测试 json.loads 的成功与 JSONDecodeError 分支，并确认 JSON true 会转换成 Python True。',
          reason: '真实模型可能返回非法 JSON；同时 JSON 字面量与 Python 对象的布尔值写法不同，必须通过解析器转换。'
        }
      ],
      [
        {
          label: '调用 async def 会像 JavaScript Promise 一样自动开始执行，因此同步入口可以直接读取返回值。',
          reason: '直接调用只创建协程对象；需要在协程中 await，或由 asyncio.run 启动事件循环。'
        },
        {
          label: '只要合法 JSON 样例能解析，就可以删除异常分支，因为模型开启 JSON 模式后不会产生格式错误。',
          reason: '传输截断、代码围栏、模型降级和上游错误仍可能破坏格式，解析与 Schema 校验不能省略。'
        }
      ],
      '这个 demo 的有效验收是同时证明语法迁移、异步驱动和 JSON 失败兜底，而不是只看到一次预期输出。'
    )
  ],
  '01-全栈开发/02-后端/python/04-Python与JavaScript对比': [
    createCuratedQuizQuestion(
      'full-stack-python-javascript-review',
      '把一段 JavaScript 业务逻辑迁移到 Python 时，哪些改写符合两种语言的真实语义？',
      [
        {
          label: '字典缺失键需要用 data.get(key, default) 兜底；直接 data[key] 可能抛出 KeyError。',
          reason: 'JavaScript 读取缺失属性通常得到 undefined，而 Python 方括号访问缺失键会直接失败。'
        },
        {
          label: '实例方法显式接收 self，调用实例方法时解释器再自动传入当前对象。',
          reason: 'self 不是关键字魔法，也不能简单替换成 this；它是方法签名中的显式第一个参数。'
        }
      ],
      [
        {
          label: 'Python 全大写变量与 JavaScript const 等价，解释器会阻止后续重新赋值。',
          reason: '全大写只是社区命名约定，不提供语言层面的只读保证。'
        },
        {
          label: 'Python 类型提示会在每次函数调用时自动阻止错误类型，因此不需要额外校验。',
          reason: '普通 Python 运行时不会强制类型提示；外部输入仍要使用显式校验或框架能力。'
        }
      ],
      '语法对照只能帮助入门，真正影响正确性的差异是缺失值、对象模型、可变性和运行时类型约束。'
    )
  ],
  '02-AI编程/06-Superpowers/01-工作流总览': [
    createCuratedQuizQuestion(
      'superpowers-workflow',
      '代理准备交付一项跨模块改动。哪些动作属于完成前必须保留的工程约束？',
      [
        {
          label: '需求未确认前先澄清目标、边界与验收标准，再拆分实现计划。',
          reason: '未确认的假设一旦进入代码，会放大返工成本并让后续验证失去明确目标。'
        },
        {
          label: '实现后重新运行目标测试、构建和差异检查，用新鲜输出证明当前提交。',
          reason: '验证证据必须对应当前代码状态，旧结果和主观判断都不能证明本次交付。'
        }
      ],
      [
        {
          label: '为了提高速度，可以跳过计划并同时修改多个无关模块。',
          reason: '无边界的并行修改会扩大影响面，也让失败无法归因到具体改动。'
        },
        {
          label: '代理声明已经完成即可替代独立代码审查和实际验证。',
          reason: '自我声明不是证据；审查负责发现设计缺陷，验证负责证明行为，两者职责不同。'
        }
      ],
      '可靠工作流用需求、计划、验证和审查约束实现过程，速度不能替代可检查的交付证据。'
    )
  ],
  '02-AI编程/06-Superpowers/02-需求澄清与实施计划': [
    createCuratedQuizQuestion(
      'brainstorming-before-plans',
      '面对边界不清的新功能，哪些顺序能避免把错误假设固化进实施计划？',
      [
        {
          label: '先确认目标、边界和验收标准，再把已确认方案拆成可验证步骤。',
          reason: '方案决定做什么，计划决定怎样做；计划不能替代需求决策。'
        },
        {
          label: '发现关键假设没有证据时，暂停拆解并补充代码、数据或用户决策依据。',
          reason: '关键输入缺失时继续细化只会制造虚假的确定性，最终仍要返工。'
        }
      ],
      [
        {
          label: '先写完整计划和文件清单，再询问用户真正需要什么。',
          reason: '这会让计划围绕代理自己的假设展开，而不是围绕真实验收结果。'
        },
        {
          label: '先编码验证所有想法，最后再补设计和验收标准。',
          reason: '无边界试错容易污染代码库，也无法判断哪个实验真正满足需求。'
        }
      ],
      '先确认方案再写计划；任何会改变目标、范围或验收方式的未知项，都应在编码前解决。'
    )
  ],
  '02-AI编程/06-Superpowers/03-隔离工作区与执行计划': [
    createCuratedQuizQuestion(
      'worktree-plan-execution',
      '使用 Worktree 执行长计划时，哪些做法能保持任务可回滚、可验证？',
      [
        {
          label: '先记录独立工作树的分支、构建和测试基线，再开始任务修改。',
          reason: '基线能区分历史故障与本次回归，也能证明任务确实发生在正确工作树。'
        },
        {
          label: '按小批次执行，并在每批后检查 diff、运行验证和更新剩余计划。',
          reason: '小批次让偏航更早暴露，并允许根据新证据调整后续步骤。'
        }
      ],
      [
        {
          label: '复用一个已有脏工作树承载所有无关任务，最后再按文件拆提交。',
          reason: '未确认归属的改动可能被误提交或覆盖，文件级拆分也无法恢复被污染的运行状态。'
        },
        {
          label: '计划一旦写完就不能根据代码证据调整，否则说明计划不够详细。',
          reason: '计划是执行工具，不是事实来源；真实代码与测试发现应及时修正计划。'
        }
      ],
      '隔离工作区解决修改污染，小批次执行解决长任务偏航，两者都依赖明确基线和持续验证。'
    )
  ],
  '02-AI编程/06-Superpowers/04-TDD与系统化调试': [
    createCuratedQuizQuestion(
      'tdd-debugging',
      '修复一个历史偶发故障时，哪些步骤能证明你修的是根因而不是表象？',
      [
        {
          label: '先稳定复现并收集调用链证据，再提出能够被日志或实验否定的根因假设。',
          reason: '可证伪假设让排查从随机试错变成有明确证据门槛的调查。'
        },
        {
          label: '确认根因后先写能失败的回归测试，再做最小修复并运行相关测试集。',
          reason: '失败测试证明场景被捕获，修复后的通过结果证明行为改变来自本次代码。'
        }
      ],
      [
        {
          label: '连续尝试多个超时、重试和空判断，只要故障暂时消失就合并。',
          reason: '同时改变多个变量会破坏因果关系，偶发问题也可能只是暂时未触发。'
        },
        {
          label: '直接重构相关模块并删除不稳定测试，借机消除所有潜在问题。',
          reason: '扩大改动会增加新变量，删除测试则丢失唯一能固定故障场景的证据。'
        }
      ],
      '系统化调试先建立证据链，再用失败测试和最小修复闭环验证根因。'
    )
  ],
  '02-AI编程/06-Superpowers/05-子代理与并行任务': [
    createCuratedQuizQuestion(
      'parallel-agents-boundary',
      '主代理准备并行调查多个问题。哪些拆分满足安全并行的条件？',
      [
        {
          label: '分别调查三个互不依赖的测试失败，每个代理只提交证据和建议。',
          reason: '只读调查且问题相互独立，不会发生文件覆盖或共享状态竞争。'
        },
        {
          label: '分别审查互不重叠的模块，由主代理统一判断优先级并整合结论。',
          reason: '清晰的所有权边界减少冲突，统一汇总避免多个局部结论互相矛盾。'
        }
      ],
      [
        {
          label: '让两个代理同时修改同一个核心文件，最后保留看起来更完整的版本。',
          reason: '共享写入会覆盖彼此上下文，人工挑选也无法保证两个修复都被保留。'
        },
        {
          label: '根因未知且多个故障可能来自同一状态时，立即按错误数量并行拆分。',
          reason: '共享根因会导致重复调查和相互冲突的修复，应先串行确认故障关系。'
        }
      ],
      '并行只适用于依赖和写入边界清楚的任务；共享状态或根因未知时应先串行调查。'
    )
  ],
  '02-AI编程/06-Superpowers/06-审查验证与分支收尾': [
    createCuratedQuizQuestion(
      'verification-before-finishing',
      '准备宣布分支完成并发起合并时，哪些材料属于有效交付证据？',
      [
        {
          label: '刚刚运行的目标测试、生产构建和 diff 检查结果。',
          reason: '这些输出直接对应当前提交，并分别覆盖行为、可构建性和提交范围。'
        },
        {
          label: '真实页面刷新后的关键流程结果，以及控制台和网络请求检查。',
          reason: '用户可见改动需要运行时证据，保存成功或单元测试不能替代最终渲染验收。'
        }
      ],
      [
        {
          label: '代理上一轮认为测试应该能通过，可以作为本轮完成依据。',
          reason: '推测没有执行时间、命令和输出，无法证明当前代码状态。'
        },
        {
          label: '相似功能上周通过测试，说明本次改动也无需重新验证。',
          reason: '代码、依赖和环境都可能变化，旧结果不能覆盖新提交。'
        }
      ],
      '完成前验证要求能够直接支持当前结论的新鲜证据，而不是推测、旧结果或自我声明。'
    )
  ],
  '03-AI大模型应用开发/02-企业级知识库/02-RAG核心链路/02-RAG文档向量化与语义搜索': [
    createCuratedQuizQuestion(
      'rag-offline-indexing',
      '设计 RAG 离线建库任务时，哪些工作必须在用户提问前完成？',
      [
        {
          label: '解析、清洗并按标题和语义边界切分原始文档。',
          reason: '检索粒度与元数据在建库阶段确定，在线请求不应重新处理整份文档。'
        },
        {
          label: '使用固定版本的 Embedding 模型计算向量，并把分块、向量和元数据写入索引。',
          reason: '文档向量和查询向量必须来自兼容模型与维度，索引版本也要可追踪。'
        }
      ],
      [
        {
          label: '根据当前用户问题组装最终回答 Prompt。',
          reason: '问题和会话上下文只在在线阶段出现，离线任务无法提前组装。'
        },
        {
          label: '为当前生成答案执行引用一致性校验。',
          reason: '引用校验依赖本次检索证据和模型回答，属于在线生成后的质量门。'
        }
      ],
      '离线链路生产可版本化的检索索引；问题改写、Context 组装和答案校验属于在线问答。'
    )
  ],
  '03-AI大模型应用开发/02-企业级知识库/02-RAG核心链路/03-RAG在线问答链路': [
    createCuratedQuizQuestion(
      'rag-online-diagnosis',
      '线上回答缺少正确证据时，哪些排查动作能区分检索问题和生成问题？',
      [
        {
          label: '先检查查询改写、权限过滤、各路 Top K、融合排名和 Rerank 结果。',
          reason: '正确证据未进入最终上下文时，根因位于检索链路而不是回答措辞。'
        },
        {
          label: '证据已进入上下文但回答失真时，再检查 Prompt 约束、引用映射和模型输出。',
          reason: '先确认输入证据正确，才能把问题归因到生成或校验阶段。'
        }
      ],
      [
        {
          label: '只修改最终回答语气并增加输出长度，观察模型是否自己补出证据。',
          reason: '模型无法可靠补回未召回事实，增加长度反而可能放大幻觉。'
        },
        {
          label: '隐藏答案引用，避免用户发现检索结果与回答不一致。',
          reason: '隐藏证据会失去可追溯性，也让线上错误无法通过反馈定位。'
        }
      ],
      '先检查证据是否被正确召回和送入上下文，再判断是否需要调整生成规则。'
    )
  ],
  '03-AI大模型应用开发/02-企业级知识库/02-RAG核心链路/04-混合检索与RRF实战': [
    createCuratedQuizQuestion(
      'hybrid-rrf',
      '企业文档同时包含自然语言、错误码和产品型号。哪些混合检索设计合理？',
      [
        {
          label: '让 BM25 召回精确词项，让 Dense Vector 召回语义相近表达，再合并候选。',
          reason: '稀疏和稠密检索覆盖不同失败面，能同时处理专有词和同义改写。'
        },
        {
          label: '使用 RRF 按多路排名融合，并通过离线评测集选择 k 和 Top K。',
          reason: 'RRF 避免直接比较不同检索器的原始分数量纲，但融合参数仍需要数据验证。'
        }
      ],
      [
        {
          label: '直接相加 BM25 与向量相似度原始分数，数值更大的检索器自然更可靠。',
          reason: '两路分数的范围和分布不同，直接相加会让某一路因量纲占优。'
        },
        {
          label: '上线混合检索后可以删除评测集，因为多一路召回一定不会降低质量。',
          reason: '噪声候选、融合参数和重排容量都可能导致退化，必须持续评测命中率和排序质量。'
        }
      ],
      '混合检索利用稀疏与稠密召回互补，RRF 解决分数量纲问题，最终效果仍要由评测集证明。'
    )
  ]
}

/**
 * 清理 Markdown 行中的列表、链接、强调和题目无关前缀。
 * @param markdownLine 需要转换为题目选项的单行 Markdown。
 */
function normalizeQuizStatement(markdownLine: string): string {
  return markdownLine
    .replace(/^\s*>\s*/, '')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/^(?:✅|❌|⚠️?|💡)\s*/, '')
    .replace(/^(?:错误|正确做法|错误做法|反模式|最佳实践|建议)\s*\d*\s*[:：]\s*/, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[；;]\s*$/, '')
    .trim()
}

/**
 * 截取一条可独立判断的短句，避免把整段解释塞入选项。
 * @param statement 已去除 Markdown 标记的正文陈述。
 */
function getQuizOptionSentence(statement: string): string {
  /** 第一处中文句号、分号或感叹号的位置。 */
  const sentenceEndIndex = statement.search(/[。；;！!]/)
  /** 有完整短句时保留首句，否则按最大长度截断。 */
  const optionSentence =
    sentenceEndIndex >= 8 ? statement.slice(0, sentenceEndIndex + 1) : statement.slice(0, MAX_QUIZ_STATEMENT_LENGTH)

  return optionSentence
    .slice(0, MAX_QUIZ_STATEMENT_LENGTH)
    .replace(/[:：]\s*$/, '。')
    .trim()
}

/**
 * 将一个包含多个分号结论的自然段拆成可分别评测的短句。
 * @param paragraph 已去除 Markdown 标记的正文段落。
 */
function getQuizOptionSentences(paragraph: string): string[] {
  /** 按句号、分号和感叹号切开的候选结论。 */
  const sentenceFragments = paragraph.match(/[^。；;！!]+[。；;！!]?/g) || []

  return sentenceFragments.map((sentenceFragment) => getQuizOptionSentence(sentenceFragment.trim())).filter(Boolean)
}

/**
 * 判断正文短句是否具有可评测的信息量。
 * @param statement 已完成 Markdown 清理的候选短句。
 */
function isAssessableStatement(statement: string): boolean {
  return (
    statement.length >= 12 &&
    statement.length <= MAX_QUIZ_STATEMENT_LENGTH &&
    !statement.startsWith('#') &&
    !statement.startsWith('|') &&
    !statement.startsWith('![') &&
    !/[？?]$/.test(statement) &&
    !/^(?:假设|例如|比如|这条公式|下面|接下来|图中|表中)/.test(statement) &&
    !/(?:如下图|这部分比较简单|方法名可以看出)/.test(statement) &&
    !NON_ASSESSABLE_STATEMENT_PATTERN.test(statement) &&
    !LOW_VALUE_OPTION_PATTERN.test(statement)
  )
}

/**
 * 去除围栏代码，避免把源码语句误识别成自然语言知识点。
 * @param markdown 当前文章原始 Markdown。
 */
function removeFencedCodeBlocks(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '')
}

/**
 * 从“概念名称：具体结论”结构中保留真正可判断的结论部分。
 * @param statement 已完成 Markdown 清理的正文短句。
 */
function getStatementClaim(statement: string): string {
  /** 当前仍可能带有一个或两个加粗小标题的具体结论。 */
  let statementClaim = statement

  for (let labelDepth = 0; labelDepth < 2; labelDepth += 1) {
    /** 短标签后的正文；长句中的正常冒号不会被误删。 */
    const claimAfterLabel = statementClaim.match(/^[^：]{2,40}：(.{12,})$/)?.[1]
    if (!claimAfterLabel) {
      break
    }
    statementClaim = claimAfterLabel.trim()
  }

  return getQuizOptionSentence(statementClaim)
}

/**
 * 从正文自然段中补充高信息陈述，供缺少结构化总结的文章使用。
 * @param markdown 当前文章原始 Markdown。
 */
function extractBodyStatements(markdown: string): string[] {
  /** 自动工程工作表只负责执行验收，不能反向成为核心知识题答案。 */
  const knowledgeMarkdown = markdown.split('<!-- article-operational-workbook -->')[0] || markdown
  /** 去除代码后能够独立阅读的正文短句。 */
  const bodyStatements = removeFencedCodeBlocks(knowledgeMarkdown)
    .split('\n')
    .filter((line) => !/^\s*(?:#|\||!\[|>)/.test(line))
    .map(normalizeQuizStatement)
    .flatMap(getQuizOptionSentences)
    .filter(isAssessableStatement)

  return Array.from(new Set(bodyStatements))
}

/** 不适合作为核心知识点的写作结构标题。 */
const NON_KNOWLEDGE_HEADING_PATTERN =
  /^(?:本文目标|学习目标|读完你能|核心知识清单|前置知识|参考资料|总结|小结|验收清单|如何验收|如何验证|场景基线|按什么顺序|步骤\s*\d+|失败时|上线前|变更记录|工程上真正会踩的坑|常见错误|常见坑|踩坑|误区|错误做法|反模式)/

/**
 * 去掉章节编号，保留可以直接放进题干的知识主题。
 * @param headingText Markdown 标题去掉井号后的原文。
 */
function normalizeKnowledgeTopic(headingText: string): string {
  return normalizeQuizStatement(headingText)
    .replace(/^(?:第?[一二三四五六七八九十百]+|\d+(?:\.\d+)*)[、.．：:\s-]*/, '')
    .slice(0, MAX_MISTAKE_LABEL_LENGTH)
    .trim()
}

/**
 * 读取文章显式声明的核心知识清单。
 * @param markdown 当前文章原始 Markdown。
 */
function extractDeclaredKnowledgeTopics(markdown: string): string[] {
  /** “核心知识清单”标题之后到下一标题之前的正文。 */
  const knowledgeListSection =
    markdown.match(/^#{1,4}\s+核心知识清单\s*$([\s\S]*?)(?=^#{1,4}\s+|(?![\s\S]))/m)?.[1] || ''
  /** 清单中按原顺序提取的知识点名称。 */
  const declaredTopics = [...knowledgeListSection.matchAll(/^\s*[-*+]\s+(.+)$/gm)]
    .map((topicMatch) => normalizeKnowledgeTopic(topicMatch[1] || ''))
    .filter(Boolean)

  return Array.from(new Set(declaredTopics))
}

/**
 * 将知识点拆成可匹配正文的中英文术语。
 * @param topic 当前知识点名称。
 */
function getKnowledgeTopicTerms(topic: string): string[] {
  /** 按并列词和标点拆开的原始术语。 */
  const rawTerms = topic.split(/[、，,与和及：:（）()\s/+]+/).filter((term) => term.length >= 2)
  /** Q、K、V 等英文全称对应的公式缩写。 */
  const aliasTerms = rawTerms.flatMap((term) => {
    if (/^query$/i.test(term)) return ['Q']
    if (/^key$/i.test(term)) return ['K']
    if (/^value$/i.test(term)) return ['V']
    if (/^feed.?forward$/i.test(term)) return ['FFN']
    return []
  })

  return Array.from(new Set([...rawTerms, ...aliasTerms]))
}

/**
 * 按术语命中、因果关系和信息长度评估一条正文结论的出题价值。
 * @param statement 候选正文结论。
 * @param topic 需要覆盖的知识点。
 * @param sectionTopic 候选结论所在章节。
 */
function scoreKnowledgeStatement(statement: string, topic: string, sectionTopic: string): number {
  /** 当前知识点中可用于正文匹配的术语。 */
  const topicTerms = getKnowledgeTopicTerms(topic)
  /** 结论和章节标题共同命中的术语数量。 */
  const matchedTermCount = topicTerms.filter(
    (term) =>
      statement.toLowerCase().includes(term.toLowerCase()) || sectionTopic.toLowerCase().includes(term.toLowerCase())
  ).length
  /** 包含因果、职责、数据流或边界词的结论比背景描述更适合出题。 */
  const mechanismScore =
    /(?:因为|所以|因此|通过|用于|负责|决定|得到|阻止|保存|复用|减少|增加|依赖|区别|不等于|不是|不能|必须|需要|只会|只能)/.test(
      statement
    )
      ? 6
      : 0
  /** 过短的口号和过长的复合句都降低可辨析性。 */
  const lengthScore = statement.length >= 24 && statement.length <= 110 ? 3 : 0

  return matchedTermCount * 12 + mechanismScore + lengthScore
}

/**
 * 将本身已经表达职责关系的核心知识点补全成可判断结论。
 * @param topic 核心知识清单中的知识点名称。
 */
function createStatementFromKnowledgeTopic(topic: string): string | null {
  /** “某函数调度入口”结构中的函数名。 */
  const schedulingEntryName = topic.match(/^(.+?)\s+调度入口$/)?.[1]
  if (schedulingEntryName) {
    return `${schedulingEntryName} 是更新流程进入 Reconciler 调度阶段的入口。`
  }

  /** “某函数与某系统桥接”结构中的两端对象。 */
  const schedulerBridgeMatch = topic.match(/^(.+?)\s+与\s+(.+?)\s+桥接$/)
  if (schedulerBridgeMatch) {
    /** 桥接关系左侧的函数或组件。 */
    const bridgeSource = schedulerBridgeMatch[1] || ''
    /** 桥接关系右侧的调度器或系统。 */
    const bridgeTarget = schedulerBridgeMatch[2] || ''
    return `${bridgeSource} 负责把 React 更新调度连接到 ${bridgeTarget}。`
  }

  return null
}

/**
 * 从正文章节和自然段中提取至少六个互不重复的出题单元。
 * @param markdown 当前文章原始 Markdown。
 */
function extractKnowledgeUnits(markdown: string): QuizKnowledgeUnit[] {
  /** 自动工程工作表及其后的总结不参与核心知识题抽取。 */
  const knowledgeMarkdown = markdown.split('<!-- article-operational-workbook -->')[0] || markdown
  /** 去除代码后按原顺序保留的 Markdown 行。 */
  const markdownLines = removeFencedCodeBlocks(knowledgeMarkdown).split('\n')
  /** 遍历正文时最近一个有知识含义的章节主题。 */
  let currentTopic = ''
  /** 首个标题是文章名，不应当作为正文知识点。 */
  let hasSkippedArticleTitle = false
  /** 当前被跳过的辅助章节层级；其子标题同样不能重新进入题库。 */
  let excludedHeadingDepth = 0
  /** 所有章节中具有独立判断价值的候选结论。 */
  const knowledgeCandidates: QuizKnowledgeUnit[] = []
  /** 已经进入题库的结论，防止同一句跨题重复。 */
  const capturedStatements = new Set<string>()

  for (const markdownLine of markdownLines) {
    /** 当前行可能包含的 Markdown 标题。 */
    const headingMatch = markdownLine.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      if (!hasSkippedArticleTitle) {
        hasSkippedArticleTitle = true
        currentTopic = ''
        continue
      }

      /** 去掉编号和格式标记后的章节主题。 */
      const headingTopic = normalizeKnowledgeTopic(headingMatch[2] || '')
      /** 当前标题层级，用于判断是否已经离开辅助章节。 */
      const headingDepth = (headingMatch[1] || '').length
      if (NON_KNOWLEDGE_HEADING_PATTERN.test(headingTopic)) {
        excludedHeadingDepth = headingDepth
        currentTopic = ''
      } else if (excludedHeadingDepth > 0 && headingDepth > excludedHeadingDepth) {
        currentTopic = ''
      } else {
        excludedHeadingDepth = 0
        currentTopic = headingTopic
      }
      continue
    }

    if (!currentTopic) {
      continue
    }

    /** 当前正文行去除 Markdown 标记后的原始内容。 */
    const normalizedLine = normalizeQuizStatement(markdownLine)
    if (/^(?:DIAGRAM_DESCRIPTION|SCREENSHOT_DESCRIPTION|VISUAL_STRATEGY)[：:]/.test(normalizedLine)) {
      continue
    }

    /** 当前正文段落按分号拆开的独立结论。 */
    const statements = getQuizOptionSentences(normalizedLine).map(getStatementClaim)
    for (const statement of statements) {
      if (!isAssessableStatement(statement) || capturedStatements.has(statement)) {
        continue
      }

      knowledgeCandidates.push({ topic: currentTopic, statement })
    }
  }

  /** 文章显式声明的核心知识点优先决定题组覆盖范围。 */
  const declaredTopics = extractDeclaredKnowledgeTopics(knowledgeMarkdown)
  /** 没有知识清单时，使用正文中去重后的真实章节主题。 */
  const targetTopics =
    declaredTopics.length > 0
      ? declaredTopics
      : Array.from(new Set(knowledgeCandidates.map((knowledgeCandidate) => knowledgeCandidate.topic)))
  /** 最终用于组题的章节知识单元。 */
  const knowledgeUnits: QuizKnowledgeUnit[] = []

  for (const targetTopic of targetTopics) {
    /** 尚未用于其他题、按当前知识点匹配度排序的正文候选。 */
    const rankedCandidates = knowledgeCandidates
      .filter((knowledgeCandidate) => !capturedStatements.has(knowledgeCandidate.statement))
      .map((knowledgeCandidate) => ({
        knowledgeCandidate,
        score: scoreKnowledgeStatement(knowledgeCandidate.statement, targetTopic, knowledgeCandidate.topic)
      }))
      .sort((leftCandidate, rightCandidate) => rightCandidate.score - leftCandidate.score)
    /** 当前知识点匹配度最高的具体结论。 */
    const selectedCandidate = rankedCandidates[0]?.knowledgeCandidate
    /** 正文将职责直接写在知识清单中时，由关系词补成完整判断。 */
    const topicStatement = createStatementFromKnowledgeTopic(targetTopic)
    if (!selectedCandidate && !topicStatement) {
      continue
    }

    /** 当前知识点最终采用的正文结论。 */
    const selectedStatement = selectedCandidate?.statement || topicStatement || ''
    knowledgeUnits.push({ topic: targetTopic, statement: selectedStatement })
    capturedStatements.add(selectedStatement)
    if (knowledgeUnits.length >= MAX_QUIZ_QUESTION_COUNT * REQUIRED_CORRECT_OPTION_COUNT) {
      break
    }
  }

  // 少数旧文章章节较少，用正文中的其他独立结论补足题量；知识点名称仍保留具体结论而不是文章标题。
  for (const bodyStatement of extractBodyStatements(knowledgeMarkdown)) {
    /** 正文候选完成标签清理后的具体判断。 */
    const statement = getStatementClaim(bodyStatement)
    if (!isAssessableStatement(statement) || capturedStatements.has(statement)) {
      continue
    }

    /** 从具体结论截取的补充知识点名称。 */
    const fallbackTopic = statement.replace(/[。；;！!].*$/, '').slice(0, MAX_MISTAKE_LABEL_LENGTH)
    if (knowledgeUnits.some((knowledgeUnit) => knowledgeUnit.topic === fallbackTopic)) {
      continue
    }
    knowledgeUnits.push({ topic: fallbackTopic, statement })
    capturedStatements.add(statement)
    if (knowledgeUnits.length >= MAX_QUIZ_QUESTION_COUNT * REQUIRED_CORRECT_OPTION_COUNT) {
      break
    }
  }

  return knowledgeUnits
}

/**
 * 只反转正文结论中的一个条件或因果词，生成与当前知识点直接相关的干扰项。
 * @param statement 正文中的正确结论。
 * @param topic 当前结论所属的知识点。
 */
function createCounterfactualOption(statement: string, topic: string): GeneratedQuizOptionContent {
  /** 去掉句末标点后的原始结论，便于执行单点语义替换。 */
  const statementWithoutEnding = statement.replace(/[。；;！!]$/, '')
  /** 干扰项明确撤销正文约束，避免机械替词产生“不依赖漂移”等病句。 */
  const assessableOptionLabel = getQuizOptionSentence(
    `在“${topic}”中，即使不满足“${statementWithoutEnding.slice(0, 84)}”，结果与副作用仍会保持不变。`
  )

  return {
    label: assessableOptionLabel,
    isCorrect: false,
    reason: `正文在“${topic}”中给出的结论是“${statement}”；该选项只反转了其中一个条件、因果或适用边界，因此会得到与原机制相反的判断。`
  }
}

/**
 * 根据稳定字符串计算选项轮换偏移。
 * @param stableKey 文章路径或人工题标识。
 * @param optionCount 当前题选项数量。
 */
function getStableRotationOffset(stableKey: string, optionCount: number): number {
  if (optionCount === 0) {
    return 0
  }

  return (
    Array.from(stableKey).reduce((characterSum, character) => characterSum + (character.codePointAt(0) || 0), 0) %
    optionCount
  )
}

/**
 * 按指定偏移循环移动候选项。
 * @param options 等待调整顺序的候选项。
 * @param rotationOffset 从数组开头移动到末尾的数量。
 */
function rotateOptions<T>(options: readonly T[], rotationOffset: number): T[] {
  return [...options.slice(rotationOffset), ...options.slice(0, rotationOffset)]
}

/**
 * 去除展示标题中的 demo 后缀，避免把页面类型当成知识点。
 * @param title 阅读页传入的文章标题。
 */
function getQuizTopicTitle(title: string): string {
  return title
    .replace(/^[^（(]{1,40}[（(]\d{1,2}[）)]\s*[-—–:：]\s*/, '')
    .replace(/\s+(?:demo|实验|自测 quiz|抽题自测)$/i, '')
    .trim()
}

/**
 * 为没有人工题库的课程生成三道覆盖不同章节的场景化多选题。
 * @param articlePath 当前文章的公开路径。
 * @param markdown 当前文章原始 Markdown。
 * @param title 已移除模块内课号的文章标题。
 * @param articleKind 当前文章在学习路径中的用途。
 */
function createGeneratedQuiz(
  articlePath: string,
  markdown: string,
  title: string,
  articleKind: KnowledgeQuizArticleKind
): KnowledgeQuizQuestion[] {
  if (articleKind === 'guide' || articleKind === 'reference') {
    return []
  }

  /** 不包含页面类型后缀的真实知识主题。 */
  const quizTopicTitle = getQuizTopicTitle(title)
  /** 选项中的短主题放在结论之后，既保留文章语境，也不会截掉结论差异。 */
  const quizOptionContext = quizTopicTitle.slice(0, 36)
  /** 文章显式声明的核心知识点数量，用于决定题组需要三到五题中的哪一种规模。 */
  const declaredKnowledgeTopicCount = extractDeclaredKnowledgeTopics(markdown).length
  /** 三题至少覆盖五个知识点；知识清单更长时增加题数，最多用五题覆盖十个知识点。 */
  const targetQuestionCount = Math.min(
    MAX_QUIZ_QUESTION_COUNT,
    Math.max(MIN_QUIZ_QUESTION_COUNT, Math.ceil(declaredKnowledgeTopicCount / REQUIRED_CORRECT_OPTION_COUNT))
  )
  /** 从不同正文章节提取的具体知识结论。 */
  const knowledgeUnits = extractKnowledgeUnits(markdown).slice(0, targetQuestionCount * REQUIRED_CORRECT_OPTION_COUNT)
  /** 当前文章按两个知识点一组生成的题目。 */
  const generatedQuestions: KnowledgeQuizQuestion[] = []

  for (let questionIndex = 0; questionIndex < targetQuestionCount; questionIndex += 1) {
    /** 当前题对应的两条章节知识。 */
    const questionKnowledgeUnits = knowledgeUnits.slice(
      questionIndex * REQUIRED_CORRECT_OPTION_COUNT,
      (questionIndex + 1) * REQUIRED_CORRECT_OPTION_COUNT
    )
    if (questionKnowledgeUnits.length < REQUIRED_CORRECT_OPTION_COUNT) {
      break
    }

    /** 当前题两条正文正确结论。 */
    const correctOptions: GeneratedQuizOptionContent[] = questionKnowledgeUnits.map((knowledgeUnit) => ({
      label: getQuizOptionSentence(
        `${knowledgeUnit.statement.replace(/[。；;！!]$/, '')}（用于判断“${quizOptionContext}”）。`
      ),
      isCorrect: true,
      reason: `“${knowledgeUnit.topic}”章节说明了“${knowledgeUnit.statement}”；该判断保留了正文中的处理方式和适用边界。`
    }))
    /** 分别反转两条正文结论中的一个条件得到的主题干扰项。 */
    const incorrectOptions = questionKnowledgeUnits.map((knowledgeUnit) =>
      createCounterfactualOption(knowledgeUnit.statement, `${quizOptionContext} / ${knowledgeUnit.topic.slice(0, 32)}`)
    )
    /** 尚未分配 A、B、C、D 的四个候选答案。 */
    const optionCandidates: GeneratedQuizOptionContent[] = [...correctOptions, ...incorrectOptions]
    /** 根据文章路径和题号稳定打散正确项位置。 */
    const optionRotationOffset = getStableRotationOffset(`${articlePath}#${questionIndex + 1}`, optionCandidates.length)
    /** 最终稳定排序的候选答案。 */
    const orderedOptionCandidates = rotateOptions(optionCandidates, optionRotationOffset)
    /** 带 A、B、C、D 标识的最终选项。 */
    const options: KnowledgeQuizOption[] = orderedOptionCandidates.map((option, optionIndex) => ({
      id: QUIZ_OPTION_IDS[optionIndex] || String(optionIndex + 1),
      ...option
    }))
    /** 当前题完成排序后的正确选项标识。 */
    const correctOptionIds = options.filter((option) => option.isCorrect).map((option) => option.id)
    /** 当前题覆盖的两个章节主题。 */
    const knowledgePoints = questionKnowledgeUnits.map((knowledgeUnit) => knowledgeUnit.topic)
    /** 三道基础题依次承担机制推演、故障诊断和方案决策任务。 */
    const assessmentKind: KnowledgeQuizAssessmentKind =
      questionIndex % MIN_QUIZ_QUESTION_COUNT === 0
        ? 'mechanism'
        : questionIndex % MIN_QUIZ_QUESTION_COUNT === 1
          ? 'diagnosis'
          : 'decision'
    /** 第一条正文结论提供题干中的具体输入、状态或约束。 */
    const primaryStatement = questionKnowledgeUnits[0]?.statement || ''
    /** 第一条反事实提供故障题中的可观察偏差，避免只替换文章标题。 */
    const observedDeviation = incorrectOptions[0]?.label || ''
    /** 根据认知任务和文章用途生成带具体正文条件的题干。 */
    let prompt = `在“${quizTopicTitle}”中，需要同时满足“${knowledgePoints.join('”与“')}”。给定正文约束“${primaryStatement}”，哪些判断保持了原有处理机制？`
    if (assessmentKind === 'diagnosis') {
      prompt = `“${quizTopicTitle}”出现偏差：“${observedDeviation}”已成为实际行为。围绕“${knowledgePoints.join('”与“')}”，哪些判断能定位被改变的职责或边界？`
    } else if (assessmentKind === 'decision') {
      prompt =
        articleKind === 'practice'
          ? `你准备修改“${quizTopicTitle}”中“${knowledgePoints.join('”与“')}”的实现，同时必须保留“${primaryStatement}”。哪些决策不会破坏该约束？`
          : `评审“${quizTopicTitle}”方案时，验收条件包含“${primaryStatement}”。关于“${knowledgePoints.join('”与“')}”的哪些决策符合正文机制？`
    }

    generatedQuestions.push({
      id: `article-core-${questionIndex + 1}`,
      type: 'multiple',
      prompt,
      options,
      explanation: `应选择 ${correctOptionIds.join('、')}。两条正确项分别对应“${knowledgePoints.join('”和“')}”；错误项只改动了一个条件、因果或边界，可据此定位误解。`,
      knowledgePoints,
      assessmentKind
    })
  }

  return generatedQuestions
}

/**
 * 审计一篇文章的自测题是否满足多选、信息密度和解析完整性标准。
 * @param articlePath 当前文章的公开路径。
 * @param articleKind 当前文章在学习路径中的用途。
 * @param questions 当前文章最终展示的题目。
 */
export function auditKnowledgeQuizQuestions(
  articlePath: string,
  articleKind: KnowledgeQuizArticleKind,
  questions: readonly KnowledgeQuizQuestion[]
): KnowledgeQuizAuditIssue[] {
  /** 当前文章累计发现的质量问题。 */
  const auditIssues: KnowledgeQuizAuditIssue[] = []

  if (articleKind === 'guide' || articleKind === 'reference') {
    if (questions.length > 0) {
      auditIssues.push({
        code: 'non-assessable-has-quiz',
        message: `${articlePath} 是指南或参考资料，不应强行生成选择题。`
      })
    }
    return auditIssues
  }

  if (questions.length === 0) {
    auditIssues.push({ code: 'missing-quiz', message: `${articlePath} 缺少可评测的自测题。` })
    return auditIssues
  }

  if (questions.length < MIN_QUIZ_QUESTION_COUNT || questions.length > MAX_QUIZ_QUESTION_COUNT) {
    auditIssues.push({
      code: 'question-count',
      message: `${articlePath} 应有 ${MIN_QUIZ_QUESTION_COUNT}～${MAX_QUIZ_QUESTION_COUNT} 道核心知识题，实际为 ${questions.length} 道。`
    })
  }

  /** 题组中去重后的题干数量。 */
  const uniquePromptCount = new Set(questions.map((question) => question.prompt)).size
  if (uniquePromptCount !== questions.length) {
    auditIssues.push({ code: 'duplicate-prompt', message: `${articlePath} 存在重复题干。` })
  }

  /** 题组明确声明并去重后的正文知识点。 */
  const coveredKnowledgePoints = new Set(
    questions.flatMap((question) => question.knowledgePoints || []).map((knowledgePoint) => knowledgePoint.trim())
  )
  if (coveredKnowledgePoints.size < MIN_QUIZ_KNOWLEDGE_POINT_COUNT) {
    auditIssues.push({
      code: 'insufficient-coverage',
      message: `${articlePath} 的题组只覆盖 ${coveredKnowledgePoints.size} 个知识点，至少需要 ${MIN_QUIZ_KNOWLEDGE_POINT_COUNT} 个。`
    })
  }

  /** 题组实际使用的认知任务类型。 */
  const assessmentKinds = new Set(questions.map((question) => question.assessmentKind).filter(Boolean))
  if (assessmentKinds.size < 2) {
    auditIssues.push({
      code: 'insufficient-assessment-kinds',
      message: `${articlePath} 的题组只包含 ${assessmentKinds.size} 种认知任务，至少需要机制、诊断、决策中的两种。`
    })
  }

  /** 跨题使用的全部正确结论，用于发现换题干复用同一答案。 */
  const correctLabelsAcrossQuestions = questions.flatMap((question) =>
    question.options.filter((option) => option.isCorrect).map((option) => option.label)
  )
  if (new Set(correctLabelsAcrossQuestions).size !== correctLabelsAcrossQuestions.length) {
    auditIssues.push({ code: 'duplicate-correct-option', message: `${articlePath} 在多道题中重复使用同一条正确结论。` })
  }

  for (const question of questions) {
    /** 当前题中应该被选择的选项。 */
    const correctOptions = question.options.filter((option) => option.isCorrect)
    /** 当前题选项去重后的文案数量。 */
    const uniqueOptionLabelCount = new Set(question.options.map((option) => option.label)).size
    /** 当前题选项去重后的标识数量。 */
    const uniqueOptionIdCount = new Set(question.options.map((option) => option.id)).size

    if (question.type !== 'multiple') {
      auditIssues.push({ code: 'not-multiple', message: `${articlePath}#${question.id} 不是多选题。` })
    }
    if (question.options.length !== REQUIRED_QUIZ_OPTION_COUNT) {
      auditIssues.push({
        code: 'option-count',
        message: `${articlePath}#${question.id} 应有 ${REQUIRED_QUIZ_OPTION_COUNT} 个选项，实际为 ${question.options.length}。`
      })
    }
    if (correctOptions.length !== REQUIRED_CORRECT_OPTION_COUNT) {
      auditIssues.push({
        code: 'correct-count',
        message: `${articlePath}#${question.id} 应有 ${REQUIRED_CORRECT_OPTION_COUNT} 个正确项，实际为 ${correctOptions.length}。`
      })
    }
    if (uniqueOptionLabelCount !== question.options.length || uniqueOptionIdCount !== question.options.length) {
      auditIssues.push({ code: 'duplicate-option', message: `${articlePath}#${question.id} 存在重复选项或标识。` })
    }
    if (LOW_VALUE_PROMPT_PATTERN.test(question.prompt)) {
      auditIssues.push({
        code: 'low-value-prompt',
        message: `${articlePath}#${question.id} 仍使用低信息题干：${question.prompt}`
      })
    }
    if ((question.knowledgePoints || []).length === 0) {
      auditIssues.push({
        code: 'missing-knowledge-point',
        message: `${articlePath}#${question.id} 没有标记实际评测的正文知识点。`
      })
    }
    if (!question.assessmentKind) {
      auditIssues.push({
        code: 'missing-assessment-kind',
        message: `${articlePath}#${question.id} 没有标记认知任务类型。`
      })
    }
    if (question.explanation.length < 30) {
      auditIssues.push({ code: 'short-explanation', message: `${articlePath}#${question.id} 总结解析过短。` })
    }

    for (const option of question.options) {
      if (!isAssessableStatement(option.label)) {
        auditIssues.push({
          code: 'weak-option',
          message: `${articlePath}#${question.id}/${option.id} 选项缺少可评测信息：${option.label}`
        })
      }
      if (option.reason.length < 20) {
        auditIssues.push({
          code: 'short-option-reason',
          message: `${articlePath}#${question.id}/${option.id} 缺少完整的逐项解析。`
        })
      }
    }
  }

  return auditIssues
}

/**
 * 返回文章底部的高信息密度知识题集，并在构建期阻止低质量题进入页面。
 * @param articlePath 当前文章的公开路径。
 * @param markdown 当前文章原始 Markdown。
 * @param title 已移除模块内课号的文章标题。
 * @param articleKind 当前文章在学习路径中的用途。
 */
export function createKnowledgeQuiz(
  articlePath: string,
  markdown: string,
  title: string,
  articleKind: KnowledgeQuizArticleKind
): KnowledgeQuizQuestion[] {
  /** 每篇可评测文章都从正文生成三道覆盖不同章节的基础题。 */
  const generatedQuestions = createGeneratedQuiz(articlePath, markdown, title, articleKind)
  /** 少数重点课程已有的人工场景题。 */
  const curatedQuestions = CURATED_QUIZZES[articlePath] || []
  /** 三道完整人工题直接覆盖全文；单道人工题仍作为通用题组的补充。 */
  const questions = curatedQuestions.length >= MIN_QUIZ_QUESTION_COUNT
    ? curatedQuestions.slice(0, MAX_QUIZ_QUESTION_COUNT)
    : [...curatedQuestions, ...generatedQuestions].slice(0, MAX_QUIZ_QUESTION_COUNT)
  /** 构建期质量门发现的问题。 */
  const auditIssues = auditKnowledgeQuizQuestions(articlePath, articleKind, questions)
  /** 文章显式声明、必须全部进入题组的核心知识点。 */
  const declaredKnowledgeTopics = extractDeclaredKnowledgeTopics(markdown)
  /** 当前题组明确覆盖的知识点。 */
  const coveredKnowledgeTopics = new Set(
    questions.flatMap((question) => question.knowledgePoints || []).map((knowledgePoint) => knowledgePoint.trim())
  )
  /** 仍未被任何题目覆盖的显式核心知识点。 */
  const uncoveredKnowledgeTopics = declaredKnowledgeTopics.filter(
    (knowledgeTopic) => !coveredKnowledgeTopics.has(knowledgeTopic)
  )
  if (uncoveredKnowledgeTopics.length > 0) {
    auditIssues.push({
      code: 'uncovered-declared-topic',
      message: `${articlePath} 的题组未覆盖核心知识清单：${uncoveredKnowledgeTopics.join('、')}。`
    })
  }

  if (auditIssues.length > 0) {
    throw new Error(auditIssues.map((auditIssue) => auditIssue.message).join('\n'))
  }

  return questions
}
