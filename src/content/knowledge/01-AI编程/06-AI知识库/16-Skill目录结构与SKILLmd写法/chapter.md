# Skill 目录结构与 SKILL.md 写法

## 本篇你能学到

- Skill 目录结构（`SKILL.md` / `references/` / `shared-references/`）与 frontmatter 三字段（`name` / `description` / `allowed-tools`）的真实含义
- ⭐ `allowed-tools` 权限控制的设计逻辑——为什么要限制，限制带来什么收益
- `SKILL.md` 内联 vs `references/` 按需加载的取舍原则，以及触发词的设计技巧

---

## 一个 Skill 的物理结构

打开 `frontend-knowledge` 插件的 skills 目录，你会看到五个技能并排放着：

```text
skills/
├── wiki/
│   └── SKILL.md                  # 只有一个文件
├── wiki-query/
│   ├── SKILL.md
│   └── references/               # 按需读取的细节规范
│       ├── answer-output-format.md
│       ├── hot-cache.md
│       └── section-depth-control.md
├── wiki-ingest/
│   ├── SKILL.md
│   └── references/
│       ├── output-format.md
│       └── update-vs-create.md
├── wiki-save/
│   └── SKILL.md                  # 规范内联，不需要外挂
├── wiki-lint/
│   └── SKILL.md
├── areas-init/
│   ├── SKILL.md
│   └── references/
│       ├── directory-structure.md
│       ├── claude-md-template.md
│       └── ...
└── shared-references/            # 五个 Skill 共享的规范
    ├── common-constraints.md
    ├── frontmatter-rules.md
    ├── classification-rules.md
    └── ...
```

规律很清楚：**简单 Skill 只有一个 `SKILL.md`，复杂 Skill 用 `references/` 托管细节规范，多个 Skill 共用的内容提到 `shared-references/`。**

---

## SKILL.md 的 frontmatter

每个 `SKILL.md` 文件顶部都有一段 YAML frontmatter，三个字段，缺一不可。

以 `wiki-query` 为例，这是真实文件内容：

```yaml
---
name: wiki-query
description: "从前端知识库中查询并回答问题。按渐进式披露读取 hot.md → _index.md → 目标页面 → areas/，综合答案并内联引用来源。触发词：查一下、查询、解释一下、总结、在知识库里找、根据知识库、按知识库、按照知识库、依据知识库、遵循知识库、知识库查一下、知识库查下、知识库里查、知识库里找、去知识库找、从知识库查、到知识库查、知识库搜、查 wiki、按约定、按规范"
allowed-tools: Read Write Edit Glob Grep Bash
---
```

再看一个更简洁的，`wiki-save`：

```yaml
---
name: wiki-save
description: "会话沉淀技能。把当前对话中的结论、决策、经验整理成知识页，存到 wiki/ 或 areas/。一次只存一页，多个主题请分多次调用。触发词：保存这次讨论、save、整理结论、沉淀到知识库、把刚才的分析存下来、save this、keep this、沉淀这次会话、记录这个决策"
allowed-tools: Read Write Edit Glob Grep Bash
---
```

### name

就是 Skill 的 ID，对应插件配置里注册的名称。一般和目录名保持一致，没什么可纠结的。

### description

这是整个 frontmatter 里最关键的字段，决定两件事：

1. **AI 何时激活这个 Skill**——Claude Code 根据 description 判断当前场景是否匹配
2. **人类如何理解这个 Skill 的边界**——相当于一句话摘要

description 的结构通常分两层：
- 前半段是**职责描述**：这个 Skill 能做什么、不做什么
- 后半段是**触发词列表**：用"触发词："分隔，列出用户可能说的各种表达

触发词是精确匹配的依据。`wiki-query` 里列了 20 多个触发词，覆盖了"查一下""知识库里找""按约定""按规范"等语义相近的说法。用户说任何一个，AI 都能路由到正确的 Skill。

> 📌 触发词列表要考虑真实用户的口语习惯，不是写给机器看的关键词，是写给"用户可能真的这么说"的场景。

### allowed-tools ⭐

这个字段直接控制 Skill 在执行时**能调用哪些工具**。

五个技能全部配置的是：

```text
allowed-tools: Read Write Edit Glob Grep Bash
```

但这个列表是可以裁剪的。设计原则是：**只给 Skill 完成任务必须用到的工具**。

---

## ⭐ 深聊 allowed-tools 的权限控制逻辑

为什么要限制工具，直接给所有权限不行吗？

**可以，但你会踩坑。**

举个真实场景：假设你开发了一个 `code-review` Skill，它的职责是审查代码并给出建议。如果你没有限制工具，AI 在执行这个 Skill 时完全有可能：

- 顺手 `Write` 修改了你的源文件（它"帮你"改了）
- 调用 `Bash` 跑了一个 `npm install`（它"顺便"装了个包）
- 用 `WebFetch` 查询了外部 API（它"主动"查资料）

这些行为从 AI 的角度看都是"有帮助的"，但它违背了你对这个 Skill 的预期——**review Skill 就该只读不写**。

`allowed-tools` 带来的收益主要是两个：

**🔒 安全性：限制爆炸半径**

一个只有 `Read Glob Grep` 权限的 Skill，即使 prompt 写歪了、用户描述有歧义，AI 也物理上无法修改文件或执行命令。它顶多读错了几个文件，不会造成破坏性操作。

