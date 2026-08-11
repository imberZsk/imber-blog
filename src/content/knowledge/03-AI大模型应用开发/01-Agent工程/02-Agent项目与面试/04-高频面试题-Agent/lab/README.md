# 50 高频面试题 Agent —— 自测 quiz

Agent 方向高频真题库 + 命令行自测工具，外带一个 ReAct trace 演示。

## 运行

```bash
python3 quiz.py            # 随机抽 5 题，回车看答案
python3 quiz.py --all      # 通读全部题目和答案
python3 quiz.py -n 3       # 抽 3 题
python3 quiz.py --trace    # 打印一个 ReAct 循环示例，看 Agent 怎么想
```

零依赖，纯标准库。

## 预期输出（--trace 模式）

```
ReAct 循环示例：任务 = 查客户 C1001 订单并总结风险

  [Thought] 用户要查 C1001 的订单并总结风险。我得先拿到订单数据...
  [Action] lookup_orders(customer_id='C1001')
  [Observation] 返回 2 笔订单：O-0518 已发货(正常)、O-0520 退款中(高风险)。
  [Thought] 拿到数据了。有 1 笔高风险退款，足够总结...
  [Action] finish
  [Answer] 客户 C1001 近期 2 笔订单，其中 O-0520 处于退款中、风险较高，建议优先跟进。
```

`--trace` 把"边想边做"从抽象概念变成你能照着说的具体步骤——面试被问 ReAct 时，照这个结构讲就行。

## 题库覆盖

Agent vs Chatbot vs Workflow、Function Calling 流程、ReAct、工具误调用防护、记忆、多工具路由、什么时候不该用 Agent、前端展示、参数纠错。共 10 题，答案与文章 50 正文一致。

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“50 高频面试题 Agent —— 自测 quiz”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。
