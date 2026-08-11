# Paperclip 安装、运行与 Agent 协作

> 读完你能：在本地启动 Paperclip，理解 Company、Agent、Issue、Heartbeat 与 Governance 的关系，并能定位 Agent 协作卡住的常见原因。

## 一、Paperclip 是什么？

Paperclip 是一个 **AI 员工管理平台**。

你可以在里面创建一家虚拟公司，用 AI Agent 当员工，给他们分配任务，让他们自动协作干活。你充当董事会Board，负责审批关键决策、监控进度、控制预算。

核心概念：

| 概念 | 说明 |
|------|------|
| Company | 公司，有目标、预算、组织架构 |
| Agent | 每个员工都是一个 AI Agent，比如 CEO、CTO、工程师 |
| Issue | 工作任务，形成可追溯的任务树 |
| Heartbeat | Agent 被触发唤醒后执行一轮工作，完成后休眠 |
| Governance | 你是董事会，审批雇人、策略等关键决策 |

---

## 二、如何跑起来？

### 拉取源码

```bash
git clone https://github.com/paperclipai/paperclip.git
cd paperclip
```

### 安装并启动

```bash
# 安装依赖（需要 Node.js >= 20，pnpm 9.15.4）
pnpm install

# 首次运行前，执行数据库迁移，数据保存在本地pgsql: ~/.paperclip/instances/default/db
pnpm db:migrate

# 开发模式启动（推荐）
pnpm dev
```

其他启动方式：

| 命令 | 说明 |
|------|------|
| `pnpm dev` | server + UI，watch 模式（文件变更自动重启） |
| `pnpm dev:once` | 启动一次，不 watch |
| `pnpm dev:server` | 只启动后端 server |
| `pnpm dev:ui` | 只启动前端 UI |

没有 pnpm？先装：
```bash
npm install -g pnpm@9.15.4
```

### 启动成功后你会看到：

```
Mode      embedded-postgres  |  vite-dev-middleware
Server    3100
UI        http://127.0.0.1:3100
Database  ~/.paperclip/instances/default/db
Auth      ready
Heartbeat enabled (30000ms)
```

打开 http://127.0.0.1:3100 即可进入控制台。

---

## 三、用 AI 团队来跑业务

### 基本玩法

1. 创建一家公司，设定公司目标（比如"做一个内容分发工具"）
2. 创建 CEO Agent，用 **Claude Code（CC）** 作为执行器——CC 最适合当 CEO，能规划任务、拆解目标、指挥下属
3. CEO 会自动把目标拆成任务，分配给下面的 Agent
4. 你在看板上实时看到每个 Agent 在干什么，审批关键决策

### Agent 之间如何协作？

这是重点。以小张和小亮各自做的 Agent 为例：

- 两个 Agent 都注册在同一家公司下，通过 Paperclip 的 **Issue（任务）系统** 协同
- Agent A 完成一个子任务后，更新 Issue 状态为 `done`，下游 Agent B 的任务自动解锁
- 任务有严格的 **单人签出机制**（atomic checkout）：同一时间只有一个 Agent 能认领同一个任务，避免冲突
- Agent 之间通过 **@提及** 传递信息：在 Issue 评论里 @某个 Agent，会直接触发它唤醒

如果小张和小亮的 Agent 协作出了问题，通常是：
- 任务树没挂好（子任务没有正确关联父任务）
- 下游 Agent 没有开启 `wakeOnAssignment`（任务分配时自动唤醒）

检查这两点基本能解决大多数协作卡壳问题。

### 适配器选择

Agent 的执行器（Adapter）决定了它用什么 AI 来干活：

| Adapter | 说明 |
|---------|------|
| `claude_local` | 用本机的 Claude Code CLI（CC），最推荐 |
| `codex_local` | 用本机的 OpenAI Codex CLI |
| `process` | 任意 shell 命令 |
| `http` | 调用外部 HTTP 接口 |

使用 `claude_local` 前提：本机已安装并登录 `claude` CLI。
