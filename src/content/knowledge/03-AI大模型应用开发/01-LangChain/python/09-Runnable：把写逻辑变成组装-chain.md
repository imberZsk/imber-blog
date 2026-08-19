# LangChain（09） - Runnable：把写逻辑变成组装 chain


## Python 实现地图

Python 使用 `langchain_core.runnables` 的 `RunnableLambda`、`RunnableSequence`、`RunnableParallel`，同样提供 `invoke()`、`batch()`、`stream()`。

```python runnable file=main.py title="Python 本篇最小实验" description="运行本篇 Python 核心数据流。"
steps = [lambda value: value + 2, lambda value: value * 3]
value = 4
for step in steps:
    value = step(value)
print(value)
```


> 读完后，你应能：
> - 给定“规范化问题、检索证据、生成答案”三段胶水代码，能将它们改成有稳定输入输出的 Runnable chain，并用 Trace 证明步骤顺序与结果没有改变。
> - 给定一个字典状态，能画出每个 Runnable 的字段契约，并用缺少 `question` 或 `documents` 的失败输出验证错误发生在正确边界。
> - 给定“同时计算检索证据与问题特征”的需求，能用并行映射和分支组装数据流，并用命中、未命中两组输出验收路由结果。
> - 给定多个输入或需要边生成边展示的场景，能在 `invoke`、`batch` 和 `stream` 之间做选择，并用输出数量、顺序和分块日志验证调用方式。

# 一、Runnable 是什么：它如何替代不断增长的胶水代码？

Runnable 是 LangChain 组件共用的执行协议。一个 Runnable 接收明确输入、产生明确输出，并统一暴露 `invoke`、`batch`、`stream` 等执行方式；chain 则把前一个 Runnable 的输出交给后一个 Runnable。

假设要完成一个最小知识问答流程：

1. 清理用户问题中多余的空格。
2. 根据问题检索证据。
3. 把证据和问题组装成 Prompt。
4. 调用模型。
5. 把模型输出解析成页面需要的结构。

直接写函数并没有错。问题出现在“连接”的地方：

- 上一步返回字符串，下一步却以为是字典。
- 为了打日志，每个函数外面都要再包一层。
- 想把检索器换成测试替身时，主流程也要改。
- 想批量运行或流式输出时，又要写一套调度逻辑。

Runnable 解决的就是这个连接问题。

它不是新的业务算法，而是给每个步骤套上相同的插头：都能 `invoke`，都可以组合，都能接收运行配置。

## 1.1 第一个实验：函数调用和 chain 的差别在哪里？

下面用确定性的假检索器和假模型对比两种写法。

这段代码不需要 API Key，因为它只验证组装方式，不验证模型连接。

