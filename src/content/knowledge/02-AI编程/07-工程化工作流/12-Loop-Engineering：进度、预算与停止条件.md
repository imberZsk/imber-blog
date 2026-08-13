# 工程化工作流（12） - Loop Engineering：进度、预算与停止条件

> Loop Engineering 把“一直尝试”改造成有状态、有证据、有预算、能停止和恢复的闭环。

> 读完你能：实现一个最小循环控制器，识别原地打转，并为成功、失败、阻塞和人工接管定义不同终态。

## 核心知识清单

- Observe、Decide、Act、Verify 循环
- 外部状态、证据和确定性验证器
- 轮次、时间、Token 与费用预算
- 进度信号、错误签名与无进展检测
- 成功、失败、阻塞和取消终态
- Checkpoint、恢复点和人工接管
- `/loop` 周期触发、Goal Contract 与工程循环的分工
- Ralph 类新会话循环的使用边界

## `/loop`、goal 与 Loop Engineering 不是一回事

这三个词分别回答“何时再执行”“做到什么算结束”“每一轮如何可靠推进”。具体产品是否提供 `/loop` 或 `/goal` 斜杠命令，要以当前宿主的官方文档和命令面板为准；工程设计不能依赖一个未经确认的命令名。

| 概念 | 解决的问题 | 最小契约 | 典型场景 | 主要风险 |
| --- | --- | --- | --- | --- |
| `/loop` 或定时触发 | 下一次何时唤醒 | 周期、时区、重叠策略、取消开关 | 每 10 分钟查看一次 CI 或部署状态 | 空转、重复执行、费用失控 |
| goal | 什么结果才算完成 | 目标、可执行判定器、非目标、截止时间 | 测试和 lint 同时通过 | 目标模糊导致永不结束或错误完成 |
| Loop Engineering | 每轮怎样基于证据推进并安全停止 | 状态、动作、验证、预算、终态、Checkpoint | 调查、修改、测试需要多轮反馈的任务 | 原地打转、越权动作、状态丢失 |

`/loop` 只是触发器，不等于完成控制器。每隔五分钟运行一次“检查 CI”能够发现状态变化，但如果没有去重游标、停止条件和取消开关，它会在 CI 通过后继续消耗资源。能订阅 webhook 或任务事件时优先使用事件触发；只有外部系统没有可靠事件时，才用轮询兜底。

goal 不是一句愿望，而是一份可验证的 **Goal Contract**：

- **Objective**：要改变的可观察结果，例如“认证回归测试全部通过”。
- **Success predicate**：机器可执行的判定器，例如 `pytest tests/auth && ruff check src` 的退出码均为 0。
- **Non-goals**：本轮不允许扩大的范围，例如不升级框架、不修改数据库 Schema。
- **Budget**：最大轮次、墙钟时间、Token、费用和允许修改的文件范围。
- **Terminal states**：至少区分 `succeeded`、`blocked`、`exhausted`、`cancelled`，不能把“停止运行”都记成成功。
- **Evidence**：保存判定命令、退出码、关键输出、Diff 摘要和产物版本，让完成结论可复核。

例如“把性能优化好”没有指标和基线，不能作为 goal；“在固定数据集和运行环境下，P95 从 480 ms 降至 300 ms 以下，错误率不升高”才可判定。目标达到后必须由判定器驱动终止，不应等待模型自行宣称完成。

选择顺序很简单：只需周期查看状态时用 `/loop` 或调度器；需要达成明确结果时先写 Goal Contract；任务还需要多轮观察、行动、验证、预算控制和中断恢复时，再实现完整的 Loop Engineering。三者可以组合，但职责不能互相替代。

## 可运行完整示例：一个 Loop 的最小契约

每轮必须回答五个问题：当前状态是什么、这一轮要改变什么、动作实际产生了什么、验证器如何判断进展、什么条件下停止。只有模型输出“我觉得完成了”不算验证。

