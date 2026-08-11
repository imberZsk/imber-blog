"""离线演示结构化输出的解析、修复、Schema 与业务校验。"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

# 允许模型输出的工单类别。
ALLOWED_CATEGORIES = {"refund", "delivery", "other"}
# 工单优先级允许的最小值。
MIN_PRIORITY = 1
# 工单优先级允许的最大值。
MAX_PRIORITY = 5


@dataclass(frozen=True, slots=True)
class Ticket:
    """保存完成 Schema 校验后的工单数据。"""

    # 工单业务类别。
    category: str
    # 一到五级的业务优先级。
    priority: int
    # 不包含额外解释的工单摘要。
    summary: str


def parse_json(model_text: str) -> dict[str, Any]:
    """解析纯 JSON 对象；model_text 是模型原始输出。"""
    # Python 标准库解析后的任意 JSON 值。
    parsed_value = json.loads(model_text)
    if not isinstance(parsed_value, dict):
        raise ValueError("顶层必须是 JSON object")
    return parsed_value


def repair_json(model_text: str) -> str:
    """提取首个 JSON 对象；model_text 可能包含模型解释文本。"""
    # 原始输出中第一个左花括号的位置。
    object_start = model_text.find("{")
    # 原始输出中最后一个右花括号的位置。
    object_end = model_text.rfind("}")
    if object_start < 0 or object_end <= object_start:
        raise ValueError("未找到可修复的 JSON object")
    return model_text[object_start : object_end + 1]


def validate_schema(payload: dict[str, Any]) -> Ticket:
    """校验字段、类型和取值；payload 是解析后的 JSON 对象。"""
    # Schema 要求且不允许缺失的字段集合。
    required_fields = {"category", "priority", "summary"}
    # 当前输出缺失的必填字段集合。
    missing_fields = required_fields - payload.keys()
    if missing_fields:
        raise ValueError(f"缺少字段: {sorted(missing_fields)}")

    # 模型输出中的工单类别。
    category = payload["category"]
    # 模型输出中的工单优先级。
    priority = payload["priority"]
    # 模型输出中的工单摘要。
    summary = payload["summary"]
    if not isinstance(category, str) or category not in ALLOWED_CATEGORIES:
        raise ValueError("category 不在允许枚举中")
    if not isinstance(priority, int) or isinstance(priority, bool):
        raise ValueError("priority 必须是整数")
    if not MIN_PRIORITY <= priority <= MAX_PRIORITY:
        raise ValueError("priority 必须在 1 到 5 之间")
    if not isinstance(summary, str) or not summary.strip() or len(summary) > 200:
        raise ValueError("summary 必须是 1 到 200 字的非空文本")
    return Ticket(category=category, priority=priority, summary=summary.strip())


def validate_business(ticket: Ticket, user_role: str) -> None:
    """执行后端业务规则；ticket 已通过 Schema，user_role 是真实权限角色。"""
    if ticket.priority == MAX_PRIORITY and user_role != "supervisor":
        raise PermissionError("普通客服不能直接创建 P5 紧急工单")


def process_output(model_text: str, user_role: str) -> Ticket:
    """处理一次模型输出；解析失败时只允许一次确定性修复。"""
    try:
        # 首次严格解析得到的 JSON 对象。
        payload = parse_json(model_text)
        print("parse: success without repair")
    except (json.JSONDecodeError, ValueError) as error:
        print(f"parse: failed ({error})")
        # 从解释文本中提取出的修复后 JSON 字符串。
        repaired_text = repair_json(model_text)
        print("retry: extracted JSON object")
        payload = parse_json(repaired_text)

    # 通过类型和取值约束的工单对象。
    ticket = validate_schema(payload)
    print("schema: valid")
    validate_business(ticket, user_role)
    print("business: allowed")
    return ticket


def main() -> None:
    """运行可修复输出和业务拒绝输出两个场景。"""
    # 包含额外解释但 JSON 内容合法的模型输出。
    repairable_output = '好的，结果如下：{"category":"refund","priority":2,"summary":"退款未到账"}'
    # Schema 合法但试图创建最高优先级工单的模型输出。
    forbidden_output = '{"category":"delivery","priority":5,"summary":"要求立即升级"}'

    print("=== 场景 1：脏输出经过一次修复 ===")
    # 第一场景最终得到的结构化工单。
    repaired_ticket = process_output(repairable_output, user_role="agent")
    print("result:", repaired_ticket)

    print("\n=== 场景 2：Schema 通过但业务规则拒绝 ===")
    try:
        process_output(forbidden_output, user_role="agent")
    except PermissionError as error:
        print("blocked:", error)


if __name__ == "__main__":
    main()
