# 14 · CLI 与 API 速查手册

> 本章目标：一份能贴在显示器边上的速查表。把常用 CLI 命令和核心 REST API 集中列出，写自定义脚本/适配器或排查问题时随手查，不用翻源码。

这一章是工具书，不讲原理（原理在前面各章）。直接上命令和接口。

> 📌 命令前缀约定（第 02 章）：用 `npx` 装的写 `npx paperclipai ...`；克隆源码仓库里写 `pnpm paperclipai ...`。下文统一用 `paperclipai`，自行加前缀。

---

## 一、CLI 速查

### 安装 / 启动 / 诊断（Setup）

```sh
# 首次引导式安装
paperclipai onboard
paperclipai onboard --yes          # 全默认，非交互
paperclipai onboard --run          # 装完立即启动

# 日常启动（缺配置自动 onboard，跑 doctor 修复，再启动）
paperclipai run
paperclipai run --instance dev      # 指定实例

# 改设置
paperclipai configure

# 健康检查 + 自动修复
paperclipai doctor

# 允许自定义 Tailscale 主机名（private 模式）
paperclipai allowed-hostname my-machine
```

### 公司（Company）

```sh
paperclipai company list                          # 列出公司
paperclipai company get <company-id>              # 公司详情
paperclipai company current [--company-id <id>]   # 当前作用域公司

# 导出为可移植文件包（manifest + markdown）
paperclipai company export <company-id> --out ./exports/acme --include company,agents

# 导入预览（不写入）
paperclipai company import <owner>/<repo>/<path> \
  --target existing --company-id <id> --ref main --collision rename --dry-run

# 实际导入到新公司
paperclipai company import ./exports/acme \
  --target new --new-company-name "Acme Imported" --include company,agents
```

> 💡 导出/导入就是视频里说的「公司模板」愿景——把一家验证过的公司打包，别处一键复刻团队。

### 任务（Issue）

```sh
paperclipai issue list [--status todo,in_progress] [--assignee-agent-id <id>] [--match text]
paperclipai issue get <issue-id-or-identifier>
paperclipai issue create --title "..." [--description "..."] [--status todo] [--priority high]
paperclipai issue update <issue-id> [--status in_progress] [--comment "..."]
paperclipai issue comment <issue-id> --body "..." [--reopen]
paperclipai issue checkout <issue-id> --agent-id <agent-id>   # 签出
paperclipai issue release <issue-id>                          # 释放
```

### Agent

```sh
paperclipai agent list

# 以某 Agent 身份手动跑本地 CLI（装技能 + 建 API key + 打印 shell 导出）
paperclipai agent local-cli claudecoder --company-id <company-id>
```

---

## 二、REST API 速查

### 基础约定

- **Base URL**：`http://localhost:3100/api`（所有端点以 `/api` 前缀）
- **认证**：所有请求带 `Authorization: Bearer <token>`
  - Agent API Key（长期）
  - Agent 运行 JWT（心跳时注入的 `PAPERCLIP_API_KEY`，短期）
  - 用户会话 cookie（董事会用 UI 时）
- **请求体**：JSON，`Content-Type: application/json`
- **公司范围端点**：路径里要带 `:companyId`
- **心跳变更请求**：带 `X-Paperclip-Run-Id` 头（审计用）
- **错误响应**：`{ "error": "可读的错误信息" }`

### 身份 / Agent

```
GET  /api/agents/me                                   # 我是谁（心跳第一步）
GET  /api/agents                                      # Agent 列表
POST /api/companies/{companyId}/agent-hires           # 提交雇人请求
```

### 任务（Issue）—— 最常用

```
# 拉我的任务（心跳收件箱）
GET  /api/companies/{companyId}/issues?assigneeAgentId={id}&status=todo,in_progress,in_review,blocked

GET  /api/issues/{issueId}                            # 任务详情
GET  /api/issues/{issueId}/comments                   # 评论
POST /api/issues/{issueId}/comments                   # 加评论（@AgentName 可唤醒）

# 签出（原子操作，别人占用返回 409，绝不重试）
POST /api/issues/{issueId}/checkout
Headers: X-Paperclip-Run-Id: {runId}
{ "agentId": "{id}", "expectedStatuses": ["todo","backlog","blocked","in_review"] }

# 更新状态（带 run id 头）
PATCH /api/issues/{issueId}
Headers: X-Paperclip-Run-Id: {runId}
{ "status": "done", "comment": "做了什么、为什么。" }

# 创建子任务（委派，必带 parentId）
POST /api/companies/{companyId}/issues
{ "title":"...", "assigneeAgentId":"...", "parentId":"...", "goalId":"...", "status":"todo", "priority":"high" }

# 交互卡片（结构化决策）
POST /api/issues/{issueId}/interactions
{ "kind":"request_confirmation", "payload": { "prompt":"接受方案吗？", ... } }
```

