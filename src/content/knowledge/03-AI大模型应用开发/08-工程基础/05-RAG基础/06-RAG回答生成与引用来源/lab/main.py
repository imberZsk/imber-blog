"""根据证据生成可引用、可拒答的 RAG 回答。"""

from __future__ import annotations

from dataclasses import dataclass

MIN_EVIDENCE_SCORE = 0.6


@dataclass(frozen=True, slots=True)
class Evidence:
    """表示带来源和相关性分数的检索结果。"""

    # 检索到的正文片段。
    text: str
    # 可追溯的文档与章节。
    source: str
    # 检索或重排分数。
    score: float


def generate_answer(question: str, evidence: list[Evidence]) -> dict[str, object]:
    """只使用达标证据回答；question 用于输出追踪，evidence 是候选资料。"""
    # 达到最低证据阈值的片段。
    usable_evidence = [item for item in evidence if item.score >= MIN_EVIDENCE_SCORE]
    if not usable_evidence:
        return {"question": question, "answer": "资料不足，无法回答。", "citations": []}
    # 最小示例直接抽取证据文本；真实系统会把证据交给模型总结。
    answer = "；".join(item.text for item in usable_evidence)
    # 引用只包含实际进入回答的片段来源。
    citations = [item.source for item in usable_evidence]
    return {"question": question, "answer": answer, "citations": citations}


def main() -> None:
    """运行有强证据和无证据两种问答。"""
    # 当前示例检索结果。
    evidence = [Evidence("报销需在30天内提交。", "employee-policy.md#报销", 0.91), Evidence("食堂菜单", "canteen.md", 0.2)]
    print(generate_answer("报销期限？", evidence))
    print(generate_answer("班车几点？", []))


if __name__ == "__main__":
    main()
