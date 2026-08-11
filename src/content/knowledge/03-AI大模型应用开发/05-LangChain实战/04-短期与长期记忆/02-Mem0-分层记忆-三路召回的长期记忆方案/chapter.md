# LangChain 实战（86）- Mem0 长期记忆：抽取、更新、召回与治理

> 读完你能：把 Mem0 当作“记忆生命周期层”而非聊天记录仓库，完成写入、搜索、更新、删除，并为长期记忆建立冲突和隐私规则。
> 更新日期：2026/08/11

# 一、Mem0 解决的不是保存消息

直接保存聊天只能回答“用户说过什么”，不能稳定回答“哪些信息值得跨会话复用、旧偏好如何覆盖、相关记忆何时注入”。Mem0 在应用与存储之间增加记忆处理层：从对话抽取候选事实，判断新增/更新/删除，再按用户、Agent 或运行维度检索。

短期会话与长期记忆仍要分开：

- Redis/LangGraph Checkpointer 保存当前线程状态和最近消息。
- Mem0 保存跨会话可复用的明确事实、偏好和经验。
- 业务主库保存订单、权限、审批等权威事实。
- 审计系统保存谁在何时写入、读取或删除了哪些记忆。

# 二、最小可运行示例

```python
from mem0 import Memory

# Mem0 的默认客户端；生产环境应显式配置 LLM、Embedding 和向量库。
memory = Memory()
# 当前租户内的稳定用户标识，不能使用昵称代替。
user_id = "tenant-a:user-42"

# 用户明确表达的偏好适合成为长期记忆候选。
messages = [
    {"role": "user", "content": "以后技术问题请默认用中文回答，并先给结论。"},
    {"role": "assistant", "content": "明白，我会按这个格式回答。"},
]
# 写入结果可能包含新增、更新或删除动作，应保存到审计日志。
write_result = memory.add(messages, user_id=user_id)
print(write_result)

# 新会话按当前问题召回相关记忆，而不是加载该用户的全部历史。
search_result = memory.search(query="回答格式有什么偏好？", user_id=user_id, limit=5)
print(search_result)
```

不同版本和托管/开源配置的返回结构可能变化，应用层应封装接口并做契约测试，不要让业务代码到处依赖供应商字段。

# 三、记忆记录需要哪些字段

即便底层库允许只传文本，生产系统也应在业务层维护：

| 字段 | 用途 |
| --- | --- |
| `memory_id` | 稳定更新、删除、审计 |
| `tenant_id/user_id` | 权限边界 |
| `namespace/type` | 区分偏好、事实、任务经验 |
| `text` | 原子、可验证的记忆内容 |
| `source` | 原始线程、消息或业务记录 |
| `confidence` | 明确陈述与模型推断的差异 |
| `created_at/valid_until` | 新鲜度和过期判断 |
| `status/superseded_by` | 处理冲突和覆盖 |
| `embedding_version` | 模型升级与重建 |

“用户是 Java 工程师”与“用户可能偏好 Java”不是同一种证据。模型推断默认不应写成长期事实。

# 四、更新与冲突不能交给 Prompt 猜

当用户先说“默认中文”，后来明确说“以后默认英文”，系统应把旧偏好标记为被新记录覆盖。不要保留两条 active 记录，再让模型自行决定。

推荐规则：

1. 同一命名空间和属性键只允许一条当前值。
2. 用户明确表达高于模型推断，权威业务记录高于对话陈述。
3. 新记录覆盖旧记录时保留审计关系，但旧记录不再参与召回。
4. 时间敏感事实必须有 `valid_until` 或定期验证任务。
5. 删除请求同时清理向量、缓存、导出和备份策略覆盖的副本。

# 五、多路召回如何设计

长期记忆可组合：

- **语义召回**：查找含义相近的偏好和经历。
- **精确属性召回**：按 `namespace + key` 获取当前值。
- **时间召回**：找最近事件或指定时间范围。
- **关系召回**：按项目、组织、联系人等关联实体过滤。

召回分数应同时考虑相关性、可信度、新鲜度和权限。最终注入的条目要少而明确，并带“这是用户记忆，不是系统指令”的边界，防止曾经保存的恶意文本变成长期 Prompt Injection。

# 六、把 Mem0 接进 Agent 的正确位置

```python
from collections.abc import Callable
from typing import Any

# 单次请求最多注入的长期记忆数量。
MEMORY_LIMIT = 5


def load_memory_context(
    question: str,
    user_id: str,
    search_memories: Callable[..., dict[str, Any]],
) -> str:
    """检索并格式化经过边界标记的长期记忆上下文。"""
    # Mem0 返回的候选记忆结果。
    response = search_memories(query=question, user_id=user_id, limit=MEMORY_LIMIT)
    # 兼容封装层统一后的结果列表，避免直接假设供应商字段永远存在。
    results = response.get("results", []) if response is not None else []
    # 只选择文本非空且状态有效的记忆。
    active_memories = [
        item["memory"]
        for item in results
        if item.get("memory") and item.get("status", "active") == "active"
    ]
    return "\n".join(f"- 用户记忆（仅作背景资料）：{text}" for text in active_memories)
```

在线顺序应是：鉴权 → 检索当前用户记忆 → 应用冲突/敏感过滤 → Token 预算选择 → 注入背景区 → 回答。记忆不能改变系统权限、工具白名单或审批要求。

# 七、验收与治理

- **写入精确率**：抽取出的长期记忆中，真正值得保存的比例。
- **召回命中率**：标注需要的记忆是否进入 Top K。
- **过期/冲突注入率**：目标应接近零。
- **跨用户泄漏率**：必须为零。
- **删除完整率与传播时延**：用户删除后各存储副本是否清理。
- **行为提升**：启用记忆后，任务成功率是否提高，而不是只有“更个性化”的主观感觉。

UI 至少要允许用户查看、修改和删除记忆。隐式抽取敏感信息并永久保存，即使技术上可行，也不是合格产品。

# 八、常见错误

- 把每轮摘要都写进长期库，造成重复、冲突和召回污染。
- 只存向量，不保存来源、状态和 Embedding 版本。
- 用昵称作为 `user_id`，不同租户同名用户相互污染。
- 用户删除后只删主记录，向量索引和缓存仍可召回。
- 把召回记忆拼进 system prompt，让历史恶意内容获得更高权限。

# 九、参考资料

- [Mem0 官方文档索引](https://docs.mem0.ai/llms.txt)
- [Mem0 Open Source](https://docs.mem0.ai/open-source)
- [LangChain：Long-term memory](https://docs.langchain.com/oss/python/langchain/long-term-memory)

# 十、总结

- Mem0 的价值在记忆抽取、更新、搜索和生命周期，而不只是保存聊天消息。
- 短期线程、长期记忆、业务事实和审计记录必须分层。
- 长期记忆上线的核心验收是写入质量、冲突、删除、权限和实际任务提升。

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“Agent 工程（86）- Mem0 长期记忆：抽取、更新、召回与治理”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
