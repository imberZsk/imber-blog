# LangGraph（76）- Agentic RAG：基于 LangGraph 实现大模型自主决策的 RAG 闭环系统

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

## 本地运行

```bash
python3 main.py
```

零依赖，Python 3.10+ 可运行。真实 LangGraph 会负责节点注册、条件边和 Checkpoint；这个实验保留相同状态与停止条件，便于先理解执行轨迹。

## 重点观察

- 原始问题始终保留，改写只更新 `search_query`。
- 证据评分低于阈值才允许有限次改写。
- 达到上限仍无证据时明确拒答，不把弱证据交给生成节点。