```python runnable file=main.py title="胶水代码与 chain 对比" description="运行同一组步骤的两种组装方式，对比结果与 Trace。"
"""对比手写调用和 Runnable chain 的数据流。"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

# 每一步共享的状态字典。
Payload = dict[str, Any]
# 单个步骤的函数类型。
Step = Callable[[Payload], Payload]


def normalize(payload: Payload) -> Payload:
    """清理问题中连续空白。

    Args:
        payload: 必须包含 question 的上游状态。
    """
    # 上游传入的原始问题。
    question = str(payload.get("question", ""))
    return {**payload, "question": " ".join(question.split())}


def retrieve(payload: Payload) -> Payload:
    """为报销问题返回固定证据。

    Args:
        payload: 已经规范化 question 的状态。
    """
    # 教学示例使用的可重放证据。
    document = "[policy#1] 报销应在消费后 30 天内提交。"
    return {**payload, "documents": [document]}


def answer(payload: Payload) -> Payload:
    """从第一条证据生成可回链的答案。

    Args:
        payload: 包含 documents 的检索状态。
    """
    # 检索器产生的证据列表。
    documents = payload.get("documents", [])
    return {**payload, "answer": f"答案：{documents[0]}"}


@dataclass(frozen=True, slots=True)
class Runnable:
    """用统一 invoke 接口包装一个数据转换步骤。"""

    # Trace 中展示的步骤名。
    name: str
    # 当前步骤执行的函数。
    step: Step

    def invoke(self, payload: Payload) -> Payload:
        """执行当前步骤。

        Args:
            payload: 上游 Runnable 产生的状态。
        """
        print(f"[{self.name}] input={sorted(payload)}")
        # 当前步骤执行后的新状态。
        result = self.step(payload)
        print(f"[{self.name}] output={sorted(result)}")
        return result

    def pipe(self, next_runnable: "Runnable") -> "Runnable":
        """把当前输出交给下一个 Runnable。

        Args:
            next_runnable: 接收当前输出的下游步骤。
        """
        def composed(payload: Payload) -> Payload:
            """依次运行组合前后的两个步骤。

            Args:
                payload: 组合链的初始状态。
            """
            # 前半段 chain 生成的中间状态。
            intermediate = self.invoke(payload)
            return next_runnable.invoke(intermediate)

        return Runnable(f"{self.name} | {next_runnable.name}", composed)


def main() -> None:
    """对比胶水调用和组装后的 chain。"""
    # 两种写法共用的测试输入。
    input_payload = {"question": "报销   期限是多少？"}

    # 手写胶水代码的最终状态。
    imperative_result = answer(retrieve(normalize(input_payload)))
    print("胶水代码结果：", imperative_result["answer"])

    # 可独立替换的问题规范化步骤。
    normalize_runnable = Runnable("normalize", normalize)
    # 可独立替换的检索步骤。
    retrieve_runnable = Runnable("retrieve", retrieve)
    # 可独立替换的答案生成步骤。
    answer_runnable = Runnable("answer", answer)
    # 三个步骤组成的固定数据流。
    chain = normalize_runnable.pipe(retrieve_runnable).pipe(answer_runnable)
    # chain 运行后的最终状态。
    chain_result = chain.invoke(input_payload)
    print("chain 结果：", chain_result["answer"])
    print("结果一致：", imperative_result == chain_result)


if __name__ == "__main__":
    main()
```

## 1.2 运行后要看什么？

成功输出应证明三件事：

1. 胶水代码和 chain 返回完全相同的状态。
2. Trace 按 `normalize -> retrieve -> answer` 的顺序出现。
3. 每个步骤都能看到输入字段和新增字段。

这里的收益不是代码变短。

实际上，包装 `Runnable` 后行数可能更多。真正的收益是调用协议统一，之后才能统一地加批处理、流式、配置和 Trace。

# 二、写 chain 前先把数据形状定清楚

LCEL（LangChain Expression Language）的 `a | b | c` 看起来像把函数串起来。

但是“能串”不等于“串对了”。

链路是否正确，取决于每个边界的数据形状：

| 步骤 | 必需输入 | 新增输出 | 失败信号 |
| --- | --- | --- | --- |
| Normalize | `question: str` | 规范化后的 `question` | 空字符串或类型错误 |
| Retriever | `question: str` | `documents: list[str]` | 字段缺失或检索器异常 |
| Prompt | `question` + `documents` | `prompt: str` | 证据类型不对 |
| Model | `prompt: str` | 模型消息 | 认证、超时、限流 |
| Parser | 模型消息 | 业务结构 | 格式不符合契约 |

先写这张表，再写 `|`。

否则 LCEL 只是把数据错误藏在更短的语法里。

## 2.1 第二个实验：让错误在第一个失效边界停下

这段实验故意运行一次正常输入和两次错误输入。

目标不是“不报错”，而是让错误明确说出哪个字段不合格。

