# 28 Function Calling 工具调用 demo

演示工具调用最关键的认知：**模型只负责"提出调用"，后端负责"校验 + 执行"**。模型不直接碰数据库，所有权限、参数、确认都由你的代码把关。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库。

## 预期输出（节选）

```
=== 场景 1：查订单（有权限，成功）===
模型想调用：lookup_orders({"customer_id": "C1001"})
执行成功：{"customer_id": "C1001", "orders": [...], "risk_count": 1}

=== 场景 2：查订单（无权限，被拦）===
模型想调用：lookup_orders({"customer_id": "C1001"})
拦截：缺少权限：read:orders

=== 场景 3：建工单（写操作，需确认）===
拦截：这是写操作，需要人工确认后才执行。

=== 场景 4：建工单（已确认，执行）===
执行成功：{"ticket_id": "T-1001", ...}
```

同一句话（查订单），有权限就成功、没权限就被拦——这说明**权限不是模型管的，是后端管的**。这就是工具调用的安全核心。

## 代码对应文章的哪些点

| 概念 | 在 main.py 哪里 |
|---|---|
| 工具 schema 定义 | `TOOL_DEFINITIONS` |
| 模型提出调用（name + arguments） | `fake_model_decide` |
| 白名单校验 | `execute_tool` 校验 1 |
| 权限校验 | `execute_tool` 校验 2 |
| 必填参数校验 | `execute_tool` 校验 3 |
| 写操作人工确认 | `execute_tool` 校验 4 |

## 动手改

- 把 `fake_model_decide` 换成真实模型的 tool_calls 返回（OpenAI / 通义都支持）。
- 加一个 `calculate_reimbursement` 工具，体验"加工具只改 schema + 执行分支"。
- 故意让模型传一个不存在的工具名，看白名单怎么拦。

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“28 Function Calling 工具调用 demo”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
