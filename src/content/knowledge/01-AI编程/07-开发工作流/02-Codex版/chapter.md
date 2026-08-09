# 用 Codex 跑 OpenSpec + Superpowers 开发流程

> 一套在 Codex 中把"想清楚 → 写规范 → 写计划 → 实现 → 验证 → 归档"串起来的 AI 编程流程。
> 本文以真实需求 **CYTRD-26477（物料发放 & 维修页面增加车管筛选项）** 作为贯穿案例。

---

## 一、先搞清楚两个工具的分工

OpenSpec 和 Superpowers 不是同类工具。它们是两层互补能力：

| | OpenSpec | Superpowers |
|---|---|---|
| 是什么 | spec-driven 开发框架 | skill 方法论库 |
| 解决什么 | **做什么、按什么顺序做**：变更、规范、任务、归档 | **每一步怎么做好**：澄清、计划、TDD、验证、审查 |
| 在 Codex 中怎么用 | 通过 `.agents/skills/openspec-*` skill，或迁移过来的 `source-command-opsx-*` skill | 通过 Superpowers skills 按需触发 |
| 产出 | `proposal.md` / `design.md` / `tasks.md` / `specs` / archive | 通常不作为主产物；提供执行纪律和审查方法 |
| 类比 | 项目经理 + 变更档案 | 资深工程师的工作习惯 |

一句话记住：

```text
OpenSpec    = 流程的轨道：change、artifact、task、archive
Superpowers = 跑在轨道上的功力：brainstorming、TDD、子代理、验证、收尾
```

### Codex 里的入口不是 Claude slash command

Claude 里常见入口是：

```text
/opsx:explore
/opsx:propose
/opsx:apply
/opsx:sync
/opsx:archive
```

在 Codex 中，`.claude/commands/opsx/*.md` 会被导入成 skill。当前 worktree 中已经有两组相关 skill：

```text
.agents/skills/openspec-explore
.agents/skills/openspec-propose
.agents/skills/openspec-apply-change
.agents/skills/openspec-sync-specs
.agents/skills/openspec-archive-change

.agents/skills/source-command-opsx-explore
.agents/skills/source-command-opsx-propose
.agents/skills/source-command-opsx-apply
.agents/skills/source-command-opsx-sync
.agents/skills/source-command-opsx-archive
```

建议优先使用 `openspec-*` 这一组，因为名字更清晰、更 Codex-native。`source-command-opsx-*` 是从 Claude command 包装出来的兼容层。

在 Codex 对话中可以这样说：

```text
使用 openspec-explore，探索 CYTRD-26477：物料发放和维修页面增加车管筛选，参考已有实现。
```

或者：

```text
使用 openspec-propose，为 CYTRD-26477 创建 change：add-vehicle-warden-filter。
```

Codex 会按 skill 描述执行。不要强依赖 `/opsx:*` 是否出现在命令菜单里。

---

## 二、结合原则

OpenSpec 和 Superpowers 结合时，最容易踩的坑是产物重复。

Superpowers 的 `brainstorming` 和 `writing-plans` 默认会写自己的文档，例如：

```text
docs/superpowers/specs/...
docs/superpowers/plans/...
```

但本流程以 OpenSpec 为主档案系统，所以要明确：

```text
OpenSpec artifacts 是唯一主产物：
- openspec/changes/<change>/proposal.md
- openspec/changes/<change>/design.md
- openspec/changes/<change>/tasks.md
- openspec/changes/<change>/specs/...

Superpowers 提供方法论，不另起一套主文档。
```

具体执行时可以要求 Codex：

```text
借用 Superpowers 的 brainstorming / writing-plans 标准，但产物写入 OpenSpec 的 artifact，不要额外创建 docs/superpowers 计划文档，除非我明确要求。
```

---

## 三、完整流程图

