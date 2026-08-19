# LangChain（10） - 实战练习 LCEL 组装 chain

## TypeScript 实现地图

TypeScript 用 `prompt.pipe(model).pipe(parser)` 组成 LCEL，必要时用 `RunnablePassthrough.assign()` 添加上下文，并以 `withConfig({ tags, metadata })` 传递 Trace 信息。

```typescript runnable file=main.ts title="TypeScript 本篇最小实验" description="运行本篇 TypeScript 核心数据流。"
const context = ['证据 A', '证据 B']
console.log({ question: '什么是 LCEL？', context: context.join('\n') })
```



> 读完后，你应能完成以下任务：
> - 绘制“LangChain（15） - 实战练习 LCEL 组装 chain / 本篇定位”的关键对象与数据流，解释“这是 LangChain 实战练习篇，重点练固定流程的组件串联。”，并用源码位置、日志或 Trace 标注证据。
> - 为“LangChain（15） - 实战练习 LCEL 组装 chain / 核心拆解”设计正常与异常输入，验证“LCEL 适合固定流程。”，输出首个偏差位置与回归测试结果。
> - 实现“LangChain（15） - 实战练习 LCEL 组装 chain / 工程链路”的最小代码或配置，检验“定义输入 question。”，输出命令、结果与 Diff，并说明不适用边界。

# 一、实战练习 LCEL 组装 chain的学习定位与边界

这是 LangChain 实战练习篇，重点练固定流程的组件串联。

# 二、实战练习 LCEL 组装 chain的真实应用场景

一个最小 RAG chain 可以是：输入问题 → 检索文档 → 渲染 prompt → 调模型 → 解析输出。这个流程没有循环和动态分支，用 chain 表达非常自然。只要你把每步的数据结构对齐，整个链就像一条清晰流水线。

# 三、实战练习 LCEL 组装 chain的核心对象与机制

- LCEL 适合固定流程。它让你把“先检索、再提示词、再模型、再解析”写成可读的组合。
- RAG chain 的关键不是代码有多短，而是每一步都能单独替换和测试。Retriever、Prompt、LLM、Parser 都应该能独立跑。
- 一旦流程需要“检索失败就改写再检索”“工具失败就换策略”这种回路，chain 就开始吃力，需要 LangGraph。

# 四、实战练习 LCEL 组装 chain的工程链路

- 定义输入 question。
- Retriever 返回 documents。
- PromptTemplate 把 question 和 documents 渲染成 prompt。
- LLM 生成回答。
- Parser 校验格式并输出 answer、citations。

# 五、实战练习 LCEL 组装 chain的落地建议

- 先用 mock retriever 和 mock llm 验证数据流。
- 链路中间结果要能打印，便于定位坏 case。
- 回答和引用分开输出，引用不要让模型编。

# 六、实战练习 LCEL 组装 chain的常见故障与误区

- 把所有逻辑塞进一个 chain，没人看得懂。
- 遇到条件分支仍强行用三元表达式拼。
- 不记录中间 documents，答错时无法判断是检索还是生成问题。

# 七、实战练习 LCEL 组装 chain在学习路线中的位置

67 讲 Runnable，本篇练固定 RAG chain；75 和 76 会处理 chain 不擅长的循环与分支。

# 八、实战练习 LCEL 组装 chain的核心结论

> LCEL 适合固定流水线，比如 RAG 的检索、prompt、模型、解析。每步要独立可测，并保留中间结果。只要出现循环、回退、动态决策，就该考虑 LangGraph，而不是继续把 chain 写复杂。

# 九、动手实践：LCEL RAG 与 Callback Trace

把固定 RAG 流程拆成 `retrieve → prompt → model → parser` 四个可测试步骤，并通过 Callback 记录每一步的输入字段、输出字段和耗时。

## 9.1 在线运行


零依赖，TypeScript 5+ 可运行。真实 LangChain 中可替换为 `RunnableParallel`、`PromptTemplate`、模型 Runnable、Parser 和 LangSmith/LangFuse Callback，数据契约保持一致。

## 9.2 重点观察

- Trace 同时保留召回证据和最终引用，答错时能区分检索问题与生成问题。
- 固定流水线适合 LCEL；需要重试环路或人工审批时应切换 LangGraph。

## 9.3 可运行源码：实战练习 LCEL 组装 chain


### main.ts

