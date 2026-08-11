# LangChain 实战（85）- Redis Agent Memory：短期状态、长期召回与事件流

> 读完你能：用 Redis Hash、JSON/Vector、Stream 和 TTL 分别承载 Agent 工作状态、长期记忆和事件日志，并知道哪些数据绝不能只放 Redis。
> 更新日期：2026/08/11

# 一、先按访问模式选数据结构

Redis 不只是“把 messages 放进 List”。不同记忆需要不同访问方式：

| 数据 | Redis 结构 | 关键操作 | 生命周期 |
| --- | --- | --- | --- |
| 线程工作状态 | Hash | `HSET` / `HGETALL` | 短 TTL |
| 最近消息 | List 或 JSON | `LPUSH` / `LTRIM` | 会话级 |
| 长期语义记忆 | JSON + HNSW | `FT.SEARCH` | 按类型衰减 |
| Agent 事件日志 | Stream | `XADD` / `XREVRANGE` / `XTRIM` | 长度有界 |
| 幂等锁 | String | `SET NX EX` | 秒到分钟 |
| 语义缓存 | JSON + Vector | 相似检索 | 跟模型和 Prompt 版本绑定 |

订单结果、扣费记录、审批结果和审计证据必须进入持久主库。判断标准不是“Redis 会不会持久化”，而是数据丢失或回滚时业务能否接受。

# 二、短期会话的安全实现

```python
import json
from typing import Any

from redis import Redis

# 短期会话默认保留两小时。
SESSION_TTL_SECONDS = 2 * 60 * 60
# 每个线程最多保留的最近消息数量。
RECENT_MESSAGE_LIMIT = 20
# Redis 键前缀，避免和其他业务键冲突。
SESSION_KEY_PREFIX = "agent:session"


def session_key(tenant_id: str, user_id: str, thread_id: str) -> str:
    """生成包含租户、用户和线程边界的会话键。"""
    return f"{SESSION_KEY_PREFIX}:{tenant_id}:{user_id}:{thread_id}"


def save_working_memory(
    redis_client: Redis,
    tenant_id: str,
    user_id: str,
    thread_id: str,
    state: dict[str, Any],
) -> None:
    """原子写入当前工作状态并刷新会话 TTL。"""
    # 当前线程唯一的 Redis 键。
    key = session_key(tenant_id, user_id, thread_id)
    # 事务管道确保状态与过期时间一起提交。
    pipeline = redis_client.pipeline(transaction=True)
    pipeline.hset(key, mapping={"state": json.dumps(state, ensure_ascii=False)})
    pipeline.expire(key, SESSION_TTL_SECONDS)
    pipeline.execute()


def load_working_memory(
    redis_client: Redis,
    tenant_id: str,
    user_id: str,
    thread_id: str,
) -> dict[str, Any] | None:
    """读取当前用户线程的工作状态，不跨租户回退。"""
    # 当前线程唯一的 Redis 键。
    key = session_key(tenant_id, user_id, thread_id)
    # Redis 中序列化后的状态字符串。
    raw_state = redis_client.hget(key, "state")
    if raw_state is None:
        return None
    return json.loads(raw_state)
```

键必须包含租户、用户和线程。只用 `session_id` 并假设它全局唯一，是常见的串数据根因。若服务允许用户提交 `thread_id`，还要在业务层校验其所有权。

# 三、事件流与异步总结

Agent 每一步可写入 Redis Stream：

```python
from redis import Redis

# 单线程事件流保留的近似最大事件数。
EVENT_STREAM_MAX_LENGTH = 1000


def append_agent_event(redis_client: Redis, thread_key: str, event_type: str, payload: str) -> str:
    """追加一条有界 Agent 事件，供恢复、总结和观测消费。"""
    # 当前线程的事件流键。
    stream_key = f"{thread_key}:events"
    return redis_client.xadd(
        stream_key,
        {"type": event_type, "payload": payload},
        maxlen=EVENT_STREAM_MAX_LENGTH,
        approximate=True,
    )
```

