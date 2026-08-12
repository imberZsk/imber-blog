# 工程基础（6）- Python 数据结构

> 读完你能：在 AI 应用里准确地用 list / dict / tuple / set 组织消息历史、知识库、工具表和引用来源，知道什么场景该选哪个，而不是无脑用 list 和 dict。

# 一、一个真实场景

你给助手做记忆功能：要存多轮对话，按顺序回放；要存一个知识库，拿关键词快速查；要登记一批可调用的工具，每个工具名字和说明绑死不能乱改；最后回答里还要列引用来源，同一份文档被命中好几段时，引用只显示一次。

这四件事，刚好对应 Python 的四种基础结构。选对了，代码读起来就是自解释的；选错了，比如用 list 存知识库、每次检索都从头遍历，数据一多就卡，而且别人看不懂你的意图。这一篇就把「什么场景配哪种结构」讲透。

# 二、四种结构，对着场景记

| 结构 | 字面量 | 一句话特征 | AI 场景 |
|---|---|---|---|
| `list` | `[1, 2, 3]` | 有序、可变、可重复 | 消息历史、检索结果、工具调用 trace |
| `dict` | `{"k": "v"}` | 键值对、按 key 取值快 | 单条消息、知识库、模型 JSON 响应 |
| `tuple` | `(a, b)` | 有序、**不可变** | 固定配对，如 (工具名, 说明)、(经度, 纬度) |
| `set` | `{1, 2, 3}` | 无序、**自动去重** | 引用来源去重、已处理 ID 集合 |

前端对照：`list` 就是数组，`dict` 就是对象。`tuple` 和 `set` 在 JS 里没有同样顺手的内置类型（`Set` 有但不常用），但理解成「冻住的数组」和「自动去重的数组」就够了。

**1. list —— 顺序就是信息**

```python
history = [
    {"role": "user", "content": "报销要多久内提交？"},
    {"role": "assistant", "content": "30 天内。"},
]
history.append({"role": "user", "content": "请假呢？"})  # 对话往后追加
```

消息历史、工具调用记录都强依赖顺序，用 list。要取「最近一次提问」就倒序遍历。

**2. dict —— 拿 key 直接命中**

```python
knowledge = {"报销": "30 天内提交...", "请假": "提前 1 天提交..."}
hits = [v for k, v in knowledge.items() if k in question]  # 关键词匹配
```

知识库的检索本质是「拿关键词查值」，dict 按 key 取值是 O(1)，比在 list 里逐条找快得多。单条消息也是 dict：`{"role", "content"}` 字段固定。

**3. tuple —— 不该被改的配对**

```python
tools = [("search_kb", "知识库检索"), ("calc", "四则运算")]
for name, desc in tools:   # 解包，比 t[0]/t[1] 易读
    ...
```

工具名和说明是绑死的配对，用 tuple 表达「这俩不该被中途改字段」。tuple 不可变，误改会直接报错，相当于给数据上了把锁。

**4. set —— 去重交给它**

```python
sources = set()
sources.add("财务制度.md")
sources.add("财务制度.md")  # 重复添加无效，集合里还是一份
```

一次回答引用了同一文档的三段内容，来源只该显示一次。用 set 收集来源天然去重，省掉手写「在不在列表里」的判断。

# 四、工程上真正会踩的坑

- **用 list 存本该按 key 查的数据**：知识库放 list 里，每次检索全表扫描，几千条就明显变慢，还得手写匹配。能按 key 查的就用 dict。
- **同一字段类型飘忽**：`source` 有时是字符串 `"a.md"`，有时是字典 `{"file": "a.md"}`，下游解析必崩。一个字段固定一种类型。
- **空数据返回 None 还是返回空 list 混用**：检索没命中，有时返回 `None` 有时返回 `[]`，调用方得两种判断都写。统一返回空 list，调用方 `if not hits` 一招通吃。
- **以为 dict 无序**：Python 3.7 起 dict 保留插入顺序，但别依赖它做「排序」语义，要排序就显式 `sorted()`。
- **拿 list 当 set 去重**：手写 `if x not in seen: seen.append(x)`，数据一多就慢。去重直接上 set。

