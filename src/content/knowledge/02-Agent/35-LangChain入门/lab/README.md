# 35 LangChain 入门 demo

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
