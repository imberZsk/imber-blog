"""演示初排召回与精细重排的职责差异。"""

from __future__ import annotations

import re


def terms(text: str) -> set[str]:
    """提取教学用字符词项；text 是查询或候选正文。"""
    return set(re.findall(r"[A-Za-z]+|[\u4e00-\u9fff]", text.lower()))


def recall_score(query: str, document: str) -> float:
    """用词项交集模拟快速初排。"""
    return float(len(terms(query) & terms(document)))


def rerank_score(query: str, document: str) -> float:
    """用完整意图特征模拟较慢但更准的交叉编码器重排。"""
    # 初排分数作为重排基础特征。
    base_score = recall_score(query, document)
    # 同时出现期限意图和报销主题时给予更高权重。
    intent_bonus = 5.0 if "多久" in query and ("30天" in document or "期限" in document) else 0.0
    return base_score + intent_bonus


def main() -> None:
    """对候选集分别打印初排和重排顺序。"""
    # 用户真实检索意图。
    query = "报销多久内提交"
    # 已由低成本检索召回的候选文档。
    candidates = ["报销系统提交入口", "报销需在费用发生后30天内提交", "提交年假申请", "报销发票要求"]
    # 初排只负责高召回率。
    recalled = sorted(candidates, key=lambda document: recall_score(query, document), reverse=True)
    # 重排只处理有限候选，提升 top1 精度。
    reranked = sorted(recalled, key=lambda document: rerank_score(query, document), reverse=True)
    print("初排:", recalled)
    print("重排:", reranked)


if __name__ == "__main__":
    main()
