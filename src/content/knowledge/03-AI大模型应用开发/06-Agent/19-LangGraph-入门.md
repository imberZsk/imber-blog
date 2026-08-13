# Agent（19） - LangGraph 入门

## 核心知识清单

- State、Node、Edge 与 START/END
- Conditional Edge 与 Command 路由
- Checkpointer、thread_id 与状态恢复
- Interrupt 与 Human-in-the-loop
- Durable Execution、幂等节点与重放
- Streaming、错误分支与循环上限

> 读完你能：讲清 LangGraph 的四个核心概念（State、Node、Edge、Graph），说明它和 LangChain 直线链的本质区别（**条件分支 + 循环**），并用纯标准库写出一个能「检索不到就改写重试」的最小状态机。

# 一、与进阶篇的分工

本篇保留为 LangGraph 入门：重点讲 State、Node、Edge 和条件循环。进阶图编排请读 75《图编排引擎》和 76《Agentic RAG》，那里会把状态图用于多 Agent 和自我修正 RAG 闭环。

# 二、一个真实场景

你的知识库 Agent 上线了，但有个问题：用户问「报销咋整」这种大白话，检索命中率很低，因为知识库里写的是「报销发票几天内提交」。

理想的处理是：**检索不到 → 把问题改写成检索友好的形式 → 再检索一次。** 注意这里有个「回头重试」的动作——检索失败后要绕回去重新检索。

这正是 LangChain 直线链的死穴。`prompt | retrieve | llm` 是一条单向流水线，数据只能往前流，没法「检索失败了再绕回检索」。要表达这种循环和分支，就需要把应用建模成一张**图**。这就是 LangGraph。

# 三、直线链 vs 状态图

```
LangChain（直线链）：
  retrieve → prompt → llm → END        数据只能往前，没法回头

LangGraph（状态图）：
                  ┌──── 命中 ────→ answer → END
  retrieve ──判断─┤
                  └─ 没命中 → rewrite ──┐
                       ↑                │
                       └────────────────┘   改写完绕回 retrieve（循环）
```

差别就一个词：**图能有环，链不能。** Agent 的「想一步、做一步、看结果、不行再来一遍」本质就是循环，所以复杂 Agent 几乎都用图来建模。

# 四、四个核心概念

| 概念 | 是什么 | 对应 demo |
|---|---|---|
| State | 贯穿全程的共享状态字典 | `state` |
| Node | 图上的节点，读 state 改 state | `retrieve_node` 等 |
| Edge | 边，决定节点执行完去哪 | `add_edge` |
| Conditional Edge | 条件边，按 state 决定去哪 | `add_conditional_edge` |

**State** 是一个字典，从头流到尾，每个节点往里读写。**Node** 是函数，签名统一是 `(state) -> state`：

```python
def retrieve_node(state):
    """检索节点：拿 query 检索，命中就写 context，没命中标记 hit=False。"""
    query = state["query"]
    hit_doc = next((d for d in KNOWLEDGE if len(set(query) & set(d)) >= 4), "")
    state["context"] = hit_doc
    state["hit"] = bool(hit_doc)
    return state
```

# 五、条件边：图能分支和循环的关键

普通边（`add_edge`）是「A 执行完无条件去 B」。**条件边**（`add_conditional_edge`）是「A 执行完，由一个路由函数看 state 决定去哪」。这就是分支和循环的来源：

```python
def route_after_retrieve(state):
    """检索后的路由：命中去回答；没命中且没改写过就去改写重试；改写过仍不中就回答。"""
    if state["hit"]:
        return "answer"                    # 命中，去生成答案
    if not state.get("rewritten"):
        return "rewrite"                   # 没命中且没改写过，去改写（这条边形成循环）
    return "answer"                        # 改写过仍没命中，去回答（拒答），防死循环
```

组装图的时候，`rewrite` 节点用一条普通边连回 `retrieve`，就形成了「检索-改写-再检索」的循环：

