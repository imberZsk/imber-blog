# Codex（05） - CLI 与非交互任务

> 读完后，你应能解释“2.1 交互式任务”，复现“2.2 非交互任务”的最小实现，并用“2.3 把结果写入文件”检查结果与失败边界。

Codex 不只能在交互界面里使用，也可以通过 CLI 执行任务。CLI 适合两类场景：

- 你正在终端里工作，希望快速把当前目录交给 Codex。
- 你想把 Codex 放进脚本或自动化流程里，执行一次性任务。

这一章重点看 `codex` 和 `codex exec`。

# 一、概念解释

常见命令结构：

```bash
codex [OPTIONS] [PROMPT]
codex exec [OPTIONS] [PROMPT]
```

可以粗略理解为：

- `codex`：启动交互式会话，适合边聊边改。
- `codex exec`：非交互执行任务，适合脚本、批处理、CI 辅助。

常用参数：

| 参数 | 作用 |
| --- | --- |
| `-C, --cd <DIR>` | 指定工作目录 |
| `-m, --model <MODEL>` | 指定模型 |
| `-s, --sandbox <MODE>` | 指定沙盒模式 |
| `-a, --ask-for-approval <POLICY>` | 指定审批策略 |
| `--json` | 以 JSONL 输出事件 |
| `-o, --output-last-message <FILE>` | 把最后回复写入文件 |
| `--output-schema <FILE>` | 要求最终输出符合 JSON Schema |

# 二、使用示例

## 2.1 交互式任务

```bash
codex -C /path/to/project "请阅读这个项目并总结目录结构"
```

这会进入一个可以继续追问的会话。

## 2.2 非交互任务

```bash
codex exec -C /path/to/project "请检查 README 是否和 package.json 的脚本一致，不要修改文件"
```

这更像一次命令调用：给任务，等结果。

## 2.3 把结果写入文件

```bash
codex exec \
  -C /path/to/project \
  -o codex-summary.md \
  "请总结这个项目的启动方式和测试方式，不要修改文件"
```

适合生成固定产物，比如审查报告、迁移清单、目录说明。

## 2.4 从 stdin 传入长提示词

```bash
codex exec -C /path/to/project - < prompt.txt
```

当提示词很长时，用文件维护更舒服。

# 三、适合 CLI 的任务

- 批量生成文档草稿。
- 对多个仓库做相同检查。
- 在 CI 里生成代码审查摘要。
- 让 Codex 按 JSON Schema 输出结构化结果。
- 用 `codex review` 对当前改动做非交互审查。

# 四、常见错误

## 4.1 错误 1：在错误目录运行

Codex 会根据工作目录找上下文。目录错了，它读到的就是错项目。

建议显式使用：

```bash
codex exec -C "$(pwd)" "..."
```

## 4.2 错误 2：非交互任务还写得很含糊

非交互模式下，你没有那么多机会及时纠偏，所以提示词要更明确：

```text
只检查，不修改。输出按“发现 / 风险 / 建议命令”三段组织。
```

## 4.3 错误 3：把高风险写操作放进自动化

比如自动修改数据库迁移、自动提交、自动发布。除非你已经有严格沙盒、审批和回滚机制，否则不要这么做。

# 五、最佳实践

- CLI 任务默认先从只读检查开始。
- 需要结构化产物时，用 `--output-schema`。
- 需要被脚本消费时，用 `--json` 或 `-o`。
- 自动化里优先使用保守沙盒和 `never` 审批策略，让失败暴露出来，而不是让它偷偷越权。
- 把常用长提示词放进 `prompts/` 目录维护。

# 六、本章小结

交互式 Codex 适合探索和协作，`codex exec` 适合可重复的一次性任务。把提示词文件化、输出结构化，是 CLI 用得稳的关键。

# 七、总结

- **概念解释**：codex：启动交互式会话，适合边聊边改。
- **使用示例**：这会进入一个可以继续追问的会话。
- **适合 CLI 的任务**：让 Codex 按 JSON Schema 输出结构化结果。
- **常见错误**：Codex 会根据工作目录找上下文。

<!-- knowledge-lab-merged -->

# 动手实践：04 CLI exec

这个 demo 展示如何用 `codex exec` 做一次性非交互任务。

## 目录内容

- `prompt.txt`：长提示词。
- `project-notes.md`：待分析文件。
- `summary.schema.json`：结构化输出 schema 示例。

## 使用方式

只读分析：

```bash
codex exec --sandbox read-only --ask-for-approval never - < prompt.txt
```

把最后回复写入文件：

```bash
codex exec --sandbox read-only --ask-for-approval never -o codex-summary.md - < prompt.txt
```

要求结构化输出：

```bash
codex exec --sandbox read-only --ask-for-approval never --output-schema summary.schema.json - < prompt.txt
```

## 练习目标

- 学会用文件维护长提示词。
- 学会把 Codex 输出保存成产物。
- 了解结构化输出适合自动化场景。

<!-- knowledge-practice-materials-merged -->

## 配套实践材料

以下材料已并入正文，便于阅读时直接对照和练习。

### `project-notes.md`

````markdown
# 项目笔记

这是一个个人知识库整理项目。

当前已有：

- Markdown 学习笔记。
- 每个主题一个学习路线文件。
- 部分 demo 代码。

当前问题：

- 有些主题缺索引。
- 有些 demo 没有 README。
- 学习路线里的进度状态不一致。

希望 Codex 帮助：

- 统一目录结构。
- 补齐 README。
- 根据笔记内容生成复习清单。
````

## 参考资料

- [OpenAI Codex 文档](https://developers.openai.com/codex/)
- [AGENTS.md 规范](https://agents.md/)
