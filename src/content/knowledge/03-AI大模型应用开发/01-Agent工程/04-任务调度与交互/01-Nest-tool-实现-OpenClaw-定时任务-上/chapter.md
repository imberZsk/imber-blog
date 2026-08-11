# Agent 工程（71）- Nest + tool 实现 OpenClaw 同款定时任务功能（上）

> 读完你能：理解 Agent 如何把用户自然语言转成定时任务草稿。
> 来源：`吃透 AI Agent 开发` 截图目录第 19 篇，2026/03/13，可试读 8%
> 导入与重写日期：2026/07/07

# 一、本篇定位

这是定时任务实战的上篇，重点在意图识别、参数抽取和确认前的草稿生成。

# 二、一个真实场景

用户说“明天早上九点提醒我看一下周报，并把结果发给我”。Agent 要识别这是一个定时任务，抽取时间、动作、提醒内容、执行方式。它不能马上创建任务，因为时间可能有歧义，动作可能涉及外部工具，必须先生成可确认的草稿。

# 三、核心拆解

- 定时任务工具不是普通聊天回复，它会在未来触发动作，因此参数准确性和用户确认非常重要。
- 上篇的核心是 schema：title、schedule_time、timezone、repeat_rule、action、payload、requires_confirmation。
- 模型负责从自然语言抽取草稿，后端负责时间标准化、字段校验、风险判断和确认流程。

# 四、工程链路

- 用户输入自然语言任务。
- 模型按 schema 抽取任务草稿。
- 后端标准化时间和时区。
- 校验字段是否完整。
- 判断动作风险等级。
- 返回前端确认卡片。

# 五、落地建议

- 相对时间必须结合用户时区。
- 重复任务要单独建 repeat_rule，不要写在标题里。
- 高风险动作默认 requires_confirmation=true。

# 六、常见坑

- 模型说“明天”但后端不落具体日期。
- 任务动作和提醒内容混在一个字符串里，未来不好执行。
- 没有确认卡片，用户一句话就创建了会执行的任务。

# 七、和已有主线的关系

54-55 讲工具调用；71 把工具调用用于未来任务创建，强调确认前草稿。

# 八、复述答法

> 定时任务上篇的关键是把自然语言抽成安全草稿：时间、时区、重复规则、动作和参数都结构化。模型只负责抽取，后端做标准化、校验和风险判断，最后给用户确认，而不是直接创建。

# 九、总结

- **核心拆解**：定时任务工具不是普通聊天回复，它会在未来触发动作，因此参数准确性和用户确认非常重要。
- **工程链路**：模型按 schema 抽取任务草稿。
- **常见坑**：模型说“明天”但后端不落具体日期。
- **本篇定位**：这是定时任务实战的上篇，重点在意图识别、参数抽取和确认前的草稿生成。

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“Agent 工程（71）- Nest + tool 实现 OpenClaw 同款定时任务功能（上）”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。

## 十、最小可运行示例：创建可追踪定时任务

~~~text
# requirements.txt
apscheduler
~~~

~~~python
from __future__ import annotations

from datetime import datetime, timezone

from apscheduler.schedulers.blocking import BlockingScheduler


# 调度器统一使用 UTC，展示层再转换用户时区。
scheduler = BlockingScheduler(timezone="UTC")


def run_agent_task(task_id: str) -> None:
    """执行幂等 Agent 任务；task_id 是持久化任务标识。"""

    # 实际实现先按 task_id 抢占幂等键，再调用 Agent 并记录 trace_id。
    started_at = datetime.now(timezone.utc).isoformat()
    print({"task_id": task_id, "started_at": started_at})


# 任务 ID、触发器和并发策略都应写入持久化任务表。
scheduler.add_job(
    run_agent_task,
    trigger="interval",
    minutes=10,
    args=["daily-report"],
    id="daily-report",
    max_instances=1,
    coalesce=True,
    replace_existing=True,
)
scheduler.start()
~~~

调度器只负责到点触发，任务定义、下一次时间、幂等状态和执行记录要持久化。用户时区、错过执行、重复触发和停机恢复必须有明确语义。
