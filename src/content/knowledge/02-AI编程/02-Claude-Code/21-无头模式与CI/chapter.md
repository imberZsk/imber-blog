# Claude Code（20）- 无头模式与 CI：claude -p、GitHub Actions、SDK

> 本章目标：用 `claude -p` 做脚本/CI 自动化；接入 GitHub Action；了解 Agent SDK 编排。
> 学完你能：在 CI 里让它自动 review PR、改代码，或用 SDK 把它嵌进自己的程序。

---

# 一、什么是「无头模式」

前面都是「交互式」——你在终端里和它一来一回。但要把它放进**脚本、CI、定时任务**里，就不能靠人坐在那儿敲了。**无头模式（headless）= 不进交互界面，给个指令直接出结果。** 这是把 Claude Code 接入自动化的基础。

---

# 二、claude -p：打印模式

最核心的一个 flag。`-p`（或 `--print`）让它**执行完直接打印结果，不进交互会话**：

```bash
claude -p "总结一下 src/ 目录的整体结构"
```

它干完、打印、退出。这意味着你可以把它写进任何脚本：

```bash
# 在脚本里用它生成内容
SUMMARY=$(claude -p "用一句话总结本次 git diff 的改动")
echo "本次改动：$SUMMARY"
```

结合第 16 章的 `/goal`，还能让它在一条命令里**跑到目标达成**：

```bash
claude -p "/goal CHANGELOG.md 为本周每个合并的 PR 都补上一条记录"
```

> 💡 脚本/CI 里常配 `--no-session-persistence`：不把会话存盘、不可恢复，适合一次性的自动化运行。

---

# 三、GitHub Actions：让它在 PR 里自动干活

官方提供了 GitHub Action（`anthropics/claude-code-action@v1`），把 Claude Code 接进你的 CI 流水线。最常见的用法：**PR 一开，它自动 review**。

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    prompt: "审查这个 PR 的安全问题"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    claude_args: |
      --append-system-prompt "遵循我们的编码规范"
      --max-turns 10
      --model claude-sonnet-4-6
```

要点：

- `prompt`：让它干什么（审查、改代码、补测试……）；
- `anthropic_api_key`：放进仓库 secrets，**别硬写在文件里**；
- `claude_args`：透传 CLI 参数（系统提示、最大轮数、模型等）。

> 注：v1 是 GA 正式版。早期 beta 用的是 `direct_prompt`、`custom_instructions`、`max_turns` 等独立字段，v1 统一改为 `prompt` + `claude_args` 透传。用新版写法即可。

---

# 四、Agent SDK：把它嵌进你自己的程序

如果你想**用代码编排** Claude Code（不只是命令行），用 **Agent SDK**（有 TypeScript 和 Python 版）。它让你在程序里发起会话、流式接收消息、控制权限、甚至做**文件检查点**（回顾第 04 章的回溯，SDK 里可编程实现）。

适合的场景：

- 把 Claude 的能力做成你产品里的一个功能；
- 构建复杂的多代理编排（程序化地调度、收集结果）；
- 需要精细控制每一步（权限、轮数、模型）。

> 对绝大多数日常自动化，`claude -p` + GitHub Action 已经够用；要做产品化集成或复杂编排，才上 SDK。

---

# 五、三种无头方式怎么选

| 方式 | 适合 | 复杂度 |
| --- | --- | --- |
| `claude -p` | shell 脚本、本地自动化、一次性任务 | 低 |
| GitHub Action | PR 自动审查/改动、团队 CI 流程 | 中 |
| Agent SDK | 产品化集成、复杂多代理编排 | 高 |

> 从简到繁：脚本用 `-p`，团队 CI 用 Action，产品集成用 SDK。

---

# 六、常见错误

**错误 1：把 API Key 硬写进脚本/工作流**
泄露风险极高。→ 一律放环境变量 / 仓库 secrets。

**错误 2：CI 里不设 `--max-turns`**
无人值守却不限轮数，可能跑飞、烧 token。→ 设合理的最大轮数兜底。

**错误 3：无头模式跑高危操作不设防**
没人盯着却让它改生产/删数据。→ 严控权限，高危操作别放进自动流程。

**错误 4：日常小自动化也硬上 SDK**
杀鸡用牛刀。→ 能 `claude -p` 解决的别写一堆 SDK 代码。

---

# 七、最佳实践

1. **脚本优先 `-p`**：一次性、本地自动化，打印模式最省事。
2. **密钥进 secrets**：API Key 绝不硬写进文件。
3. **CI 设护栏**：`--max-turns`、合适的模型、明确的 prompt。
4. **无头守安全**：高危操作不进自动流程，权限从严。
5. **按复杂度选工具**：`-p` → Action → SDK，由简到繁。

---

# 八、总结

- 无头模式 = **不进交互、给指令直接出结果**，是接入自动化的基础。
- `claude -p "..."` 把它塞进任何脚本；配 `/goal` 可一条命令跑到达标。
- **GitHub Action**（`anthropics/claude-code-action@v1`）让它在 PR 里自动审查/改动，密钥进 secrets、设 `--max-turns`。
- **Agent SDK**（TS/Python）用于产品化集成与复杂编排。

下一章，给它接上外部世界——数据库、API、文档、issue：MCP。👉 `22-MCP外部工具集成.md`

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“Claude Code（20）- 无头模式与 CI：claude -p、GitHub Actions、SDK”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。
