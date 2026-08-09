# wiki-ingest 与 wiki-save 存知识

## 本篇你能学到

- `wiki-ingest` vs `wiki-save` 的核心区别：前者吃外部素材（文件、PRD、raw 目录），后者吃当前对话（结论、决策、口述经验）；触发词：ingest 用「整理这份文档 / 归档这份 PRD / ingest 这个文件」，save 用「保存这次讨论 / 把刚才的分析存下来 / save」
- 各自完整的「输入 → 输出」示例：ingest 读 `raw/incidents/2026-05-pay-timeout.md` → 产出 `areas/pitfall/pay-timeout-retry.md`（`sources` 指回 raw 文件）；save 提炼受控组件讨论 → 产出 `wiki/patterns/form/controlled-vs-uncontrolled.md`（`sources: conversation`）
- 两者共同遵守的铁律：优先更新而非新建、frontmatter 必填（`title`/`description`/`type`/`status`）、不自动 commit

---

知识库建好了，索引也调通了，接下来就是最高频的动作：**往里面塞东西**。

塞东西这件事，frontend-knowledge 拆成了两个技能。很多人第一次看会懵：「不都是存知识吗，为啥要两个？」我一开始也这么想，直到有一次我把一份 PRD 文档丢给 `wiki-save`，它愣是没读文件，只把我们聊天里提到的两句话存了进去，我才明白这俩的边界划得有多清楚。

> 一句话先记住：**素材在文件里，用 ingest；结论在对话里，用 save。**

## wiki-ingest：把外部素材沉淀成知识页

**一句话定位**：把「外部素材」转成「符合规范、能被检索的知识页」。

这里的外部素材，指的是已经存在于某个地方的一手资料，不是你脑子里的想法。SKILL.md 里写得很明确：

- `raw/` 下的一手资料（官方文档快照、RFC、PRD、会议纪要、聊天记录文件）
- 项目复盘材料（联调、故障、发布事故文档）
- 用户提供的具体文件路径或主题词（指向已有素材）

**触发词**（从 description 抠出来的，照着说就能唤起）：

> 整理 raw、整理这份文档、归档这份 PRD、把这份资料沉淀、批量 ingest、ingest 这个文件、归档到 wiki、整理到知识库（带文件来源）

注意最后那个「带文件来源」，这是 ingest 和 save 在触发词上的关键分水岭——只要你的话里指向了一个**文件**，就是 ingest 的活儿。

### 它内部干了 8 步

ingest 的流程比 save 重，因为外部素材通常更长、更杂，需要判层级、判分类、查重、还可能要拆分。完整 8 步是这样的：

| 步骤 | 干什么 |
| --- | --- |
| Step 1 | 解析输入素材，提取要点、证据、来源 |
| Step 2 | 判定层级（wiki 通用 / areas 项目） |
| Step 3 | 判定分类与目标路径，定 type、status |
| Step 4 | 匹配现有页面，决定 update 还是 create |
| Step 5 | 生成 frontmatter + 正文草稿 |
| Step 6 | 写入文件，超阈值时拆分 |
| Step 7 | 同步导航与冲突检查 |
| Step 8 | 输出总结报告 |

有个细节我特别想强调，Step 1 里写了一句话，是 ingest 的灵魂：

> 严格区分"原始引用"和"我们的结论"：raw 是证据，结论由 ingest 产出，不要把 raw 整段搬到 wiki。

也就是说，ingest 不是搬运工，是提炼者。它读 PRD，但写进 wiki 的是「从 PRD 里提炼出的可复用结论」，不是把 PRD 原文复制一遍。

### 一个完整示例

假设你手头有一份联调故障复盘文档，已经放进了 `raw/incidents/2026-05-pay-timeout.md`。

**输入**（你对 Claude 说）：

```text
帮我把 raw/incidents/2026-05-pay-timeout.md 这份故障复盘整理到知识库，
重点是支付超时的根因和我们最终的重试策略
```

**ingest 做的事**：

