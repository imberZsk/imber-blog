# LangChain 实战（68）- 实战练习 LCEL 组装 chain

> 读完你能：用 LCEL 思维组装一个 RAG chain，并知道什么时候该拆链、什么时候该上图。
> 来源：`吃透 AI Agent 开发` 截图目录第 16 篇，2026/02/26，可试读 8%
> 导入与重写日期：2026/07/07

# 一、本篇定位

这是 LangChain 实战练习篇，重点练固定流程的组件串联。

# 二、一个真实场景

一个最小 RAG chain 可以是：输入问题 → 检索文档 → 渲染 prompt → 调模型 → 解析输出。这个流程没有循环和动态分支，用 chain 表达非常自然。只要你把每步的数据结构对齐，整个链就像一条清晰流水线。

# 三、核心拆解

- LCEL 适合固定流程。它让你把“先检索、再提示词、再模型、再解析”写成可读的组合。
- RAG chain 的关键不是代码有多短，而是每一步都能单独替换和测试。Retriever、Prompt、LLM、Parser 都应该能独立跑。
- 一旦流程需要“检索失败就改写再检索”“工具失败就换策略”这种回路，chain 就开始吃力，需要 LangGraph。

# 四、工程链路

- 定义输入 question。
- Retriever 返回 documents。
- PromptTemplate 把 question 和 documents 渲染成 prompt。
- LLM 生成回答。
- Parser 校验格式并输出 answer、citations。

# 五、落地建议

- 先用 mock retriever 和 mock llm 验证数据流。
- 链路中间结果要能打印，便于定位坏 case。
- 回答和引用分开输出，引用不要让模型编。

# 六、常见坑

- 把所有逻辑塞进一个 chain，没人看得懂。
- 遇到条件分支仍强行用三元表达式拼。
- 不记录中间 documents，答错时无法判断是检索还是生成问题。

# 七、和已有主线的关系

67 讲 Runnable，本篇练固定 RAG chain；75 和 76 会处理 chain 不擅长的循环与分支。

# 八、复述答法

> LCEL 适合固定流水线，比如 RAG 的检索、prompt、模型、解析。每步要独立可测，并保留中间结果。只要出现循环、回退、动态决策，就该考虑 LangGraph，而不是继续把 chain 写复杂。

# 九、总结

- **核心拆解**：LCEL 适合固定流程。
- **工程链路**：Retriever 返回 documents。
- **常见坑**：把所有逻辑塞进一个 chain，没人看得懂。
- **本篇定位**：这是 LangChain 实战练习篇，重点练固定流程的组件串联。

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“Agent 工程（68）- 实战练习 LCEL 组装 chain”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。

## 十、最小可运行示例：LCEL RAG Chain

~~~text
# requirements.txt
langchain-core
~~~

~~~python
from __future__ import annotations

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableLambda, RunnablePassthrough


def retrieve(question: str) -> str:
    """返回教学证据；question 是用户问题。"""

    # 真实实现应执行带 ACL 的 Retriever，并返回引用 ID。
    return "[refund#1] 退款审核通过后三个工作日内到账。"


def mock_model(prompt_text: object) -> str:
    """模拟模型回答；prompt_text 是渲染后的 PromptValue。"""

    return f"模型收到：{prompt_text}"


# Prompt 明确证据不足时拒答。
prompt = PromptTemplate.from_template("仅根据资料回答。\n资料：{context}\n问题：{question}")
# 固定流程用 LCEL 连接检索、Prompt、模型和 Parser。
chain = (
    {"context": RunnableLambda(retrieve), "question": RunnablePassthrough()}
    | prompt
    | RunnableLambda(mock_model)
    | StrOutputParser()
)
print(chain.invoke("退款多久能到账"))
~~~

分别测试 Retriever、Prompt、模型和 Parser；Trace 要保存召回证据，避免最终答案错误时无法判断问题属于检索还是生成。
