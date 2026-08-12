"""比较不同 chunk_size 与 overlap 的切分效果。"""

from __future__ import annotations


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """按固定窗口切分；chunk_size 是块长，overlap 是相邻重叠字符数。"""
    if chunk_size <= 0 or overlap < 0 or overlap >= chunk_size:
        raise ValueError("需要满足 chunk_size > overlap >= 0")
    # 每次窗口向前移动的字符数。
    step = chunk_size - overlap
    return [text[start : start + chunk_size] for start in range(0, len(text), step) if text[start : start + chunk_size]]


def main() -> None:
    """用同一文档运行三组参数并打印边界。"""
    # 包含多个事实的示例制度文本。
    document = "报销需要在30天内提交。交通费需附行程单。住宿费需附酒店发票。超过标准需要经理审批。"
    # 代表过大、过小和折中的三组参数。
    strategies = ((80, 0, "太大"), (12, 0, "太小"), (24, 6, "折中+overlap"))
    for chunk_size, overlap, label in strategies:
        # 当前策略生成的文本块。
        chunks = chunk_text(document, chunk_size, overlap)
        print(f"\n{label}: chunk_size={chunk_size}, overlap={overlap}, count={len(chunks)}")
        for index, chunk in enumerate(chunks, start=1):
            print(f"  [{index}] {chunk}")


if __name__ == "__main__":
    main()
