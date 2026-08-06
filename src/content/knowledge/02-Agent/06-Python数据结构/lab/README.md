# 06 Python 数据结构 demo

用 list / dict / tuple / set 四种结构组织一个 AI 助手的内部数据：消息历史、知识库、工具表、引用来源。一种结构对应一个真实场景，让你看清「什么时候该用哪个」。

## 运行

```bash
python3 main.py
```

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
