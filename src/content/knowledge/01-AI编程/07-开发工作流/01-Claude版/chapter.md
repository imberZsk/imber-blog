# 用 OpenSpec + Superpowers 跑通 AI 开发工作流

> 一套把"想清楚 → 写规范 → 写计划 → 实现 → 验证 → 归档"串起来的 AI 编程流程。
> 本文以真实需求 **CYTRD-26477（物料发放 & 维修页面增加车管筛选项）** 作为贯穿案例。

---

## 一、先搞清楚两个工具的分工

很多人会把这两个工具当成同类来比较，其实它们是**互补的两层**，缺一不可：

| | OpenSpec | Superpowers |
|---|---|---|
| 是什么 | spec-driven 开发框架 | skill（方法论）库 |
| 解决什么 | **做什么、按什么顺序做**（流程骨架） | **每一步怎么做好**（工程方法） |
| 交互方式 | **slash 命令**：`/opsx:propose` 等 | **无 slash 命令**，skill 按需自动触发 |
| 产出 | proposal / design / tasks / specs 文档 | 不产出文档，约束你的行为方式 |
| 类比 | 项目经理 + 规范文档 | 资深工程师的工作习惯 |

一句话记住：

```
OpenSpec  = 流程的"轨道"（阶段、命令、文档）
Superpowers = 跑在轨道上的"功力"（TDD、根因调试、子代理、完工验证）
```

### OpenSpec 的 5 个命令一览

| 命令 | 阶段 | 干什么 |
|---|---|---|
| `/opsx:explore` | 探索 | 只想不写代码。读代码、问问题、画图、比方案，把需求和现状想透 |
| `/opsx:propose` | 提案 | 一次性生成 proposal.md（做什么&为什么）、design.md（怎么做）、tasks.md（任务清单） |
| `/opsx:apply` | 实现 | 按 tasks.md 逐条实现，做完一条勾一条 |
| `/opsx:sync` | 同步 | 把本次变更的 delta spec 合并进主规范（specs/） |
| `/opsx:archive` | 归档 | 变更完成后归档到 `changes/archive/YYYY-MM-DD-<名字>/` |

> 注意：OpenSpec 强调"动作不是阶段"（actions, not phases）。这些命令不是死板的单向流水线，
> 你可以在 apply 阶段发现设计问题，回头改 design.md，再继续。

### Superpowers 的 14 个 skill 一览

它们没有命令，是在你工作时**自动按需触发**的方法论。按用途分组：

**想清楚阶段**
- `brainstorming` — 任何创造性工作前，先把需求和设计聊透（一次问一个问题）
- `writing-plans` — 把 spec 拆成"零上下文工程师也能照做"的逐步计划

**实现阶段**
- `test-driven-development` — 先写测试，看它失败，再写最小实现
- `executing-plans` — 拿着写好的计划，在独立会话里逐条执行
- `subagent-driven-development` — 每个任务派一个全新子代理实现 + 审查，主上下文只做协调
- `dispatching-parallel-agents` — 2 个以上互不依赖的任务，并行派子代理
- `using-git-worktrees` — 用 worktree 隔离工作区

**质量阶段**
- `systematic-debugging` — 遇到 bug 先找根因，禁止症状式打补丁
- `verification-before-completion` — 声称"完成"前必须跑验证命令、贴出证据
- `requesting-code-review` / `receiving-code-review` — 派审查子代理把关
- `finishing-a-development-branch` — 收尾：验证→选择 merge/PR/清理

**元能力**
- `using-superpowers` — 入口 skill，规定"任何动作前先检查有没有适用的 skill"
- `writing-skills` — 教你写新 skill

---

