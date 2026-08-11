# 文件上传与文档解析 demo

这不是一个“执行命令看看输出”的空壳示例。它实现了 RAG 离线入库的第一段真实代码：读取本地 Markdown/TXT 文档，按结构解析，切成大小受控的 chunk，并给每个 chunk 补上 `source` 和 `section` 元数据。

先明确边界：`python3 main.py` **不会上传文件、不会调用大模型、不会生成 Embedding，也不会写入向量数据库**。它只演示上传文件落盘后的离线预处理：

```text
sample.md / sample.txt
        ↓
校验扩展名并读取 UTF-8 文本
        ↓
Markdown 按标题解析 / TXT 按段落解析
        ↓
长文本按标点二次切块
        ↓
输出 Chunk(text, metadata)
```

## 运行后到底做什么

`main.py` 会依次处理同目录下两个输入文件：

| 输入 | 解析策略 | 结果 |
|---|---|---|
| `sample.md` | 识别 `#`、`##` 标题，保留“一级标题/二级标题”章节路径 | 4 个带业务章节的 chunk |
| `sample.txt` | 按空行拆成段落，章节统一标记为“正文” | 4 个正文 chunk |

每个结果都长这样：

```python
Chunk(
    text="一线城市住宿标准为每晚 500 元，其它城市 350 元，超出部分自理。",
    metadata={"source": "sample.md", "section": "差旅管理/住宿标准"},
)
```

后续做 Embedding 时使用 `text`；向量入库时把 `metadata` 一起保存，在线检索命中后才能展示引用来源，并按租户、部门或文档权限过滤。

## 环境与文件

要求 Python 3.10+，只使用标准库：

```text
# requirements.txt
# Python 3.10+ 标准库即可运行，无第三方依赖。
```

实验目录包含：

```text
lab/
├── README.md         # 当前说明
├── main.py           # 可执行解析器
├── requirements.txt # 运行环境说明
├── sample.md         # 带标题结构的制度文档
└── sample.txt        # 无标题结构的班车通知
```

## 如何运行

进入实验目录再执行：

```bash
cd src/content/knowledge/03-AI大模型应用开发/08-工程基础/03-大模型API与应用工程/08-文件上传与文档解析/lab
python3 main.py
```

脚本通过 `Path(__file__).resolve().parent` 定位样例，因此直接使用绝对路径执行也可以：

```bash
python3 src/content/knowledge/03-AI大模型应用开发/08-工程基础/03-大模型API与应用工程/08-文件上传与文档解析/lab/main.py
```

## 核心代码

下面是页面对应的核心实现，不需要猜 `main.py` 里做了什么：

```python
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

MAX_CHUNK_CHARS = 60  # 演示按字符限制；生产环境通常按 token 限制
SUPPORTED_SUFFIXES = {".md", ".txt"}


@dataclass(frozen=True, slots=True)
class Chunk:
    """保存一段可检索文本及其来源元数据。"""

    text: str
    metadata: dict[str, str]


def split_long(text: str, max_chars: int = MAX_CHUNK_CHARS) -> list[str]:
    """按字符上限切分长文本，并优先在中文标点后断开。"""

    normalized_text = " ".join(text.split())
    chunks: list[str] = []
    remaining_text = normalized_text

    while len(remaining_text) > max_chars:
        current_window = remaining_text[:max_chars]
        cut_position = max(current_window.rfind(mark) for mark in ("。", "；", "，"))
        cut_position = max_chars if cut_position < max_chars // 2 else cut_position + 1
        chunks.append(remaining_text[:cut_position].strip())
        remaining_text = remaining_text[cut_position:].strip()

    if remaining_text:
        chunks.append(remaining_text)
    return chunks


def build_chunks(text: str, source: str, section: str) -> list[Chunk]:
    """切分正文，并为每块附加来源和章节信息。"""

    return [
        Chunk(text=text_piece, metadata={"source": source, "section": section})
        for text_piece in split_long(text)
    ]


def parse_markdown(content: str, source: str) -> list[Chunk]:
    """按 Markdown 一级、二级标题解析正文。"""

    chunks: list[Chunk] = []
    buffer: list[str] = []
    level_one = ""
    level_two = ""

    def flush() -> None:
        """把当前章节缓冲区写入结果。"""

        section = "/".join(title for title in (level_one, level_two) if title) or "正文"
        section_text = " ".join(buffer).strip()
        if section_text:
            chunks.extend(build_chunks(section_text, source, section))
        buffer.clear()

    for raw_line in content.splitlines():
        stripped_line = raw_line.strip()
        if stripped_line.startswith("# "):
            flush()
            level_one, level_two = stripped_line[2:].strip(), ""
        elif stripped_line.startswith("## "):
            flush()
            level_two = stripped_line[3:].strip()
        elif not stripped_line:
            flush()
        else:
            buffer.append(stripped_line)

    flush()
    return chunks


def parse_text(content: str, source: str) -> list[Chunk]:
    """按空行拆分纯文本段落。"""

    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", content) if part.strip()]
    return [chunk for paragraph in paragraphs for chunk in build_chunks(paragraph, source, "正文")]


def parse_file(file_path: Path) -> list[Chunk]:
    """校验扩展名并选择 Markdown 或 TXT 解析器。"""

    file_suffix = file_path.suffix.lower()
    if file_suffix not in SUPPORTED_SUFFIXES:
        raise ValueError(f"不支持的文件类型：{file_suffix or '无扩展名'}")

    content = file_path.read_text(encoding="utf-8")
    return parse_markdown(content, file_path.name) if file_suffix == ".md" else parse_text(content, file_path.name)


def main() -> None:
    """解析同目录的两个样例文件并打印文本块。"""

    lab_directory = Path(__file__).resolve().parent
    for file_name in ("sample.md", "sample.txt"):
        file_path = lab_directory / file_name
        chunks = parse_file(file_path)
        print(f"=== {file_name} 解析出 {len(chunks)} 个 chunk ===")
        for chunk_index, chunk in enumerate(chunks, start=1):
            print(f"  [{chunk_index}] ({chunk.metadata['section']}) {chunk.text}")
        print()


if __name__ == "__main__":
    main()
```

