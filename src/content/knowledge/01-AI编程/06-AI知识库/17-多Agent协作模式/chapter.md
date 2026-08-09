# 多 Agent 协作模式

## 本篇你能学到

- 为什么要用多 Agent：单 Agent 处理复杂任务的上下文污染问题
- 并行 vs 串行的取舍逻辑，以及人工审批检查点该加在哪里
- 用 `action-coder` 和 `figma-to-react-semi` 拆解真实多 Agent 架构

---

## 🤔 为什么需要多 Agent？

你用 Claude 做一个"从 PRD 到代码"的完整任务，会遇到一个现实问题：**上下文爆了**。

扫描项目文件、读 Figma、分析技术方案、生成组件代码、跑视觉校验……每一步都往上下文里塞东西。等到真正写代码的时候，前面的信息已经挤满了窗口，模型开始"忘事"，生成质量肉眼可见地下降。

多 Agent 模式的核心思路很简单：**把一个大任务拆成若干子任务，每个子任务跑在独立的 subagent 上下文里**。子任务只看自己需要的信息，干完了把结果以结构化 JSON 的形式传回给主 Agent 或者写到文件里。

好处有三个：

1. **上下文隔离**：每个 subagent 的上下文不会被其他任务的中间产物污染，质量更稳定
2. **可并行**：没有依赖关系的子任务可以同时跑，速度大幅提升
3. **可追溯**：每个 subagent 的输入输出都是明确的 JSON，出了问题知道是哪一段的锅

---

## 📦 状态持久化：文件是天然的通信总线

多个 Agent 之间怎么共享信息？最简单也最可靠的方式是**写文件**。

`action-coder` 插件的做法是个典型示范：

- `generate` skill 执行完后，把所有约束写入 `.action-spec/` 目录
  - `.action-spec/contracts/types.ts`：Props 接口定义
  - `.action-spec/contracts/api.ts`：API 函数签名
  - `.action-spec/contracts/hooks.ts`：数据层 hooks 骨架
  - `.action-spec/components/MessageItem.json`：每个组件的布局约束和元素白名单
  - `.action-spec/layout.json`：页面级布局结构
  - `.action-spec/EXECUTION_PLAN.md`：执行计划（含各阶段 checkbox）

- `execute` skill 启动后，所有 subagent 都从这个目录读取约束，而不是靠主 Agent 把信息塞到 prompt 里

这个设计的妙处在于：**文件是无状态的，任何时刻中断都能从断点恢复**。`EXECUTION_PLAN.md` 里的 `[x]` checkbox 就是进度标记，下次启动直接检查哪些步骤已经完成，跳过不重跑。

```text
Phase 1（contracts 直写）：[x] 已完成
Phase 2（数据层）：[x] 已完成
Phase 3（UI 层）：
  - [x] Module 1 — MessageList
  - [ ] Module 2 — MessageDetail  ← 从这里继续
Phase 4（集成验证）：[ ] 待执行
```

---

## ⚡ 并行 vs 串行：不是越并行越好

这是多 Agent 设计里最容易出错的决策点。拿 `action-coder:execute` 来说，它的执行顺序是：

```text
Phase 1（contracts）→ Phase 2（数据层）→ Phase 3（UI 层）→ Phase 4（集成验证）
```

Phase 1、2、3、4 **严格串行**。这个设计不是偷懒，是因为有真实的数据依赖：

- Phase 3 的 `block-generator` subagent 生成组件代码时，需要 import Phase 1 已经写入的 `types.ts` 里的 Props 接口
- 如果 Phase 1 还没跑完就启动 Phase 3，subagent 去读 `types.ts` 会发现文件不存在，生成的代码里就是一堆 `// TODO: 类型未定义`

但是到了 **Phase 3 内部**，情况就不一样了。Phase 3 里有多个 UI 模块（Module 1、Module 2、Module 3……），这些模块之间没有依赖关系，可以**并行**跑：