```python runnable file=main.py title="Runnable 数据契约" description="用正常、缺字段和错类型输入，观察错误在哪个边界停下。"
"""验证 Runnable 之间的字段契约。"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

# 整条链传递的状态字典。
Payload = dict[str, Any]
# 契约校验后的处理函数类型。
Handler = Callable[[Payload], Payload]


@dataclass(frozen=True, slots=True)
class ContractRunnable:
    """执行前校验必需字段的 Runnable。"""

    # 错误和 Trace 中使用的稳定步骤名。
    name: str
    # 当前步骤要求存在的字段名。
    required_fields: tuple[str, ...]
    # 通过契约后执行的处理函数。
    handler: Handler

    def invoke(self, payload: Payload) -> Payload:
        """校验字段后执行当前步骤。

        Args:
            payload: 上游传入的完整状态。
        """
        # 当前输入中缺失的必需字段。
        missing_fields = [field for field in self.required_fields if field not in payload]
        if missing_fields:
            raise ValueError(f"{self.name}: 缺少字段 {missing_fields}")
        return self.handler(payload)

    def pipe(self, next_runnable: "ContractRunnable") -> "ContractRunnable":
        """组合当前步骤与下游步骤。

        Args:
            next_runnable: 接收当前执行结果的步骤。
        """
        def composed(payload: Payload) -> Payload:
            """按顺序执行两个契约步骤。

            Args:
                payload: 组合链的初始状态。
            """
            # 通过第一个契约后的中间状态。
            intermediate = self.invoke(payload)
            return next_runnable.invoke(intermediate)

        return ContractRunnable(
            name=f"{self.name} | {next_runnable.name}",
            required_fields=self.required_fields,
            handler=composed,
        )


def normalize_question(payload: Payload) -> Payload:
    """校验并规范化 question。

    Args:
        payload: 已包含 question 的状态。
    """
    # 未经类型校验的问题值。
    question = payload["question"]
    if not isinstance(question, str) or not question.strip():
        raise TypeError("normalize: question 必须是非空字符串")
    return {**payload, "question": " ".join(question.split())}


def render_prompt(payload: Payload) -> Payload:
    """从问题和证据列表构建 Prompt。

    Args:
        payload: 必须包含 question 和 documents 的状态。
    """
    # 待写入 Prompt 的证据列表。
    documents = payload["documents"]
    if not isinstance(documents, list):
        raise TypeError("prompt: documents 必须是列表")
    # 多条证据合并后的文本。
    context = "\n".join(str(document) for document in documents) or "无可用证据"
    return {
        **payload,
        "prompt": f"只能根据证据回答。\n证据：{context}\n问题：{payload['question']}",
    }


def run_case(chain: ContractRunnable, label: str, payload: Payload) -> None:
    """运行一个用例并打印结果或错误。

    Args:
        chain: 要验证的组合链。
        label: 当前用例的可读名称。
        payload: 当前用例的初始状态。
    """
    print(f"\n=== {label} ===")
    try:
        # 当前用例执行成功后的状态。
        result = chain.invoke(payload)
        print(result["prompt"])
    except (TypeError, ValueError) as error:
        print(f"契约失败：{error}")


def main() -> None:
    """运行正常、缺字段和错类型三个用例。"""
    # 保证 question 可用的第一个步骤。
    normalize = ContractRunnable("normalize", ("question",), normalize_question)
    # 要求 question 和 documents 的 Prompt 步骤。
    prompt = ContractRunnable("prompt", ("question", "documents"), render_prompt)
    # 两个明确契约组成的测试链。
    chain = normalize.pipe(prompt)

    run_case(chain, "正常输入", {"question": "如何报销？", "documents": ["消费后 30 天内提交"]})
    run_case(chain, "缺少 documents", {"question": "如何报销？"})
    run_case(chain, "question 类型错误", {"question": 42, "documents": []})


if __name__ == "__main__":
    main()
```

## 2.2 契约不是为了让类型看起来更漂亮

这个实验应该出现两类不同错误：

- 缺少 `documents` 时，错误来自 Prompt 的必需字段检查。
- `question` 是数字时，错误来自 Normalize 的类型检查。

如果两个错误都等到模型调用后才出现，就说明失败太晚了。

生产中这会额外消耗模型配额，还会让一个输入错误看起来像模型错误。

# 三、数据不是只能一步接一步

顺序链适合明确的前后依赖。

但有些计算互不依赖：

- 用问题去检索证据。
- 同时计算问题长度和语言。
- 保留原始问题，供后面构建 Prompt。

这时如果强行串行，数据流会变得别扭。

