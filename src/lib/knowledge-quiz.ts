/** 单道知识题的选择方式。 */
export type KnowledgeQuizQuestionType = 'single' | 'multiple'

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

/** 一条选项允许使用的最大字符数。 */
const MAX_QUIZ_STATEMENT_LENGTH = 140

/** 误区名称嵌入选项时允许保留的最大字符数。 */
const MAX_MISTAKE_LABEL_LENGTH = 70

/** 能提供结论、动作或验收依据的章节标题。 */
const POSITIVE_SECTION_HEADING_PATTERN =
  /(?:总结|小结|核心要点|关键要点|最佳实践|正确做法|设计原则|验收|排查|动手改|看点|关键差异|实现步骤)/

/** 明确列出反模式、失败方式或使用边界的章节标题。 */
const MISTAKE_SECTION_HEADING_PATTERN = /(?:常见错误|常见坑|踩坑|踩的坑|误区|错误做法|反模式|失败|不要这样做)/

/** 排除导航、配图规范和写作说明等不可评测内容。 */
const NON_ASSESSABLE_STATEMENT_PATTERN =
  /^(?:下一(?:篇|章)|继续阅读|延伸阅读|参考资料|可视化规格|VISUAL_STRATEGY|DIAGRAM_DESCRIPTION|SCREENSHOT_DESCRIPTION|架构图|流程图|思维导图|截图|作者自审|本文围绕|本章将|本 demo 配套|本小册)/i

/** 禁止再次出现的低信息题干模板。 */
const LOW_VALUE_PROMPT_PATTERN = /(?:以下关于|哪一项正确|哪些判断符合本课内容|demo[^，。？！]*判断)/i

/** 禁止进入选项的兜底水文。 */
const LOW_VALUE_OPTION_PATTERN =
  /(?:本文围绕|本章围绕|需要结合具体目标、约束和验证结果来理解|只记住术语或 API 名称|工程上真正会踩的坑|本篇独有|挨个看|^(?:讲清|看懂|掌握|学会|理解|写出|能够))/

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
  explanation: string
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
    explanation
  }
}

