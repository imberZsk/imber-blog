"""用 asyncio 演示文档入库任务的生命周期和重试。"""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass

MAX_RETRIES = 2


@dataclass(slots=True)
class TaskState:
    """保存后台任务可供前端轮询的状态。"""

    # 对外返回的任务标识。
    task_id: str
    # queued/running/succeeded/failed 状态。
    status: str = "queued"
    # 0 到 100 的完成百分比。
    progress: int = 0
    # 已执行的尝试次数。
    attempts: int = 0
    # 最终错误信息。
    error: str | None = None


async def ingest_document(task: TaskState) -> None:
    """执行模拟入库；task 是会被持续更新的共享状态。"""
    while task.attempts < MAX_RETRIES:
        task.attempts += 1
        task.status = "running"
        try:
            for progress in (20, 50, 80, 100):
                await asyncio.sleep(0.03)
                task.progress = progress
                if task.attempts == 1 and progress == 50:
                    raise TimeoutError("模拟 embedding 服务超时")
            task.status = "succeeded"
            task.error = None
            return
        except TimeoutError as error:
            task.error = str(error)
            print(f"第 {task.attempts} 次失败，准备重试：{error}")
    task.status = "failed"


async def main() -> None:
    """提交任务后轮询状态，直到进入终态。"""
    # API 提交后立即创建并返回的任务状态。
    task = TaskState(task_id=uuid.uuid4().hex[:8])
    # 后台执行中的 asyncio 任务句柄。
    worker = asyncio.create_task(ingest_document(task))
    print(f"提交成功，task_id={task.task_id}，接口立即返回")
    while not worker.done():
        print(f"轮询：status={task.status} progress={task.progress}% attempts={task.attempts}")
        await asyncio.sleep(0.02)
    await worker
    print(f"终态：status={task.status} progress={task.progress}% attempts={task.attempts} error={task.error}")


if __name__ == "__main__":
    asyncio.run(main())
