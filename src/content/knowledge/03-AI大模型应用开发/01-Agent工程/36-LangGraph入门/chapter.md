# LangGraph 入门

> 读完你能：讲清 LangGraph 的四个核心概念（State、Node、Edge、Graph），说明它和 LangChain 直线链的本质区别（**条件分支 + 循环**），并用纯标准库写出一个能「检索不到就改写重试」的最小状态机。

## 与进阶篇的分工

本篇保留为 LangGraph 入门：重点讲 State、Node、Edge 和条件循环。进阶图编排请读 75《图编排引擎》和 76《Agentic RAG》，那里会把状态图用于多 Agent 和自我修正 RAG 闭环。

## 一个真实场景

你的知识库 Agent 上线了，但有个问题：用户问「报销咋整」这种大白话，检索命中率很低，因为知识库里写的是「报销发票几天内提交」。

理想的处理是：**检索不到 → 把问题改写成检索友好的形式 → 再检索一次。** 注意这里有个「回头重试」的动作——检索失败后要绕回去重新检索。

这正是 LangChain 直线链的死穴。`prompt | retrieve | llm` 是一条单向流水线，数据只能往前流，没法「检索失败了再绕回检索」。要表达这种循环和分支，就需要把应用建模成一张**图**。这就是 LangGraph。

## 直线链 vs 状态图

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

## 四个核心概念

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

## 条件边：图能分支和循环的关键

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

## 图引擎：驱动 state 在图上跑，并防死循环

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
        state = self.nodes[current](state)
        steps += 1
        # 优先走条件边，否则走固定边，都没有就结束
        if current in self.conditional_edges:
            current = self.conditional_edges[current](state)
        elif current in self.edges:
            current = self.edges[current]
        else:
            current = END
    return state
```

`max_steps` 不是可选项。条件边一旦逻辑写错（比如忘了 `rewritten` 标记），图就会在两个节点间无限横跳。这是用图最容易踩的坑。

## 配套 demo：跑起来看

```bash
cd demos/36-langgraph-intro
python3 main.py
```

**不需要 `pip install langgraph`**。`main.py` 跑两个场景：问题直接命中（无需改写），和口语问题没命中 → 改写 → 再检索命中。第二个场景的 trace 清楚展示了循环：

```
[retrieve] query='报销咋整' hit=False
[rewrite] '报销咋整' -> '报销发票几天内提交'
[retrieve] query='报销发票几天内提交' hit=True   ← 绕回来又跑了一次检索
[answer] 根据资料：员工报销需在消费后 7 天内提交发票...
```

核心对应关系：
- `StateGraph` —— 图引擎，等价 `langgraph.graph.StateGraph`
- `retrieve_node` / `rewrite_node` / `answer_node` —— 三个节点
- `route_after_retrieve` —— 条件边的路由函数（分支 + 循环都靠它）
- `add_edge("rewrite", "retrieve")` —— 制造循环的那条边
- `invoke` 里的 `max_steps` —— 防死循环兜底

## 工程上真正会踩的坑

- **条件边逻辑漏出口导致死循环**。忘了标记「已改写过」，图就在 retrieve 和 rewrite 间无限横跳。每条循环边都要有明确的退出条件，且引擎层面用 `max_steps` 兜底。
- **state 字段约定不清**。多个节点读写同一个 state，谁写了什么字段没约定好，后面的节点读到意外的值。State 的结构要像接口一样定清楚。
- **该用链却上了图**。固定流程（解析→检索→回答，不回头）用 LangChain 的链就够了，套图反而把简单逻辑复杂化。只有真需要循环/分支/回退时才上图。
- **图太大没法调试**。节点一多，光看代码想不清数据怎么流。真实 LangGraph 配合 LangSmith 可视化 trace，自己实现的话至少把每个节点的 state 变化打出来（demo 里就这么做的）。

## 一句话面试答法

> **LangGraph 和 LangChain 什么区别，什么时候用图？** LangChain 的链是直线流水线，数据只能往前流；LangGraph 把应用建模成带状态的图，支持条件分支和循环。核心是 State（共享状态）、Node（读写 state 的节点）、Edge（决定去哪的边，分条件边和固定边）。固定流程用链就够，但 Agent 那种「做一步看结果不行再来一遍」的循环、或者「检索不到先改写再重试」的回退，必须用图。用图时一定要给循环边设退出条件、引擎层加步数上限防死循环。

## 下一篇

`37-框架选型对比.md` —— 平台（Dify/Coze）、框架（LangChain/LangGraph）都见过了，到底该选哪个？下一篇用一个决策脚本，按你的真实需求输出推荐方案，把选型逻辑讲透。
