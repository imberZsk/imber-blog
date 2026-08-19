# LangChain（08） - Memory：截断、总结、检索与生命周期


## Python 实现地图

Python 用 `list[BaseMessage]` 管理短期上下文：截断最近窗口、调用 ChatModel 总结，或把摘要存入 Milvus 并语义召回。LangGraph checkpointer 保存 thread 状态，长期记忆仍需 store、namespace 和生命周期。

```python runnable file=main.py title="Python Memory 截断" description="按最近消息条数保留上下文。"
messages = ["用户: A", "助手: B", "用户: C", "助手: D", "用户: E"]
print(messages[-3:])
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

```python
from dataclasses import dataclass

# 系统提示词和当前问题之外允许记忆占用的最大 Token。
MEMORY_TOKEN_BUDGET = 2400
# 长期记忆最多注入的条目数。
LONG_TERM_MEMORY_LIMIT = 6


@dataclass(frozen=True)
class MemoryItem:
    """保存一条可注入上下文的记忆及其估算成本。"""

    # 稳定的记忆主键。
    memory_id: str
    # 已去除敏感字段的记忆文本。
    text: str
    # 记忆估算 Token 数。
    token_count: int
    # 综合相关性、可信度和新鲜度后的分数。
    score: float


def select_memories(items: list[MemoryItem], budget: int = MEMORY_TOKEN_BUDGET) -> list[MemoryItem]:
    """在 Token 预算内按综合分数选择长期记忆。"""
    # 已选择记忆累计使用的 Token。
    used_tokens = 0
    # 最终允许注入模型的记忆列表。
    selected: list[MemoryItem] = []

    for item in sorted(items, key=lambda candidate: candidate.score, reverse=True):
        if len(selected) >= LONG_TERM_MEMORY_LIMIT:
            break
        if used_tokens + item.token_count > budget:
            continue
        selected.append(item)
        used_tokens += item.token_count

    return selected
```

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

- [LangGraph：Memory](https://docs.langchain.com/oss/python/langgraph/add-memory)
- [LangChain：Long-term memory](https://docs.langchain.com/oss/python/langchain/long-term-memory)
- [Redis：Agent memory](https://redis.io/docs/latest/develop/use-cases/agent-memory/)

# 九、动手实践：Memory 三策略与 Token 预算

这段实验不调用模型，直接把同一段历史依次经过**截断、摘要、长期记忆检索、预算选择**，便于观察四个动作各自解决什么问题。

## 9.1 在线运行


零依赖，Python 3.10+ 可运行。页面中的“运行”使用同一份 `main.py`，结果不是预先写死的截图。

## 9.2 重点观察

- 截断只保留最近消息，因此会丢掉早期约束。
- 滚动摘要保留目标和约束，但不冒充原始证据。
- 长期记忆只召回与当前问题相关、未失效且属于当前用户的条目。
- 最终上下文受预算约束，低分或超预算条目不会注入。

## 9.3 可运行源码：Agent Memory：截断、总结、检索与生命周期


### main.py

```python runnable file=main.py title="LangChain Memory 三策略" description="运行截断、滚动摘要、语义检索和 Token 预算组装，观察混合记忆如何恢复历史上下文。"
"""离线演示截断、摘要、检索和预算选择四个记忆动作。"""

from __future__ import annotations

from dataclasses import dataclass

# 最近消息窗口允许保留的消息数。
RECENT_MESSAGE_LIMIT = 4
# 最终记忆上下文允许占用的估算 Token 数。
MEMORY_TOKEN_BUDGET = 42


@dataclass(frozen=True, slots=True)
class MemoryItem:
    """保存一条长期记忆及其召回所需元数据。"""

    # 记忆所属的稳定用户标识。
    user_id: str
    # 可供检索和注入的原子记忆文本。
    text: str
    # 记忆当前是否仍然有效。
    active: bool
    # 来源可信度，明确陈述高于模型推断。
    confidence: float
    # 记忆的新鲜度分数。
    freshness: float


