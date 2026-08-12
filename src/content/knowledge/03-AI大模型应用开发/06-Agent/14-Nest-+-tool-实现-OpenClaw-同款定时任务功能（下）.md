# Agent（14） - Nest + tool 实现 OpenClaw 同款定时任务功能（下）

> 读完你能：把定时任务从草稿推进到存储、调度、执行、失败重试和审计。

# 一、本篇定位

这是定时任务实战下篇，重点从“创建任务”转到“可靠执行任务”。

# 二、一个真实场景

用户确认了明天九点的任务，系统需要把它存起来，到点触发，调用指定工具，记录结果，并在失败时重试或通知用户。真正的难点不是让模型理解一句话，而是让未来执行可控、可追踪。

# 三、核心拆解

- 任务需要持久化，不能只存在内存。字段至少包括 id、user_id、schedule_time、status、action、payload、attempts、last_error。
- 调度器负责扫描到期任务并派发执行。执行器负责调用工具，并把成功或失败写回状态。
- 失败要分类：临时网络失败可重试，权限失败或参数非法应停止并通知用户。

# 四、工程链路

- 用户确认任务。
- 写入数据库并标记 pending。
- 调度器到点取出任务。
- 执行器按 action 调工具。
- 记录结果和 trace。
- 成功标记 done，失败按策略 retry 或 failed。

# 五、落地建议

- 任务执行要幂等，避免重复触发造成副作用。
- 每次执行都记录 requestId 和 tool trace。
- 用户要能查看、取消、暂停任务。

# 六、常见坑

- 服务重启后内存任务丢失。
- 失败无限重试。
- 重复调度同一任务导致发送多次消息。

# 七、和已有主线的关系

72 对应 18 异步任务与队列基础的 Agent 场景升级，也和 40 可观测性、42 排查清单相关。

# 八、设计判断

定时任务系统最容易被低估的是“未来副作用”。用户现在确认，动作未来执行，中间可能发生权限变化、账号失效、目标资源删除、服务重启。稳妥设计是执行前再次校验权限和参数，而不是相信创建时的状态永远有效。对于会发消息、改数据、调用外部接口的动作，还要把 dry-run、确认记录和执行记录分开保存。这样任务失败时能判断是调度失败、工具失败，还是业务条件已经变化。

# 九、复述答法

> 定时任务下篇关注可靠执行：任务要持久化，调度器扫描到期任务，执行器调用工具并记录状态。重试要有限、执行要幂等、用户要能取消，所有执行结果都要进入 trace。

# 十、总结

- **核心拆解**：任务需要持久化，不能只存在内存。
- **工程链路**：写入数据库并标记 pending。
- **常见坑**：重复调度同一任务导致发送多次消息。
- **本篇定位**：这是定时任务实战下篇，重点从“创建任务”转到“可靠执行任务”。

## 十、最小可运行示例：任务幂等与恢复

~~~text
# requirements.txt
# Python 3.10+ 标准库，无第三方依赖。
~~~

~~~python
from __future__ import annotations

import sqlite3
from contextlib import closing


# SQLite 文件用于演示持久任务状态，生产可换 PostgreSQL。
DATABASE_PATH = "tasks.db"


def claim_task(task_id: str, scheduled_at: str) -> bool:
    """原子抢占一次计划执行；两个参数组成唯一幂等键。"""

    # 每次调用使用短事务，唯一约束负责抵御并发重复执行。
    with closing(sqlite3.connect(DATABASE_PATH)) as connection:
        connection.execute(
            "CREATE TABLE IF NOT EXISTS runs (task_id TEXT, scheduled_at TEXT, PRIMARY KEY(task_id, scheduled_at))"
        )
        try:
            connection.execute(
                "INSERT INTO runs(task_id, scheduled_at) VALUES (?, ?)",
                (task_id, scheduled_at),
            )
            connection.commit()
            return True
        except sqlite3.IntegrityError:
            return False


print(claim_task("daily-report", "2026-08-11T01:00:00Z"))
print(claim_task("daily-report", "2026-08-11T01:00:00Z"))
~~~

生产实现还要区分 running、succeeded、failed 和 retryable，记录 lease 超时与重试次数。幂等键必须代表同一次业务执行，不能每次重试都生成新键。

## 参考资料

- [LangChain Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [LangGraph 文档](https://docs.langchain.com/oss/python/langgraph/overview)