```text
准备：隔离工作区
  Superpowers: using-git-worktrees
  目标：每个需求一个 worktree，代码、配置、OpenSpec change 自包含
        |
        v
STEP 1：探索
  Codex: 使用 openspec-explore
  Superpowers: brainstorming
  目标：只读代码、找参考、问清楚、画清楚，不写业务代码
        |
        v
STEP 2：提案
  Codex: 使用 openspec-propose
  Superpowers: writing-plans 的拆解标准
  目标：生成 proposal.md / design.md / tasks.md
        |
        v
人工 review artifacts
  卡点：范围、设计、任务粒度、验证方式
        |
        v
STEP 3：实现
  Codex: 使用 openspec-apply-change
  Superpowers:
    - test-driven-development
    - subagent-driven-development
    - systematic-debugging
    - verification-before-completion
  目标：按 tasks.md 逐条实现，完成一条勾一条
        |
        v
STEP 4：同步规范
  Codex: 使用 openspec-sync-specs
  目标：如果有 delta spec，合并进 openspec/specs
        |
        v
STEP 5：归档
  Codex: 使用 openspec-archive-change
  Superpowers: finishing-a-development-branch
  目标：归档 change，完成验证和分支收尾
```

---

## 四、实战：CYTRD-26477

### 需求

物料发放页面和维修页面增加"车管"筛选项。

背景：客户车辆多，对数据时只想看自己负责车辆相关的数据，所以两个列表页都需要按车管过滤。

### STEP 0：确认工作区

当前工作区：

```text
/Users/imber/Desktop/work/cyt/worktrees/CYTRD-26477-物料发放&维修页面增加车管筛选项/
├── cyt-frontend-pc-web/   前端
├── cyt-tms/               PHP 后端
├── openspec/              OpenSpec specs 和 changes
├── superpowers/           Superpowers 源码
├── .agents/               Codex skills
└── .claude/               Claude commands / skills
```

执行前先让 Codex 确认：

```text
请先确认当前 worktree、.agents/skills、openspec 目录是否可用，并说明本次会使用哪些 skill。
```

如果本地没有全局 `openspec` 命令，使用：

```bash
npx @fission-ai/openspec@latest list --json
npx @fission-ai/openspec@latest status --change "<change>" --json
```

---

### STEP 1：探索

对 Codex 说：

```text
使用 openspec-explore 探索 CYTRD-26477：物料发放页面和维修页面增加车管筛选项。请结合 Superpowers brainstorming 的方式，先读代码和参考实现，只探索不写业务代码。产物先以结论汇总为主，不要创建额外 docs/superpowers 文档。
```

探索阶段要完成这些事情：

- 找到两个目标页面分别在哪里配置筛选项。
- 找到已有车管筛选参考实现。
- 确认前端筛选参数名和值格式。
- 确认后端统一 ES 查询如何按字段过滤。
- 确认维修页 ES 是否已有 `vehicle_warden` 字段。
- 确认物料发放 ES 是否缺 `vehicle_warden` 字段。
- 判断是否需要重建或刷新 ES 索引。

本需求当前已知探索结论：

```text
参考实现：
- PC 车辆管理表单已有 vehicle_warden 字段，可参考车管选择/枚举方式。
- 维修相关列表已有 BsCarmaintenance 领域代码和 vehicle_warden 使用痕迹。

后端归属：
- 两个列表查询都走 cyt-tms 的统一 ES/category 分发。
- 维修页大概率已有 vehicle_warden 字段，后端可能不用改。
- 物料发放页需要确认 MaterialApplyBill ES 文档是否写入 vehicle_warden。
- 如果未写入，需要在 MaterialApplyBill 字段定义和 ES 数据构建逻辑中补齐。
```

探索输出建议格式：

```markdown
## 探索结论

**目标页面**
- 物料发放：...
- 维修页面：...

**参考实现**
- ...

**后端判断**
- 维修页：...
- 物料发放：...

**待确认问题**
- ...

**建议 change 名称**
- add-vehicle-warden-filter
```

注意：探索阶段不改业务代码。可以读文件、搜索、运行只读命令。

---

### STEP 2：创建 OpenSpec change

对 Codex 说：

```text
使用 openspec-propose 创建 change：add-vehicle-warden-filter。请把刚才探索结论固化为 OpenSpec artifacts：proposal.md、design.md、tasks.md。借用 Superpowers writing-plans 的任务拆解标准，但产物只写入 openspec/changes/add-vehicle-warden-filter/。
```

