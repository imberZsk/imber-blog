# Agent（04） - ReAct 模式

> 读完后，你应能完成以下任务：
> - 绘制“Agent（04） - ReAct 模式 / ReAct = 推理 + 行动的循环”的关键对象与数据流，解释“ReAct 是 Reasoning（推理）+ Acting（行动）的缩写。”，并用源码位置、日志或 Trace 标注证据。
> - 为“Agent（04） - ReAct 模式 / 为什么这个循环能处理多步任务”设计正常与异常输入，验证“这就是 ReAct 处理「依赖中间结果」任务的方式——把上一步的真实结果喂回去，”，输出首个偏差位置与回归测试结果。
> - 实现“Agent（04） - ReAct 模式 / 工程上真正会踩的坑（本篇独有）”的最小代码或配置，检验“max_steps 不是可选项，是防止无限循环和成本失控的硬兜底。”，输出命令、结果与 Diff，并说明不适用边界。

> 一句话目标：读完你能讲清 ReAct 的 Thought/Action/Observation 循环怎么运转、为什么它能处理多步任务，并能看懂一段 ReAct trace。

# 一、ReAct 模式的真实应用场景

用户问：「帮我算一下客户 C1001 的订单总金额是多少。」

这个问题没法一步答出来。
你得先查 C1001 有哪些订单，拿到订单后才能把金额加起来。
两步，而且第二步依赖第一步的结果——不先查到订单，根本没法求和。

上一篇（28）讲的单次 Function Calling 解决的是「调一次工具」。
但这种「要分几步、后一步依赖前一步结果」的任务，单次调用不够。
ReAct 就是把「想一步、做一步、看结果、再想下一步」这个循环结构化，
让 Agent 能一步步逼近答案。

# 二、ReAct = 推理 + 行动的循环

ReAct 是 Reasoning（推理）+ Acting（行动）的缩写。
它的核心是一个循环，每一轮三个动作：

```text
┌──────────────────────────────────────────┐
│  Thought（想）：现在该干什么              │
│     ↓                                      │
│  Action（做）：调用某个工具，带上参数     │
│     ↓                                      │
│  Observation（看）：工具返回了什么        │
│     ↓                                      │
│  回到 Thought：根据观察决定下一步         │
└──────────────────────────────────────────┘
   循环，直到 Thought 判断信息够了 → Final Answer
```

- **Thought**：模型基于「目前已知的一切」推理下一步该干嘛。这一步是出声思考，把决策过程显式化。
- **Action**：模型决定调用哪个工具、传什么参数。这是它唯一能「行动」的方式。
- **Observation**：工具执行后的真实结果，回填给模型。注意这是**真实的数据**，不是模型编的，它是下一轮 Thought 的依据。

每转一圈，模型就多知道一点（多一条 Observation），离答案近一步。
直到某一轮的 Thought 判断「信息够了」，就输出 Final Answer，跳出循环。

# 三、为什么这个循环能处理多步任务

回到开头那个问题，用 ReAct 跑一遍：

```text
第1轮  Thought: 要算总金额，得先知道 C1001 有哪些订单
       Action:  lookup_orders(customer_id=C1001)
       Observation: 查到 2 笔订单 [1200, 800]

第2轮  Thought: 订单有了，现在把金额加起来
       Action:  sum_amount(orders=上一步的订单)     ← 用到了第1轮的 Observation
       Observation: 总金额 2000

第3轮  Thought: 总金额已经算出，可以回答了
       Final Answer: C1001 的订单总金额是 2000 元
```

关键在第 2 轮：它的 Action 用到了第 1 轮 Observation 的结果。
这就是 ReAct 处理「依赖中间结果」任务的方式——**把上一步的真实结果喂回去，
作为下一步推理的依据**。
模型不必一开始就规划好全部步骤，而是走一步看一步，根据实际观察调整。
这比「一次性规划完所有步骤」更鲁棒，
因为中间结果常常出乎预料（比如查出来根本没订单，
下一步就该换个方向）。

# 四、工程上真正会踩的坑（本篇独有）

- **不设步数上限**。模型可能反复调同一个工具、或者在两步之间来回横跳出不来。`max_steps` 不是可选项，是防止无限循环和成本失控的硬兜底。
- **把 Observation 伪造给模型**。Observation 必须是工具的真实返回。如果图省事让模型「假设」工具结果，整个循环就建立在幻觉上，越走越偏。
- **Thought 不落地成日志**。ReAct 最大的工程价值之一是「可观察」——每一步想了什么、调了什么、得到什么都看得见。不把 trace 记下来，出了问题没法复盘 Agent 为什么走错。
- **每一轮把全部历史塞进 prompt**。多轮下来 Thought/Action/Observation 越积越多，上下文爆掉、成本飙升。长任务要对历史做裁剪或摘要。
- **以为 ReAct 是某个库的功能**。它本质是一种「让模型出声思考 + 工具结果回填」的 prompt 模式和循环结构，不依赖特定框架。理解了循环，用什么实现都行。

# 五、一句话面试答法

