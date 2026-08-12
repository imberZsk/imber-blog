"""实现带 token 成本统计的 LRU 问答缓存。"""

from __future__ import annotations

from collections import OrderedDict

CACHE_CAPACITY = 3
COST_PER_1K_TOKENS = 0.01


class CachedChatService:
    """管理 LRU 缓存和成本指标。"""

    def __init__(self) -> None:
        """初始化空缓存与累计指标。"""
        # 问题到回答的 LRU 有序映射。
        self.cache: OrderedDict[str, str] = OrderedDict()
        # 真正调用模型产生的 token 数。
        self.billed_tokens = 0
        # 缓存命中避免消耗的 token 估算。
        self.saved_tokens = 0

    def ask(self, question: str) -> tuple[str, bool]:
        """返回回答和是否命中缓存；question 是归一化前问题。"""
        # 去空白并统一大小写的缓存键。
        cache_key = " ".join(question.lower().split())
        # 当前问题的近似 token 消耗。
        token_count = max(10, len(cache_key) * 2)
        if cache_key in self.cache:
            self.cache.move_to_end(cache_key)
            self.saved_tokens += token_count
            return self.cache[cache_key], True
        # 离线模型生成的确定性回答。
        answer = f"回答：{question}"
        self.billed_tokens += token_count
        self.cache[cache_key] = answer
        if len(self.cache) > CACHE_CAPACITY:
            # 淘汰最久未访问的缓存项。
            evicted_key, _ = self.cache.popitem(last=False)
            print(f"LRU 淘汰：{evicted_key}")
        return answer, False


def main() -> None:
    """运行重复请求并打印实际成本与节省。"""
    # 当前演示服务。
    service = CachedChatService()
    # 重复和超容量请求用于触发命中与淘汰。
    questions = ["报销期限", "年假规则", "报销期限", "住宿标准", "发票要求", "年假规则"]
    for question in questions:
        # 当前请求的回答和缓存状态。
        answer, cache_hit = service.ask(question)
        print(f"{question}: {'HIT' if cache_hit else 'MISS'} -> {answer}")
    print(f"计费 token={service.billed_tokens}，节省 token={service.saved_tokens}，实际成本=${service.billed_tokens / 1000 * COST_PER_1K_TOKENS:.6f}")


if __name__ == "__main__":
    main()
