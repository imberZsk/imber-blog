"""对比模糊提示词和可验证提示词的输出稳定性。"""

from __future__ import annotations

import json


def mock_model(prompt: str, feedback: str) -> str:
    """根据 prompt 约束程度返回模拟结果；feedback 是待分类反馈。"""
    # 结构化约束存在时返回可由程序稳定解析的 JSON。
    if "只输出 JSON" in prompt and "category" in prompt:
        # 根据反馈关键词决定离线分类。
        category = "refund" if "退款" in feedback else "other"
        return json.dumps({"category": category, "urgency": "high", "reason": "用户明确要求退款"}, ensure_ascii=False)
    return f"我认为这条反馈很紧急，可能与退款有关：{feedback}"


def main() -> None:
    """用同一条输入运行两类提示词并验证 JSON。"""
    # 待分类的真实用户反馈。
    feedback = "扣款两次，请马上退款"
    # 缺少角色、边界和格式约束的提示词。
    weak_prompt = "帮我分类用户反馈"
    # 包含任务、枚举、输出 schema 和禁止项的提示词。
    strong_prompt = '你是分类器。category 只能是 refund/other；只输出 JSON：{"category":"","urgency":"","reason":""}'
    for name, prompt in (("烂 prompt", weak_prompt), ("好 prompt", strong_prompt)):
        # 当前提示词对应的模型输出。
        output = mock_model(prompt, feedback)
        try:
            json.loads(output)
            parse_status = "可稳定解析"
        except json.JSONDecodeError:
            parse_status = "解析失败"
        print(f"{name}: {output}\n前端结果: {parse_status}\n")


if __name__ == "__main__":
    main()
