# Function Calling 工具调用

> 读完你能：定义工具 schema，让模型提出调用，由后端做白名单、权限、参数、确认四层校验后再执行，并跑通一个能拦住越权请求的 demo。

## 与进阶篇的分工

本篇保留为 Function Calling 基础：重点讲工具 schema、参数和后端执行边界。进阶工具系统请读 54、55、56、57，分别覆盖读文件、命令执行、MCP 协议和复用外部 MCP Server。

## 一个真实场景

用户在客服助手里说："帮我查一下客户 C1001 最近的订单。"

纯聊天模型答不了——它没有你的订单数据库。但如果你给它一个 `lookup_orders` 工具，它就能"决定"：这个问题要调订单查询，参数是 `customer_id=C1001`。然后你的后端真正去查库，把结果回填给模型，生成最终回答。

这就是 Function Calling。它把"模型的意图"变成"可控的函数执行"。注意这句话里的两个词：**意图**是模型的，**执行**是你的。这条边界是这一篇的全部重点。

## 模型只提议，后端才执行

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

## 工具 schema 长什么样

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

## 四层校验，缺一不可

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

## 配套 demo：跑起来看

```bash
cd demos/28-function-calling
python3 main.py
```

`main.py` 跑 4 个场景，最能说明问题的是场景 1 和 2：**同一句"查 C1001 订单"，有权限就成功，没权限就被第 2 层拦掉**。模型的输出一模一样，区别完全在后端校验。场景 3、4 则演示写操作如何卡确认。

核心函数：`fake_model_decide`（模型提议）和 `execute_tool`（四层校验 + 执行）。把 `fake_model_decide` 换成真实模型的 tool_calls 返回，整套逻辑不用改——这正是这套结构的价值。

## 工程上真正会踩的坑

- **模型把参数名拼错**（`customerId` vs `customer_id`），schema 校验直接挂。要么 schema 和代码字段名严格对齐，要么加一层字段名归一化。
- **把权限判断写进 prompt**，指望模型"自觉"不调越权工具。模型会被诱导绕过。权限只能是后端硬校验。
- **写操作不卡确认**，模型一句话就把工单建了、把退款发了。所有副作用操作默认 `requires_confirmation`。
- **工具执行失败不写进 trace**，出了问题没法复盘。成功失败都要记录调用了什么、传了什么、结果如何。

## 一句话面试答法

> **Function Calling 的安全边界在哪？** 模型只输出"想调哪个工具、传什么参数"，不直接执行。真正的白名单、权限、参数校验、写操作确认全在后端。我会把读操作和写操作分级，写操作默认需要人工确认，并且把每次工具调用的入参和结果都记进 trace，方便审计和复盘。

## 下一篇

`29-ReAct模式.md` —— 单次工具调用讲完了，但复杂任务需要"想一步、做一步、看结果、再想下一步"。ReAct 就是把这个循环结构化。
