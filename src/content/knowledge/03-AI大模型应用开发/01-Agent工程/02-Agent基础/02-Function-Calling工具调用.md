# Agent 工程（28）- Function Calling 工具调用

> 读完你能：定义工具 schema，让模型提出调用，由后端做白名单、权限、参数、确认四层校验后再执行，并跑通一个能拦住越权请求的 demo。

# 一、与进阶篇的分工

本篇保留为 Function Calling 基础：重点讲工具 schema、参数和后端执行边界。进阶工具系统请读 54、55、56、57，分别覆盖读文件、命令执行、MCP 协议和复用外部 MCP Server。

# 二、一个真实场景

用户在客服助手里说："帮我查一下客户 C1001 最近的订单。"

纯聊天模型答不了——它没有你的订单数据库。但如果你给它一个 `lookup_orders` 工具，它就能"决定"：这个问题要调订单查询，参数是 `customer_id=C1001`。然后你的后端真正去查库，把结果回填给模型，生成最终回答。

这就是 Function Calling。它把"模型的意图"变成"可控的函数执行"。注意这句话里的两个词：**意图**是模型的，**执行**是你的。这条边界是这一篇的全部重点。

# 三、模型只提议，后端才执行

很多人第一次接触会有个误解：以为模型自己去查了数据库。不是。真实链路是这样：

```
1. 后端把工具 schema（有哪些工具、什么参数）发给模型
2. 模型返回：我想调 lookup_orders，参数 {customer_id: "C1001"}   ← 模型只到这一步
3. 后端校验：这工具在白名单吗？
4. 后端校验：当前用户有 read:orders 权限吗？
5. 后端校验：必填参数齐了吗？
6. 后端校验：是写操作吗？要不要人工确认？
7. 全过了，后端才真正执行查询             ← 执行永远在后端
8. 结果回填给模型，生成自然语言回答
9. 前端展示这条 trace，不只展示最终答案
```

模型在第 2 步就交棒了。它输出的只是一段"我想这么调"的 JSON，碰不到你的任何真实系统。所以**安全不在模型，在第 3-6 步的校验**。

# 四、工具 schema 长什么样

schema 是你和模型之间的契约，告诉它每个工具叫什么、干什么、要什么参数：

```python
{
    "name": "lookup_orders",
    "description": "查询某个客户最近的订单状态",   # 描述写清楚，模型靠它判断该不该调
    "parameters": {
        "type": "object",
        "properties": {
            "customer_id": {"type": "string", "description": "客户编号，如 C1001"}
        },
        "required": ["customer_id"],
    },
}
```

`description` 不是注释，是模型决策的依据。写得含糊，模型就乱调或不调。

# 五、四层校验，缺一不可

模型可能拼错工具名、漏参数、调它没权限的工具，甚至被用户诱导调危险操作。这些全靠后端这四层拦：

```python
# 1. 白名单：模型不能"发明"一个不存在的工具
definition = next((t for t in TOOL_DEFINITIONS if t["name"] == name), None)
if definition is None: return {"ok": False, "error": "未知工具"}

# 2. 权限：同一个工具，有权限的用户能调，没权限的拦掉
if definition["permission"] not in permissions: return {"ok": False, "error": "缺少权限"}

# 3. 参数：必填项必须齐
for field in definition["parameters"]["required"]:
    if field not in args: return {"ok": False, "error": f"缺少参数 {field}"}

# 4. 确认：写操作（建工单、改数据、发消息）不能让模型自主执行
if definition.get("requires_confirmation") and not confirmed:
    return {"ok": False, "needs_confirmation": True}
```

读操作（查订单）可以放开，写操作（建工单、退款）必须卡人工确认。这是工具分级的基本盘。

# 七、工程上真正会踩的坑

- **模型把参数名拼错**（`customerId` vs `customer_id`），schema 校验直接挂。要么 schema 和代码字段名严格对齐，要么加一层字段名归一化。
- **把权限判断写进 prompt**，指望模型"自觉"不调越权工具。模型会被诱导绕过。权限只能是后端硬校验。
- **写操作不卡确认**，模型一句话就把工单建了、把退款发了。所有副作用操作默认 `requires_confirmation`。
- **工具执行失败不写进 trace**，出了问题没法复盘。成功失败都要记录调用了什么、传了什么、结果如何。

# 八、一句话面试答法

> **Function Calling 的安全边界在哪？** 模型只输出"想调哪个工具、传什么参数"，不直接执行。真正的白名单、权限、参数校验、写操作确认全在后端。我会把读操作和写操作分级，写操作默认需要人工确认，并且把每次工具调用的入参和结果都记进 trace，方便审计和复盘。

# 十、总结

- **工程上真正会踩的坑**：模型把参数名拼错（customerId vs customerid），schema 校验直接挂。
- **模型只提议，后端才执行**：很多人第一次接触会有个误解：以为模型自己去查了数据库。
- **工具 schema 长什么样**：schema 是你和模型之间的契约，告诉它每个工具叫什么、干什么、要什么参数：
- **四层校验，缺一不可**：模型可能拼错工具名、漏参数、调它没权限的工具，甚至被用户诱导调危险操作。

<!-- knowledge-lab-merged -->

# 动手实践：28 Function Calling 工具调用

演示工具调用最关键的认知：**模型只负责"提出调用"，后端负责"校验 + 执行"**。模型不直接碰数据库，所有权限、参数、确认都由你的代码把关。

## 在线运行

直接使用本文“可运行源码”中的沙盒执行；源码、复制内容和实际运行入口保持一致。

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

## 可运行源码：Function Calling 工具调用

下方代码就是在线沙盒实际执行的完整源码。可直接运行、查看输出或复制到本地，页面不再依赖文章外的重复脚本。

### `main.py`

```python
"""演示模型提议、后端校验、执行和回传的工具调用闭环。"""

from __future__ import annotations

from typing import Any

ALLOWED_TOOLS = {"query_order"}
ORDER_DATABASE = {"A100": {"owner": "user-1", "status": "已发货"}}


def validate_and_execute(tool_call: dict[str, Any], current_user: str) -> dict[str, Any]:
    """校验并执行工具；tool_call 来自模型，current_user 是登录身份。"""
    # 模型提出的工具名不能直接信任。
    tool_name = tool_call.get("name")
    if tool_name not in ALLOWED_TOOLS:
        return {"ok": False, "error": "tool_not_allowed"}
    # 模型提出的参数需要做类型与必填校验。
    arguments = tool_call.get("arguments")
    order_id = arguments.get("order_id") if isinstance(arguments, dict) else None
    if not isinstance(order_id, str) or not order_id:
        return {"ok": False, "error": "invalid_arguments"}
    # 工具执行前必须按服务端身份做对象级权限校验。
    order = ORDER_DATABASE.get(order_id)
    if not order or order["owner"] != current_user:
        return {"ok": False, "error": "order_not_found_or_forbidden"}
    return {"ok": True, "data": {"order_id": order_id, "status": order["status"]}}


def main() -> None:
    """覆盖合法、参数错误、越权和未知工具调用。"""
    # 四个模型工具提议用于验证全部关键边界。
    calls = [
        {"name": "query_order", "arguments": {"order_id": "A100"}},
        {"name": "query_order", "arguments": {}},
        {"name": "query_order", "arguments": {"order_id": "B999"}},
        {"name": "delete_order", "arguments": {"order_id": "A100"}},
    ]
    for call in calls:
        print(f"模型提议={call} -> 后端结果={validate_and_execute(call, 'user-1')}")


if __name__ == "__main__":
    main()
```
