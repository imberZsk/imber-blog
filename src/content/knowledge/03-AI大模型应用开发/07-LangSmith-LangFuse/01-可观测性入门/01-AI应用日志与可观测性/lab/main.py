"""记录 RAG 结构化 trace 并聚合基础运行指标。"""

from __future__ import annotations

import json
import time
import uuid
from dataclasses import asdict, dataclass


@dataclass(frozen=True, slots=True)
class RagTrace:
    """保存一次 RAG 请求可观测字段。"""

    # 贯穿调用链的请求标识。
    request_id: str
    # 总请求耗时毫秒数。
    latency_ms: int
    # 检索命中的 chunk 数量。
    retrieved_count: int
    # 模型输入和输出 token 总量。
    token_count: int
    # 是否生成了有证据回答。
    answered: bool


def handle_request(question: str) -> RagTrace:
    """执行模拟 RAG 并返回 trace；question 是用户问题。"""
    # 请求开始的高精度时间。
    started_at = time.perf_counter()
    # 是否命中企业制度资料。
    hit = any(keyword in question for keyword in ("报销", "年假"))
    time.sleep(0.005)
    return RagTrace(uuid.uuid4().hex[:8], int((time.perf_counter() - started_at) * 1000), 1 if hit else 0, len(question) + (20 if hit else 5), hit)


def main() -> None:
    """处理三个请求并输出 JSON 日志和聚合指标。"""
    # 三个请求对应的结构化 trace。
    traces = [handle_request(question) for question in ("报销期限？", "年假怎么申请？", "食堂菜单？")]
    for trace in traces:
        print(json.dumps(asdict(trace), ensure_ascii=False))
    # 能基于资料回答的请求数。
    answered_count = sum(trace.answered for trace in traces)
    # 全部请求使用的 token 数。
    total_tokens = sum(trace.token_count for trace in traces)
    # 平均端到端耗时。
    average_latency = sum(trace.latency_ms for trace in traces) / len(traces)
    print(f"命中率={answered_count / len(traces):.1%} 总token={total_tokens} 平均耗时={average_latency:.1f}ms")


if __name__ == "__main__":
    main()