LangChain 里常用 `RunnableParallel` 或字典映射同时构造多个字段，再让下游统一消费。

## 3.1 第三个实验：并行构造上下文，再按证据分支

下面的 `parallel_map` 模拟 `RunnableParallel`，`choose_answer` 模拟 `RunnableBranch`。

教学代码按顺序执行映射函数，目的是展示字段汇合契约，不宣称真实并发性能。

```python runnable file=main.py title="并行映射与分支" description="对同一问题构造多个字段，然后用证据是否命中选择答案分支。"
"""模拟 RunnableParallel 与 RunnableBranch 的数据形状。"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

# 并行映射后共享的状态字典。
Payload = dict[str, Any]
# 从原始输入计算一个字段的函数类型。
Mapper = Callable[[Payload], Any]


def retrieve_documents(payload: Payload) -> list[str]:
    """根据问题关键词返回演示证据。

    Args:
        payload: 包含 question 的原始输入。
    """
    # 待检索的用户问题。
    question = str(payload.get("question", ""))
    if "退款" in question:
        return ["[refund#1] 退款审核通过后三个工作日内到账。"]
    return []


def count_question_characters(payload: Payload) -> int:
    """计算去除首尾空白后的问题长度。

    Args:
        payload: 包含 question 的原始输入。
    """
    # 参与长度计算的问题文本。
    question = str(payload.get("question", "")).strip()
    return len(question)


def keep_question(payload: Payload) -> str:
    """保留下游仍然需要的问题。

    Args:
        payload: 包含 question 的原始输入。
    """
    return str(payload.get("question", "")).strip()


def parallel_map(payload: Payload, mapping: dict[str, Mapper]) -> Payload:
    """从同一输入独立计算多个输出字段。

    Args:
        payload: 每个映射函数共享的原始输入。
        mapping: 输出字段到计算函数的映射。
    """
    # 各映射函数计算后的合并结果。
    mapped_payload = {field: mapper(payload) for field, mapper in mapping.items()}
    print("并行映射字段：", sorted(mapped_payload))
    return mapped_payload


def choose_answer(payload: Payload) -> Payload:
    """根据证据是否存在选择回答或拒答。

    Args:
        payload: 包含 question、documents 和 question_length 的汇合状态。
    """
    # 检索映射产生的证据列表。
    documents = payload.get("documents", [])
    if documents:
        return {
            **payload,
            "route": "grounded_answer",
            "answer": f"根据 {documents[0]}",
        }
    return {
        **payload,
        "route": "no_context",
        "answer": "没有检索到证据，暂时不能回答。",
    }


def run_case(question: str) -> None:
    """运行一个并行映射与分支用例。

    Args:
        question: 待检索和分支的用户问题。
    """
    # 当前用例的原始输入。
    input_payload = {"question": question}
    # 模拟 RunnableParallel 的字段计算配置。
    field_mapping = {
        "question": keep_question,
        "documents": retrieve_documents,
        "question_length": count_question_characters,
    }
    # 同一输入计算出的三个字段。
    enriched_payload = parallel_map(input_payload, field_mapping)
    # 根据证据状态选定分支后的结果。
    result = choose_answer(enriched_payload)
    print(f"问题：{result['question']}")
    print(f"路由：{result['route']}")
    print(f"答案：{result['answer']}")


def main() -> None:
    """运行检索命中和未命中两条分支。"""
    print("=== 命中证据 ===")
    run_case("退款多久到账？")
    print("\n=== 未命中证据 ===")
    run_case("今天天气怎么样？")


if __name__ == "__main__":
    main()
```

## 3.2 从输出判断映射和分支是否正确

命中问题应该走 `grounded_answer`，并保留 `[refund#1]` 证据编号。

未命中问题应该走 `no_context`，不能编造天气答案。

这个输出同时证明：

- 映射后的字段名是 `question`、`documents`、`question_length`。
- 分支判断只依赖结构化字段，不依赖隐藏的全局变量。
- 拒答是一条可测试的显式路由，不是 Prompt 里一句无法验收的期望。

# 四、invoke、batch 和 stream 不是三套业务逻辑

