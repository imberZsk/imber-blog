# LangChain（08） - Memory：截断、总结、检索与生命周期

## TypeScript 实现地图

TypeScript 用 `BaseMessage[]` 管理短期上下文：按条数或 Token 截断，调用 ChatModel 生成摘要，或把摘要写入 Milvus 后用 Retriever 召回。LangGraph checkpointer 保存线程状态，长期语义记忆仍需 store、租户键和过期策略。

```typescript runnable file=main.ts title="TypeScript Memory 截断" description="按最近消息条数保留上下文。"
const messages = ['用户: A', '助手: B', '用户: C', '助手: D', '用户: E']
console.log(messages.slice(-3))
```



> 读完后，你应能完成以下任务：
> - 绘制“LangChain（08） - Memory：截断、总结、检索与生命周期 / 模型本身没有会话记忆”的关键对象与数据流，解释“所谓记忆是应用完成的保存、选择、压缩、注入。”，并用源码位置、日志或 Trace 标注证据。
> - 为“LangChain（08） - Memory：截断、总结、检索与生命周期 / 三种策略的真实边界”设计正常与异常输入，验证“截断、总结、检索分别解决上下文预算、历史压缩和跨会话召回问题。”，输出首个偏差位置与回归测试结果。
> - 实现“LangChain（08） - Memory：截断、总结、检索与生命周期 / 混合记忆”的最小代码或配置，检验“滚动摘要与 Milvus 语义检索可以共同恢复历史上下文。”，输出命令、结果与 Diff，并说明不适用边界。

> 更新日期：2026/08/11

# 一、模型本身没有会话记忆

LLM 每次调用只看到应用传入的上下文。所谓“记忆”是应用完成的四件事：保存、选择、压缩、注入。把全部聊天记录原样追加不是记忆系统，只是一个最终会超长、变贵并引入噪声的数组。

先按生命周期分层：

| 层级 | 典型内容 | 主键 | 保留策略 |
| --- | --- | --- | --- |
| 工作状态 | 当前计划、工具结果、待审批动作 | `thread_id` | 分钟到小时，TTL |
| 短期会话 | 最近消息、滚动摘要 | `thread_id` | 会话级，允许重建 |
| 长期语义 | 用户明确偏好、稳定事实 | `user_id + namespace` | 跨会话，可修改删除 |
| 情节记忆 | 某次任务发生了什么 | `user_id + event_time` | 衰减、合并或归档 |
| 审计日志 | 工具调用、审批和外部写操作 | `trace_id` | 按合规要求，不注入 Prompt |

审计日志不等于模型记忆。它可以永久留存以追责，但通常不应整段进入上下文。

# 二、三种策略的真实边界

## 2.1 截断

保留最近 N 条或最近一段 Token。它便宜、确定，但可能删掉第一轮的关键约束。截断时要保留完整消息对和工具调用对，不能留下孤立的 tool result。

## 2.2 检索

把长期事实拆成可检索条目，只在相关问题出现时召回。它能跨会话工作，但必须处理权限、过期、冲突、删除和写入质量。向量相似不等于事实仍有效。

## 2.3 总结

总结是在上下文接近上限时调用模型，把一段旧消息压缩成结构化摘要，然后删除或归档原始消息。摘要至少要保留目标、已确认约束、已经完成的步骤、未决问题、覆盖到的消息 ID 和版本号；否则后续无法判断摘要漏掉了什么。

Cursor 一类聊天应用常见的做法就是：当历史消息超过 Token 阈值时触发滚动总结，保留最近几轮原始消息，把更早的消息替换成摘要。总结不是无损压缩，涉及精确参数、原始证据或工具调用结果时仍要保留可回溯的消息 ID。

## 2.4 总结加检索

更稳妥的方案是“短期窗口 + 滚动摘要 + 长期语义检索”：最近消息保证当前指代，摘要保存主线，向量库保存可按问题召回的历史片段或摘要。可以在 Milvus 中存储 `thread_id`、`user_id`、`summary_version`、`source_message_ids`、`embedding` 和摘要正文，再用当前问题生成查询向量，先按权限过滤，再取 Top K。

