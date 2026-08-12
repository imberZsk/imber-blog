"""离线演示 Chat API 消息结构与上下文成本。"""

from __future__ import annotations


def estimate_tokens(messages: list[dict[str, str]]) -> int:
    """粗略估算 token；messages 是发送给模型的完整消息列表。"""
    # 教学近似：中文字符按一个 token、英文按四字符一个 token。
    character_count = sum(len(message["content"]) for message in messages)
    return max(1, character_count // 2)


def mock_chat(messages: list[dict[str, str]]) -> dict[str, object]:
    """模拟兼容 Chat API 的响应；messages 包含 system/user/assistant 角色。"""
    # 最近一条用户消息决定本次离线回答。
    last_user_message = next(message["content"] for message in reversed(messages) if message["role"] == "user")
    # 请求输入 token 的近似值。
    prompt_tokens = estimate_tokens(messages)
    return {"message": {"role": "assistant", "content": f"已收到：{last_user_message}"}, "usage": {"prompt_tokens": prompt_tokens}}


def main() -> None:
    """连续发送三轮消息并展示上下文增长。"""
    # 每一轮都会原样再次发送的消息历史。
    messages = [{"role": "system", "content": "你是企业制度助手，只基于资料回答。"}]
    for question in ("报销期限？", "需要哪些材料？", "刚才两点总结一下"):
        messages.append({"role": "user", "content": question})
        # 当前轮的模拟 API 响应。
        response = mock_chat(messages)
        # 响应中的 assistant 消息需要加入下一轮上下文。
        assistant_message = response["message"]
        assert isinstance(assistant_message, dict)
        messages.append(assistant_message)
        print(f"轮次={len(messages) // 2} prompt_tokens≈{response['usage']['prompt_tokens']} 回答={assistant_message['content']}")


if __name__ == "__main__":
    main()