期望生成：

```text
openspec/changes/add-vehicle-warden-filter/
├── proposal.md
├── design.md
├── tasks.md
└── specs/...
```

`tasks.md` 至少要覆盖：

```markdown
## 后端：cyt-tms
- [ ] 确认 BsCarmaintenance / 维修页 ES 文档中已有 vehicle_warden，可支持筛选。
- [ ] 确认 MaterialApplyBill ES 文档是否缺 vehicle_warden。
- [ ] 如缺失，在 MaterialApplyBill 字段定义中增加 vehicle_warden。
- [ ] 如缺失，在 MaterialApplyBill ES 数据构建逻辑中从 truck.ext 取 vehicle_warden 并写入文档。
- [ ] 明确 MaterialApplyBill 索引刷新/重建方式和验证命令。

## 前端：cyt-frontend-pc-web
- [ ] 物料发放列表筛选栏增加"车管"筛选项。
- [ ] 维修列表筛选栏增加"车管"筛选项。
- [ ] 车管下拉使用现有 userSug / 用户联想方式，参数和值格式与后端一致。
- [ ] 验证查询参数会进入统一列表请求。

## 验证
- [ ] 前端 lint/build 或目标模块可用的检查命令。
- [ ] 后端语法检查/单测/可用的最小验证命令。
- [ ] 手工或接口验证：按车管筛选能正确过滤两个列表。
```

---

### STEP 2.5：人工 review

这是最重要的卡点。不要急着 apply。

重点 review：

- 范围是否正确：维修页后端真的不用改吗？
- 物料发放页是否确实需要补 ES 字段？
- 筛选参数到底叫 `vehicle_warden`、`tr_vehicle_warden` 还是别的字段？
- userSug 返回的是用户 id 还是用户名？后端过滤字段保存的是什么？
- ES 索引刷新是必须、可选，还是由现有任务自动完成？
- tasks 是否每条都可验证？

对 Codex 说：

```text
请 review 刚生成的 proposal.md、design.md、tasks.md，检查是否和探索结论一致，尤其确认字段名、前后端参数、ES 索引刷新和验证方式。只修改 OpenSpec artifacts，不写业务代码。
```

---

### STEP 3：实现

对 Codex 说：

```text
使用 openspec-apply-change 实现 add-vehicle-warden-filter。执行前请读取 OpenSpec artifacts 和 tasks.md。实现时结合 Superpowers：能写测试的地方按 test-driven-development，任务相对独立时用 subagent-driven-development，遇到问题用 systematic-debugging，完成每条任务前用 verification-before-completion 给出真实验证证据。
```

实现原则：

- 每次只处理一个明确 task。
- 完成 task 后立即把 `tasks.md` 对应 `- [ ]` 改成 `- [x]`。
- 任务暴露设计问题时，暂停并回改 `design.md` 或 `tasks.md`。
- 不为了赶进度跳过验证。

并行策略要谨慎：

```text
可以并行：
- 前端物料发放筛选 UI/参数改动
- 前端维修筛选 UI/参数改动
- 后端 MaterialApplyBill ES 字段补齐

不能假装完全独立：
- 物料发放端到端验证依赖后端 ES 字段和索引刷新。
- 字段名和值格式必须先统一，否则前后端会各写各的。
```

推荐执行顺序：

```text
1. 先确认字段名和值格式。
2. 先补后端 MaterialApplyBill ES 字段能力。
3. 再做两个前端筛选项。
4. 最后统一做端到端验证。
```

---

### STEP 4：同步规范

如果这次变更产生了 delta spec，对 Codex 说：

```text
使用 openspec-sync-specs 同步 add-vehicle-warden-filter 的 delta spec。请先展示将要合并到主 specs 的需求和场景摘要，确认不会覆盖无关内容。
```

车管筛选可形成这样的能力规范：

