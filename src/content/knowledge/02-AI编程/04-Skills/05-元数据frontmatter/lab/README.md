# 04 章 Demo · frontmatter 好坏对照

这个 Demo 给你两份 `SKILL.md`：一份 frontmatter 写得规范，一份满是新手常犯的错。对照着看，你就记住了。

## 文件

```
05-元数据frontmatter-demo/
├── README.md
├── good-SKILL.md        # ✅ 规范的 frontmatter
└── bad-SKILL.md         # ❌ 故意写错，找找有几处问题
```

## 玩法

1. 先**不看答案**，打开 `bad-SKILL.md`，自己找出里面的格式错误（至少有 4 处）。
2. 再对照 `good-SKILL.md`，看自己找全了没。
3. 答案和讲解在本文件最下方。

## bad-SKILL.md 的 4 个坑（看完再展开核对）

<details>
<summary>点开看答案</summary>

1. **`name` 用了大写和空格**：`Code Review` → 应为 `code-review`。
2. **`description` 后缺空格**：`description:当用户……` → 冒号后要有空格。
3. **值里的中文冒号没加引号**：`代码审查：查找bug` 里的 `：` 可能让 YAML 解析异常 → 用双引号包住。
4. **结尾 `---` 写成了两个横线** `--` → 必须是恰好三个横线，否则 frontmatter 不闭合，整个技能加载失败。

</details>

## 你会收获什么

- 一眼认出 frontmatter 的常见格式错误。
- 养成「改完 frontmatter 就检查 `---` 成对、冒号带空格」的肌肉记忆。

## 可视化规格

> VISUAL_STRATEGY：思维导图（Mindmap）
> DIAGRAM_DESCRIPTION：中心节点为“04 章 Demo · frontmatter 好坏对照”，一级分支使用本文主要章节，至少覆盖核心概念、适用场景、实现要点、选型取舍和常见误区。
