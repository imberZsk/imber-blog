"""用内存结构实现向量数据库的 add 与 topK search。"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class VectorRecord:
    """保存向量、正文和过滤元数据。"""

    # 业务侧稳定主键。
    record_id: str
    # 用于相似度检索的向量。
    vector: tuple[float, ...]
    # 返回给生成阶段的正文。
    text: str
    # 用于权限或租户过滤的元数据。
    metadata: dict[str, str]


class MiniVectorStore:
    """提供最小向量入库和检索能力。"""

    def __init__(self) -> None:
        """初始化空记录集合。"""
        # 当前库中的全部向量记录。
        self.records: list[VectorRecord] = []

    def add(self, record: VectorRecord) -> None:
        """写入一条记录；record 包含向量和业务字段。"""
        self.records.append(record)

    def search(self, query_vector: tuple[float, ...], top_k: int, tenant_id: str) -> list[tuple[float, VectorRecord]]:
        """按租户过滤并返回 topK；query_vector 是查询向量。"""
        # 已执行权限过滤的候选得分。
        scored_records = [
            (self.cosine(query_vector, record.vector), record)
            for record in self.records
            if record.metadata.get("tenant_id") == tenant_id
        ]
        return sorted(scored_records, key=lambda item: item[0], reverse=True)[:top_k]

    @staticmethod
    def cosine(left: tuple[float, ...], right: tuple[float, ...]) -> float:
        """计算两个向量的余弦相似度。"""
        # 向量点积。
        dot_product = sum(a * b for a, b in zip(left, right, strict=True))
        # 两个向量范数的乘积。
        norm_product = math.sqrt(sum(a * a for a in left)) * math.sqrt(sum(b * b for b in right))
        return dot_product / norm_product if norm_product else 0.0


def main() -> None:
    """写入三条记录并验证租户过滤和 topK。"""
    # 当前实验的内存向量库。
    store = MiniVectorStore()
    store.add(VectorRecord("1", (1.0, 0.0), "报销制度", {"tenant_id": "a"}))
    store.add(VectorRecord("2", (0.8, 0.2), "发票要求", {"tenant_id": "a"}))
    store.add(VectorRecord("3", (1.0, 0.0), "其它租户机密", {"tenant_id": "b"}))
    for score, record in store.search((1.0, 0.0), top_k=2, tenant_id="a"):
        print(f"score={score:.3f} id={record.record_id} text={record.text} tenant={record.metadata['tenant_id']}")


if __name__ == "__main__":
    main()
