"""演示多轮历史在 token 预算内的压缩策略。"""

from __future__ import annotations

from dataclasses import dataclass, field

MAX_CONTEXT_CHARS = 90
RECENT_MESSAGE_COUNT = 4


@dataclass(slots=True)
class Conversation:
    """保存历史摘要和最近原文消息。"""

    # 被压缩后的早期事实摘要。
    summary: str = ""
    # 尚未压缩的最近消息。
    messages: list[str] = field(default_factory=list)

    def add_turn(self, user_message: str, assistant_message: str) -> None:
        """追加一轮并按预算压缩；两个参数分别是用户和助手文本。"""
        self.messages.extend([f"用户:{user_message}", f"助手:{assistant_message}"])
        # 当前上下文近似字符总量。
        total_chars = len(self.summary) + sum(len(message) for message in self.messages)
        if total_chars <= MAX_CONTEXT_CHARS:
            return
        # 超过预算时被摘要替换的旧消息。
        old_messages = self.messages[:-RECENT_MESSAGE_COUNT]
        self.messages = self.messages[-RECENT_MESSAGE_COUNT:]
        self.summary = (self.summary + "；" + " | ".join(old_messages)).strip("；")[-MAX_CONTEXT_CHARS:]

    def context(self) -> str:
        """返回下一轮发送给模型的摘要和最近消息。"""
        return f"历史摘要:{self.summary or '无'}\n最近消息:\n" + "\n".join(self.messages)


def main() -> None:
    """运行六轮会话并打印压缩时机和最终上下文。"""
    # 当前示例的会话状态。
    conversation = Conversation()
    # 六轮对话用于触发至少一次压缩。
    turns = [(f"第{index}轮问题：报销规则细节{index}", f"第{index}轮回答：请参考制度第{index}条") for index in range(1, 7)]
    for index, (question, answer) in enumerate(turns, start=1):
        conversation.add_turn(question, answer)
        print(f"第 {index} 轮后：摘要={bool(conversation.summary)}，保留原文={len(conversation.messages)} 条")
    print("\n最终发送上下文：\n" + conversation.context())


if __name__ == "__main__":
    main()
