"""提供适合容器化的最小健康检查 HTTP 服务。"""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = "0.0.0.0"
DEFAULT_PORT = 8038


class HealthHandler(BaseHTTPRequestHandler):
    """提供根路径和健康检查接口。"""

    def do_GET(self) -> None:
        """返回应用状态，未知路径返回 404。"""
        # 不同路径对应的响应对象。
        payload = {"status": "ok", "service": "docker-demo"} if self.path in {"/", "/health"} else {"error": "not_found"}
        # 健康路径返回 200，其余返回 404。
        status_code = 200 if self.path in {"/", "/health"} else 404
        # 编码后的 JSON 响应体。
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format_string: str, *args: object) -> None:
        """保留容器友好的标准输出日志。"""
        print(f"{self.command} {self.path}")


def main() -> None:
    """从 PORT 环境变量读取端口并启动服务。"""
    # 平台可通过环境变量注入的监听端口。
    port = int(os.getenv("PORT", str(DEFAULT_PORT)))
    # 支持并发健康检查的 HTTP 服务。
    server = ThreadingHTTPServer((HOST, port), HealthHandler)
    print(f"service started on http://{HOST}:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("service stopped")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
