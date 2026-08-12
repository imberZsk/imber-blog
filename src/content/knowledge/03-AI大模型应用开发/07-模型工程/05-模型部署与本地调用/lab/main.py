"""启动 OpenAI 兼容 mock 模型服务并用通用客户端调用。"""

from __future__ import annotations

import json
import threading
import time
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

HOST = "127.0.0.1"
PORT = 8039
BASE_URL = f"http://{HOST}:{PORT}/v1"


def fake_infer(message: str) -> str:
    """模拟模型推理；message 是最后一条用户消息。"""
    return "你好，我是本地 mock 模型，接口和 OpenAI 兼容。" if message == "你好" else f"我收到了你的问题：「{message}」。这是 mock 模型的回答。"


class MockModelHandler(BaseHTTPRequestHandler):
    """实现 POST /v1/chat/completions。"""

    def do_POST(self) -> None:
        """校验请求并返回 OpenAI 兼容响应。"""
        if self.path != "/v1/chat/completions":
            self.send_error(404)
            return
        # 客户端请求体长度。
        content_length = int(self.headers.get("Content-Length", "0"))
        # OpenAI 兼容的请求对象。
        request_payload = json.loads(self.rfile.read(content_length))
        # 最后一条用户消息。
        message = next(item["content"] for item in reversed(request_payload["messages"]) if item["role"] == "user")
        # mock 推理生成的回答。
        answer = fake_infer(message)
        # OpenAI 兼容响应对象。
        response = {
            "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
            "object": "chat.completion",
            "model": request_payload.get("model", "mock-model"),
            "choices": [{"index": 0, "message": {"role": "assistant", "content": answer}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": max(1, len(message) // 2), "completion_tokens": max(1, len(answer) // 2), "total_tokens": max(2, (len(message) + len(answer)) // 2)},
        }
        # 编码后的响应体。
        body = json.dumps(response, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format_string: str, *args: object) -> None:
        """关闭默认访问日志，保持实验输出聚焦。"""


def chat(message: str, base_url: str = BASE_URL) -> dict[str, Any]:
    """调用任意 OpenAI 兼容服务；message 是问题，base_url 可切换供应商。"""
    # OpenAI 兼容的请求对象。
    request_payload = {"model": "mock-model", "messages": [{"role": "user", "content": message}]}
    # 带 JSON 头的 HTTP 请求。
    request = urllib.request.Request(f"{base_url}/chat/completions", json.dumps(request_payload).encode("utf-8"), {"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.loads(response.read())


def main() -> None:
    """后台启动 mock 服务，调用两次后正常关闭。"""
    # 本次实验的本地模型服务。
    server = ThreadingHTTPServer((HOST, PORT), MockModelHandler)
    # 后台服务线程允许主线程执行客户端调用。
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.05)
    print(f"mock 模型服务已启动：{BASE_URL}/chat/completions")
    try:
        for message in ("你好", "请帮我总结一下 RAG 是什么"):
            # 通用客户端收到的完整响应。
            response = chat(message)
            print(f"\n请求：{message}\n回答：{response['choices'][0]['message']['content']}\n用量：{response['usage']}")
    finally:
        server.shutdown()
        server.server_close()
        server_thread.join(timeout=2)


if __name__ == "__main__":
    main()
