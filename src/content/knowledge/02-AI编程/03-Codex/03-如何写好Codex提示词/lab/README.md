# 02 prompt workflow demo

这个 demo 帮你练习“同一个需求，不同提示词会得到完全不同的结果”。

## 目录内容

- `bad-prompt.md`：模糊提示词。
- `good-prompt.md`：结构化提示词。
- `login-form.tsx`：示例代码。

## 使用方式

先试坏提示词：

```bash
codex exec --sandbox read-only --ask-for-approval never - < bad-prompt.md
```

再试好提示词：

```bash
codex exec --sandbox read-only --ask-for-approval never - < good-prompt.md
```

对比两次输出，观察结构化提示词带来的差异。

## 练习目标

- 体会目标、范围、约束、验收对结果的影响。
- 学会在提示词里明确“不要修改文件”或“可以修改文件”。

## 可视化规格

> VISUAL_STRATEGY：思维导图（Mindmap）
> DIAGRAM_DESCRIPTION：中心节点为“02 prompt workflow demo”，一级分支使用本文主要章节，至少覆盖核心概念、适用场景、实现要点、选型取舍和常见误区。
