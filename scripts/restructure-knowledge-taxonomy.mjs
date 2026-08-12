import fs from 'node:fs'
import path from 'node:path'

/** 当前脚本是否被明确授权写入仓库。 */
const SHOULD_WRITE = process.argv.includes('--write')

/** 只根据现有规范文章重新生成三张思维导图。 */
const MINDMAPS_ONLY = process.argv.includes('--mindmaps-only')

/** 知识库文章根目录。 */
const KNOWLEDGE_ROOT = path.join(process.cwd(), 'src', 'content', 'knowledge')

/** 三张路线思维导图所在目录。 */
const MINDMAP_ROOT = path.join(process.cwd(), 'src', 'content', 'mindmaps')

/** 旧路径到新路径的兼容映射文件。 */
const MIGRATION_FILE = path.join(process.cwd(), 'src', 'content', 'knowledge-path-migrations.json')

/** 不作为正式文章扫描的目录名。 */
const NON_ARTICLE_DIRECTORIES = new Set(['lab', '_shared-labs', 'data', 'docs', 'static', 'tests'])

/** Markdown 文件排序前缀。 */
const ORDER_PREFIX_PATTERN = /^\d+-/

/** 文章首个一级标题。 */
const H1_PATTERN = /^#\s+(.+)$/m

/** Markdown 中的外部链接。 */
const EXTERNAL_LINK_PATTERN = /https?:\/\//

/** 不适合作为思维导图核心知识点的章节。 */
const EXCLUDED_HEADING_PATTERN = /(?:参考资料|事实来源|总结|验收|自测|下一篇|延伸阅读|可运行源码|requirements)/i

/** 三条路线的规范名称、目录和知识域顺序。 */
const TRACKS = [
  {
    directory: '01-全栈开发',
    title: '全栈开发',
    categories: ['富文本编辑器', '工程化脚手架', 'React 源码', 'Java', 'Python', 'Playwright', '测试工程']
  },
  {
    directory: '02-AI编程',
    title: 'AI 编程',
    categories: ['AI 编程基础', 'Prompt 工程', 'Claude Code', 'Codex', 'Skill 与 MCP', 'Agent Harness', '工程化工作流']
  },
  {
    directory: '03-AI大模型应用开发',
    title: 'AI 大模型应用开发',
    categories: [
      '大模型基础',
      'Prompt 工程',
      '应用框架',
      'RAG',
      '记忆系统',
      'Agent',
      '模型工程',
      '可观测性',
      '生产工程',
      '项目实战',
      '面试题'
    ]
  }
]

/** 各知识域的学习范围，直接用于生成唯一学习指南。 */
const CATEGORY_SYLLABUS = {
  '富文本编辑器': ['Tiptap 与 ProseMirror 数据模型', '样式隔离与菜单系统', '插件、AI 与 Yjs 协同'],
  工程化脚手架: ['Monorepo 与依赖边界', '模板、Create 与 Generate 命令', '构建、发布与 AI 组件生成'],
  'React 源码': ['JSX、ReactElement 与 Fiber', 'Scheduler、Reconciler 与 Commit', '事件、Lane、Diff 与 Hooks'],
  Java: ['Java 语言与 JVM 环境', 'Spring Boot、数据访问与事务', '微服务、中间件、接口实战与排障'],
  Python: ['Python 语言与工程环境', 'FastAPI、异步、数据与测试', '自动化、AI 调用、打包与部署'],
  Playwright: ['定位、等待与断言', 'UI 模式、夹具与 Page Object', 'AI 辅助测试和可维护性'],
  测试工程: ['测试金字塔与边界', '快照测试的适用范围', '稳定性、可读性与质量门禁'],
  'AI 编程基础': ['AI 编程模式与能力边界', '任务拆分、上下文和验证闭环', '工具选型与安全授权'],
  'Prompt 工程': ['结构化 Prompt 与 Few-shot', '输出约束、任务拆解与模板', '调试、评测与注入防护'],
  'Claude Code': ['项目规则、权限与 Plan Mode', 'Git、Worktree、测试与自动化', '子代理、MCP、Skills、Hooks 与远程任务'],
  Codex: ['CLI、IDE、App 与 Cloud', 'AGENTS.md、沙箱和配置', 'MCP、Skill、Subagent、Hooks 与插件'],
  'Skill 与 MCP': ['Skill 触发与渐进式披露', '资源、脚本、测试和发布', 'MCP 工具协议与能力边界'],
  'Agent Harness': ['Agent Loop 与工具调用', '上下文、记忆、权限和扩展', '子代理、生产稳定性与综合实战'],
  工程化工作流: ['需求澄清与实施计划', '隔离工作区、TDD 与系统调试', '并行协作、审查验证与分支收尾'],
  大模型基础: ['Token、Transformer、Attention 与上下文窗口', '自回归生成机制与采样参数', '模型能力边界、训练阶段与选型'],
  'Prompt 工程@ai-apps': ['Prompt 结构与 Few-shot', '上下文构建与结构化输出', 'Prompt 调优、评测与注入防护'],
  应用框架: ['LangChain、LCEL 与 Runnable', 'Output Parser、Callback 与 Middleware', 'Dify、Coze 与框架选型'],
  RAG: ['文档解析、Chunking 与离线建库', 'Embedding、VectorDB、BM25 与多路召回', '混合检索、Rerank、引用校验、评测与 GraphRAG'],
  记忆系统: ['对话上下文与 Redis 短期记忆', 'Mem0 长期记忆与多路召回', '记忆提取、更新、冲突、过期与遗忘'],
  Agent: ['Agent Loop、Function Calling、Tool Use 与 Router', 'ReAct、Plan-and-Execute 与 Reflection', 'MCP、Skill、LangGraph、HIL、Multi-Agent 与 Deep Agents'],
  模型工程: ['模型选型、微调与量化', '推理加速、模型部署与 GPU', '吞吐、并发、延迟与成本优化'],
  可观测性: ['Trace、Span、LangSmith 与 Langfuse', 'Dataset、Evaluation 与质量指标', '线上监控、告警与回归闭环'],
  生产工程: ['权限、安全、限流与缓存', '超时、重试、幂等与降级', '灰度、成本、SLO 与故障排查'],
  项目实战: ['企业知识库与 RAG 问答系统', 'Agent 助手与 AI Copilot', '端到端设计、部署、评测与复盘'],
  面试题: ['按知识域组织 100 道题', '回答包含原理、取舍和生产案例', '用于复习、追问与最终验收']
}

