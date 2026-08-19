# LangChain（11） - 结构化大模型输出：output parser 还是 tool?

## TypeScript 实现地图

TypeScript 常用 Zod schema 配合 `model.withStructuredOutput(schema)`；Tool 适合模型需要决定是否执行动作，Parser 适合一次调用必须返回固定数据形状。

```typescript runnable file=main.ts title="TypeScript 本篇最小实验" description="运行本篇 TypeScript 核心数据流。"
const ticket = { category: 'bug', priority: 2 }
if (!['bug', 'feature'].includes(ticket.category)) throw new Error('非法类别')
console.log(ticket)
```



> 读完后，你应能完成以下任务：
> - 绘制“LangChain（16） - 结构化大模型输出：output parser 还是 tool? / 本篇定位”的关键对象与数据流，解释“这是结构化输出的进阶取舍篇。”，并用源码位置、日志或 Trace 标注证据。
> - 为“LangChain（16） - 结构化大模型输出：output parser 还是 tool? / 核心拆解”设计正常与异常输入，验证“Output parser 适合轻量任务：模型输出文本后，后端按 schema 解析和校验。”，输出首个偏差位置与回归测试结果。
> - 实现“LangChain（16） - 结构化大模型输出：output parser 还是 tool? / 工程链路”的最小代码或配置，检验“只需要展示结构化结果，用 structured output。”，输出命令、结果与 Diff，并说明不适用边界。

# 一、结构化大模型输出的学习定位与边界

这是结构化输出的进阶取舍篇。12 讲 JSON 输出基础，64 讨论生产里该选哪种约束方式。

# 二、结构化大模型输出的真实应用场景

你让模型从用户输入里抽取姓名、时间、事项，返回 JSON。用 prompt 要求“只输出 JSON”经常会混入解释；用 parser 可以修，但失败还要重试；用 tool calling 则让模型按函数参数格式输出。三种方式不是谁替代谁，而是适用场景不同。

# 三、结构化大模型输出的核心对象与机制

- Output parser 适合轻量任务：模型输出文本后，后端按 schema 解析和校验。它灵活，但依赖模型自觉遵守格式。
- Structured output 让模型接口层支持 schema 约束，稳定性更好，适合强格式返回。
- Tool calling 适合“结构化输出之后还要执行动作”的场景。模型输出的是工具名和参数，后端决定是否执行。

# 四、结构化大模型输出的工程链路

- 只需要展示结构化结果，用 structured output。
- 需要兼容普通文本模型，用 output parser 加校验重试。
- 结构化结果会触发外部动作，用 tool calling。
- 不管哪种方式，后端都要做 schema 校验。

# 五、结构化大模型输出的落地建议

- 表单抽取优先 structured output。
- 工具调用参数必须再过业务校验。
- 解析失败要返回可恢复错误，别让前端拿到半截 JSON。

# 六、结构化大模型输出的常见故障与误区

- 只靠 prompt 说“不要输出多余内容”。
- 把 parser 当安全机制，解析成功不代表业务安全。
- 明明只是抽取信息，却强行包装成工具调用。

# 七、结构化大模型输出在学习路线中的位置

12 是结构化输出入门，28 是 Function Calling；64 说明两者在生产任务里的边界。

# 八、结构化大模型输出的核心结论

> 如果只是要稳定 JSON，优先 structured output；接口不支持时用 output parser 加校验重试；如果结构化参数会触发外部动作，就用 tool calling。无论哪种方式，后端 schema 和业务校验都不能省。

# 九、动手实践：结构化输出校验与重试

用标准库复现生产链路中的四层防线：**提取 JSON、语法解析、Schema 校验、业务规则校验**。实验包含一次可修复输出和一次必须拒绝的非法输出。

## 9.1 在线运行


零依赖，TypeScript 5+ 可运行。真实项目可把 `validateSchema` 换成 Zod，把 `repairJson` 换成一次受限模型重试，但权限和业务规则仍必须由后端执行。

## 9.2 重点观察

- “能解析成 JSON”不等于“满足 Schema”。
- “满足 Schema”也不等于“业务上允许执行”。
- 修复重试应有次数上限，并保留原始输出供 Trace 排障。

## 9.3 可运行源码：结构化大模型输出：output parser 还是 tool?


### main.ts