Runnable 把“步骤做什么”与“如何调度步骤”分开。

| 调用方式 | 输入 | 输出 | 适合场景 | 主要风险 |
| --- | --- | --- | --- | --- |
| `invoke` | 一个输入 | 一个完整结果 | 调试、同步接口 | 长回答首屏等待久 |
| `batch` | 多个输入 | 与输入对应的多个结果 | 离线评测、批量生成 | 并发过高触发限流 |
| `stream` | 一个输入 | 持续到达的分块 | 对话界面、长文本 | 中途失败时结果不完整 |

这三种方式应该复用同一个核心处理函数。

如果为 `batch` 复制一份 Prompt，为 `stream` 又复制一份 Prompt，三条路径很快就会行为不一致。

## 4.1 第四个实验：用同一个 Runnable 切换调用方式

这里用确定性字符串处理模拟模型输出。

`stream` 按单词分块，用来展示消费端如何逐块接收，不代表任何真实模型的 Token 切分规则。

```python runnable file=main.py title="invoke、batch 与 stream" description="对同一个 Runnable 分别执行单调用、批处理和分块输出。"
"""用一个 Runnable 展示 invoke、batch 和 stream。"""

from __future__ import annotations

from collections.abc import Callable, Iterator
from dataclasses import dataclass

# 单次调用的字符串处理函数。
TextHandler = Callable[[str], str]


@dataclass(frozen=True, slots=True)
class TextRunnable:
    """为同一文本处理逻辑提供三种调用方式。"""

    # 当前 Runnable 的可观测名称。
    name: str
    # 三种调用方式共享的核心处理函数。
    handler: TextHandler

    def invoke(self, value: str) -> str:
        """同步处理一个输入。

        Args:
            value: 单次调用的原始文本。
        """
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"{self.name}: 输入必须是非空字符串")
        return self.handler(value.strip())

    def batch(self, values: list[str]) -> list[str]:
        """保持顺序处理多个输入。

        Args:
            values: 待批量处理的文本列表。
        """
        return [self.invoke(value) for value in values]

    def stream(self, value: str) -> Iterator[str]:
        """把完整结果按单词逐块产生。

        Args:
            value: 待执行和分块的单个输入。
        """
        # 核心处理函数返回的完整结果。
        complete_result = self.invoke(value)
        for word in complete_result.split():
            yield f"{word} "


def explain_runnable(topic: str) -> str:
    """返回确定性的教学解释。

    Args:
        topic: 待解释的技术主题。
    """
    return f"{topic}: 统一调用协议，让步骤可以组合。"


def main() -> None:
    """执行 invoke、batch 和 stream 三条调度路径。"""
    # 三种调用方式共用的 Runnable。
    runnable = TextRunnable("explain", explain_runnable)

    # 单输入的完整结果。
    invoke_result = runnable.invoke("Runnable")
    print("invoke:", invoke_result)

    # 两个输入按原顺序得到的结果列表。
    batch_results = runnable.batch(["Runnable", "LCEL"])
    print("batch 数量:", len(batch_results))
    for index, result in enumerate(batch_results, start=1):
        print(f"batch[{index}]: {result}")

    print("stream 分块:")
    for chunk in runnable.stream("Runnable"):
        print(repr(chunk))


if __name__ == "__main__":
    main()
```

## 4.2 调用方式的验收证据

运行结果应该满足：

- `invoke` 只返回一个完整字符串。
- `batch` 返回两个结果，且与输入顺序对应。
- `stream` 返回多个分块，把分块拼起来后与 `invoke` 语义一致。

真实 LangChain 可能为 `batch` 使用并发，也可能从模型直接获得流式 chunk。

但业务层仍要验证输入顺序、中途失败、并发上限和部分输出处理。

# 五、这些教学类在真实 LangChain 里对应什么？

前面用标准库复现机制，是为了让每个实验在浏览器中直接运行。

它们不是 LangChain 源码的重新实现，也不应该被复制到生产项目代替官方类。

真实项目中的对应关系如下：

