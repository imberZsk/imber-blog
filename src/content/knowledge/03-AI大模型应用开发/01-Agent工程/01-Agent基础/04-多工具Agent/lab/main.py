"""用工具注册表和意图路由实现多工具 Agent。"""

from __future__ import annotations

from collections.abc import Callable

Tool = Callable[[str], str]


def search_policy(question: str) -> str:
    """查询制度；question 是用户原始问题。"""
    return "报销需在 30 天内提交。"


def query_order(question: str) -> str:
    """查询订单；question 中应包含订单语义。"""
    return "订单 A100 已发货。"


def create_ticket(question: str) -> str:
    """创建人工工单；question 会作为工单摘要。"""
    return f"已创建工单：{question[:20]}"


def route_intent(question: str) -> str:
    """把问题映射到注册表工具名。"""
    if "订单" in question:
        return "query_order"
    if "报销" in question or "制度" in question:
        return "search_policy"
    return "create_ticket"


def main() -> None:
    """用统一分发逻辑调用三个工具。"""
    # 工具名到可执行函数的注册表。
    tool_registry: dict[str, Tool] = {"search_policy": search_policy, "query_order": query_order, "create_ticket": create_ticket}
    # 三类意图的示例问题。
    questions = ["报销期限？", "订单 A100 到哪了？", "我要投诉"]
    for question in questions:
        # 路由器选出的工具名。
        tool_name = route_intent(question)
        # 只有注册表中的工具才能被执行。
        result = tool_registry[tool_name](question)
        print(f"问题={question} 工具={tool_name} 结果={result}")


if __name__ == "__main__":
    main()
