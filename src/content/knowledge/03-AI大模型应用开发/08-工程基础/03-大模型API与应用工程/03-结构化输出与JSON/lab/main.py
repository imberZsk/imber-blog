"""演示模型 JSON 输出的解析、校验、重试和兜底。"""

from __future__ import annotations

import json
import re
from typing import Any

ALLOWED_CATEGORIES = {"refund", "leave", "other"}


def parse_and_validate(raw_output: str) -> dict[str, Any]:
    """解析并校验模型输出；raw_output 是可能不合法的原始文本。"""
    # 去除模型常见的 Markdown 代码围栏。
    cleaned_output = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_output.strip(), flags=re.IGNORECASE)
    try:
        # JSON 解码后的候选对象。
        payload = json.loads(cleaned_output)
    except json.JSONDecodeError as error:
        return {"ok": False, "data": None, "error": f"invalid_json:{error.msg}"}
    if not isinstance(payload, dict):
        return {"ok": False, "data": None, "error": "not_object"}
    if payload.get("category") not in ALLOWED_CATEGORIES:
        return {"ok": False, "data": None, "error": "invalid_category"}
    if not isinstance(payload.get("confidence"), (int, float)) or not 0 <= payload["confidence"] <= 1:
        return {"ok": False, "data": None, "error": "invalid_confidence"}
    return {"ok": True, "data": payload, "error": None}


def main() -> None:
    """覆盖五种典型输出，并在失败时展示统一兜底。"""
    # 覆盖正常、围栏、枚举错误、类型错误和非法 JSON。
    outputs = [
        '{"category":"refund","confidence":0.92}',
        '```json\n{"category":"leave","confidence":0.8}\n```',
        '{"category":"unknown","confidence":0.7}',
        '{"category":"refund","confidence":"high"}',
        "category=refund",
    ]
    for index, output in enumerate(outputs, start=1):
        # 当前案例的校验结果。
        result = parse_and_validate(output)
        # 生产代码可在此触发一次格式修复重试；重试仍失败才兜底。
        final_result = result if result["ok"] else {"ok": False, "data": {"category": "other", "confidence": 0}, "error": result["error"]}
        print(f"案例 {index}: {final_result}")


if __name__ == "__main__":
    main()