## 二、完整流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                      准备：隔离工作区                              │
│   superpowers: using-git-worktrees                                │
│   → 在 worktree 里干活，不污染主分支                               │
└───────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1   /opsx:explore  "需求描述"                                │
│           探索：只想不写。读代码、找参考、画架构图、比方案          │
│  superpowers: brainstorming（把需求聊透，一次问一个问题）          │
│  产出：想清楚了 → 决定开一个 change                                │
└───────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2   /opsx:propose  "change-name"                            │
│           提案：一次生成三份文档                                   │
│           ├─ proposal.md  做什么 & 为什么                          │
│           ├─ design.md    怎么做（架构、改动点）                   │
│           └─ tasks.md     拆成可执行的任务清单                     │
│  superpowers: writing-plans（让 tasks 拆得足够细、可独立执行）     │
└───────────────────────────────┬───────────────────────────────────┘
                                 │  人工 review 三份文档（关键卡点）
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3   /opsx:apply  "change-name"                              │
│           实现：按 tasks.md 逐条做，做完勾一条                     │
│  superpowers:                                                     │
│    ├─ test-driven-development     先写测试再写实现                 │
│    ├─ subagent-driven-development 每个任务派子代理 + 审查          │
│    ├─ systematic-debugging        卡住时先找根因                   │
│    └─ verification-before-completion 完成前跑验证、贴证据          │
└───────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4   /opsx:sync  "change-name"   （可选）                     │
│           把 delta spec 合并进主规范 openspec/specs/               │
└───────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5   /opsx:archive  "change-name"                            │
│           归档变更 + 收尾                                          │
│  superpowers: finishing-a-development-branch（merge / PR / 清理）  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、实战：用 CYTRD-26477 走一遍

> **需求**：物料发放页面和维修页面，支持按"车管"筛选。
> 客户车辆多，对数据时只想看自己负责的车，所以要在这两个列表页加车管筛选项。

### STEP 0 · 准备隔离工作区

不要直接在主项目上改。先开 worktree，让这次需求的代码、文档、工具配置都自包含。

```
触发 skill: using-git-worktrees
```

本例中工作区是：
```
worktrees/CYTRD-26477-物料发放&维修页面增加车管筛选项/
├── cyt-frontend-pc-web/   前端
├── cyt-tms/               PHP 后端
├── openspec/              ← OpenSpec 的 specs 和 changes
├── superpowers/           ← Superpowers 源码
└── .claude/               ← 两个工具的项目级配置
```

> 工具本身也装在 worktree 里（项目级），换需求换 worktree，配置不互相干扰。

---

### STEP 1 · 探索：`/opsx:explore`

```
/opsx:explore 物料发放和维修页面增加车管筛选，参考已有实现
```

**这一步绝对不写代码。** explore 模式是"思考模式"——只读代码、找参考、画图、问问题。

它会自动配合 `brainstorming` skill，把需求一点点问清楚。本例探索阶段实际产出的关键结论：

```
┌──────────────────────────────────────────────────────────┐
│  探索结论（车管筛选）                                       │
├──────────────────────────────────────────────────────────┤
│  参考实现：                                                 │
│   • 移动端"批次费用管理"已有车管筛选（唯一列表页参考）       │
│     cyt-frontend-manager-mobile/.../BatchFeeFilterData.js   │
│   • PC 端车辆管理表单有 vehicle_warden 字段（枚举获取参考）  │
│                                                            │
│  后端归属（关键发现）：                                     │
│   • 两个列表查询都走 cyt-tms 的统一 ES 接口（category 分发）  │
│   • 维修页：vehicle_warden 已写入 ES → 后端不用改           │
│   • 物料发放页：ES 没有该字段 → cyt-tms 需改 2 处           │
│       1. MaterialApplyBill/Base.class.php 加字段定义        │
│       2. CBasicFetchService 拼 truck.ext 的 vehicle_warden  │
└──────────────────────────────────────────────────────────┘
```

**为什么这步如此关键**：探索阶段就发现"维修页后端不用改、物料发放页后端要改两处"。
如果跳过探索直接写代码，很可能两个页面都按同一套改，在物料发放页踩坑。

> 探索充分后，OpenSpec 会问：要不要把这些想法固化成一个 change？→ 进入 STEP 2。

---

### STEP 2 · 提案：`/opsx:propose`

```
/opsx:propose add-vehicle-warden-filter
```

OpenSpec 会按依赖顺序自动生成三份文档，写进 `openspec/changes/add-vehicle-warden-filter/`：

