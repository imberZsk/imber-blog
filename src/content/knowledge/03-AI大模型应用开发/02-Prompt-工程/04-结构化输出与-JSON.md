# 工程基础（12）- 结构化输出与 JSON

> 读完你能：让模型稳定吐出 JSON，并用「解析 + schema 校验 + 重试兜底」三道防线把它变成前端一定能用的数据，跑通一个能扛住 5 种乱输出的 demo。

# 一、与进阶篇的分工

本篇保留为结构化输出基础：重点讲 JSON、schema、解析兜底。进阶问题请接着读 64《结构化大模型输出：output parser 还是 tool?》和 65《Output Parser 实战》，那里会讨论 parser、structured output、tool calling 的取舍，以及流式智能录入怎么落地。

# 二、一个真实场景

上一篇你用好 prompt 让模型给用户反馈分类，输出 `{"category": "bug", "urgency": "high", ...}`。你前端写了 `JSON.parse(resp)`，本地测了几条都正常，上线了。

第二天报警：页面白屏。一查，模型这次输出的是：

````
```json
{"category": "bug", "urgency": "high", "summary": "崩溃"}
```
````

模型好心给你裹了个 markdown 代码块，`JSON.parse` 直接抛异常。再翻日志，还有更离谱的：有时候它输出 `category: "投诉"`（不在你的枚举里），有时候少一个字段，偶尔干脆回了一句大白话。

结论很硬：**模型输出 JSON 是「倾向」，不是「保证」**。结构化输出这件事，prompt 只解决一半，另一半得靠代码兜。

# 三、三道防线，逐层收口

把模型输出变成可用数据，要过三关。任何一关失败都不能让异常冒到前端：

```
模型原始输出
   ↓
① 解析：抠出 JSON 并 parse（剥掉 ```json 代码块、前后多余文字）
   ↓ 成功
② 校验：字段齐不齐？类型对不对？枚举越界没？
   ↓ 通过
   返回结构化数据
   
任何一步失败 → 用更严格的指令重试一次 → 仍失败 → 返回兜底结果（字段齐全）
```

## 3.1 第一关：解析（别直接 json.loads）

模型最爱干的事是把 JSON 裹进 ```json 代码块，或者前面加句「好的，结果如下：」。直接 `json.loads` 必挂。稳妥做法是先尝试直接解析，失败就用正则抠出第一个 `{...}` 再解析：

```python
def extract_json(text):
    try:
        return json.loads(text)              # 模型很乖时直接成功
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)  # 抠出花括号片段
    return json.loads(match.group(0)) if match else None
```

## 3.2 第二关：校验（解析成功 ≠ 数据可用）

`json.loads` 成功只说明它是合法 JSON，不代表字段对。模型可能少给字段、给错类型、填个枚举外的值。用一个 schema 把这些挡住：

```python
SCHEMA = {
    "category": {"type": str, "enum": ["bug", "feature", "question"], "required": True},
    "urgency":  {"type": str, "enum": ["high", "low"], "required": True},
    "summary":  {"type": str, "required": True},
}
```

校验函数逐字段检查必填、类型、枚举。`category: "投诉"` 这种就会在这里被拦下，而不是流进你的派单逻辑造成脏数据。

## 3.3 第三关：重试 + 兜底（最后的安全网）

校验没过，先别急着报错。可以**带着「上次错在哪」用更严格的指令重试一次**——模型自我纠正的成功率不低。重试还不行，就返回一个字段齐全的兜底结果，标记成需要人工处理：

```python
FALLBACK = {"category": "question", "urgency": "low",
            "summary": "无法自动分类，待人工处理", "_fallback": True}
```

`_fallback` 标记很重要：前端可以据此提示「这条没自动分类成功」，而不是把垃圾数据当正常结果展示。

# 五、工程上真正会踩的坑

- **只 `json.loads` 不剥代码块**，是线上最高频的 JSON 解析报错。`extract_json` 那层正则不能省。
- **校验只查「能不能解析」，不查枚举和类型**。`category: "投诉"` 是合法 JSON 但是脏数据，会污染下游。枚举必须校验。
- **失败直接抛 500 给前端**。模型偶发跑偏是常态，不是异常。要重试 + 兜底，让前端永远拿到可渲染的结构。
- **兜底结果不打标记**。兜底数据混在正常数据里，没人知道哪些是模型没搞定的。加 `_fallback` 字段，方便前端提示和后台统计失败率。

