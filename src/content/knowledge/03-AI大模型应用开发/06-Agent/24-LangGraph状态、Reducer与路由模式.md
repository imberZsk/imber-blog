# Agent（24） - LangGraph 状态、Reducer 与路由模式

> LangGraph 的核心不是画流程图，而是把状态更新、并行合并和路由条件写成可验证的契约。

> 读完你能：设计 State、Node、Reducer 和 Edge，并实现分支、循环、并行汇合与 Orchestrator-Worker。

## 核心知识清单

- State、Node、START、END 与 Command
- 覆盖字段、追加字段与自定义 Reducer
- Static Edge、Conditional Edge 与循环
- Parallel Fan-out/Fan-in 与并行 Reducer
- Orchestrator-Worker、Send 与动态任务
- 路由枚举、递归上限与终止条件

## State 是公共契约

State 只保存跨节点需要的数据。原始输入、派生结果、错误和控制字段应分开，避免某个节点修改无关字段。Node 接收当前 State 并返回局部更新，不应依赖隐藏全局变量。

并行分支同时写同一字段时必须定义 Reducer：列表结果可追加，计数可求和，唯一结果应拒绝冲突。默认覆盖适合单写者字段；没有 Reducer 的并行写入会产生不确定或运行错误。

## Edge 决定控制流

Static Edge 用于确定性顺序；Conditional Edge 的路由函数返回受控枚举，不能让模型自由生成节点名。循环必须同时具备成功条件、可恢复失败条件、最大轮次和预算条件。

```python
from typing import Annotated, TypedDict
import operator


class ResearchState(TypedDict):
    """保存调研图中可并行合并的状态。"""

    question: str
    findings: Annotated[list[str], operator.add]
    attempts: int


def route_after_search(state: ResearchState) -> str:
    """根据证据数量选择生成答案或继续检索。"""

    if len(state["findings"]) >= 2:
        return "answer"
    return "search"
```

## 常见图模式

- Fan-out/Fan-in：并行搜索多个来源，再由 Reducer 汇总。
- Orchestrator-Worker：规划器动态产生任务，Worker 独立执行，综合节点验收。
- Evaluator-Optimizer：生成、确定性校验、有限次数修订。
- Router：一次分类进入专用子图，不需要完整 Agent Loop。

每个节点应单测输入输出，每条 Edge 应覆盖正常、边界和终止路径。图级测试使用伪模型和伪 Tool，避免把网络随机性误认为路由正确性。

## 参考资料

- [LangGraph Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api)
- [LangGraph Workflows and Agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)