```javascript
// Phase 3：对每个 Module 同时启动（run_in_background: true）
Agent({
  subagent_type: "action-coder:module-executor",
  run_in_background: true,  // 关键：后台并行
  description: "生成 Module 1 — MessageList",
  prompt: `
moduleName: MessageList
blocks: [{ name: "MessageItem", nodeId: "123:456", ... }]
planPath: .action-spec/EXECUTION_PLAN.md
  `
})

Agent({
  subagent_type: "action-coder:module-executor",
  run_in_background: true,  // 同时启动
  description: "生成 Module 2 — MessageDetail",
  prompt: `...`
})
```

`figma-to-react-semi` 的区块生成也是同一个逻辑：阶段 2 对每个 UI 区块（Header、Hero、Features、Footer）同时起 `block-generator` subagent 并行生成，然后等全部完成后，阶段 3 再统一组装页面。

| 场景 | 策略 | 原因 |
|------|------|------|
| Phase 1 → Phase 2 → Phase 3 | ✅ 串行 | Phase 3 依赖 Phase 1 的产出文件 |
| Phase 3 内多个 Module | ✅ 并行 | 各模块之间无依赖，互不干扰 |
| Module 内多个 Block | ✅ 串行 | 同一 module-executor 里顺序处理，避免文件竞争 |
| 视觉验证 + 代码生成 | ✅ 先生成后验证 | 验证依赖生成结果 |

**判断原则**：有文件依赖（A 写的文件 B 要读）或逻辑依赖（A 的输出是 B 的输入）→ 串行。没有依赖 → 并行。

---

## 🚦 人工审批检查点：加在哪里？

人工审批的本质是**在不可逆或高成本操作发生前，让人确认一下**。加太多会让流程像走审批流一样烦，加太少会出现"AI 自作主张跑了一个小时然后结果全错"的情况。

`action-coder:generate` 里有三个检查点，设计得很合理：

**检查点 1：技术方案解析后**

```text
Step 1 输出：
  组件列表：MessageList（节点 123:456）、MessageDetail（节点 123:789）
  pathMap：
    api   → apps/ai-driven-user/src/api/index.ts（追加）
    store → apps/ai-driven-user/src/store/messageStore.ts（新建）
    types → apps/ai-driven-user/src/views/message-center/types.ts

等待用户确认后继续...
```

为什么在这里停？因为如果技术方案解析错了（比如 pathMap 搞错了位置），后续所有步骤生成的代码都会写到错误的路径。**修正一个 pathMap 比重新生成几十个文件要便宜得多**。

**检查点 2：Figma 节点验证后**

```text
Step 3 输出：
  123:456（MessageList）— ✓ 有效
  123:789（MessageDetail）— ✗ 无效，已补全为 123:791

等待用户确认后继续...
```

Figma 节点 ID 失效是常事（设计师移动了图层、重命名了 Frame）。在花时间生成执行计划之前，先让用户确认节点映射是否正确，避免拿着错误的节点 ID 生成一份废计划。

**检查点 3：execute 开始前**

```text
即将执行：Phase 1 → Phase 2 → Phase 3（3 个模块，7 个区块）→ Phase 4

确认后开始执行。
```

这个检查点是给用户最后一次"后悔"的机会。因为 execute 会真正写入代码文件，这是一个不可逆操作（虽然有 git，但还是麻烦）。

> 💡 **规律**：检查点应该设在"信息汇总完毕、即将开始大量写入"的边界处，不是每一步都要停。`action-coder` 的三个检查点分别卡住了：解析结果确认、输入验证确认、不可逆写入前确认。

---

## 🏗️ 完整架构图：action-coder 的两段式设计

