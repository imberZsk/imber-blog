"""按需求约束给 AI 应用框架打分并解释推荐。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Requirements:
    """保存会影响框架选型的项目约束。"""

    # 团队是否以低代码交付为主。
    low_code: bool
    # 是否存在循环、回退或人工介入状态机。
    complex_state: bool
    # 是否强调代码级自由度和最少依赖。
    maximum_control: bool
    # 是否需要成熟的链式组件生态。
    component_ecosystem: bool


def recommend(requirements: Requirements) -> tuple[str, dict[str, int]]:
    """返回最高分方案及完整得分；requirements 是项目约束。"""
    # 四种候选方案的初始得分。
    scores = {"Dify/Coze": 0, "LangChain": 0, "LangGraph": 0, "裸写": 0}
    if requirements.low_code:
        scores["Dify/Coze"] += 4
    if requirements.complex_state:
        scores["LangGraph"] += 5
    if requirements.maximum_control:
        scores["裸写"] += 4
    if requirements.component_ecosystem:
        scores["LangChain"] += 4
    # 生产可观测和团队能力仍需在最终选型评审中单独验证。
    recommendation = max(scores, key=scores.get)
    return recommendation, scores


def main() -> None:
    """运行四个典型项目场景。"""
    # 场景名到约束的映射。
    scenarios = {
        "业务快速试点": Requirements(True, False, False, False),
        "复杂 Agent 状态机": Requirements(False, True, False, True),
        "组件丰富的 RAG": Requirements(False, False, False, True),
        "高性能核心服务": Requirements(False, False, True, False),
    }
    for name, requirements in scenarios.items():
        # 当前场景的推荐方案和可解释分数。
        recommendation, scores = recommend(requirements)
        print(f"{name}: 推荐={recommendation} 分数={scores}")


if __name__ == "__main__":
    main()
