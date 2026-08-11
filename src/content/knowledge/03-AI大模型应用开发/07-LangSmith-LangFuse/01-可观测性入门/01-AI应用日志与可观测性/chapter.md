# LangSmith / LangFuse（40）- AI 应用日志与可观测性

> 读完你能：讲清为什么 AI 应用必须用结构化日志，知道哪些字段非记不可（requestId、耗时、token、命中），并用一段代码把一次 RAG 请求的全过程记成可串联、可聚合的 JSON 日志。

# 一、一个真实场景

用户反馈："我昨天下午问'报销政策'，它说不知道，但你们明明有这文档。"

你想复盘这次到底哪一步出了问题：是检索没命中？还是命中了但模型没用上？耗时多久？花了多少 token？打开日志一看——只有一行 `print("生成回答")`，什么都查不到。你连用户那次请求的记录都定位不到。

AI 应用的坏 case 排查，全靠日志。而且它比普通 Web 应用更难排查：链路长（检索、拼 prompt、调模型、解析）、结果不确定（同样的输入模型可能答得不一样）、成本敏感（每次调用都在花钱）。**没有结构化日志，线上的 AI 应用就是个黑盒。**

# 二、散文日志 vs 结构化日志

```
散文日志（给人读）：
  print("用户问了报销，检索失败了")
  → 没法检索、没法统计、没法串联，出问题只能干瞪眼

结构化日志（给机器读）：
  {"request_id": "req-e1a84ec6", "stage": "retrieve", "cost_ms": 55, "hit_count": 0}
  → 能按 request_id 串、能按字段聚合、能 grep
```

结构化日志的本质：**每条日志是一个固定字段的 JSON 对象，而不是一句话。** 这带来两个能力，都是排查的命根子：

1. **串联**：同一次请求的所有日志带同一个 `request_id`，按它能还原整个链路。
2. **聚合**：所有日志字段统一，能算「命中率」「平均耗时」「总 token」这些指标。

# 三、AI 应用非记不可的字段

普通 Web 应用记 URL、状态码、耗时就差不多了。AI 应用要多记三样它独有的：

| 字段 | 为什么非记不可 |
|---|---|
| request_id | 串起一次请求的所有阶段，排查的起点 |
| 各阶段耗时 cost_ms | 模型调用是最大延迟源，要能定位是检索慢还是生成慢 |
| token 用量 | **token 直接等于钱**，不记就不知道成本花哪了 |
| 检索命中 hit_count | RAG 答得对不对的前提，命中率是核心质量指标 |
| answered（是否真答了） | 区分「拒答」和「乱答」，坏 case 分类靠它 |

记日志的代码很朴素，关键是每个阶段都带上 `request_id` 和该阶段的关键字段：

```python
def log(self, request_id, stage, **fields):
    """记一条结构化日志：固定带 request_id 和 stage，其余字段按阶段自定。"""
    record = {"request_id": request_id, "stage": stage, "ts": round(time.time(), 3), **fields}
    print(json.dumps(record, ensure_ascii=False))   # JSON 一行一条，方便采集和 grep
```

# 四、串联一次请求：requestId 是主线

一次 RAG 请求分好几步，每步都用同一个 `request_id` 记日志，它们就被串成了一条线：

```python
def handle_request(question):
    """处理一次请求：生成 requestId，贯穿检索和生成各阶段。"""
    request_id = "req-" + uuid.uuid4().hex[:8]   # 这次请求的唯一身份
    logger.log(request_id, "start", question=question)
    context, hit_count = fake_retrieve(request_id, question)   # 检索阶段带同一个 id
    result = fake_generate(request_id, question, context)      # 生成阶段也带它
    logger.log(request_id, "end", total_ms=..., hit_count=hit_count, total_tokens=...)
```

排查那个"说不知道"的 case 时，你只要 `grep req-e1a84ec6`，这次请求的 start、retrieve、generate、end 四条日志全出来，一眼看出是 `retrieve` 的 `hit_count=0`——检索没命中，问题在检索不在模型。

