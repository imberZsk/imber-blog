# LangChain 实战（67）- Runnable：把写逻辑变成组装 chain

> 读完你能：理解 LangChain Runnable 的本质：统一输入输出接口，让组件可以像管道一样组合。

# 一、本篇定位

这是从组件到链的关键篇。35 讲过 LangChain 入门，67 把 LCEL 的组合方式讲清。

# 二、一个真实场景

你有一个步骤负责取用户问题，一个步骤负责检索，一个步骤负责渲染 prompt，一个步骤负责调用模型。如果每一步都手写胶水代码，流程会越来越乱。Runnable 的价值是让每个步骤都遵守统一调用协议，然后用管道组合。

# 三、核心拆解

- Runnable 可以理解为“可调用组件”。它接收输入，返回输出；组件之间只要输入输出对得上，就能串起来。
- LCEL 的 `a | b | c` 本质是函数管道：a 的输出传给 b，b 的输出传给 c。复杂点在于它还支持并行、映射、分支和流式。
- Runnable 的好处是可替换。今天 b 是 mock LLM，明天换成真实模型，只要接口不变，链路不用大改。

# 四、工程链路

- 先把每个步骤拆成单一职责组件。
- 定义每个组件的输入输出结构。
- 用管道串成完整 chain。
- 为关键组件加日志和错误处理。
- 用样例输入跑完整链路。

# 五、落地建议

- Retriever 输出 documents，PromptTemplate 输入 documents 和 question。
- LLM 输出文本，Parser 输入文本输出结构化对象。
- 复杂链路先画数据形状，再写 LCEL。

# 六、常见坑

- 为了链式写法牺牲可读性。
- 组件输入输出没有约定，串起来后才报错。
- 把业务判断藏在匿名 lambda 里，后续难调试。

# 七、和已有主线的关系

35 讲 LangChain 五个积木；67 聚焦 Runnable 和 LCEL，是 68 练习 chain 组装的前置篇。

# 八、复述答法

> Runnable 的本质是统一调用接口，让检索、prompt、模型、parser 都能像函数管道一样组合。写 chain 前要先定清每步输入输出，否则 LCEL 只是把混乱写得更短。

# 九、总结

- **核心拆解**：Runnable 可以理解为“可调用组件”。
- **常见坑**：组件输入输出没有约定，串起来后才报错。
- **本篇定位**：这是从组件到链的关键篇。
- **落地建议**：Retriever 输出 documents，PromptTemplate 输入 documents 和 question。

## 十、最小可运行示例：Runnable 数据契约

~~~text
# requirements.txt
langchain-core
~~~

~~~python
from __future__ import annotations

from langchain_core.runnables import RunnableLambda


def normalize_question(payload: dict[str, str]) -> dict[str, str]:
    """规范化问题；payload 必须包含 question。"""

    # 规范化只处理空白，不在这里改变业务实体。
    normalized_question = " ".join(payload["question"].split())
    return {**payload, "question": normalized_question}


def retrieve_mock(payload: dict[str, str]) -> dict[str, str]:
    """添加可复现证据；payload 是上一步输出。"""

    # 教学证据模拟 Retriever 的结构化输出。
    evidence = "[refund#1] 退款审核通过后三日到账。"
    return {**payload, "context": evidence}


# 每个 Runnable 输入输出都是显式字典，便于独立测试和替换。
chain = RunnableLambda(normalize_question) | RunnableLambda(retrieve_mock)
print(chain.invoke({"question": "退款   多久到账"}))
~~~

Runnable 的边界要有稳定 Schema；生产链路使用 Callback/Trace 保存每步耗时和版本。出现循环、暂停或动态分支时改用 LangGraph，不继续堆匿名 Lambda。

<!-- knowledge-lab-merged -->

# 动手实践：Runnable 数据契约与分支

用一个最小 `Runnable` 协议模拟 LCEL 的核心：统一 `invoke` 接口、管道组合、显式数据契约和可控 fallback。实验不依赖 LangChain，因此浏览器可以直接运行。

## 本地运行

```bash
python3 main.py
```

## 重点观察

- 每个组件只返回新的状态字段，不在匿名函数里隐藏业务副作用。
- 下游读取字段前先校验输入契约。
- 正常问题走检索链；空问题由 fallback 返回可恢复错误。
- 换成真实 LCEL 时，对应 `RunnableLambda`、`|`、`with_fallbacks` 和 Callback。
