"""演示 AI 应用中常见 Python 数据结构的职责。"""

from __future__ import annotations


def main() -> None:
    """构造消息、知识、工具和引用，并打印各结构的使用结果。"""
    # list 保留有顺序且可重复的会话消息。
    messages = [{"role": "user", "content": "报销期限？"}, {"role": "assistant", "content": "30 天。"}]
    # dict 通过稳定键快速定位知识内容。
    knowledge = {"expense_deadline": "费用发生后 30 天内提交"}
    # tuple 表示不应被运行时修改的工具描述。
    tools = (("search_policy", "查询制度"), ("create_ticket", "创建工单"))
    # set 对重复引用来源自动去重。
    citations = {"employee-policy.md#报销", "employee-policy.md#报销", "travel-policy.md#住宿"}

    print(f"消息顺序: {[message['role'] for message in messages]}")
    print(f"按键取知识: {knowledge['expense_deadline']}")
    print(f"工具不可变配置: {tools}")
    print(f"引用去重后: {sorted(citations)}")


if __name__ == "__main__":
    main()
