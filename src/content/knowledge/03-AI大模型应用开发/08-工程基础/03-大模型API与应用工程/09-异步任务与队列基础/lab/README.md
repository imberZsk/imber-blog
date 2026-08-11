# 18 异步任务与队列基础 demo

用 asyncio 模拟「文档入库」这种慢任务，演示异步任务的完整生命周期：提交秒回 task_id、后台跑、状态流转、前端轮询进度、失败自动重试。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库（asyncio）。

## 预期输出

```
=== 提交文档入库任务（异步，不阻塞）===
接口立即返回 task_id：task_001，状态：pending

  [task_001] 第1次尝试 - 执行：解析文档
  >> 前端轮询看到：{'id': 'task_001', 'status': 'running', 'progress': 0, 'current_step': '解析文档', 'attempts': 1}
  [task_001] 解析文档 完成，进度 33%
  [task_001] 第1次尝试 - 执行：切分 chunk
  >> 前端轮询看到：{'id': 'task_001', 'status': 'running', 'progress': 33, 'current_step': '切分 chunk', 'attempts': 1}
  [task_001] 失败：步骤「切分 chunk」临时失败（如向量化接口超时） -> 准备第2次重试

  [task_001] 第2次尝试 - 执行：解析文档
  >> 前端轮询看到：{'id': 'task_001', 'status': 'running', 'progress': 0, 'current_step': '解析文档', 'attempts': 2}
  [task_001] 解析文档 完成，进度 33%
  [task_001] 第2次尝试 - 执行：切分 chunk
  >> 前端轮询看到：{'id': 'task_001', 'status': 'running', 'progress': 33, 'current_step': '切分 chunk', 'attempts': 2}
  >> 前端轮询看到：{'id': 'task_001', 'status': 'running', 'progress': 33, 'current_step': '切分 chunk', 'attempts': 2}
  [task_001] 切分 chunk 完成，进度 66%
  [task_001] 第2次尝试 - 执行：向量化
  >> 前端轮询看到：{'id': 'task_001', 'status': 'running', 'progress': 66, 'current_step': '向量化', 'attempts': 2}
  [task_001] 向量化 完成，进度 100%
  [task_001] 任务成功 ✓

  >> 前端轮询看到：{'id': 'task_001', 'status': 'succeeded', 'progress': 100, 'current_step': 'done', 'attempts': 2}
=== 最终结果：{'id': 'task_001', 'status': 'succeeded', 'progress': 100, 'current_step': 'done', 'attempts': 2} ===
要点：提交秒回 task_id；中间步骤失败自动重试；前端靠轮询拿进度。
```

「切分 chunk」步骤第一次故意失败，触发整个任务重试（attempts: 1 → 2），第二次跑通。前端轮询全程能看到 status、progress、current_step 的变化。

> 注：步骤耗时和轮询是并发的，每次运行轮询打印的条数可能略有不同（多一两行少一两行都正常），但状态流转 pending→running→succeeded、attempts 从 1 到 2 是稳定的。

## 代码↔概念对应

| 概念 | 在 main.py 哪里 |
|---|---|
| 任务状态机（pending/running/succeeded/failed） | 顶部常量 + `Task.status` |
| 提交秒回 task_id | `main` 里创建 Task 后立即打印 id |
| 任务执行 + 进度更新 | `execute` 里的 `task.progress` |
| 失败整体重试 + 重试上限 | `execute` 的 `while task.attempts <= max_retries` |
| 前端轮询拿进度 | `poll` + `Task.snapshot` |
| 执行与轮询并发 | `main` 里 `asyncio.gather` |

## 动手改

- 把 `max_retries` 改成 0，看任务在「切分 chunk」失败后直接变 `failed`，不再重试。
- 给 `run_step` 加个永远失败的步骤，观察重试耗尽后 `status` 变 `failed`、`error` 记录原因。
- 真实项目里 `Task` 存进 Redis / 数据库而非内存，`poll` 换成前端定时 `GET /api/tasks/{id}`，多个任务用真正的队列（Celery / RQ）调度。

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“18 异步任务与队列基础 demo”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
