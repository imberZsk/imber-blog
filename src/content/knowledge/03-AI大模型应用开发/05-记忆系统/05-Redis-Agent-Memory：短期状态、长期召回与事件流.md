# 记忆系统（05） - Redis Agent Memory：短期状态、长期召回与事件流

> 读完你能：用 Redis Hash、JSON/Vector、Stream 和 TTL 分别承载 Agent 工作状态、长期记忆和事件日志，并知道哪些数据绝不能只放 Redis。
> 更新日期：2026/08/11

本文是 AI 应用开发中 **Redis 短期记忆的主文**。Redis 在 RAG 中还可承担检索缓存和限流，但缓存键、失效维度与验收指标不同，详见 [RAG（09） - Redis 检索缓存、语义缓存与限流](/knowledge/03-AI大模型应用开发/04-RAG/09-Redis-检索缓存、语义缓存与限流)。不要把会话窗口与 RAG 候选缓存放进同一套键空间、TTL 和淘汰策略。

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

## 在线运行

直接使用本文“可运行源码”中的沙盒执行；源码、复制内容和实际运行入口保持一致。

零依赖，Python 3.10+ 可运行。这个实验用于观察 Redis 数据结构和生命周期，不会伪装成真实 Redis 网络连接；生产接入仍应使用 `redis-py`、事务管道和 Redis 故障测试。

## 重点观察

- 相同 `thread_id` 在不同租户下是两条不同的键。
- 每次合法读写刷新 TTL，但越权读取不会刷新。
- 消息超过窗口后淘汰最早内容。
- TTL 到期返回空，应用可以明确降级为“无短期记忆”。

## 可运行源码：Redis Agent Memory：短期状态、长期召回与事件流

下方代码就是在线沙盒实际执行的完整源码。可直接运行、查看输出或复制到本地，页面不再依赖文章外的重复脚本。

### `main.py`

```python
"""离线复现 Redis 会话隔离、滑动窗口和 TTL 行为。"""

from __future__ import annotations

from dataclasses import dataclass, field

# 单个线程允许保留的最近消息数量。
RECENT_MESSAGE_LIMIT = 3
# 会话在最后一次合法访问后保留的秒数。
SESSION_TTL_SECONDS = 10
# 会话键使用的业务前缀。
SESSION_KEY_PREFIX = "agent:session"


@dataclass(slots=True)
class SessionValue:
    """保存会话消息和绝对过期时间。"""

    # 当前线程按时间正序保存的最近消息。
    messages: list[str] = field(default_factory=list)
    # 会话失效的模拟时钟时间。
    expires_at: int = 0


class FakeRedisSessionStore:
    """以确定性内存结构模拟本实验需要的 Redis 语义。"""

    def __init__(self) -> None:
        """初始化空键空间和从零开始的模拟时钟。"""
        # Redis 键到会话值的内存映射。
        self._sessions: dict[str, SessionValue] = {}
        # 用于复现 TTL 的单调模拟时钟。
        self._now = 0

    @staticmethod
    def build_key(tenant_id: str, user_id: str, thread_id: str) -> str:
        """生成隔离会话键；三个参数分别是租户、用户和线程标识。"""
        return f"{SESSION_KEY_PREFIX}:{tenant_id}:{user_id}:{thread_id}"

    def advance(self, seconds: int) -> None:
        """推进模拟时钟；seconds 必须是非负秒数。"""
        if seconds < 0:
            raise ValueError("seconds 不能为负数")
        self._now += seconds

    def append_message(self, tenant_id: str, user_id: str, thread_id: str, message: str) -> str:
        """追加消息、截断窗口并刷新 TTL。"""
        # 当前请求经过身份解析后的完整会话键。
        session_key = self.build_key(tenant_id, user_id, thread_id)
        # 已存在会话或首次创建的空会话。
        session_value = self._sessions.setdefault(session_key, SessionValue())
        session_value.messages.append(message)
        session_value.messages = session_value.messages[-RECENT_MESSAGE_LIMIT:]
        session_value.expires_at = self._now + SESSION_TTL_SECONDS
        return session_key

    def read_messages(self, tenant_id: str, user_id: str, thread_id: str) -> list[str] | None:
        """读取合法会话并刷新 TTL；不存在或过期时返回 None。"""
        # 当前请求根据服务端身份生成的完整会话键。
        session_key = self.build_key(tenant_id, user_id, thread_id)
        # Redis 中可能存在的会话值。
        session_value = self._sessions.get(session_key)
        if session_value is None:
            return None
        if self._now >= session_value.expires_at:
            del self._sessions[session_key]
            return None
        session_value.expires_at = self._now + SESSION_TTL_SECONDS
        return list(session_value.messages)

    def ttl(self, tenant_id: str, user_id: str, thread_id: str) -> int:
        """返回剩余 TTL；不存在或过期的会话返回 -2。"""
        # 等待查询剩余时间的完整会话键。
        session_key = self.build_key(tenant_id, user_id, thread_id)
        # Redis 中可能存在的会话值。
        session_value = self._sessions.get(session_key)
        if session_value is None or self._now >= session_value.expires_at:
            return -2
        return session_value.expires_at - self._now


def main() -> None:
    """运行隔离、窗口、TTL 刷新和过期四个场景。"""
    # 当前实验使用的离线 Redis 语义存储。
    store = FakeRedisSessionStore()
    # 当前用户的租户、用户和线程标识。
    tenant_id = "tenant-a"
    # 当前用户的稳定身份标识。
    user_id = "user-42"
    # 当前对话线程标识。
    thread_id = "thread-7"
    # 依次写入并触发窗口淘汰的四条消息。
    messages = ["你好", "默认用中文", "先给结论", "退款多久到账"]

    print("=== 1. 写入并截断最近消息 ===")
    for message in messages:
        # 每次写入返回的物理隔离键。
        session_key = store.append_message(tenant_id, user_id, thread_id, message)
        print(f"write key={session_key} message={message}")
    print("window:", store.read_messages(tenant_id, user_id, thread_id))
    print("ttl after read:", store.ttl(tenant_id, user_id, thread_id))

    print("\n=== 2. 相同 thread_id 不跨租户读取 ===")
    # 另一个租户尝试读取相同用户和线程标识的结果。
    cross_tenant_result = store.read_messages("tenant-b", user_id, thread_id)
    print("tenant-b result:", cross_tenant_result)

    print("\n=== 3. 合法读取刷新滑动 TTL ===")
    store.advance(6)
    print("ttl before read:", store.ttl(tenant_id, user_id, thread_id))
    print("read:", store.read_messages(tenant_id, user_id, thread_id))
    print("ttl after read:", store.ttl(tenant_id, user_id, thread_id))

    print("\n=== 4. TTL 到期后降级为无记忆 ===")
    store.advance(11)
    # 会话过期后应用拿到的空结果。
    expired_result = store.read_messages(tenant_id, user_id, thread_id)
    print("expired result:", expired_result)
    print("fallback: 无短期记忆，继续回答但不复用旧会话状态")


if __name__ == "__main__":
    main()
```

## 参考资料

- [LangGraph Memory](https://docs.langchain.com/oss/python/langgraph/add-memory)
- [Mem0 文档](https://docs.mem0.ai/)
