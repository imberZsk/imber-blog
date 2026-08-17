# LangChain（05） - Output Parser 实战：智能录入 + 流式版 mini cursor

> 读完后，你应能完成以下任务：
> - 绘制“LangChain（05） - Output Parser 实战：智能录入 + 流式版 mini cursor / 本篇定位”的关键对象与数据流，解释“这是 64 的实战篇，把 parser 放进真实交互：一边生成，一边展示，一边最终校验。”，并用源码位置、日志或 Trace 标注证据。
> - 为“LangChain（05） - Output Parser 实战：智能录入 + 流式版 mini cursor / 核心拆解”设计正常与异常输入，验证“智能录入不是把用户原话塞进一个字段，而是把自然语言转成业务表单。”，输出首个偏差位置与回归测试结果。
> - 实现“LangChain（05） - Output Parser 实战：智能录入 + 流式版 mini cursor / 工程链路”的最小代码或配置，检验“后端请求模型按 schema 抽取字段。”，输出命令、结果与 Diff，并说明不适用边界。

## 核心知识清单

- Output Schema 与字段约束
- 增量 JSONL 解析与缓冲区
- 部分字段状态与 UI 渐进更新
- 解析错误、重试与最终兜底
- 业务校验与模型输出边界
- 流式 Trace、取消与完成事件

<!-- article-progressive-block:start -->
# 一、先建立全局：Output Parser 实战：智能录入 + 流式版 mini cursor 是什么？

理解“Output Parser 实战：智能录入 + 流式版 mini cursor”，先要把标题中的对象放进同一条处理链：它接收什么输入，经过哪些状态变化，最终用什么证据判断结果。下表不另造概念，只把作者正文已经解释的章节按依赖顺序连起来。

“Output Parser 实战：智能录入 + 流式版 mini cursor”的第一个核心判断是：这是 64 的实战篇，把 parser 放进真实交互：一边生成，一边展示，一边最终校验。。先弄清这个判断中的对象和输入输出，后面的实现、故障和验收才有共同语境。

| 顺序 | 章节 | 读完本节应抓住的结论 |
| --- | --- | --- |
| 1 | 本篇定位 | 这是 64 的实战篇，把 parser 放进真实交互：一边生成，一边展示，一边最终校验。 |
| 2 | 核心拆解 | 智能录入不是把用户原话塞进一个字段，而是把自然语言转成业务表单。 |
| 3 | 工程链路 | 后端请求模型按 schema 抽取字段。 |
| 4 | 落地建议 | 解析失败时保留原文，方便用户手动改。 |
| 5 | 常见坑 | 边流式边执行动作，JSON 还没完整就创建任务。 |
| 6 | 和已有主线的关系 | 65 落到智能录入和流式交互，是 13 流式响应和 12 结构化输出的组合实践。 |

## 1.1 核心对象之间怎样衔接

```mermaid
flowchart LR
  S1["本篇定位"] --> S2
  S2["核心拆解"] --> S3
  S3["工程链路"] --> S4
  S4["落地建议"] --> S5
  S5["常见坑"]
```

这张图只表达本文的讲解顺序，不替代正文机制。判断“Output Parser 实战：智能录入 + 流式版 mini cursor”是否真正掌握，需要能从最后一个结果沿图回到前面每个章节的输入、状态变化和证据。

## 1.2 再看失败：问题最早会出现在哪一步？

在“Output Parser 实战：智能录入 + 流式版 mini cursor”的对象和顺序已经明确后，再看可观察的失败：字段到模型阶段才报错、Parser 吞掉原始输出、流式中断被当成完整成功。定位时不从最后一条错误猜原因，而是沿上图找第一个偏离正文结论的节点。
<!-- article-progressive-block:end -->

# 二、本篇定位

这是 64 的实战篇，把 parser 放进真实交互：一边生成，一边展示，一边最终校验。

# 三、一个真实场景

用户输入“明天下午三点提醒我给小王发合同”，系统要抽取时间、对象、动作、备注，并填进表单。
体验上用户希望马上看到模型在处理，工程上你又必须等完整结构化结果校验通过后才能真正创建任务。

# 四、核心拆解

- 智能录入不是把用户原话塞进一个字段，而是把自然语言转成业务表单。字段缺失、歧义和非法值都要处理。
- 流式输出适合展示推理进度或草稿，但结构化提交必须以最终完整 JSON 为准。
- parser 的职责是把模型输出转成 typed data，业务层再决定是否自动填充、提示确认或要求补充信息。

