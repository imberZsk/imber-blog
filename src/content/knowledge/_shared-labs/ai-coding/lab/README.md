# AI 编程在线实验套件

这套零依赖浏览器实验为 AI 编程路线提供 13 个可观察场景。每篇文章只激活与正文对应的场景，读者可以修改参数、注入故障并重新运行。

## 覆盖内容

- AC-01：Prompt 结构与回归对比
- AC-02：上下文预算与指令优先级
- AC-03：权限、Plan Mode 与 Diff 审批
- AC-04：Agent Harness 核心循环
- AC-05：工具 Schema 与路径安全
- AC-06：Subagent DAG 与并发预算
- AC-07：Skill 触发与渐进式披露
- AC-08：TDD 与系统化调试
- AC-09：Git Worktree 并行冲突
- AC-10：Checkpoint、回溯与上下文压缩
- AC-11：Hooks 与 CI 质量门禁
- AC-12：MCP 工具发现与权限检查
- AC-13：Prompt 与 Agent 回归评测矩阵

## 运行边界

实验在 `sandbox="allow-scripts"` 的 iframe 中运行，只计算仓库内置的确定性样例，不读取本机文件、不执行 Shell、不联网，也不模拟拥有真实写权限。涉及删除、工具调用和多代理修改的结果均为机制模拟，并在界面中明确展示允许或拒绝的原因。
