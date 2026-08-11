# 29 ReAct 模式 demo

打印一个完整的 **Thought / Action / Observation** 循环 trace，演示 Agent 怎么「想一步、做一步、看结果、再想下一步」，直到给出 Final Answer。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库。

## 预期输出

```
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

这个问题需要两步工具，且第二步（求和）依赖第一步（查订单）的结果。ReAct 把它拆成循环：第一轮查订单，把结果作为 Observation；第二轮基于上一轮的 Observation 算总额；第三轮判断信息够了，给出 Final Answer。这就是 ReAct 处理「依赖中间结果」任务的方式。

## 代码↔概念对应

| 概念 | 在 main.py 哪里 |
|---|---|
| ReAct 主循环 | `react_loop` |
| Thought（推理下一步） | 每个分支里的 `print("Thought: ...")` |
| Action（调用工具） | `tool_lookup_orders` / `tool_sum_amount` |
| Observation（工具结果回填） | 调工具后写入 `state` 并打印 |
| 跨步骤传递中间结果 | `state` 字典 |
| 防死循环兜底 | `react_loop` 的 `max_steps` |

## 说明

这里 Thought 和 Action 是写死的规则，只为把循环结构显示清楚。真实 ReAct 中，每一轮的 Thought 和 Action 由模型生成，程序负责执行 Action、把工具结果作为 Observation 拼回 prompt 再喂给模型，循环结构和这里完全一样。`max_steps` 不是可选项——模型有可能反复调同一个工具或绕不出来，必须有步数上限兜底。