# 五、工程链路

- 前端收到用户自然语言。
- 后端请求模型按 schema 抽取字段。
- 流式阶段展示“正在识别时间/对象/动作”。
- 最终 JSON 到达后 parser 校验。
- 字段完整则填表并等待用户确认。
- 字段缺失则追问。

# 六、落地建议

- 所有自动写入前都要显示给用户确认。
- 时间字段要标准化成 timezone-aware 时间。
- 解析失败时保留原文，方便用户手动改。

# 七、常见坑

- 边流式边执行动作，JSON 还没完整就创建任务。
- 模型抽取到“明天”却没有结合用户时区。
- 字段缺失时硬猜，导致错误录入。

# 八、和已有主线的关系

64 讲 parser/tool 取舍；
65 落到智能录入和流式交互，是 13 流式响应和 12 结构化输出的组合实践。

# 九、复述答法

> 智能录入要把自然语言变成业务字段。流式阶段可以提升体感，但最终执行必须等完整 JSON 解析和业务校验通过。字段完整后也应让用户确认，字段缺失就追问，而不是让模型硬猜。

# 十、可运行实验：增量展示与最终提交分离

下面的实验不调用模型，只验证 Parser 与业务校验边界。
流式块可以进入预览区，但只有完整 JSON 同时通过结构和业务规则后才能提交。

```python runnable file=main.py title="智能录入 Parser" description="运行成功、缺字段和非法时间三组样本，验证失败输出不会提交。"
"""验证流式 JSON 只能在完整解析与业务校验后提交。"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class ReminderDraft:
    """保存通过结构与业务校验的提醒草稿。"""

    # ISO 8601 格式的提醒时间。
    remind_at: str
    # 接收提醒的对象。
    target: str
    # 用户希望执行的动作。
    action: str


def parse_final_json(raw_output: str) -> ReminderDraft:
    """解析最终模型输出；raw_output 必须是完整 JSON 对象。"""
    # 模型返回的原始 JSON 数据。
    payload = json.loads(raw_output)
    # 提醒业务要求的必填字段。
    required_fields = ("remind_at", "target", "action")
    # 当前缺失或为空的字段。
    missing_fields = [field_name for field_name in required_fields if not str(payload.get(field_name, "")).strip()]
    if missing_fields:
        raise ValueError(f"缺少必填字段：{','.join(missing_fields)}")
    try:
        datetime.fromisoformat(payload["remind_at"])
    except (TypeError, ValueError) as error:
        raise ValueError("remind_at 必须是 ISO 8601 时间") from error
    return ReminderDraft(payload["remind_at"], payload["target"], payload["action"])


def consume_stream(chunks: list[str]) -> bool:
    """累积流式块并尝试最终提交；chunks 按到达顺序排列。"""
    # 预览区可以逐块展示但不能触发业务写入。
    preview = ""
    for chunk in chunks:
        preview += chunk
        print(f"preview={preview}")
    try:
        # 只有完整缓冲区进入最终 Parser。
        draft = parse_final_json(preview)
        print(f"draft={draft}")
        return True
    except (json.JSONDecodeError, ValueError) as error:
        print(f"rejected={error}")
        return False


def main() -> None:
    """运行正常、缺字段和非法时间三种输出。"""
    # 三组模型输出块，分别覆盖成功与两个失败边界。
    cases = {
        "valid": ['{"remind_at":"2026-08-16T15:00:00",', '"target":"小王","action":"发合同"}'],
        "missing": ['{"remind_at":"2026-08-16T15:00:00",', '"target":"小王"}'],
        "bad-time": ['{"remind_at":"明天下午",', '"target":"小王","action":"发合同"}'],
    }
    for case_name, chunks in cases.items():
        print(f"\ncase={case_name}")
        # committed 是业务层是否允许创建任务的唯一判断。
        committed = consume_stream(chunks)
        print(f"committed={committed}")


if __name__ == "__main__":
    main()
```

预期 `valid` 的 `committed=True`，另外两组均为 `False`。
缺字段应报告 `action`，非法时间应报告 ISO 8601 约束；
任何预览文本都不能提前创建提醒。

<!-- article-progressive-block:start -->
# 十一、动手验证：先跑通 Output Parser 实战：智能录入 + 流式版 mini cursor，再改变一个变量

前面的章节已经建立问题、概念和机制。现在把“Output Parser 实战：智能录入 + 流式版 mini cursor”放进同一套基线中运行；本节不再引入新术语，只验证前文结论能否被复现。

