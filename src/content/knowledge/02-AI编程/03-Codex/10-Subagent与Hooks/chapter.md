# Codex（9）- Subagent 与 Hooks

> 读完你能：围绕“Subagent 与 Hooks”理解“概念解释”与“1 Subagent 是什么”，并结合正文示例完成实践与排障。

当任务变复杂后，你会遇到两个问题：

- 一个 Codex 同时负责太多视角，容易混乱。
- 有些底线检查，你希望每次都自动执行。

Subagent 和 Hooks 分别解决这两个问题。

- Subagent：把复杂任务拆给专门角色。
- Hooks：在特定时机自动执行检查或流程。

# 一、概念解释

## 1.1 Subagent 是什么

Subagent 可以理解成“专门的临时同事”。比如代码审查时，你可以拆成：

- 安全审查 agent。
- 性能审查 agent。
- 测试覆盖 agent。
- 可维护性 agent。

每个 agent 只看自己的维度，最后由主流程汇总。

这比让一个人同时记住所有检查项更稳。

## 1.2 Hooks 是什么

Hooks 是生命周期钩子。它可以在 Codex 执行某些动作前后触发脚本或检查。

常见用途：

- 阻止危险命令。
- 在编辑后自动格式化。
- 在提交前运行检查。
- 记录关键操作。

从前端视角看，Hook 像构建工具里的插件钩子：不是业务逻辑本身，但能在流程关键点介入。

# 二、使用示例

## 2.1 Subagent 示例

假设你要审查一个前端 PR，可以设计 3 个 agent：

```text
frontend-bug-reviewer：只找功能 bug 和边界条件
frontend-test-reviewer：只看测试是否覆盖关键行为
frontend-maintainability-reviewer：只看结构、命名、重复和可读性
```

主流程：

```text
请并行调用三个审查 agent，分别从 bug、测试、可维护性角度审查当前 diff。
最后合并为一个按严重程度排序的审查报告。
```

## 2.2 Hook 示例

一个思路上的 pre-command hook：

```bash
#!/usr/bin/env bash
set -euo pipefail

command_text="$1"

if echo "$command_text" | grep -E "rm -rf /|git reset --hard|DROP DATABASE"; then
  echo "Blocked dangerous command: $command_text"
  exit 1
fi
```

真实 Hook 的配置方式要以当前 Codex 版本支持为准，但核心思想是一样的：把底线规则做成自动检查。

# 三、什么时候用 Subagent

适合：

- 多维度审查。
- 大型迁移规划。
- 前后端分别分析。
- 安全、性能、测试需要不同视角。
- 信息太多，需要上下文隔离。

不适合：

- 简单单文件修改。
- 一句话就能完成的小任务。
- 强依赖同一份连续推理的任务。

# 四、什么时候用 Hooks

适合：

- 团队安全红线。
- 格式化和静态检查。
- 审计日志。
- 禁止某类命令。
- 自动注入环境检查。

不适合：

- 复杂业务判断。
- 需要大量上下文理解的任务。
- 经常变化的临时规则。

# 五、常见错误

## 5.1 错误 1：Subagent 角色重叠

如果两个 agent 都叫“综合审查”，它们会重复工作。角色要单一。

## 5.2 错误 2：Hook 做太多事

Hook 应该快、明确、可靠。不要在 Hook 里跑一个很慢的大型流程，影响每次操作。

## 5.3 错误 3：把 Hook 当成唯一安全措施

Hook 是防线之一，不是全部。权限、沙盒、审批、代码 review 仍然重要。

# 六、最佳实践

- Subagent 的职责要窄。
- 主流程负责分发任务和汇总结果。
- Hook 优先做机械检查，不做复杂判断。
- 高风险 Hook 先在个人环境试用，再推广到团队。
- 把 Hook 失败信息写得清楚，让人知道怎么修。

# 七、本章小结

Subagent 让复杂任务分工更清楚，Hooks 让底线检查更稳定。前者提升思考质量，后者提升流程可靠性。

# 八、总结

- **概念解释**：Subagent 可以理解成“专门的临时同事”。
- **使用示例**：假设你要审查一个前端 PR，可以设计 3 个 agent：
- **常见错误**：如果两个 agent 都叫“综合审查”，它们会重复工作。
- **最佳实践**：Hook 优先做机械检查，不做复杂判断。

<!-- knowledge-lab-merged -->

# 动手实践：09 subagents and hooks

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
