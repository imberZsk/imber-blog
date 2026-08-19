# LangChain（10） - 实战练习 LCEL 组装 chain


## Python 实现地图

Python 用 `prompt | model | parser` 组成 LCEL，用 `RunnablePassthrough.assign()` 添加上下文，并通过 `with_config()` 传递 tags 与 metadata。

```python runnable file=main.py title="Python 本篇最小实验" description="运行本篇 Python 核心数据流。"
context = ["证据 A", "证据 B"]
print({"question": "什么是 LCEL？", "context": "\n".join(context)})
```


> 读完后，你应能完成以下任务：
> - 绘制“LangChain（15） - 实战练习 LCEL 组装 chain / 本篇定位”的关键对象与数据流，解释“这是 LangChain 实战练习篇，重点练固定流程的组件串联。”，并用源码位置、日志或 Trace 标注证据。
> - 为“LangChain（15） - 实战练习 LCEL 组装 chain / 核心拆解”设计正常与异常输入，验证“LCEL 适合固定流程。”，输出首个偏差位置与回归测试结果。
> - 实现“LangChain（15） - 实战练习 LCEL 组装 chain / 工程链路”的最小代码或配置，检验“定义输入 question。”，输出命令、结果与 Diff，并说明不适用边界。

# 一、实战练习 LCEL 组装 chain的学习定位与边界

这是 LangChain 实战练习篇，重点练固定流程的组件串联。

# 二、实战练习 LCEL 组装 chain的真实应用场景

一个最小 RAG chain 可以是：输入问题 → 检索文档 → 渲染 prompt → 调模型 → 解析输出。这个流程没有循环和动态分支，用 chain 表达非常自然。只要你把每步的数据结构对齐，整个链就像一条清晰流水线。

# 三、实战练习 LCEL 组装 chain的核心对象与机制

- LCEL 适合固定流程。它让你把“先检索、再提示词、再模型、再解析”写成可读的组合。
- RAG chain 的关键不是代码有多短，而是每一步都能单独替换和测试。Retriever、Prompt、LLM、Parser 都应该能独立跑。
- 一旦流程需要“检索失败就改写再检索”“工具失败就换策略”这种回路，chain 就开始吃力，需要 LangGraph。

# 四、实战练习 LCEL 组装 chain的工程链路

- 定义输入 question。
- Retriever 返回 documents。
- PromptTemplate 把 question 和 documents 渲染成 prompt。
- LLM 生成回答。
- Parser 校验格式并输出 answer、citations。

# 五、实战练习 LCEL 组装 chain的落地建议

- 先用 mock retriever 和 mock llm 验证数据流。
- 链路中间结果要能打印，便于定位坏 case。
- 回答和引用分开输出，引用不要让模型编。

# 六、实战练习 LCEL 组装 chain的常见故障与误区

- 把所有逻辑塞进一个 chain，没人看得懂。
- 遇到条件分支仍强行用三元表达式拼。
- 不记录中间 documents，答错时无法判断是检索还是生成问题。

# 七、实战练习 LCEL 组装 chain在学习路线中的位置

67 讲 Runnable，本篇练固定 RAG chain；75 和 76 会处理 chain 不擅长的循环与分支。

# 八、实战练习 LCEL 组装 chain的核心结论

> LCEL 适合固定流水线，比如 RAG 的检索、prompt、模型、解析。每步要独立可测，并保留中间结果。只要出现循环、回退、动态决策，就该考虑 LangGraph，而不是继续把 chain 写复杂。

# 九、动手实践：LCEL RAG 与 Callback Trace

把固定 RAG 流程拆成 `retrieve → prompt → model → parser` 四个可测试步骤，并通过 Callback 记录每一步的输入字段、输出字段和耗时。

## 9.1 在线运行


零依赖，Python 3.10+ 可运行。真实 LangChain 中可替换为 `RunnableParallel`、`PromptTemplate`、模型 Runnable、Parser 和 LangSmith/LangFuse Callback，数据契约保持一致。

## 9.2 重点观察

- Trace 同时保留召回证据和最终引用，答错时能区分检索问题与生成问题。
- 固定流水线适合 LCEL；需要重试环路或人工审批时应切换 LangGraph。

## 9.3 可运行源码：实战练习 LCEL 组装 chain


### main.py

```python
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
```

# 十、总结

- **本篇定位**：这是 LangChain 实战练习篇，重点练固定流程的组件串联。
- **工程链路**：定义输入 question。
- **落地建议**：先用 mock retriever 和 mock llm 验证数据流。
- **常见坑**：不记录中间 documents，答错时无法判断是检索还是生成问题。
- **复述答法**：LCEL 适合固定流水线，比如 RAG 的检索、prompt、模型、解析。

## 参考资料

- [LangChain 文档](https://docs.langchain.com/oss/python/langchain/overview)
- [Dify 文档](https://docs.dify.ai/)