```python
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Callable


class LoopStatus(str, Enum):
    """表示循环的可审计终态或继续状态。"""

    RUNNING = "running"  # 循环仍可继续获取新证据。
    SUCCEEDED = "succeeded"  # 确定性验收已经通过。
    BLOCKED = "blocked"  # 重复失败或缺少外部决策，需要接管。
    EXHAUSTED = "exhausted"  # 轮次预算耗尽但仍未通过。


@dataclass(frozen=True)
class Observation:
    """保存一次确定性验证得到的错误签名和通过状态。"""

    passed: bool  # 保存验收命令是否通过。
    error_signature: str  # 保存去除随机噪声后的失败特征。


@dataclass
class LoopState:
    """保存循环轮次、重复失败次数和当前状态。"""

    iteration: int = 0  # 保存已经执行的循环轮次。
    repeated_error_count: int = 0  # 保存同一错误连续重复的次数。
    last_error_signature: str = ""  # 保存上一轮的规范化错误签名。
    status: LoopStatus = LoopStatus.RUNNING  # 保存当前循环状态。


def run_loop(
    act: Callable[[LoopState], None],
    verify: Callable[[], Observation],
    max_iterations: int = 5,
    max_repeated_errors: int = 2,
) -> LoopState:
    """在预算内执行动作和验证。

    Args:
        act: 接收当前状态并执行一轮候选动作的函数。
        verify: 运行确定性验收并返回观察结果的函数。
        max_iterations: 本次循环允许执行的最大轮次。
        max_repeated_errors: 同一错误允许连续出现的最大次数。
    """

    # 保存跨轮次累积的循环状态。
    state = LoopState()
    while state.iteration < max_iterations:
        state.iteration += 1
        act(state)
        # 保存当前轮确定性验证得到的观察结果。
        observation = verify()
        if observation.passed:
            state.status = LoopStatus.SUCCEEDED
            return state

        if observation.error_signature == state.last_error_signature:
            state.repeated_error_count += 1
        else:
            state.repeated_error_count = 0
            state.last_error_signature = observation.error_signature

        if state.repeated_error_count >= max_repeated_errors:
            state.status = LoopStatus.BLOCKED
            return state

    state.status = LoopStatus.EXHAUSTED
    return state


if __name__ == "__main__":
    # 保存演示中每轮验证返回的错误签名。
    checks = iter(["E_ASSERT", "E_ASSERT", "E_ASSERT"])

    def act(state: LoopState) -> None:
        """模拟执行一轮修复动作并输出当前轮次。"""

        print(f"iteration={state.iteration}: apply candidate patch")

    def verify() -> Observation:
        """模拟测试命令并返回稳定的错误签名。"""

        return Observation(passed=False, error_signature=next(checks))

    # 保存示例循环结束后的终态，供读者核对停止原因。
    result = run_loop(act, verify)
    print(f"status={result.status.value}, repeated={result.repeated_error_count}")
```

预期在同一错误连续出现后得到 `status=blocked`，而不是耗尽所有轮次。生产实现还要保存动作、diff、命令输出、耗时和费用；错误签名应去掉时间戳、随机 ID 等噪声。

## 进度不是“工具调用变多”

有效进度应与任务绑定：失败测试数量下降、复现范围缩小、根因假设被证伪、覆盖率或业务指标达到门槛。重复编辑同一行、反复安装同一依赖、只改变措辞都不是进度。无进展时应换本质不同的假设或转人工，而不是提高重试次数。

## Ralph 类循环

Ralph 的典型做法是让新的 Agent 会话反复读取稳定规格和外部进度文件，每轮执行一个小任务并提交结果。新上下文能缓解历史噪声，但会丢失未写入外部状态的事实。使用时必须保证任务可分割、测试可确定、提交可回退、上下文可重建，并设置最大轮次和全局预算。

## 高风险边界

部署、数据删除、迁移、密钥、付款和权限变更不能因为“还在循环中”而自动获权。进入这些动作前暂停，给出当前状态、证据、计划、影响和回滚方案。恢复时使用持久化 checkpoint，不能依赖模型声称“记得之前做到哪里”。

## 学完验收

- 在线示例能在重复错误时停止，并区分 blocked 与 exhausted。
- 循环至少有一种确定性进度信号和四类预算上限。
- 人工接管 Brief 足以让人继续，而不需要重读全部对话。

## 参考资料

- [OpenAI Agents SDK Running Agents](https://openai.github.io/openai-agents-python/running_agents/)
- [OpenAI Codex Automations](https://developers.openai.com/codex/app/automations/)
- [Geoffrey Huntley 的 Ralph 方法说明](https://ghuntley.com/ralph/)
- [LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