```python
g.add_conditional_edge("retrieve", route_after_retrieve)  # 检索后按命中分支
g.add_edge("rewrite", "retrieve")    # 改写完回到检索 ← 这条边制造了环
g.add_edge("answer", END)
```

# 六、图引擎：驱动 state 在图上跑，并防死循环

图引擎做的事很简单：从入口节点开始，执行节点、看边、跳到下一个节点，直到 END。但有了环就有死循环风险，所以必须加步数上限兜底：

```python
def invoke(self, state, max_steps=20):
    """从入口执行图，按边跳转直到 END；超过 max_steps 强制停，防死循环。"""
    current = self.entry
    steps = 0
    while current != END:
        if steps >= max_steps:            # 条件边写错很容易写出死循环，必须兜底
            state["error"] = "超过最大步数，可能存在死循环"
            break
        state = self.nodes[current](./01-LangGraph入门/state)
        steps += 1
        # 优先走条件边，否则走固定边，都没有就结束
        if current in self.conditional_edges:
            current = self.conditional_edges[current](./01-LangGraph入门/state)
        elif current in self.edges:
            current = self.edges[current]
        else:
            current = END
    return state
```

`max_steps` 不是可选项。条件边一旦逻辑写错（比如忘了 `rewritten` 标记），图就会在两个节点间无限横跳。这是用图最容易踩的坑。

# 八、工程上真正会踩的坑

- **条件边逻辑漏出口导致死循环**。忘了标记「已改写过」，图就在 retrieve 和 rewrite 间无限横跳。每条循环边都要有明确的退出条件，且引擎层面用 `max_steps` 兜底。
- **state 字段约定不清**。多个节点读写同一个 state，谁写了什么字段没约定好，后面的节点读到意外的值。State 的结构要像接口一样定清楚。
- **该用链却上了图**。固定流程（解析→检索→回答，不回头）用 LangChain 的链就够了，套图反而把简单逻辑复杂化。只有真需要循环/分支/回退时才上图。
- **图太大没法调试**。节点一多，光看代码想不清数据怎么流。真实 LangGraph 配合 LangSmith 可视化 trace，自己实现的话至少把每个节点的 state 变化打出来（demo 里就这么做的）。

# 九、一句话面试答法

> **LangGraph 和 LangChain 什么区别，什么时候用图？** LangChain 的链是直线流水线，数据只能往前流；LangGraph 把应用建模成带状态的图，支持条件分支和循环。核心是 State（共享状态）、Node（读写 state 的节点）、Edge（决定去哪的边，分条件边和固定边）。固定流程用链就够，但 Agent 那种「做一步看结果不行再来一遍」的循环、或者「检索不到先改写再重试」的回退，必须用图。用图时一定要给循环边设退出条件、引擎层加步数上限防死循环。

# 十一、总结

- **四个核心概念**：State 是一个字典，从头流到尾，每个节点往里读写。
- **工程上真正会踩的坑**：条件边逻辑漏出口导致死循环。
- **直线链 vs 状态图**：差别就一个词：图能有环，链不能。
- **条件边：图能分支和循环的关键**：普通边（addedge）是「A 执行完无条件去 B」。

<!-- knowledge-lab-merged -->

# 动手实践：36 LangGraph 入门

用纯 Python 标准库实现 LangGraph 的核心：`State`（共享状态）、`Node`（节点）、`Edge`（边，含条件边）、`Graph`（图引擎）。用一个「检索不到就改写问题重试」的 ReAct 风格 Agent，演示直线链做不到的**条件分支 + 循环**。

## 在线运行

直接使用本文“可运行源码”中的沙盒执行；源码、复制内容和实际运行入口保持一致。

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

## 可运行源码：LangGraph 入门

下方代码就是在线沙盒实际执行的完整源码。可直接运行、查看输出或复制到本地，页面不再依赖文章外的重复脚本。

### `main.py`

```python
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
```

## 参考资料

- [LangChain Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [LangGraph 文档](https://docs.langchain.com/oss/python/langgraph/overview)