/** 各知识域使用的可信默认资料。 */
const CATEGORY_SOURCES = {
  '富文本编辑器': [['Tiptap 文档', 'https://tiptap.dev/docs/editor/getting-started/overview'], ['ProseMirror 指南', 'https://prosemirror.net/docs/guide/']],
  工程化脚手架: [['pnpm Workspace', 'https://pnpm.io/workspaces'], ['Next.js 文档', 'https://nextjs.org/docs']],
  'React 源码': [['React 文档', 'https://react.dev/learn'], ['React 源码', 'https://github.com/facebook/react']],
  Java: [['Dev.java 学习路径', 'https://dev.java/learn/'], ['Spring Boot 文档', 'https://docs.spring.io/spring-boot/']],
  Python: [['Python 3 文档', 'https://docs.python.org/3/'], ['FastAPI 文档', 'https://fastapi.tiangolo.com/']],
  Playwright: [['Playwright 文档', 'https://playwright.dev/docs/intro'], ['Playwright 最佳实践', 'https://playwright.dev/docs/best-practices']],
  测试工程: [['Vitest 指南', 'https://vitest.dev/guide/'], ['Testing Library 原则', 'https://testing-library.com/docs/guiding-principles']],
  'AI 编程基础': [['OpenAI Codex 文档', 'https://developers.openai.com/codex/'], ['GitHub Copilot 文档', 'https://docs.github.com/en/copilot']],
  'Prompt 工程': [['OpenAI Prompt Engineering', 'https://platform.openai.com/docs/guides/prompt-engineering'], ['OWASP Prompt Injection', 'https://genai.owasp.org/llmrisk/llm01-prompt-injection/']],
  'Claude Code': [['Claude Code 文档', 'https://docs.anthropic.com/en/docs/claude-code/overview'], ['Claude Code 安全', 'https://docs.anthropic.com/en/docs/claude-code/security']],
  Codex: [['OpenAI Codex 文档', 'https://developers.openai.com/codex/'], ['AGENTS.md 规范', 'https://agents.md/']],
  'Skill 与 MCP': [['Agent Skills 规范', 'https://agentskills.io/specification'], ['MCP 规范', 'https://modelcontextprotocol.io/specification/latest']],
  'Agent Harness': [['OpenAI Agents SDK', 'https://openai.github.io/openai-agents-python/'], ['OWASP Agentic Security', 'https://genai.owasp.org/']],
  工程化工作流: [['Git Worktree', 'https://git-scm.com/docs/git-worktree'], ['pytest 文档', 'https://docs.pytest.org/en/stable/']],
  大模型基础: [['Hugging Face LLM Course', 'https://huggingface.co/learn/llm-course/chapter1/1'], ['Attention Is All You Need', 'https://arxiv.org/abs/1706.03762']],
  'Prompt 工程@ai-apps': [['OpenAI Prompt Engineering', 'https://platform.openai.com/docs/guides/prompt-engineering'], ['OWASP Prompt Injection', 'https://genai.owasp.org/llmrisk/llm01-prompt-injection/']],
  应用框架: [['LangChain 文档', 'https://docs.langchain.com/oss/python/langchain/overview'], ['Dify 文档', 'https://docs.dify.ai/']],
  RAG: [['LangChain Retrieval', 'https://docs.langchain.com/oss/python/langchain/retrieval'], ['Milvus 文档', 'https://milvus.io/docs']],
  记忆系统: [['LangGraph Memory', 'https://docs.langchain.com/oss/python/langgraph/add-memory'], ['Mem0 文档', 'https://docs.mem0.ai/']],
  Agent: [['LangChain Agents', 'https://docs.langchain.com/oss/python/langchain/agents'], ['LangGraph 文档', 'https://docs.langchain.com/oss/python/langgraph/overview']],
  模型工程: [['Hugging Face PEFT', 'https://huggingface.co/docs/peft/index'], ['vLLM 文档', 'https://docs.vllm.ai/']],
  可观测性: [['OpenTelemetry Traces', 'https://opentelemetry.io/docs/concepts/signals/traces/'], ['Langfuse 文档', 'https://langfuse.com/docs']],
  生产工程: [['OWASP LLM Top 10', 'https://genai.owasp.org/llm-top-10/'], ['Google SRE Workbook', 'https://sre.google/workbook/table-of-contents/']],
  项目实战: [['FastAPI 大型应用', 'https://fastapi.tiangolo.com/tutorial/bigger-applications/'], ['Docker Compose', 'https://docs.docker.com/compose/']],
  面试题: [['OpenAI Cookbook', 'https://cookbook.openai.com/'], ['LangChain 文档', 'https://docs.langchain.com/']]
}