```
add-vehicle-warden-filter/
├── proposal.md   做什么 & 为什么
├── design.md     怎么做（架构、改动点、技术选型）
└── tasks.md      拆成一条条可勾选的任务
```

这一步会配合 `writing-plans` skill，把 tasks 拆到"一个对代码库零了解的人也能照着做"的颗粒度。本例 tasks.md 大致长这样：

```markdown
## 后端（cyt-tms）— 仅物料发放
- [ ] 1. MaterialApplyBill/Base.class.php 的 FIELD_POOL 增加 vehicle_warden 字段
       （参照 BsCarmaintenance/Base.class.php:723）
- [ ] 2. CBasicFetchService.fetchMaterialApplyBill4Engine 关联 truck，
       从 truck.ext 取 vehicle_warden 写入 ES 文档
- [ ] 3. 重建/验证 MaterialApplyBill 的 ES 索引含该字段

## 前端（cyt-frontend-pc-web）
- [ ] 4. 物料发放列表筛选栏增加"车管"项（参照移动端 BatchFeeFilterData.js）
- [ ] 5. 维修列表筛选栏增加"车管"项
- [ ] 6. 车管下拉走 userSug 联想接口
```

#### ⚠️ 这是整个流程最重要的人工卡点

文档生成后，**先 review 再 apply**。AI 写的 proposal/design/tasks 可能有偏差，
在这里花 5 分钟改文档，比 apply 之后改代码便宜得多。重点看：

- proposal 的范围对不对（维修页后端真的不用改吗？）
- design 的改动点和探索结论一致吗？
- tasks 拆得够不够细、有没有漏（比如 ES 索引重建这种隐藏任务）

> OpenSpec 是"fluid workflow"——如果 review 发现问题，直接改文档，
> 或回 `/opsx:explore` 再想想，不必从头来。

---

### STEP 3 · 实现：`/opsx:apply`

```
/opsx:apply add-vehicle-warden-filter
```

OpenSpec 读取三份文档作为上下文，按 tasks.md 逐条实现，**做完一条把 `- [ ]` 改成 `- [x]`**。

这一步是 Superpowers 火力最集中的地方，多个 skill 协同：

```
┌─ 每条 task 的实现循环 ──────────────────────────────────┐
│                                                         │
│  test-driven-development                                │
│    → 先写测试，看它失败，再写最小实现让它通过             │
│                                                         │
│  subagent-driven-development（任务独立时）               │
│    → 每条 task 派一个全新子代理实现                      │
│    → 实现完立刻派审查子代理（查规范符合度 + 代码质量）    │
│    → 主上下文只做协调，不被细节淹没                      │
│                                                         │
│  dispatching-parallel-agents（多条 task 互不依赖时）     │
│    → 前端两个页面的改动可以并行派两个子代理              │
│                                                         │
│  systematic-debugging（卡住时）                          │
│    → 禁止症状式打补丁，先定位根因再修                    │
│                                                         │
│  verification-before-completion（每条 task 收尾）        │
│    → 声称"完成"前必须跑测试/构建，贴出真实输出           │
│    → 没有证据不许说"done"                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

本例的并行机会很明显：

```
                  ┌─ 子代理 A：cyt-tms 后端改动（task 1-3）
   /opsx:apply ───┤
                  ├─ 子代理 B：物料发放前端筛选（task 4）
                  └─ 子代理 C：维修前端筛选（task 5）
   （后端 task 与前端 task 互不依赖，可并行；前端两页也可并行）
```

apply 过程中如果某条 task 暴露设计问题，OpenSpec 会**暂停并提示你回去改 design.md**，
而不是硬着头皮写下去。

---

### STEP 4 · 同步规范：`/opsx:sync`（可选）

```
/opsx:sync add-vehicle-warden-filter
```

如果这次变更产生了 delta spec（对系统能力的规范性描述），sync 会把它**智能合并**进主规范 `openspec/specs/`。

例如车管筛选可能新增一条能力规范：

```markdown
## ADDED Requirements
### Requirement: 物料发放与维修列表按车管筛选
系统 SHALL 在物料发放、维修列表页提供按车管（vehicle_warden）筛选的能力。

