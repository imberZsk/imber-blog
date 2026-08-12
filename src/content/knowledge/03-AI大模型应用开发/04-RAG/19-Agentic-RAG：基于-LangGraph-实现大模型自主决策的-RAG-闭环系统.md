# RAG（19） - Agentic RAG：基于 LangGraph 实现大模型自主决策的 RAG 闭环系统

> 读完你能：理解 Agentic RAG 如何让系统自己判断是否检索、改写、重试、拒答。

# 一、本篇定位

这是 RAG 和 LangGraph 的融合篇，重点在闭环决策而不是一次检索。

# 二、一个真实场景

普通 RAG 是用户一问就检索，然后回答。Agentic RAG 会多想一步：这个问题需要检索吗？检索结果够好吗？不够要不要改写 query？是不是应该换关键词检索？证据不足是否拒答？这些判断构成一个闭环。

# 三、核心拆解

- Agentic RAG 把 RAG 的步骤拆成图节点：路由、检索、评估、改写、回答、拒答。
- 评估节点很关键。它判断当前证据是否足够回答问题，避免把弱证据硬塞给模型。
- 闭环必须有次数限制。改写检索可以提高命中率，但无限重试会烧 token 和延迟。

# 四、工程链路

- 判断问题是否需要知识库。
- 检索候选证据。
- 评估证据相关性和覆盖度。
- 不够则改写 query 后重试。
- 足够则生成带引用答案。
- 多次失败则拒答或转人工。

# 五、落地建议

- 评估节点可先用规则和分数阈值，再逐步引入 LLM 判断。
- 改写 query 要保留原始问题，避免越改越偏。
- 每轮检索都记录 query、hits、score 和决策原因。

# 六、常见坑

- 把 Agentic RAG 当成“多检索几次”。
- 没有证据评估，闭环只是绕远路。
- 改写 query 后丢失用户原意。

# 七、和已有主线的关系

26 讲 RAG 评测，36/75 讲 LangGraph；76 把它们组合成可自我修正的 RAG 闭环。

# 八、复述答法

> Agentic RAG 是把检索、评估、改写、回答、拒答做成状态图。它会判断证据是否足够，不够就有限次改写重试，仍不够就拒答。核心是证据评估和停止条件，而不是无脑多搜几轮。

# 九、总结

- **核心拆解**：Agentic RAG 把 RAG 的步骤拆成图节点：路由、检索、评估、改写、回答、拒答。
- **工程链路**：不够则改写 query 后重试。
- **常见坑**：把 Agentic RAG 当成“多检索几次”。
- **本篇定位**：这是 RAG 和 LangGraph 的融合篇，重点在闭环决策而不是一次检索。

## 十、最小可运行示例：LangGraph 检索闭环

~~~text
# requirements.txt
langgraph
typing-extensions
~~~

~~~python
from __future__ import annotations

from typing import Literal

from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict


# 最多允许改写并重新检索的次数。
MAX_RETRIEVAL_ATTEMPTS = 2


class RagState(TypedDict):
    """定义图中每个节点共享的状态。"""

    question: str
    evidence: list[str]
    attempts: int
    answer: str


def retrieve(state: RagState) -> dict[str, object]:
    """执行教学检索；state 包含问题和尝试次数。"""

    # 第二次检索模拟改写后获得证据。
    evidence = [] if state["attempts"] == 0 else ["[refund#1] 退款三日到账"]
    return {"evidence": evidence, "attempts": state["attempts"] + 1}


def route_after_retrieval(state: RagState) -> Literal["rewrite", "answer"]:
    """根据证据和次数选择改写或回答。"""

    if not state["evidence"] and state["attempts"] < MAX_RETRIEVAL_ATTEMPTS:
        return "rewrite"
    return "answer"


def rewrite(state: RagState) -> dict[str, str]:
    """保留业务实体并扩展问题；state 是当前图状态。"""

    return {"question": state["question"] + " 到账时间"}


def answer(state: RagState) -> dict[str, str]:
    """基于证据回答或拒答；state 包含最终候选。"""

    return {"answer": state["evidence"][0] if state["evidence"] else "资料不足"}


# 图显式声明循环与终止条件。
builder = StateGraph(RagState)
builder.add_node("retrieve", retrieve)
builder.add_node("rewrite", rewrite)
builder.add_node("answer", answer)
builder.add_edge(START, "retrieve")
builder.add_conditional_edges("retrieve", route_after_retrieval)
builder.add_edge("rewrite", "retrieve")
builder.add_edge("answer", END)
# 编译结果可加入 checkpointer 支持暂停恢复。
graph = builder.compile()
print(graph.invoke({"question": "退款多久", "evidence": [], "attempts": 0, "answer": ""}))
~~~

生产图还要限制总步数、总 Token 和工具预算，并在写操作前增加 HIL 节点。每个节点只返回状态增量，便于持久化和回放。

<!-- knowledge-lab-merged -->

# 动手实践：Agentic RAG 自纠错闭环

用显式状态图模拟 `route → retrieve → grade → rewrite → answer/refuse`。实验同时运行“改写后命中”和“达到上限仍无证据”两个场景。

## 在线运行

直接使用本文“可运行源码”中的沙盒执行；源码、复制内容和实际运行入口保持一致。

零依赖，Python 3.10+ 可运行。真实 LangGraph 会负责节点注册、条件边和 Checkpoint；这个实验保留相同状态与停止条件，便于先理解执行轨迹。

## 重点观察

- 原始问题始终保留，改写只更新 `search_query`。
- 证据评分低于阈值才允许有限次改写。
- 达到上限仍无证据时明确拒答，不把弱证据交给生成节点。

