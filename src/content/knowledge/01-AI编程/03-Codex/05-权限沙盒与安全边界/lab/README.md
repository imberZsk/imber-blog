# 05 sandbox and approval demo

这个 demo 用来练习不同权限组合下该如何给 Codex 任务。

## 目录内容

- `safe-review-prompt.md`：只读审查任务。
- `write-task-prompt.md`：允许修改工作区的任务。
- `notes.md`：示例文件。

## 使用方式

只读审查：

```bash
codex exec --sandbox read-only --ask-for-approval never - < safe-review-prompt.md
```

允许修改当前工作区：

```bash
codex --sandbox workspace-write --ask-for-approval on-request - < write-task-prompt.md
```

## 练习目标

- 理解只读任务和写任务的区别。
- 给高风险操作设置明确边界。
- 学会在提示词里写禁止事项。