| 本文机制 | LangChain 常用对象 | 作用 |
| --- | --- | --- |
| `Runnable.invoke` | `RunnableLambda` 或其他 Runnable | 把普通函数适配到统一协议 |
| `pipe` | `a | b` 或 `a.pipe(b)` | 把上游输出交给下游 |
| `parallel_map` | `RunnableParallel` 或字典映射 | 从同一输入构建多个字段 |
| `keep_question` | `RunnablePassthrough` | 保留原始输入或追加字段 |
| `choose_answer` | `RunnableBranch` | 根据条件选择后续链路 |
| `try/except` 降级 | `with_fallbacks` | 主 Runnable 失败时运行备选方案 |
| 显式 Trace | Callback 或 LangSmith Trace | 记录步骤、耗时、输入输出和异常 |

安装 Python 依赖时使用 `python -m pip install "langchain-core>=1.0,<2.0"`。

具体项目应使用锁文件固定已验证版本，不要在生产部署时临时获取新版本。

## 5.1 怎么阅读一条真实 LCEL？

看到 `retriever | prompt | model | parser` 时，不要只把它念成四个名词。

按下面的顺序逐边检查：

1. `retriever` 接收字符串还是字典？
2. `retriever` 返回 `Document[]` 还是已合并的文本？
3. `prompt` 声明了哪些模板变量？
4. 供应商 `model` 返回哪种消息对象？
5. `parser` 输出普通字符串还是结构化业务对象？
6. 哪些步骤支持真正的流式，哪些步骤会缓冲完整结果？

只有这六个问题都有答案，这条链才是可理解的。

# 六、什么时候不应该把逻辑都塞进 chain？

Runnable 是组装工具，不是所有代码的唯一容器。

| 场景 | 建议 | 原因 |
| --- | --- | --- |
| 三个稳定转换，需要统一 Trace | 组成 chain | 输入输出简单，组合收益明确 |
| 大量循环、早退出和可变状态 | 保留普通函数 | 强行链式化会降低可读性 |
| 长时间持久化状态机 | 考虑 LangGraph | 需要 checkpoint、中断和恢复语义 |
| 单次固定的模型调用 | 可直接用供应商 SDK | 引入抽象的收益可能小于成本 |
| 关键业务决策 | 用命名函数或显式分支 | 避免把规则藏在多层 lambda 中 |

组装的目标是让边界更清楚。

如果一条 chain 需要不断在 lambda 中做字典解包、重组和隐式副作用，就应该停下来重新划分组件。

# 七、常见问题要怎么定位？

| 现象 | 根因 | 定位方法 | 修复方式 | 预防方式 |
| --- | --- | --- | --- | --- |
| Prompt 提示缺少变量 | 上游字段名与模板变量不同 | 在 Prompt 前记录字段名，不记录敏感值 | 统一字段契约或增加显式映射 | 为链路边界写契约测试 |
| 字符串被当成字典访问 | 组件输出类型判断错误 | 单独 `invoke` 上游组件并查看实际类型 | 增加 Parser 或改变下游契约 | 在组装前写输入输出表 |
| `batch` 频繁返回 429 | 并发超过供应商限制 | 记录每批并发数、RPM、TPM 和 429 比例 | 限制 `max_concurrency`，只对可重试错误退避 | 用压测确定默认并发上限 |
| 流式页面最后才一次性显示 | 中间 Runnable 缓冲了完整输出 | 对每个步骤记录首个 chunk 时间 | 替换阻断流式的组件或改变链路位置 | 对首 chunk 延迟设阈值 |
| fallback 把程序错误也吞掉 | 降级范围过宽 | 在降级记录原异常类型与步骤 | 只对明确的上游短暂错误 fallback | 用程序错误测试证明异常仍会上报 |

排查顺序应该从最小边界开始：

1. 单独 `invoke` 失败组件。
2. 保存它的实际输入类型和字段名。
3. 与契约表对比。
4. 修复一个边界后重放同一个失败样本。
5. 确认正常、边界和失败路径都没有回归。

# 八、组装好的 chain 应该如何验收？

