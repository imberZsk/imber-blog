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

<!-- knowledge-lab-merged -->

# 动手实践：Multi-Agent、Checkpoint 与 HIL

这个实验把 Multi-Agent 最容易被忽略的工程边界放进同一条状态流：**Supervisor 路由、专家最小权限、结果归并、写操作中断、Checkpoint、人工审批后恢复**。

## 在线运行

直接使用本文“可运行源码”中的沙盒执行；源码、复制内容和实际运行入口保持一致。

零依赖，Python 3.10+ 可运行。它是 LangGraph 机制模拟，不依赖模型或外部工具；真实接入时可把状态换成 `TypedDict`，用 Checkpointer 保存线程，用 `interrupt()` 暂停，用 `Command(resume=...)` 恢复。

## 重点观察

- Supervisor 只负责路由，不继承专家的全部工具。
- 读取任务可以直接完成，删除长期记忆属于副作用，必须先暂停。
- Checkpoint 只保存受控状态，不保存密钥或模型思考过程。
- 恢复时使用同一 `thread_id`，审批结果进入审计事件。

## 可运行源码：Multi-Agent 与 LangGraph：模式、状态、并行和故障边界

下方代码就是在线沙盒实际执行的完整源码。可直接运行、查看输出或复制到本地，页面不再依赖文章外的重复脚本。

### `main.py`

