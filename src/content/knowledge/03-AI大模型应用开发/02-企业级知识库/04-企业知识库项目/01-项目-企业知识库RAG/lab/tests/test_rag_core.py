"""企业 RAG 核心的离线单元测试。"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

LAB_DIRECTORY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(LAB_DIRECTORY))

from rag_core import EMBEDDING_DIMENSIONS, LocalEmbeddingModel, split_markdown  # noqa: E402


class RagCoreTest(unittest.TestCase):
    """验证稳定向量、结构切分与权限元数据。"""

    def test_embedding_is_stable_and_normalized(self) -> None:
        """相同文本应生成相同且固定维度的单位向量。"""
        # 当前测试的本地 Embedding 模型。
        model = LocalEmbeddingModel()
        # 第一次生成的向量。
        first = model.embed("报销需要发票")
        # 同一文本第二次生成的向量。
        second = model.embed("报销需要发票")
        self.assertEqual(first, second)
        self.assertEqual(len(first), EMBEDDING_DIMENSIONS)
        self.assertAlmostEqual(sum(value * value for value in first), 1.0)

    def test_chunk_keeps_section_and_acl(self) -> None:
        """切分结果必须保留章节、租户和 ACL。"""
        # 两级标题构成的测试文档。
        markdown = "# 报销制度\n## 时限\n员工需要在30天内提交。"
        # 当前文档生成的文本块。
        chunks = split_markdown(markdown, "报销制度", "policy.md", "tenant-a", "finance")
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].section, "报销制度/时限")
        self.assertEqual(chunks[0].tenant_id, "tenant-a")
        self.assertEqual(chunks[0].acl, "finance")


if __name__ == "__main__":
    unittest.main()
