# 03 context and AGENTS demo

这个 demo 展示如何用 AGENTS.md 给 Codex 提供长期上下文。

## 目录内容

- `AGENTS.md`：项目规则。
- `src/api/orders.ts`：示例业务文件。
- `task.md`：一次性任务。

## 使用方式

在本目录运行：

```bash
codex "请阅读 AGENTS.md 和 task.md，然后给出修改方案。先不要改文件"
```

你也可以让 Codex 直接执行：

```bash
codex "请按 task.md 修改代码，并遵守 AGENTS.md"
```

## 练习目标

- 区分长期规则和临时需求。
- 观察 Codex 如何引用 AGENTS.md 里的项目约定。
