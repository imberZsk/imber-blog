# LangChain（04） - 结构化大模型输出：output parser 还是 tool?

> 读完后，你应能完成以下任务：
> - 绘制“LangChain（04） - 结构化大模型输出：output parser 还是 tool? / 本篇定位”的关键对象与数据流，解释“这是结构化输出的进阶取舍篇。”，并用源码位置、日志或 Trace 标注证据。
> - 为“LangChain（04） - 结构化大模型输出：output parser 还是 tool? / 核心拆解”设计正常与异常输入，验证“Output parser 适合轻量任务：模型输出文本后，后端按 schema 解析和校验。”，输出首个偏差位置与回归测试结果。
> - 实现“LangChain（04） - 结构化大模型输出：output parser 还是 tool? / 工程链路”的最小代码或配置，检验“只需要展示结构化结果，用 structured output。”，输出命令、结果与 Diff，并说明不适用边界。

# 一、本篇定位

这是结构化输出的进阶取舍篇。12 讲 JSON 输出基础，64 讨论生产里该选哪种约束方式。

# 二、一个真实场景

你让模型从用户输入里抽取姓名、时间、事项，返回 JSON。用 prompt 要求“只输出 JSON”经常会混入解释；用 parser 可以修，但失败还要重试；用 tool calling 则让模型按函数参数格式输出。三种方式不是谁替代谁，而是适用场景不同。

# 三、核心拆解

- Output parser 适合轻量任务：模型输出文本后，后端按 schema 解析和校验。它灵活，但依赖模型自觉遵守格式。
- Structured output 让模型接口层支持 schema 约束，稳定性更好，适合强格式返回。
- Tool calling 适合“结构化输出之后还要执行动作”的场景。模型输出的是工具名和参数，后端决定是否执行。

# 四、工程链路

- 只需要展示结构化结果，用 structured output。
- 需要兼容普通文本模型，用 output parser 加校验重试。
- 结构化结果会触发外部动作，用 tool calling。
- 不管哪种方式，后端都要做 schema 校验。

# 五、落地建议

- 表单抽取优先 structured output。
- 工具调用参数必须再过业务校验。
- 解析失败要返回可恢复错误，别让前端拿到半截 JSON。

# 六、常见坑

- 只靠 prompt 说“不要输出多余内容”。
- 把 parser 当安全机制，解析成功不代表业务安全。
- 明明只是抽取信息，却强行包装成工具调用。

# 七、和已有主线的关系

12 是结构化输出入门，28 是 Function Calling；64 说明两者在生产任务里的边界。

# 八、复述答法

> 如果只是要稳定 JSON，优先 structured output；接口不支持时用 output parser 加校验重试；如果结构化参数会触发外部动作，就用 tool calling。无论哪种方式，后端 schema 和业务校验都不能省。

# 九、动手实践：结构化输出校验与重试

用标准库复现生产链路中的四层防线：**提取 JSON、语法解析、Schema 校验、业务规则校验**。实验包含一次可修复输出和一次必须拒绝的非法输出。

## 9.1 在线运行


零依赖，Python 3.10+ 可运行。真实项目可把 `validate_schema` 换成 Pydantic，把 `repair_json` 换成一次受限模型重试，但权限和业务规则仍必须由后端执行。

## 9.2 重点观察

- “能解析成 JSON”不等于“满足 Schema”。
- “满足 Schema”也不等于“业务上允许执行”。
- 修复重试应有次数上限，并保留原始输出供 Trace 排障。

## 9.3 可运行源码：结构化大模型输出：output parser 还是 tool?


### main.py

