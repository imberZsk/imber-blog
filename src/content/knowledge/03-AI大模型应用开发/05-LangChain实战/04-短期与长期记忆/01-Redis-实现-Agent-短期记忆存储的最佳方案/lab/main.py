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
