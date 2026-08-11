"""用词袋向量和余弦相似度解释 Embedding 检索。"""

from __future__ import annotations

import math
import re
from collections import Counter


def tokenize(text: str) -> list[str]:
    """把中英文文本拆成教学用 token；text 是待向量化文本。"""
    return re.findall(r"[A-Za-z]+|[\u4e00-\u9fff]", text.lower())


def embed(text: str, vocabulary: list[str]) -> list[float]:
    """生成词频向量；vocabulary 定义每个维度的语义。"""
    # 当前文本的 token 频次。
    counts = Counter(tokenize(text))
    return [float(counts[token]) for token in vocabulary]


def cosine_similarity(left: list[float], right: list[float]) -> float:
    """计算两个等长向量的余弦相似度。"""
    # 两个向量的点积。
    dot_product = sum(a * b for a, b in zip(left, right, strict=True))
    # 左向量的 L2 范数。
    left_norm = math.sqrt(sum(value * value for value in left))
    # 右向量的 L2 范数。
    right_norm = math.sqrt(sum(value * value for value in right))
    return dot_product / (left_norm * right_norm) if left_norm and right_norm else 0.0


def main() -> None:
    """向量化一个问题和三段资料并按相似度排序。"""
    # 查询与候选文档。
    texts = ["报销需要什么发票", "报销必须提供发票", "年假提前申请", "服务器扩容方案"]
    # 所有文本共同决定的词表维度。
    vocabulary = sorted({token for text in texts for token in tokenize(text)})
    # 查询向量。
    query_vector = embed(texts[0], vocabulary)
    # 每段候选文档与查询的余弦得分。
    scored_documents = [(cosine_similarity(query_vector, embed(document, vocabulary)), document) for document in texts[1:]]
    for score, document in sorted(scored_documents, reverse=True):
        print(f"score={score:.3f} document={document}")


if __name__ == "__main__":
    main()
