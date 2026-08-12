"""用有依赖和人工确认的步骤编排个人 Agent 工作台。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Step:
    """描述一个工作流步骤。"""

    # 用于依赖引用的步骤标识。
    step_id: str
    # 面向用户的步骤名称。
    name: str
    # 必须先完成的步骤标识。
    depends_on: tuple[str, ...] = ()
    # 是否会修改外部状态。
    requires_confirmation: bool = False


def run_workflow(auto_confirm: bool) -> dict[str, str]:
    """按依赖顺序运行；auto_confirm 控制写操作是否获批。"""
    # 从读取任务到生成日报的有向无环步骤。
    steps = [
        Step("tasks", "读取今天任务"),
        Step("late", "识别延期项", ("tasks",)),
        Step("reminders", "创建提醒", ("late",), True),
        Step("report", "生成日报", ("tasks", "late")),
    ]
    # 已完成步骤的产出，供后续步骤使用。
    outputs: dict[str, str] = {}
    for step in steps:
        if not all(dependency in outputs for dependency in step.depends_on):
            raise RuntimeError(f"依赖未满足：{step.step_id}")
        if step.requires_confirmation and not auto_confirm:
            outputs[step.step_id] = "等待人工确认"
            print(f"暂停：{step.name} 是写操作，需要确认")
            continue
        outputs[step.step_id] = f"{step.name} 已完成"
        print(outputs[step.step_id])
    return outputs


def main() -> None:
    """先展示暂停，再展示确认后的完整运行。"""
    print("未确认运行:")
    run_workflow(auto_confirm=False)
    print("\n用户确认后:")
    run_workflow(auto_confirm=True)


if __name__ == "__main__":
    main()
