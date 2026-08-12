"""打印可控的 Thought/Action/Observation ReAct 循环。"""

from __future__ import annotations

MAX_STEPS = 3


def search_policy(query: str) -> str:
    """返回离线制度资料；query 是 Agent 生成的检索词。"""
    return "员工报销需在费用发生后 30 天内提交。" if "报销" in query else "未命中"


def run_agent(question: str) -> str:
    """在最大步数内执行 ReAct；question 是用户目标。"""
    # 最近一次工具观察结果。
    observation = ""
    for step in range(1, MAX_STEPS + 1):
        print(f"Step {step} Thought: {'需要查制度' if not observation else '已有足够证据，可以回答'}")
        if observation and observation != "未命中":
            # 有证据后应立即结束，避免无意义循环。
            final_answer = f"根据制度，{observation}"
            print(f"Final Answer: {final_answer}")
            return final_answer
        print("Action: search_policy")
        print(f"Action Input: {question}")
        observation = search_policy(question)
        print(f"Observation: {observation}")
    return "达到最大步数，转人工处理。"


def main() -> None:
    """运行一次完整 ReAct 轨迹。"""
    run_agent("报销最晚多久提交？")


if __name__ == "__main__":
    main()