def estimate_tokens(text: str) -> int:
    """估算文本 Token；text 是等待注入的中英文文本。"""
    # 中文教学场景采用两字符约一个 Token 的可复现近似值。
    estimated_tokens = max(1, (len(text) + 1) // 2)
    return estimated_tokens


def truncate_history(messages: list[str]) -> list[str]:
    """保留最近消息窗口；messages 按时间正序排列。"""
    # 最近窗口用于控制会话历史的固定上限。
    recent_messages = messages[-RECENT_MESSAGE_LIMIT:]
    return recent_messages


def summarize_history(messages: list[str]) -> str:
    """生成结构化滚动摘要；messages 是被窗口淘汰的旧消息。"""
    # 是否出现语言偏好，用于保留早期稳定约束。
    prefers_chinese = any("中文" in message for message in messages)
    # 是否出现结论优先偏好，用于保留回答格式。
    wants_conclusion_first = any("结论" in message for message in messages)
    # 摘要字段只保存本实验明确识别出的约束。
    summary_parts: list[str] = []
    if prefers_chinese:
        summary_parts.append("回答语言=中文")
    if wants_conclusion_first:
        summary_parts.append("回答结构=先结论")
    return "；".join(summary_parts) or "无稳定约束"


def retrieve_memories(question: str, user_id: str, items: list[MemoryItem]) -> list[tuple[float, MemoryItem]]:
    """按权限、状态和关键词召回长期记忆；question 是当前问题。"""
    # 当前问题中的教学关键词集合。
    query_terms = {term for term in ("中文", "结论", "代码", "退款", "回答") if term in question}
    # 通过硬过滤和综合评分后的候选记忆。
    scored_items: list[tuple[float, MemoryItem]] = []

    for item in items:
        # 用户不匹配或已失效的记忆必须在打分前排除。
        if item.user_id != user_id or not item.active:
            continue
        # 当前记忆命中的查询关键词数量。
        matched_terms = sum(1 for term in query_terms if term in item.text)
        # 相关性、可信度和新鲜度共同决定最终分数。
        score = matched_terms * 0.6 + item.confidence * 0.25 + item.freshness * 0.15
        if matched_terms > 0:
            scored_items.append((score, item))

    return sorted(scored_items, key=lambda candidate: candidate[0], reverse=True)


def select_with_budget(candidates: list[tuple[float, MemoryItem]]) -> list[MemoryItem]:
    """在固定 Token 预算内选择候选；candidates 已按综合分数降序排列。"""
    # 已被选中并允许注入模型的记忆。
    selected_items: list[MemoryItem] = []
    # 当前选择结果累计占用的估算 Token。
    used_tokens = 0

    for _, item in candidates:
        # 当前候选记忆的估算 Token 成本。
        item_tokens = estimate_tokens(item.text)
        if used_tokens + item_tokens > MEMORY_TOKEN_BUDGET:
            continue
        selected_items.append(item)
        used_tokens += item_tokens

    return selected_items


def main() -> None:
    """运行同一问题的短期、摘要、检索和预算组装流程。"""
    # 当前会话按时间正序保存的消息历史。
    messages = [
        "user: 以后请用中文回答",
        "assistant: 好的",
        "user: 回答时先给结论",
        "assistant: 已记住",
        "user: 正在排查 RAG 引用错误",
        "assistant: 先检查召回证据",
        "user: 代码示例要能直接运行",
        "assistant: 明白",
    ]
    # 当前租户内已经完成权限解析的用户标识。
    current_user_id = "tenant-a:user-42"
    # 长期记忆库中的有效、失效和其他用户样例。
    memory_items = [
        MemoryItem(current_user_id, "回答默认使用中文并先给结论", True, 1.0, 0.95),
        MemoryItem(current_user_id, "代码示例优先使用 Python 3.10+", True, 0.95, 0.90),
        MemoryItem(current_user_id, "回答默认使用英文", False, 1.0, 0.30),
        MemoryItem("tenant-a:user-99", "回答必须隐藏引用来源", True, 1.0, 1.0),
    ]
    # 当前用户准备提交给模型的问题。
    question = "请按我的回答偏好给出一段可运行代码"
    # 固定窗口保留的最近消息。
    recent_messages = truncate_history(messages)
    # 被窗口淘汰的旧消息。
    archived_messages = messages[:-RECENT_MESSAGE_LIMIT]
    # 旧历史压缩出的滚动摘要。
    rolling_summary = summarize_history(archived_messages)
    # 经过权限、状态和相关性处理的召回候选。
    recalled_candidates = retrieve_memories(question, current_user_id, memory_items)
    # Token 预算内最终允许注入的记忆。
    selected_memories = select_with_budget(recalled_candidates)

    print("=== 1. 截断后的最近消息 ===")
    for message in recent_messages:
        print(message)
    print("\n=== 2. 被截断历史的滚动摘要 ===")
    print(rolling_summary)
    print("\n=== 3. 长期记忆召回（已过滤失效与其他用户） ===")
    for score, item in recalled_candidates:
        print(f"score={score:.2f} tokens≈{estimate_tokens(item.text)} | {item.text}")
    print(f"\n=== 4. Token 预算内上下文（budget={MEMORY_TOKEN_BUDGET}） ===")
    print(f"summary: {rolling_summary}")
    for item in selected_memories:
        print(f"memory: {item.text}")
    print(f"recent_messages: {len(recent_messages)} 条")


if __name__ == "__main__":
    main()
```

## 参考资料

- [LangGraph Memory](https://docs.langchain.com/oss/python/langgraph/add-memory)
- [Mem0 文档](https://docs.mem0.ai/)
