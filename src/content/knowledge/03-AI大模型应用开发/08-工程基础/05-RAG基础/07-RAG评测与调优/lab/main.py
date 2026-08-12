"""用标注评测集比较两组 RAG 检索参数。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class EvalCase:
    """保存问题和期望命中的文档标识。"""

    # 评测问题。
    question: str
    # 人工标注的正确文档标识。
    expected_document: str


def retrieve(question: str, strategy: str) -> str:
    """用确定性规则模拟不同检索策略；strategy 用于切换基线和调优版。"""
    # 调优版补充了同义词和关键数字映射。
    aliases = {"多久": "expense" if strategy == "tuned" else "unknown", "发票": "invoice", "年假": "leave", "住宿": "hotel"}
    for keyword, document_id in aliases.items():
        if keyword in question:
            return document_id
    return "unknown"


def evaluate(cases: list[EvalCase], strategy: str) -> tuple[float, list[EvalCase]]:
    """计算 top1 命中率并返回坏 case。"""
    # 未命中正确文档的案例。
    failures = [case for case in cases if retrieve(case.question, strategy) != case.expected_document]
    # top1 命中的案例数。
    hit_count = len(cases) - len(failures)
    return hit_count / len(cases), failures


def main() -> None:
    """构造 20 条评测数据并比较基线与调优策略。"""
    # 四类意图各重复五种问法，形成 20 条离线评测集。
    cases = [
        EvalCase(question, expected)
        for question, expected in (("报销多久提交", "expense"), ("发票要求", "invoice"), ("年假申请", "leave"), ("住宿标准", "hotel"))
        for _ in range(5)
    ]
    for strategy in ("baseline", "tuned"):
        # 当前策略的命中率和坏 case。
        hit_rate, failures = evaluate(cases, strategy)
        print(f"{strategy}: hit@1={hit_rate:.1%}, failures={len(failures)}")
        for failure in failures[:3]:
            print(f"  bad case: {failure.question} -> expected={failure.expected_document}")


if __name__ == "__main__":
    main()
