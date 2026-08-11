"""提供前端页面和带错误分支的最小 AI 接口。"""

from __future__ import annotations

import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = "127.0.0.1"
PORT = 8016
LAB_DIRECTORY = Path(__file__).resolve().parent


class DemoHandler(SimpleHTTPRequestHandler):
    """同时托管静态页面与 POST /api/chat。"""

    def __init__(self, *args: object, **kwargs: object) -> None:
        """固定静态文件根目录；其余参数由 HTTPServer 提供。"""
        super().__init__(*args, directory=str(LAB_DIRECTORY), **kwargs)

    def send_json(self, status_code: int, payload: dict[str, object]) -> None:
        """写入 JSON 响应；status_code 是状态码，payload 是响应对象。"""
        # 编码后的 JSON 响应体。
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        """校验用户输入并模拟成功或服务端错误。"""
        if self.path != "/api/chat":
            self.send_json(404, {"error": "not_found"})
            return
        # 请求体字节数。
        content_length = int(self.headers.get("Content-Length", "0"))
        try:
            # 前端提交的 JSON 对象。
            payload = json.loads(self.rfile.read(content_length))
        except json.JSONDecodeError:
            self.send_json(400, {"error": "invalid_json"})
            return
        # 清洗后的问题文本。
        message = payload.get("message", "").strip() if isinstance(payload, dict) else ""
        if not message:
            self.send_json(400, {"error": "message_required"})
            return
        if "报错" in message:
            self.send_json(500, {"error": "mock_model_error"})
            return
        self.send_json(200, {"answer": f"离线助手收到：{message}"})


def main() -> None:
    """启动前端与接口服务。"""
    # 支持并发静态资源和 API 请求的 HTTP 服务。
    server = ThreadingHTTPServer((HOST, PORT), DemoHandler)
    print(f"打开 http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
