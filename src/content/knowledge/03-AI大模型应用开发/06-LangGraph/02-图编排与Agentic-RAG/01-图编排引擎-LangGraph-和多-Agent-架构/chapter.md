# LangGraph（75）- Multi-Agent 与 LangGraph：模式、状态、并行和故障边界

> 读完你能：判断何时应该拆多 Agent，在 Subagents、Router、Handoffs 与自定义工作流间选型，并用显式状态、并行上限和停止条件约束系统。
> 更新日期：2026/08/11

# 一、先证明单 Agent 不够

多 Agent 会增加模型调用、状态同步、权限传递、调试和失败组合。复杂任务不自动等于多 Agent；单 Agent 配合动态工具和明确工作流往往更便宜。

只有出现以下边界时才拆：

- 单个 Agent 工具过多，持续选错工具。
- 不同领域需要大量专用上下文，全部塞入一个 Prompt 会互相干扰。
- 子任务可以独立并行，且结果能用稳定契约汇总。
- 不同团队需要独立维护能力和版本。
- 子任务需要不同权限，必须隔离工具和数据访问。

“产品经理 Agent + 架构师 Agent + 程序员 Agent”只是角色命名，不是边界证明。

# 二、四种常用模式

| 模式 | 控制权 | 适合 | 代价 |
| --- | --- | --- | --- |
| Subagents | 主 Agent 始终协调 | 多跳任务、上下文隔离、集中审批 | 子 Agent 结果要回主 Agent，多一次汇总调用 |
| Router | 路由器分发给一个或多个专家 | 分类明确、可并行的独立问题 | 路由错就全错，通常无连续多跳 |
| Handoffs | 当前 Agent 把控制权交给另一 Agent | 多轮客服、阶段切换、直接与用户交互 | 状态和权限交接复杂 |
| Custom Workflow | 图节点显式编排 | 有确定步骤、循环、回退、人工审批 | 开发维护成本最高，但最可控 |

还可以使用 Skills：仍是单 Agent，只按需加载专业提示和知识。当需求只是“减少上下文污染”时，Skills 往往比多 Agent 简单。

# 三、状态必须是数据契约

```python
from typing import Literal, TypedDict


class ResearchState(TypedDict):
    """定义调研工作流各节点共享的最小状态。"""

    # 用户原始问题，只读保存以便审计。
    question: str
    # 规划节点拆出的可独立子问题。
    sub_questions: list[str]
    # 检索节点返回的结构化证据。
    evidence: list[dict[str, str]]
    # 质检节点发现但尚未补齐的证据缺口。
    gaps: list[str]
    # 当前已经执行的循环次数。
    iteration: int
    # 工作流下一步状态，不让模型自由发明节点名。
    status: Literal["planning", "researching", "reviewing", "done", "failed"]
    # 失败类型和可恢复信息。
    error: str | None
```

不要在共享 State 里无限追加完整消息、网页正文和模型思考过程。节点之间传结构化证据、来源、摘要和错误即可；大对象放外部存储，通过稳定 ID 引用。

# 四、用 LangGraph 表达循环与停止

```python
from langgraph.graph import END, START, StateGraph

# 允许“检索 → 质检 → 补充检索”的最大循环次数。
MAX_RESEARCH_ITERATIONS = 3


def route_after_review(state: ResearchState) -> str:
    """根据证据缺口和循环上限决定继续研究或结束。"""
    if state.get("error"):
        return "failed"
    if state.get("gaps") and state.get("iteration", 0) < MAX_RESEARCH_ITERATIONS:
        return "research"
    return "write"


# 每个节点函数都应只接收和返回 ResearchState 的受控字段。
graph_builder = StateGraph(ResearchState)
graph_builder.add_node("plan", plan_research)
graph_builder.add_node("research", run_research)
graph_builder.add_node("review", review_evidence)
graph_builder.add_node("write", write_report)
graph_builder.add_node("failed", handle_failure)
graph_builder.add_edge(START, "plan")
graph_builder.add_edge("plan", "research")
graph_builder.add_edge("research", "review")
graph_builder.add_conditional_edges(
    "review",
    route_after_review,
    {"research": "research", "write": "write", "failed": "failed"},
)
graph_builder.add_edge("write", END)
graph_builder.add_edge("failed", END)
research_graph = graph_builder.compile()
```

示例省略了节点实现，重点是：循环、失败、上限和结束路径都由代码控制，不让模型用自然语言决定任意跳转。

# 五、并行不是无限 fan-out

Router 可把独立子问题并行分发，但需要同时限制：

- 最大子任务数和最大并发数。
- 每个子任务超时、重试和 Token 预算。
- 相同子任务的幂等键，避免重试产生重复副作用。
- 部分失败时是返回部分结果、降级单路，还是整体失败。
- 汇总前的结果 Schema 校验和引用去重。

并行 10 个 Agent 不会把一项串行任务加速 10 倍，反而可能触发模型限流、工具连接池耗尽和成本失控。

# 六、工具与权限隔离

每个 Agent 只拿完成任务所需的工具。读代码的 Agent 不应拥有部署权限；生成付款建议的 Agent 不应直接执行付款。Handoff 或 Subagent 调用时传递的是经过裁剪的上下文和授权声明，不是主 Agent 的全部凭证。

有副作用的工具统一经过审批层：

`Agent 提议 → 参数 Schema 校验 → 权限检查 → 用户/规则审批 → 幂等执行 → 审计记录`

模型输出永远只是“执行建议”，不能因为来自某个“专家 Agent”就跳过校验。

# 七、可观测与评测

每次运行至少记录：

- 路由决策、选择理由和候选 Agent。
- 每个节点输入摘要、输出 Schema、耗时、Token 和费用。
- 并行 fan-out 数量、超时、重试和取消。
- Agent 之间传递的上下文字段，不记录密钥和无关隐私。
- 最终任务成功率、路由准确率、工具成功率和人工接管率。

评测要与单 Agent 基线对比。若多 Agent 没有提高任务成功率或延迟，反而增加调用和故障点，就应退回更简单架构。

# 八、常见故障

- **死循环**：缺少迭代上限、全局截止时间或终止状态。
- **状态爆炸**：每个 Agent 都复制完整历史和所有证据。
- **路由漂移**：路由 Prompt 更新后分发分布变化，却没有标注集回归。
- **部分失败悬挂**：一个并行子任务超时，其他任务没有取消或汇总策略。
- **权限扩散**：子 Agent 默认继承主 Agent 全部工具。
- **结论互相冲突**：汇总器只拼接结果，没有比较证据来源和时效。

# 九、参考资料

- [LangChain：Multi-agent patterns](https://docs.langchain.com/oss/python/langchain/multi-agent)
- [LangChain：Subagents](https://docs.langchain.com/oss/python/langchain/multi-agent/subagents)
- [LangChain：Router](https://docs.langchain.com/oss/python/langchain/multi-agent/router)
- [LangChain：Handoffs](https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs)
- [LangChain：Custom workflow](https://docs.langchain.com/oss/python/langchain/multi-agent/custom-workflow)

# 十、总结

- 多 Agent 的拆分依据是上下文、并行、团队和权限边界，不是角色名称。
- Subagents、Router、Handoffs 和图工作流的控制权与成本不同，应按交互模式选型。
- 状态 Schema、停止条件、并发预算、工具审批和单 Agent 基线是上线前必需项。

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“Agent 工程（75）- Multi-Agent 与 LangGraph：模式、状态、并行和故障边界”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
