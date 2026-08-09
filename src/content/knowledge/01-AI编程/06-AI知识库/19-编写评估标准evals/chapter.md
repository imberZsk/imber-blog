# 编写评估标准 evals

## 本篇你能学到

- 为什么 Skill 需要 evals，它解决了什么问题
- 真实 evals.json 的格式，以及怎么写一个有区分度的用例而不是摆设
- eval 驱动开发（EDD）的工作节奏：先写 eval，再写 SKILL.md，最后验证

---

## Skill 是文档即代码，没有单元测试

写完一个 Skill，你怎么知道它"好不好用"？

传统的函数可以写断言，接口可以写集成测试，但 SKILL.md 是纯自然语言的提示词，没有可以 `assert` 的执行路径。改了一行措辞，AI 的行为可能截然不同，而你没有任何预警。

evals 就是来填这个坑的。

它本质上是一组**预设的输入场景 + 期望行为描述**，记录在 `evals/evals.json` 文件里。你用它来：

1. 在写 Skill 之前，把"我期望这个 Skill 做什么"用 case 描述清楚
2. 在改了 SKILL.md 之后，逐条比对 AI 实际产出是否还符合预期
3. 给团队其他人提供一个"Skill 能干什么"的可执行说明书

> 💡 evals 不是自动化测试框架，它没有 CI/CD 集成和断言机制。它更像一份"验收清单"——你拿着它，人工或半自动地判断 Skill 有没有退化。

---

## 真实 evals.json 长什么样

直接看插件仓库里的真实案例。`action-coder` 插件的 evals 格式如下：

```json
{
  "name": "action-coder",
  "version": "0.1.0-alpha1",
  "evals": [
    {
      "id": "list-page-basic",
      "description": "列表页：技术方案 + Figma → 4-Phase EXECUTION_PLAN.md",
      "input": {
        "specFile": "evals/fixtures/user-manage-spec.md",
        "figmaUrl": "https://www.figma.com/design/xxx/...",
        "targetPackage": "@template/ai-driven-user"
      },
      "expectedOutputs": [
        "Phase 0 包含 Figma Node ID 验证结果表",
        "Phase 0 所有 INVALID 节点已尝试补全",
        "Phase 1A 包含 types.ts 完整 Props 接口定义",
        "Phase 1A 包含 api.ts 完整函数实现（非仅签名）",
        "Phase 1B 按模块划分，每个模块 1-3 个区块"
      ]
    }
  ]
}
```

字段逐一拆解：

| 字段 | 类型 | 含义 |
|------|------|------|
| `name` | string | Skill 名称，和插件目录名保持一致 |
| `version` | string | 当前 evals 的版本，Skill 有破坏性更新时应递增 |
| `id` | string | 用例唯一标识，建议用短横线命名，便于在 review 时引用 |
| `description` | string | 一句话描述这个 case 在测什么场景 |
| `input` | object | 触发 Skill 时传入的参数，字段结构随 Skill 功能不同而不同 |
| `expectedOutputs` | array | 期望 AI 产出中必须出现的结论/结构/内容，每条是一个检查项 |

另一个风格稍有不同的例子来自 `figma-to-react-semi`：

```json
{
  "skill_name": "figma-to-react-semi",
  "evals": [
    {
      "id": 1,
      "prompt": "我有一个 Figma 设计文件 https://figma.com/design/abc123/LandingPage?node-id=1-2，这是一个简单的落地页……请帮我转换成 React + Semi Design 代码，并生成验收报告。",
      "expected_output": "生成完整的 React 项目结构，包括：1) pages/LandingPage.tsx 主页面文件；2) blocks/ 目录下的 Header.tsx、Hero.tsx、Footer.tsx 三个区块组件……",
      "files": []
    }
  ]
}
```

这个格式里 `input` 直接写成了自然语言 `prompt`，`expectedOutputs` 合并成了一段 `expected_output` 文本。

两种风格都在生产中使用，没有强制标准。不同之处在于：

| | `action-coder` 风格 | `figma-to-react-semi` 风格 |
|--|--|--|
| 输入描述 | 结构化字段（specFile、figmaUrl…） | 自然语言 prompt |
| 期望描述 | 独立的 checklist 数组 | 连续段落文本 |
| ✅ 适合 | Skill 有明确参数结构 | Skill 的触发方式就是自由对话 |
| ❌ 不适合 | 输入无法提前参数化的场景 | 需要逐条自动比对时 |

> 💡 如果 Skill 的 `input` 字段没有固定结构，用 `prompt` 风格更自然；如果需要后续接自动化评估脚本，`expectedOutputs` 数组更便于机器解析。

---

## 一个好的 eval 用例应该有区分度

写 eval 最常见的问题：**期望描述太模糊，测不出退化**。

对比下面两种写法：

