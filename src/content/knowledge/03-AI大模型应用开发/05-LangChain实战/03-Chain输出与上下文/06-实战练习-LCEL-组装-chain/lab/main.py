"""用标准库复现 LCEL RAG 固定管道和 Callback Trace。"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from time import perf_counter
from typing import Any

# 管道状态使用字符串键到受控值的映射。
Payload = dict[str, Any]
# LCEL 教学步骤接收并返回完整状态。
StageFunction = Callable[[Payload], Payload]


@dataclass(frozen=True, slots=True)
class TraceEvent:
    """保存一个链路步骤的可观测摘要。"""

    # 当前步骤的稳定名称。
    stage: str
    # 输入状态包含的字段名。
    input_keys: tuple[str, ...]
    # 输出状态包含的字段名。
    output_keys: tuple[str, ...]
    # 当前步骤消耗的毫秒数。
    duration_ms: float


@dataclass(slots=True)
class TraceCallback:
    """收集每个 LCEL 教学步骤的 Trace 事件。"""

    # 本次调用按执行顺序产生的事件列表。
    events: list[TraceEvent] = field(default_factory=list)

    def run(self, stage: str, function: StageFunction, payload: Payload) -> Payload:
        """执行并记录一个步骤；stage 是名称，function 是转换函数。"""
        # 当前步骤开始执行的单调时钟时间。
        started_at = perf_counter()
        # 当前步骤完成转换后的完整状态。
        result = function(payload)
        # 当前步骤消耗的毫秒数。
        duration_ms = (perf_counter() - started_at) * 1000
        self.events.append(
            TraceEvent(
                stage=stage,
                input_keys=tuple(sorted(payload.keys())),
                output_keys=tuple(sorted(result.keys())),
                duration_ms=duration_ms,
            )
        )
        return result


def retrieve(payload: Payload) -> Payload:
    """按问题召回证据；payload 必须包含 question。"""
    # 教学知识库中的稳定文档集合。
    documents = [
        {"id": "refund#1", "text": "退款审核通过后三个工作日内到账。"},
        {"id": "invoice#1", "text": "发票应在消费后七日内提交。"},
    ]
    # 用户当前提交的问题。
    question = str(payload.get("question", ""))
    # 根据领域关键词选择的召回文档。
    matched_documents = [document for document in documents if "退款" in question and "退款" in document["text"]]
    return {**payload, "documents": matched_documents}


def render_prompt(payload: Payload) -> Payload:
    """构造仅依据证据回答的 Prompt；payload 包含 documents。"""
    # Retriever 返回的结构化证据列表。
    documents = payload.get("documents", [])
    # 带来源编号的上下文文本。
    context = "\n".join(f"[{document['id']}] {document['text']}" for document in documents)
    # 最终交给模型的受控 Prompt。
    prompt = f"仅根据资料回答，不足则拒答。\n资料：{context}\n问题：{payload['question']}"
    return {**payload, "prompt": prompt}


def mock_model(payload: Payload) -> Payload:
    """模拟有证据才回答的模型；payload 包含 prompt 和 documents。"""
    # 当前 Prompt 中对应的召回文档。
    documents = payload.get("documents", [])
    # 模型返回的带引用原始文本。
    model_text = "退款将在三个工作日内到账。[refund#1]" if documents else "资料不足。"
    return {**payload, "model_text": model_text}


def parse_answer(payload: Payload) -> Payload:
    """拆分最终回答和引用；payload 包含模型原始文本。"""
    # 等待解析的模型文本。
    model_text = str(payload.get("model_text", ""))
    # 根据文本中真实出现的证据编号生成引用列表。
    citations = [document["id"] for document in payload.get("documents", []) if f"[{document['id']}]" in model_text]
    return {**payload, "answer": model_text, "citations": citations}


def main() -> None:
    """运行固定 RAG 链并输出 Callback Trace。"""
    # 本次调用共享的 Trace 收集器。
    callback = TraceCallback()
    # 链路初始输入状态。
    payload: Payload = {"question": "退款多久能到账？"}
    # 固定 LCEL 流水线中的名称和函数。
    stages: list[tuple[str, StageFunction]] = [
        ("retrieve", retrieve),
        ("prompt", render_prompt),
        ("model", mock_model),
        ("parser", parse_answer),
    ]

    for stage_name, stage_function in stages:
        payload = callback.run(stage_name, stage_function, payload)

    print("=== 最终结果 ===")
    print("answer:", payload["answer"])
    print("citations:", payload["citations"])
    print("retrieved_ids:", [document["id"] for document in payload["documents"]])
    print("\n=== Callback Trace ===")
    for event in callback.events:
        print(
            f"{event.stage:<8} input={list(event.input_keys)} "
            f"output={list(event.output_keys)} duration={event.duration_ms:.3f}ms"
        )


if __name__ == "__main__":
    main()
