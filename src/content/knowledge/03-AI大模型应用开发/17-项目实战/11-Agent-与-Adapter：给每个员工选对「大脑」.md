# 项目实战（11） - Agent 与 Adapter：给每个员工选对「大脑」

> 读完后，你应能完成以下任务：
> - 绘制“项目实战（11） - Agent 与 Adapter：给每个员工选对「大脑」 / 为什么需要 Adapter？回顾 BYOB”的关键对象与数据流，解释“查这个 Agent 的 adapterType（适配器类型）和 adapterConfig（配置） -> 调用该适配器的 execute() 函数 -> 适配器去启动/调用真正的 AI 运行时 -> 捕获 stdout、解析 token 用量和成本、返回结构化结果”，并用源码位置、日志或 Trace 标注证据。
> - 为“项目实战（11） - Agent 与 Adapter：给每个员工选对「大脑」 / 四种内置适配器”设计正常与异常输入，验证“它们以独立 npm 包形式存在，通过插件系统安装。”，输出首个偏差位置与回归测试结果。
> - 实现“项目实战（11） - Agent 与 Adapter：给每个员工选对「大脑」 / 怎么选？一张决策表”的最小代码或配置，检验“经验法则：需要「智能」的角色用 claude_local/codex_local；”，输出命令、结果与 Diff，并说明不适用边界。

> 本章目标：看懂 Paperclip 的适配器（Adapter）体系，知道 `claude_local` / `codex_local` / `process` / `http` 四种内置适配器分别适合什么场景，会给不同角色的 Agent 选对大脑。

第 04 章说过，
适配器是 Paperclip 的灵魂——它是平台和「真正干活的 AI」之间的桥。
这一章把它讲透。

---

# 一、为什么需要 Adapter？回顾 BYOB

Paperclip **只编排，不运行**。
那 Agent 到底用什么 AI 干活？
答案是你自己选——这叫 **BYOB（Bring Your Own Brain，
自带大脑）**。

Adapter 就是「大脑接口」：当一次心跳触发，Paperclip 做的事是——

1. 查这个 Agent 的 `adapterType`（适配器类型）和 `adapterConfig`（配置）
2. 调用该适配器的 `execute()` 函数
3. 适配器去启动/调用真正的 AI 运行时
4. 捕获 stdout、解析 token 用量和成本、返回结构化结果

换句话说：**Agent = 角色设定 + 一个适配器（决定用什么大脑、怎么跑）。
**

---

# 二、四种内置适配器

| 适配器 | 类型 key | 干什么 |
|--------|----------|--------|
| **Claude Local** | `claude_local` | 在本机跑 Claude Code CLI |
| **Codex Local** | `codex_local` | 在本机跑 OpenAI Codex CLI |
| **Process** | `process` | 执行任意 shell 命令 |
| **HTTP** | `http` | 给外部 Agent 发 webhook |

> 除内置外还有一批实验性/插件适配器：`gemini_local`、`opencode_local`、`cursor`、`pi_local`、`hermes_local`、`openclaw_gateway`、`droid_local` 等。它们以独立 npm 包形式存在，通过插件系统安装。初学先掌握上面四个。

## 2.1 怎么选？一张决策表

| 你的场景 | 选谁 |
|----------|------|
| Agent 要规划、拆任务、写代码、调工具（如 CEO、工程师） | `claude_local`（**最推荐**） |
| 同上，但你习惯用 OpenAI Codex | `codex_local` |
| Agent 只需跑一段固定脚本/命令（如定时备份、跑测试） | `process` |
| Agent 是个已存在的外部 HTTP 服务，Paperclip 只去戳它 | `http` |

**经验法则**：需要「智能」的角色用 `claude_local`/`codex_local`；
只需要「执行固定动作」的用 `process`/`http`。

---

# 三、重点讲 claude_local（最常用）

这是绝大多数「干活型」Agent 的首选。
它支持 **session 持久化、技能注入、结构化输出解析**。

## 3.1 前提条件
- 本机装好 Claude Code CLI（`claude` 命令可用）
- 环境或 Agent 配置里有 `ANTHROPIC_API_KEY`（或用订阅登录模式）

## 3.2 关键配置字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `cwd` | 是 | Agent 进程的工作目录（绝对路径；缺失时在权限允许下自动创建） |
| `model` | 否 | 用哪个 Claude 模型（如 `claude-opus-4-6`） |
| `promptTemplate` | 否 | 所有运行通用的 prompt |
| `env` | 否 | 环境变量（支持密钥引用） |
| `timeoutSec` | 否 | 进程超时（0 = 不超时） |
| `graceSec` | 否 | 强杀前的宽限期 |
| `maxTurnsPerRun` | 否 | 每次心跳最多 agentic 轮数（默认 `300`） |
| `dangerouslySkipPermissions` | 否 | 跳过权限提示（默认 `true`）；无头运行必须开，否则交互式审批根本没法点 |

> ⚠️ `dangerouslySkipPermissions` 默认 `true` 是有原因的：心跳是**无头（headless）**运行的，没人在旁边点「允许」。但这也意味着 Agent 在它的 `cwd` 里权限很大——所以 `cwd` 要指向受控的项目目录，别指到敏感位置。

## 3.3 Session 持久化（这是它聪明的地方）

适配器会在每次心跳后**保存 Claude Code 的 session ID**，
下次唤醒时恢复同一段对话——Agent 因此「记得」上次在干嘛，
不用重新读一遍所有东西。