## 11.1 基线与候选只允许一个变量不同

验证“Output Parser 实战：智能录入 + 流式版 mini cursor”时，先固定Runnable 输入类型、Prompt 变量、依赖版本、模型替身和异常样本。候选方案只能改变本次要验证的变量；如果同时更换数据、依赖和配置，即使结果改善，也不能知道是哪一项产生作用。

执行“Output Parser 实战：智能录入 + 流式版 mini cursor”时，动作是：逐段 invoke 并记录 Retriever、Prompt、Model、Parser 的输入输出，再比较整链结果。原始结果不能只保留截图或汇总分数，必须同步保存：各 Runnable 的序列化输入输出、Trace、异常类型、预期断言和依赖版本，使下一次复查可以在同一输入上重放。

| 实验要素 | 本文要求 |
| --- | --- |
| 固定条件 | Runnable 输入类型、Prompt 变量、依赖版本、模型替身和异常样本 |
| 唯一变量 | 本次候选方案与基线之间的一项明确差异 |
| 原始证据 | 各 Runnable 的序列化输入输出、Trace、异常类型、预期断言和依赖版本 |
| 通过阈值 | 数据形状逐段匹配，错误停在首个失效边界，整链结果能由中间状态解释 |
| 立即停止 | 字段到模型阶段才报错、Parser 吞掉原始输出、流式中断被当成完整成功 |

## 11.2 执行前先排除不可比较条件

“Output Parser 实战：智能录入 + 流式版 mini cursor”开始前先确认下面四项；任一项不成立，都应先修复实验条件，而不是解释结果。

- 基线能够在“Output Parser 实战：智能录入 + 流式版 mini cursor”的当前环境重复运行。
- 候选只改变一个与“Output Parser 实战：智能录入 + 流式版 mini cursor”结论直接相关的条件。
- “Output Parser 实战：智能录入 + 流式版 mini cursor”的基线和候选使用同一批输入、同一版本依赖与同一通过阈值。
- “Output Parser 实战：智能录入 + 流式版 mini cursor”的原始输出和失败现场不会被重试、格式化或汇总覆盖。

## 11.3 执行后先核对证据完整性

结果出来后先检查证据，再讨论“Output Parser 实战：智能录入 + 流式版 mini cursor”是否通过。缺少中间状态时，最终输出只能说明现象，不能证明机制。

| 检查项 | 当前文章的判定 |
| --- | --- |
| 输入可追溯 | Runnable 输入类型、Prompt 变量、依赖版本、模型替身和异常样本 |
| 过程可回放 | 逐段 invoke 并记录 Retriever、Prompt、Model、Parser 的输入输出，再比较整链结果 |
| 结果可审计 | 各 Runnable 的序列化输入输出、Trace、异常类型、预期断言和依赖版本 |

“Output Parser 实战：智能录入 + 流式版 mini cursor”的一次合格基线对照按以下顺序执行：

1. 保存“Output Parser 实战：智能录入 + 流式版 mini cursor”基线版本及输入摘要，确认基线本身可以重复运行。
2. 写下“Output Parser 实战：智能录入 + 流式版 mini cursor”候选方案唯一变化的变量，以及它预期影响的指标。
3. 在同一环境执行“Output Parser 实战：智能录入 + 流式版 mini cursor”：逐段 invoke 并记录 Retriever、Prompt、Model、Parser 的输入输出，再比较整链结果。
4. 为“Output Parser 实战：智能录入 + 流式版 mini cursor”保存：各 Runnable 的序列化输入输出、Trace、异常类型、预期断言和依赖版本。
5. 使用“Output Parser 实战：智能录入 + 流式版 mini cursor”预登记条件判断：数据形状逐段匹配，错误停在首个失效边界，整链结果能由中间状态解释。
6. 如果“Output Parser 实战：智能录入 + 流式版 mini cursor”未通过，不修改第二个变量，先恢复基线并保留失败现场。

# 十二、用一张矩阵验证 Output Parser 实战：智能录入 + 流式版 mini cursor 的关键结论

矩阵按正文顺序列出“Output Parser 实战：智能录入 + 流式版 mini cursor”的结论。一次实验只选择一行，只改变这一行对应的条件；不要把多行合并成一个无法归因的大实验。

