# 40 AI 应用日志与可观测性 demo

结构化日志：把每次 RAG 请求的全过程记成 JSON，带 `request_id` / 耗时 / token / 命中，再从日志里聚合出命中率、总 token、平均耗时。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库。处理三个请求（含命中和未命中），打印每条结构化日志，再聚合指标。

## 预期输出

```
=== 每次请求的结构化日志 ===
{"request_id": "req-e1a84ec6", "stage": "start", "ts": 1781505032.714, "question": "报销发票几天内提交"}
{"request_id": "req-e1a84ec6", "stage": "retrieve", "ts": 1781505032.769, "cost_ms": 55.0, "hit_count": 1, "query": "报销发票几天内提交"}
{"request_id": "req-e1a84ec6", "stage": "generate", "ts": 1781505032.851, "cost_ms": 81.3, "tokens": 33, "answered": true}
{"request_id": "req-e1a84ec6", "stage": "end", "ts": 1781505032.851, "total_ms": 136.6, "hit_count": 1, "total_tokens": 33}
... (年假未命中、迟到命中的日志) ...

=== 从结构化日志聚合出的指标 ===
总请求数：3
命中率：2/3 = 67%
总 token：73
平均耗时：138.4 ms
```

每个 `request_id` 把同一次请求的 start/retrieve/generate/end 四条日志串起来，按它就能还原一次请求的全过程。

## 代码 ↔ 概念对应

| 概念 | 在 main.py 哪里 |
|---|---|
| 结构化日志（JSON 一行一条） | `StructuredLogger.log` |
| requestId 串联一次请求 | `handle_request` 里生成的 `request_id` |
| 分阶段记录（retrieve/generate） | `fake_retrieve` / `fake_generate` 各自的 `logger.log` |
| 记录耗时 | 每个阶段的 `cost_ms` / `total_ms` |
| 记录 token（等于钱） | `generate` 阶段的 `tokens` |
| 记录检索命中（RAG 质量） | `retrieve` 阶段的 `hit_count` |
| 从日志聚合指标 | `print_metrics` |

## 为什么 AI 应用必须结构化日志

普通日志 `print("查询失败了")` 是给人读的散文，没法检索、没法统计。结构化日志是给机器读的固定字段 JSON：

- 按 `request_id` 能串起一次请求的全过程 —— 排查时的起点
- 按字段能聚合 —— 算命中率、总 token、平均耗时，全靠它

AI 应用有三个独有的观测点，普通 Web 应用没有：**token 用量（直接等于钱）、检索命中（RAG 答得对不对的前提）、模型耗时（最大的延迟来源）**。这三个不记，线上出问题就是抓瞎。

## 动手改

- 把 `logger.records` 写到文件（`open("app.log", "a")`），体会真实日志落盘。
- 在 `print_metrics` 里加「P95 耗时」统计（排序后取 95 分位）。
- 给 `generate` 加一个 `model` 字段，按模型聚合各自的 token 消耗。
