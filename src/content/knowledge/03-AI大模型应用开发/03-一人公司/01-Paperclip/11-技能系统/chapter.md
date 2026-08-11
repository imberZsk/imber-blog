# Paperclip（10）- 技能系统：给 Agent 装「外挂」

> 本章目标：搞懂技能（Skill）是什么、怎么被按需加载、怎么注入到 Agent 运行时。会写出一个合格的 `SKILL.md`，掌握「把 description 写成路由逻辑」的核心技巧，了解第三方技能的安全注意事项。

到这里你的 AI 公司已经能跑、能协作、能被治理了。但 Agent 的能力是「天生」的吗？不全是——你可以给它装**技能（Skills）**，相当于给员工做培训、发工具。

---

# 一、技能是什么？

> **技能是可复用的指令，Agent 在心跳里按需调用。本质是带 YAML frontmatter 的 markdown 文件，教 Agent 怎么完成某类特定任务。**

打个比方：心跳协议是「岗位 SOP」（每个 Agent 都遵守），而技能是「专项操作手册」——比如「怎么剪视频」「怎么把计划转成任务」「怎么雇一个新 Agent」。Agent 遇到相关任务时，翻开对应手册照着做。

---

# 二、技能的目录结构

一个技能是一个目录，核心是 `SKILL.md`：

```
skills/
└── my-skill/
    ├── SKILL.md          # 主文档
    └── references/        # 可选的支撑文件
        └── examples.md
```

---

# 三、SKILL.md 的格式

```markdown
---
name: my-skill
description: >
  简短描述这个技能干什么、什么时候用。
  这其实是「路由逻辑」——Agent 读这段来决定
  要不要加载完整技能内容。
---

# My Skill

给 Agent 的详细指令...
```

## 3.1 Frontmatter 两个字段

- **name**：技能唯一标识（kebab-case 短横线命名）。
- **description**：**路由描述**——告诉 Agent 什么时候该用这个技能。**把它写成决策逻辑，不是营销文案。**

---

# 四、技能在运行时怎么工作（按需加载）

这是技能机制的精髓——**渐进式加载**：

```
① Agent 在上下文里只看到技能的元数据（name + description）
        │
② Agent 判断「这个技能和我当前任务相关吗？」
        │
   相关 ──▶ ③ 加载完整 SKILL.md 内容
        │
④ Agent 照着技能里的指令干活
```

**为什么这么设计？** 为了**保持基础 prompt 精简**。如果把所有技能全文都塞进 Agent 上下文，token 爆炸且分散注意力。只加载 name+description（很短），真正用到时才加载全文——这和第 06 章「session 持久化」一样，都是「省 token + 保持专注」的设计哲学。

> 💡 这就是为什么 description 极其重要：它是 Agent 决定「要不要展开这个技能」的唯一依据。description 写不好，技能要么从不被用，要么被乱用。

---

# 五、看一个真实例子

Paperclip 自带的 `paperclip-create-agent` 技能（教 Agent 怎么雇人），它的 frontmatter 是这么写的：

```markdown
---
name: paperclip-create-agent
description: >
  Create new agents in Paperclip with governance-aware hiring. Use when you need
  to inspect adapter configuration options, compare existing agent configs,
  draft a new agent prompt/config, and submit a hire request.
---
```

注意 description 的写法——它明确说了「**Use when（什么时候用）**：当你需要检查适配器配置、对比现有 Agent 配置、起草新 Agent 配置、提交雇人请求时」。这就是「路由逻辑」：Agent 一读就知道「我现在是不是在干这件事」。

