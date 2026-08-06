# Demo 10 · 自定义 Slash 命令（可直接复制使用）

本 Demo 提供两个**开箱即用**的自定义命令文件。把 `.claude/commands/` 整个复制到你的项目里，就能用 `/review` 和 `/fix-issue`。

## 文件结构
```
.claude/commands/
├── review.md       # /review     一键代码审查
└── fix-issue.md    # /fix-issue  按 issue 号定位并给修复方案（带参数）
```

## 怎么用
1. 把本目录的 `.claude/` 复制到你的项目根：
   ```bash
   cp -r .claude /你的项目/
   ```
2. 在该项目启动 `claude`，输入 `/` 能看到 `/review`、`/fix-issue`。
3. 试用：
   ```
   /review
   /fix-issue 123
   ```
   `/fix-issue 123` 会把 `123` 填入命令里的 $ARGUMENTS。

## 区分项目级 / 用户级
- 团队共享 → 放项目 `.claude/commands/`（随 git 提交）
- 个人习惯 → 放 `~/.claude/commands/`（所有项目可用）
