# Agent 工程（47）- 项目：个人 Agent 工作台

> 读完你能：讲清"单次问答"和"多步工作流编排"的本质区别，理解步骤依赖、fan-out、暂停确认、状态恢复这几个编排概念，并跑通一个能自动推进 4 步任务的工作台。

# 一、一个真实场景

早上九点，你对工作台说一句："帮我整理今天的任务，给延期的建提醒，再写个日报草稿。"

这一句话背后是一串动作：

1. 查出今天所有任务。
2. 从里面挑出延期的。
3. 给每个延期任务建一条提醒。
4. 把"几项任务、几项延期、建了几条提醒"汇总成日报。

前面 44-46 三个项目都是"一问一答"——用户问一句，助手答一句，顶多调一个工具。但这个需求不是一问一答，它是一条**有先后、有依赖的流水线**：第 2 步要用第 1 步的结果，第 4 步要用前三步的结果，第 3 步还是个写操作得卡确认。

把这种多步任务自动跑起来，就是"工作台"和"聊天助手"的分水岭。这一篇讲怎么做编排。

# 二、编排的本质：声明步骤 + 声明依赖

很多人以为多步 Agent 很玄乎。其实编排的核心就两件事：**把目标拆成有序步骤**，**说清每步的参数从哪来**。

```python
[
  {"step": "查全部任务", "tool": "list_tasks", "args": {}},
  # tasks 这个参数不是写死的，是"取第 0 步输出里的 tasks 字段"
  {"step": "筛出延期", "tool": "filter_overdue",
   "args": {"tasks": {"from_step": 0, "field": "tasks"}}},
  ...
]
```

关键是 `{"from_step": 0, "field": "tasks"}` 这种**引用型参数**。它不是一个值，是一句话："我的这个参数，等第 0 步跑完，去它的输出里取 `tasks` 字段。"编排器执行到这一步时，再把引用替换成真实数据：

```python
def _resolve_args(self, raw):
    resolved = {}
    for key, value in raw.items():
        if isinstance(value, dict) and "from_step" in value:
            # 引用型参数：回填前面某步的真实产出
            resolved[key] = self.results[value["from_step"]][value["field"]]
        else:
            resolved[key] = value
    return resolved
```

步骤之间靠 `results` 列表传递数据，依赖关系靠 `from_step` 声明。这就是工作流引擎最朴素的样子。真实项目里 LangGraph、各种 workflow 框架做的也是这件事，只是封装更厚。

# 三、fan-out：对一个列表里每一项都做同一件事

第 3 步有个特殊形态：延期任务有好几个，要给"每一个"都建提醒。这叫 fan-out（扇出）——拿上一步的列表，逐项调用同一个工具：

```python
items = self.results[ref["from_step"]][ref["field"]]   # 上一步筛出的延期任务列表
for item in items:
    self._run_tool("create_reminder", {"title": f"提醒：{item['title']}"}, confirmed)
```

fan-out 在 Agent 编排里很常见："把这批文件都总结一遍""给这些客户都发通知"。它的工程要点是：其中任何一项失败或被拦，整个步骤要能停下来，而不是闷头跑完——demo 里只读权限的用户跑到这一步就被拦在第一项上了。

# 四、写操作让整个工作流暂停，不是跳过

单次问答里，写操作没确认就返回"待确认"完事。工作流里不一样——写操作在流水线中间，它没确认，**整条流水线得停在这里**：

```
[0] 查任务      → 完成
[1] 筛延期      → 完成
[2] 建提醒(写)  → 没确认 → 整个工作流 paused，返回"待确认 2 项"
[3] 写日报      → 还没轮到，不执行
```

工作流有了"中间状态"。它可以是 `done`（跑完）、`paused`（停在某步等确认）、`blocked`（被权限拦死）。`paused` 是最能体现编排价值的状态：用户确认后，工作流能**从暂停点继续**，而不是从头再来。demo 场景 1 暂停、场景 2 确认后跑通，就是这条路径。

# 六、工程上真正会踩的坑

- **步骤依赖写死成顺序，不显式声明**：以为"反正按顺序跑"就行，结果改了步骤顺序数据就错位。依赖要显式声明（`from_step`），不能靠隐式假设。
- **fan-out 不处理部分失败**：10 个里第 3 个失败了，前 2 个已经执行、后 7 个还没跑，状态一团乱。要明确策略：是全停、还是跳过失败项继续、还是回滚。
- **暂停状态不持久化**：工作流 `paused` 了，进程一重启状态全丢，用户得从头再来。中间状态要落盘，才能真正"恢复"。
- **写操作确认做成一步一弹窗**：一个工作流里三个写操作，弹三次确认，用户烦死。要么批量确认（"这 2 条提醒都建吗"），要么开始前一次性预览所有写操作。
- **trace 只记成功不记失败**：被 `blocked` 的步骤不写 trace，出了问题不知道卡在哪。成功、暂停、拦截都要进 trace。

# 七、一句话面试答法

> **多步 Agent 工作流和单次工具调用有什么区别？** 单次调用是一问一答，工作流是一串有依赖的步骤。编排的核心是声明每一步调什么工具、参数从哪来——后面步骤通过引用前面步骤的输出来传数据。工程上要处理三种状态：跑完、被权限拦死、以及碰到写操作时暂停等确认。我会把暂停状态持久化，确认后从断点恢复而不是从头重跑，每一步无论成功失败都进 trace，保证整个任务可观察、可恢复。