```typescript runnable file=main.ts title="TypeScript LCEL 固定流水线" description="组合检索、Prompt、模型替身和 Parser，并记录每一步 Trace。"
/** LCEL 教学管道中传递的共享状态。 */
interface ChainState {
  question: string
  documents?: string[]
  prompt?: string
  modelOutput?: string
  answer?: string
  citations?: string[]
}

/** 单个 Runnable 步骤的 Trace。 */
interface TraceEvent {
  stage: string
  inputKeys: string[]
  outputKeys: string[]
  durationMs: number
}

/** Runnable 接收状态并返回新的不可变状态。 */
type Runnable = (state: ChainState) => ChainState
/** 管道执行期间收集的可观测事件。 */
const traceEvents: TraceEvent[] = []

/**
 * 为教学 Runnable 增加输入输出字段 Trace。
 * @param stage 当前步骤的稳定名称。
 * @param runnable 当前步骤的业务函数。
 * @returns 带 Trace 的 Runnable。
 */
function withTrace(stage: string, runnable: Runnable): Runnable {
  return (state) => {
    /** 当前步骤开始执行的高精度时间。 */
    const startedAt = performance.now()
    /** 当前步骤返回的新状态。 */
    const nextState = runnable(state)
    traceEvents.push({
      stage,
      inputKeys: Object.keys(state),
      outputKeys: Object.keys(nextState),
      durationMs: performance.now() - startedAt
    })
    return nextState
  }
}

/**
 * 按声明顺序组合多个 Runnable。
 * @param runnables 需要依次执行的固定步骤。
 * @returns 可一次调用的完整 Chain。
 */
function pipe(...runnables: Runnable[]): Runnable {
  return (initialState) => runnables.reduce((state, runnable) => runnable(state), initialState)
}

/** 模拟 Retriever 的本地知识片段。 */
const knowledgeBase = [
  'LCEL 用管道运算符组合固定的数据处理步骤。',
  'LangGraph 适合循环、分支、暂停和恢复。'
]

/** 根据问题关键词返回文档的 Runnable。 */
const retrieve = withTrace('retrieve', (state) => ({
  ...state,
  documents: knowledgeBase.filter((document) =>
    state.question.toLowerCase().includes('lcel') ? document.includes('LCEL') : true
  )
}))

/** 把问题和文档渲染为模型输入的 Runnable。 */
const renderPrompt = withTrace('prompt', (state) => ({
  ...state,
  prompt: `请只根据资料回答：${state.question}\n资料：${(state.documents || []).join('\n')}`
}))

/** 不访问网络的确定性模型替身。 */
const invokeModel = withTrace('model', (state) => ({
  ...state,
  modelOutput: JSON.stringify({
    answer: state.documents?.[0] || '没有找到资料',
    citations: state.documents?.map((_, index) => `doc-${index + 1}`) || []
  })
}))

/** 校验并解析模型 JSON 的 Runnable。 */
const parseOutput = withTrace('parser', (state) => {
  /** 模型输出解析后的未知对象。 */
  const parsed = JSON.parse(state.modelOutput || '{}') as { answer?: unknown; citations?: unknown }
  if (typeof parsed.answer !== 'string' || !Array.isArray(parsed.citations)) {
    throw new Error('模型输出不满足 answer/citations 契约')
  }
  return { ...state, answer: parsed.answer, citations: parsed.citations.map(String) }
})

/** 固定顺序的最小 RAG Chain。 */
const ragChain = pipe(retrieve, renderPrompt, invokeModel, parseOutput)
/** 用户问题经过完整 Chain 后的结果。 */
const result = ragChain({ question: 'LCEL 适合什么流程？' })

console.log({ answer: result.answer, citations: result.citations })
for (const event of traceEvents) {
  console.log(`${event.stage}: ${event.inputKeys.join(',')} -> ${event.outputKeys.join(',')}`)
}
```

## 9.4 如何映射到真实 LangChain.js

`pipe()` 对应 Runnable 的 `.pipe()` 或 LCEL 管道组合，`retrieve` 对应 Retriever，`renderPrompt` 对应 `ChatPromptTemplate`，`invokeModel` 对应 ChatModel，`parseOutput` 对应结构化输出 Parser。这个沙盒保留了每一步的数据边界，因此替换真实组件时不需要重写整条业务流程。

## 9.5 什么时候停止继续拼 Chain

- 需要根据模型结果回到 Retriever 重试时，流程已经出现循环。
- 需要人工审批、暂停和恢复时，需要持久化状态而不只是函数返回值。
- Tool 数量由模型动态选择时，应使用 Agent 或 LangGraph 表达控制流。
- 无论使用哪种编排，Trace 都必须保留 Retriever 输入、召回文档和最终引用。

# 十、总结

- **本篇定位**：这是 LangChain 实战练习篇，重点练固定流程的组件串联。
- **工程链路**：定义输入 question。
- **落地建议**：先用 mock retriever 和 mock llm 验证数据流。
- **常见坑**：不记录中间 documents，答错时无法判断是检索还是生成问题。
- **复述答法**：LCEL 适合固定流水线，比如 RAG 的检索、prompt、模型、解析。

## 参考资料

- [LangChain 文档](https://docs.langchain.com/oss/javascript/langchain/overview)
- [Dify 文档](https://docs.dify.ai/)