| 正文章节 | 已解释的结论 | 本轮唯一变量 | 必须保存的证据 |
| --- | --- | --- | --- |
| 本篇定位 | 这是 64 的实战篇，把 parser 放进真实交互：一边生成，一边展示，一边最终校验。 | 只改变与“本篇定位”相关的条件 | 各 Runnable 的序列化输入输出、Trace、异常类型、预期断言和依赖版本 |
| 核心拆解 | 智能录入不是把用户原话塞进一个字段，而是把自然语言转成业务表单。 | 只改变与“核心拆解”相关的条件 | 各 Runnable 的序列化输入输出、Trace、异常类型、预期断言和依赖版本 |
| 工程链路 | 后端请求模型按 schema 抽取字段。 | 只改变与“工程链路”相关的条件 | 各 Runnable 的序列化输入输出、Trace、异常类型、预期断言和依赖版本 |
| 落地建议 | 解析失败时保留原文，方便用户手动改。 | 只改变与“落地建议”相关的条件 | 各 Runnable 的序列化输入输出、Trace、异常类型、预期断言和依赖版本 |
| 常见坑 | 边流式边执行动作，JSON 还没完整就创建任务。 | 只改变与“常见坑”相关的条件 | 各 Runnable 的序列化输入输出、Trace、异常类型、预期断言和依赖版本 |
| 和已有主线的关系 | 65 落到智能录入和流式交互，是 13 流式响应和 12 结构化输出的组合实践。 | 只改变与“和已有主线的关系”相关的条件 | 各 Runnable 的序列化输入输出、Trace、异常类型、预期断言和依赖版本 |

## 12.1 记录本次实际实验

下面的记录用于“Output Parser 实战：智能录入 + 流式版 mini cursor”当前这一次实验，不是第二套知识目录。先从矩阵选择一个章节，再填写实际值；没有填写的字段表示尚未验证。

```yaml
topic: "Output Parser 实战：智能录入 + 流式版 mini cursor"
selected_chapter: required
claim_from_article: required
baseline_version: required
changed_condition: exactly_one
execution: "逐段 invoke 并记录 Retriever、Prompt、Model、Parser 的输入输出，再比较整链结果"
evidence: "各 Runnable 的序列化输入输出、Trace、异常类型、预期断言和依赖版本"
pass_when: "数据形状逐段匹配，错误停在首个失效边界，整链结果能由中间状态解释"
stop_when: "字段到模型阶段才报错、Parser 吞掉原始输出、流式中断被当成完整成功"
observed_result: required
first_deviation: null_or_evidence
recovery_replay: required_after_failure
```

## 12.2 边界实验必须证明能够停止和恢复

成功路径只能证明“Output Parser 实战：智能录入 + 流式版 mini cursor”在当前样本上工作，不能证明它可以进入生产。边界实验需要主动制造：字段到模型阶段才报错、Parser 吞掉原始输出、流式中断被当成完整成功，并观察系统是否在产生不可逆副作用前停止。

| 场景 | 只改变什么 | 应保存什么 | 通过标准 |
| --- | --- | --- | --- |
| 正常路径 | 使用已知有效输入 | 各 Runnable 的序列化输入输出、Trace、异常类型、预期断言和依赖版本 | 数据形状逐段匹配，错误停在首个失效边界，整链结果能由中间状态解释 |
| 边界路径 | 把一个输入推进到约束临界值 | 临界值前后的输出与指标 | 不静默降级，不把部分结果冒充成功 |
| 明确失败 | 注入：字段到模型阶段才报错、Parser 吞掉原始输出、流式中断被当成完整成功 | 原始错误、首个异常阶段和最终状态 | 失败被正确分类且没有扩大副作用 |
| 恢复重放 | 执行：隔离失败 Runnable，固定其输入单独重放，再恢复相邻节点契约测试 | 原失败样本的复测证据 | 原样本恢复，正常样本没有回归 |

恢复动作不是简单重启。对于“Output Parser 实战：智能录入 + 流式版 mini cursor”，第一步是：隔离失败 Runnable，固定其输入单独重放，再恢复相邻节点契约测试。完成后使用原始失败样本复测；只验证一个新样本成功，不能证明触发条件已经消失。

“Output Parser 实战：智能录入 + 流式版 mini cursor”边界实验结束后，应把正常、临界、失败和恢复四类记录放在同一个运行批次中。这样才能区分“候选方案真的修复问题”和“环境变化让问题暂时没有出现”。

# 十三、Output Parser 实战：智能录入 + 流式版 mini cursor 的结果解释

解释“Output Parser 实战：智能录入 + 流式版 mini cursor”实验时先看首个偏差，而不是最后一条错误。最后的异常通常只是上游状态错误的结果；从末端反推容易误把症状当根因。