```text
[wiki-ingest Step 1] ✓ 素材解析完成：支付接口超时重试策略
[wiki-ingest Step 2] ✓ 判定为项目层（areas/，因为含业务模块名 + 故障复盘）
[wiki-ingest Step 3] ✓ 目标分类：areas/pitfall/pay-timeout-retry.md，类型：pitfall
[wiki-ingest Step 4] ⚠ 未找到可合并页面，将新建
[wiki-ingest Step 5] ✓ 草稿生成完成
[wiki-ingest Step 6] ✓ 写入 areas/pitfall/pay-timeout-retry.md
[wiki-ingest Step 7] ✓ 已同步：父 _index.md
[wiki-ingest Step 8] ✓ 沉淀完成
```

**输出的页面**（节选 frontmatter，注意 `sources` 指回了 raw）：

```yaml
---
title: "支付接口超时重试策略"
description: "支付超时根因定位与指数退避重试方案"
type: pitfall
status: developing
created: 2026-06-09
updated: 2026-06-09
tags: [pay, error-handling, debugging]
sources:
  - "[[../../raw/incidents/2026-05-pay-timeout.md]]"
---
```

看到没，`sources` 用 `[[相对路径]]` 把知识页和原始证据链了起来，以后想追溯「这结论哪来的」，一跳就到。

## wiki-save：把当前对话的结论沉淀下来

**一句话定位**：把当前对话中产出的结论、决策、经验整理为符合规范的知识页。

它吃的是**对话**，不是文件。SKILL.md 列的输入来源：

- 对话中产出的非显而易见的洞察或综合分析
- 带理由的决策（为什么选 A 不选 B）
- 经过充分讨论达成的共识
- 踩坑记录与解决方案

**触发词**：

> 保存这次讨论、save、整理结论、沉淀到知识库、把刚才的分析存下来、save this、keep this、沉淀这次会话、记录这个决策

save 有两条硬约束是 ingest 没有的：**一次只存一页**（多主题要分多次调用），还有**写成知识，不保留对话痕迹**。

### 写成知识，不是记聊天记录

这是 save 最容易翻车的地方。SKILL.md 直接给了正反对照：

| ✅ 正确写法（直接讲事情本身） | ❌ 带对话痕迹（不允许） |
| --- | --- |
| 「X 通过 Y 实现。关键约束是 Z」 | 「用户问 X，AI 解释了 Y」 |
| 「选择 A 而非 B，因为……」 | 「经过讨论，我们决定……」 |
| 假设读者没参与过对话也能看懂 | 「刚才聊到……」 |

判断标准就一句：**假设读者完全没参与过对话，光看这页也能看懂。**

### 它内部干了 6 步

save 比 ingest 轻两步——它不判素材解析（输入就是对话），也不做拆分（拆分是 ingest 的职责，save 超 300 行时是精简而非拆分）：

| 步骤 | 干什么 |
| --- | --- |
| Step 1 | 提炼对话要点 |
| Step 2 | 判定类型与目标路径 |
| Step 3 | 生成 frontmatter + 正文 |
| Step 4 | 写入文件 |
| Step 5 | 同步导航 |
| Step 6 | 输出总结 |

### 一个完整示例

假设你刚和 Claude 讨论完「表单为什么要用受控组件而不是非受控」，聊出了结论。

**输入**：

```text
把刚才关于受控组件选型的结论 save 一下，团队通用规范
```

**save 做的事**：

```text
[wiki-save Step 1] ✓ 提炼完成：受控组件优先于非受控组件
[wiki-save Step 2] ✓ 类型：decision，路径：wiki/patterns/form/controlled-vs-uncontrolled.md，动作：create
[wiki-save Step 3] ✓ 草稿生成完成
[wiki-save Step 4] ✓ 已写入
[wiki-save Step 5] ✓ 已同步：父 _index.md / README tree / related
[wiki-save Step 6] ✓ 会话沉淀完成
```

**输出页面 frontmatter**（注意 `sources` 是 `conversation`，标明来源是对话本身）：

```yaml
---
title: "受控组件优先于非受控组件"
description: "表单场景下选择受控组件的理由与边界"
type: decision
status: developing
created: 2026-06-09
updated: 2026-06-09
tags: [react, form]
sources:
  - "conversation"
---
```

`sources: conversation` 这一笔，就是 save 和 ingest 在产物上的指纹差异——一个指回 raw 文件，一个标记来自会话。

