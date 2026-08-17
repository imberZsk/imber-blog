# 应用框架（01） - Dify 入门

> 读完后，你应能完成以下任务：
> - 绘制“应用框架（01） - Dify 入门 / Dify 的三种应用形态”的关键对象与数据流，解释“知识库问答用 Workflow 最合适。”，并用源码位置、日志或 Trace 标注证据。
> - 为“应用框架（01） - Dify 入门 / 工作流的本质：节点共享一个 state，按连线依次加工”设计正常与异常输入，验证“Dify 画布上你拖出一串节点、连上线，看起来很「可视化」，但底下就是一件事：一个共享的状态字典，从第一个节点流到最后一个节点，每个节点往里加工。”，输出首个偏差位置与回归测试结果。
> - 实现“应用框架（01） - Dify 入门 / LLM 节点里那段 Prompt 才是灵魂”的最小代码或配置，检验“核心是两条：用上游变量引用检索结果，检索为空时必须拒答。”，输出命令、结果与 Diff，并说明不适用边界。

# 一、一个真实场景

产品同学想要一个「员工制度问答机器人」：上传几份公司制度文档，员工在企微里提问，机器人基于文档回答，查不到就说不知道。

你估了一下：自己写要搞文档解析、切 chunk、embedding、向量库、检索、Prompt 编排、API、前端聊天框，一周起步。但用 Dify，拖几个节点、传几个文档、半天能上线给产品演示。

这就是 Dify 的定位：**低代码大模型应用平台，把 RAG、Agent、工作流这些标准链路做成可拖拽的节点，让你跳过样板代码直接拼业务。** 但拖拽不等于不用懂原理——面试官一定会追问「你那个知识库 chunk 怎么切的、检索不到怎么办」，答不上来，会拖拽也白搭。

# 二、Dify 的三种应用形态

Dify 建应用时让你选类型，对应三种复杂度：

| 类型 | 适合什么 | 本质 |
|---|---|---|
| Chatbot | 纯对话，套个 Prompt 和人设 | 一次模型调用 |
| Agent | 对话 + 工具调用（查天气、查订单） | 模型决策 + 工具执行循环 |
| Workflow | 多步骤固定流程（检索→判断→生成→格式化） | 一张有向图，节点按连线执行 |

知识库问答用 Workflow 最合适。下面就拆 Workflow。

# 三、工作流的本质：节点共享一个 state，按连线依次加工

Dify 画布上你拖出一串节点、连上线，看起来很「可视化」，但底下就是一件事：**一个共享的状态字典，从第一个节点流到最后一个节点，每个节点往里加工。**

知识库问答最常见的链路是这四个节点：

```text
开始节点      → 接收用户问题，写入工作流变量
   ↓
知识检索节点  → 拿问题去向量库检索 topK，命中/未命中
   ↓
LLM 节点      → 把检索结果填进 Prompt，模型生成回答
   ↓             ↑ 检索为空
结束节点      → 输出最终回答              拒答，不编造
```

每个节点都是「输入 state → 处理 → 输出 state」。用代码写出来，一个节点就是一个函数：

```python
def knowledge_node(state: dict) -> dict:
    """知识检索节点：拿问题去检索，命中就把资料写进 state。"""
    question = state["question"]
    # 真实 Dify 用 embedding 余弦相似度，这里用关键词重叠模拟
    best_source, best_score = None, 0
    for source, text in KNOWLEDGE_BASE.items():
        score = len(set(question) & set(text))
        if score > best_score:
            best_score, best_source = score, source
    # 命中阈值之上才算检索到，否则标记未命中
    if best_score >= 3:
        state["context"] = KNOWLEDGE_BASE[best_source]
        state["hit"] = True
    else:
        state["hit"] = False
    return state
```

而画布上的「连线」就是把节点按顺序串起来执行：

```python
def run_workflow(user_input, nodes):
    """工作流引擎：节点共享 state，前一个的输出是后一个的输入。"""
    state = {"input": user_input}
    for node in nodes:
        state = node(state)   # 这一行就是画布上的一条连线
    return state
```

