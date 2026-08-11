# 12 结构化输出与 JSON demo

让模型输出 JSON 很容易，但**永远不能假设它一定合法**。这个 demo 演示三道防线：解析 → schema 校验 → 失败兜底（含一次重试），用 5 种典型的模型输出把每条失败路径都跑一遍。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库。

## 预期输出

```
=== 合法 JSON ===
  通过：{"category": "bug", "urgency": "high", "summary": "App 闪退"}

=== JSON 裹在 ```json 代码块里 ===
  通过：{"category": "feature", "urgency": "low", "summary": "想要深色模式"}

=== 枚举越界（category=投诉） ===
  校验失败（字段 category 值 '投诉' 不在枚举 ['bug', 'feature', 'question'] 内），解析值：{'category': '投诉', 'urgency': 'high', 'summary': '乱填的类别'} -> 触发重试
  重试成功：{"category": "bug", "urgency": "high", "summary": "重试后输出的合法结果"}

=== 缺字段（只有 category） ===
  校验失败（缺少必填字段：urgency），解析值：{'category': 'question'} -> 触发重试
  重试成功：{"category": "bug", "urgency": "high", "summary": "重试后输出的合法结果"}

=== 根本不是 JSON（大白话） ===
  解析失败，原始输出：'这是一条 bug 反馈，建议尽快处理。' -> 触发重试
  重试仍失败，返回兜底：{"category": "question", "urgency": "low", "summary": "无法自动分类，待人工处理", "_fallback": true}

不管模型怎么乱来，前端拿到的永远是字段齐全、枚举合法的 dict。
```

最后一条最关键：模型反复给不出合法 JSON，代码也不崩、不抛异常给前端，而是返回一个带 `_fallback` 标记的兜底结果。前端拿到的字段永远是齐的。

## 代码↔概念对应

| 概念 | 在 main.py 哪里 |
|---|---|
| 用 schema 声明字段/类型/枚举/必填 | `SCHEMA` |
| 第一道防线：抽取并解析 JSON（含剥离 ```json 代码块） | `extract_json` |
| 第二道防线：按 schema 校验类型和枚举 | `validate` |
| 第三道防线：重试一次 + 兜底结果 | `retry_once`、`FALLBACK` |
| 完整编排三道防线 | `process` |

## 动手改

- 给 `SCHEMA` 加一个 `need_reply` 布尔字段并设 `required`，看「缺字段」场景怎么被 `validate` 拦下。
- 把 `extract_json` 的正则去掉，只保留 `json.loads`，看「JSON 裹在代码块里」立刻挂掉——这说明剥代码块这步在真实项目里有多必要。
- 真实项目里 `retry_once` 的重试 prompt 应该更严格（附上「上次错在哪」），让模型自我纠正。
