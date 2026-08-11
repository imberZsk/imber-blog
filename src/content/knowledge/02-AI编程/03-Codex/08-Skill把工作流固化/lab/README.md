# 08 skill demo

这个 demo 是一个最小 Skill 示例，用来整理 Markdown 学习笔记。

## 目录内容

- `skills/md-polish/SKILL.md`：Skill 定义。
- `sample-note.md`：待优化笔记。

## 使用方式

你可以让 Codex 直接参考这个 Skill：

```bash
codex "请阅读 skills/md-polish/SKILL.md，然后按它的规则优化 sample-note.md"
```

如果只想看方案：

```bash
codex exec --sandbox read-only --ask-for-approval never "请阅读 skills/md-polish/SKILL.md 和 sample-note.md，只输出优化方案，不修改文件"
```

## 练习目标

- 理解 Skill 的 description 要写清触发场景。
- 理解 Skill 应该封装稳定工作流，而不是临时需求。