| | 写法 | 问题 |
|--|--|--|
| ❌ | `"生成 React 代码"` | AI 随便输出点什么都能通过，毫无约束力 |
| ❌ | `"代码质量好，结构清晰"` | 没有可验证的判断标准，每次评估结论不一致 |
| ✅ | `"Phase 1A 包含 api.ts 完整函数实现（非仅签名）"` | 明确指出文件名、内容层级，AI 少一个步骤就失败 |
| ✅ | `"补全失败的节点标记为 MISSING，Phase 1B 跳过该区块"` | 描述了特定 edge case 的处理结果，有确定的 pass/fail 边界 |

写 `expectedOutputs` 时的心理模型：

> 想象一个新同事拿到 AI 的输出，对照你写的这条期望，他能在 30 秒内判断出"通过"还是"不通过"。

如果做不到，说明这条期望太模糊。

好的 eval 用例通常覆盖三类场景：

**主流程（Happy Path）** — 标准输入，验证核心产出
```json
{
  "id": "wiki-query-basic",
  "description": "基础查询：问题命中 wiki 分区，返回答案带引用来源表",
  "input": {
    "prompt": "React 组件怎么做性能优化？"
  },
  "expectedOutputs": [
    "答案末尾包含「引用来源」表格",
    "引用路径以 wiki: 前缀开头",
    "输出 [wiki-query Step 1] 至 [wiki-query Step 8] 的进度日志"
  ]
}
```

**边缘场景（Edge Case）** — 异常输入，验证降级处理
```json
{
  "id": "wiki-query-out-of-scope",
  "description": "范围外问题：后端 SQL 优化问题，Skill 应拒绝并说明范围",
  "input": {
    "prompt": "MySQL 慢查询怎么优化？"
  },
  "expectedOutputs": [
    "输出 [wiki-query Step 6] 标注「该问题超出前端知识库范围」",
    "不输出 AI 编造的 SQL 优化答案",
    "提示用户使用对应方向工具查询"
  ]
}
```

**回归场景（Regression）** — 记录曾经出现过的 bug，防止复现
```json
{
  "id": "wiki-query-no-hallucination",
  "description": "回归：知识库无内容时，不应编造答案",
  "input": {
    "prompt": "我们团队的 WebSocket 重连策略是什么？"
  },
  "expectedOutputs": [
    "Step 3-5 均未命中后，进入 Step 6",
    "输出「以下内容来自 AI 训练知识，非前端知识库」的标注",
    "询问用户是否将答案沉淀到知识库"
  ]
}
```

---

## eval 驱动开发（EDD）的工作节奏

类比 TDD（测试驱动开发），给 Skill 开发也可以用 EDD 的节奏：

```text
① 先写 eval → ② 再写 SKILL.md → ③ 用 eval 验证
```

**第一步：写 eval，把期望说清楚**

在还没写一行 SKILL.md 之前，先把"这个 Skill 应该做什么"翻译成 eval 用例。这个过程会暴露你对需求的模糊认知——当你发现 `expectedOutputs` 写不出来，说明你还没想清楚这个 Skill 的边界在哪。

**第二步：写 SKILL.md，让 AI 能执行**

有了 eval 作为靶子，写 SKILL.md 时目标更清晰：每个流程步骤，都在为某个 eval 的期望服务。

**第三步：验证**

拿着每个 eval 用例，按 `input` 构造一次真实调用，把 AI 的输出和 `expectedOutputs` 逐条比对。

目前插件市场没有内置自动化 eval runner，验证是手动进行的。但文件格式已经为机器可读设计，后续可以接脚本：

```bash
# 伪代码：用脚本批跑 evals
for eval in evals.json:
    output = invoke_skill(eval.input)
    for expectation in eval.expectedOutputs:
        assert expectation in output  # 模糊匹配或 LLM 判断
```

**改 Skill 时的保护动作**

Skill 不是一次写完就不动的。每次修改 SKILL.md 后，把所有 eval 用例重新跑一遍，确认没有引入退化。这是目前唯一可靠的保护手段。

---

## evals 目录结构

完整的 Skill 目录建议这样组织：

```text
plugins/
  my-skill/
    skills/
      my-skill/
        SKILL.md        ← Skill 定义
    evals/
      evals.json        ← 评估用例
      fixtures/         ← eval 用到的测试数据文件
        sample-spec.md
        sample-input.json
```

`fixtures/` 存放 eval `input` 中引用的文件，例如 `action-coder` 的 `evals/fixtures/user-manage-spec.md` 就是一个完整的技术方案 Markdown，eval 触发时当作真实输入传入。

> 💡 fixtures 文件不要随便改。它们是 eval 的"测试数据"，一旦修改，历史对比结果就失效了。如果需要测新场景，新建一个 fixture 文件，给 eval 用例单独的 `id`。

---

## 小结

evals.json 是 Skill 的质量保障手段，解决的是"SKILL.md 改了之后，我怎么知道没有退化"的问题。一个有效的 eval 用例有三个要素：明确的输入场景、可验证的期望产出、有区分度的 pass/fail 边界。

写 Skill 的推荐节奏是：先写 eval 把期望定义清楚，再写 SKILL.md 驱动 AI 产出，最后用 eval 验收。这不是额外的工作，而是在写 SKILL.md 之前就把需求想清楚的过程——写 eval 时暴露的模糊认知，比上线后踩坑的代价小得多。
