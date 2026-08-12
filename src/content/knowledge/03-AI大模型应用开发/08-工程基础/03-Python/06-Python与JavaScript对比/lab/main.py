"""用 Python 实现前端开发者熟悉的异步 AI 调用链。"""

from __future__ import annotations

import asyncio
import json


def retrieve(question: str) -> list[str]:
    """返回命中资料；question 对应 JavaScript 函数参数。"""
    # 离线实验使用的固定知识列表。
    documents = ["报销应在费用发生后 30 天内提交。", "年假需提前 3 天申请。"]
    return [document for document in documents if any(word in document for word in question if word.strip())][:1]


async def call_model(prompt: str) -> str:
    """模拟异步模型调用；prompt 是拼装后的完整提示词。"""
    await asyncio.sleep(0.01)
    # 模拟模型返回的结构化 JSON 字符串。
    return json.dumps({"answer": prompt.split("资料：", 1)[-1]}, ensure_ascii=False)


async def main() -> None:
    """执行清洗、检索、提示词拼装、异步调用和 JSON 解析。"""
    # Python strip 对应 JavaScript trim。
    question = "  报销什么时候提交？  ".strip()
    # Python 列表对应 JavaScript Array。
    evidence = retrieve(question)
    # Python f-string 对应 JavaScript 模板字符串。
    prompt = f"问题：{question}\n资料：{' '.join(evidence) or '无'}"
    # Python await 与 JavaScript await 语义一致。
    raw_response = await call_model(prompt)
    # Python dict 对应 JavaScript object。
    parsed_response = json.loads(raw_response)
    print(parsed_response)


if __name__ == "__main__":
    asyncio.run(main())
