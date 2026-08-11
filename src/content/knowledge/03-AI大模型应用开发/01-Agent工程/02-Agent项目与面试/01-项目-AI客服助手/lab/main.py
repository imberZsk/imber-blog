"""把 RAG、订单工具与人工工单接成客服闭环。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class CustomerRequest:
    """表示带身份的客服请求。"""

    # 已登录用户标识。
    user_id: str
    # 用户问题。
    question: str


def search_knowledge(question: str) -> str | None:
    """检索公开制度资料。"""
    return "退款将在审核通过后 3 个工作日到账。" if "退款" in question else None


def query_order(order_id: str, user_id: str) -> str | None:
    """按用户权限查询订单；order_id 和 user_id 必须同时匹配。"""
    # 模拟受权限保护的订单表。
    orders = {"A100": {"owner": "user-1", "status": "运输中"}}
    # 当前订单记录。
    order = orders.get(order_id)
    return order["status"] if order and order["owner"] == user_id else None


def handle_request(request: CustomerRequest) -> str:
    """按知识问答、业务工具、人工兜底顺序处理请求。"""
    # 制度类问题优先使用低风险 RAG。
    evidence = search_knowledge(request.question)
    if evidence:
        return f"{evidence} [客服制度]"
    if "订单" in request.question:
        # 实际项目应由结构化参数抽取器生成 order_id。
        order_status = query_order("A100", request.user_id)
        return f"订单 A100：{order_status}" if order_status else "无权查看该订单。"
    # 无证据且无适用工具时创建人工工单。
    ticket_id = f"T-{abs(hash(request.question)) % 10000:04d}"
    return f"无法可靠回答，已转人工，工单 {ticket_id}。"


def main() -> None:
    """覆盖 RAG、工具和人工三条客服路径。"""
    # 三类典型客服请求。
    requests = [CustomerRequest("user-1", "退款多久到？"), CustomerRequest("user-1", "我的订单到哪了？"), CustomerRequest("user-1", "商品颜色不喜欢怎么办？")]
    for request in requests:
        print(request.question, "->", handle_request(request))


if __name__ == "__main__":
    main()
