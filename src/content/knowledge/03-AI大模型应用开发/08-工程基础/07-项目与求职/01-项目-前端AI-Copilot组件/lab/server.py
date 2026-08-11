"""提供订单页和带上下文白名单、人工确认的 Copilot API。"""

from __future__ import annotations

import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

HOST = "127.0.0.1"
PORT = 8046
LAB_DIRECTORY = Path(__file__).resolve().parent
ALLOWED_CONTEXT_FIELDS = {"selectedOrderId", "routeName"}
ORDERS = {"O-2026-0520": {"status": "退款中", "amount": 89, "abnormal": True}}


def sanitize_context(raw_context: object) -> dict[str, str]:
    """只保留后端允许的页面上下文字段。"""
    if not isinstance(raw_context, dict):
        return {}
    return {key: str(value) for key, value in raw_context.items() if key in ALLOWED_CONTEXT_FIELDS}


def handle_copilot(message: str, page_context: dict[str, str]) -> dict[str, Any]:
    """结合已脱敏上下文回答，写操作只返回待确认计划。"""
    # 当前页面选中的订单主键。
    order_id = page_context.get("selectedOrderId", "")
    # 服务端权限域内查询到的订单。
    order = ORDERS.get(order_id)
    # 可展示给用户的执行轨迹。
    trace = [f"读取页面上下文 selectedOrderId={order_id or '无'}"]
    if "工单" in message:
        trace.append("识别为写操作，暂停等待人工确认")
        return {"reply": "即将为当前订单创建人工工单，请确认。", "trace": trace, "needs_confirmation": True, "action": {"type": "create_ticket", "orderId": order_id}}
    if order:
        trace.append("命中订单数据，判定为异常订单" if order["abnormal"] else "命中正常订单")
        return {"reply": f"订单 {order_id} 状态为「{order['status']}」，金额 {order['amount']} 元，处于退款流程，属于需要关注的异常订单。", "trace": trace, "needs_confirmation": False}
    return {"reply": "没有可用订单上下文。", "trace": trace, "needs_confirmation": False}


class CopilotHandler(SimpleHTTPRequestHandler):
    """托管业务页面与 POST /api/copilot。"""

    def __init__(self, *args: object, **kwargs: object) -> None:
        """固定静态页面目录。"""
        super().__init__(*args, directory=str(LAB_DIRECTORY), **kwargs)

    def do_POST(self) -> None:
        """校验并处理 Copilot 请求。"""
        if self.path != "/api/copilot":
            self.send_error(404)
            return
        # HTTP 请求体长度。
        content_length = int(self.headers.get("Content-Length", "0"))
        try:
            # 前端提交的请求对象。
            payload = json.loads(self.rfile.read(content_length))
        except json.JSONDecodeError:
            self.send_error(400, "invalid_json")
            return
        # 清洗后的用户指令。
        message = payload.get("message", "").strip() if isinstance(payload, dict) else ""
        if not message:
            self.send_error(400, "message_required")
            return
        # 白名单过滤后的页面上下文。
        context = sanitize_context(payload.get("pageContext"))
        # Copilot 业务结果。
        response_payload = handle_copilot(message, context)
        # UTF-8 JSON 响应体。
        body = json.dumps(response_payload, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    """启动订单页和 Copilot API。"""
    # 支持静态页面与 API 并发的服务。
    server = ThreadingHTTPServer((HOST, PORT), CopilotHandler)
    print(f"打开 http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
