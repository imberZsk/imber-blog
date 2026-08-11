"""用面向对象的职责边界组装一个最小 AI 助手。"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class Memory:
    """保存当前会话消息。"""

    # 按发生顺序保存的会话消息。
    messages: list[str] = field(default_factory=list)

    def add(self, message: str) -> None:
        """追加一条消息；message 是要保存的文本。"""
        self.messages.append(message)


class Retriever:
    """封装知识检索逻辑。"""

    def __init__(self, documents: dict[str, str]) -> None:
        """初始化检索器；documents 是关键词到正文的映射。"""
        # 只由检索器访问的文档映射。
        self.documents = documents

    def search(self, question: str) -> str | None:
        """返回首个命中文档；question 是用户问题。"""
        for keyword, document in self.documents.items():
            if keyword in question:
                return document
        return None


class Assistant:
    """负责编排检索和记忆，不直接实现底层能力。"""

    def __init__(self, retriever: Retriever, memory: Memory) -> None:
        """注入检索器和会话记忆。"""
        # 当前助手使用的检索实现。
        self.retriever = retriever
        # 当前助手使用的会话记忆。
        self.memory = memory

    def ask(self, question: str) -> str:
        """回答问题并写入记忆；question 是用户问题。"""
        # 检索阶段返回的证据文本。
        evidence = self.retriever.search(question)
        # 有证据才回答，否则明确拒答。
        answer = evidence or "资料不足，无法回答。"
        self.memory.add(f"Q: {question}")
        self.memory.add(f"A: {answer}")
        return answer


def main() -> None:
    """组装对象并完成一次问答。"""
    # 入口只负责依赖组装。
    assistant = Assistant(Retriever({"报销": "报销需在 30 天内提交。"}), Memory())
    print(assistant.ask("报销期限是什么？"))
    print("会话记忆:", assistant.memory.messages)


if __name__ == "__main__":
    main()
