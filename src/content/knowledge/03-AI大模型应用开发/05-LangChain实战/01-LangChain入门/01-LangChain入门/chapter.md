# LangChain 实战（35）- LangChain 入门

> 读完你能：讲清 LangChain 五个核心积木（PromptTemplate、LLM、Retriever、Tool、Chain）各自封装了什么，看懂 LCEL 的 `prompt | llm` 这种 `|` 串联写法的本质，并用纯标准库写出它们的 mini 等价实现。

# 一、与进阶篇的分工

本篇保留为 LangChain 入门：重点讲 PromptTemplate、LLM、Retriever、Tool、Chain 的本质。进阶 LangChain 主线请读 66-69，那里会继续讲 prompt 组件化、Runnable、LCEL 组装和阶段总结。

# 二、一个真实场景

你用 Dify 拖了个知识库问答，产品满意。但下一个需求来了：检索之前要先做一次「问题改写」（把口语化问题改成检索友好的关键词），检索之后要做 rerank，回答之后要抽取结构化字段存库。Dify 的节点开始不够用了，你想用代码精细控制每一步。

直接裸写也行，但你会发现自己在反复造同样的轮子：拼 prompt 模板、调模型、接检索、串流程。LangChain 就是把这些反复出现的零件做成了标准积木，让你像搭乐高一样拼 AI 应用。

这一篇不教你背 LangChain 的 API（版本变得太快），而是讲清它的**五个核心积木分别封装了什么**。理解了本质，看任何版本的文档都不慌。

# 三、五个核心积木

| 积木 | 干什么 | 一句话本质 |
|---|---|---|
| PromptTemplate | 带 `{变量}` 的提示词模板 | 字符串格式化 |
| LLM / ChatModel | 调模型 | 一次 HTTP 请求的封装 |
| Retriever | 从文档库取相关片段 | 向量检索的封装 |
| Tool | 模型可调用的外部能力 | 给函数加上名字和描述 |
| Chain（LCEL） | 把上面这些串成流水线 | 用 `|` 连接的函数管道 |

挨个看，每个都用纯标准库还原它的本质。

# 四、PromptTemplate、LLM、Retriever、Tool：各是一层薄封装

**PromptTemplate** 就是带占位符的字符串模板，本质是 `str.format`：

```python
class PromptTemplate:
    def __init__(self, template):
        self.template = template
    def format(self, **kwargs):
        """把变量填进模板，生成最终 prompt。"""
        return self.template.format(**kwargs)

prompt = PromptTemplate("把这句话翻译成英文：{text}")
prompt.format(text="今天天气很好")   # -> "把这句话翻译成英文：今天天气很好"
```

**LLM** 是模型调用的封装，真实项目里 `invoke` 内部是一次 HTTP 请求。demo 里用 mock 离线模拟：

```python
class FakeLLM:
    def invoke(self, prompt):
        """接收 prompt 返回回答（真实项目里这里是 HTTP 调模型）。"""
        return "（模型回答）" + prompt[-20:]
```

**Retriever** 是检索器，封装「拿 query 去向量库找相关片段」。demo 用关键词重叠模拟向量相似度：

```python
class SimpleRetriever:
    def retrieve(self, query):
        """检索最相关的文档，没命中返回空串（真实项目用 embedding 余弦相似度）。"""
        best_doc, best_score = "", 0
        for doc in self.documents:
            score = len(set(query) & set(doc))
            if score > best_score:
                best_score, best_doc = score, doc
        return best_doc if best_score >= 3 else ""
```

**Tool** 就是给一个普通函数包上「名字 + 描述」，让模型能识别和调用，这和第 28 篇的工具 schema 是同一回事：

```python
class Tool:
    def __init__(self, name, description, func):
        self.name, self.description, self.func = name, description, func
    def run(self, *args):
        """执行工具函数。"""
        return self.func(*args)
```

四个积木，每个都只是一层薄封装。LangChain 的价值不在单个积木有多复杂，而在它们能用统一的方式拼起来。

# 五、Chain 和 LCEL：`|` 串联的本质是函数管道

LangChain 现在主推 LCEL（表达式语言），写法是用 `|` 把组件串起来：

```python
chain = prompt | llm | parser
chain.invoke({"question": "..."})
```

这个 `|` 看着很神奇，其实就是重载了 Python 的 `__or__` 运算符，把组件接成一条流水线。自己实现一下就懂了：

```python
class Chain:
    def __init__(self, steps):
        self.steps = steps              # 流水线上的步骤列表
    def __or__(self, step):
        """重载 | ：chain | step 往流水线末尾追加一步。"""
        return Chain(self.steps + [step])
    def invoke(self, data):
        """从头到尾执行，前一步输出是后一步输入。"""
        result = data
        for step in self.steps:
            result = step(result)
        return result
```

`a | b | c` 不过是「先执行 a，把结果给 b，再把结果给 c」。理解了这个，LangChain 文档里那些花哨的链式写法你就一眼看穿了。

把检索、模板、模型串成一条 RAG 链：

