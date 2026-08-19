# LangChain（07） - 最小 RAG 实战：Loader、Splitter、Milvus 与电子书检索


## Python 实现地图

Python 链路是 Loader -> `langchain_text_splitters` -> Embeddings -> `langchain_milvus` -> Retriever。离线阶段用 `from_documents()` 建库，在线阶段用 `as_retriever()` 和 `invoke()` 检索。

```python runnable file=main.py title="Python 最小 RAG 流程" description="模拟检索命中后生成带来源的答案。"
hit = {"content": "RAG 先检索证据，再生成答案。", "metadata": {"chapter": 3, "page": 42}}
print(f"答案：{hit['content']}\n来源：第 {hit['metadata']['chapter']} 章，第 {hit['metadata']['page']} 页")
```


> 读完后，你应能完成以下任务：
> - 绘制“Milvus（02） - Milvus RAG 实战：电子书离线建库与引用问答 / 项目目标和数据契约”的关键对象与数据流，解释“引用只从这些字段映射，不能让模型自由编页码。”，并用源码位置、日志或 Trace 标注证据。
> - 为“Milvus（02） - Milvus RAG 实战：电子书离线建库与引用问答 / 离线建库骨架”设计正常与异常输入，验证“离线任务要记录文档版本、每批状态与失败原因；”，输出首个偏差位置与回归测试结果。
> - 实现“Milvus（02） - Milvus RAG 实战：电子书离线建库与引用问答 / 在线问答链路”的最小代码或配置，检验“校验用户、租户、书籍与章节访问权限。 -> 保留问题原文，必要时生成语义改写。 -> 用同一 Embedding 模型编码 Query。 -> Milvus 在 ACL 过滤条件内召回子块。”，输出命令、结果与 Diff，并说明不适用边界。

> 更新日期：2026/08/11

# 一、项目目标和数据契约

本篇把前 04–06 篇串成一条最小链路：Loader 读电子书，Splitter 生成 chunks，Embeddings 把 chunks 转成向量，LangChain VectorStore 写入 Milvus，Retriever 找回相关文档，最后把证据交给模型生成带引用的回答。示例先用确定性本地替身跑通数据契约，再说明真实 Embeddings、Milvus 和 ChatModel 的替换点。

用户问“作者怎样解释上下文压缩”时，系统要返回答案、书名、章节、页码和原文片段。电子书正文长、跨页、同一概念分散，推荐父子分块：章节/小节为父块，段落级子块生成向量；命中子块后回取父块或相邻段落。

每个子块保存：`chunk_id/document_id/parent_id/book_title/heading_path/page_start/page_end/source_uri/text/tenant_id/acl/embedding_version`。引用只从这些字段映射，不能让模型自由编页码。

# 二、离线建库骨架

```python
from collections.abc import Callable
from dataclasses import asdict, dataclass
from typing import Any

# 每批写入向量库的 Chunk 数量。
INSERT_BATCH_SIZE = 128
# 当前电子书索引使用的 Embedding 版本。
EMBEDDING_VERSION = "bge-small-zh-v1.5@local-v1"


@dataclass(frozen=True)
class BookChunk:
    """电子书子块及其可追溯元数据。"""

    chunk_id: str
    parent_id: str
    heading_path: list[str]
    text: str


def build_book_index(
    chunks: list[BookChunk],
    embed_batch: Callable[[list[str]], list[list[float]]],
    insert_rows: Callable[[list[dict[str, Any]]], None],
) -> None:
    """批量生成电子书子块向量并幂等写入索引。"""
    for start in range(0, len(chunks), INSERT_BATCH_SIZE):
        # 当前准备向量化的子块批次。
        batch_chunks = chunks[start:start + INSERT_BATCH_SIZE]
        # 标题路径与正文共同编码，避免短段落脱离主题。
        embedding_texts = [" > ".join(chunk.heading_path) + "\n" + chunk.text for chunk in batch_chunks]
        # 当前批次生成的向量。
        vectors = embed_batch(embedding_texts)
        if len(vectors) != len(batch_chunks):
            raise ValueError("Embedding 返回数量不匹配")

        # 写入 Milvus 的行记录，稳定主键让重复任务可 upsert。
        rows = []
        for chunk, vector in zip(batch_chunks, vectors, strict=True):
            row = asdict(chunk)
            row["vector"] = vector
            row["embedding_version"] = EMBEDDING_VERSION
            rows.append(row)
        insert_rows(rows)
```