> **ReAct 是什么、解决什么问题？** ReAct 是 Reasoning + Acting 的循环：每一轮模型先 Thought 推理下一步，再 Action 调工具，拿到真实的 Observation 回填，然后基于观察进入下一轮，直到信息够了给 Final Answer。它解决的是「多步、且后一步依赖前一步结果」的任务——模型走一步看一步、根据真实观察动态调整，比一次性规划全部步骤更鲁棒。工程上必须配步数上限防死循环，并把每一步的 trace 记下来方便复盘。

# 六、动手实践：29 ReAct 模式

打印一个完整的 **Thought / Action / Observation** 循环 trace，
演示 Agent 怎么「想一步、做一步、看结果、再想下一步」，
直到给出 Final Answer。

## 6.1 在线运行

直接使用本文“可运行源码”中的沙盒执行；
源码、复制内容和实际运行入口保持一致。

零依赖，纯标准库。

## 6.2 预期输出

```text
问题：帮我算一下客户 C1001 的订单总金额是多少

--- 第 1 步 ---
Thought: 要算总金额，得先知道 C1001 有哪些订单
Action: lookup_orders(customer_id=C1001)
Observation: 查到 2 笔订单 [{'id': 'O-001', 'amount': 1200}, {'id': 'O-002', 'amount': 800}]

--- 第 2 步 ---
Thought: 订单有了，现在把金额加起来
Action: sum_amount(orders=上一步的订单)
Observation: 总金额 2000

--- 第 3 步 ---
Thought: 总金额已经算出，可以回答了
Final Answer: 客户 C1001 的订单总金额是 2000 元
```

这个问题需要两步工具，且第二步（求和）依赖第一步（查订单）的结果。
ReAct 把它拆成循环：第一轮查订单，把结果作为 Observation；
第二轮基于上一轮的 Observation 算总额；
第三轮判断信息够了，给出 Final Answer。
这就是 ReAct 处理「依赖中间结果」任务的方式。

## 6.3 代码↔概念对应

| 概念 | 在 main.py 哪里 |
|---|---|
| ReAct 主循环 | `react_loop` |
| Thought（推理下一步） | 每个分支里的 `print("Thought: ...")` |
| Action（调用工具） | `tool_lookup_orders` / `tool_sum_amount` |
| Observation（工具结果回填） | 调工具后写入 `state` 并打印 |
| 跨步骤传递中间结果 | `state` 字典 |
| 防死循环兜底 | `react_loop` 的 `max_steps` |

## 6.4 说明

这里 Thought 和 Action 是写死的规则，只为把循环结构显示清楚。
真实 ReAct 中，
每一轮的 Thought 和 Action 由模型生成，
程序负责执行 Action、把工具结果作为 Observation 拼回 prompt 再喂给模型，
循环结构和这里完全一样。
`max_steps` 不是可选项——模型有可能反复调同一个工具或绕不出来，
必须有步数上限兜底。

## 6.5 可运行源码：ReAct 模式

下方代码就是在线沙盒实际执行的完整源码。

### main.py

```python
"""打印可控的 Thought/Action/Observation ReAct 循环。"""

from __future__ import annotations

MAX_STEPS = 3


def search_policy(query: str) -> str:
    """返回离线制度资料；query 是 Agent 生成的检索词。"""
    return "员工报销需在费用发生后 30 天内提交。" if "报销" in query else "未命中"


def run_agent(question: str) -> str:
    """在最大步数内执行 ReAct；question 是用户目标。"""
    # 最近一次工具观察结果。
    observation = ""
    for step in range(1, MAX_STEPS + 1):
        print(f"Step {step} Thought: {'需要查制度' if not observation else '已有足够证据，可以回答'}")
        if observation and observation != "未命中":
            # 有证据后应立即结束，避免无意义循环。
            final_answer = f"根据制度，{observation}"
            print(f"Final Answer: {final_answer}")
            return final_answer
        print("Action: search_policy")
        print(f"Action Input: {question}")
        observation = search_policy(question)
        print(f"Observation: {observation}")
    return "达到最大步数，转人工处理。"


def main() -> None:
    """运行一次完整 ReAct 轨迹。"""
    run_agent("报销最晚多久提交？")


if __name__ == "__main__":
    main()
```

# 七、总结

- **ReAct = 推理 + 行动的循环**：ReAct 是 Reasoning（推理）+ Acting（行动）的缩写。
- **为什么这个循环能处理多步任务**：这就是 ReAct 处理「依赖中间结果」任务的方式——把上一步的真实结果喂回去，
- **工程上真正会踩的坑（本篇独有）**：max_steps 不是可选项，是防止无限循环和成本失控的硬兜底。
- **一句话面试答法**：ReAct 是 Reasoning + Acting 的循环：每一轮模型先 Thought 推理下一步，再 Action 调工具，拿到真实的 Observation 回填，然后基于观察进入下一轮，直到信息够了给 Final Answer。

## 参考资料

- [LangChain Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [LangGraph 文档](https://docs.langchain.com/oss/python/langgraph/overview)