仓库中的 `main.py` 额外包含统一异常处理：文件不存在、UTF-8 解码失败或文件类型不支持时，会在标准错误输出中说明原因并返回退出码 `1`。

## 关键调用链

1. `main()` 通过脚本目录找到 `sample.md` 和 `sample.txt`。
2. `parse_file()` 校验扩展名并读取 UTF-8 文本。
3. Markdown 进入 `parse_markdown()`，TXT 进入 `parse_text()`。
4. 每段正文交给 `split_long()`，超过 `MAX_CHUNK_CHARS` 时优先在 `。`、`；`、`，` 后切分。
5. `build_chunks()` 为每个文本块附加 `source`、`section`。
6. `main()` 把解析结果打印出来，便于检查切块是否符合预期。

## 预期输出

```text
=== sample.md 解析出 4 个 chunk ===
  [1] (员工报销制度/提交时限) 员工报销需要在费用发生后的 30 天内提交，逾期需要部门经理书面说明。
  [2] (员工报销制度/报销材料) 报销需要提供发票原件、审批单，以及对应的合同或采购单。电子发票需打印后粘贴。
  [3] (差旅管理/交通标准) 经理级别可乘坐高铁一等座，员工乘坐二等座。机票需提前 7 天预订。
  [4] (差旅管理/住宿标准) 一线城市住宿标准为每晚 500 元，其它城市 350 元，超出部分自理。

=== sample.txt 解析出 4 个 chunk ===
  [1] (正文) 公司班车时刻表说明。
  [2] (正文) 早班车每天 8 点从地铁站发车，晚班车 18 点 30 分从公司发车。
  [3] (正文) 节假日班车停运，具体安排以行政通知为准。
  [4] (正文) 雨雪天气班车可能延迟，请关注企业微信群通知。

每个 chunk 都带 source + section，可直接进入后续 Embedding 和向量入库步骤。
```

## 为什么 Markdown 比 TXT 多一层价值

两种输入都能得到文本块，但 Markdown 的标题天然提供结构。检索命中住宿标准时，系统不仅拿到正文，还能知道它属于“差旅管理/住宿标准”。TXT 没有标题，只能标记为“正文”。

这也是企业知识库入库时要尽量保留标题、页码、表格名、文档 ID、租户 ID 和权限标签的原因：纯文本只是内容，元数据决定内容能否被正确过滤、引用和追责。

## 生产环境还缺什么

这个最小示例故意只覆盖解析核心。真正的上传接口还必须增加：

- 文件大小、扩展名和 MIME 双重校验，不能只信用户传来的文件名。
- 隔离的临时目录或对象存储，禁止直接使用原始文件名拼接服务器路径。
- PDF、DOCX、扫描件 OCR 等独立解析器，以及解析超时和失败重试。
- 按 token 而不是字符切块，并通过评测选择 chunk size 和 overlap。
- `tenant_id`、`document_id`、`acl` 等权限元数据，检索时必须先过滤权限再返回内容。
- 文档版本、内容哈希和幂等键，避免同一文件重复入库。
- 后续 Embedding、向量库写入和建库质量校验。

## 动手验证

1. 把 `MAX_CHUNK_CHARS` 从 `60` 改成 `20`，观察长句如何变成更多文本块。
2. 往 `sample.md` 加一个 `## 费用审批` 章节，确认输出里出现新的章节路径。
3. 新建 `sample.json` 并传给 `parse_file()`，确认程序明确报“不支持的文件类型”且退出码为 `1`。
4. 删除 `sample.txt` 后运行，确认错误中包含缺失文件路径，而不是静默跳过。

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart）
> DIAGRAM_DESCRIPTION：展示 `sample.md/sample.txt → 类型校验 → Markdown/TXT 解析器 → 标点切块 → Chunk(text, source, section) → Embedding/向量库（后续步骤）`；同时标明文件大小/MIME 校验、解析失败和权限元数据属于生产补强点。
