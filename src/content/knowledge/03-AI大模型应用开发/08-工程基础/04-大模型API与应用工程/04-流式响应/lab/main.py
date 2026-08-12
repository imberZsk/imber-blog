"""用生成器演示 token 流、SSE 报文和主动停止。"""

from __future__ import annotations

import json
import time
from collections.abc import Iterator


def stream_tokens(text: str, delay_seconds: float = 0.01) -> Iterator[str]:
    """逐字符产出文本；text 是完整回答，delay_seconds 是演示延迟。"""
    for character in text:
        time.sleep(delay_seconds)
        yield character


def to_sse(token: str) -> str:
    """把单个 token 编码成 SSE data 事件；token 是当前增量文本。"""
    # ensure_ascii=False 保持中文报文可读。
    payload = json.dumps({"delta": token}, ensure_ascii=False)
    return f"data: {payload}\n\n"


def main() -> None:
    """依次演示完整流、SSE 格式和客户端中断。"""
    # 模拟模型最终会生成的完整回答。
    answer = "流式响应可以降低首字等待时间。"
    print("场景 1：终端打字机")
    for token in stream_tokens(answer):
        print(token, end="", flush=True)
    print("\n\n场景 2：前三个 SSE 事件")
    for token in list(answer)[:3]:
        print(to_sse(token), end="")
    print("场景 3：生成 6 个字符后停止")
    # 已发送给客户端的 token 数量。
    sent_count = 0
    for token in stream_tokens(answer, delay_seconds=0):
        if sent_count >= 6:
            print("[客户端取消，服务端停止读取流]")
            break
        print(token, end="")
        sent_count += 1


if __name__ == "__main__":
    main()