这不是把所有历史重新塞回 Prompt。检索结果仍需要 Token 预算、时间有效性和冲突处理；被新摘要覆盖的旧向量应标记失效或删除，避免模型同时看到互相矛盾的版本。

# 三、按预算组装上下文


综合分数不能只看余弦相似度，可按业务定义为：

`相关性 × 可信度 × 新鲜度 × 权限可见性`

权限不可见应直接过滤为零；明确事实的可信度高于模型推测；被新事实覆盖的旧记忆应标记失效，而不是同时注入让模型自行裁决。

# 四、写入长期记忆的闸门

候选事实进入长期库前逐项判断：

1. 用户是否明确表达，而非模型推断。
2. 未来会不会复用，临时任务状态不应长期保存。
3. 是否包含密码、Token、证件号等禁止持久化信息。
4. 是否与现有事实重复或冲突。
5. 是否能提供来源时间和删除入口。

“我以后都要中文回答”可以保存为偏好；“帮我把这段临时翻成英文”不能反推出用户永久偏好英文。

# 五、摘要的数据契约

不要只存一段自然语言，至少保存：

```json
{
  "thread_id": "thread-42",
  "summary_version": 3,
  "covered_until_message_id": "msg-180",
  "goal": "排查支付回调重复入账",
  "confirmed_constraints": ["不能修改历史订单"],
  "completed_steps": ["确认回调存在重试"],
  "open_questions": ["幂等键是否跨租户唯一"],
  "source_message_ids": ["msg-001", "msg-180"]
}
```

这样才能增量更新、回溯来源和检测摘要遗漏。原始消息的留存期限可以与摘要不同，但删除策略要在产品和合规层明确。

# 六、验收指标

- **记忆命中率**：需要的记忆是否进入上下文。
- **错误注入率**：无关、过期或冲突记忆被注入的比例。
- **压缩保真率**：摘要是否保留标注的关键事实。
- **Token 节省率**：相对全历史输入节省多少上下文。
- **删除传播时延**：用户删除后，缓存、向量索引和副本多久不可检索。
- **跨用户泄漏率**：必须为零，使用自动化权限用例持续验证。

# 七、常见错误

- 无限追加 messages，直到请求超出上下文窗口。
- 把所有对话摘要都永久保存，既污染召回又增加隐私风险。
- 只更新结构化记录，不删除旧向量，导致旧偏好仍能被召回。
- 把工具返回原文写入长期记忆，敏感字段和 Prompt Injection 一并持久化。
- 用“回答看起来正常”代替记忆命中、冲突、删除和权限测试。

# 八、总结

- **模型本身没有会话记忆**：所谓“记忆”是应用完成的四件事：保存、选择、压缩、注入。
- **三种策略的真实边界**：截断时要保留完整消息对和工具调用对，不能留下孤立的 tool result。
- **按预算组装上下文**：被新事实覆盖的旧记忆应标记失效，而不是同时注入让模型自行裁决。
- **写入长期记忆的闸门**：用户是否明确表达，而非模型推断。 -> 未来会不会复用，临时任务状态不应长期保存。 -> 是否包含密码、Token、证件号等禁止持久化信息。 -> 是否与现有事实重复或冲突。
- **验收指标**：记忆命中率：需要的记忆是否进入上下文。
- **常见错误**：把所有对话摘要都永久保存，既污染召回又增加隐私风险。

## 参考资料