理解了这一点，你看 Dify 画布就不再是黑盒：每个节点对应一个函数，每条连线对应一次 `state` 传递。

# 四、LLM 节点里那段 Prompt 才是灵魂

知识库问答的成败，八成在 LLM 节点的 Prompt 怎么写。核心是两条：**用上游变量引用检索结果，检索为空时必须拒答。**

```python
def llm_node(state: dict) -> dict:
    """LLM 节点：基于检索资料回答，检索为空时拒答不编造。"""
    if not state["hit"]:                       # 没检索到资料
        state["answer"] = "知识库里没有相关资料，无法回答。"
        return state
    state["answer"] = f"根据《{state['source']}》：{state['context']}"
    return state
```

在真实 Dify 里，这段对应 LLM 节点的 Prompt 模板：

```text
基于以下资料回答问题，资料里没有就说"无法回答"，不要编造。
资料：{{#knowledge.context#}}
问题：{{#start.question#}}
```

`{{#knowledge.context#}}` 就是引用上游知识检索节点的输出变量。Dify 的变量引用，等价于代码里 `state["context"]`。

# 五、工程上真正会踩的坑

- **以为拖拽就不用懂 RAG**。Dify 知识库节点有 chunk 大小、topK、相似度阈值这些参数，全是 RAG 概念。参数拍脑袋设，召回质量就崩。面试被追问「topK 设几、为什么」答不上，平台用得再熟也露怯。
- **Prompt 里不写拒答约束**。检索节点没命中时仍把空 context 喂给模型，模型照样编一个答案。必须在 Prompt 里明确「资料里没有就说不知道」，对应 demo 的 `if not state["hit"]`。
- **变量引用名写错**。Dify 用 `{{#node.field#}}` 引用上游输出，节点改名或字段改名后引用不会自动更新，工作流静默拿到空值。等价于代码里 `state["context"]` 拼错 key。
- **把它当万能平台**。固定流程 Dify 很省事，但需求一旦要深度定制检索策略、自定义 rerank、复杂状态管理，平台的灵活度就成了天花板，这时候该回到代码（LangChain / LangGraph）。

# 六、一句话面试答法

> **Dify 这类平台帮你省了什么、没省什么？** 它把文档解析、切分、embedding、检索、Prompt 编排做成了可拖拽节点，省掉的是样板代码，让我半天就能上线一个知识库问答给产品验证。但它没省掉对原理的理解：知识库节点的 chunk 大小、topK、相似度阈值、检索为空时的拒答策略，每一个都得我自己懂、自己调。需求简单用平台提速，需要深度定制检索和状态管理时我会回到 LangChain/LangGraph 写代码。

# 七、动手实践：33 Dify 入门

用纯 Python 标准库模拟 Dify 工作流（Workflow）的节点串联，让你看清平台拖拽的每个节点底下在做什么。

## 7.1 在线运行


零依赖，纯标准库，离线可跑。

## 7.2 预期输出

```text
=== 场景 1：问报销（知识库命中）===
用户：报销发票几天内提交？
  [节点] start_node     -> hit=None answer=—
  [节点] knowledge_node -> hit=True answer=—
  [节点] llm_node       -> hit=True answer=已生成
  [节点] end_node       -> hit=True answer=已生成
输出：根据《报销制度.md》：员工报销需在消费后 7 天内提交发票，超过 30 天不予受理。

=== 场景 2：问年假（知识库没有，拒答）===
用户：年假有几天？
  [节点] start_node     -> hit=None answer=—
  [节点] knowledge_node -> hit=False answer=—
  [节点] llm_node       -> hit=False answer=已生成
  [节点] end_node       -> hit=False answer=已生成
输出：抱歉，知识库里没有相关资料，无法回答。
```

同一条工作流，问能命中的走「检索 → 基于资料回答」，问不能命中的走「拒答」。这就是 Dify 画布上一条连线两个走向的本质。

## 7.3 代码 ↔ 概念对应

