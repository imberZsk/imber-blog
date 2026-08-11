# LangChain 实战（63）- Agent Memory：截断、总结、检索与生命周期

> 读完你能：区分工作记忆、会话记忆和长期记忆，并能按 Token 预算组合截断、总结、检索、过期与冲突处理。
> 更新日期：2026/08/11

# 一、模型本身没有会话记忆

LLM 每次调用只看到应用传入的上下文。所谓“记忆”是应用完成的四件事：保存、选择、压缩、注入。把全部聊天记录原样追加不是记忆系统，只是一个最终会超长、变贵并引入噪声的数组。

先按生命周期分层：

| 层级 | 典型内容 | 主键 | 保留策略 |
| --- | --- | --- | --- |
| 工作状态 | 当前计划、工具结果、待审批动作 | `thread_id` | 分钟到小时，TTL |
| 短期会话 | 最近消息、滚动摘要 | `thread_id` | 会话级，允许重建 |
| 长期语义 | 用户明确偏好、稳定事实 | `user_id + namespace` | 跨会话，可修改删除 |
| 情节记忆 | 某次任务发生了什么 | `user_id + event_time` | 衰减、合并或归档 |
| 审计日志 | 工具调用、审批和外部写操作 | `trace_id` | 按合规要求，不注入 Prompt |

审计日志不等于模型记忆。它可以永久留存以追责，但通常不应整段进入上下文。

# 二、三种策略的真实边界

## 2.1 截断

保留最近 N 条或最近一段 Token。它便宜、确定，但可能删掉第一轮的关键约束。截断时要保留完整消息对和工具调用对，不能留下孤立的 tool result。

## 2.2 总结

把旧历史压成滚动摘要。摘要适合保留“目标、已确认约束、已完成步骤、未解决问题”，不适合代替订单号、金额、代码或法条原文。多次“摘要的摘要”会累积失真，应定期从原始事件重新生成。

## 2.3 检索

把长期事实拆成可检索条目，只在相关问题出现时召回。它能跨会话工作，但必须处理权限、过期、冲突、删除和写入质量。向量相似不等于事实仍有效。

# 三、按预算组装上下文

```python
from dataclasses import dataclass

# 系统提示词和当前问题之外允许记忆占用的最大 Token。
MEMORY_TOKEN_BUDGET = 2400
# 长期记忆最多注入的条目数。
LONG_TERM_MEMORY_LIMIT = 6


@dataclass(frozen=True)
class MemoryItem:
    """保存一条可注入上下文的记忆及其估算成本。"""

    # 稳定的记忆主键。
    memory_id: str
    # 已去除敏感字段的记忆文本。
    text: str
    # 记忆估算 Token 数。
    token_count: int
    # 综合相关性、可信度和新鲜度后的分数。
    score: float


def select_memories(items: list[MemoryItem], budget: int = MEMORY_TOKEN_BUDGET) -> list[MemoryItem]:
    """在 Token 预算内按综合分数选择长期记忆。"""
    # 已选择记忆累计使用的 Token。
    used_tokens = 0
    # 最终允许注入模型的记忆列表。
    selected: list[MemoryItem] = []

    for item in sorted(items, key=lambda candidate: candidate.score, reverse=True):
        if len(selected) >= LONG_TERM_MEMORY_LIMIT:
            break
        if used_tokens + item.token_count > budget:
            continue
        selected.append(item)
        used_tokens += item.token_count

    return selected
```

综合分数不能只看余弦相似度，可按业务定义为：

`相关性 × 可信度 × 新鲜度 × 权限可见性`

权限不可见应直接过滤为零；明确事实的可信度高于模型推测；被新事实覆盖的旧记忆应标记失效，而不是同时注入让模型自行裁决。

# 四、写入长期记忆的闸门

候选事实进入长期库前逐项判断：

1. 用户是否明确表达，而非模型推断。
2. 未来会不会复用，临时任务状态不应长期保存。
3. 是否包含密码、Token、证件号等禁止持久化信息。
4. 是否与现有事实重复或冲突。
5. 是否能提供来源时间和删除入口。

“我以后都要中文回答”可以保存为偏好；“帮我把这段临时翻成英文”不能反推出用户永久偏好英文。

# 五、摘要的数据契约

不要只存一段自然语言，至少保存：

```json
{
  "thread_id": "thread-42",
  "summary_version": 3,
  "covered_until_message_id": "msg-180",
  "goal": "排查支付回调重复入账",
  "confirmed_constraints": ["不能修改历史订单"],
  "completed_steps": ["确认回调存在重试"],
  "open_questions": ["幂等键是否跨租户唯一"],
  "source_message_ids": ["msg-001", "msg-180"]
}
```

这样才能增量更新、回溯来源和检测摘要遗漏。原始消息的留存期限可以与摘要不同，但删除策略要在产品和合规层明确。

# 六、验收指标

- **记忆命中率**：需要的记忆是否进入上下文。
- **错误注入率**：无关、过期或冲突记忆被注入的比例。
- **压缩保真率**：摘要是否保留标注的关键事实。
- **Token 节省率**：相对全历史输入节省多少上下文。
- **删除传播时延**：用户删除后，缓存、向量索引和副本多久不可检索。
- **跨用户泄漏率**：必须为零，使用自动化权限用例持续验证。

# 七、常见错误

- 无限追加 messages，直到请求超出上下文窗口。
- 把所有对话摘要都永久保存，既污染召回又增加隐私风险。
- 只更新结构化记录，不删除旧向量，导致旧偏好仍能被召回。
- 把工具返回原文写入长期记忆，敏感字段和 Prompt Injection 一并持久化。
- 用“回答看起来正常”代替记忆命中、冲突、删除和权限测试。

# 八、参考资料

- [LangGraph：Memory](https://docs.langchain.com/oss/python/langgraph/add-memory)
- [LangChain：Long-term memory](https://docs.langchain.com/oss/python/langchain/long-term-memory)
- [Redis：Agent memory](https://redis.io/docs/latest/develop/use-cases/agent-memory/)

# 九、总结

- 截断控制最近历史，总结压缩主线，检索按需找回长期事实，三者需要一起使用。
- 工作状态、长期语义、情节记录和审计日志的生命周期与用途不同，不能塞进同一列表。
- 记忆系统必须有写入闸门、冲突规则、删除传播和可量化验收。

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“Agent 工程（63）- Agent Memory：截断、总结、检索与生命周期”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
