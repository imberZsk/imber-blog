# Skills（3）- 拆解一个 Skill 的目录结构

> 本章目标：看懂一个「完整」Skill 文件夹里每个文件/子目录的作用，理解 `SKILL.md` 为什么是「入口」。学完你会拿到一张目录结构对照图。

# 一、从「最小」到「完整」

第 02 章我们的技能只有一个文件：

```
polish-text/
└── SKILL.md          # 最小技能：只有这一个就能跑
```

但真实项目里的技能往往更丰富。一个「完整形态」的技能大概长这样：

```
pdf-report/                  # 技能文件夹，名字即技能名
├── SKILL.md                 # 【必须】入口说明书
├── reference/               # 【可选】参考资料，按需查阅
│   ├── api.md               #   详细 API 说明
│   └── style-guide.md       #   排版规范
├── templates/               # 【可选】模板文件，供复制套用
│   └── report.md            #   报告模板
├── scripts/                 # 【可选】可执行脚本，干确定性的活
│   └── generate.py          #   生成 PDF 的脚本
└── assets/                  # 【可选】静态资源（图片、字体等）
    └── logo.png
```

别被吓到——**除了 `SKILL.md` 是必须的，其余全是按需添加**。你完全可以从一个文件起步，需要什么再加什么。

# 二、逐个认识

| 文件/目录 | 必须? | 作用 | 类比 |
|-----------|-------|------|------|
| `SKILL.md` | ✅ 必须 | 入口说明书：元数据 + 操作指引 | 一本书的「封面 + 正文」 |
| `reference/` | 可选 | 详细参考资料，正文里按需链接进来 | 书末的「附录」 |
| `templates/` | 可选 | 现成模板，让 Claude 复制套用 | 「填空表格」 |
| `scripts/` | 可选 | 可执行代码，干 AI 容易出错的活 | 「随附工具」 |
| `assets/` | 可选 | 图片、字体等静态资源 | 「插图素材」 |

> 子目录的名字（`reference`、`scripts` 等）是**约定俗成**，不是硬性规定。但用大家都懂的名字，能让技能更易读、易维护。

# 三、为什么 SKILL.md 是「入口」

这是本章最该记住的一点：

> **Claude 永远先读 `SKILL.md`，再决定要不要去翻其它文件。**

其它文件（reference、templates、scripts）**不会被自动全部读取**。它们只有在 `SKILL.md` 正文里被「点名引用」时，才会按需加载。比如正文里写：

```markdown
详细的字段规范见 reference/api.md
需要生成 PDF 时，运行 scripts/generate.py
```

Claude 读到这里，才会去打开对应文件。这套「先读入口、按需展开」的机制，正是下一章……不，是第 06 章「渐进式披露」的核心，这里先有个印象。

# 四、为什么要拆成多个文件，不全写在 SKILL.md 里

你可能会想：「我把所有内容都塞进 `SKILL.md` 不行吗？」

技术上可以，但有两个问题：

1. **浪费上下文**：`SKILL.md` 的正文一旦技能被触发就会**整段加载**。如果你把 2000 行 API 文档全写进去，每次触发都要吞掉这么多 token，很亏。
2. **难维护**：一个巨型文件，改起来眼花，团队协作时也容易冲突。

所以正确的姿势是：**`SKILL.md` 保持精简，只放「核心流程 + 指路」；又长又细的内容拆到 `reference/`，要用时再链接进去。** 这就像一本书的正文不会把所有附录都印在每一页上。

# 五、常见错误

- **❌ 把 `SKILL.md` 写成巨型文件**：几千行全塞进去，触发一次烧一次 token。该拆的拆到 reference。
- **❌ 建了 reference/scripts，却忘了在正文里引用**：没被「点名」的文件，Claude 根本不会去看，等于白建。
- **❌ 路径写错**：正文里写 `reference/api.md`，实际文件却放在 `ref/api.md`，引用失效。
- **❌ 过度设计**：技能很简单，却一上来就建五六个子目录。空目录和用不上的结构只会增加噪音。

# 六、最佳实践

- **从单文件起步**：永远先只写 `SKILL.md`，跑通后再按需要拆分。
- **遵循约定命名**：参考资料放 `reference/`、脚本放 `scripts/`、模板放 `templates/`，让别人一眼看懂。
- **正文里所有引用都写清相对路径**：如 `reference/api.md`，且确保文件真的在那。
- **一个原则判断该不该拆**：这段内容是「每次都要用的核心流程」还是「偶尔才查的细节」？前者留正文，后者拆出去。

# 七、总结

