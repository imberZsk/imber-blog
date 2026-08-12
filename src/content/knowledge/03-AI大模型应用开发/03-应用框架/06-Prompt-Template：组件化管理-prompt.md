# 应用框架（06） - Prompt Template：组件化管理 prompt

> 读完你能：把 prompt 从散落字符串升级成可复用、可测试、可版本化的组件。

# 一、本篇定位

这是 LangChain 组件线的第一篇，讲 prompt 工程化，而不是堆提示词技巧。

# 二、一个真实场景

项目初期，你在代码里到处写 system prompt。后来产品要改语气，安全同学要加约束，RAG 要加引用规则，你发现每个接口都有一份相似但不完全一样的 prompt。Prompt Template 的意义就是把这些重复和变化点管理起来。

# 三、核心拆解

- Prompt Template 至少包含固定指令、变量插槽、输出格式、示例和约束。变量负责注入 query、context、history、tools 等运行时数据。
- 组件化不是为了花哨，而是为了让 prompt 可复用、可审查、可测试。不同场景共享基础模板，再叠加局部片段。
- Prompt 要版本化。一次小改动可能影响大量回答质量，没有版本就无法回滚和对比。

# 四、工程链路

- 抽出 system、task、context、format 四类片段。
- 定义变量名和输入类型。
- 渲染前校验必填变量。
- 用样例问题生成最终 prompt 快照。
- 把 prompt 版本写入调用日志。

# 五、落地建议

- RAG prompt 固定包含“只根据资料回答”和“证据不足拒答”。
- 工具 prompt 单独维护工具选择规则。
- 面向不同模型时保留模型适配层，别一份 prompt 打天下。

# 六、常见坑

- prompt 散落在业务代码里。
- 变量名随意，导致上下文注入错位。
- 改 prompt 不留版本，线上坏 case 无法追溯。

# 七、和已有主线的关系

11 是 Prompt 基础；66 讲 prompt 的工程化管理，并为 67-69 的 chain 组装做准备。

# 八、复述答法

> Prompt Template 是把提示词做成可复用组件：固定指令、变量、格式和示例分开管理，渲染前校验变量，调用时记录版本。它解决的不是“写一句更聪明的话”，而是 prompt 可维护、可测试、可回滚。

# 九、总结

- **核心拆解**：Prompt Template 至少包含固定指令、变量插槽、输出格式、示例和约束。
- **工程链路**：抽出 system、task、context、format 四类片段。
- **常见坑**：prompt 散落在业务代码里。
- **本篇定位**：这是 LangChain 组件线的第一篇，讲 prompt 工程化，而不是堆提示词技巧。

## 十、最小可运行示例：版本化 Prompt Template

~~~text
# requirements.txt
langchain-core
~~~

~~~python
from __future__ import annotations

from langchain_core.prompts import ChatPromptTemplate


# Prompt 版本进入 Trace，便于评测与回滚。
PROMPT_VERSION = "rag-answer-v3"
# 模板把系统规则、资料和问题分开，资料中的指令不具备系统权限。
prompt = ChatPromptTemplate.from_messages([
    ("system", "仅依据资料回答；资料不足时明确拒答，并返回引用 ID。"),
    ("human", "资料：\n{context}\n\n问题：{question}"),
])


def render_prompt(context: str, question: str) -> list[object]:
    """渲染消息；context 是已授权证据，question 是用户问题。"""

    # 渲染结果可直接传给 ChatModel，也可在测试中做快照断言。
    messages = prompt.invoke({"context": context, "question": question})
    return list(messages.messages)


print(PROMPT_VERSION, render_prompt("[c1] 退款三日到账", "多久能到账"))
~~~

Template 解决变量与复用，不自动解决注入。进入 context 的证据必须已授权、标记来源并限制总 Token；修改模板后运行同一评测集。

## 参考资料

- [LangChain 文档](https://docs.langchain.com/oss/python/langchain/overview)
- [Dify 文档](https://docs.dify.ai/)