/** 重点课程人工设计的核心知识题。 */
const CURATED_QUIZZES: Record<string, KnowledgeQuizQuestion[]> = {
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

  return optionSentence.replace(/[:：]\s*$/, '。').trim()
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
 * 从指定标题类型的章节中提取列表和自然段短句。
 * @param markdown 当前文章原始 Markdown。
 * @param sectionHeadingPattern 需要进入的章节标题规则。
 * @param requireExplicitListMarker 是否只接受列表项或显式错误标记。
 */
function extractSectionStatements(
  markdown: string,
  sectionHeadingPattern: RegExp,
  requireExplicitListMarker = false
): string[] {
  /** 去除源码后的正文行，保持章节顺序。 */
  const markdownLines = removeFencedCodeBlocks(markdown).split('\n')
  /** 当前是否位于目标章节。 */
  let isInsideTargetSection = false
  /** 当前目标章节的标题层级。 */
  let targetHeadingDepth = 0
  /** 从目标章节提取并去重后的短句。 */
  const sectionStatements: string[] = []

  for (const markdownLine of markdownLines) {
    /** 当前行如果是标题，对应的 Markdown 标题层级和内容。 */
    const headingMatch = markdownLine.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      /** 当前标题的井号数量。 */
      const headingDepth = headingMatch[1]?.length || 0
      /** 当前标题去除 Markdown 后的文本。 */
      const headingText = normalizeQuizStatement(headingMatch[2] || '')

      if (sectionHeadingPattern.test(headingText)) {
        isInsideTargetSection = true
        targetHeadingDepth = headingDepth
        continue
      }

      if (isInsideTargetSection && headingDepth <= targetHeadingDepth) {
        isInsideTargetSection = false
      }
      continue
    }

    if (!isInsideTargetSection || !markdownLine.trim()) {
      continue
    }

    // 误区章节常在错误项后追加解释段；仅提取显式列出的错误，避免把纠正说明误判成错项。
    if (requireExplicitListMarker && !/^\s*(?:[-*+]\s+|\d+[.)]\s+|[❌⚠])/.test(markdownLine)) {
      continue
    }

    /** 当前章节行转换成可独立判断的首句。 */
    const statement = getQuizOptionSentence(normalizeQuizStatement(markdownLine))
    if (isAssessableStatement(statement) && !sectionStatements.includes(statement)) {
      sectionStatements.push(statement)
    }
  }

  return sectionStatements
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
  /** 去除代码后能够独立阅读的正文短句。 */
  const bodyStatements = removeFencedCodeBlocks(markdown)
    .split('\n')
    .filter((line) => !/^\s*(?:#|\||!\[|>\s*(?:VISUAL|DIAGRAM|SCREENSHOT))/.test(line))
    .map(normalizeQuizStatement)
    .map(getQuizOptionSentence)
    .filter(isAssessableStatement)

  return Array.from(new Set(bodyStatements))
}

/**
 * 为正文证据不足的页面提供两条仍有工程价值的验收原则。
 * @param title 已清理序号和 demo 后缀的文章标题。
 * @param articleKind 当前文章是课程还是可执行实验。
 */
function createEvidenceFallbackStatements(title: string, articleKind: KnowledgeQuizArticleKind): string[] {
  if (articleKind === 'practice') {
    return [
      `修改“${title}”的输入或参数后，应重新运行并核对预期输出、异常路径和关键中间状态。`,
      `复用“${title}”的实验代码前，应确认依赖、入口命令和运行环境与文章约定一致。`
    ]
  }

  return [
    `落地“${title}”前，应核对正文给出的适用条件、失败边界，并用可复现结果完成验收。`,
    `评审“${title}”方案时，应同时检查输入、核心处理和输出是否形成可观测的完整链路。`
  ]
}

/**
 * 选出两条不重复、可独立判断的正确结论。
 * @param markdown 当前文章原始 Markdown。
 * @param title 已清理后的文章标题。
 * @param articleKind 当前文章在学习路径中的用途。
 */
function extractCorrectStatements(markdown: string, title: string, articleKind: KnowledgeQuizArticleKind): string[] {
  /** 总结、最佳实践章节和正文共同提供的候选结论。 */
  const statementCandidates = [
    ...extractSectionStatements(markdown, POSITIVE_SECTION_HEADING_PATTERN),
    ...extractBodyStatements(markdown),
    ...createEvidenceFallbackStatements(title, articleKind)
  ]
  /** 最终用于正确项的两条不同结论。 */
  const correctStatements: string[] = []

  for (const statementCandidate of statementCandidates) {
    /** 当前候选项完成最终长度与标点清理后的文本。 */
    const correctStatement = getStatementClaim(normalizeQuizStatement(statementCandidate))
    if (!isAssessableStatement(correctStatement) || correctStatements.includes(correctStatement)) {
      continue
    }

    correctStatements.push(correctStatement)
    if (correctStatements.length === REQUIRED_CORRECT_OPTION_COUNT) {
      break
    }
  }

  return correctStatements
}

/**
 * 为错误项不足的文章提供与真实交付相关的反模式。
 * @param title 已清理后的文章标题。
 */
function createGenericIncorrectOptions(title: string): GeneratedQuizOptionContent[] {
  return [
    {
      label: `“${title}”的示例只要成功运行一次，就可以直接用于生产，不必验证异常路径。`,
      isCorrect: false,
      reason: '示例成功只覆盖一条快乐路径，不能替代错误处理、权限、资源限制和回归验证。'
    },
    {
      label: `评审“${title}”时只核对最终输出，不必记录输入、关键中间状态和依赖错误。`,
      isCorrect: false,
      reason: '只看最终输出无法定位链路在哪个阶段偏离预期，也无法证明失败路径得到正确处理。'
    }
  ]
}

/**
 * 把正文明确列出的误区转换成主题相关的错误判断。
 * @param markdown 当前文章原始 Markdown。
 * @param title 已清理后的文章标题。
 */
function createMistakeIncorrectOptions(markdown: string, title: string): GeneratedQuizOptionContent[] {
  /** 误区章节中显式列出的错误做法。 */
  const mistakeStatements = extractSectionStatements(markdown, MISTAKE_SECTION_HEADING_PATTERN, true)

  return mistakeStatements
    .filter((mistakeStatement) => !/^(?:被|常见|容易)/.test(mistakeStatement))
    .map((mistakeStatement) => {
      /** 误区名称第一处句末标点的位置。 */
      const mistakeLabelEndIndex = mistakeStatement.search(/[。；;！!]/)
      /** 只保留误区名称，不把后面的风险解释塞进选项。 */
      const rawMistakeLabel =
        mistakeLabelEndIndex >= 2 ? mistakeStatement.slice(0, mistakeLabelEndIndex) : mistakeStatement
      /** 去除句末标点并限制长度后的误区名称。 */
      const mistakeLabel = rawMistakeLabel.replace(/[。；;！!]$/, '').slice(0, MAX_MISTAKE_LABEL_LENGTH)

      return {
        label: `“${mistakeLabel}”不会影响“${title}”的可靠性，可以保留为默认做法。`,
        isCorrect: false,
        reason: `正文明确把“${mistakeStatement}”列为需要避免的错误做法；该选项反而把反模式当成了默认方案。`
      }
    })
}

/**
 * 选出两条不重复且不会与正确项冲突的错误判断。
 * @param markdown 当前文章原始 Markdown。
 * @param title 已清理后的文章标题。
 * @param correctStatements 当前题的两条正确结论。
 */
function extractIncorrectOptions(
  markdown: string,
  title: string,
  correctStatements: readonly string[]
): GeneratedQuizOptionContent[] {
  /** 正文具体误区优先，通用交付反模式只负责补足选项。 */
  const incorrectOptionCandidates = [
    ...createMistakeIncorrectOptions(markdown, title),
    ...createGenericIncorrectOptions(title)
  ]
  /** 最终用于题目的两条不重复错误判断。 */
  const incorrectOptions: GeneratedQuizOptionContent[] = []

  for (const incorrectOptionCandidate of incorrectOptionCandidates) {
    if (
      !isAssessableStatement(incorrectOptionCandidate.label) ||
      correctStatements.includes(incorrectOptionCandidate.label) ||
      incorrectOptions.some((option) => option.label === incorrectOptionCandidate.label)
    ) {
      continue
    }

    incorrectOptions.push(incorrectOptionCandidate)
    if (incorrectOptions.length === REQUIRED_QUIZ_OPTION_COUNT - REQUIRED_CORRECT_OPTION_COUNT) {
      break
    }
  }

  return incorrectOptions
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
  return title.replace(/\s+(?:demo|实验|自测 quiz|抽题自测)$/i, '').trim()
}

/**
 * 为没有人工题库的课程生成一题场景化四选多选题。
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
  /** 从正文证据选出的两条正确判断。 */
  const correctStatements = extractCorrectStatements(markdown, quizTopicTitle, articleKind)
  /** 与正文边界冲突的两条错误判断。 */
  const incorrectOptions = extractIncorrectOptions(markdown, quizTopicTitle, correctStatements)
  /** 尚未分配 A、B、C、D 的四个候选答案。 */
  const optionCandidates: GeneratedQuizOptionContent[] = [
    ...correctStatements.map((correctStatement) => ({
      label: correctStatement,
      isCorrect: true,
      reason: `正文把“${correctStatement}”作为核心结论、操作步骤或验收依据。`
    })),
    ...incorrectOptions
  ]
  /** 根据文章路径稳定打散正确项位置。 */
  const optionRotationOffset = getStableRotationOffset(articlePath, optionCandidates.length)
  /** 最终稳定排序的候选答案。 */
  const orderedOptionCandidates = rotateOptions(optionCandidates, optionRotationOffset)
  /** 带 A、B、C、D 标识的最终选项。 */
  const options: KnowledgeQuizOption[] = orderedOptionCandidates.map((option, optionIndex) => ({
    id: QUIZ_OPTION_IDS[optionIndex] || String(optionIndex + 1),
    ...option
  }))
  /** 当前题完成排序后的正确选项标识。 */
  const correctOptionIds = options.filter((option) => option.isCorrect).map((option) => option.id)
  /** 根据课程或实验使用不同的真实决策语境。 */
  const prompt =
    articleKind === 'practice'
      ? `你准备把“${quizTopicTitle}”从可运行示例推进到可复用实现。哪些操作或判断应通过验收？`
      : `团队正在评审“${quizTopicTitle}”在真实项目中的用法。哪些结论有正文依据？`

  return [
    {
      id: 'article-engineering-review',
      type: 'multiple',
      prompt,
      options,
      explanation: `应选择 ${correctOptionIds.join('、')}。判断标准是能否回到正文中的原理、步骤或失败边界，而不是记住标题或跑通一次示例。`
    }
  ]
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
  /** 人工题优先，其他课程使用正文证据生成。 */
  const questions = CURATED_QUIZZES[articlePath] || createGeneratedQuiz(articlePath, markdown, title, articleKind)
  /** 构建期质量门发现的问题。 */
  const auditIssues = auditKnowledgeQuizQuestions(articlePath, articleKind, questions)

  if (auditIssues.length > 0) {
    throw new Error(auditIssues.map((auditIssue) => auditIssue.message).join('\n'))
  }

  return questions
}
