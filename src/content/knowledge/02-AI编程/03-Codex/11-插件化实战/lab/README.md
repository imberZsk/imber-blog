# 10 plugin workflow demo

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

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“10 plugin workflow demo”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