### 审批（Approvals）

```
GET  /api/companies/{companyId}/approvals?status=pending   # 待审批队列
GET  /api/approvals/{approvalId}                           # 审批详情
GET  /api/approvals/{approvalId}/issues                    # 关联任务
POST /api/companies/{companyId}/approvals                  # 创建审批请求（如 CEO 策略）
{ "type":"approve_ceo_strategy", "requestedByAgentId":"{id}", "payload": { "plan":"..." } }
```

### 例行任务（Routines）

```
GET  /api/companies/{companyId}/routines                   # 列出
GET  /api/routines/{routineId}                             # 详情
POST /api/companies/{companyId}/routines                   # 创建
{
  "title":"每日热文排行更新", "description":"...",
  "assigneeAgentId":"{id}", "priority":"medium", "status":"active",
  "concurrencyPolicy":"coalesce_if_active", "catchUpPolicy":"skip_missed"
}
```

### 成本 / 看板 / 审计

```
GET /api/companies/{companyId}/costs        # 成本数据
GET /api/companies/{companyId}/dashboard     # 看板汇总
GET /api/companies/{companyId}/activity      # 活动审计日志
```

### 目标与项目 / 密钥

```
GET  /api/companies/{companyId}/goals        # 目标
GET  /api/companies/{companyId}/projects     # 项目
GET  /api/companies/{companyId}/secrets      # 密钥（引用，非明文）
```

---

## 三、Agent 运行时环境变量速查（第 06 章）

```
PAPERCLIP_AGENT_ID        # 我的 ID
PAPERCLIP_COMPANY_ID      # 我的公司
PAPERCLIP_API_URL         # API 基地址
PAPERCLIP_API_KEY         # 短期 JWT
PAPERCLIP_RUN_ID          # 当前心跳运行 ID

# 有具体触发时额外注入：
PAPERCLIP_TASK_ID         # 触发唤醒的任务
PAPERCLIP_WAKE_REASON     # 唤醒原因（issue_assigned / issue_comment_mentioned ...）
PAPERCLIP_WAKE_COMMENT_ID # 触发的评论
PAPERCLIP_APPROVAL_ID     # 被解决的审批
PAPERCLIP_APPROVAL_STATUS # approved / rejected
```

---

## 四、状态值速查

**Issue 状态**（第 08 章）：
```
backlog → todo → in_progress → in_review → done
                      ↓
                   blocked              终态：done / cancelled
```

**Agent 状态**（第 03 章）：
```
active | idle | running | error | paused | terminated
```

**审批状态**（第 09 章）：
```
pending → approved / rejected / revision_requested → resubmitted → pending
```

---

## 五、用 curl 调 API 的模板

心跳里 Agent 通常这么调（用注入的 `PAPERCLIP_API_KEY`）：

```sh
# 确认身份
curl -sS "$PAPERCLIP_API_URL/api/agents/me" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"

# 签出任务（带 run id 头）
curl -sS -X POST "$PAPERCLIP_API_URL/api/issues/$ISSUE_ID/checkout" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  -d "{\"agentId\":\"$PAPERCLIP_AGENT_ID\",\"expectedStatuses\":[\"todo\",\"in_review\"]}"

# 更新为完成
curl -sS -X PATCH "$PAPERCLIP_API_URL/api/issues/$ISSUE_ID" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  -d '{"status":"done","comment":"完成并测试通过。"}'
```

---

## 六、速记口诀

- **干活前先 checkout，409 绝不重试。**（第 07/08 章）
- **变更请求带 `X-Paperclip-Run-Id` 头。**
- **子任务永远带 `parentId`（有目标加 `goalId`）。**
- **预算单位是分：$50 = `5000`。**（第 12 章）
- **公司不动先看 Approvals 队列。**（第 09 章）
- **协作卡壳查两点：任务树 + `wakeOnAssignment`。**（第 08 章）

---

## 小结

这一章是速查表，不用记，用时翻：
- **CLI**：setup（onboard/run/doctor）、company（含 export/import 模板）、issue、agent。
- **API**：身份、issue（最常用）、审批、例行任务、成本/看板/审计。
- **环境变量、状态值、curl 模板、口诀**：写脚本和排查时随手查。

最后一章，把全书的坑和最佳实践收口成一份「自检清单」。👉 [15 · 避坑指南与最佳实践](./15-避坑指南与最佳实践.md)
