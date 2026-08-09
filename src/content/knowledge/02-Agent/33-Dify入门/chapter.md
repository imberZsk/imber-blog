# Dify 入门

> 读完你能：讲清 Dify 工作流的节点本质（每个节点底下是哪段代码），用一个纯 Python 的 mini 工作流跑通「开始 → 知识检索 → LLM → 结束」，并知道什么场景该上 Dify、什么场景不该。

## 一个真实场景

产品同学想要一个「员工制度问答机器人」：上传几份公司制度文档，员工在企微里提问，机器人基于文档回答，查不到就说不知道。

你估了一下：自己写要搞文档解析、切 chunk、embedding、向量库、检索、Prompt 编排、API、前端聊天框，一周起步。但用 Dify，拖几个节点、传几个文档、半天能上线给产品演示。

这就是 Dify 的定位：**低代码大模型应用平台，把 RAG、Agent、工作流这些标准链路做成可拖拽的节点，让你跳过样板代码直接拼业务。** 但拖拽不等于不用懂原理——面试官一定会追问「你那个知识库 chunk 怎么切的、检索不到怎么办」，答不上来，会拖拽也白搭。

## Dify 的三种应用形态

Dify 建应用时让你选类型，对应三种复杂度：

| 类型 | 适合什么 | 本质 |
|---|---|---|
| Chatbot | 纯对话，套个 Prompt 和人设 | 一次模型调用 |
| Agent | 对话 + 工具调用（查天气、查订单） | 模型决策 + 工具执行循环 |
| Workflow | 多步骤固定流程（检索→判断→生成→格式化） | 一张有向图，节点按连线执行 |

知识库问答用 Workflow 最合适。下面就拆 Workflow。

## 工作流的本质：节点共享一个 state，按连线依次加工

Dify 画布上你拖出一串节点、连上线，看起来很「可视化」，但底下就是一件事：**一个共享的状态字典，从第一个节点流到最后一个节点，每个节点往里加工。**

知识库问答最常见的链路是这四个节点：

```
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

## LLM 节点里那段 Prompt 才是灵魂

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

```
基于以下资料回答问题，资料里没有就说"无法回答"，不要编造。
资料：{{#knowledge.context#}}
问题：{{#start.question#}}
```

`{{#knowledge.context#}}` 就是引用上游知识检索节点的输出变量。Dify 的变量引用，等价于代码里 `state["context"]`。

## 配套 demo：跑起来看

```bash
cd demos/33-dify-intro
python3 main.py
```

`main.py` 用纯标准库把上面四个节点和工作流引擎都实现了，跑两个场景：问报销（命中知识库）和问年假（库里没有，拒答）。

核心函数对应关系：
- `start_node` / `knowledge_node` / `llm_node` / `end_node` —— Dify 画布上的四个节点
- `run_workflow` —— 画布上的连线，本质是节点共享 `state` 依次执行
- `knowledge_node` 里的命中阈值判断 —— Dify 知识库节点的「召回」
- `llm_node` 里的 `if not state["hit"]` —— 检索为空时拒答

运行时它会打印每个节点执行后的 `state` 变化，你能直观看到「数据如何从开始流到结束」。把这条 trace 讲清楚，你就讲清了 Dify Workflow。

## 工程上真正会踩的坑

- **以为拖拽就不用懂 RAG**。Dify 知识库节点有 chunk 大小、topK、相似度阈值这些参数，全是 RAG 概念。参数拍脑袋设，召回质量就崩。面试被追问「topK 设几、为什么」答不上，平台用得再熟也露怯。
- **Prompt 里不写拒答约束**。检索节点没命中时仍把空 context 喂给模型，模型照样编一个答案。必须在 Prompt 里明确「资料里没有就说不知道」，对应 demo 的 `if not state["hit"]`。
- **变量引用名写错**。Dify 用 `{{#node.field#}}` 引用上游输出，节点改名或字段改名后引用不会自动更新，工作流静默拿到空值。等价于代码里 `state["context"]` 拼错 key。
- **把它当万能平台**。固定流程 Dify 很省事，但需求一旦要深度定制检索策略、自定义 rerank、复杂状态管理，平台的灵活度就成了天花板，这时候该回到代码（LangChain / LangGraph）。

## 一句话面试答法

> **Dify 这类平台帮你省了什么、没省什么？** 它把文档解析、切分、embedding、检索、Prompt 编排做成了可拖拽节点，省掉的是样板代码，让我半天就能上线一个知识库问答给产品验证。但它没省掉对原理的理解：知识库节点的 chunk 大小、topK、相似度阈值、检索为空时的拒答策略，每一个都得我自己懂、自己调。需求简单用平台提速，需要深度定制检索和状态管理时我会回到 LangChain/LangGraph 写代码。

## 下一篇

`34-Coze入门.md` —— Dify 偏工作流和知识库，Coze 更偏「Bot + 插件」生态。下一篇看同样是低代码平台，Coze 的插件调用是怎么把模型意图变成真实 API 请求的。
