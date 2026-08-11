"""用标准库实现带条件边和循环的最小状态图。"""

from __future__ import annotations

from dataclasses import dataclass

MAX_REWRITES = 2


@dataclass(slots=True)
class State:
    """保存各节点共享的图状态。"""

    # 当前检索问题，可能被重写。
    question: str
    # 最近一次检索结果。
    evidence: str | None = None
    # 已发生的问题重写次数。
    rewrite_count: int = 0
    # 最终回答。
    answer: str | None = None


def retrieve(state: State) -> str:
    """执行检索节点并返回下一节点名称。"""
    state.evidence = "报销需在 30 天内提交。" if "报销" in state.question else None
    return "generate" if state.evidence else "rewrite"


def rewrite(state: State) -> str:
    """重写问题并决定循环或结束。"""
    state.rewrite_count += 1
    if state.rewrite_count > MAX_REWRITES:
        state.answer = "多次检索无结果，转人工。"
        return "end"
    state.question = state.question.replace("费用申请", "报销")
    return "retrieve"


def generate(state: State) -> str:
    """使用证据生成最终回答。"""
    state.answer = f"根据资料：{state.evidence}"
    return "end"


def run_graph(state: State) -> State:
    """从 retrieve 开始沿条件边运行到 end。"""
    # 节点名到节点函数的注册表。
    nodes = {"retrieve": retrieve, "rewrite": rewrite, "generate": generate}
    # 当前准备执行的节点名。
    current_node = "retrieve"
    while current_node != "end":
        print(f"node={current_node} state={state}")
        current_node = nodes[current_node](state)
    return state


def main() -> None:
    """运行一次需要重写后才能命中的图。"""
    print("final:", run_graph(State("费用申请多久提交？")))


if __name__ == "__main__":
    main()