- 一个技能 = 一个文件夹，**只有 `SKILL.md` 是必须的**，其余子目录全按需添加。
- 常见子目录：`reference/`（参考）、`templates/`（模板）、`scripts/`（脚本）、`assets/`（资源）。
- `SKILL.md` 是**唯一入口**：Claude 先读它，再根据正文里的「点名引用」去按需打开其它文件。
- 核心心法：**入口精简，细节外置**。又长又少用的内容拆到 `reference/`，省上下文又好维护。

> 👉 下一章：我们钻进 `SKILL.md` 内部，把开头那段 frontmatter（元数据）的每个字段讲清楚。

<!-- knowledge-lab-merged -->

# 动手实践：03 章 Demo · 一个「完整形态」的 Skill 骨架

第 02 章的技能只有一个文件。这个 Demo 展示一个**多文件的完整技能**，让你亲眼看到 `reference/`、`templates/`、`scripts/` 长什么样、怎么被 `SKILL.md` 引用。

## 目录结构

```
pdf-report/
├── SKILL.md                   # 入口：核心流程 + 指向其它文件
├── templates/
│   └── report.md              # 报告模板，供复制套用
├── reference/
│   └── style-guide.md         # 排版规范（偶尔才查 → 外置）
└── scripts/
    └── generate.py            # 生成 PDF 的脚本（本章是演示桩）
```

## 看点：对照着读

打开 `SKILL.md`，注意它**没有**把模板内容、排版规范、脚本代码全抄进去，而是「指路」：

- 「套用标准模板（见 `templates/report.md`）」
- 「排版规范见 `reference/style-guide.md`，需要时再查阅」
- 「运行脚本 `scripts/generate.py`」

这就是第 03 章的核心——**入口精简，细节外置**。`SKILL.md` 本身很短，又长又少用的东西都拆出去了。

## 动手观察

1. 数一下 `SKILL.md` 有多少行，再数 `reference/style-guide.md` 有多少行。想象如果把后者也塞进 SKILL.md，每次触发要多烧多少 token。
2. 把 `SKILL.md` 里 `reference/style-guide.md` 这个引用删掉 —— 这个参考文件就「失联」了，Claude 不会主动去看它。这说明：**没被正文点名的文件，等于不存在。**

## 跑一下脚本（可选）

```bash
cd pdf-report
python scripts/generate.py input.md output.pdf
# 会打印 demo 提示，真正的转换逻辑留到第 08 章
```

## 你会收获什么

- 直观看到一个真实技能的多文件布局。
- 理解「引用关系」：`SKILL.md` 点名了谁，谁才会被加载。
- 为第 06（渐进式披露）、07（资源文件）、08（脚本）章打好结构基础。

<!-- knowledge-practice-materials-merged -->

## 配套实践材料

以下材料已并入正文，便于阅读时直接对照和练习。

### `pdf-report/reference/style-guide.md`

````markdown
# 排版规范（参考资料）

> 这是 reference 文件，属于「偶尔才查的细节」，所以放在这里而不是塞进 SKILL.md 正文，以节省上下文。

## 字号

- 一级标题：18pt，加粗
- 二级标题：14pt，加粗
- 正文：11pt

## 颜色

- 标题：#1a1a1a
- 正文：#333333
- 强调/警告：#d93025

## 表格

- 表头加浅灰底色（#f5f5f5）
- 数字右对齐，文字左对齐

## 页边距

- 上下：2.5cm
- 左右：3cm
````

### `pdf-report/SKILL.md`

````markdown
---
name: pdf-report
description: 当用户需要把数据或内容整理成一份格式规范的 PDF 报告时使用。适用于生成周报、统计报告、汇总文档的场景。
---

# PDF 报告生成

帮用户把内容整理成一份规范的报告。

## 步骤
1. 跟用户确认报告主题、时间范围、要包含的板块。
2. 套用标准模板（见 `templates/report.md`）组织内容。
3. 如需导出 PDF，运行脚本 `scripts/generate.py`（用法见脚本内注释）。

## 排版规范
详细的排版与字号规范见 `reference/style-guide.md`，需要时再查阅，不必背诵。

## 注意
- 数据要忠于用户提供的原始内容，不要编造数字。
- 模板里的占位符（如 {{title}}）必须全部替换，不能残留。
````

### `pdf-report/templates/report.md`

````markdown
# 报告模板

> 这是一个模板文件。Claude 会复制它、替换占位符，生成实际报告。

# {{title}}

**报告周期**：{{period}}
**生成日期**：{{date}}

## 一、概述

{{summary}}

## 二、关键数据

| 指标 | 数值 | 环比 |
|------|------|------|
| {{metric_name}} | {{metric_value}} | {{metric_change}} |

## 三、问题与风险

{{risks}}

## 四、下一步计划

{{next_steps}}
````

## 参考资料

- [Agent Skills 规范](https://agentskills.io/specification)
- [MCP 规范](https://modelcontextprotocol.io/specification/latest)
