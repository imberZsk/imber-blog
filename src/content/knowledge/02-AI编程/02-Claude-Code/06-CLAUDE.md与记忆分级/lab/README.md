# Demo 05 · CLAUDE.md 模板与记忆分级

本 Demo 给你一份**可直接抄改**的 `CLAUDE.md` 模板，以及一个用 `@` 导入拆分规则的示例结构。

## 文件说明

- `CLAUDE.md.example`：项目根级模板，复制成 `CLAUDE.md` 改改就能用。
- `rules/`：拆分的规则文件，演示用 `@` 导入复用。
  - `code-style.md`、`testing.md`

## 怎么用

1. 把 `CLAUDE.md.example` 复制为你项目根的 `CLAUDE.md`，按注释改成你项目的实际情况。
2. 体会「可检查、可执行」的写法：对照里面每条规则，问自己「这条能验证对错吗」。
3. 进阶：把规则拆进 `rules/`，在 `CLAUDE.md` 里用 `@rules/xxx.md` 导入。

## 也可以让 Claude 帮你生成

```
读一遍这个项目，帮我起草一份 CLAUDE.md，规则要可检查、可执行。
```

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“Demo 05 · CLAUDE.md 模板与记忆分级”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
