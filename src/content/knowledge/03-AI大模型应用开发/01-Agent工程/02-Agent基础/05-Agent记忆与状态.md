# Agent 工程（31）- Agent 记忆与状态

> 一句话目标：读完你能分清短期记忆和长期记忆各管什么、为什么短期要截断长期要持久化，并知道分别用什么存。

# 一、与进阶篇的分工

本篇保留为记忆概念基础：重点区分短期、长期和状态。进阶实现请读 63《Memory 管理的三大策略》、85《Redis 短期记忆》、86《Mem0 长期记忆》，分别讲策略、缓存层和长期记忆治理。

# 二、一个真实场景

用户和你的 Agent 聊天：

> 用户：我的默认客户号是 C1001
> Agent：好的，记住了
> 用户：帮我查下它的订单 ← 「它」指谁？
> Agent：（查 C1001）共 2 笔订单

这里 Agent 能听懂「它」=C1001，靠的是**短期记忆**——它记得这轮对话前面说过的话。

但第二天用户重新打开，又问「查下我的订单」。如果 Agent 只有短期记忆，新会话一开始是空的，它不知道「我」是谁，又得问一遍客户号。要让它跨天还记得「这个用户默认是 C1001」，得靠**长期记忆**。

这两种记忆管的事完全不同，存法也不同。混为一谈，Agent 要么「失忆」（该记的没记），要么「乱记」（短期的东西当长期存，存一堆垃圾）。

# 三、短期记忆：当前会话的上下文

短期记忆就是当前这轮对话的消息历史。它的作用是让 Agent 理解上下文——「它」「上一笔」「再改一下」这类指代，全靠它。

短期记忆有两个特点：

- **有容量上限**。模型的上下文窗口装不下无限长的历史，对话一长就得裁剪。最简单的裁法是「只保留最近 N 条」（滑动窗口），更讲究的会把早期对话压成摘要再保留。
- **会话结束就没了**。它是这次对话的临时状态，关掉就清空，不跨会话。

```python
def add(self, role, content):
    self.messages.append((role, content))
    if len(self.messages) > self.max_turns:        # 超出容量
        self.messages = self.messages[-self.max_turns:]  # 只留最近 N 条
```

为什么必须截断？因为不截断的话，对话越长 prompt 越大，成本和延迟一起涨，最后超出模型上下文上限直接报错。截断是必然的取舍。

# 四、长期记忆：跨会话保留的事实

长期记忆存的是「下次还有用」的东西：用户偏好（默认客户号、常用语言）、关键事实（这个客户是 VIP）、历史结论。它的特点和短期正相反：

- **要持久化**。存进数据库、文件或向量库，不随会话消失。
- **跨会话可读**。新会话开始时，按需把相关的长期记忆读出来，省得用户重复交代。

```python
# 把跨会话有用的偏好持久化
ltm["default_customer"] = "C1001"
save_long_term(ltm)        # 写入存储

# 新会话开始，读回来
ltm = load_long_term()
if "default_customer" in ltm:
    customer = ltm["default_customer"]   # 不用再问用户
```

注意不是什么都往长期记忆塞。聊天里的寒暄、一次性的临时信息没必要持久化。长期记忆要存的是「明确对未来有用」的结构化事实，否则存一堆噪声，读出来反而干扰判断。

# 五、企业项目里的三层记忆

| 记忆层 | 存什么 | 典型存储 | 风险 |
|---|---|---|---|
| 短期窗口 | 最近 N 轮对话 | 内存/Redis | 太长烧 token |
| 摘要记忆 | 早期对话压缩后的摘要 | Redis/数据库 | 摘要丢关键信息 |
| 用户画像 | 长期偏好、预算、风险敏感度 | MySQL/向量库 | 过期、污染、冲突 |

记忆不是越多越好。每条长期记忆最好有来源、更新时间和置信度；旧记忆要能过期，冲突记忆要能覆盖。否则 Agent 会拿过期偏好做决策，比失忆更危险。

# 七、工程上真正会踩的坑（本篇独有）

- **把短期记忆当长期用**。会话里说的话只活在这次会话，关掉就没。用户的关键偏好必须显式写进长期存储，不能指望短期记忆「自动记住」。
- **短期记忆不截断**。对话一长 prompt 无限膨胀，先是变贵变慢，最后超出上下文上限直接报错。必须设上限，要么滑动窗口要么摘要压缩。
- **什么都往长期记忆塞**。把每句闲聊都持久化，长期记忆变成垃圾场，读出来全是噪声，反而干扰 Agent 判断。只存明确对未来有用的结构化事实。
- **长期记忆读取不做相关性筛选**。用户偏好攒多了，每次会话全量读进 prompt 也会撑爆上下文。长期记忆通常存向量库，按当前问题相关性检索出几条，而不是全塞。
- **混淆「记忆」和「任务状态」**。多步任务执行到一半的中间状态（比如 ReAct 的 `state`）是任务状态，和「跨会话记住用户偏好」是两回事，别用同一套存储混着管。

# 八、一句话面试答法

> **Agent 的记忆怎么管？** 分两种。短期记忆是当前会话的消息历史，让 Agent 理解「它」「上一笔」这类指代，特点是有容量上限要截断（滑动窗口或摘要）、会话结束就清空。长期记忆是跨会话有用的用户偏好和关键事实，要持久化到数据库或向量库，新会话按需读回，省得用户重复交代。关键是别把短期当长期用，也别什么都往长期塞，长期记忆通常用向量库按相关性检索而非全量读取。

# 十、总结

- **工程上真正会踩的坑（本篇独有）**：把短期记忆当长期用。
- **短期记忆：当前会话的上下文**：短期记忆就是当前这轮对话的消息历史。
- **长期记忆：跨会话保留的事实**：长期记忆存的是「下次还有用」的东西：用户偏好（默认客户号、常用语言）、关键事实（这个客户是 VIP）、历史结论。
- **企业项目里的三层记忆**：记忆不是越多越好。

<!-- knowledge-lab-merged -->

# 动手实践：Agent 短期与长期记忆

用同一个 `MemoryStore` 对比两类状态：短期消息保存在有界滑动窗口中，长期偏好写入持久化文件并可被新实例读取。

## 在线运行

直接使用本文“可运行源码”中的沙盒执行；源码、复制内容和实际运行入口保持一致。

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

## 可运行源码：Agent 记忆与状态

下方代码就是在线沙盒实际执行的完整源码。可直接运行、查看输出或复制到本地，页面不再依赖文章外的重复脚本。

### `main.py`

```python
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
```
