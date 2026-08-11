# 04 CLI exec demo

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

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“04 CLI exec demo”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