## 怎么选？一张表说清

两者的核心区别，浓缩成一句话是「素材在哪」：

| 维度 | ✅ wiki-ingest | ✅ wiki-save |
| --- | --- | --- |
| 输入来源 | 外部素材（raw、PRD、会议纪要、文档文件） | 当前对话（讨论结论、决策、口述经验） |
| 典型触发 | 「整理这份文档」「归档这份 PRD」 | 「保存这次讨论」「把刚才的分析存下来」 |
| 流程步数 | 8 步（含拆分判定） | 6 步（不拆分） |
| 一次产出 | 可能多页（触发拆分） | 严格一页 |
| `sources` 写法 | `[[../../raw/...]]` 指回素材 | `conversation` / `session` |
| 超长处理 | > 300 行触发拆分 | 精简内容，不拆分 |

而下面这些是**用错的信号**，看到就停下来换技能：

| ❌ 用错的场景 | 实际该用 |
| --- | --- |
| 给 wiki-save 丢一个文件路径让它读 | wiki-ingest |
| 让 wiki-ingest 存「我们刚聊的口头结论」（无文件依据） | wiki-save |
| 一次性让 wiki-save 存三个不相干主题 | 分三次调用 wiki-save |

> ingest 在 Step 1 还做了贴心兜底：如果你没给任何外部素材、只是在口述结论，它会红色提示「未检测到外部素材来源，请改用 wiki-save」，并直接终止。所以就算喊错了也不至于乱写。

## 两者共同的三条铁律

虽然输入来源天差地别，但落盘时它俩遵守完全一致的规范。这三条最关键。

### 1. 优先更新而非新建

两个技能都有专门的「匹配现有页面」环节（ingest 的 Step 4、save 的 Step 2.3），逻辑一模一样：

```text
在 target_dir 下 Glob 列举候选页 → Grep 搜核心关键词 → 读 frontmatter 与首屏
  主题完全重合   → update，修订/追加章节
  主题相关不同角度 → update，新增 H2 + related 互链
  完全无重叠     → create
判定阈值：90% 相似必须更新；50–90% 询问用户
```

这条规则是知识库不长「重复页」的根本保障。没有它，跑半年你会有五篇都叫《React 状态管理》的页。

### 2. frontmatter 必填

不管哪个技能写出来的页，开头都得有合规的 YAML frontmatter，其中四个字段**必填**：`title`、`description`、`type`、`status`（外加 `created` / `updated` 日期）。几条容易忽略的硬约束：

| ✅ 正确 | ❌ 错误 |
| --- | --- |
| `title` 与正文 H1 严格一致 | `title` 带「（最终版）」「（补充）」尾巴 |
| `description` 1-2 句、80 字内说清讲什么 | 「本文介绍了……」这种空话 |
| `tags` 全小写 kebab-case，2-5 个 | `React`、`error_handling`、打 10 个标签 |
| `status` 新建默认 `developing` | 占位骨架却写满正文还标 `draft` |

`type` 不用纠结怎么选——它就等于文件所在的分区目录名，目录定了 type 就定了。

### 3. 不自动 commit

这条我必须单独点出来，因为它体现了技能设计的克制：**两个技能写完文件后都不会替你 git commit**，只输出一份待提交清单，由你决定提交时机。

save 的 Step 6 甚至会直接把命令递到你手边：

```bash
git add <file_path> <nav_files>
git commit -m "docs: 沉淀会话结论 - <title>"
```

> 为什么不自动提交？因为沉淀是 AI 起草、人来把关的协作模式。AI 可能判错层级、可能合错页，留一道人工 review 的口子，比图省事自动提交安全得多。

## 小结

`wiki-ingest` 和 `wiki-save` 是知识库的两个入口，分工就一句话：**文件进 ingest，对话进 save。** ingest 跑 8 步、能拆分、`sources` 指回 raw；save 跑 6 步、一次一页、`sources` 标 `conversation`，而且要写成知识不留聊天痕迹。

它俩在落盘环节又高度一致：优先更新避免重复、frontmatter 四字段必填、写完不自动 commit 把最终决定权交给你。记住这套区别，下次想沉淀知识时，先问自己一句「素材在文件里还是在对话里」，技能就选对了。
