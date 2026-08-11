"""从同级 RAG 面试题正文提取题目并自测。"""

from __future__ import annotations

import argparse
import random
import re
from pathlib import Path


def load_questions(chapter_path: Path) -> list[tuple[str, str]]:
    """从 chapter.md 提取题目与完整答案。"""
    # 面试题正文 Markdown。
    markdown = chapter_path.read_text(encoding="utf-8")
    # 每题标题与下一标题之间的答案。
    matches = re.findall(r"^##\s+\S+\s+(Q\d+：[^\n]+)\n(.*?)(?=^##\s+|\Z)", markdown, flags=re.MULTILINE | re.DOTALL)
    return [(question.strip(), answer.strip()) for question, answer in matches]


def main() -> None:
    """随机抽题或通读全部 RAG 题目。"""
    # 命令行参数解析器。
    parser = argparse.ArgumentParser(description="RAG 面试题自测")
    parser.add_argument("-n", type=int, default=5, help="随机抽题数量")
    parser.add_argument("--all", action="store_true", help="显示全部题目")
    # 用户参数。
    arguments = parser.parse_args()
    # 与实验目录同级的正文文件。
    chapter_path = Path(__file__).resolve().parents[1] / "chapter.md"
    # 正文中的完整题库。
    questions = load_questions(chapter_path)
    # 本轮题目集合。
    selected = questions if arguments.all else random.sample(questions, k=min(max(arguments.n, 1), len(questions)))
    for index, (question, answer) in enumerate(selected, start=1):
        print(f"\n{index}. {question}")
        if not arguments.all:
            input("回车查看参考答案...")
        print(answer)


if __name__ == "__main__":
    main()