#### Scenario: 按车管筛选物料发放记录
- **WHEN** 用户在物料发放列表选择某个车管
- **THEN** 列表只返回该车管负责车辆的发放记录
```

sync 是 agent-driven 的——它会读 delta spec 和主 spec，**只合并增量**（比如只加一个 scenario，不会整段覆盖）。

> 如果这次变更不涉及"系统能力"层面的规范（纯 bug 修复、小调整），可以跳过 sync。

---

### STEP 5 · 归档：`/opsx:archive`

```
/opsx:archive add-vehicle-warden-filter
```

变更做完后归档。OpenSpec 会：

1. 检查所有 artifact 是否完成、tasks 是否都勾了（没完成会警告并让你确认）
2. 检查 delta spec 有没有 sync（没 sync 会提示要不要现在同步）
3. 把整个 change 目录移到 `changes/archive/2026-06-23-add-vehicle-warden-filter/`

归档后配合 `finishing-a-development-branch` skill 收尾：

```
finishing-a-development-branch
  → 验证测试全过
  → 检测环境（有没有 CI、远程仓库）
  → 给出选项：merge / 建 PR / 仅清理
  → 执行你的选择，清理 worktree
```

---

## 四、命令速查表

```
准备   ─ （worktree 隔离，superpowers 自动）
STEP 1  /opsx:explore  "需求"        想清楚，不写码      ← 配 brainstorming
STEP 2  /opsx:propose  change-name   生成三份文档        ← 配 writing-plans
        │  ⚠️ 人工 review 文档（最重要的卡点）
STEP 3  /opsx:apply    change-name   逐条实现            ← 配 TDD/子代理/验证
STEP 4  /opsx:sync     change-name   合并规范（可选）
STEP 5  /opsx:archive  change-name   归档收尾            ← 配 finishing-branch
```

> 只有 OpenSpec 有 slash 命令。Superpowers 没有命令，它的 skill 在对应阶段自动触发。

---

## 五、几条关键心法

**1. explore 阶段值得多花时间。**
本例正是在探索阶段才发现"维修页后端不用改、物料发放页要改两处"。
想清楚的成本远低于改错的成本。

**2. propose 之后、apply 之前的 review 是核心卡点。**
改文档比改代码便宜。AI 生成的 tasks 可能漏掉隐藏任务（如 ES 索引重建），在这里补上。

**3. 流程是流动的，不是单向流水线。**
apply 时发现设计问题，回头改 design.md 再继续，完全正常。OpenSpec 的理念就是
"actions, not phases"——命令是你能做的动作，不是被锁死的阶段。

**4. 让 Superpowers 替你守住质量底线。**
- `verification-before-completion`：没跑过验证、没贴证据，就不许说"完成"
- `systematic-debugging`：卡住时禁止瞎试，先找根因
- `subagent-driven-development`：每个任务做完都有独立审查，问题不向后传导

**5. 子代理用来保护主上下文。**
噪音大的活（搜代码、读日志、独立任务实现）派给子代理，主会话只留结论和协调，
上下文不会被细节撑爆。

---

## 六、工具安装回顾（项目级）

```bash
# OpenSpec：在 worktree 根目录初始化，统管前后端
npx @fission-ai/openspec@latest init --tools claude
# → 生成 .claude/commands/opsx/ 和 .claude/skills/openspec-*

# Superpowers：clone 后用项目级 marketplace 安装
git clone https://github.com/obra/superpowers.git superpowers
claude plugin marketplace add ./superpowers --scope project
claude plugin install superpowers@superpowers-dev --scope project
# → 配置写进 .claude/settings.json，跟着 worktree 走
```

两者落地位置不同（机制决定）：

| 工具 | 项目级载体 |
|---|---|
| OpenSpec | `.claude/commands/opsx/` + `.claude/skills/openspec-*`（实体文件） |
| Superpowers | `.claude/settings.json`（声明式）+ `superpowers/`（源码） |

> 装好后需 trust 工作区 + `/reload-plugins`（或重启会话），slash 命令和 skill 才生效。

---

*本文基于 OpenSpec（Fission-AI）和 Superpowers（obra）实测整理，案例来自 CYTRD-26477。*