# 五、TraceID：跨服务时比 request_id 更重要

单体应用里一个 `request_id` 就够串起日志；多 Agent、多服务、MCP 网关里，一次用户请求会拆成多次检索、模型调用和工具调用。这时要有全链路 `trace_id`，每个子步骤再带自己的 `span_id`。

最小字段可以这样设计：

| 字段 | 用途 |
|---|---|
| trace_id | 串起一次用户请求的全链路 |
| span_id | 标记某个子步骤 |
| parent_span_id | 还原调用树 |
| stage | retrieve / rerank / generate / tool / judge |
| cost_ms | 当前步骤耗时 |

# 六、从日志聚合指标：可观测性的回报

结构化日志攒起来，就能算出运营关心的指标，这是散文日志做不到的：

```python
def print_metrics():
    """从 end 阶段日志聚合命中率、总 token、平均耗时。"""
    ends = [r for r in logger.records if r["stage"] == "end"]
    hit = sum(1 for r in ends if r["hit_count"] > 0)
    print(f"命中率：{hit}/{len(ends)} = {hit/len(ends):.0%}")
    print(f"总 token：{sum(r['total_tokens'] for r in ends)}")
    print(f"平均耗时：{sum(r['total_ms'] for r in ends)/len(ends):.1f} ms")
```

命中率掉了说明检索出问题，token 飙了说明有人在滥用或 prompt 太长，耗时涨了说明模型或检索变慢。这些都是日志字段直接算出来的。

延迟不要只看平均值。P50 代表常规体验，P90/P99 代表尾延迟；平均耗时没变但 P99 飙升，通常说明少数请求卡在模型排队、向量库查询或外部工具调用上。

# 八、工程上真正会踩的坑

- **把整段 prompt 和回答原文打进日志**。prompt 可能很长、可能含用户隐私（手机号、订单），全量打日志既占空间又有合规风险。记长度、记摘要、记 hash，敏感字段脱敏。
- **不记 request_id**。各阶段日志没法串联，排查时只能靠时间戳猜哪条是同一次请求，多并发下根本对不上。
- **token 不落日志**。月底账单超支了，不知道是哪个接口、哪类请求烧的钱，没法优化。每次模型调用的 `usage` 必须记。
- **日志级别不分**。正常请求和错误用同一级别，线上 ERROR 被海量 INFO 淹没。正常走 INFO，拒答/检索为空走 WARN，异常走 ERROR。

# 九、一句话面试答法

> **AI 应用的日志和普通应用有什么不一样，你怎么做可观测性？** 我用结构化日志，每条是带固定字段的 JSON，不是一句话。除了常规的 requestId 和耗时，AI 应用我一定会记三样：token 用量（直接等于成本）、检索命中数（RAG 质量的前提）、是否真的回答了（区分拒答和乱答）。用 requestId 把一次请求的检索、生成各阶段串起来，排查坏 case 时 grep 一个 id 就能还原全链路；字段统一了还能聚合出命中率、平均耗时、总 token 这些指标。prompt 和回答里的隐私字段会脱敏，不全量打日志。

# 十、下一篇

`41-成本控制与缓存.md` —— 日志里能看到 token 在烧钱了，怎么把成本降下来？下一篇讲缓存：重复问题不重复调模型，用 LRU 缓存 + token 成本估算，把钱省下来。

# 十一、总结

- **工程上真正会踩的坑**：把整段 prompt 和回答原文打进日志。
- **散文日志 vs 结构化日志**：结构化日志的本质：每条日志是一个固定字段的 JSON 对象，而不是一句话。
- **AI 应用非记不可的字段**：普通 Web 应用记 URL、状态码、耗时就差不多了。
- **串联一次请求：requestId 是主线**：一次 RAG 请求分好几步，每步都用同一个 requestid 记日志，它们就被串成了一条线：

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“LangSmith / LangFuse（40）- AI 应用日志与可观测性”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
