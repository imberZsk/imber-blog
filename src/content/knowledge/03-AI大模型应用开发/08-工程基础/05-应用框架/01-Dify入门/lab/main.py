"""用标准库模拟 Dify Workflow 节点串联。"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

Node = Callable[[dict[str, Any]], dict[str, Any]]


def input_node(state: dict[str, Any]) -> dict[str, Any]:
    """校验工作流输入。"""
    if not str(state.get("question", "")).strip():
        raise ValueError("question_required")
    return state


def knowledge_node(state: dict[str, Any]) -> dict[str, Any]:
    """模拟知识库检索节点。"""
    # 当前问题检索到的证据。
    evidence = "报销需在30天内提交" if "报销" in state["question"] else None
    return {**state, "evidence": evidence}


def condition_node(state: dict[str, Any]) -> dict[str, Any]:
    """根据证据决定回答或拒答。"""
    # 最终工作流输出。
    answer = f"根据资料：{state['evidence']}" if state.get("evidence") else "资料不足，无法回答。"
    return {**state, "answer": answer}


def run_workflow(question: str) -> dict[str, Any]:
    """按可视化节点顺序运行工作流。"""
    # Dify 画布中从开始到结束的节点列表。
    nodes: list[Node] = [input_node, knowledge_node, condition_node]
    # 节点间共享的变量集合。
    state: dict[str, Any] = {"question": question}
    for node in nodes:
        state = node(state)
        print(f"node={node.__name__} outputs={state}")
    return state


def main() -> None:
    """运行命中和拒答两条分支。"""
    run_workflow("报销期限？")
    run_workflow("食堂菜单？")


if __name__ == "__main__":
    main()
