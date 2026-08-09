# 09 subagents and hooks demo

这个 demo 展示如何把复杂审查拆给多个 agent，以及如何用脚本表达 Hook 的底线检查。

## 目录内容

- `agents/frontend-bug-reviewer.md`：功能 bug 审查 agent。
- `agents/frontend-test-reviewer.md`：测试审查 agent。
- `agents/frontend-maintainability-reviewer.md`：可维护性审查 agent。
- `hooks/block-dangerous-command.sh`：危险命令检查脚本。
- `review-prompt.md`：主流程提示词。

## 使用方式

审查 agent 设计：

```bash
codex exec --sandbox read-only --ask-for-approval never - < review-prompt.md
```

测试 hook 脚本：

```bash
bash hooks/block-dangerous-command.sh "git status"
bash hooks/block-dangerous-command.sh "git reset --hard"
```

第二条应该被阻止。

## 练习目标

- 学会把复杂任务拆成单一职责 agent。
- 学会让 Hook 做机械、快速、明确的检查。