**🎯 可预测性：行为边界清晰**

当你告诉 AI "这个 Skill 只能用 Read、Glob、Grep"，AI 在执行时会严格约束自己的行为方式。它不会想着"要不要顺便写一下"，因为工具根本不可用。这让 Skill 的行为变得确定——**同样的输入，每次产出基本一致**。

来看几个权限设计的对照：

| Skill 类型 | 合理的 allowed-tools | 原因 |
|---|---|---|
| 只读查询（code-review、wiki-query） | `Read Glob Grep` | 不需要写，限制写权限防止误操作 |
| 文件生成（wiki-save、areas-init） | `Read Write Edit Glob Grep` | 需要创建和修改文件 |
| 执行任务（构建、测试、lint） | `Read Write Edit Glob Grep Bash` | 需要运行命令 |
| 纯分析（依赖分析、结构扫描） | `Read Glob Grep` | 读取分析即可，无需任何写操作 |

`wiki-lint` 是个好例子——它的职责是"巡检"，默认只读模式。但它配置了完整工具权限，因为用户可以说"帮我修"，此时 Skill 需要有写能力。这是根据业务需求做的权衡。

> ⚠️ 一个常见错误：给所有 Skill 都配同样的完整工具列表，省事但失去了权限控制的意义。每个 Skill 开发时应该认真想一下："它真的需要 Bash 吗？它真的需要 Write 吗？"

---

## SKILL.md 内联 vs references/ 按需加载

这是 Skill 开发里另一个容易踩的坑。

`SKILL.md` 的内容是**常驻上下文**——只要这个 Skill 被激活，文件全文都会加载到 AI 的上下文窗口里。这意味着：

- **SKILL.md 越臃肿，上下文消耗越多**
- **多余的内容会干扰 AI 的判断**，让它不知道哪些是核心指令

`references/` 里的文件是**按需读取**——AI 执行任务时，根据需要主动读对应文件。没触发到的场景，对应的规范文件根本不会被加载。

对照看 `wiki-query` 的设计：

`SKILL.md` 里只写了：
- 职责边界（3 条）
- 路径解析规则（环境变量映射）
- 规范引用表（告诉 AI 去哪里读规范）
- 渐进式检索流程（核心算法）

具体的"答案输出格式"放在 `references/answer-output-format.md`，"热门缓存算法"放在 `references/hot-cache.md`。只有在真正需要输出答案或更新缓存时，AI 才会读这些文件。

`shared-references/` 则是更进一步的抽象。`wiki-query`、`wiki-ingest`、`wiki-save`、`wiki-lint` 四个 Skill 都要遵守同一套 frontmatter 规范、分类规则、导航规则，把这些放到 `shared-references/` 里，每个 SKILL.md 只需要写一行引用路径即可：

```markdown
公共边界见 `../shared-references/common-constraints.md`。
```

不用每个 Skill 都把规范复制一遍，修改时也只改一处。

---

## ✅/❌ 对照：好的 SKILL.md vs 差的

| 维度 | ✅ 精简、职责清晰 | ❌ 臃肿、什么都内联 |
|---|---|---|
| **frontmatter description** | 一句话职责 + 触发词列表，总共 2-3 行 | 写了半页"使用说明"，把 readme 塞进去了 |
| **触发词** | 覆盖真实口语说法，20 个左右 | 只写了 2-3 个，或者写成了技术术语 |
| **allowed-tools** | 按需配置，只给必须用的工具 | 全部复制 `Read Write Edit Glob Grep Bash WebFetch`，没考虑过 |
| **正文长度** | 核心流程 + 职责边界 + 规范引用路径，500 字以内 | 把所有规范内容直接粘贴进来，3000 字起 |
| **细节规范** | 复杂逻辑放 `references/`，SKILL.md 只写引用路径 | 所有边界条件、格式要求全部内联，一屏滚不完 |
| **共用规范** | 抽到 `shared-references/`，各 Skill 引用路径 | 每个 Skill 都复制一份，内容逐渐漂移不一致 |

---

## 开发一个新 Skill 的检查清单

写完 SKILL.md 之后，对照这个清单快速自检：

- [ ] `name` 和目录名一致
- [ ] `description` 第一句话能说清"这个 Skill 做什么，不做什么"
- [ ] 触发词覆盖了用户真实可能说的口语表达
- [ ] `allowed-tools` 只包含这个 Skill 真正需要的工具
- [ ] SKILL.md 正文没有把细节规范直接粘贴进来
- [ ] 复杂规范已经拆到 `references/` 或 `shared-references/`
- [ ] SKILL.md 里有明确的规范引用路径，AI 知道去哪里读

---

## 小结

SKILL.md 的 frontmatter 看起来只有三个字段，但每个字段都有设计意图。`name` 是 ID，`description` 决定激活时机，`allowed-tools` 控制行为边界。其中 `allowed-tools` 最值得认真对待——它不只是个配置项，是让 Skill 安全、可预测的物理保障。

SKILL.md 本身要保持精简，核心流程和边界写清楚就够了，细节规范用 `references/` 按需加载，多个 Skill 共用的内容提到 `shared-references/`。这套三层结构（`SKILL.md` → `references/` → `shared-references/`）是 frontend-knowledge 插件五个技能能保持低耦合、独立演进的基础。

开发 Skill 不是在写 API 文档，是在给 AI 设计一个有边界、有焦点的执行环境。
