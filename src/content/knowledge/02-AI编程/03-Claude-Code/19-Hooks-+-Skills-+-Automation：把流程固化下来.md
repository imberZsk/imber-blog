# Claude Code（19） - Hooks + Skills + Automation：把流程固化下来

> 本章目标：用 Hooks 在工具调用前后插自动检查，用 Skills 沉淀可复用工作流，用 Automation 定时自动跑。
> 学完你能：把团队规范和重复流程固化，让它从交互工具变成持续运行的助手。

---

这一章把三个「固化」能力放一起讲，因为它们是层层递进的：**Hooks 管「每步自动做什么」，Skills 管「整套流程怎么做」，Automation 管「这套流程何时自动跑」。**

---

# 一、Hooks：在关键节点自动插入动作

Hooks 让你在 Claude Code 的**特定时机**自动执行一段命令或检查，不用每次嘴说。常见时机（事件）：

- **PreToolUse**：工具调用**之前**（比如写文件前先校验）；
- **PostToolUse**：工具调用**之后**（比如改完文件自动跑格式化/扫描）；
- 还有会话开始（SessionStart）、停止（Stop）等。

## 1.1 例子：改完文件自动安全扫描

在配置里挂一个 PostToolUse hook，匹配 `Write|Edit`，改完就调用一个扫描工具：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint --silent"
          }
        ]
      }
    ]
  }
}
```

这样它**每次写/改文件后都会自动跑 lint**——团队规范从「靠自觉」变成「自动执行」。

> Hooks 还能匹配 MCP 工具（如 `mcp__memory__.*`），在外部工具调用前后做日志/校验。

---

# 二、Skills：把整套工作流沉淀成模板

有些任务**反复出现**：PR 审查、日志分析、发布说明生成、标准调试流程。每次用提示词手敲一遍，既累又容易不一致。

**Skill** = 把一套工作流封装成**可复用的结构化模板**。它把原本散在提示里的执行逻辑抽象出来，下次遇到同类任务，Claude 自动套用同一套流程。

判断要不要做成 Skill 的经验法则：

> **如果某段提示词或流程被反复使用，它就该被沉淀成一个 Skill。**

和第 10 章的自定义命令相比：命令偏「一段提示一键发」，Skill 偏「一整套带步骤、可被自动应用的工作流」。随着 Skill 库积累，它的行为越来越稳定、可预测。

---

# 三、Automation：让稳定流程自动运行

当一个 Skill 已经能稳定执行，下一步就是**让它自动跑**，不用每次手动触发。很多任务有明显周期性：

- 定期生成 commit 总结
- 自动检查 CI 失败原因
- 扫描潜在 bug / 异常日志
- 生成开发日报、周报

**Automation** 决定「**任务何时触发、如何持续运行**」（基于第 17 章的定时任务能力）。比如一个「生成发布说明」的 Skill 可以配成：

- 每次版本发布时触发；
- 每周自动生成一次；
- CI 完成后自动运行。

> 关系：**Skill 定义「怎么做」，Automation 定义「何时做、持续做」。** 它让 Claude Code 从「交互式工具」变成「后台持续运行的助手」。

---

# 四、三者怎么配合（一张图理解）

```
Hooks       →  每个工具调用前后，自动做检查/格式化        （细粒度、即时）
   ↑
Skills      →  把一整套重复流程封装成可复用模板            （流程级、可套用）
   ↑
Automation  →  让稳定的 Skill 按时间/事件自动触发运行       （调度级、无人值守）
```

由细到粗、由手动到自动，一步步把你的经验「固化」成资产。

---

# 五、常见错误

**错误 1：把一次性的事做成 Skill**
只用一次的流程，沉淀成 Skill 是过度工程。**反复出现才值得封装。**

**错误 2：Hook 里跑很慢/会卡的命令**
PostToolUse 跑个几分钟的任务，会拖垮每次编辑的体验。→ Hook 里放**快速**的检查（lint、格式化），重活另开任务。

**错误 3：还没稳定就上 Automation**
一个流程本身还经常出错，就让它无人值守自动跑，会放大问题。→ **先在交互里跑稳，再自动化。**

**错误 4：自动化跑高危操作不设防**
无人值守 + 删改生产数据 = 危险。→ 自动化流程严守权限边界，高危操作要么不放进去，要么留人工确认。

---

# 六、最佳实践

1. **反复三次以上才固化**：偶尔用对话解决就行，反复才值得做成 Skill/Hook。
2. **Hook 保持轻快**：只放快速检查，别拖慢每步操作。
3. **先稳后动**：流程在交互里验证稳定，再交给 Automation 无人值守。
4. **自动化守住安全**：高危操作不进自动流程，或保留确认。
5. **分层用对工具**：即时检查→Hooks，流程复用→Skills，定时无人值守→Automation。

---

# 七、总结

- **Hooks**：在工具调用前后（PreToolUse/PostToolUse 等）**自动执行检查/动作**，把规范变自动。
- **Skills**：把**反复出现的整套流程**封装成可复用模板，行为更稳定。
- **Automation**：让稳定的 Skill **按时间/事件自动触发**，变身持续运行的助手。
- 递进关系：Hooks（即时）→ Skills（流程）→ Automation（调度），由手动到无人值守。

自主运行篇到此完成。下一篇「远程与无头篇」，让它彻底脱离你的终端——手机、网页、CI 里都能干活。👉 `20-远程控制.md`

<!-- knowledge-lab-merged -->

# 动手实践：Demo 18 · Hooks 配置（可直接用）+ Skill/Automation 说明

提供一份**可直接复制**的 Hooks 配置：每次 Write/Edit 后自动跑 lint。外加 Skill 与 Automation 的设计清单。

## 文件
- `settings.hooks.example.json`：PostToolUse hook 示例，改完文件自动 lint。
- `固化清单.md`：什么时候用 Hooks / Skills / Automation。

## 怎么用 Hooks
把 `settings.hooks.example.json` 里的 `hooks` 段合并进你项目的 `.claude/settings.json`，把命令换成你项目真实的 lint/格式化命令即可。

<!-- knowledge-practice-materials-merged -->

## 配套实践材料

以下材料已并入正文，便于阅读时直接对照和练习。

### `固化清单.md`

````markdown
# 固化三层：用对工具

## Hooks（即时、细粒度）
- 时机：PreToolUse（调用前）/ PostToolUse（调用后）/ SessionStart / Stop
- 适合：改完文件自动 lint/格式化、写文件前校验、调用前后记日志
- 原则：只放"快"的命令，别拖慢每步

## Skills（流程级、可复用）
- 把反复出现的整套流程封装成模板：PR 审查、日志分析、发布说明、标准调试
- 判断法则：某段提示/流程被反复用 → 沉淀成 Skill

## Automation（调度级、无人值守）
- 让稳定的 Skill 按时间/事件自动触发：每周周报、CI 后自动跑、发布时触发
- 原则：先在交互里跑稳，再自动化；高危操作不进自动流程

## 递进关系
Hooks（每步即时）→ Skills（整套流程）→ Automation（何时自动跑）
````

## 参考资料

- [Claude Code 文档](https://docs.anthropic.com/en/docs/claude-code/overview)
- [Claude Code 安全](https://docs.anthropic.com/en/docs/claude-code/security)
