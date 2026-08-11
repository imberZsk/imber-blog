# Agent 工程（83）- DeepAgents 实战：多 Agent 架构的深度调研助手

> 读完你能：设计一个深度调研助手，理解多 Agent 如何分工、交接和汇总。
> 来源：`吃透 AI Agent 开发` 截图目录第 31 篇，2026/05/29
> 导入与重写日期：2026/07/07

# 一、本篇定位

这是多 Agent 实战篇，承接 75 图编排和 82 高层框架。

# 二、一个真实场景

用户说“帮我调研企业级 RAG 的主流方案，并给出选型建议”。一个 Agent 很容易边搜边写边忘。更好的做法是拆成规划、搜索、阅读、分析、写作、审阅几个角色，但这些角色要围绕任务状态协作，而不是各说各话。

# 三、核心拆解

- 多 Agent 拆分的依据是上下文边界。搜索 Agent 需要网页和关键词，分析 Agent 需要证据表，写作 Agent 需要结构和结论。
- 中间产物要结构化，比如 research_plan、source_cards、claim_table、final_report。没有结构化交接，多 Agent 只是多人聊天。
- 总控 Agent 或图状态负责推进流程，防止子 Agent 无限发散。

# 四、工程链路

- Planner 拆研究问题。
- Searcher 找资料。
- Reader 提取证据卡片。
- Analyst 对比方案和风险。
- Writer 生成报告。
- Reviewer 检查引用和遗漏。

# 五、落地建议

- 每个子 Agent 只给必要工具。
- 资料来源要去重并记录 URL/标题/时间。
- 报告里的结论必须能回到证据卡片。

# 六、常见坑

- 按“角色扮演”拆分，没有结构化产物。
- 多个 Agent 都能搜索和写作，职责重叠。
- 最终报告没有引用，可信度不足。

# 七、和已有主线的关系

47 个人 Agent 工作台讲项目形态；83 给出更进阶的多 Agent 调研助手架构。

# 八、复述答法

> 多 Agent 调研助手要按上下文和产物拆分：规划、搜索、阅读、分析、写作、审阅。每步输出结构化中间产物，最终报告的每个关键结论都能回到证据卡片。

# 九、总结

- **核心拆解**：多 Agent 拆分的依据是上下文边界。
- **工程链路**：Analyst 对比方案和风险。
- **常见坑**：按“角色扮演”拆分，没有结构化产物。
- **本篇定位**：这是多 Agent 实战篇，承接 75 图编排和 82 高层框架。

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“Agent 工程（83）- DeepAgents 实战：多 Agent 架构的深度调研助手”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。

## 十、最小可运行示例：受控 Multi-Agent 并行

~~~text
# requirements.txt
# Python 3.10+ 标准库，无第三方依赖。
~~~

~~~python
from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable


# 子 Agent 函数统一接收任务文本并返回带来源结果。
Agent = Callable[[str], Awaitable[dict[str, object]]]
# 并行 Agent 总数上限，用于限制 Token 和外部请求成本。
MAX_PARALLEL_AGENTS = 3


async def run_research(task: str, agents: list[Agent]) -> list[dict[str, object]]:
    """并行执行有界子任务；task 是目标，agents 是允许的角色列表。"""

    if len(agents) > MAX_PARALLEL_AGENTS:
        raise ValueError("too many parallel agents")
    # 每个子 Agent 只获得完成角色任务所需的最小上下文。
    coroutines = [agent(task) for agent in agents]
    # 总超时阻止某个子 Agent 无限拖延工作流。
    results = await asyncio.wait_for(asyncio.gather(*coroutines), timeout=20)
    return list(results)


async def source_agent(task: str) -> dict[str, object]:
    """模拟资料 Agent；task 是共享研究目标。"""

    return {"agent": "source", "task": task, "evidence": ["doc#1"]}


print(asyncio.run(run_research("比较两种方案", [source_agent])))
~~~

多 Agent 只有在并行、权限隔离或角色工具差异带来可测收益时才成立。协调者校验证据、去重冲突并控制总预算，不能把多个模型输出直接拼成结论。