# 五、一句话面试答法

**问：AI 应用里这几种数据结构怎么选？**

> 看访问方式：要顺序、要追加用 list（消息历史、trace）；要按 key 查用 dict（知识库、JSON 响应）；是固定不该改的配对用 tuple；只关心存在性、要去重用 set（引用来源去重）。选错最常见的后果是用 list 存该按 key 查的数据，数据量一上来检索就慢。

# 七、总结

- **工程上真正会踩的坑**：用 list 存本该按 key 查的数据：知识库放 list 里，每次检索全表扫描，几千条就明显变慢，还得手写匹配。
- **一个真实场景**：你给助手做记忆功能：要存多轮对话，按顺序回放；
- **四种结构，对着场景记**：前端对照：list 就是数组，dict 就是对象。
- **配套 demo：跑起来看**：main.py 把四种结构串成一条完整流程：从消息历史取最近提问 → 在知识库检索 → 对来源去重 → 在工具表里查说明。

<!-- knowledge-lab-merged -->

# 动手实践：06 Python 数据结构

用 list / dict / tuple / set 四种结构组织一个 AI 助手的内部数据：消息历史、知识库、工具表、引用来源。一种结构对应一个真实场景，让你看清「什么时候该用哪个」。

## 在线运行

直接使用本文“可运行源码”中的沙盒执行；源码、复制内容和实际运行入口保持一致。

零依赖，纯标准库。

## 预期输出

```
== list：消息历史 ==
共 4 条消息，最近一次提问：请假怎么走流程？

== dict：知识库检索 ==
命中：请假需提前 1 天在 OA 提交，主管审批后生效。来源：考勤制度.md

== set：来源去重 ==
引用来源：['考勤制度.md']

== tuple：工具表 ==
可用工具 3 个
search_kb -> 在知识库里按关键词检索
unknown   -> 未注册的工具：unknown
```

## 代码对应文章的哪些点

| 结构 | 管什么 | 在 main.py 哪里 | 为什么用它 |
|---|---|---|---|
| `list` | 消息历史 | `build_history`、`last_user_question` | 有顺序、会追加 |
| `dict` | 知识库 / 单条消息 | `build_knowledge`、`search` | 按 key 取值快 |
| `tuple` | 工具表的 (名字, 说明) | `build_tools`、`find_tool` | 固定配对，不可变 |
| `set` | 引用来源去重 | `dedupe_sources` | 自动去重 |

## 动手改

- 往 `build_history` 末尾再追加一条 user 消息，看 `last_user_question` 取到的变没变。
- 给 `build_knowledge` 加一个「考勤」主题，再用一个含「考勤」的问题检索。
- `dedupe_sources` 里 `hits + hits` 是故意制造重复来源，去掉这个 `+ hits` 看输出还是不是一条。

## 可运行源码：Python 数据结构

下方代码就是在线沙盒实际执行的完整源码。可直接运行、查看输出或复制到本地，页面不再依赖文章外的重复脚本。

### `main.py`

```python
"""演示 AI 应用中常见 Python 数据结构的职责。"""

from __future__ import annotations


def main() -> None:
    """构造消息、知识、工具和引用，并打印各结构的使用结果。"""
    # list 保留有顺序且可重复的会话消息。
    messages = [{"role": "user", "content": "报销期限？"}, {"role": "assistant", "content": "30 天。"}]
    # dict 通过稳定键快速定位知识内容。
    knowledge = {"expense_deadline": "费用发生后 30 天内提交"}
    # tuple 表示不应被运行时修改的工具描述。
    tools = (("search_policy", "查询制度"), ("create_ticket", "创建工单"))
    # set 对重复引用来源自动去重。
    citations = {"employee-policy.md#报销", "employee-policy.md#报销", "travel-policy.md#住宿"}

    print(f"消息顺序: {[message['role'] for message in messages]}")
    print(f"按键取知识: {knowledge['expense_deadline']}")
    print(f"工具不可变配置: {tools}")
    print(f"引用去重后: {sorted(citations)}")


if __name__ == "__main__":
    main()
```
