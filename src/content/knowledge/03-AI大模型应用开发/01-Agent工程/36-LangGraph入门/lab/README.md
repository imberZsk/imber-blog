# 36 LangGraph 入门 demo

用纯 Python 标准库实现 LangGraph 的核心：`State`（共享状态）、`Node`（节点）、`Edge`（边，含条件边）、`Graph`（图引擎）。用一个「检索不到就改写问题重试」的 ReAct 风格 Agent，演示直线链做不到的**条件分支 + 循环**。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库，离线可跑。**不需要 `pip install langgraph`**。

## 预期输出

```
=== 场景 1：问题直接命中（无需改写）===
  [retrieve] query='报销发票几天内提交' hit=True
  [answer] 根据资料：员工报销需在消费后 7 天内提交发票，超过 30 天不予受理。
最终答案：根据资料：员工报销需在消费后 7 天内提交发票，超过 30 天不予受理。

=== 场景 2：口语问题没命中 → 改写 → 再检索命中 ===
  [retrieve] query='报销咋整' hit=False
  [rewrite] '报销咋整' -> '报销发票几天内提交'
  [retrieve] query='报销发票几天内提交' hit=True
  [answer] 根据资料：员工报销需在消费后 7 天内提交发票，超过 30 天不予受理。
最终答案：根据资料：员工报销需在消费后 7 天内提交发票，超过 30 天不予受理。
```

场景 2 是重点：检索没命中 → 走条件边到 rewrite → rewrite 回到 retrieve（**循环**）→ 这次命中 → 回答。这是直线链（LangChain LCEL）做不到的。

## 代码 ↔ 概念对应

| LangGraph 概念 | 本 demo 的 mini 实现 |
|---|---|
| State（共享状态） | 贯穿所有节点的 `state` 字典 |
| Node（节点） | `retrieve_node` / `rewrite_node` / `answer_node` |
| Edge（固定边） | `add_edge`，如 `rewrite -> retrieve` |
| Conditional Edge（条件边） | `add_conditional_edge` + `route_after_retrieve` |
| 循环 | rewrite 的固定边回到 retrieve |
| 图引擎驱动执行 | `StateGraph.invoke` |
| END 终止 | `END` 常量 + 防死循环 `max_steps` |

## 真实 LangGraph 怎么用

这个 demo 是「代码版的 mini LangGraph」。真实项目里：

```bash
pip install langgraph
```

```python
from langgraph.graph import StateGraph, END

graph = StateGraph(MyState)
graph.add_node("retrieve", retrieve_node)
graph.add_node("rewrite", rewrite_node)
graph.set_entry_point("retrieve")
graph.add_conditional_edges("retrieve", route_after_retrieve)  # 条件边
graph.add_edge("rewrite", "retrieve")                          # 形成循环
graph.add_edge("answer", END)
app = graph.compile()
app.invoke({"query": "..."})
```

API 名字几乎一一对应。LangGraph 真正多给你的是：状态持久化（checkpoint）、人在回路（中断等人确认）、并行节点。但核心模型就是本 demo 这套「状态在图上按条件边流动」。

## 动手改

- 把 `route_after_retrieve` 里的「改写过就回答」逻辑去掉，再跑场景 2 的一个永远命不中的问题，观察 `max_steps` 防死循环兜底。
- 加一个「人工确认」节点，在 answer 前插入，体会人在回路。
- 给 `REWRITE_MAP` 加更多改写规则，让改写节点更聪明。
