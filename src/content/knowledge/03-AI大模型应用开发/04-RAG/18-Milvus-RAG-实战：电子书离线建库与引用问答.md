# LangChain 实战（62）- Milvus RAG 实战：电子书离线建库与引用问答

> 读完你能：设计电子书的父子分块、Milvus 入库、在线 Top K 与引用映射，并知道如何验收长文档 RAG。
> 更新日期：2026/08/11

# 一、项目目标和数据契约

用户问“作者怎样解释上下文压缩”时，系统要返回答案、书名、章节、页码和原文片段。电子书正文长、跨页、同一概念分散，推荐父子分块：章节/小节为父块，段落级子块生成向量；命中子块后回取父块或相邻段落。

每个子块保存：`chunk_id/document_id/parent_id/book_title/heading_path/page_start/page_end/source_uri/text/tenant_id/acl/embedding_version`。引用只从这些字段映射，不能让模型自由编页码。

# 二、离线建库骨架

```python
from collections.abc import Callable
from dataclasses import asdict
from typing import Any

# 每批写入向量库的 Chunk 数量。
INSERT_BATCH_SIZE = 128
# 当前电子书索引使用的 Embedding 版本。
EMBEDDING_VERSION = "bge-small-zh-v1.5@local-v1"


def build_book_index(
    chunks: list,
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

# 七、参考资料

- [Milvus Overview](https://milvus.io/docs/overview.md)
- [Milvus Filtered search](https://milvus.io/docs/filtered-search.md)
- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)

# 八、总结

- 电子书 RAG 的核心是结构与引用，不是把整本书切成等长字符串。
- 子块负责精确召回，父块负责完整回答，引用由 Metadata 和程序映射。
- 离线对账、在线拒答和页码准确率是可交付系统的基本验收项。

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)
