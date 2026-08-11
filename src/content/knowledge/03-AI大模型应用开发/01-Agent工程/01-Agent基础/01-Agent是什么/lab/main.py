"""对比 Chatbot、Workflow 与 Agent 的控制权。"""

from __future__ import annotations


def chatbot(question: str) -> list[str]:
    """返回单次生成轨迹；question 是用户问题。"""
    return [f"输入：{question}", "模型直接生成回答", "结束"]


def workflow(question: str) -> list[str]:
    """返回开发者预先固定的步骤轨迹。"""
    return [f"输入：{question}", "固定步骤1：检索", "固定步骤2：生成", "固定步骤3：格式化", "结束"]


def agent(question: str) -> list[str]:
    """根据当前问题动态选择下一步。"""
    # Agent 根据意图决定是否需要外部工具。
    needs_tool = "订单" in question
    # 动态执行轨迹。
    trace = [f"输入：{question}", "模型判断下一步"]
    trace.extend(["选择工具：query_order", "观察工具结果", "再次判断"] if needs_tool else ["无需工具"])
    trace.extend(["生成最终回答", "结束"])
    return trace


def main() -> None:
    """用同一问题打印三类系统轨迹。"""
    # 同时包含知识问答与业务查询意图的问题。
    question = "我的订单为什么还没发货？"
    for name, runner in (("Chatbot", chatbot), ("Workflow", workflow), ("Agent", agent)):
        print(f"\n{name}（下一步由{'模型' if name == 'Agent' else '程序/固定流程'}决定）")
        for step in runner(question):
            print("  ->", step)


if __name__ == "__main__":
    main()
