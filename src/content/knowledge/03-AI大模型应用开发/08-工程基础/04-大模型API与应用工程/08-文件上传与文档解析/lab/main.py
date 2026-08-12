"""把 Markdown 和纯文本文件解析成可用于 RAG 入库的文本块。"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path


# 单个文本块允许的最大字符数；生产环境通常改为按 token 计算。
MAX_CHUNK_CHARS = 60

# 当前最小示例明确支持的文件类型。
SUPPORTED_SUFFIXES = {".md", ".txt"}


@dataclass(frozen=True, slots=True)
class Chunk:
    """保存一段可检索文本及其来源元数据。"""

    # 实际参与 Embedding 和检索的文本。
    text: str
    # 用于权限过滤、引用溯源和问题排查的元数据。
    metadata: dict[str, str]


def split_long(text: str, max_chars: int = MAX_CHUNK_CHARS) -> list[str]:
    """按字符上限切分长文本，并优先在中文标点后断开。

    Args:
        text: 需要切分的原始文本。
        max_chars: 单个文本块允许的最大字符数。
    """

    # 合并多余空白，避免格式空格占用文本块容量。
    normalized_text = " ".join(text.split())
    if not normalized_text:
        return []

    # 保存最终生成的全部文本块。
    chunks: list[str] = []
    # 保存尚未切分完成的剩余文本。
    remaining_text = normalized_text

    while len(remaining_text) > max_chars:
        # 只在当前字符上限内寻找最靠后的自然断句位置。
        current_window = remaining_text[:max_chars]
        # 保存当前窗口内最靠后的中文标点位置。
        cut_position = max(current_window.rfind(mark) for mark in ("。", "；", "，"))

        # 标点太靠前会产生极短文本块，此时直接按上限切分。
        if cut_position < max_chars // 2:
            cut_position = max_chars
        else:
            cut_position += 1

        # 保存本轮得到的非空文本块。
        current_chunk = remaining_text[:cut_position].strip()
        if current_chunk:
            chunks.append(current_chunk)
        remaining_text = remaining_text[cut_position:].strip()

    if remaining_text:
        chunks.append(remaining_text)

    return chunks


def build_chunks(text: str, source: str, section: str) -> list[Chunk]:
    """把一段结构化文本切块，并为每块附加来源和章节信息。

    Args:
        text: 当前章节或段落的正文。
        source: 原始文件名。
        section: 当前文本所在章节。
    """

    # 保存当前段落切分后生成的全部结构化文本块。
    chunks: list[Chunk] = []
    for text_piece in split_long(text):
        chunks.append(Chunk(text=text_piece, metadata={"source": source, "section": section}))
    return chunks


def get_markdown_section(level_one: str, level_two: str) -> str:
    """拼接 Markdown 一级、二级标题，得到可读的章节路径。"""

    # 保存当前有效的标题层级，空标题不会进入章节路径。
    section_parts = [title for title in (level_one, level_two) if title]
    return "/".join(section_parts) or "正文"


def flush_markdown_buffer(
    chunks: list[Chunk],
    buffer: list[str],
    source: str,
    section: str,
) -> None:
    """把 Markdown 正文缓冲区写入结果，并清空缓冲区。

    Args:
        chunks: 保存解析结果的列表。
        buffer: 当前章节累积的正文行。
        source: 原始文件名。
        section: 当前正文所属章节。
    """

    # 合并当前章节累积的正文行。
    section_text = " ".join(buffer).strip()
    if section_text:
        chunks.extend(build_chunks(section_text, source, section))
    buffer.clear()


def parse_markdown(content: str, source: str) -> list[Chunk]:
    """按 Markdown 标题层级解析正文，并保留章节路径。

    Args:
        content: Markdown 文件正文。
        source: 原始文件名。
    """

    # 保存 Markdown 文件解析出的全部文本块。
    chunks: list[Chunk] = []
    # 保存当前章节尚未写入结果的正文行。
    buffer: list[str] = []
    # 保存最近一次读取到的一级标题。
    level_one = ""
    # 保存最近一次读取到的二级标题。
    level_two = ""

    for raw_line in content.splitlines():
        # 去掉行首尾空白，便于识别标题和空行。
        stripped_line = raw_line.strip()

        if stripped_line.startswith("# "):
            flush_markdown_buffer(chunks, buffer, source, get_markdown_section(level_one, level_two))
            level_one = stripped_line[2:].strip()
            level_two = ""
            continue

        if stripped_line.startswith("## "):
            flush_markdown_buffer(chunks, buffer, source, get_markdown_section(level_one, level_two))
            level_two = stripped_line[3:].strip()
            continue

        if not stripped_line:
            flush_markdown_buffer(chunks, buffer, source, get_markdown_section(level_one, level_two))
            continue

        buffer.append(stripped_line)

    flush_markdown_buffer(chunks, buffer, source, get_markdown_section(level_one, level_two))
    return chunks


def parse_text(content: str, source: str) -> list[Chunk]:
    """按空行拆分纯文本段落，并统一标记为正文。

    Args:
        content: 纯文本文件正文。
        source: 原始文件名。
    """

    # 保存按一个或多个空行拆出的非空段落。
    paragraphs = [paragraph.strip() for paragraph in re.split(r"\n\s*\n", content) if paragraph.strip()]
    # 保存纯文本文件解析出的全部文本块。
    chunks: list[Chunk] = []
    for paragraph in paragraphs:
        chunks.extend(build_chunks(paragraph, source, "正文"))
    return chunks


def parse_file(file_path: Path) -> list[Chunk]:
    """校验文件类型并分派到对应解析器。

    Args:
        file_path: 需要解析的本地文件路径。
    """

    # 保存统一为小写的文件扩展名。
    file_suffix = file_path.suffix.lower()
    if file_suffix not in SUPPORTED_SUFFIXES:
        raise ValueError(f"不支持的文件类型：{file_suffix or '无扩展名'}")

    # 使用 UTF-8 读取示例文件；解码或权限错误会交给调用方处理。
    content = file_path.read_text(encoding="utf-8")
    if file_suffix == ".md":
        return parse_markdown(content, file_path.name)
    return parse_text(content, file_path.name)


def main() -> int:
    """解析同目录样例文件，在终端打印文本块和来源信息。"""

    # 保存当前脚本所在目录，避免命令从其他工作目录执行时找不到样例。
    lab_directory = Path(__file__).resolve().parent
    # 保存本次演示需要依次解析的输入文件。
    input_files = [lab_directory / "sample.md", lab_directory / "sample.txt"]

    try:
        for input_file in input_files:
            # 保存当前输入文件解析出的全部文本块。
            chunks = parse_file(input_file)
            print(f"=== {input_file.name} 解析出 {len(chunks)} 个 chunk ===")
            for chunk_index, chunk in enumerate(chunks, start=1):
                # 保存当前文本块用于引用展示的章节信息。
                section = chunk.metadata["section"]
                print(f"  [{chunk_index}] ({section}) {chunk.text}")
            print()
    except (OSError, UnicodeError, ValueError) as error:
        print(f"解析失败：{error}", file=sys.stderr)
        return 1

    print("每个 chunk 都带 source + section，可直接进入后续 Embedding 和向量入库步骤。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
