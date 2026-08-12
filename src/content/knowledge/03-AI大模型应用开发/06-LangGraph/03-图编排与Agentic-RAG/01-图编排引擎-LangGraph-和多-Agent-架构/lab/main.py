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
