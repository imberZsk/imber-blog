# 01 hello Codex demo

这个 demo 用来练习“给 Codex 一个清晰小任务”。

## 目录内容

- `sample-task.md`：一份可以直接复制给 Codex 的任务。
- `buggy-counter.js`：一个带小 bug 的示例文件。

## 使用方式

在本目录运行：

```bash
codex "请阅读 sample-task.md，并按里面的要求处理 buggy-counter.js"
```

如果只想让 Codex 解释，不修改：

```bash
codex exec --sandbox read-only --ask-for-approval never "请解释 buggy-counter.js 的问题，不要修改文件"
```

## 练习目标

你要观察 Codex 是否能：

- 读懂任务目标。
- 找到 bug。
- 给出最小修改。
- 说明如何验证。

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“01 hello Codex demo”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
