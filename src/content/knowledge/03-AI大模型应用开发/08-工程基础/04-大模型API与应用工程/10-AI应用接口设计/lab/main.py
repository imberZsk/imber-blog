"""离线演示 requestId、鉴权和限流中间件。"""

from __future__ import annotations

import uuid
from collections import defaultdict
from dataclasses import dataclass

RATE_LIMIT = 2


@dataclass(slots=True)
class Request:
    """表示进入 AI 接口的最小请求。"""

    # 调用方身份令牌。
    authorization: str | None
    # 用于限流的调用方标识。
    client_id: str
    # 用户问题文本。
    message: str
    # 调用方可传入、也可由服务端生成的追踪标识。
    request_id: str | None = None


def handle_request(request: Request, counters: dict[str, int]) -> dict[str, object]:
    """依次执行追踪、鉴权、限流和业务处理；counters 保存客户端计数。"""
    # 每次请求都必须拥有可贯穿日志与响应的 requestId。
    request_id = request.request_id or uuid.uuid4().hex[:12]
    if request.authorization != "Bearer demo-token":
        return {"status": 401, "requestId": request_id, "error": "unauthorized"}
    counters[request.client_id] += 1
    if counters[request.client_id] > RATE_LIMIT:
        return {"status": 429, "requestId": request_id, "error": "rate_limited", "retryAfter": 60}
    return {"status": 200, "requestId": request_id, "answer": f"已处理：{request.message}"}


def main() -> None:
    """覆盖未鉴权、正常和超限三类请求。"""
    # 按 client_id 记录当前限流窗口内的请求量。
    counters: dict[str, int] = defaultdict(int)
    # 四次请求覆盖三层门卫的主要路径。
    requests = [
        Request(None, "client-a", "你好"),
        Request("Bearer demo-token", "client-a", "问题一"),
        Request("Bearer demo-token", "client-a", "问题二", "caller-request-id"),
        Request("Bearer demo-token", "client-a", "问题三"),
    ]
    for request in requests:
        print(handle_request(request, counters))


if __name__ == "__main__":
    main()