```python
"""离线演示 Multi-Agent 路由、Checkpoint 和人在回路恢复。"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

# 多 Agent 工作流允许分发的最大子任务数。
MAX_SUBTASKS = 4
# 有副作用的工具名称集合。
SIDE_EFFECT_TOOLS = {"delete_memory"}


@dataclass(frozen=True, slots=True)
class Task:
    """保存 Supervisor 可以分发的结构化子任务。"""

    # 子任务的稳定标识。
    task_id: str
    # 用户提出的受控任务描述。
    instruction: str


@dataclass(frozen=True, slots=True)
class AgentSpec:
    """定义专家 Agent 的路由关键词和最小工具权限。"""

    # Trace 中使用的专家名称。
    name: str
    # Supervisor 判断领域所用的关键词。
    keywords: tuple[str, ...]
    # 当前专家唯一允许调用的工具。
    allowed_tools: frozenset[str]


@dataclass(slots=True)
class WorkflowState:
    """保存图节点之间允许持久化和恢复的最小状态。"""

    # 当前运行使用的稳定线程标识。
    thread_id: str
    # 等待 Supervisor 处理的结构化任务。
    pending_tasks: list[Task]
    # 已完成任务的结构化结果。
    results: dict[str, str] = field(default_factory=dict)
    # 等待人工批准的工具调用参数。
    pending_approval: dict[str, str] | None = None
    # 当前图的有限状态。
    status: Literal["running", "interrupted", "done", "rejected"] = "running"
    # 可持久化、可审计的业务事件。
    events: list[str] = field(default_factory=list)


class CheckpointStore:
    """以内存快照模拟 LangGraph Checkpointer。"""

    def __init__(self) -> None:
        """初始化线程标识到状态快照的空映射。"""
        # 每个线程最近一次可恢复的状态快照。
        self._checkpoints: dict[str, WorkflowState] = {}

    def save(self, state: WorkflowState) -> None:
        """保存状态副本；state 是即将中断或继续的图状态。"""
        # Pending tasks 的防共享副本。
        pending_tasks = list(state.pending_tasks)
        # Results 的防共享副本。
        results = dict(state.results)
        # 待审批参数的防共享副本。
        pending_approval = dict(state.pending_approval) if state.pending_approval is not None else None
        # 事件列表的防共享副本。
        events = list(state.events)
        self._checkpoints[state.thread_id] = WorkflowState(
            thread_id=state.thread_id,
            pending_tasks=pending_tasks,
            results=results,
            pending_approval=pending_approval,
            status=state.status,
            events=events,
        )

    def load(self, thread_id: str) -> WorkflowState:
        """读取线程快照；thread_id 必须属于当前授权用户。"""
        # 指定线程最近保存的状态快照。
        checkpoint = self._checkpoints.get(thread_id)
        if checkpoint is None:
            raise KeyError(f"checkpoint 不存在: {thread_id}")
        return WorkflowState(
            thread_id=checkpoint.thread_id,
            pending_tasks=list(checkpoint.pending_tasks),
            results=dict(checkpoint.results),
            pending_approval=dict(checkpoint.pending_approval) if checkpoint.pending_approval is not None else None,
            status=checkpoint.status,
            events=list(checkpoint.events),
        )


def route_task(task: Task, agents: list[AgentSpec]) -> AgentSpec:
    """把任务路由到一个最匹配专家；task 是结构化子任务。"""
    for agent in agents:
        # 当前专家是否命中任务领域关键词。
        has_matching_keyword = any(keyword in task.instruction for keyword in agent.keywords)
        if has_matching_keyword:
            return agent
    raise ValueError(f"没有专家能处理任务: {task.instruction}")


def choose_tool(task: Task) -> str:
    """按任务语义选择受控工具；task 不包含模型自由生成的工具名。"""
    if "删除" in task.instruction and "记忆" in task.instruction:
        return "delete_memory"
    if "报销" in task.instruction:
        return "search_policy"
    return "search_memory"


def execute_read_tool(tool_name: str, task: Task) -> str:
    """执行无副作用教学工具；tool_name 已通过专家白名单。"""
    if tool_name == "search_policy":
        return "报销应在消费后 30 天内提交。[policy#1]"
    if tool_name == "search_memory":
        return f"找到与“{task.instruction}”相关的 2 条记忆。"
    raise ValueError(f"未知只读工具: {tool_name}")


def run_until_interrupt(state: WorkflowState, agents: list[AgentSpec], checkpoints: CheckpointStore) -> WorkflowState:
    """运行图直到完成或遇到副作用中断。"""
    if len(state.pending_tasks) > MAX_SUBTASKS:
        raise ValueError("子任务数量超过并发预算")

    while state.pending_tasks:
        # Supervisor 当前准备分发的首个任务。
        task = state.pending_tasks.pop(0)
        # 根据领域关键词选出的专家 Agent。
        agent = route_task(task, agents)
        # 根据结构化任务选择的工具。
        tool_name = choose_tool(task)
        state.events.append(f"route:{task.task_id}->{agent.name}")
        if tool_name not in agent.allowed_tools:
            state.results[task.task_id] = "blocked: agent 无工具权限"
            state.events.append(f"permission_denied:{agent.name}:{tool_name}")
            continue
        if tool_name in SIDE_EFFECT_TOOLS:
            state.pending_approval = {"task_id": task.task_id, "tool": tool_name, "target": "user-42"}
            state.status = "interrupted"
            state.events.append(f"interrupt:{tool_name}")
            checkpoints.save(state)
            return state
        state.results[task.task_id] = execute_read_tool(tool_name, task)
        state.events.append(f"complete:{task.task_id}")

    state.status = "done"
    checkpoints.save(state)
    return state


def resume_after_human(thread_id: str, approved: bool, checkpoints: CheckpointStore) -> WorkflowState:
    """用人工决策恢复图；thread_id 必须匹配原始中断线程。"""
    # 从 Checkpointer 恢复的中断状态。
    state = checkpoints.load(thread_id)
    # 中断时保存的待审批工具调用。
    approval = state.pending_approval
    if state.status != "interrupted" or approval is None:
        raise ValueError("当前线程没有待审批中断")

    # 待审批调用所属的任务标识。
    task_id = approval["task_id"]
    if approved:
        state.results[task_id] = "deleted: 长期记忆 user-42（教学模拟）"
        state.events.append("human_approved:delete_memory")
        state.status = "done"
    else:
        state.results[task_id] = "rejected: 人工拒绝删除"
        state.events.append("human_rejected:delete_memory")
        state.status = "rejected"
    state.pending_approval = None
    checkpoints.save(state)
    return state


def main() -> None:
    """运行只读任务、写操作中断和人工恢复完整流程。"""
    # 系统注册的专家及各自最小工具权限。
    agents = [
        AgentSpec("policy-agent", ("报销", "制度"), frozenset({"search_policy"})),
        AgentSpec("memory-agent", ("记忆", "偏好"), frozenset({"search_memory", "delete_memory"})),
    ]
    # 当前运行使用的 Checkpointer。
    checkpoints = CheckpointStore()
    # Supervisor 拆出的两个受控子任务。
    tasks = [
        Task("task-1", "查询报销提交期限"),
        Task("task-2", "删除用户的长期记忆"),
    ]
    # 图的初始共享状态。
    initial_state = WorkflowState(thread_id="thread-202", pending_tasks=tasks)
    # 首次运行到人工中断后的状态。
    interrupted_state = run_until_interrupt(initial_state, agents, checkpoints)

    print("=== 首次运行：只读完成，写操作暂停 ===")
    print("status:", interrupted_state.status)
    print("results:", interrupted_state.results)
    print("pending_approval:", interrupted_state.pending_approval)
    print("events:", interrupted_state.events)

    print("\n=== 同一 thread_id 经人工批准后恢复 ===")
    # 人工批准后从 checkpoint 恢复得到的最终状态。
    resumed_state = resume_after_human("thread-202", approved=True, checkpoints=checkpoints)
    print("status:", resumed_state.status)
    print("results:", resumed_state.results)
    print("events:", resumed_state.events)


if __name__ == "__main__":
    main()
```

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)