离线任务要记录文档版本、每批状态与失败原因；重跑时按稳定主键 upsert，并删除新版本中不再存在的旧 Chunk。

# 三、在线问答链路

1. 校验用户、租户、书籍与章节访问权限。
2. 保留问题原文，必要时生成语义改写。
3. 用同一 Embedding 模型编码 Query。
4. Milvus 在 ACL 过滤条件内召回子块。
5. 按 `parent_id` 去重并补全父块/相邻块。
6. Rerank 后在 Token 预算内选择证据。
7. 模型结构化返回答案与 `chunk_id` 引用。
8. 程序校验引用只来自 Context，再映射书名、章节和页码。

若书中没有证据，返回“无法从当前书籍确认”，不要用模型常识伪装成书中观点。

# 四、父块扩展与去重

```python
from collections.abc import Callable

# 同一个父块最多保留的命中子块数量。
MAX_CHILDREN_PER_PARENT = 2


def expand_parent_context(
    ranked_child_ids: list[str],
    get_child: Callable[[str], dict],
    get_parent: Callable[[str], dict],
) -> list[dict]:
    """按排名选择父块，避免同一章节重复占满上下文。"""
    # 每个父块已经接纳的命中子块计数。
    parent_counts: dict[str, int] = {}
    # 最终用于生成的父块证据。
    parent_contexts: list[dict] = []

    for child_id in ranked_child_ids:
        # 当前命中的子块记录。
        child = get_child(child_id)
        # 当前子块所属父块主键。
        parent_id = child.get("parent_id")
        if not parent_id:
            continue
        if parent_counts.get(parent_id, 0) >= MAX_CHILDREN_PER_PARENT:
            continue
        if parent_counts.get(parent_id, 0) == 0:
            parent_contexts.append(get_parent(parent_id))
        parent_counts[parent_id] = parent_counts.get(parent_id, 0) + 1

    return parent_contexts
```

# 五、电子书特有坏案例

- 双栏 PDF 解析顺序错误，章节文字互相穿插。
- 扫描页 OCR 把页码、脚注或公式识别错。
- 章节标题未继承，短段落向量失去主题。
- 整章直接向量化，细节问题无法精确定位。
- 多个相邻子块重复命中，占满 Context。
- 页码来自 PDF 物理页而读者使用印刷页，引用需同时说明。
- 书籍更新后旧版索引和语义缓存没有失效。

# 六、验收指标

- 目录/页码解析准确率、OCR 抽样准确率和空页率。
- 章节级与段落级 Recall@K、MRR 和引用页准确率。
- 父块扩展后的条件完整率与 Context 重复率。
- 证据不足拒答准确率、答案忠实度与引用覆盖率。
- 建库吞吐、索引对账、在线 P95、Token 和单问成本。

# 七、最小可运行验证

前两个 Python 代码块共同组成 `rag_book.py`。它们通过 `embed_batch`、`insert_rows` 和 `get_parent` 隔离了外部服务，因此可以先验证批处理、稳定主键和父块去重，再接入 Milvus。新建下面的 `test_rag_book.py`：

