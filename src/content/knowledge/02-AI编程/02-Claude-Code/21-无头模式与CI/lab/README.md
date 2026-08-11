# Demo 20 · 无头自动化（可直接用）

## 文件
- `summarize-diff.sh`：用 claude -p 在脚本里生成 diff 摘要（演示无头调用）。
- `.github/workflows/claude-review.yml`：PR 自动审查工作流（复制到你仓库即可）。

## 怎么用
- 脚本：在 git 仓库里 `bash summarize-diff.sh`（需已装并登录 claude）。
- Action：把 .github/workflows/claude-review.yml 复制到你的仓库，并在仓库 Secrets 配 ANTHROPIC_API_KEY。

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“Demo 20 · 无头自动化（可直接用）”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
