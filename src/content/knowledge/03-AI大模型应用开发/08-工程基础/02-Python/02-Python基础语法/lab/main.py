"""用基础 Python 语法实现一个最小知识库问答。"""

from __future__ import annotations


def answer_question(question: str, knowledge: dict[str, str]) -> str:
    """根据关键词返回知识库答案；question 是用户问题，knowledge 是关键词到答案的映射。"""
    # 去掉用户输入两端空白后的问题。
    normalized_question = question.strip()
    if not normalized_question:
        return "问题不能为空。"

    for keyword, answer in knowledge.items():
        if keyword in normalized_question:
            return answer
    return "知识库中没有足够资料，暂时无法回答。"


def main() -> None:
    """依次运行三个问题，展示变量、循环、条件和函数调用。"""
    # 最小企业制度知识库。
    knowledge = {"报销": "费用发生后 30 天内提交。", "年假": "年假需提前 3 天申请。"}
    # 待处理的示例问题列表。
    questions = ["报销最晚多久提交？", "年假怎么申请？", "食堂几点关门？"]
    for index, question in enumerate(questions, start=1):
        # 当前问题对应的知识库回答。
        answer = answer_question(question, knowledge)
        print(f"{index}. 问：{question}\n   答：{answer}")


if __name__ == "__main__":
    main()
