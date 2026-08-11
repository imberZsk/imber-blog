"""演示有界短期记忆和跨会话长期记忆。"""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

SHORT_TERM_LIMIT = 3


class MemoryStore:
    """同时管理当前会话和持久化用户偏好。"""

    def __init__(self, file_path: Path) -> None:
        """初始化记忆；file_path 是长期记忆 JSON 路径。"""
        # 超过容量会自动淘汰最早消息的会话记忆。
        self.short_term: deque[str] = deque(maxlen=SHORT_TERM_LIMIT)
        # 模拟数据库的长期记忆文件。
        self.file_path = file_path

    def remember_turn(self, message: str) -> None:
        """保存当前会话消息；message 是用户或助手文本。"""
        self.short_term.append(message)

    def save_preference(self, user_id: str, key: str, value: str) -> None:
        """跨会话保存用户偏好；三个参数分别是用户、偏好键和值。"""
        # 已存在的长期记忆对象。
        data = json.loads(self.file_path.read_text(encoding="utf-8")) if self.file_path.exists() else {}
        # 当前用户的偏好映射。
        user_preferences = data.setdefault(user_id, {})
        user_preferences[key] = value
        self.file_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def load_preferences(self, user_id: str) -> dict[str, str]:
        """读取指定用户长期偏好。"""
        if not self.file_path.exists():
            return {}
        # 文件中的全部用户记忆。
        data = json.loads(self.file_path.read_text(encoding="utf-8"))
        return data.get(user_id, {}) if isinstance(data, dict) else {}


def main() -> None:
    """展示短期淘汰、长期保留和实验文件清理。"""
    # 实验运行时临时生成的长期记忆文件。
    memory_path = Path(__file__).resolve().parent / "long_term_memory.json"
    # 当前实验的记忆存储。
    memory = MemoryStore(memory_path)
    try:
        for message in ("你好", "我叫小李", "我喜欢简洁回答", "报销期限？"):
            memory.remember_turn(message)
        memory.save_preference("user-1", "answer_style", "concise")
        print("短期记忆（第一条已淘汰）:", list(memory.short_term))
        print("长期记忆（新会话仍可读取）:", MemoryStore(memory_path).load_preferences("user-1"))
    finally:
        memory_path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
