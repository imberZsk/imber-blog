# Codex（09） - Skill 把工作流固化

> 读完后，你应能解释“Workflow”，复现“使用场景”的最小实现，并用“工作流”检查结果与失败边界。

当你发现自己总是在复制同一段提示词，就该考虑写 Skill 了。

Skill 是一套可复用的任务说明和配套资源。它可以告诉 Codex：遇到某类任务时，按什么步骤做、读哪些参考文件、运行哪些脚本、输出什么格式。

从前端视角看，Skill 像一个封装好的组件：以前你每次手写一大段 JSX，现在只需要调用组件并传入少量参数。

# 一、概念解释

一个 Skill 通常有：

```text
skill-name/
└── SKILL.md
```

`SKILL.md` 里包含：

- YAML frontmatter：名称、描述。
- 工作流说明：什么时候使用、按什么步骤执行。
- 输出格式：结果应该怎么组织。
- 参考文件或脚本：需要时再读取。

示例：

```md
---
name: "pr-review"
description: "用于审查 Pull Request 的风险、测试和可维护性。"
---

# PR Review Skill

当用户要求审查代码、PR 或 diff 时使用。

## Workflow

1. 先读取 git diff。
2. 优先找 bug、边界条件、缺失测试。
3. 输出按严重程度排序的问题。
4. 如果没有问题，明确说明没有发现高风险问题。
```

# 二、什么时候该写 Skill

适合写 Skill 的情况：

- 你重复做同一类任务。
- 任务有固定步骤。
- 任务需要特定输出格式。
- 任务背后有一组参考文档或脚本。
- 你希望以后少解释。

不适合写 Skill 的情况：

- 只做一次的临时需求。
- 规则还没稳定。
- 其实一句提示词就够。

# 三、使用示例

假设你经常让 Codex 优化 Markdown 笔记，可以写一个 `md-polish` Skill：

```md
---
name: "md-polish"
description: "优化 Markdown 学习笔记，让结构更清晰、表达更通俗。"
---

# Markdown Polish

## 使用场景

当用户要求优化、润色、整理学习笔记时使用。

## 工作流

1. 保留原始观点，不改变事实含义。
2. 优化标题层级。
3. 拆掉过长段落。
4. 增加必要示例。
5. 输出修改摘要。

## 风格

- 中文表达。
- 像教朋友一样。
- 少用抽象术语。
```

之后你只要说“用 md-polish 优化这篇笔记”，Codex 就知道你的偏好。

# 四、常见错误

## 4.1 错误 1：description 写得太泛

```yaml
description: "帮助用户完成任务。"
```

这等于没写。description 应该说清触发场景：

```yaml
description: "当用户要求优化 Markdown 学习笔记、调整目录结构、补充示例时使用。"
```

## 4.2 错误 2：把所有规则塞进一个 Skill

Skill 应该围绕一个任务类型。不要写一个“万能开发 Skill”，里面同时包含 review、测试、发消息、写文档、发版。

## 4.3 错误 3：没有维护示例和脚本

如果 Skill 依赖脚本，要确保脚本可运行；如果依赖参考文档，要保持路径有效。

# 五、最佳实践

- 一个 Skill 只解决一类任务。
- description 写清“什么时候使用”。
- 工作流步骤控制在 5-8 步。
- 大段参考内容放到 references 目录，按需读取。
- 能脚本化的重复操作放 scripts 目录。

# 六、本章小结

Skill 是把经验从“聊天记录”沉淀成“可复用工作流”的方式。它不需要一开始就复杂，先把你最常复制的一段提示词变成 SKILL.md 就很好。

# 七、总结

- **概念解释**：YAML frontmatter：名称、描述。
- **使用示例**：假设你经常让 Codex 优化 Markdown 笔记，可以写一个 md-polish Skill：
- **常见错误**：这等于没写。
- **最佳实践**：一个 Skill 只解决一类任务。

<!-- knowledge-lab-merged -->

# 动手实践：08 skill

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

<!-- knowledge-practice-materials-merged -->

## 配套实践材料

以下材料已并入正文，便于阅读时直接对照和练习。

### `sample-note.md`

````markdown
# prompt

提示词就是和 AI 说话，但是不能乱说。要给目标，也要给背景，还要说清楚不要做什么。很多时候 AI 做错不是它不会，而是我们没有说清楚。写提示词的时候要像写需求一样。
````

### `skills/md-polish/SKILL.md`

````markdown
---
name: "md-polish"
description: "当用户要求优化、润色、整理 Markdown 学习笔记，并希望保持中文、通俗、示例驱动风格时使用。"
---

# Markdown Polish Skill

## 使用场景

当用户要求优化学习笔记、整理目录、补充示例、让内容更适合初学者阅读时使用。

## 工作流

1. 先判断原文主题和目标读者。
2. 保留原始事实和观点，不擅自新增外部事实。
3. 调整标题层级，让结构更清楚。
4. 拆分过长段落。
5. 给抽象概念补一个小例子。
6. 最后输出修改摘要。

## 风格

- 使用中文。
- 像教朋友一样。
- 少用术语，必要术语要解释。
- 不写空泛鸡汤。

## 验收

- 标题层级清晰。
- 每节有明确重点。
- 读者能知道下一步怎么做。
````

## 参考资料

- [OpenAI Codex 文档](https://developers.openai.com/codex/)
- [AGENTS.md 规范](https://agents.md/)
