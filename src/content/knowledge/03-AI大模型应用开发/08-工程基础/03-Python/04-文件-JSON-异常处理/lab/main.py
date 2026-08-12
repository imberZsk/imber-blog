"""安全读取配置并解析不稳定的模型 JSON 输出。"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


def read_config(file_path: Path) -> dict[str, Any]:
    """读取 JSON 配置；file_path 是配置路径，失败时返回带错误码的统一结构。"""
    try:
        # 从 UTF-8 文件读取的原始配置文本。
        raw_content = file_path.read_text(encoding="utf-8")
        return {"ok": True, "data": json.loads(raw_content), "error": None}
    except FileNotFoundError:
        return {"ok": False, "data": None, "error": "config_not_found"}
    except (OSError, json.JSONDecodeError) as error:
        return {"ok": False, "data": None, "error": f"invalid_config: {error}"}


def parse_model_json(raw_output: str) -> dict[str, Any]:
    """解析模型 JSON；raw_output 可包含 Markdown 代码围栏。"""
    # 去掉模型常见的 Markdown JSON 代码围栏。
    cleaned_output = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_output.strip(), flags=re.IGNORECASE)
    try:
        # 模型输出解析后的任意 JSON 值。
        parsed_data = json.loads(cleaned_output)
    except json.JSONDecodeError as error:
        return {"ok": False, "data": None, "error": f"invalid_model_json: {error.msg}"}
    if not isinstance(parsed_data, dict):
        return {"ok": False, "data": None, "error": "model_json_must_be_object"}
    return {"ok": True, "data": parsed_data, "error": None}


def main() -> None:
    """运行配置读取和三类模型输出解析案例。"""
    # 实验目录下可选的示例配置文件。
    config_path = Path(__file__).resolve().parent / "config.json"
    print("配置:", read_config(config_path))
    # 覆盖合法、代码围栏包裹和非法 JSON 三条路径。
    outputs = ['{"category":"refund"}', '```json\n{"category":"leave"}\n```', "不是 JSON"]
    for output in outputs:
        print("模型输出:", parse_model_json(output))


if __name__ == "__main__":
    main()