```python
chain = Chain([step_retrieve]) | step_prompt | step_llm
chain.invoke({"question": "报销发票几天内提交"})
# -> 根据资料，员工报销需在消费后 7 天内提交发票。
chain.invoke({"question": "年假有几天"})
# -> 资料不足，无法回答。   ← 检索为空，链路里自动拒答
```

# 七、工程上真正会踩的坑

- **被版本变更坑**。LangChain API 迭代极快，`langchain` / `langchain-core` / `langchain-community` 拆包后老教程的 import 大量失效。别死记 API，记本质（积木 + 管道），用时查当前版本文档。
- **过度封装看不清链路**。链套链、Agent 套 Chain，出问题不知道哪一层挂了。复杂链一定要开 verbose / 接 LangSmith 看 trace，否则调试是黑盒。
- **为了用框架而用框架**。简单的「拼 prompt + 调一次模型」裸写五行就完事，套上 LangChain 反而引入一堆抽象。框架适合多步骤、多组件复用的场景，简单需求别硬上。
- **检索为空不拒答**。LangChain 不会替你处理「检索不到」的兜底，得自己在链里加判断（对应 demo 里 `FakeLLM` 看到空 context 就拒答）。

# 八、一句话面试答法

> **LangChain 解决什么问题，它的核心抽象是什么？** 它把大模型应用里反复出现的零件做成了标准积木：PromptTemplate 管提示词模板、LLM 管模型调用、Retriever 管检索、Tool 管工具，再用 LCEL 的 `|` 把它们串成流水线。`prompt | llm` 这种写法本质是重载 `__or__` 运算符做的函数管道，前一步输出是后一步输入。它的价值是组件复用和编排，但版本迭代快、容易过度封装，简单需求我会直接裸写、不硬上框架。

# 十、总结

- **五个核心积木**：挨个看，每个都用纯标准库还原它的本质。
- **Chain 和 LCEL：`|` 串联的本质是函数管道**：LangChain 现在主推 LCEL（表达式语言），写法是用 | 把组件串起来：
- **工程上真正会踩的坑**：被版本变更坑。
- **PromptTemplate、LLM、Retriever、Tool：各是一层薄封装**：PromptTemplate 就是带占位符的字符串模板，本质是 str.format：

<!-- knowledge-lab-merged -->

# 动手实践：35 LangChain 入门

用纯 Python 标准库实现 LangChain 五个核心概念的等价 mini 版：PromptTemplate、LLM、Retriever、Tool、Chain（LCEL 的 `|` 串联）。不装 langchain，让你看清框架那些类到底封装了什么。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库，离线可跑。**不需要 `pip install langchain`**。

## 预期输出

```
=== 1. PromptTemplate：变量填充 ===
把这句话翻译成英文：今天天气很好

=== 2. FakeLLM：模型调用 ===
（模型回答）你好

=== 3. SimpleRetriever：检索 ===
检索『报销发票几天』-> 员工报销需在消费后 7 天内提交发票。
检索『年假几天』-> ''

=== 4. Tool：工具调用 ===
calculator（计算两数之和）-> 结果是 8

=== 5. Chain：把 Retriever + Prompt + LLM 串成 RAG 流水线 ===
问能命中的： 根据资料，员工报销需在消费后 7 天内提交发票。
问命不中的： 资料不足，无法回答。
```

## 代码 ↔ 概念对应

| LangChain 概念 | 本 demo 的 mini 实现 | 真实 LangChain 类 |
|---|---|---|
| 提示词模板 | `PromptTemplate` | `langchain.prompts.PromptTemplate` |
| 模型调用 | `FakeLLM.invoke` | `ChatOpenAI` 等 LLM |
| 检索器 | `SimpleRetriever.retrieve` | `VectorStoreRetriever` |
| 工具 | `Tool` | `langchain.tools.Tool` / `@tool` |
| `\|` 串联流水线（LCEL） | `Chain.__or__` | `prompt \| llm \| parser` |

## 真实 LangChain 怎么用

这个 demo 是「代码版的 mini LangChain」，帮你理解原理。真实项目里：

```bash
pip install langchain langchain-openai
```

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

prompt = PromptTemplate.from_template("基于资料回答。\n资料：{context}\n问题：{question}")
llm = ChatOpenAI(model="gpt-4o-mini")

# LCEL：用 | 把组件串成链，和本 demo 的 Chain.__or__ 是一回事
chain = prompt | llm
chain.invoke({"context": "...", "question": "..."})
```

本 demo 的 `Chain.__or__` 重载 `|` 运算符，就是 LangChain LCEL（表达式语言）`prompt | llm | parser` 的实现原理：每个组件是一个可调用步骤，`|` 把它们串成流水线，`invoke` 时数据从头流到尾。

## 动手改

- 给 `SimpleRetriever` 多加几篇文档，调命中阈值 `best_score >= 3`，观察召回变化。
- 在 RAG 链里再插一个「格式化」步骤（把回答包成 JSON），体会 `chain | step` 追加步骤有多自然。
- 把 `FakeLLM` 换成真实 `urllib` 调用模型 API（带 `if not os.getenv("OPENAI_API_KEY")` 兜底）。