```markdown
## ADDED Requirements

### Requirement: 物料发放与维修列表按车管筛选
系统 SHALL 在物料发放、维修列表页提供按车管筛选的能力。

#### Scenario: 按车管筛选物料发放记录
- **WHEN** 用户在物料发放列表选择某个车管
- **THEN** 列表只返回该车管负责车辆相关的物料发放记录

#### Scenario: 按车管筛选维修记录
- **WHEN** 用户在维修列表选择某个车管
- **THEN** 列表只返回该车管负责车辆相关的维修记录
```

如果本次只是很小的 UI 修复，没有规范层面的新增能力，可以跳过 sync，但要在 archive 前说明原因。

---

### STEP 5：归档和收尾

对 Codex 说：

```text
使用 openspec-archive-change 归档 add-vehicle-warden-filter。归档前请检查 artifacts、tasks、delta spec 同步状态，并结合 verification-before-completion 汇总真实验证结果。最后使用 finishing-a-development-branch 给出分支收尾建议。
```

归档前必须有：

- `tasks.md` 全部完成，或明确说明未完成项。
- 前端验证结果。
- 后端验证结果。
- 端到端或接口层面的筛选验证说明。
- 如有 delta spec，说明已 sync 或为什么跳过。

---

## 五、Codex 对话速查

### 探索

```text
使用 openspec-explore 探索 CYTRD-26477：物料发放页面和维修页面增加车管筛选项。结合 Superpowers brainstorming，只读代码和参考实现，不写业务代码。请输出探索结论、风险和建议 change 名称。
```

### 提案

```text
使用 openspec-propose 创建 change：add-vehicle-warden-filter。把探索结论写入 proposal.md、design.md、tasks.md。借用 Superpowers writing-plans 的拆解标准，但产物只写入 openspec/changes/add-vehicle-warden-filter/。
```

### Review artifacts

```text
请 review openspec/changes/add-vehicle-warden-filter 下的 proposal.md、design.md、tasks.md。重点检查字段名、参数格式、ES 字段、索引刷新、验证命令。只改 OpenSpec artifacts，不写业务代码。
```

### 实现

```text
使用 openspec-apply-change 实现 add-vehicle-warden-filter。按 tasks.md 逐条执行，完成一条勾一条。实现中结合 Superpowers 的 TDD、子代理、系统调试和完成前验证。
```

### 同步

```text
使用 openspec-sync-specs 同步 add-vehicle-warden-filter 的 delta spec。先展示合并摘要，再修改主 specs。
```

### 归档

```text
使用 openspec-archive-change 归档 add-vehicle-warden-filter。归档前汇总 artifacts、tasks、spec sync 和验证结果。
```

---

## 六、当前环境注意事项

当前 worktree 中：

```text
.agents/skills/openspec-*     Codex 可用的 OpenSpec skills
.agents/skills/source-command-opsx-*  从 Claude command 迁移来的兼容 skills
.claude/commands/opsx/*       Claude slash commands
.claude/skills/openspec-*     Claude skills
superpowers/skills/*          Superpowers skills 源码
openspec/                     OpenSpec specs 和 changes 目录
```

如果 `openspec` 命令不可用，用 `npx`：

```bash
npx @fission-ai/openspec@latest list --json
npx @fission-ai/openspec@latest status --change "add-vehicle-warden-filter" --json
npx @fission-ai/openspec@latest instructions apply --change "add-vehicle-warden-filter" --json
```

Codex 中不要把 `.claude/commands` 当作唯一入口。对话里明确说“使用 openspec-propose / openspec-apply-change”更稳。

---

## 七、关键心法

**1. OpenSpec 是主档案。**
proposal、design、tasks、specs、archive 都以 `openspec/` 为准。

**2. Superpowers 是行为纪律。**
它帮你保证先想清楚、计划足够细、实现有测试、完成有证据。

**3. 不要让两套文档系统打架。**
需要设计和任务时，优先写 OpenSpec artifacts；Superpowers 的默认 docs 目录只在明确需要时使用。

**4. apply 不是单向流水线。**
实现时发现设计错了，就停下来改 `design.md` / `tasks.md`，再继续。

**5. 验证证据优先。**
没有真实命令输出或明确手工验证记录，不要说完成。

---

*本文是 Codex 版流程文档，基于当前 worktree 的 `.agents/skills`、OpenSpec 和 Superpowers 配置整理。*
