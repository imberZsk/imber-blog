"""用观测记录驱动 AI 请求故障诊断。"""

from __future__ import annotations

from dataclasses import dataclass

MODEL_TIMEOUT_MS = 5000


@dataclass(frozen=True, slots=True)
class Observation:
    """表示一次线上请求的关键观测。"""

    # 模型调用耗时。
    model_latency_ms: int
    # 检索命中的 chunk 数量。
    retrieved_count: int
    # 最终回答文本。
    answer: str
    # 捕获到的异常类型。
    error: str | None = None


def diagnose(observation: Observation) -> list[str]:
    """按决策树返回排查结论和下一步。"""
    if observation.error:
        return [f"异常路径：{observation.error}", "先按 requestId 查模型网关和依赖日志"]
    if observation.model_latency_ms >= MODEL_TIMEOUT_MS:
        return ["模型超时", "检查首 token/总耗时，降低 max_tokens 或启用降级模型"]
    if observation.retrieved_count == 0:
        return ["召回失败", "检查索引是否入库、权限过滤、query 改写和召回阈值"]
    if not observation.answer.strip():
        return ["空回答", "保存原始模型响应，检查 stop reason、解析器和内容安全过滤"]
    return ["请求正常", "继续监控 P95 延迟、命中率和成本"]


def main() -> None:
    """运行正常、超时、召回失败和空回答案例。"""
    # 四种典型线上观测。
    observations = [
        Observation(800, 3, "报销需在30天内提交"),
        Observation(7000, 3, ""),
        Observation(600, 0, "资料不足"),
        Observation(600, 2, ""),
    ]
    for observation in observations:
        print(observation, "->", "；".join(diagnose(observation)))


if __name__ == "__main__":
    main()
