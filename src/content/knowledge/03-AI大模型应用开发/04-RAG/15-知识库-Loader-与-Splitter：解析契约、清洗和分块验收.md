# LangChain 实战（59）- 知识库 Loader 与 Splitter：解析契约、清洗和分块验收

> 读完你能：把 PDF、Markdown、网页和业务记录统一为 Document，再生成保留来源、权限和结构的 Chunk，并对解析与分块做自动验收。
> 更新日期：2026/08/11

# 一、Loader 的产物不只是字符串

Loader 负责读取来源并尽量保留结构；Splitter 负责把规范化 Document 变成可检索证据。两者分开，才能独立更换 PDF 解析器和分块策略。

```python
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Document:
    """定义不同来源解析后的统一文档结构。"""

    # 原始文档稳定主键。
    document_id: str
    # 当前版本正文。
    text: str
    # 标题层级与页码等结构块。
    blocks: list[dict]
    # 可回跳的来源地址。
    source_uri: str
    # 租户与权限等检索过滤字段。
    metadata: dict[str, str | list[str]] = field(default_factory=dict)


@dataclass(frozen=True)
class Chunk:
    """定义进入检索索引的最小证据单元。"""

    # 跨重复执行稳定的 Chunk 主键。
    chunk_id: str
    # 原始文档稳定主键。
    document_id: str
    # 可独立理解的证据正文。
    text: str
    # 当前块的标题路径。
    heading_path: list[str]
    # 原文页码，无页码来源允许为空。
    page_number: int | None
    # 完整继承的来源与权限字段。
    metadata: dict[str, str | list[str]]
```

# 二、不同来源的解析重点

| 来源 | 必须保留 | 常见污染 |
| --- | --- | --- |
| PDF | 页码、坐标、标题、表格、图片说明 | 页眉页脚、双栏错序、OCR 乱码 |
| Markdown | 标题树、列表、代码围栏、链接 | 导航目录、构建标记 |
| HTML | 正文 DOM、标题、URL、更新时间 | 菜单、广告、推荐和 Cookie 文案 |
| Word | 标题级别、表格、批注/修订策略 | 样式文本混入正文 |
| 数据库 | 主键、字段名、更新时间、权限 | 只导出展示值而丢字段语义 |

清洗只删能证明无业务价值的内容。代码缩进、否定词、表格表头和错误码大小写不能按普通空白处理。

# 三、结构优先的分块流程

1. 先按标题、条款、函数、表格等结构形成语义单元。
2. 单元超出 Token 上限，再按段落、句子和字符递归降级。
3. 小块继承标题路径、页码、来源、版本、租户和 ACL。
4. 生成稳定 ID 和内容哈希，支持重复执行、更新与删除。
5. 小块保留 `parent_id`，在线命中后可回取完整父块。

固定字符切分可以作为数据流 Demo，但不应成为所有格式的统一生产方案。

# 四、稳定 ID 与幂等

```python
import hashlib


def build_chunk_id(document_id: str, heading_path: list[str], text: str) -> str:
    """根据文档、结构路径和规范化正文生成稳定 Chunk ID。"""
    # 统一行尾空白，避免纯格式变化产生新主键。
    normalized_text = "\n".join(line.rstrip() for line in text.strip().splitlines())
    # 标题路径与正文共同形成当前块的内容指纹。
    identity = "\x1f".join([document_id, *heading_path, normalized_text])
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()
```

不要只使用 `document_id#序号`：文档头部插入新段落后，后续序号全部变化，会产生大量无意义删除与重建。

# 五、分块质量验收

抽样阅读不可少，自动指标至少包括：

- 解析成功率、空文档率、乱码率和 OCR 失败率。
- Chunk P50/P95 Token、超限率和过短率。
- 句子/代码围栏截断率、标题继承率、表格破坏率。
- 重复 Chunk 率与稳定 ID 冲突率。
- 来源、页码、ACL 等必填 Metadata 缺失率。
- 用标注问题评估不同策略的 Recall@K，而不是只比较块长。

# 六、常见故障与修复

- **引用回不到原文**：Loader 丢了页码或 URI，修解析契约，不要让模型生成来源。
- **检索总命中页眉**：在解析阶段基于跨页重复率移除页眉页脚。
- **条款只召回结论不召回例外**：按条款结构切，或命中后扩展邻居/父块。
- **更新后旧块仍存在**：用文档版本计算新旧 ID 差集，并对所有索引执行删除。
- **权限串用**：ACL 从 Document 到 Chunk 全程继承，并在写入前做非空校验。

# 七、参考资料

- [LangChain Document loaders](https://docs.langchain.com/oss/python/integrations/document_loaders)
- [LangChain Text splitters](https://docs.langchain.com/oss/python/integrations/splitters)

# 八、总结

- Loader 的责任是保真解析和统一契约，Splitter 的责任是生成可检索、可引用的证据单元。
- 结构、来源、权限和稳定 ID 比“切成多少字符”更重要。
- 解析与分块都要有自动指标和真实问题 Recall 回归。

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)