/** AI 应用路线需要新增的关键文章定义。 */
const AI_APP_SUPPLEMENTS = {
  大模型基础: [
    {
      title: 'Token、上下文窗口与生成机制',
      summary: '从文本进入模型到逐 Token 生成，建立容量、质量、延迟和成本之间的可计算关系。',
      decisions: ['Tokenizer 决定文本如何切成 token，同一段文本在不同模型上计数可能不同。', '上下文窗口容纳输入和输出，但可容纳不等于能稳定利用；长上下文需要检索和位置评测。', '生成是对下一个 token 概率分布反复采样，temperature、top_p 和停止条件共同控制结果。'],
      steps: ['用目标模型 tokenizer 统计系统提示、历史消息、检索上下文和预留输出。', '为各部分设置预算，达到阈值时优先压缩历史和去重检索块。', '记录输入/输出 token、首 token 延迟、总延迟和截断次数。'],
      pitfalls: ['按字符数估 token 会导致多语言场景预算漂移。', '窗口塞满会稀释有效证据，不能替代检索排序。', '只限制 max_tokens 而不设业务停止条件，可能产生冗长或半截 JSON。'],
      sources: [['OpenAI Tokenizer', 'https://platform.openai.com/tokenizer'], ['Hugging Face Tokenizers', 'https://huggingface.co/docs/tokenizers/index']]
    },
    {
      title: '模型能力边界与应用选型',
      summary: '用任务评测选择模型，而不是用榜单分数替代业务质量、延迟、成本和合规判断。',
      decisions: ['先把任务拆成抽取、分类、检索、生成、工具调用和推理，再为每类定义数据集。', '比较正确率、引用忠实度、P95 延迟、单位请求成本、并发上限和数据驻留要求。', '小模型处理路由和抽取，强模型处理低频复杂推理，通常比全量调用强模型更稳。'],
      steps: ['收集正常、边界、攻击和失败样本。', '固定 Prompt 与解析器，对候选模型重复运行并记录置信区间。', '设置质量门槛后，再在合格模型中优化成本和延迟。'],
      pitfalls: ['公开榜单与真实输入分布不一致。', '单次人工体验无法估计稳定性。', '忽略限流、区域和供应商故障会放大上线风险。'],
      sources: [['OpenAI Evals', 'https://github.com/openai/evals'], ['HELM', 'https://crfm.stanford.edu/helm/latest/']]
    }
  ],
  'Prompt 工程': [
    {
      title: 'Few-shot、上下文构建与注入防护',
      summary: '把指令、可信上下文、示例和用户数据分层，使模型学会目标格式，同时不把外部内容当成高权限命令。',
      decisions: ['系统指令声明角色、边界和拒绝条件，开发者上下文提供业务规则，用户输入保持最低信任级。', 'Few-shot 示例覆盖边界和失败格式，数量由评测决定，不靠堆例子。', '检索文档和网页是数据而非指令，工具参数必须经过 Schema、权限和 allowlist 校验。'],
      steps: ['先写输入输出契约和负例。', '选择能区分关键边界的少量示例。', '用注入语料、越权工具调用和格式破坏样本回归。'],
      pitfalls: ['仅用“忽略恶意指令”一句话不能形成隔离。', '把密钥或内部规则放入 Prompt 仍可能泄露。', '示例互相矛盾会让输出格式和决策边界漂移。'],
      sources: [['OpenAI Prompt Engineering', 'https://platform.openai.com/docs/guides/prompt-engineering'], ['OWASP Prompt Injection', 'https://genai.owasp.org/llmrisk/llm01-prompt-injection/']]
    }
  ],
  应用框架: [
    {
      title: 'Callback、Middleware 与运行时扩展',
      summary: '在不污染业务链的前提下统一记录模型、检索和工具调用，并实现限流、降级和审计。',
      decisions: ['Callback 适合观察生命周期事件，Middleware 适合在调用前后修改上下文或拦截执行。', 'Trace 必须携带 request_id、tenant_id、model、token、latency 和 error_type，但不能记录密钥与完整敏感正文。', '扩展点失败默认不能拖垮主链路；审计类事件则需要可靠缓冲和告警。'],
      steps: ['定义统一事件 Schema。', '在模型、Retriever、Tool 三个边界注入追踪。', '用正常、超时、解析失败和回调故障四类用例验证。'],
      pitfalls: ['同步上报 Trace 会放大尾延迟。', '重复注册 Callback 会产生重复 Span 和成本统计。', '把业务分支写进通用回调会导致链条不可理解。'],
      sources: [['LangChain Callbacks', 'https://python.langchain.com/docs/concepts/callbacks/'], ['LangChain Middleware', 'https://docs.langchain.com/oss/python/langchain/middleware/overview']]
    }
  ],
  记忆系统: [
    {
      title: '记忆提取、召回、冲突与遗忘',
      summary: '把记忆看成有来源、版本、置信度和生命周期的数据，而不是无限增长的聊天记录。',
      decisions: ['短期记忆保存当前会话状态，长期记忆保存跨会话稳定事实、偏好和已完成事项。', '写入前做价值判断、敏感信息过滤、去重和冲突检测；召回同时考虑语义、时间和作用域。', '更新采用版本或时间戳，过期策略结合 TTL、衰减分数和用户显式删除。'],
      steps: ['从对话提取候选记忆并标注类型、来源和置信度。', '按 user、tenant、agent 和场景隔离存储。', '召回后校验冲突与时效，再组装进上下文并记录使用反馈。'],
      pitfalls: ['把模型总结直接写库会固化幻觉。', '缺少租户和用户过滤会造成严重越权。', '只增不删会让旧偏好压过新事实。'],
      sources: [['Mem0 Memory Concepts', 'https://docs.mem0.ai/core-concepts/memory-operations'], ['Redis Expiration', 'https://redis.io/docs/latest/commands/expire/']]
    }
  ],
  Agent: [
    {
      title: 'Router、Plan-and-Execute 与 Reflection',
      summary: '针对任务复杂度选择一次路由、显式计划或结果反思，避免所有请求都进入昂贵且难控制的循环。',
      decisions: ['Router 适合类别稳定、目标处理器明确的请求。', 'Plan-and-Execute 适合多步骤且依赖关系清楚的任务，计划必须允许执行反馈后重排。', 'Reflection 只在结果可验证且修正收益高时启用，并设置最大轮次和终止原因。'],
      steps: ['先定义状态、可用动作和成功条件。', '路由输出使用枚举 Schema，计划步骤绑定工具和完成证据。', '每轮记录决策、工具结果、预算和停止原因。'],
      pitfalls: ['无限反思会增加成本但不提高正确率。', '计划与执行共享未裁剪上下文容易超窗。', '没有确定性校验器时，模型自评不能作为唯一验收。'],
      sources: [['LangGraph Workflows and Agents', 'https://langchain-ai.github.io/langgraph/tutorials/workflows/'], ['ReAct Paper', 'https://arxiv.org/abs/2210.03629']]
    }
  ],
  模型工程: [
    {
      title: '模型选型、微调与数据闭环',
      summary: '先用 Prompt、RAG 和工具解决知识与流程问题，只有稳定、可标注的行为差距才进入微调。',
      decisions: ['模型选型以业务评测集为准。', 'SFT 学习目标输出模式，偏好优化改善排序偏好，二者都不能可靠注入频繁变化的事实。', '训练集按用户或时间切分，避免同源样本泄漏到验证集。'],
      steps: ['建立基线与错误分类。', '确认错误可由稳定示例纠正且数据量足够。', '训练后同时回归质量、安全、延迟和成本。'],
      pitfalls: ['用微调替代 RAG 会产生过期知识。', '合成数据未经抽检会放大模型偏差。', '只看训练 loss 无法证明业务提升。'],
      sources: [['Hugging Face PEFT', 'https://huggingface.co/docs/peft/index'], ['OpenAI Fine-tuning', 'https://platform.openai.com/docs/guides/fine-tuning']]
    },
    {
      title: '量化、推理加速与模型部署',
      summary: '围绕显存、吞吐、首 Token 延迟和输出质量选择精度、批处理和推理引擎。',
      decisions: ['量化降低权重和 KV Cache 成本，但不同任务的精度损失需要实测。', 'Continuous Batching 提高吞吐，Paged Attention 减少 KV Cache 碎片。', '服务需要健康检查、模型预热、请求队列、超时取消和滚动升级。'],
      steps: ['测量基线显存、TTFT、TPOT 和 tokens/s。', '逐个引入量化、批处理和并行策略并回归质量。', '用真实长度分布做并发压测和容量规划。'],
      pitfalls: ['只测短 Prompt 会高估并发。', '量化格式与硬件内核不匹配可能更慢。', '模型加载成功不代表流式、取消和过载保护可用。'],
      sources: [['vLLM 文档', 'https://docs.vllm.ai/'], ['Hugging Face Quantization', 'https://huggingface.co/docs/transformers/quantization/overview']]
    },
    {
      title: 'GPU、吞吐与并发优化',
      summary: '用请求长度分布和 SLO 计算容量，而不是用单请求峰值 tokens/s 估算生产并发。',
      decisions: ['TTFT 反映排队和 Prefill，TPOT 反映 Decode；两者优化手段不同。', '数据并行扩副本，张量并行拆单模型，流水线并行适合跨阶段部署。', '队列设置长度和等待上限，过载时拒绝或降级，不能让所有请求一起超时。'],
      steps: ['采集输入/输出 token 分位数和到达率。', '按交互与批处理流量拆池并设置优先级。', '压测到 SLO 临界点，保留故障和发布余量。'],
      pitfalls: ['平均延迟掩盖尾部排队。', '无限队列让错误从快速拒绝变成长时间超时。', '多卡通信开销可能抵消并行收益。'],
      sources: [['NVIDIA Triton Performance', 'https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/performance_tuning/performance_tuning.html'], ['vLLM Optimization', 'https://docs.vllm.ai/en/latest/configuration/optimization/']]
    }
  ],
  可观测性: [
    {
      title: 'Trace、Span 与 Langfuse 实战',
      summary: '把一次 AI 请求拆成模型、检索、工具和解析 Span，定位质量、延迟和成本发生在哪一段。',
      decisions: ['Trace 表示端到端请求，Span 表示一个有开始、结束、属性和状态的操作。', '输入输出需脱敏和采样，tenant_id 等权限字段只存不可逆标识。', 'Langfuse 负责 AI Trace、Prompt、Dataset 和评测，但基础设施指标仍交给 OpenTelemetry 体系。'],
      steps: ['建立 trace_id 并贯穿网关、RAG、Agent 和模型调用。', '记录模型、token、延迟、命中证据、工具错误和最终评分。', '从线上坏例进入 Dataset，再回放形成回归闭环。'],
      pitfalls: ['只记总耗时无法定位慢在检索还是生成。', '全量保存用户正文会产生隐私风险。', 'Trace 成功不等于回答正确，必须关联质量评分。'],
      sources: [['OpenTelemetry Traces', 'https://opentelemetry.io/docs/concepts/signals/traces/'], ['Langfuse Tracing', 'https://langfuse.com/docs/observability/overview']]
    },
    {
      title: 'Dataset、Evaluation 与质量指标',
      summary: '用版本化数据集和分层指标同时约束检索、生成、Agent 行为及端到端任务完成率。',
      decisions: ['RAG 分别评估 Recall@K、MRR、上下文相关性、引用正确性和答案忠实度。', 'Agent 评估任务成功率、工具选择、参数正确率、步骤数、成本和安全违规。', 'LLM-as-Judge 需要明确 rubric、锚点样例和人工抽检，不能直接当真值。'],
      steps: ['从真实流量按错误类型分层采样并去敏。', '固定数据、Prompt、模型和评测器版本。', '在 CI 做小回归，发布前做完整对比，线上监控分布漂移。'],
      pitfalls: ['只看最终答案会掩盖错误证据。', '测试集污染会虚高分数。', '单一平均分无法反映高风险子集退化。'],
      sources: [['LangSmith Evaluation', 'https://docs.langchain.com/langsmith/evaluation'], ['Ragas Metrics', 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/']]
    },
    {
      title: '监控、告警与质量回归闭环',
      summary: '把服务 SLI、模型成本和内容质量放进同一告警上下文，告警必须能指向负责人和处置手册。',
      decisions: ['服务指标覆盖可用率、P95/P99、错误率和队列；AI 指标覆盖 token、拒答、引用和任务成功。', '告警按用户影响和错误预算设置阈值，避免对每个单点错误通知。', '坏例经过去敏、归因和人工确认后进入 Dataset。'],
      steps: ['定义 SLO 与错误预算。', '为每个关键 Span 建仪表盘和 burn-rate 告警。', '告警关联版本、模型、Prompt、租户、trace_id 和 Runbook。'],
      pitfalls: ['只监控 HTTP 200 会漏掉空答案和错误引用。', '高基数原文标签会拖垮指标系统。', '没有版本维度无法确认回归来自哪次发布。'],
      sources: [['Google SRE Alerting', 'https://sre.google/workbook/alerting-on-slos/'], ['OpenTelemetry Metrics', 'https://opentelemetry.io/docs/concepts/signals/metrics/']]
    }
  ],
  生产工程: [
    {
      title: 'SLO、灰度、降级与故障排查',
      summary: '把 AI 质量和系统可靠性转成可度量 SLO，并用灰度、预算和降级把故障影响限制在局部。',
      decisions: ['SLO 同时约束可用率、端到端延迟、任务成功率和高风险错误率。', '灰度按用户或租户稳定分桶，版本必须包含模型、Prompt、索引和代码。', '降级顺序预先定义：缓存答案、简化检索、切备用模型、转人工或明确失败。'],
      steps: ['定义用户可感知 SLI 与错误预算。', '构造模型超时、向量库失败、工具失败和供应商限流演练。', 'Runbook 按现象定位 trace_id、版本、依赖和恢复动作。'],
      pitfalls: ['随机灰度会让同一会话跨版本。', '无界重试会放大供应商故障。', '降级返回无引用答案可能比明确失败更危险。'],
      sources: [['Google SRE SLO', 'https://sre.google/workbook/implementing-slos/'], ['AWS Builders Library Retries', 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/']]
    }
  ]
}

/** 返回用于查找知识域范围的唯一键。 */
function getSyllabusKey(trackTitle, category) {
  return trackTitle === 'AI 大模型应用开发' && category === 'Prompt 工程' ? 'Prompt 工程@ai-apps' : category
}

/** 返回知识域使用的可信来源列表。 */
function getCategorySources(trackTitle, category) {
  return CATEGORY_SOURCES[getSyllabusKey(trackTitle, category)] || []
}

/** 去掉文件或目录名称中的排序前缀。 */
function stripOrderPrefix(value) {
  return value.replace(ORDER_PREFIX_PATTERN, '')
}

/** 返回文章不含 Markdown 扩展名的 POSIX 相对路径。 */
function getArticlePath(filePath) {
  return path.relative(KNOWLEDGE_ROOT, filePath).split(path.sep).join('/').replace(/\.mdx?$/i, '')
}

/** 递归收集正式 Markdown 文章，排除实验夹具和共享资源。 */
function findArticleFiles(directory) {
  /** 当前目录发现的文章文件。 */
  const files = []

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    /** 当前目录项的绝对路径。 */
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (!NON_ARTICLE_DIRECTORIES.has(entry.name)) {
        files.push(...findArticleFiles(entryPath))
      }
      continue
    }

    if (entry.isFile() && /\.mdx?$/i.test(entry.name)) {
      files.push(entryPath)
    }
  }

  return files
}

/** 根据当前实体路径把全栈文章归入扁平知识域。 */
function getFullStackCategory(relativePath) {
  if (relativePath.startsWith('01-前端/01-富文本编辑器/')) return '富文本编辑器'
  if (relativePath.startsWith('01-前端/02-工程化脚手架/')) return '工程化脚手架'
  if (relativePath.startsWith('01-前端/03-React源码/')) return 'React 源码'
  if (relativePath.startsWith('02-后端/java/')) return 'Java'
  if (relativePath.startsWith('02-后端/python/')) return 'Python'
  if (relativePath.startsWith('03-测试/playwright/')) return 'Playwright'
  return '测试工程'
}

/** 根据当前实体路径把 AI 编程文章归入扁平知识域。 */
function getAiCodingCategory(relativePath) {
  if (relativePath.startsWith('01-提示词工程/')) return 'Prompt 工程'
  if (relativePath.startsWith('02-Claude-Code/')) return 'Claude Code'
  if (relativePath.startsWith('03-Codex/')) return 'Codex'
  if (relativePath.startsWith('04-Skills/')) return 'Skill 与 MCP'
  if (relativePath.startsWith('05-Agent-Harness/')) return 'Agent Harness'
  if (relativePath.startsWith('06-Superpowers/')) return '工程化工作流'
  return 'AI 编程基础'
}

/** 判断 AI 应用旧文章是否是由其他路线完整覆盖的重复基础课。 */
function isDuplicateAiAppFoundation(relativePath) {
  return relativePath.startsWith('08-工程基础/03-Python/')
}

/** 根据当前实体路径和标题把 AI 应用文章归入 11 个规范知识域。 */
function getAiAppCategory(relativePath) {
  /** 用于语义匹配的去分隔符路径。 */
  const normalizedPath = relativePath.replaceAll('-', ' ')
  if (relativePath.startsWith('04-AI大模型应用面试题/') || /高频面试题/.test(normalizedPath)) return '面试题'
  if (relativePath.startsWith('03-一人公司/') || /项目 |项目-|简历|项目讲解|垂直行业/.test(normalizedPath)) return '项目实战'
  if (/LangSmith|LangFuse|可观测|日志与可观测/.test(normalizedPath)) return '可观测性'
  if (/Memory|记忆|Mem0|Redis 实现 Agent 短期/.test(normalizedPath)) return '记忆系统'
  if (/企业级知识库|RAG|Embedding|向量|检索|Rerank|Elasticsearch|Neo4j|知识图谱|文档切分|文档解析/.test(normalizedPath)) return 'RAG'
  if (/Transformer|训练 推理|模型部署|模型选型|量化|GPU/.test(normalizedPath)) return '模型工程'
  if (relativePath.startsWith('05-LangChain实战/') || /Dify|Coze|框架选型|Runnable|LCEL|Output Parser|output parser/.test(normalizedPath)) return '应用框架'
  if (relativePath.startsWith('01-Agent工程/') || relativePath.startsWith('06-LangGraph/') || /Agent|MCP|Skill|Tool|LangGraph|DeepAgents|Multi Agent/.test(normalizedPath)) return 'Agent'
  if (/Prompt|结构化输出|多轮对话与上下文/.test(normalizedPath)) return 'Prompt 工程'
  if (/工程基础\/01 学习指南|AI 应用工程师|前端转AI|全景图|大模型API基础|Transformer/.test(normalizedPath)) return '大模型基础'
  return '生产工程'
}

/** 返回任意旧文章对应的规范知识域。 */
function getTargetCategory(trackDirectory, relativePath) {
  if (trackDirectory === '01-全栈开发') return getFullStackCategory(relativePath)
  if (trackDirectory === '02-AI编程') return getAiCodingCategory(relativePath)
  return getAiAppCategory(relativePath)
}

/** 判断旧文章是否是迁移后需要由唯一指南替代的重复指南。 */
function isLegacyGuide(relativePath) {
  return /\/01-学习指南\.md$/i.test(relativePath)
}

/** 从 Markdown 或文件名提取不含旧课号的主题名称。 */
function getBaseTitle(markdown, filePath) {
  /** 一级标题或文件名提供的原始标题。 */
  const rawTitle = markdown.match(H1_PATTERN)?.[1]?.trim() || path.basename(filePath).replace(/\.mdx?$/i, '')
  return rawTitle
    .replace(/[`*_~]/g, '')
    .replace(/^[^（）()\n]{1,80}[（(]\s*\d+\s*[）)]\s*[-—–:：]\s*/, '')
    .replace(/^(?:第\s*\d+\s*课(?:实践)?|附录\s*\d+|\d+)\s*[-·:：]?\s*/i, '')
    .replace(/^学习指南\s*[：:]?\s*/, '')
    .trim()
}

/** 把标题转换为可读且安全的文件名。 */
function sanitizeFileName(title) {
  return title.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || '未命名主题'
}

/** 生成知识域唯一学习指南。 */
function createGuideMarkdown(trackTitle, category) {
  /** 当前知识域必须覆盖的知识清单。 */
  const syllabus = CATEGORY_SYLLABUS[getSyllabusKey(trackTitle, category)] || []
  /** 当前知识域的官方或原始资料。 */
  const sources = getCategorySources(trackTitle, category)
  return `# ${category}学习指南

> 本指南用于建立 ${category} 的学习边界、顺序和验收标准。先完成最小闭环，再进入框架细节和生产优化。

## 学习目标

${syllabus.map((item) => `- ${item}`).join('\n')}

## 学习边界

本知识域只承载与上述目标直接相关的概念、实现和排障。跨域知识通过文章链接引用，避免把一篇文章写成无法复习的百科全书。阅读时先建立输入、处理、输出和失败边界，再记忆框架 API；遇到版本差异，以文章末尾的官方资料和仓库中的可运行示例为准。

## 实践方法

每完成一篇文章，至少留下一个可观察证据：命令输出、接口响应、检索命中、Trace、测试报告或故障复盘。先在最小数据集上验证，再增加并发、权限、异常和成本约束。对于依赖外部服务的实验，文章会明确密钥、网络、数据库或 GPU 前置条件，不把“能启动”当成“可上线”。

学习过程中遇到版本差异时，先记录运行环境和依赖版本，再对照官方文档确认行为；不要用猜测覆盖错误。每个知识点至少回答“什么时候用、什么时候不用、失败后看哪里”三个问题，完成后把结论沉淀到代码、测试或排障清单中，确保下一次可以复现。

## 常见误区

- 只记名词和 API，不写输入输出，无法判断方案是否适合当前问题。
- 只验证成功路径，忽略空数据、超时、权限、版本和重复执行。
- 用单次人工体验替代数据集、指标和回归，发布后无法解释质量变化。

## 推荐顺序

1. 先读概念与最小示例，明确输入、输出和失败边界。
2. 再完成可运行实践，记录关键参数、预期结果和错误信号。
3. 最后学习生产设计，用评测、监控和故障演练验证方案。

## 学完验收

- 能用自己的话解释核心数据流，而不是只记框架 API。
- 能独立运行最小示例，并根据日志定位至少一个故障。
- 能说明一种替代方案，以及质量、延迟、成本或安全上的取舍。

## 参考资料

${sources.map(([label, url]) => `- [${label}](${url})`).join('\n')}
`
}

/** 将来源追加到尚无外部链接的文章。 */
function ensureSources(markdown, trackTitle, category) {
  if (/^##\s+(?:参考资料|事实来源|延伸阅读)/m.test(markdown) && EXTERNAL_LINK_PATTERN.test(markdown)) return markdown
  /** 当前知识域的可信默认资料。 */
  const sources = getCategorySources(trackTitle, category)
  return `${markdown.trim()}\n\n## 参考资料\n\n${sources.map(([label, url]) => `- [${label}](${url})`).join('\n')}\n`
}

/** 生成补充文章的高密度正文。 */
function createSupplementMarkdown(definition) {
  return `# ${definition.title}

> ${definition.summary}

## 学习目标

读完本章后，你应能复述本主题的关键数据流，选择至少一种替代方案，运行或审查最小实现，并根据日志、指标或测试结果解释失败原因。

## 为什么需要它

真实系统的问题通常不在 API 能否调用，而在输入边界、错误恢复和验收证据是否明确。本章给出可以进入设计评审和生产检查的最小框架。

## 核心决策

${definition.decisions.map((item) => `- ${item}`).join('\n')}

## 落地步骤

${definition.steps.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## 生产避坑

${definition.pitfalls.map((item) => `- ${item}`).join('\n')}

## 验收清单

- 关键输入、输出、预算和停止条件都有结构化记录。
- 正常、边界、失败和攻击样本都进入可重复运行的测试集。
- 质量、延迟、成本与安全指标能定位到版本和 trace_id。

## 参考资料

${definition.sources.map(([label, url]) => `- [${label}](${url})`).join('\n')}
`
}

/** 从文章正文提取最多两个能代表学习目标的章节。 */
function getMindmapPoints(markdown) {
  /** 文章全部二级标题。 */
  const headings = [...markdown.matchAll(/^##\s+(.+)$/gm)]
    .map((match) => match[1].replace(/[`*_~]/g, '').trim())
    .filter((heading) => !EXCLUDED_HEADING_PATTERN.test(heading))
  /** 去重后用于导图的知识点。 */
  return [...new Set(headings)].slice(0, 2)
}

/** 从学习指南的目标清单提取思维导图必须保留的具体知识项。 */
function getGuideMindmapPoints(markdown) {
  /** 学习目标章节的正文范围。 */
  const goalSection = markdown.match(/^##\s+学习目标\s*\n([\s\S]*?)(?=^##\s+|\z)/m)?.[1] || ''
  return [...goalSection.matchAll(/^[-*]\s+(.+)$/gm)].map((match) => match[1].trim()).slice(0, 4)
}

/** 将知识文章路径编码为站内链接。 */
function encodeKnowledgePath(articlePath) {
  return articlePath.split('/').map(encodeURIComponent).join('/')
}

/** 从规范文章目录生成扁平且一对一的路线思维导图。 */
function createMindmapMarkdown(track) {
  /** 思维导图的 Markdown 行。 */
  const lines = [`# ${track.title}`]

  track.categories.forEach((category, categoryIndex) => {
    /** 当前知识域的实体目录名。 */
    const categoryDirectory = `${String(categoryIndex + 1).padStart(2, '0')}-${category.replaceAll(' ', '-')}`
    /** 当前知识域的实体绝对目录。 */
    const categoryPath = path.join(KNOWLEDGE_ROOT, track.directory, categoryDirectory)
    /** 当前知识域中的规范文章文件。 */
    const articleFiles = fs.readdirSync(categoryPath).filter((fileName) => /\.mdx?$/i.test(fileName)).sort((left, right) => left.localeCompare(right, 'zh-CN', { numeric: true }))
    lines.push(`- ${category}`)

    articleFiles.forEach((fileName) => {
      /** 文章文件携带的两位顺序。 */
      const sequence = fileName.match(/^(\d+)-/)?.[1] || '00'
      /** 当前文章的完整 Markdown。 */
      const markdown = fs.readFileSync(path.join(categoryPath, fileName), 'utf8')
      /** 当前文章的基础标题。 */
      const baseTitle = getBaseTitle(markdown, fileName)
      /** 页面与导图共用的完整标题。 */
      const displayTitle = sequence === '01' ? `${category}（01） - 学习指南` : `${category}（${sequence}） - ${baseTitle}`
      /** 当前文章不含扩展名的公开路径。 */
      const articlePath = `${track.directory}/${categoryDirectory}/${fileName.replace(/\.mdx?$/i, '')}`
      /** 当前文章的可信资料。 */
      const sourceMatch = markdown.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/)
      lines.push(`  - [${displayTitle}](/knowledge/${encodeKnowledgePath(articlePath)})`)
      if (sequence === '01') {
        getGuideMindmapPoints(markdown).forEach((point) => lines.push(`    - ${point}`))
      }
      getMindmapPoints(markdown).forEach((point) => lines.push(`    - ${point}`))
      if (sourceMatch) lines.push(`    - [来源：${sourceMatch[1]}](${sourceMatch[2]})`)
    })
  })

  return `${lines.join('\n')}\n`
}

/** 删除迁移完成后留下的空目录。 */
function removeEmptyDirectories(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    /** 当前待检查的子目录。 */
    const childPath = path.join(directory, entry.name)
    removeEmptyDirectories(childPath)
    if (fs.readdirSync(childPath).length === 0) fs.rmdirSync(childPath)
  }
}

/** 执行目录、文章和思维导图的一次性重构。 */
function restructureKnowledge() {
  /** 已经执行过扁平化的路线目录，防止重复运行再次重排文章。 */
  const alreadyFlattenedTracks = TRACKS.filter((track) => {
    const trackRoot = path.join(KNOWLEDGE_ROOT, track.directory)
    return fs.existsSync(path.join(trackRoot, '01-' + track.categories[0].replaceAll(' ', '-'))) &&
      fs.existsSync(path.join(trackRoot, `${String(track.categories.length).padStart(2, '0')}-${track.categories.at(-1).replaceAll(' ', '-')}`))
  })
  if (alreadyFlattenedTracks.length > 0) {
    throw new Error(`检测到已经扁平化的路线：${alreadyFlattenedTracks.map((track) => track.title).join('、')}；请从干净 main 工作树执行。`)
  }

  /** 所有旧路径到规范路径的兼容关系。 */
  const pathMigrations = {}
  /** 全栈路线已经迁移完成的文章标题到规范路径映射。 */
  const fullStackArticlePathByTitle = new Map()
  /** 等待全栈 Python 文章完成迁移后解析的重复 AI 应用基础文章。 */
  const pendingDuplicateAiAppArticles = []

  for (const track of TRACKS) {
    /** 当前路线的旧实体根目录。 */
    const trackRoot = path.join(KNOWLEDGE_ROOT, track.directory)
    /** 当前路线迁移前的正式文章。 */
    const sourceFiles = findArticleFiles(trackRoot)
    /** 按知识域收集的待迁移文章。 */
    const articlesByCategory = new Map(track.categories.map((category) => [category, []]))

    for (const sourceFile of sourceFiles) {
      /** 当前文章相对路线根目录的路径。 */
      const relativePath = path.relative(trackRoot, sourceFile).split(path.sep).join('/')
      /** 当前文章迁移前的公开路径。 */
      const oldArticlePath = getArticlePath(sourceFile)
      /** 当前文章对应的规范知识域。 */
      const category = getTargetCategory(track.directory, relativePath)
      /** 由其他路线完整覆盖的重复 AI 应用 Python 课程。 */
      const shouldDropDuplicate = track.title === 'AI 大模型应用开发' && isDuplicateAiAppFoundation(relativePath)
      /** 迁移后每个知识域只保留一个新生成的指南。 */
      if (isLegacyGuide(relativePath) || shouldDropDuplicate) {
        articlesByCategory.get(category).push({ sourceFile, oldArticlePath, dropped: true })
        continue
      }

      /** 当前文章的 Markdown 正文。 */
      const markdown = fs.readFileSync(sourceFile, 'utf8')
      articlesByCategory.get(category).push({ sourceFile, oldArticlePath, markdown, title: getBaseTitle(markdown, sourceFile), dropped: false })
    }

    track.categories.forEach((category, categoryIndex) => {
      /** 当前知识域的规范目录名。 */
      const categoryDirectory = `${String(categoryIndex + 1).padStart(2, '0')}-${category.replaceAll(' ', '-')}`
      /** 当前知识域的规范绝对目录。 */
      const categoryPath = path.join(trackRoot, categoryDirectory)
      fs.mkdirSync(categoryPath, { recursive: true })
      /** 当前知识域的唯一指南路径。 */
      const guidePath = path.join(categoryPath, '01-学习指南.md')
      fs.writeFileSync(guidePath, createGuideMarkdown(track.title, category))
      /** 当前知识域需要优先排列的新增关键文章。 */
      const supplements = track.title === 'AI 大模型应用开发' ? AI_APP_SUPPLEMENTS[category] || [] : []

      supplements.forEach((definition, supplementIndex) => {
        /** 补充文章在指南后的固定顺序。 */
        const sequence = String(supplementIndex + 2).padStart(2, '0')
        /** 补充文章的规范路径。 */
        const targetPath = path.join(categoryPath, `${sequence}-${sanitizeFileName(definition.title)}.md`)
        fs.writeFileSync(targetPath, createSupplementMarkdown(definition))
      })

      /** 当前知识域按原始目录顺序排列的文章。 */
      const categoryArticles = articlesByCategory.get(category).sort((left, right) => left.oldArticlePath.localeCompare(right.oldArticlePath, 'zh-CN', { numeric: true }))
      /** 被删除的旧指南和重复文章统一映射到知识域指南。 */
      categoryArticles.filter((article) => article.dropped).forEach((article) => {
        /** 重复的 AI Python 基础文章延迟到全栈同主题文章映射。 */
        if (track.title === 'AI 大模型应用开发' && isDuplicateAiAppFoundation(article.oldArticlePath)) {
          /** 被重复文章的 Markdown 正文。 */
          const duplicateMarkdown = fs.readFileSync(article.sourceFile, 'utf8')
          pendingDuplicateAiAppArticles.push({ oldArticlePath: article.oldArticlePath, title: getBaseTitle(duplicateMarkdown, article.sourceFile) })
        } else {
          pathMigrations[article.oldArticlePath] = getArticlePath(guidePath)
        }
        fs.rmSync(article.sourceFile)
      })
      /** 文章名冲突时使用的已分配名称集合。 */
      const usedFileNames = new Set(fs.readdirSync(categoryPath))
      /** 迁移旧文章时从补充文章之后继续顺序。 */
      let nextSequence = supplements.length + 2

      for (const article of categoryArticles.filter((candidate) => !candidate.dropped)) {
        /** 当前文章不带旧顺序的语义文件名。 */
        const baseName = sanitizeFileName(article.title)
        /** 当前文章尝试使用的规范文件名。 */
        let targetFileName = `${String(nextSequence).padStart(2, '0')}-${baseName}.md`
        /** 避免同知识域中同名课程覆盖。 */
        let collisionIndex = 2
        while (usedFileNames.has(targetFileName)) {
          targetFileName = `${String(nextSequence).padStart(2, '0')}-${baseName}-${collisionIndex}.md`
          collisionIndex += 1
        }
        usedFileNames.add(targetFileName)
        /** 当前文章的规范目标路径。 */
        const targetPath = path.join(categoryPath, targetFileName)
        /** 当前文章原路径旁的实验目录。 */
        const sourceLabPath = article.sourceFile.replace(/\.mdx?$/i, path.sep + 'lab')
        /** 当前文章新路径旁的实验目录。 */
        const targetLabPath = targetPath.replace(/\.mdx?$/i, path.sep + 'lab')
        fs.writeFileSync(article.sourceFile, ensureSources(article.markdown, track.title, category))
        fs.renameSync(article.sourceFile, targetPath)
        if (fs.existsSync(sourceLabPath)) {
          fs.mkdirSync(path.dirname(targetLabPath), { recursive: true })
          fs.renameSync(sourceLabPath, targetLabPath)
        }
        pathMigrations[article.oldArticlePath] = getArticlePath(targetPath)
        if (track.title === '全栈开发') {
          fullStackArticlePathByTitle.set(article.title, getArticlePath(targetPath))
        }
        nextSequence += 1
      }
    })

    removeEmptyDirectories(trackRoot)
    /** 当前路线的思维导图文件名。 */
    const mindmapFileName = `${String(TRACKS.indexOf(track) + 1).padStart(2, '0')}-${track.title.replaceAll(' ', '')}.md`
    fs.writeFileSync(path.join(MINDMAP_ROOT, mindmapFileName), createMindmapMarkdown(track))
  }

  pendingDuplicateAiAppArticles.forEach((article) => {
    /** 同主题全栈文章，无法精确命中时退回 Python 学习指南。 */
    const replacementPath = fullStackArticlePathByTitle.get(article.title) || '01-全栈开发/05-Python/01-学习指南'
    pathMigrations[article.oldArticlePath] = replacementPath
  })

  fs.writeFileSync(MIGRATION_FILE, `${JSON.stringify(pathMigrations, null, 2)}\n`)
}

if (MINDMAPS_ONLY) {
  TRACKS.forEach((track, trackIndex) => {
    /** 当前路线的思维导图文件名。 */
    const mindmapFileName = `${String(trackIndex + 1).padStart(2, '0')}-${track.title.replaceAll(' ', '')}.md`
    fs.writeFileSync(path.join(MINDMAP_ROOT, mindmapFileName), createMindmapMarkdown(track))
  })
  console.log('三张思维导图已根据当前规范文章重新生成。')
} else if (!SHOULD_WRITE) {
  console.error('仅审计模式：请使用 --write 明确执行知识目录重构。')
  process.exitCode = 1
} else {
  restructureKnowledge()
  console.log('知识目录、补充文章、来源、旧 URL 映射和三张思维导图已同步。')
}
