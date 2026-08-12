# Superpowers（2）- Brainstorming 与 Writing Plans：把模糊需求变成可执行计划

`brainstorming` 负责决定“做什么”，`writing-plans`
负责决定“怎样一步步做”。两者不能合并：过早写计划会把未经确认的假设固化成任务。

# 一、Brainstorming 的产物

一次有效澄清至少要确定：目标用户、核心场景、明确不做什么、关键交互或数据流、异常场景以及可验证的验收标准。方案存在明显取舍时，先给 2～3 个选项，再说明推荐理由。

```text
目标：博客文章支持收藏。
请先不要写代码，逐项确认：收藏是否登录、数据存哪里、列表如何筛选、离线状态怎样处理。
最后输出推荐方案、不做事项和 5 条可观察的验收标准。
```

# 二、Writing Plans 的粒度

计划里的每一步应在几分钟内完成，并写出准确文件、改动、验证方式和预期结果。下面这样的任务才可执行：

```text
任务 1：新增收藏状态模型
- 文件：src/lib/favorites.ts
- 行为：解析本地存储，无效数据回退为空集合
- 验证：运行 favorites 单测，先看到无效 JSON 用例失败，再实现到通过
```

“完成收藏功能”不是计划，因为它没有文件边界，也没有独立验收点。

# 三、两个检查点

1. 方案没确认，不进入实现计划。
2. 计划没有验证命令，不进入编码。

# 四、官方资料

- [brainstorming](https://github.com/obra/superpowers/tree/main/skills/brainstorming)
- [writing-plans](https://github.com/obra/superpowers/tree/main/skills/writing-plans)

# 五、总结

- **Brainstorming 的产物**：一次有效澄清至少要确定：目标用户、核心场景、明确不做什么、关键交互或数据流、异常场景以及可验证的验收标准。
- **Writing Plans 的粒度**：计划里的每一步应在几分钟内完成，并写出准确文件、改动、验证方式和预期结果。

## 参考资料

- [Git Worktree](https://git-scm.com/docs/git-worktree)
- [pytest 文档](https://docs.pytest.org/en/stable/)
