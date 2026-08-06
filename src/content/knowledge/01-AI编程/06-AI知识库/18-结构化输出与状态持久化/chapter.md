# 结构化输出与状态持久化

## 本篇你能学到

- 为什么多 Agent 协作里自由文本输出会让整个流程崩掉
- 用 JSON Schema 约束 subagent 输出，以及状态持久化（`.tech-spec/`、`.ai-workflow/`）的设计思路
- wiki-ingest 8 步流程里的标记位传递机制，以及怎么设计同款的

---

## 🤔 先聊个真实场景

你让一个 subagent 分析一段代码，然后把结论传给另一个 subagent 去生成文档。

第一个 subagent 返回了这样一段话：

> 这个模块主要负责用户鉴权，使用了 JWT 策略，令牌过期时间是 7 天，有一个刷新令牌的逻辑，整体来说安全性还不错，但有几个地方可以优化……

第二个 subagent 收到这段话，尝试从里面解析出"令牌过期时间"——它只能靠语义理解猜，猜对猜错全靠运气。

这就是**自由文本在多 Agent 协作里最致命的问题**：它是给人读的，不是给程序用的。

---

## 📦 结构化输出：让 subagent 说"机器话"

### 什么是结构化输出

结构化输出就是要求 subagent 返回符合预定 Schema 的 JSON，而不是自然语言。

同样的分析结果，结构化版本长这样：

```json
{
  "module": "auth",
  "strategy": "JWT",
  "token_expiry_days": 7,
  "has_refresh_token": true,
  "issues": [
    { "level": "warning", "desc": "refresh token 未设置轮换策略" }
  ]
}
```

下游 agent 拿到这个，直接 `result.token_expiry_days` 就能用，零歧义。

### 怎么在 Skill 里约束输出格式

在 SKILL.md 里用"输出标记位"的方式声明每一步的产出变量：

```markdown
**输出标记位：** `layer` / `target_dir` / `action` / `written_files`
```

这不是装饰性文字——这是 Skill 执行流的契约。每一步执行完，必须把这些变量赋值，后续步骤直接引用，不靠自然语言传递。

以 wiki-ingest 为例，8 步流程的标记位传递链是这样的：

```text
Step 2 产出: layer = "wiki" | "areas"
         ↓
Step 3 产出: target_dir = "wiki/stacks/react"
             type = "guide"
             status = "developing"
         ↓
Step 4 产出: action = "update" | "create"
             target_file = "wiki/stacks/react/hooks.md"
         ↓
Step 6 产出: written_files = ["wiki/stacks/react/hooks.md"]
         ↓
Step 7 产出: nav_updated_files = ["wiki/stacks/react/_index.md"]
```

每一步都明确知道自己要消费什么、产出什么。这就是**标记位机制**的本质——用离散的变量替代连续的叙述文本。

### ✅/❌ 对比

| 场景 | ❌ 自由文本 | ✅ 结构化 JSON |
|------|------------|--------------|
| 下游解析 | 靠 LLM 二次理解，误差叠加 | 直接字段访问，零歧义 |
| 校验 | 无法程序化校验 | 用 JSON Schema 秒验 |
| 调试 | 不知道上游给了什么 | 打印 JSON 即可 |
| 多步接力 | 信息随叙述稀释、变形 | 字段精确传递，无损 |
| 审计轨迹 | 读文字才能回溯 | diff JSON 文件即可 |

> 💡 关键原则：subagent 的输出是**程序的输入**，不是给人看的报告。只要下游有一个步骤需要程序消费，就必须结构化。

---

## 💾 状态持久化：让多步流程可中断可恢复

### 为什么需要持久化状态

一个复杂的 AI 工作流可能有 8 步、10 步，每步都会产出中间结果。如果全部存在 context 里：

- context 越来越长，token 成本线性上升
- 中途失败了，只能从头来
- 没有审计轨迹，不知道某一步产出了什么

**状态持久化就是把中间结果写到文件系统**，让流程变成"检查点式"的推进。

### 常见的状态文件设计

实践中常见两种目录约定：

**`.ai-workflow/`** — 存放当前正在执行的工作流状态

```text
.ai-workflow/
  wiki-ingest-state.json   # 当前 ingest 任务的进度
  last-run.json            # 最近一次执行的完整快照
```

**`.tech-spec/`** — 存放技术决策和规范的持久化输出

```text
.tech-spec/
  api-contracts/
    user-module.json       # 接口约定（结构化）
  decisions/
    2024-06-auth-strategy.md  # ADR（架构决策记录）
```

### wiki-ingest 的状态传递是怎么做的

回到 SKILL.md 里的 8 步流程，每一步的"输出标记位"不只是概念，它对应的就是一组应该持久化的变量：