| 观察结果 | 可以支持的判断 | 下一步 |
| --- | --- | --- |
| 主链路没有达到预期 | 字段到模型阶段才报错、Parser 吞掉原始输出、流式中断被当成完整成功 | 先执行：隔离失败 Runnable，固定其输入单独重放，再恢复相邻节点契约测试 |
| 异常链路无法恢复 | 字段到模型阶段才报错、Parser 吞掉原始输出、流式中断被当成完整成功 | 先执行：隔离失败 Runnable，固定其输入单独重放，再恢复相邻节点契约测试 |
| 新样本成功但原样本仍失败 | 修复没有覆盖原始触发条件 | 固定原失败输入，恢复基线后重新比较 |
| 指标改善但证据无法回链 | 数据、版本或中间状态没有固定 | 暂停发布，补齐可追溯记录后重跑 |

“Output Parser 实战：智能录入 + 流式版 mini cursor”只有同时满足“数据形状逐段匹配，错误停在首个失效边界，整链结果能由中间状态解释”，并且没有出现“字段到模型阶段才报错、Parser 吞掉原始输出、流式中断被当成完整成功”，才可以认为主链路通过。这里的“通过”只对当前固定版本、样本和环境有效，不能外推到尚未测试的容量、权限或数据分布。

如果“Output Parser 实战：智能录入 + 流式版 mini cursor”候选方案与基线差异很小，先检查证据分辨率是否足够；如果差异很大，先排除数据泄漏、环境漂移和版本不一致。两种情况都不能只看一个汇总均值，需要回到逐样本输出和中间状态。

“Output Parser 实战：智能录入 + 流式版 mini cursor”故障定位完成后，记录“现象、首个偏差、根因、改动、原样本复测”五项。缺少原样本复测时，只能标记为待观察，不能标记为已解决。

# 十四、Output Parser 实战：智能录入 + 流式版 mini cursor 的发布判断

发布判断需要把“Output Parser 实战：智能录入 + 流式版 mini cursor”的质量、失败边界和恢复能力放在同一份记录中。以下任一条件缺失，都应停止扩量，而不是用“基本正常”替代证据。

- [ ] “Output Parser 实战：智能录入 + 流式版 mini cursor”的基线与候选只存在一个计划内变量。
- [ ] “Output Parser 实战：智能录入 + 流式版 mini cursor”的输入、代码、依赖、配置和数据版本可以追溯。
- [ ] “Output Parser 实战：智能录入 + 流式版 mini cursor”的正常、临界、失败和恢复样本使用同一套断言。
- [ ] “Output Parser 实战：智能录入 + 流式版 mini cursor”的原始输出、中间状态和失败现场已经保留。
- [ ] “Output Parser 实战：智能录入 + 流式版 mini cursor”的日志、Trace、截图和测试数据已经脱敏。
- [ ] “Output Parser 实战：智能录入 + 流式版 mini cursor”的停止条件、负责人和回滚入口已经演练。
- [ ] “Output Parser 实战：智能录入 + 流式版 mini cursor”尚未覆盖的输入、权限、容量和外部依赖已经登记。

最终记录至少包含基线版本、唯一变量、原始证据、首个偏差、恢复复测和发布责任人。没有参与本次修改的人如果不能据此重放“Output Parser 实战：智能录入 + 流式版 mini cursor”的判断，就不能发布。
<!-- article-progressive-block:end -->

# 十五、总结

- **本篇定位**：这是 64 的实战篇，把 parser 放进真实交互：一边生成，一边展示，一边最终校验。
- **核心拆解**：智能录入不是把用户原话塞进一个字段，而是把自然语言转成业务表单。
- **落地建议**：解析失败时保留原文，方便用户手动改。
- **和已有主线的关系**：65 落到智能录入和流式交互，是 13 流式响应和 12 结构化输出的组合实践。
- **复述答法**：流式阶段可以提升体感，但最终执行必须等完整 JSON 解析和业务校验通过。
- **可运行实验：增量展示与最终提交分离**：流式块可以进入预览区，但只有完整 JSON 同时通过结构和业务规则后才能提交。

## 参考资料

- [LangChain 文档](https://docs.langchain.com/oss/python/langchain/overview)
- [LangChain structured output](https://docs.langchain.com/oss/python/langchain/structured-output)
- [LangChain streaming](https://docs.langchain.com/oss/python/langchain/streaming)