- [LangGraph：Memory](https://docs.langchain.com/oss/javascript/langgraph/add-memory)
- [LangChain：Long-term memory](https://docs.langchain.com/oss/javascript/langchain/long-term-memory)
- [Redis：Agent memory](https://redis.io/docs/latest/develop/use-cases/agent-memory/)

# 九、动手实践：Memory 三策略与 Token 预算

这段实验不调用模型，直接把同一段历史依次经过**截断、摘要、长期记忆检索、预算选择**，便于观察四个动作各自解决什么问题。

## 9.1 在线运行


零依赖，TypeScript 5+ 可运行。页面中的“运行”使用同一份 `main.ts`，结果不是预先写死的截图。

## 9.2 重点观察

- 截断只保留最近消息，因此会丢掉早期约束。
- 滚动摘要保留目标和约束，但不冒充原始证据。
- 长期记忆只召回与当前问题相关、未失效且属于当前用户的条目。
- 最终上下文受预算约束，低分或超预算条目不会注入。

## 9.3 可运行源码：Agent Memory：截断、总结、检索与生命周期


### main.ts

```typescript runnable file=main.ts title="TypeScript Memory 三种策略" description="比较截断、滚动摘要和语义检索对上下文的影响。"
/** 单条对话消息。 */
interface ChatMessage {
  role: 'human' | 'ai'
  content: string
}

/** 可长期召回的对话记忆。 */
interface MemoryRecord {
  id: string
  summary: string
  keywords: string[]
}

/** 最近对话窗口允许保留的消息数量。 */
const MAX_RECENT_MESSAGES = 3
/** 当前会话中的完整消息序列。 */
const messages: ChatMessage[] = [
  { role: 'human', content: '项目使用 Milvus 保存长期记忆' },
  { role: 'ai', content: '我会保留这个架构约束' },
  { role: 'human', content: '回答必须包含引用来源' },
  { role: 'ai', content: '后续回答会附带来源' },
  { role: 'human', content: '继续设计 Memory 检索流程' }
]

/** 超出窗口后保留的滚动摘要。 */
const conversationSummary = '用户使用 Milvus 保存长期记忆，并要求回答包含引用来源。'
/** 模拟从 Milvus 读取的长期记忆条目。 */
const memoryRecords: MemoryRecord[] = [
  { id: 'memory-architecture', summary: '长期记忆存储在 Milvus', keywords: ['memory', 'milvus', '检索'] },
  { id: 'memory-format', summary: '回答必须包含引用来源', keywords: ['回答', '引用', '来源'] },
  { id: 'memory-unrelated', summary: '用户喜欢深色主题', keywords: ['主题', '颜色'] }
]

/**
 * 只保留最近的消息窗口。
 * @param history 当前会话全部消息。
 * @returns 不超过窗口上限的消息。
 */
function truncateMessages(history: ChatMessage[]): ChatMessage[] {
  return history.slice(-MAX_RECENT_MESSAGES)
}

/**
 * 根据查询关键词召回长期记忆。
 * @param query 当前用户问题。
 * @param records 当前用户可访问的长期记忆。
 * @returns 至少命中一个查询词的记忆。
 */
function retrieveMemories(query: string, records: MemoryRecord[]): MemoryRecord[] {
  /** 标准化后的查询文本。 */
  const normalizedQuery = query.toLowerCase()
  return records.filter((record) => record.keywords.some((keyword) => normalizedQuery.includes(keyword)))
}

/** 当前用户准备继续讨论的问题。 */
const query = '继续设计 Milvus memory 检索流程'
/** 截断策略保留的最近消息。 */
const recentMessages = truncateMessages(messages)
/** 检索策略找回的相关长期记忆。 */
const recalledMemories = retrieveMemories(query, memoryRecords)

console.log('summary:', conversationSummary)
console.log('recent:', recentMessages.map((message) => `${message.role}:${message.content}`))
console.log('recalled:', recalledMemories.map((memory) => `${memory.id}:${memory.summary}`))
```

这个结果刻意把三种职责分开：截断控制最近消息体积，摘要压缩已经离开窗口的关键约束，检索只按当前话题召回长期记忆。真实 Agent 可以把摘要和记忆写入 Milvus，但仍要携带 `user_id`、版本、有效期和来源消息 ID。

## 参考资料

- [LangGraph Memory](https://docs.langchain.com/oss/javascript/langgraph/add-memory)
- [Mem0 文档](https://docs.mem0.ai/)
