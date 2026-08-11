"""用标准库实现 LangChain 核心抽象的等价 mini 版。"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class PromptTemplate:
    """保存并格式化提示词模板。"""

    # 使用 str.format 变量的模板文本。
    template: str

    def invoke(self, values: dict[str, Any]) -> str:
        """把输入字典填入模板。"""
        return self.template.format(**values)


class Runnable:
    """支持 LCEL 风格竖线组合的可运行单元。"""

    def __init__(self, function: Callable[[Any], Any]) -> None:
        """保存单元函数；function 接收上游输出。"""
        # 当前节点实际执行的函数。
        self.function = function

    def invoke(self, value: Any) -> Any:
        """执行当前单元。"""
        return self.function(value)

    def __or__(self, next_runnable: "Runnable") -> "Runnable":
        """把当前输出传给下一个 Runnable。"""
        return Runnable(lambda value: next_runnable.invoke(self.invoke(value)))


def main() -> None:
    """组装 Retriever | Prompt | LLM | Parser 链。"""
    # 模拟 Retriever 的可运行节点。
    retriever = Runnable(lambda question: {"question": question, "context": "报销需在 30 天内提交。"})
    # 格式化检索证据和问题的提示词模板。
    prompt_template = PromptTemplate("只按资料回答。资料：{context}\n问题：{question}")
    # Prompt 节点。
    prompt = Runnable(prompt_template.invoke)
    # 离线 LLM 节点。
    llm = Runnable(lambda formatted_prompt: f"模型收到提示词：{formatted_prompt}")
    # 输出解析节点。
    parser = Runnable(lambda output: {"answer": output, "parsed": True})
    # LCEL 风格组合后的完整链。
    chain = retriever | prompt | llm | parser
    print(chain.invoke("报销期限？"))


if __name__ == "__main__":
    main()