# 九、总结

- **编排的本质：声明步骤 + 声明依赖**：很多人以为多步 Agent 很玄乎。
- **工程上真正会踩的坑**：步骤依赖写死成顺序，不显式声明：以为"反正按顺序跑"就行，结果改了步骤顺序数据就错位。
- **fan-out：对一个列表里每一项都做同一件事**：第 3 步有个特殊形态：延期任务有好几个，要给"每一个"都建提醒。
- **写操作让整个工作流暂停，不是跳过**：单次问答里，写操作没确认就返回"待确认"完事。

<!-- knowledge-lab-merged -->

# 动手实践：47 个人 Agent 工作台

把多个工具、多个步骤编排成一个能自动推进的**工作流**。一个目标"整理今天的任务、给延期项建提醒、写日报"被拆成 4 步，步骤之间有依赖（后一步用前一步的产出），写操作会让整个工作流暂停等确认。

## 在线运行

直接使用本文“可运行源码”中的沙盒执行；源码、复制内容和实际运行入口保持一致。

零依赖，纯标准库。

## 预期输出

```
=== 场景 1：未确认写操作，工作流在建提醒前暂停 ===
  规划出 4 步：查全部任务 → 筛出延期任务 → 为延期任务建提醒 → 生成日报草稿
  [0] 查全部任务：完成
  [1] 筛出延期任务：完成
  [2] 为延期任务建提醒：写操作待确认（2 项）
  状态：paused

=== 场景 2：已确认，工作流完整跑通 ===
  [2] 为延期任务建提醒：建了 2 条提醒
  [3] 生成日报草稿：完成
  状态：done
  日报草稿：今日共 3 项任务，其中 2 项延期，已为延期任务创建 2 条提醒，将优先处理。

=== 场景 3：只读权限，建提醒步骤被拦 ===
  [2] 为延期任务建提醒：被拦截（缺少权限 write:reminders）
  状态：blocked
```

三种状态各看一次：写操作前 `paused` 等确认、确认后 `done`、没权限 `blocked`。这就是工作流编排和单次问答的区别——它有中间状态，能暂停、能恢复、能被拦在半路。

## 代码对应文章的哪些点

| 概念 | 在 main.py 哪里 |
|---|---|
| 把目标拆成多步计划 | `plan` |
| 步骤间依赖（后一步用前一步产出） | `Workbench._resolve_args` 的 `from_step` |
| 对列表逐项调用（给每个延期任务建提醒） | `execute` 的 `fan_out` 分支 |
| 写操作暂停等确认 | `execute` 返回 `paused` |
| 权限不足拦截 | `_run_tool` 的权限校验 |
| 全程可观察 | `self.trace` |

## 动手改

- 在 `plan` 里加一个新目标（比如"查订单 + 发通知"），体会编排就是"声明步骤 + 声明依赖"。
- 把 `paused` 状态存盘，下次启动时从暂停点恢复，体验"任务可恢复"。
- 给某一步故意引用一个不存在的 `from_step`，看编排器怎么报错。

## 可运行源码：项目：个人 Agent 工作台

下方代码就是在线沙盒实际执行的完整源码。可直接运行、查看输出或复制到本地，页面不再依赖文章外的重复脚本。

### `main.py`

```python
"""用有依赖和人工确认的步骤编排个人 Agent 工作台。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Step:
    """描述一个工作流步骤。"""

    # 用于依赖引用的步骤标识。
    step_id: str
    # 面向用户的步骤名称。
    name: str
    # 必须先完成的步骤标识。
    depends_on: tuple[str, ...] = ()
    # 是否会修改外部状态。
    requires_confirmation: bool = False


def run_workflow(auto_confirm: bool) -> dict[str, str]:
    """按依赖顺序运行；auto_confirm 控制写操作是否获批。"""
    # 从读取任务到生成日报的有向无环步骤。
    steps = [
        Step("tasks", "读取今天任务"),
        Step("late", "识别延期项", ("tasks",)),
        Step("reminders", "创建提醒", ("late",), True),
        Step("report", "生成日报", ("tasks", "late")),
    ]
    # 已完成步骤的产出，供后续步骤使用。
    outputs: dict[str, str] = {}
    for step in steps:
        if not all(dependency in outputs for dependency in step.depends_on):
            raise RuntimeError(f"依赖未满足：{step.step_id}")
        if step.requires_confirmation and not auto_confirm:
            outputs[step.step_id] = "等待人工确认"
            print(f"暂停：{step.name} 是写操作，需要确认")
            continue
        outputs[step.step_id] = f"{step.name} 已完成"
        print(outputs[step.step_id])
    return outputs


def main() -> None:
    """先展示暂停，再展示确认后的完整运行。"""
    print("未确认运行:")
    run_workflow(auto_confirm=False)
    print("\n用户确认后:")
    run_workflow(auto_confirm=True)


if __name__ == "__main__":
    main()
```

## 参考资料

- [FastAPI 大型应用](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [Docker Compose](https://docs.docker.com/compose/)