总结器使用 Consumer Group 消费事件并写回滚动摘要。模型调用不要持有 Redis 分布式锁；应先获取事件快照，再释放锁并调用模型，最后用版本号或 Lua 脚本做乐观并发更新。

# 四、长期记忆也可以放 Redis，但不是同一个键

Redis Search 可对带 Embedding 的 JSON 建 HNSW 索引，同时按 `tenant_id`、`user_id`、`namespace`、`memory_type` 做 TAG 过滤。写入前可用同一索引查近邻，避免重复记忆；召回后仍要做新鲜度、可信度和冲突处理。

长期记忆记录至少包含：

```json
{
  "memory_id": "mem-20260811-001",
  "tenant_id": "tenant-a",
  "user_id": "user-42",
  "namespace": "preferences",
  "memory_type": "explicit_preference",
  "text": "回答默认使用中文",
  "embedding": [0.12, -0.08],
  "source_thread_id": "thread-9",
  "created_at": "2026-08-11T09:00:00Z",
  "valid_until": null,
  "status": "active"
}
```

删除记忆时要同时删除 JSON、向量索引可见性、语义缓存和异步副本，并记录删除传播是否完成。

# 五、缓存、锁与幂等

- 生成缓存键至少包含模型、Prompt 模板版本、知识库版本、权限摘要和规范化问题。
- `SET key value NX EX seconds` 可用于短锁；锁值使用随机 token，释放时用 Lua 校验 token，不能直接 `DEL`。
- 工具副作用用业务幂等键落主库，Redis 只能做快速挡板，不能成为唯一幂等凭证。
- Redis 达到内存上限触发淘汰时，不能让关键业务记录随缓存一起消失。

# 六、验收与故障注入

必须测试：

1. Redis 短暂不可用时，聊天是降级为无记忆，还是明确失败。
2. 同一线程两个请求并发更新时，是否丢消息或覆盖新摘要。
3. TTL 到期后，主库中的业务事实是否仍可恢复。
4. 跨租户、跨用户读取是否始终返回空。
5. Redis 重启、主从切换和网络抖动时，P95 延迟与重试是否可控。
6. 内存接近上限时，淘汰策略是否符合数据分级。

# 七、常见错误

- 不设置 TTL 和 Stream 上限，短期状态无限增长。
- 在 Redis 键里遗漏租户或用户边界。
- 把整段对话每轮重新 JSON 序列化，造成大键和网络放大。
- 用分布式锁包住 LLM 调用，锁持有几十秒并形成雪崩。
- 缓存键漏掉权限或知识库版本，导致旧答案或越权答案复用。

# 八、参考资料

- [Redis：Agent memory](https://redis.io/docs/latest/develop/use-cases/agent-memory/)
- [Redis：Vector search](https://redis.io/docs/latest/develop/ai/search-and-query/vectors/)
- [LangGraph：Memory](https://docs.langchain.com/oss/python/langgraph/add-memory)

# 九、总结

- Hash 管工作状态，JSON + Vector 管长期召回，Stream 管有序事件，TTL/XTRIM 管边界。
- Redis 是热路径记忆层，不应成为订单、扣费、审批和审计的唯一事实源。
- 生产验收必须覆盖并发、过期、故障、淘汰和跨租户隔离。

<!-- knowledge-lab-merged -->

# 动手实践：Redis Session Memory 机制

用内存实现一个最小 Redis 语义模拟器，复现会话记忆真正依赖的四个行为：**租户键隔离、最近消息截断、滑动 TTL、过期降级**。

## 本地运行

```bash
python3 main.py
```

零依赖，Python 3.10+ 可运行。这个实验用于观察 Redis 数据结构和生命周期，不会伪装成真实 Redis 网络连接；生产接入仍应使用 `redis-py`、事务管道和 Redis 故障测试。

## 重点观察

- 相同 `thread_id` 在不同租户下是两条不同的键。
- 每次合法读写刷新 TTL，但越权读取不会刷新。
- 消息超过窗口后淘汰最早内容。
- TTL 到期返回空，应用可以明确降级为“无短期记忆”。
