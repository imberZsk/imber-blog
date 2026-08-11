"""从同级正文提取面试题并提供命令行自测。"""

from __future__ import annotations

import argparse
import random
import re
from pathlib import Path


def load_questions(chapter_path: Path) -> list[tuple[str, str]]:
    """从 chapter.md 提取 Q 标题和答案正文。"""
    # 面试题文章完整 Markdown。
    markdown = chapter_path.read_text(encoding="utf-8")
    # 每题标题和答案正文的正则匹配结果。
    matches = re.findall(r"^##\s+\S+\s+(Q\d+：[^\n]+)\n(.*?)(?=^##\s+|\Z)", markdown, flags=re.MULTILINE | re.DOTALL)
    return [(question.strip(), re.sub(r"\n{3,}", "\n\n", answer.strip())) for question, answer in matches]


def main() -> None:
    """按参数随机抽题、通读全部题或打印 ReAct trace。"""
    # 命令行参数解析器。
    parser = argparse.ArgumentParser(description="Agent 面试题自测")
    parser.add_argument("-n", type=int, default=5, help="随机抽题数量")
    parser.add_argument("--all", action="store_true", help="显示全部题目")
    parser.add_argument("--trace", action="store_true", help="打印 ReAct 循环示例")
    # 用户传入的命令行参数。
    arguments = parser.parse_args()
    if arguments.trace:
        print("Thought: 需要查制度\nAction: search_policy\nObservation: 报销需在30天内提交\nFinal Answer: 30天内提交")
        return
    # 与 lab 同级的面试题正文。
    chapter_path = Path(__file__).resolve().parents[1] / "chapter.md"
    # 从正文提取的完整题库。
    questions = load_questions(chapter_path)
    # 本轮实际展示的题目。
    selected = questions if arguments.all else random.sample(questions, k=min(max(arguments.n, 1), len(questions)))
    for index, (question, answer) in enumerate(selected, start=1):
        print(f"\n{index}. {question}")
        if not arguments.all:
            input("回车查看参考答案...")
        print(answer)


if __name__ == "__main__":
    main()