```python
import unittest

from rag_book import BookChunk, build_book_index, expand_parent_context


class RagBookTest(unittest.TestCase):
    """验证离线建库与父块扩展的核心数据契约。"""

    def test_build_index_keeps_metadata(self) -> None:
        chunks = [
            BookChunk("c1", "p1", ["第一章", "上下文压缩"], "压缩前先保留关键事实"),
            BookChunk("c2", "p1", ["第一章", "上下文压缩"], "压缩后检查事实覆盖率"),
        ]
        inserted_rows: list[dict] = []

        def fake_embed(texts: list[str]) -> list[list[float]]:
            return [[float(len(text)), 1.0] for text in texts]

        build_book_index(chunks, fake_embed, inserted_rows.extend)

        self.assertEqual(["c1", "c2"], [row["chunk_id"] for row in inserted_rows])
        self.assertTrue(all(row["embedding_version"] for row in inserted_rows))
        self.assertTrue(all(len(row["vector"]) == 2 for row in inserted_rows))

    def test_parent_context_is_deduplicated(self) -> None:
        children = {
            "c1": {"parent_id": "p1"},
            "c2": {"parent_id": "p1"},
            "c3": {"parent_id": "p2"},
        }
        parents = {"p1": {"id": "p1"}, "p2": {"id": "p2"}}

        result = expand_parent_context(
            ["c1", "c2", "c3"],
            children.__getitem__,
            parents.__getitem__,
        )

        self.assertEqual([{"id": "p1"}, {"id": "p2"}], result)


if __name__ == "__main__":
    unittest.main()
```

运行命令和预期结果：

```bash
python -m unittest -v
```

```text
test_build_index_keeps_metadata ... ok
test_parent_context_is_deduplicated ... ok
```

这个测试不声称验证了 Milvus 网络、Schema 或索引参数。接入真实 `pymilvus` 适配器后，还要在隔离测试 Collection 中验证向量维度、`tenant_id/acl` 过滤、重复 upsert、删除传播和索引切换；这些属于集成测试，不能由内存替身代替。

# 八、总结

- **项目目标和数据契约**：引用只从这些字段映射，不能让模型自由编页码。
- **离线建库骨架**：离线任务要记录文档版本、每批状态与失败原因；
- **在线问答链路**：校验用户、租户、书籍与章节访问权限。 -> 保留问题原文，必要时生成语义改写。 -> 用同一 Embedding 模型编码 Query。 -> Milvus 在 ACL 过滤条件内召回子块。
- **电子书特有坏案例**：双栏 PDF 解析顺序错误，章节文字互相穿插。
- **验收指标**：目录/页码解析准确率、OCR 抽样准确率和空页率。
- **最小可运行验证**：它们通过 embed_batch、insert_rows 和 get_parent 隔离了外部服务，因此可以先验证批处理、稳定主键和父块去重，再接入 Milvus。

## 可运行实验：最小 RAG 数据流

```python runnable file=main.py title="电子书最小 RAG" description="运行 loader、splitter、向量召回和引用组装的确定性闭环。"
BOOK = [
    {"id": "p1-c1", "text": "Milvus collection 需要固定 schema。", "source": "page-1"},
    {"id": "p2-c1", "text": "Retriever 返回与问题最相关的 chunks。", "source": "page-2"},
]

def retrieve(question: str, limit: int = 2) -> list[dict]:
    """按共享关键词模拟向量召回，保留来源和块 ID 供引用。"""
    words = set(question)
    ranked = sorted(BOOK, key=lambda item: len(words.intersection(item["text"])), reverse=True)
    return ranked[:limit]

question = "如何查询最相关的文档？"
hits = retrieve(question)
answer = "\n".join(f"- {item['text']} [{item['source']}, {item['id']}]" for item in hits)
print("evidence:")
print(answer)
print("answer must cite every selected chunk")
```

该沙盒故意不调用真实模型或 Milvus，只验证数据契约；接入真实系统时替换 `retrieve` 为 `retriever.invoke(question)`，再把返回文档交给 ChatModel 生成答案。

## 参考资料

- [Milvus Overview](https://milvus.io/docs/overview.md)
- [Milvus Filtered search](https://milvus.io/docs/filtered-search.md)
- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