```typescript runnable file=main.ts title="TypeScript 结构化输出校验" description="比较 JSON 解析、Schema 校验、业务校验和受限修复。"
/** 模型需要输出的客户线索结构。 */
interface LeadRecord {
  name: string
  email: string
  priority: 'low' | 'medium' | 'high'
}

/** 校验成功或失败的显式结果。 */
type ValidationResult =
  | { success: true; data: LeadRecord }
  | { success: false; errors: string[] }

/** 允许自动修复模型输出的最大次数。 */
const MAX_REPAIR_ATTEMPTS = 1
/** 简化实验使用的邮箱格式。 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** 业务允许的优先级集合。 */
const PRIORITIES = new Set(['low', 'medium', 'high'])

/**
 * 把未知 JSON 值校验为 LeadRecord。
 * @param value JSON.parse 返回的不可信数据。
 * @returns 包含全部字段错误的判别联合。
 */
function validateLead(value: unknown): ValidationResult {
  /** 当前数据积累的全部结构错误。 */
  const errors: string[] = []
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { success: false, errors: ['根节点必须是对象'] }
  }

  /** 便于按字段读取的未知对象。 */
  const candidate = value as Record<string, unknown>
  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) {
    errors.push('name 必须是非空字符串')
  }
  if (typeof candidate.email !== 'string' || !EMAIL_PATTERN.test(candidate.email)) {
    errors.push('email 格式无效')
  }
  if (typeof candidate.priority !== 'string' || !PRIORITIES.has(candidate.priority)) {
    errors.push('priority 必须是 low、medium 或 high')
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      name: candidate.name as string,
      email: candidate.email as string,
      priority: candidate.priority as LeadRecord['priority']
    }
  }
}

/**
 * 对常见的字段大小写和空白问题执行一次确定性修复。
 * @param value 已经能够解析但未通过 Schema 的对象。
 * @returns 不扩大权限边界的修复结果。
 */
function repairLead(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value
  /** 等待规范化的字段对象。 */
  const candidate = value as Record<string, unknown>
  return {
    ...candidate,
    name: typeof candidate.name === 'string' ? candidate.name.trim() : candidate.name,
    email: typeof candidate.email === 'string' ? candidate.email.trim().toLowerCase() : candidate.email,
    priority: typeof candidate.priority === 'string' ? candidate.priority.trim().toLowerCase() : candidate.priority
  }
}

/**
 * 解析模型文本，并在限定次数内尝试确定性修复。
 * @param modelOutput 模型返回的原始文本。
 * @returns 通过结构校验的客户线索。
 */
function parseStructuredOutput(modelOutput: string): LeadRecord {
  /** 保留用于 Trace 的模型原始文本。 */
  const originalOutput = modelOutput
  /** JSON.parse 得到的未知值。 */
  let candidate: unknown

  try {
    candidate = JSON.parse(originalOutput)
  } catch {
    throw new Error('模型输出不是合法 JSON')
  }

  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt += 1) {
    /** 当前候选值的结构校验结果。 */
    const validation = validateLead(candidate)
    if (validation.success) return validation.data
    if (attempt === MAX_REPAIR_ATTEMPTS) {
      throw new Error(`结构校验失败：${validation.errors.join('；')}`)
    }
    candidate = repairLead(candidate)
  }

  throw new Error('无法到达的结构化输出状态')
}

/** 模拟模型返回的可修复 JSON。 */
const modelOutput = '{"name":"  Lin  ","email":"LIN@EXAMPLE.COM ","priority":" HIGH "}'
/** 解析和 Schema 校验后的安全数据。 */
const lead = parseStructuredOutput(modelOutput)

console.log(lead)
console.log('业务校验仍需单独执行：例如当前用户是否允许创建高优先级线索。')
```

## 9.4 Output Parser 与 Tool Calling 的取舍

Output Parser 适合“模型只返回数据、应用随后消费”的场景；Tool Calling 适合模型需要从受控能力列表中提出动作的场景。两者都只能保证协议层结构，不能证明调用者有权限、资源存在或副作用可以执行。

## 9.5 与 Zod 和 LangChain.js 对应

真实项目可把 `validateLead()` 替换为 Zod Schema，并交给模型的 structured output 或 Tool 定义。仍应保留判别联合式错误、原始输出 Trace、一次以内的修复预算，以及 Schema 之后的业务权限校验。

# 十、总结

- **本篇定位**：这是结构化输出的进阶取舍篇。
- **核心拆解**：Output parser 适合轻量任务：模型输出文本后，后端按 schema 解析和校验。
- **落地建议**：工具调用参数必须再过业务校验。
- **常见坑**：只靠 prompt 说“不要输出多余内容”。
- **和已有主线的关系**：12 是结构化输出入门，28 是 Function Calling；
- **复述答法**：如果只是要稳定 JSON，优先 structured output；

## 参考资料

- [LangChain 文档](https://docs.langchain.com/oss/javascript/langchain/overview)
- [Dify 文档](https://docs.dify.ai/)
