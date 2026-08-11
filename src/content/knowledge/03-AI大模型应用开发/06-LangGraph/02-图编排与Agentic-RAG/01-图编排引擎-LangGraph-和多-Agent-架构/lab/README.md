# Multi-Agent、Checkpoint 与 HIL Demo

这个实验把 Multi-Agent 最容易被忽略的工程边界放进同一条状态流：**Supervisor 路由、专家最小权限、结果归并、写操作中断、Checkpoint、人工审批后恢复**。

## 本地运行

```bash
python3 main.py
```

零依赖，Python 3.10+ 可运行。它是 LangGraph 机制模拟，不依赖模型或外部工具；真实接入时可把状态换成 `TypedDict`，用 Checkpointer 保存线程，用 `interrupt()` 暂停，用 `Command(resume=...)` 恢复。

## 重点观察

- Supervisor 只负责路由，不继承专家的全部工具。
- 读取任务可以直接完成，删除长期记忆属于副作用，必须先暂停。
- Checkpoint 只保存受控状态，不保存密钥或模型思考过程。
- 恢复时使用同一 `thread_id`，审批结果进入审计事件。
