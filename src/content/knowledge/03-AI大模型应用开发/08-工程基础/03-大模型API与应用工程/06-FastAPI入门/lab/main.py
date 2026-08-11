"""用标准库实现最小问答 HTTP API。"""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

HOST = "127.0.0.1"
PORT = 8015


def answer_question(message: str) -> str:
    """返回离线知识库答案；message 是经过校验的用户问题。"""
    return "报销需在费用产生后 30 天内提交。" if "报销" in message else "资料不足，无法回答。"


class ChatHandler(BaseHTTPRequestHandler):
    """处理健康检查和问答请求。"""

    def send_json(self, status_code: int, payload: dict[str, Any]) -> None:
        """返回 JSON；status_code 是 HTTP 状态码，payload 是响应对象。"""
        # 编码后的 UTF-8 JSON 响应体。
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        """处理 GET /health，其他路径返回 404。"""
        if self.path == "/health":
            self.send_json(200, {"status": "ok"})
            return
        self.send_json(404, {"error": "not_found", "path": self.path})

    def do_POST(self) -> None:
        """处理 POST /api/chat，并覆盖 JSON 与字段校验。"""
        if self.path != "/api/chat":
            self.send_json(404, {"error": "not_found", "path": self.path})
            return
        # 客户端声明的请求体字节数。
        content_length = int(self.headers.get("Content-Length", "0"))
        try:
            # 解码后的请求 JSON 对象。
            payload = json.loads(self.rfile.read(content_length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "invalid_json", "detail": "请求体不是合法 JSON"})
            return
        # 去除空白后的用户问题。
        message = payload.get("message", "").strip() if isinstance(payload, dict) else ""
        if not message:
            self.send_json(400, {"error": "missing_field", "detail": "message 不能为空"})
            return
        self.send_json(200, {"answer": answer_question(message), "message": message, "error": None})

    def log_message(self, format_string: str, *args: object) -> None:
        """输出紧凑访问日志；format_string 和 args 由标准库传入。"""
        print(f"[访问] {self.command} {self.path} -> {args[1] if len(args) > 1 else '-'}")


def main() -> None:
    """启动线程 HTTP 服务，Ctrl+C 时正常退出。"""
    # 同时处理多个请求的本地 HTTP 服务。
    server = ThreadingHTTPServer((HOST, PORT), ChatHandler)
    print(f"服务已启动：http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
