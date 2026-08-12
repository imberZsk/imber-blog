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

## 在线运行

直接使用本文“可运行源码”中的沙盒执行；源码、复制内容和实际运行入口保持一致。

## 重点观察

- 每个组件只返回新的状态字段，不在匿名函数里隐藏业务副作用。
- 下游读取字段前先校验输入契约。
- 正常问题走检索链；空问题由 fallback 返回可恢复错误。
- 换成真实 LCEL 时，对应 `RunnableLambda`、`|`、`with_fallbacks` 和 Callback。

## 可运行源码：Runnable：把写逻辑变成组装 chain

下方代码就是在线沙盒实际执行的完整源码。可直接运行、查看输出或复制到本地，页面不再依赖文章外的重复脚本。

### `main.py`

```python
"""用标准库复现 Runnable 管道、数据契约和 fallback。"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

# Runnable 状态使用字符串键到任意受控值的映射。
Payload = dict[str, Any]
# 单个管道步骤接收并返回 Payload。
Step = Callable[[Payload], Payload]


@dataclass(frozen=True, slots=True)
class Runnable:
    """包装一个具有统一输入输出协议的可调用步骤。"""

    # Trace 中显示的稳定步骤名称。
    name: str
    # 当前步骤实际执行的数据转换函数。
    step: Step

    def invoke(self, payload: Payload) -> Payload:
        """执行当前步骤；payload 是上游返回的完整状态。"""
        print(f"[{self.name}] input_keys={sorted(payload.keys())}")
        # 当前步骤返回的下游状态。
        result = self.step(payload)
        print(f"[{self.name}] output_keys={sorted(result.keys())}")
        return result

    def then(self, next_runnable: "Runnable") -> "Runnable":
        """组合两个步骤；next_runnable 接收当前步骤输出。"""
        def composed(payload: Payload) -> Payload:
            """依次执行两个 Runnable；payload 是组合链输入。"""
            # 当前 Runnable 产生的中间状态。
            intermediate_payload = self.invoke(payload)
            return next_runnable.invoke(intermediate_payload)

        return Runnable(name=f"{self.name} | {next_runnable.name}", step=composed)


def normalize(payload: Payload) -> Payload:
    """规范化问题；payload 必须包含字符串 question。"""
    # 上游提供的原始问题值。
    raw_question = payload.get("question")
    if not isinstance(raw_question, str) or not raw_question.strip():
        raise ValueError("question 必须是非空字符串")
    # 仅压缩空白、不改变业务实体的规范化问题。
    normalized_question = " ".join(raw_question.split())
    return {**payload, "question": normalized_question}


def retrieve(payload: Payload) -> Payload:
    """返回可复现证据；payload 包含已规范化 question。"""
    # 当前问题对应的教学检索证据。
    evidence = "[refund#1] 退款审核通过后三个工作日内到账。"
    return {**payload, "documents": [evidence]}


def render_answer(payload: Payload) -> Payload:
    """根据证据组装回答；payload 必须包含 documents。"""
    # 上游检索返回的结构化文档列表。
    documents = payload.get("documents")
    if not isinstance(documents, list) or not documents:
        raise ValueError("documents 必须是非空列表")
    # 最终回答保留证据编号以便回溯。
    answer = f"结论：{documents[0]}"
    return {**payload, "answer": answer}


def invoke_with_fallback(chain: Runnable, payload: Payload) -> Payload:
    """运行主链并返回可恢复错误；chain 是组合后的 Runnable。"""
    try:
        return chain.invoke(payload)
    except (TypeError, ValueError) as error:
        return {**payload, "status": "invalid_input", "error": str(error)}


def main() -> None:
    """运行正常输入和空问题 fallback 两条路径。"""
    # 负责问题规范化的 Runnable。
    normalize_runnable = Runnable("normalize", normalize)
    # 负责检索证据的 Runnable。
    retrieve_runnable = Runnable("retrieve", retrieve)
    # 负责输出回答的 Runnable。
    answer_runnable = Runnable("answer", render_answer)
    # 由三个稳定数据转换步骤组成的固定管道。
    chain = normalize_runnable.then(retrieve_runnable).then(answer_runnable)

    print("=== 场景 1：正常管道 ===")
    # 正常问题经过完整管道后的状态。
    success_result = invoke_with_fallback(chain, {"question": "退款   多久到账"})
    print("result:", success_result["answer"])

    print("\n=== 场景 2：输入契约失败后 fallback ===")
    # 空问题触发 fallback 后的可恢复错误状态。
    fallback_result = invoke_with_fallback(chain, {"question": "  "})
    print("result:", fallback_result)


if __name__ == "__main__":
    main()
```
