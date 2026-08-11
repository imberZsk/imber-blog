# Agent 短期与长期记忆 Demo

用同一个 `MemoryStore` 对比两类状态：短期消息保存在有界滑动窗口中，长期偏好写入持久化文件并可被新实例读取。

## 本地运行

```bash
python3 main.py
```

零依赖，Python 3.10+ 可运行。运行中会临时写入 `long_term_memory.json` 模拟持久层，并在结束时清理。

## 预期输出

```text
短期记忆（第一条已淘汰）: ['我叫小李', '我喜欢简洁回答', '报销期限？']
长期记忆（新会话仍可读取）: {'answer_style': 'concise'}
```

## 代码与概念对应

| 概念 | 源码位置 |
| --- | --- |
| 有界短期窗口 | `deque(maxlen=SHORT_TERM_LIMIT)` |
| 会话消息写入 | `remember_turn` |
| 长期偏好持久化 | `save_preference` |
| 新实例跨会话读取 | `load_preferences` |
| 实验数据清理 | `main` 的 `finally` |

生产环境中，短期状态通常进入 Redis 或 LangGraph Checkpointer，长期偏好进入带权限、来源、冲突和删除治理的记忆层；业务事实与审计记录仍应存入各自的权威系统。

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：展示当前线程的有界消息窗口、跨会话长期偏好存储、新会话读取路径，以及 TTL、用户隔离和删除边界。