```json
// .ai-workflow/wiki-ingest-state.json
{
  "step": 4,
  "material": {
    "title": "React Hooks 使用规范",
    "source": "raw/react-hooks-notes.md"
  },
  "layer": "wiki",
  "target_dir": "wiki/stacks/react",
  "type": "guide",
  "status": "developing",
  "action": "update",
  "target_file": "wiki/stacks/react/hooks.md"
}
```

执行到 Step 4 时把这个文件写到磁盘。如果 Step 5 的 LLM 调用超时或报错，下次重跑时读取这个文件，直接从 Step 5 继续，不需要重新解析素材、重新判定分类。

### 实现一个最小可用的状态持久化

```typescript
// 状态文件的类型定义
interface WorkflowState {
  step: number;           // 当前执行到第几步
  task_id: string;        // 任务唯一 ID，用于区分多个并发任务
  layer?: 'wiki' | 'areas';
  target_dir?: string;
  action?: 'update' | 'create';
  target_file?: string;
  written_files?: string[];
  updated_at: string;     // ISO 时间戳，用于判断状态是否过期
}

// 读取或初始化状态
function loadState(taskId: string): WorkflowState {
  const statePath = `.ai-workflow/${taskId}.json`;
  if (fs.existsSync(statePath)) {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  }
  // 不存在则从 Step 1 开始
  return { step: 0, task_id: taskId, updated_at: new Date().toISOString() };
}

// 每步完成后写入检查点
function saveCheckpoint(state: WorkflowState): void {
  const statePath = `.ai-workflow/${state.task_id}.json`;
  state.updated_at = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}
```

使用方式：

```typescript
// 每完成一步，更新状态并持久化
const state = loadState('wiki-ingest-2024-06-09');

// Step 2 完成后
state.step = 2;
state.layer = 'wiki';
saveCheckpoint(state);

// Step 3 完成后
state.step = 3;
state.target_dir = 'wiki/stacks/react';
state.type = 'guide';
saveCheckpoint(state);
```

> 💡 状态文件要放进 `.gitignore`，或者单独放在 `.ai-workflow/` 目录并 ignore 它。这是过程文件，不是交付物。如果需要审计，可以在每次工作流完成后把最终状态归档到 `.tech-spec/`。

---

## 🔗 标记位传递的设计原则

看完 wiki-ingest 的例子，可以总结出几条可以直接复用的设计原则：

**1. 每步声明输入依赖和输出标记位**

```markdown
### Step 3: 判定分类与目标路径
输入依赖: layer（来自 Step 2）
输出标记位: target_dir / type / status
```

任何一步的 SKILL.md 描述里，都要明确说清楚"我消费什么""我产出什么"，不允许模糊的"根据上下文判断"。

**2. 标记位用枚举，不用自由字符串**

```markdown
// ✅ 明确枚举
layer = "wiki" | "areas"
action = "update" | "create"

// ❌ 模糊描述
layer = "可能是 wiki，也可能是 areas，根据内容判断"
```

**3. 后置步骤校验前置标记位**

Step 4 开始执行前，先检查 `layer` 和 `target_dir` 是否已设置。如果缺失，立即报错，不要用默认值掩盖问题：

```bash
# Step 4 执行前检查
if [ -z "$layer" ]; then
  printf '\033[31m[wiki-ingest Step 4] ✗ layer 未设置，Step 2 可能未执行\033[0m\n'
  exit 1
fi
```

**4. written_files 是最终的审计依据**

整个流程里最重要的标记位是 `written_files`。它是 Step 6 的产出，记录了所有实际落盘的文件路径。Step 7 的导航同步、Step 8 的总结报告，都以它为准。

```json
{
  "written_files": [
    "wiki/stacks/react/hooks.md",
    "wiki/stacks/react/_index.md"
  ],
  "nav_updated_files": [
    "wiki/stacks/react/_index.md",
    "wiki/README.md"
  ]
}
```

---

## 小结

结构化输出和状态持久化本质上是同一件事的两个维度：**让 AI 工作流变得可预期、可校验、可恢复**。

结构化输出解决的是"这一步产出了什么"的问题——用 JSON Schema 约束，而不是自由叙述。状态持久化解决的是"流程执行到哪了"的问题——用状态文件做检查点，而不是全靠 context 记忆。

wiki-ingest 的 8 步流程把这两个模式结合得很好：每步的输出标记位是结构化的（`layer`、`target_dir`、`action`、`written_files`），这些标记位可以持久化成状态文件，让整个 ingest 流程支持中断恢复和审计回溯。

设计自己的 Skill 时，优先把"标记位 → 状态文件 → 下游消费"这条链路想清楚，流程的健壮性会高出一个量级。