```python
"""离线演示结构化输出的解析、修复、Schema 与业务校验。"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

# 允许模型输出的工单类别。
ALLOWED_CATEGORIES = {"refund", "delivery", "other"}
# 工单优先级允许的最小值。
MIN_PRIORITY = 1
# 工单优先级允许的最大值。
MAX_PRIORITY = 5


@dataclass(frozen=True, slots=True)
class Ticket:
    """保存完成 Schema 校验后的工单数据。"""

    # 工单业务类别。
    category: str
    # 一到五级的业务优先级。
    priority: int
    # 不包含额外解释的工单摘要。
    summary: str


def parse_json(model_text: str) -> dict[str, Any]:
    """解析纯 JSON 对象；model_text 是模型原始输出。"""
    # Python 标准库解析后的任意 JSON 值。
    parsed_value = json.loads(model_text)
    if not isinstance(parsed_value, dict):
        raise ValueError("顶层必须是 JSON object")
    return parsed_value


def repair_json(model_text: str) -> str:
    """提取首个 JSON 对象；model_text 可能包含模型解释文本。"""
    # 原始输出中第一个左花括号的位置。
    object_start = model_text.find("{")
    # 原始输出中最后一个右花括号的位置。
    object_end = model_text.rfind("}")
    if object_start < 0 or object_end <= object_start:
        raise ValueError("未找到可修复的 JSON object")
    return model_text[object_start : object_end + 1]


def validate_schema(payload: dict[str, Any]) -> Ticket:
    """校验字段、类型和取值；payload 是解析后的 JSON 对象。"""
    # Schema 要求且不允许缺失的字段集合。
    required_fields = {"category", "priority", "summary"}
    # 当前输出缺失的必填字段集合。
    missing_fields = required_fields - payload.keys()
    if missing_fields:
        raise ValueError(f"缺少字段: {sorted(missing_fields)}")

    # 模型输出中的工单类别。
    category = payload["category"]
    # 模型输出中的工单优先级。
    priority = payload["priority"]
    # 模型输出中的工单摘要。
    summary = payload["summary"]
    if not isinstance(category, str) or category not in ALLOWED_CATEGORIES:
        raise ValueError("category 不在允许枚举中")
    if not isinstance(priority, int) or isinstance(priority, bool):
        raise ValueError("priority 必须是整数")
    if not MIN_PRIORITY <= priority <= MAX_PRIORITY:
        raise ValueError("priority 必须在 1 到 5 之间")
    if not isinstance(summary, str) or not summary.strip() or len(summary) > 200:
        raise ValueError("summary 必须是 1 到 200 字的非空文本")
    return Ticket(category=category, priority=priority, summary=summary.strip())


def validate_business(ticket: Ticket, user_role: str) -> None:
    """执行后端业务规则；ticket 已通过 Schema，user_role 是真实权限角色。"""
    if ticket.priority == MAX_PRIORITY and user_role != "supervisor":
        raise PermissionError("普通客服不能直接创建 P5 紧急工单")


def process_output(model_text: str, user_role: str) -> Ticket:
    """处理一次模型输出；解析失败时只允许一次确定性修复。"""
    try:
        # 首次严格解析得到的 JSON 对象。
        payload = parse_json(model_text)
        print("parse: success without repair")
    except (json.JSONDecodeError, ValueError) as error:
        print(f"parse: failed ({error})")
        # 从解释文本中提取出的修复后 JSON 字符串。
        repaired_text = repair_json(model_text)
        print("retry: extracted JSON object")
        payload = parse_json(repaired_text)

    # 通过类型和取值约束的工单对象。
    ticket = validate_schema(payload)
    print("schema: valid")
    validate_business(ticket, user_role)
    print("business: allowed")
    return ticket


def main() -> None:
    """运行可修复输出和业务拒绝输出两个场景。"""
    # 包含额外解释但 JSON 内容合法的模型输出。
    repairable_output = '好的，结果如下：{"category":"refund","priority":2,"summary":"退款未到账"}'
    # Schema 合法但试图创建最高优先级工单的模型输出。
    forbidden_output = '{"category":"delivery","priority":5,"summary":"要求立即升级"}'

    print("=== 场景 1：脏输出经过一次修复 ===")
    # 第一场景最终得到的结构化工单。
    repaired_ticket = process_output(repairable_output, user_role="agent")
    print("result:", repaired_ticket)

    print("\n=== 场景 2：Schema 通过但业务规则拒绝 ===")
    try:
        process_output(forbidden_output, user_role="agent")
    except PermissionError as error:
        print("blocked:", error)


if __name__ == "__main__":
    main()
```

# 十、总结

- **本篇定位**：这是结构化输出的进阶取舍篇。
- **核心拆解**：Output parser 适合轻量任务：模型输出文本后，后端按 schema 解析和校验。
- **落地建议**：工具调用参数必须再过业务校验。
- **常见坑**：只靠 prompt 说“不要输出多余内容”。
- **和已有主线的关系**：12 是结构化输出入门，28 是 Function Calling；
- **复述答法**：如果只是要稳定 JSON，优先 structured output；

## 参考资料

- [LangChain 文档](https://docs.langchain.com/oss/python/langchain/overview)
- [Dify 文档](https://docs.dify.ai/)