- [ ] 每个 Runnable 都有明确输入类型、必需字段和输出类型。
- [ ] 单独 `invoke` 每个组件时，结果符合契约。
- [ ] 组合后的 chain 与原胶水代码在相同输入下结果一致。
- [ ] 空问题、缺字段和错类型能在模型调用前失败。
- [ ] 并行映射不会覆盖同名字段，分支条件有命中和未命中测试。
- [ ] `batch` 设置了可解释的并发上限，429 不会无限重试。
- [ ] `stream` 记录首 chunk 延迟，中途异常不会被当成完整成功。
- [ ] fallback 只处理已声明的可恢复错误，程序错误仍然上报。
- [ ] Trace 能定位到具体 Runnable，且不记录 API Key、完整敏感 Prompt 或隐私文档。
- [ ] 依赖版本已进入锁文件，升级后重跑契约与回归用例。

# 九、先补上 LangChain Prompt 输入契约

Runnable 组合之前，Prompt 的变量必须先成为可检查的输入契约。

下面的实验不访问模型，只验证消息角色、模板变量和缺失字段错误。

## 9.1 可运行实验：LangChain Prompt 模板变量与消息格式

```python runnable file=main.py title="LangChain Prompt 模板变量与消息格式" description="在浏览器中验证模板变量、消息角色和缺失字段错误。"
"""用标准库模拟 ChatPromptTemplate 的输入契约。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class MessageTemplate:
    """保存消息角色和带变量的文本模板。"""

    # 当前消息的角色，例如 system 或 human。
    role: str
    # 使用 str.format 语法的消息模板。
    template: str

    def format(self, values: dict[str, str]) -> dict[str, str]:
        """填充一条消息。

        Args:
            values: 本轮调用提供的模板变量。
        """
        try:
            # 格式化后的消息正文。
            content = self.template.format(**values)
        except KeyError as error:
            # 缺失的变量名。
            missing_name = str(error).strip("'")
            raise ValueError(f"缺少模板变量：{missing_name}") from error
        return {"role": self.role, "content": content}


def main() -> None:
    """格式化正常消息，并演示缺失变量时的快速失败。"""
    # 模板包含的两条消息。
    templates = [
        MessageTemplate("system", "只能根据资料回答。资料：{context}"),
        MessageTemplate("human", "问题：{question}"),
    ]
    # 正常调用使用的完整输入。
    valid_values = {
        "context": "报销应在消费后 30 天内提交。",
        "question": "报销期限是多少？",
    }
    # 格式化后的消息列表。
    messages = [template.format(valid_values) for template in templates]
    print("正常输入：")
    for message in messages:
        print(f"- {message['role']}: {message['content']}")

    try:
        # 故意缺少 context 的错误输入。
        invalid_values = {"question": "报销期限是多少？"}
        templates[0].format(invalid_values)
    except ValueError as error:
        print(f"\n契约检查：{error}")


if __name__ == "__main__":
    main()
```

运行通过需要同时看到两条消息和一次缺失 `context` 的错误。

这能证明失败停在模型调用之前，而不是等错误答案出现后再猜原因。

# 十、总结

- Runnable 的核心价值是统一调用、组合和配置协议，不是单纯缩短代码。
- LCEL 的 `|` 只负责连接步骤，数据形状是否匹配仍然由开发者负责。
- 组装前要写清每一步的必需输入、新增输出和失败信号，不要等模型调用后才发现字段错误。
- 顺序管道处理依赖关系，并行映射构造多个字段，分支根据显式条件选择后续路径。
- `invoke`、`batch` 和 `stream` 应复用同一条业务链；验收时分别检查单调用结果、输入顺序和分块语义。
- 复杂状态机不要强行塞进 LCEL；需要持久化、中断和恢复时应评估 LangGraph。
- 生产环境要限制批处理并发，正确处理流式中断，缩小 fallback 范围，并为每个 Runnable 保留可定位的 Trace。

## 参考资料

- [LangChain Runnable interface](https://docs.langchain.com/oss/python/langchain/overview)
- [LangChain Core Runnable reference](https://reference.langchain.com/python/langchain-core/runnables/)
