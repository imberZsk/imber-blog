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
