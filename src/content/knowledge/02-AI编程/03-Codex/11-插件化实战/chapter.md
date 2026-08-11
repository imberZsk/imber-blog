# Codex（10）- 插件化实战

> 读完你能：围绕“插件化实战”理解“概念解释”与“插件设计原则”，并结合正文示例完成实践与排障。

当 Skill、Subagent、脚本、配置开始变多，就需要更高层的组织方式：插件。

插件可以把一组能力打包起来，例如：

- 一组 Skill。
- 一组 Subagent。
- 一些脚本或资源。
- 插件清单。
- marketplace 索引。

你当前的 `imber-plugins` 就是一个 Codex 插件市场的例子。它把 review、dev、feishu、docs、git 等能力拆成插件，再通过 marketplace 管理。

# 一、概念解释

一个简化插件结构：

```text
plugins/
└── docs/
    ├── .Codex-plugin/
    │   └── plugin.json
    ├── skills/
    │   └── md-polish/
    │       └── SKILL.md
    └── agents/
        └── markdown-reviewer.md
```

marketplace 索引：

```text
.Codex-plugin/
└── marketplace.json
```

核心文件职责：

| 文件 | 作用 |
| --- | --- |
| `marketplace.json` | 注册有哪些插件 |
| `plugin.json` | 描述单个插件 |
| `SKILL.md` | 面向用户的工作流入口 |
| `agents/*.md` | 面向内部编排的专用代理 |
| `scripts/` | 可执行辅助脚本 |
| `references/` | 参考资料 |

# 二、插件设计原则

## 2.1 Skill 面向用户，Agent 面向编排

用户应该调用 Skill，而不是直接理解一堆 agent。

比如 review 插件：

- `/review-all` 是用户入口。
- bug/security/test/maintainability agent 是内部执行单元。

## 2.2 Agent 单一职责

一个 agent 只负责一个维度。这样输出更稳定，也方便组合。

## 2.3 marketplace 只做索引

marketplace 不应该塞业务逻辑，只登记插件名称、来源、描述等元数据。

# 三、使用示例

新增一个 `notes` 插件的思路：

```text
1. 在 plugins/notes/.Codex-plugin/plugin.json 写插件信息。
2. 在 plugins/notes/skills/md-polish/SKILL.md 写用户入口。
3. 如有需要，在 plugins/notes/agents/ 里写专用 agent。
4. 在 .Codex-plugin/marketplace.json 注册 notes。
5. 用一个真实 Markdown 文件跑一遍验证。
```

plugin.json 示例：

```json
{
  "name": "notes",
  "description": "学习笔记整理、润色和目录维护插件。",
  "version": "0.1.0"
}
```

marketplace 条目示例：

```json
{
  "name": "notes",
  "source": "plugins/notes",
  "description": "学习笔记整理、润色和目录维护。"
}
```

# 四、常见错误

## 4.1 错误 1：新增插件忘记注册 marketplace

插件目录建好了，但市场索引没登记，后续就找不到。

## 4.2 错误 2：Skill 和 Agent 边界混乱

如果用户必须知道调用哪个 agent，说明插件抽象还不够清晰。Skill 应该承担编排入口。

## 4.3 错误 3：插件名和能力不匹配

`utils`、`tools` 这类名字太泛。插件名最好能表达领域：

- `review`
- `docs`
- `git`
- `feishu`
- `dev`

# 五、最佳实践

- 先从一个 Skill 开始，不急着设计完整插件。
- 当 Skill 数量变多或需要共享 agent，再抽成插件。
- 每个插件都有清楚的 README 或说明。
- 修改插件后，用真实任务跑一遍。
- 新增插件必须同步更新 marketplace。

# 六、本章小结

插件化不是为了显得高级，而是为了让能力可安装、可组合、可维护。先把一个重复工作流做成 Skill，再把相关 Skill 和 Agent 收拢成插件，是最自然的演进路径。

# 七、总结

- **插件设计原则**：用户应该调用 Skill，而不是直接理解一堆 agent。
- **使用示例**：新增一个 notes 插件的思路：
- **常见错误**：插件目录建好了，但市场索引没登记，后续就找不到。
- **最佳实践**：先从一个 Skill 开始，不急着设计完整插件。

<!-- knowledge-lab-merged -->

# 动手实践：10 plugin workflow

这个 demo 是一个迷你 Codex 插件市场结构，用来理解 plugin、skill、agent、marketplace 的关系。

## 目录内容

```text
.Codex-plugin/marketplace.json
plugins/notes/.Codex-plugin/plugin.json
plugins/notes/skills/md-polish/SKILL.md
plugins/notes/agents/markdown-structure-reviewer.md
```

## 使用方式

让 Codex 审查插件结构：

```bash
codex exec --sandbox read-only --ask-for-approval never "请检查这个插件 demo 的结构是否合理，并说明 marketplace、plugin、skill、agent 的职责"
```

也可以让 Codex 基于这个结构新增一个 skill：

```bash
codex "请在 notes 插件里新增一个 md-outline skill，用于根据 Markdown 文件生成目录摘要，并同步更新必要说明"
```

## 练习目标

- 理解插件市场的索引关系。
- 理解 Skill 面向用户、Agent 面向内部编排。
- 练习新增插件能力时同步更新元数据。