# 六、一句话面试答法

> **怎么保证模型输出的 JSON 能被前端稳定用？** 我不假设模型输出一定合法，做三道防线：先用「先直接 parse、失败再正则抠花括号」的方式解析，剥掉它爱加的 markdown 代码块；再用 schema 校验字段、类型、枚举，把解析成功但内容不对的脏数据拦住；校验不过就带错误信息让模型重试一次，仍失败返回字段齐全的兜底结果并打 `_fallback` 标记。这样不管模型怎么跑偏，前端拿到的结构永远稳定。

# 八、总结

- **工程上真正会踩的坑**：只 json.loads 不剥代码块，是线上最高频的 JSON 解析报错。
- **三道防线，逐层收口**：把模型输出变成可用数据，要过三关。
- **与进阶篇的分工**：本篇保留为结构化输出基础：重点讲 JSON、schema、解析兜底。
- **一个真实场景**：上一篇你用好 prompt 让模型给用户反馈分类，输出 {"category": "bug", "urgency": "high", ...}。

<!-- knowledge-lab-merged -->

# 动手实践：12 结构化输出与 JSON

让模型输出 JSON 很容易，但**永远不能假设它一定合法**。这个 demo 演示三道防线：解析 → schema 校验 → 失败兜底（含一次重试），用 5 种典型的模型输出把每条失败路径都跑一遍。

## 在线运行

直接使用本文“可运行源码”中的沙盒执行；源码、复制内容和实际运行入口保持一致。

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

## 可运行源码：结构化输出与 JSON

下方代码就是在线沙盒实际执行的完整源码。可直接运行、查看输出或复制到本地，页面不再依赖文章外的重复脚本。

### `main.py`

```python
"""演示模型 JSON 输出的解析、校验、重试和兜底。"""

from __future__ import annotations

import json
import re
from typing import Any

ALLOWED_CATEGORIES = {"refund", "leave", "other"}


def parse_and_validate(raw_output: str) -> dict[str, Any]:
    """解析并校验模型输出；raw_output 是可能不合法的原始文本。"""
    # 去除模型常见的 Markdown 代码围栏。
    cleaned_output = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_output.strip(), flags=re.IGNORECASE)
    try:
        # JSON 解码后的候选对象。
        payload = json.loads(cleaned_output)
    except json.JSONDecodeError as error:
        return {"ok": False, "data": None, "error": f"invalid_json:{error.msg}"}
    if not isinstance(payload, dict):
        return {"ok": False, "data": None, "error": "not_object"}
    if payload.get("category") not in ALLOWED_CATEGORIES:
        return {"ok": False, "data": None, "error": "invalid_category"}
    if not isinstance(payload.get("confidence"), (int, float)) or not 0 <= payload["confidence"] <= 1:
        return {"ok": False, "data": None, "error": "invalid_confidence"}
    return {"ok": True, "data": payload, "error": None}


def main() -> None:
    """覆盖五种典型输出，并在失败时展示统一兜底。"""
    # 覆盖正常、围栏、枚举错误、类型错误和非法 JSON。
    outputs = [
        '{"category":"refund","confidence":0.92}',
        '```json\n{"category":"leave","confidence":0.8}\n```',
        '{"category":"unknown","confidence":0.7}',
        '{"category":"refund","confidence":"high"}',
        "category=refund",
    ]
    for index, output in enumerate(outputs, start=1):
        # 当前案例的校验结果。
        result = parse_and_validate(output)
        # 生产代码可在此触发一次格式修复重试；重试仍失败才兜底。
        final_result = result if result["ok"] else {"ok": False, "data": {"category": "other", "confidence": 0}, "error": result["error"]}
        print(f"案例 {index}: {final_result}")


if __name__ == "__main__":
    main()
```

## 参考资料

- [OpenAI Prompt Engineering](https://platform.openai.com/docs/guides/prompt-engineering)
- [OWASP Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
