"""用最小代码对比裸模型与 RAG 问答。"""

from __future__ import annotations


def retrieve(question: str, documents: list[str]) -> list[str]:
    """按关键词召回资料；question 是问题，documents 是候选文档。"""
    # 从问题中提取的非空字符集合用于离线匹配。
    query_characters = {character for character in question if character.strip()}
    return [document for document in documents if len(query_characters & set(document)) >= 3]


def answer_with_rag(question: str, documents: list[str]) -> str:
    """只基于召回资料回答；无证据时拒答。"""
    # 当前问题命中的资料。
    evidence = retrieve(question, documents)
    if not evidence:
        return "资料不足，无法回答。"
    return f"根据资料：{evidence[0]} [来源 1]"


def main() -> None:
    """对两个问题展示裸模型和 RAG 的行为差异。"""
    # 可检索的企业私有知识。
    documents = ["公司报销需在费用发生后 30 天内提交。", "年假需提前 3 天申请。"]
    for question in ("公司报销期限是什么？", "公司食堂几点关门？"):
        print(f"问题：{question}")
        print("裸模型：我猜可能是 7 天。（无依据）")
        print("RAG：", answer_with_rag(question, documents), "\n")


if __name__ == "__main__":
    main()
