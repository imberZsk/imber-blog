"""用标准库复现 Runnable 管道、数据契约和 fallback。"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

# Runnable 状态使用字符串键到任意受控值的映射。
Payload = dict[str, Any]
# 单个管道步骤接收并返回 Payload。
Step = Callable[[Payload], Payload]


@dataclass(frozen=True, slots=True)
class Runnable:
    """包装一个具有统一输入输出协议的可调用步骤。"""

    # Trace 中显示的稳定步骤名称。
    name: str
    # 当前步骤实际执行的数据转换函数。
    step: Step

    def invoke(self, payload: Payload) -> Payload:
        """执行当前步骤；payload 是上游返回的完整状态。"""
        print(f"[{self.name}] input_keys={sorted(payload.keys())}")
        # 当前步骤返回的下游状态。
        result = self.step(payload)
        print(f"[{self.name}] output_keys={sorted(result.keys())}")
        return result

    def then(self, next_runnable: "Runnable") -> "Runnable":
        """组合两个步骤；next_runnable 接收当前步骤输出。"""
        def composed(payload: Payload) -> Payload:
            """依次执行两个 Runnable；payload 是组合链输入。"""
            # 当前 Runnable 产生的中间状态。
            intermediate_payload = self.invoke(payload)
            return next_runnable.invoke(intermediate_payload)

        return Runnable(name=f"{self.name} | {next_runnable.name}", step=composed)


def normalize(payload: Payload) -> Payload:
    """规范化问题；payload 必须包含字符串 question。"""
    # 上游提供的原始问题值。
    raw_question = payload.get("question")
    if not isinstance(raw_question, str) or not raw_question.strip():
        raise ValueError("question 必须是非空字符串")
    # 仅压缩空白、不改变业务实体的规范化问题。
    normalized_question = " ".join(raw_question.split())
    return {**payload, "question": normalized_question}


def retrieve(payload: Payload) -> Payload:
    """返回可复现证据；payload 包含已规范化 question。"""
    # 当前问题对应的教学检索证据。
    evidence = "[refund#1] 退款审核通过后三个工作日内到账。"
    return {**payload, "documents": [evidence]}


def render_answer(payload: Payload) -> Payload:
    """根据证据组装回答；payload 必须包含 documents。"""
    # 上游检索返回的结构化文档列表。
    documents = payload.get("documents")
    if not isinstance(documents, list) or not documents:
        raise ValueError("documents 必须是非空列表")
    # 最终回答保留证据编号以便回溯。
    answer = f"结论：{documents[0]}"
    return {**payload, "answer": answer}


def invoke_with_fallback(chain: Runnable, payload: Payload) -> Payload:
    """运行主链并返回可恢复错误；chain 是组合后的 Runnable。"""
    try:
        return chain.invoke(payload)
    except (TypeError, ValueError) as error:
        return {**payload, "status": "invalid_input", "error": str(error)}


def main() -> None:
    """运行正常输入和空问题 fallback 两条路径。"""
    # 负责问题规范化的 Runnable。
    normalize_runnable = Runnable("normalize", normalize)
    # 负责检索证据的 Runnable。
    retrieve_runnable = Runnable("retrieve", retrieve)
    # 负责输出回答的 Runnable。
    answer_runnable = Runnable("answer", render_answer)
    # 由三个稳定数据转换步骤组成的固定管道。
    chain = normalize_runnable.then(retrieve_runnable).then(answer_runnable)

    print("=== 场景 1：正常管道 ===")
    # 正常问题经过完整管道后的状态。
    success_result = invoke_with_fallback(chain, {"question": "退款   多久到账"})
    print("result:", success_result["answer"])

    print("\n=== 场景 2：输入契约失败后 fallback ===")
    # 空问题触发 fallback 后的可恢复错误状态。
    fallback_result = invoke_with_fallback(chain, {"question": "  "})
    print("result:", fallback_result)


if __name__ == "__main__":
    main()
