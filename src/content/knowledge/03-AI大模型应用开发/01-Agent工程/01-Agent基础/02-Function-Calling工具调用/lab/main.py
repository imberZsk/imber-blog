"""演示模型提议、后端校验、执行和回传的工具调用闭环。"""

from __future__ import annotations

from typing import Any

ALLOWED_TOOLS = {"query_order"}
ORDER_DATABASE = {"A100": {"owner": "user-1", "status": "已发货"}}


def validate_and_execute(tool_call: dict[str, Any], current_user: str) -> dict[str, Any]:
    """校验并执行工具；tool_call 来自模型，current_user 是登录身份。"""
    # 模型提出的工具名不能直接信任。
    tool_name = tool_call.get("name")
    if tool_name not in ALLOWED_TOOLS:
        return {"ok": False, "error": "tool_not_allowed"}
    # 模型提出的参数需要做类型与必填校验。
    arguments = tool_call.get("arguments")
    order_id = arguments.get("order_id") if isinstance(arguments, dict) else None
    if not isinstance(order_id, str) or not order_id:
        return {"ok": False, "error": "invalid_arguments"}
    # 工具执行前必须按服务端身份做对象级权限校验。
    order = ORDER_DATABASE.get(order_id)
    if not order or order["owner"] != current_user:
        return {"ok": False, "error": "order_not_found_or_forbidden"}
    return {"ok": True, "data": {"order_id": order_id, "status": order["status"]}}


def main() -> None:
    """覆盖合法、参数错误、越权和未知工具调用。"""
    # 四个模型工具提议用于验证全部关键边界。
    calls = [
        {"name": "query_order", "arguments": {"order_id": "A100"}},
        {"name": "query_order", "arguments": {}},
        {"name": "query_order", "arguments": {"order_id": "B999"}},
        {"name": "delete_order", "arguments": {"order_id": "A100"}},
    ]
    for call in calls:
        print(f"模型提议={call} -> 后端结果={validate_and_execute(call, 'user-1')}")


if __name__ == "__main__":
    main()