```text
用户输入：技术方案.md + Figma 链接 + 目标项目
         ↓
action-coder:generate（主 skill）
  ├── Step 1：解析技术方案
  │   └── ① action-spec-builder subagent（隔离上下文）
  │       读 .tech-spec/outputs/*.json → 写 .action-spec/ 目录
  │   └── [检查点 1] 用户确认解析结果
  │
  ├── Step 3：Figma 验证
  │   └── [检查点 2] 用户确认节点映射
  │
  └── Step 4~5：生成并写入 EXECUTION_PLAN.md
         ↓
         [检查点 3] 用户确认执行

action-coder:execute（主 skill）
  ├── Phase 1：contracts 直写（主上下文，串行）
  ├── Phase 2：数据层（主上下文，串行）
  ├── Phase 3：UI 层（并行 subagent）
  │   ├── ② module-executor（Module 1，隔离上下文）
  │   │   ├── 读 .action-spec/components/MessageList.json
  │   │   ├── 调 Figma MCP get_design_context
  │   │   ├── 写组件文件
  │   │   └── ③ visual-checker subagent 验证
  │   └── ④ module-executor（Module 2，隔离上下文，并行）
  │       └── ...
  └── Phase 4：集成验证（主上下文，串行）
```

每个 subagent（action-spec-builder、module-executor、visual-checker）都在自己的隔离上下文里运行。它们只看自己需要的文件，产出写到约定好的路径，主 skill 通过文件感知结果，而不是通过 prompt 传递大量中间状态。

---

## 🎨 figma-to-react-semi 的并行模式

`figma-to-react-semi` 的多 Agent 设计更直接地展示了"并行的价值"：

阶段 1 拆块之后，一个包含 Header、Hero、Features、Footer 四个区块的页面，阶段 2 会同时起 4 个 `block-generator` subagent：

```javascript
// 四个 subagent 同时启动，互相不干扰
Agent({ subagent_type: "block-generator", description: "生成 Header 区块", prompt: `...` })
Agent({ subagent_type: "block-generator", description: "生成 Hero 区块", prompt: `...` })
Agent({ subagent_type: "block-generator", description: "生成 Features 区块", prompt: `...` })
Agent({ subagent_type: "block-generator", description: "生成 Footer 区块", prompt: `...` })
```

每个 `block-generator` 只需要关心：Figma 的设计上下文、当前区块要用哪些 Semi Design 组件、CSS 框架是什么、输出到哪个路径。它不知道也不需要知道其他区块的存在。

4 个区块并行生成，耗时接近单个区块的时间，而不是 4 倍。这就是隔离上下文 + 并行的价值。

阶段 4 的验收（`validator` subagent）则是单独起一个 Agent，专门负责读取生成的代码、截取 Figma 截图、做结构和视觉对比，产出 `VALIDATION_REPORT.md`。它的职责非常单一，不会被代码生成的上下文干扰。

---

## 🪞 彩蛋：这本小册本身就是多 Agent 并行的产物

这本小册的 17 篇文章，并不是一篇一篇线性写出来的。

写作流程是这样的：一个编排 Agent 持有全部章节目录，把每一篇的写作任务分配给独立的 subagent，每个 subagent 只看自己那一篇的要求和相关素材，写完后输出文件。多个 subagent 同时工作，整本小册的生产速度大约是单线程的 5~8 倍。

这种"并行写作 + 并行审查"的模式，和 `figma-to-react-semi` 的多区块并行生成在结构上是完全一样的：

| 写作流程 | 代码生成流程 |
|---------|------------|
| 章节目录 | 区块拆解清单 |
| 写作 subagent | block-generator subagent |
| 每篇文章 .md 文件 | 每个区块组件文件 |
| 审稿 subagent | visual-checker subagent |

**多 Agent 不是代码生成专属的技术，它是一种通用的任务拆分和并行执行模式。**

---

## 小结

多 Agent 协作的核心是三件事：**隔离上下文**（避免信息污染，可并行）、**文件作为通信总线**（状态持久化，支持断点恢复）、**审批检查点设在高成本操作的入口**（不是每步都停，而是关键节点才停）。

并行还是串行，不是技术喜好问题，是依赖关系决定的。`action-coder` 的 Phase 1→2→3 严格串行，Phase 3 内的模块严格并行，这两个决策背后都有具体的文件依赖逻辑支撑。

下一篇我们会聊 Skill 的测试和评估（evals），看怎么验证一个 Skill 的行为是否符合预期。