| Dify 概念 | 在 main.py 哪里 |
|---|---|
| 开始节点（接收输入变量） | `start_node` |
| 知识库节点（检索 topK） | `knowledge_node` |
| LLM 节点（Prompt + 模型） | `llm_node` |
| 结束节点（输出变量） | `end_node` |
| 画布上的节点连线 | `run_workflow`（节点共享 state 依次加工） |
| 检索为空时拒答 | `llm_node` 里 `if not state["hit"]` 分支 |

## 7.4 真实 Dify 怎么用

这个 demo 是「代码版的最小 Dify」，帮你理解原理。真实使用时：

1. 浏览器打开 Dify（云端 cloud.dify.ai 或自建 Docker 部署）。
2. 新建应用，选「工作流」类型。
3. 在画布上拖出「开始 → 知识检索 → LLM → 结束」四个节点并连线，等价于本 demo 的 `workflow` 列表。
4. 知识库节点里上传文档，Dify 自动切 chunk + embedding（对应 `KNOWLEDGE_BASE`）。
5. LLM 节点里写 Prompt，用 `{{#context#}}` 引用上游检索结果（对应 `llm_node` 拼装回答）。
6. 发布后得到一个 API endpoint，前端用 HTTP 调用即可。

平台帮你省掉了切分、向量化、检索这些代码，但每个节点对应的原理就是本 demo 这些函数。

## 7.5 动手改

- 给 `KNOWLEDGE_BASE` 加一篇文档，看检索节点能不能命中。
- 把命中阈值 `best_score >= 3` 调高，观察更多问题落到拒答分支。
- 在 `workflow` 列表里插入一个「问题分类」节点，体会节点串联的可组合性。

## 7.6 可运行源码：Dify 入门


### main.py

```python
"""用标准库模拟 Dify Workflow 节点串联。"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

Node = Callable[[dict[str, Any]], dict[str, Any]]


def input_node(state: dict[str, Any]) -> dict[str, Any]:
    """校验工作流输入。"""
    if not str(state.get("question", "")).strip():
        raise ValueError("question_required")
    return state


def knowledge_node(state: dict[str, Any]) -> dict[str, Any]:
    """模拟知识库检索节点。"""
    # 当前问题检索到的证据。
    evidence = "报销需在30天内提交" if "报销" in state["question"] else None
    return {**state, "evidence": evidence}


def condition_node(state: dict[str, Any]) -> dict[str, Any]:
    """根据证据决定回答或拒答。"""
    # 最终工作流输出。
    answer = f"根据资料：{state['evidence']}" if state.get("evidence") else "资料不足，无法回答。"
    return {**state, "answer": answer}


def run_workflow(question: str) -> dict[str, Any]:
    """按可视化节点顺序运行工作流。"""
    # Dify 画布中从开始到结束的节点列表。
    nodes: list[Node] = [input_node, knowledge_node, condition_node]
    # 节点间共享的变量集合。
    state: dict[str, Any] = {"question": question}
    for node in nodes:
        state = node(state)
        print(f"node={node.__name__} outputs={state}")
    return state


def main() -> None:
    """运行命中和拒答两条分支。"""
    run_workflow("报销期限？")
    run_workflow("食堂菜单？")


if __name__ == "__main__":
    main()
```

# 八、总结

- **工作流的本质：节点共享一个 state，按连线依次加工**：Dify 画布上你拖出一串节点、连上线，看起来很「可视化」，但底下就是一件事：一个共享的状态字典，从第一个节点流到最后一个节点，每个节点往里加工。
- **LLM 节点里那段 Prompt 才是灵魂**：核心是两条：用上游变量引用检索结果，检索为空时必须拒答。
- **工程上真正会踩的坑**：Dify 知识库节点有 chunk 大小、topK、相似度阈值这些参数，全是 RAG 概念。
- **一句话面试答法**：它把文档解析、切分、embedding、检索、Prompt 编排做成了可拖拽节点，省掉的是样板代码，让我半天就能上线一个知识库问答给产品验证。

## 参考资料

- [LangChain 文档](https://docs.langchain.com/oss/python/langchain/overview)
- [Dify 文档](https://docs.dify.ai/)
