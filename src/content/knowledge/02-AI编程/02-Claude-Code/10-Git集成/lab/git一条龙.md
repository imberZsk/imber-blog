# Git 一条龙：从改完到 PR

> 在真实 git 项目里照着发给 Claude Code。

1. 帮我看一下 git diff，确认这次改动没有遗漏或多余的调试代码。
2. 基于 main 开一个分支 feature/xxx。
3. 把改动提交，commit message 按 Conventional Commits 规范写。
4. 推到远程并创建 PR，标题简洁，描述里写清：改了什么、怎么测的、注意事项。

## 小技巧
- 提交前一定先看 diff，别直接「提交所有改动」。
- 嫌它生成的 PR 描述单薄？追一句：「在描述里补充这次安全相关改动的背景」。