技能正文则给出**具体可执行的步骤**（带真实命令）：
```sh
# 1. 确认身份和公司上下文
curl -sS "$PAPERCLIP_API_URL/api/agents/me" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"

# 2. 发现这个实例的适配器配置选项
curl -sS "$PAPERCLIP_API_URL/llms/agent-configuration/claude_local.txt" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

> 看出门道了吗？好技能 = **精准的路由 description** + **具体到能照抄的命令**。

---

# 六、技能怎么被注入到 Agent？

技能不是凭空出现在 Agent 面前的，**适配器负责让技能可被发现**：

- **`claude_local` 适配器**：建一个临时目录，把 Paperclip 技能软链进去，通过 `--add-dir` 传给 Claude Code。这样技能可见，又不污染 Agent 的工作目录。
- **`codex_local` 适配器**：用全局技能目录。

> 回顾第 06 章：这就是 `claude_local` 「技能注入」那一节讲的机制。不同适配器注入方式不同，但目的一样：让 Agent 在心跳里能发现并加载技能。

---

# 七、编写技能的最佳实践（官方 + 实战）

- ✅ **description 写成路由逻辑**：包含「use when（何时用）」和「don't use when（何时别用）」的指引，而不是夸技能多厉害。
- ✅ **具体、可执行**：Agent 要能照着做而没有歧义。给真实命令、真实 API 调用，比一堆散文可靠得多。
- ✅ **一个技能一个关注点**：别把不相关的流程塞进一个技能。聚焦单一职责（这和第 10 章之前讲的「原子 Agent」是同一种思想）。
- ✅ **支撑细节放 `references/`**：别让主 SKILL.md 臃肿。核心步骤放正文，详细参考资料放 references。

---

# 八、第三方技能的安全注意事项

视频里创始人特别提到：可以通过 `skills.sh` 之类机制给 Agent 装第三方技能（比如 Remotion 视频编辑能力），但——

> ⚠️ **第三方技能的安全性需要警惕。** 技能本质是「给 Agent 的指令」，而 Agent（尤其 `claude_local` 默认 `dangerouslySkipPermissions=true`）在它的 `cwd` 里权限很大。一个恶意或写得糟糕的技能，可能诱导 Agent 执行危险操作。

实战建议：
- 装第三方技能前**读一遍它的 SKILL.md**，看它让 Agent 干什么。
- 给装了不可信技能的 Agent 用**受限的 `cwd`** 和**较小的预算**。
- 关键操作仍走**审批闸门**（第 09 章），别让技能绕过治理。

---

# 九、常见错误

- ❌ **description 写成营销文案**（「这是个超强的视频技能！」）
  → Agent 没法据此判断何时用，技能形同虚设。要写「use when...」。

- ❌ **一个技能塞多个不相关流程**
  → Agent 难以判断相关性，也难维护。一技能一职责。

- ❌ **技能正文全是抽象描述，没有具体命令**
  → Agent 执行时充满歧义、容易出错。给可照抄的命令。

- ❌ **主 SKILL.md 塞满细节**
  → 加载时 token 浪费、重点淹没。细节挪 `references/`。

- ❌ **无脑装第三方技能**
  → 安全风险。先读再用，配受限环境。

---

# 十、最佳实践小结

把写技能当成「给一个能干但需要明确指令的新人写操作手册」：

1. 标题页（description）写清「**遇到 X 情况翻开我**」。
2. 正文给「**第一步做这个、第二步做那个**」的具体步骤和命令。
3. 一本手册只讲一件事。
4. 厚重的参考资料附在后面（references），别写进首页。

---

# 十一、总结

- 技能 = **可复用的指令文件（SKILL.md）**，Agent 心跳里按需调用。
- **按需加载**：先看 name+description 决定相关性，相关才加载全文——省 token、保专注。
- **description 是路由逻辑**：写「何时用/何时别用」，这是技能好坏的关键。
- 技能由**适配器注入**（`claude_local` 用 `--add-dir`）。
- 第三方技能有**安全风险**：先读再用、配受限环境、保留审批闸门。

进阶篇到此结束。你已经掌握了创建公司、选适配器、心跳、协作、治理、技能这六大核心机制。下一篇进入**实战篇**，把这一切串成一条完整链路，亲手搭一家内容公司。👉 [11 · 实战：从 0 搭一家内容公司](../12-实战搭建内容公司/chapter.md)