## 可运行源码：Agentic RAG：基于 LangGraph 实现大模型自主决策的 RAG 闭环系统

下方代码就是在线沙盒实际执行的完整源码。可直接运行、查看输出或复制到本地，页面不再依赖文章外的重复脚本。

### `main.py`

```python
"""离线演示 Agentic RAG 的评估、改写、有限重试和拒答。"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

# 证据进入回答节点需要达到的最低分数。
EVIDENCE_SCORE_THRESHOLD = 0.70
# 闭环允许执行的最大检索次数。
MAX_RETRIEVAL_ATTEMPTS = 2


@dataclass(frozen=True, slots=True)
class Document:
    """保存可检索文档及其稳定来源编号。"""

    # 回答引用使用的稳定文档编号。
    document_id: str
    # 文档可被关键词检索的正文。
    text: str


@dataclass(slots=True)
class RagState:
    """保存 Agentic RAG 各节点共享的受控状态。"""

    # 用户提交且永不被改写覆盖的原始问题。
    original_question: str
    # 当前检索节点使用的 Query。
    search_query: str
    # 最近一次检索返回的候选证据。
    evidence: list[Document] = field(default_factory=list)
    # 证据评估节点计算的覆盖分数。
    evidence_score: float = 0.0
    # 当前已经执行的检索次数。
    attempts: int = 0
    # 最终回答或拒答说明。
    answer: str = ""
    # 图节点按顺序写入的可观测轨迹。
    trace: list[str] = field(default_factory=list)


def retrieve(state: RagState, knowledge_base: list[Document]) -> None:
    """按当前 Query 执行确定性关键词检索。"""
    state.attempts += 1
    # 当前检索 Query 必须同时包含的知识库关键词。
    required_terms = [term for term in ("退款", "到账", "发票", "密码", "多久") if term in state.search_query]
    # 同时覆盖全部 Query 关键词的候选文档。
    state.evidence = [
        document for document in knowledge_base if required_terms and all(term in document.text for term in required_terms)
    ]
    state.trace.append(f"retrieve#{state.attempts}:query={state.search_query}:hits={len(state.evidence)}")


def grade_evidence(state: RagState) -> None:
    """按原始问题的实体覆盖度评估证据。"""
    if not state.evidence:
        state.evidence_score = 0.0
    else:
        # 原始问题中必须由证据覆盖的领域词。
        question_terms = [term for term in ("退款", "到账", "发票", "密码") if term in state.original_question]
        # 最佳候选证据的正文。
        evidence_text = state.evidence[0].text
        # 证据覆盖的原始问题领域词数量。
        covered_terms = sum(1 for term in question_terms if term in evidence_text)
        state.evidence_score = covered_terms / max(1, len(question_terms))
    state.trace.append(f"grade:score={state.evidence_score:.2f}")


def route_after_grade(state: RagState) -> Literal["rewrite", "answer", "refuse"]:
    """根据证据分数和尝试上限选择下一节点。"""
    if state.evidence_score >= EVIDENCE_SCORE_THRESHOLD:
        return "answer"
    if state.attempts < MAX_RETRIEVAL_ATTEMPTS:
        return "rewrite"
    return "refuse"


def rewrite_query(state: RagState) -> None:
    """保留原始问题并扩展检索 Query。"""
    # 只对已知口语表达执行受控扩展后的 Query。
    rewritten_query = state.search_query.replace("多久", "到账")
    if rewritten_query == state.search_query:
        rewritten_query = f"{state.search_query} 官方政策"
    state.search_query = rewritten_query
    state.trace.append(f"rewrite:{state.search_query}")


def generate_answer(state: RagState) -> None:
    """只使用达到阈值的证据生成带引用回答。"""
    # 评分通过后用于回答的最佳证据。
    document = state.evidence[0]
    state.answer = f"{document.text} [{document.document_id}]"
    state.trace.append("answer:grounded")


def refuse_answer(state: RagState) -> None:
    """在达到尝试上限后返回明确拒答。"""
    state.answer = "资料不足，已停止检索并转人工。"
    state.trace.append("refuse:max_attempts")


def run_graph(question: str, knowledge_base: list[Document]) -> RagState:
    """从检索节点运行到回答或拒答；question 是用户原始问题。"""
    # 当前问题对应的初始图状态。
    state = RagState(original_question=question, search_query=question)

    while True:
        retrieve(state, knowledge_base)
        grade_evidence(state)
        # 证据评估后选出的下一节点。
        next_node = route_after_grade(state)
        state.trace.append(f"route:{next_node}")
        if next_node == "rewrite":
            rewrite_query(state)
            continue
        if next_node == "answer":
            generate_answer(state)
        else:
            refuse_answer(state)
        return state


def print_result(label: str, state: RagState) -> None:
    """打印一条图运行结果；label 是场景名称。"""
    print(f"=== {label} ===")
    for event in state.trace:
        print(event)
    print("answer:", state.answer)
    print("original_question:", state.original_question)
    print("final_search_query:", state.search_query)


def main() -> None:
    """运行改写命中和上限拒答两个闭环场景。"""
    # 本实验使用的最小知识库。
    knowledge_base = [
        Document("refund#1", "退款审核通过后三个工作日到账。"),
        Document("invoice#1", "报销发票应在消费后七日内提交。"),
    ]
    # 经过 Query 改写后能够命中的图状态。
    success_state = run_graph("退款多久", knowledge_base)
    # 两轮检索仍无证据而拒答的图状态。
    refused_state = run_graph("如何重置数据库密码", knowledge_base)

    print_result("场景 1：改写后命中", success_state)
    print()
    print_result("场景 2：达到上限后拒答", refused_state)


if __name__ == "__main__":
    main()
```

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)