几个细节：
- **cwd 感知**：如果工作目录变了，会开新 session 而不是硬恢复。
- **失败自愈**：如果恢复时报「未知 session」，适配器自动用新 session 重试。

这正是第 01 章「记忆碎片」模型的技术落地——心跳之间靠 session 续上记忆。

## 3.4 技能注入

适配器会建一个临时目录，
把 Paperclip 的技能软链进去，
通过 `--add-dir` 传给 Claude。
这样技能可被发现，又不污染 Agent 的工作目录（第 10 章讲怎么写技能）。

## 3.5 环境自检

UI 里有个「Test Environment」按钮，
能验证适配器配置：检查 `claude` CLI 是否装好、工作目录是否可用、API key/认证模式，
还会发一个 hello 探针确认 CLI 就绪。
**配完 Agent 先点它测一下**，能省掉大量「为什么不动」的排查。

---

# 四、另外三种适配器速览

## 4.1 codex_local
和 `claude_local` 思路一样，只是底层换成 OpenAI Codex CLI。
前提是本机装好并登录 Codex CLI。
适合你更习惯 Codex 生态的情况。

## 4.2 process
执行**任意 shell 命令**。
没有「智能」，就是把心跳变成一次命令执行。
适合：定时任务（每天备份、跑测试、拉数据）这类**固定动作**。

## 4.3 http
心跳触发时，给一个**外部 HTTP 端点发 webhook**。
你的 Agent 其实是别处运行的一个服务，
Paperclip 只负责「按节拍戳它 + 收结果」。
适合：你已有一个在线 Agent 服务，想纳入 Paperclip 统一管理。

---

# 五、Agent 身份：运行时注入的环境变量

不管哪种适配器，
Paperclip 在启动 Agent 时都会注入一组环境变量，
让 Agent 知道「我是谁、该调哪个 API」：

| 变量 | 说明 |
|------|------|
| `PAPERCLIP_AGENT_ID` | Agent 唯一 ID |
| `PAPERCLIP_COMPANY_ID` | 所属公司 |
| `PAPERCLIP_API_URL` | Paperclip API 基地址 |
| `PAPERCLIP_API_KEY` | 短期 JWT，用于 API 认证 |
| `PAPERCLIP_RUN_ID` | 当前心跳运行 ID |

当心跳有具体触发原因时，还会多注入：

| 变量 | 说明 |
|------|------|
| `PAPERCLIP_TASK_ID` | 触发这次唤醒的任务 |
| `PAPERCLIP_WAKE_REASON` | 唤醒原因（如 `issue_assigned`、`issue_comment_mentioned`） |
| `PAPERCLIP_WAKE_COMMENT_ID` | 触发唤醒的具体评论 |
| `PAPERCLIP_APPROVAL_ID` | 被解决的审批 |
| `PAPERCLIP_APPROVAL_STATUS` | 审批决定（`approved`/`rejected`） |

> Agent 干活的第一步就是读这些变量，搞清「我是谁、为什么被叫醒」——这是下一章心跳协议的起点。

---

# 六、常见错误

- ❌ **给规划型角色用 `process`**
→ process 不会思考，
CEO/工程师这类要用 `claude_local`/`codex_local`。

- ❌ **`claude_local` 没装/没登录 `claude` CLI**
→ 心跳直接失败。
配完先用「Test Environment」自检。

- ❌ **`cwd` 用了相对路径或指向敏感目录**
  → 必须绝对路径；且因为默认跳过权限，要指向受控项目目录。

- ❌ **以为换大脑要改 Paperclip 代码**
  → 换 `adapterType` 即可，甚至能装第三方适配器。

- ❌ **`maxTurnsPerRun` 设太小**
  → 复杂任务一个心跳跑不完就被截断。默认 300，按任务复杂度调。

---

# 七、最佳实践

- ✅ **干活型用 Claude/Codex，执行型用 process/http**：按「需不需要智能」选。
- ✅ **配完必点「Test Environment」**：提前暴露环境问题，比事后查日志省太多事。
- ✅ **给每个 Agent 独立的 `cwd`**：隔离工作目录，避免互相干扰，也利于 session 恢复（cwd 变了会重开 session）。
- ✅ **密钥用 `env` 的密钥引用，别写明文**：配合 Paperclip 的密钥管理（第 13 章）。
- ✅ **模型按角色配**：规划/重活给强模型，轻活给便宜模型，省预算。

---

# 八、总结

- **为什么需要 Adapter？回顾 BYOB**：查这个 Agent 的 adapterType（适配器类型）和 adapterConfig（配置） -> 调用该适配器的 execute() 函数 -> 适配器去启动/调用真正的 AI 运行时 -> 捕获 stdout、解析 token 用量和成本、返回结构化结果
- **四种内置适配器**：它们以独立 npm 包形式存在，通过插件系统安装。
- **重点讲 claude_local（最常用）**：这是绝大多数「干活型」Agent 的首选。
- **另外三种适配器速览**：和 claude_local 思路一样，只是底层换成 OpenAI Codex CLI。
- **Agent 身份：运行时注入的环境变量**：不管哪种适配器，Paperclip 在启动 Agent 时都会注入一组环境变量，让 Agent 知道「我是谁、该调哪个 API」：
- **常见错误**：❌ cwd 用了相对路径或指向敏感目录

## 参考资料

- [FastAPI 大型应用](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [Docker Compose](https://docs.docker.com/compose/)
