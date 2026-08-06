# 24 - 知识库打通飞书实现自动沉淀

## 背景与目标

在日常工作中，我们经常在飞书群聊或与 AI 助手对话中产生有价值的技术讨论、决策过程和踩坑经验。这些内容分散在聊天记录里，难以沉淀和复用。

**目标**：打通飞书机器人与 frontend-knowledge 知识库，实现：
- 在飞书对话中直接触发知识沉淀（发送"帮我沉淀：xxx"）
- 机器人自动调用 `wiki-save` skill 写入知识库
- 实时推送 Claude 执行进度到飞书
- 完成后回复写入的文件路径

---

## 方案架构

```
┌─────────────┐      ① P2P 消息      ┌────────────────┐
│  飞书用户   │ ──────────────────> │  飞书开放平台  │
└─────────────┘                      └────────────────┘
                                             │
                                             │ ② Event (长连接)
                                             ↓
                                    ┌─────────────────┐
                                    │ lark-cli event  │
                                    │    consume      │
                                    └─────────────────┘
                                             │
                                             │ ③ NDJSON stream
                                             ↓
                                    ┌─────────────────┐
                                    │  Node.js bot    │
                                    │  (解析意图)     │
                                    └─────────────────┘
                                             │
                           ┌─────────────────┼─────────────────┐
                           │                 │                 │
                  ④ 触发沉淀              ⑤ 实时进度         ⑥ 完成回复
                           ↓                 ↓                 ↓
                  ┌─────────────────┐ ┌─────────────┐ ┌─────────────┐
                  │  claude -p      │ │  lark-cli   │ │  lark-cli   │
                  │  wiki-save      │ │  im +send   │ │  im +send   │
                  │  --stream-json  │ └─────────────┘ └─────────────┘
                  └─────────────────┘
                           │
                           ↓
                  ┌─────────────────┐
                  │  知识库文件     │
                  │  wiki/xxx.md    │
                  └─────────────────┘
```

---

## 技术选型

| 技术栈 | 用途 | 选型理由 |
|--------|------|---------|
| **lark-cli** | 飞书 API 封装 | 官方工具，支持长连接事件订阅（`event consume`），避免自建 webhook server |
| **claude CLI** | 调用 Claude + wiki-save skill | 本地 CLI，直接写文件到知识库，支持 `--output-format stream-json` 获取执行进度 |
| **Node.js** | 脚本编排 | 轻量，spawn 子进程 + readline 逐行解析 NDJSON 流 |
| **长连接事件订阅** | 接收飞书消息 | 比 webhook 模式简单（无需公网 IP 和 SSL 证书），适合本地开发机运行 |

---

## 关键配置

### 1. 飞书开放平台配置

在 https://open.feishu.cn/app 选中你的应用，依次配置：

#### 1.1 添加机器人能力
- 进入「应用能力」→「机器人」
- 点击「配置」，启用机器人能力

#### 1.2 配置事件订阅（核心）
- 进入「事件与回调」→「事件配置」
- **订阅方式**：选择 **「长连接」** 模式（不是 webhook URL）
- **添加事件**：
  - `接收消息 v2.0`（`im.message.receive_v1`）
  - 添加后会自动关联权限 `im:message.p2p_msg:readonly`

#### 1.3 发布版本
- 进入「版本管理与发布」
- 创建版本并发布（或开启「仅测试企业可用」）
- **权限和事件改动必须发布才生效**

### 2. 本地初始化 lark-cli

```bash
# 首次使用需初始化应用配置
lark-cli config init --new

# 按提示打开授权链接，完成应用绑定
# 配置会保存到 ~/.lark-cli/config.json
```

### 3. 验证长连接可用

```bash
# 测试监听 60 秒，发消息给机器人验证能否收到
lark-cli event consume im.message.receive_v1 --max-events 5 --timeout 60s --as bot < <(tail -f /dev/null)

# 看到 [event] ready 后，在飞书给机器人发"测试"
# 应该会打印出 JSON 事件：{"message_id":"om_xxx", "content":"测试", ...}
```

---

## 脚本实现

### 核心文件：lark-wiki-bot.mjs

完整代码已保存在：`/Users/imber/Desktop/work/frontend/frontend-knowledge/lark-wiki-bot.mjs`

#### 关键模块

**1. 事件消费与意图识别**

```javascript
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

// 沉淀触发词正则（来自 wiki-save SKILL.md）
const SAVE_TRIGGERS =
  /保存这次讨论|save|整理结论|沉淀到知识库|帮我沉淀|存下来|存到知识库/i;

// 启动长连接消费进程
const consumer = spawn(
  "lark-cli",
  ["event", "consume", "im.message.receive_v1", "--as", "bot"],
  { stdio: ["pipe", "pipe", "pipe"] }
);

// 保持 stdin 不 EOF（避免进程立即退出）
spawn("tail", ["-f", "/dev/null"]).stdout.pipe(consumer.stdin);

// 逐行解析 NDJSON 事件
const rl = createInterface({ input: consumer.stdout });
rl.on("line", async (line) => {
  const event = JSON.parse(line);
  const { chat_id, content } = event;

  // 匹配触发词
  if (!content || !SAVE_TRIGGERS.test(content)) return;

  // 触发沉淀流程...
});
```

**2. 流式调用 claude wiki-save**

```javascript
function runWikiSave(content, onProgress) {
  const prompt = `请使用 frontend-knowledge:wiki-save 技能，将以下内容沉淀到知识库：\n\n${content}`;

  return new Promise((resolve, reject) => {
    const child = spawn(
      "claude",
      [
        "-p", prompt,
        "--output-format", "stream-json", // 流式 JSON 输出
        "--verbose",
        "--plugin-dir", PLUGIN_DIR,
        "--allowedTools", "Read,Write,Edit,Glob,Grep,Bash",
        "--dangerously-skip-permissions",
      ],
      { cwd: WIKI_ROOT, stdio: "pipe" }
    );

    // 逐行解析 stream-json 事件
    const rl = createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      const evt = JSON.parse(line);
      handleClaudeEvent(evt, onProgress);
    });

    child.on("close", (code) => {
      if (code === 0) resolve("完成");
      else reject(new Error(`claude exited ${code}`));
    });
  });
}
```

**3. 解析 stream-json 提取进度**

```javascript
function handleClaudeEvent(evt, onProgress) {
  // assistant 消息包含工具调用
  if (evt.type === "assistant" && evt.message?.content) {
    for (const block of evt.message.content) {
      if (block.type === "tool_use") {
        const hint = describeToolUse(block);
        if (hint) onProgress(hint); // 回调推送进度
      }
    }
  }
}

function describeToolUse(block) {
  const name = block.name;
  const input = block.input || {};

  switch (name) {
    case "Bash": {
      // 提取 wiki-save 步骤标记：[wiki-save Step N] xxx
      const cmd = input.command || "";
      const m = cmd.match(/\[wiki-save Step \d+\][^\\']*/);
      if (m) return `🔧 ${m[0].replace(/\\033\[\d+m/g, "").trim()}`;
      return null;
    }
    case "Write":
      return `📝 写入文件：${shortPath(input.file_path)}`;
    case "Edit":
      return `✏️ 修改文件：${shortPath(input.file_path)}`;
    default:
      return null; // Read/Glob/Grep 太频繁，不上报
  }
}
```

**4. 实时推送进度到飞书**

```javascript
// 进度去重：同样的文案只发一次
const sentSet = new Set();
const onProgress = (msg) => {
  if (sentSet.has(msg)) return;
  sentSet.add(msg);
  
  // 异步发送到飞书，不阻塞 claude 执行
  larkSend(chat_id, msg).catch(() => {});
};

// 调用 wiki-save，传入进度回调
await runWikiSave(content, onProgress);
```

---

## 运行与使用

### 启动 bot

```bash
cd /Users/imber/Desktop/work/frontend/frontend-knowledge
node lark-wiki-bot.mjs
```

看到 `[bot] 已就绪，等待消息...` 后，bot 进入监听状态。

### 使用示例

在飞书给「前端AI知识库」机器人发送：

```
帮我沉淀：Vue3 的 reactive 对象解构后会丢失响应性，需要用 toRefs 包裹才能保持响应式连接
```

飞书会依次收到：

```
⏳ 收到，开始沉淀到知识库...
🔧 [wiki-save Step 1] 提炼对话要点...
🔧 [wiki-save Step 2] 判定类型与目标路径...
📝 写入文件：wiki/stacks/vue/vue3/references/reactivity-toRefs.md
✏️ 修改文件：wiki/stacks/vue/vue3/_index.md
✅ 沉淀完成
wiki/stacks/vue/vue3/references/reactivity-toRefs.md
```

### 查看写入结果

```bash
cd /Users/imber/Desktop/work/frontend/frontend-knowledge
git status
# 会看到新增/修改的文件

git diff wiki/stacks/vue/vue3/references/reactivity-toRefs.md
# 查看具体内容
```

---

## 踩坑记录

### 问题 1：权限配置后收不到消息

**现象**：`lark-cli event consume` 能 `ready`，但发消息后收不到事件（0 events）。

**排查路径**：
1. 检查「事件与回调」页面，确认已添加 `im.message.receive_v1` 事件
2. 确认订阅方式是**「长连接」**，不是 webhook URL
3. 确认权限 `im:message.p2p_msg:readonly` 已开通（添加事件时自动关联）
4. **关键**：检查「版本管理与发布」，权限和事件改动必须**发布版本**才生效

**解决**：发布应用版本后，消息立即能收到。

---

### 问题 2：多个消费者抢消息（轮询分发）

**现象**：手动 `lark-cli event consume` 能收到消息，但 Node.js bot 收不到。

**原因**：同一个事件被多个消费者监听时，lark-cli 的 bus daemon 会**轮询分发**消息，导致消息被另一个进程抢走。

**排查**：
```bash
lark-cli event status --json
# 查看 active_consumers，如果大于 1，说明有多个进程在抢
```

**解决**：
```bash
# 停掉所有旧消费者和 daemon
lark-cli event stop --all --force

# 重新启动 bot（确保只有一个消费者）
node lark-wiki-bot.mjs
```

---

### 问题 3：stdin EOF 导致消费进程立即退出

**现象**：spawn 启动 `lark-cli event consume` 后立即退出，stderr 提示 `stdin closed — shutting down`。

**原因**：`lark-cli event consume` 把 stdin EOF 当作停止信号（方便 AI subprocess 控制）。spawn 默认 `stdio: ["pipe", "pipe", "pipe"]` 时，stdin 立即关闭。

**解决**：用 `tail -f /dev/null` 保持 stdin 永不 EOF：
```javascript
const consumer = spawn("lark-cli", ["event", "consume", ...], { stdio: ["pipe", "pipe", "pipe"] });
spawn("tail", ["-f", "/dev/null"]).stdout.pipe(consumer.stdin);
```

---

### 问题 4：stream-json 事件解析失败

**现象**：`claude -p --output-format stream-json` 启动后，readline 读不到任何行。

**排查**：确认 claude CLI 版本是否支持 `stream-json`：
```bash
claude --help | grep stream-json
# 应该能看到 --output-format <format> 和 stream-json 选项
```

**解决**：
- 确保 `--output-format stream-json` 和 `--verbose` 一起使用
- 如果版本过旧，升级 claude CLI：`npm update -g @anthropic-ai/claude-code`

---

## 后续优化方向

### 1. 支持群聊沉淀

当前只处理 P2P 消息（`chat_type: "p2p"`），可扩展支持群聊：
- 订阅群聊消息事件（需要群管理员权限）
- 在脚本里过滤 `chat_type: "group"`
- 回复时用 `--chat-id` 发到群里

### 2. 消息队列化

当前是串行处理（一条消息沉淀完才能处理下一条），高频场景可能阻塞。改进方向：
- 用消息队列（如 BullMQ）缓冲请求
- 支持并发沉淀（每条消息独立 worktree 隔离）

### 3. 沉淀结果预览

完成后不只回复路径，还可以：
- 用 `lark-cli im +messages-send --markdown` 发送富文本卡片
- 包含文件预览、frontmatter 摘要、diff 统计

### 4. 权限细化

当前用 `--dangerously-skip-permissions` 绕过所有确认，生产环境应：
- 限制 wiki-save 只能写 `wiki/` 或 `areas/`
- 用 `--allowedTools` 白名单 + `--add-dir` 路径沙箱

---

## 参考资源

- **lark-cli 文档**：`~/.claude/skills/lark-shared/SKILL.md`、`lark-im/SKILL.md`、`lark-event/SKILL.md`
- **wiki-save 规范**：`/Users/imber/Desktop/work/frontend/frontend-plugins/plugins/frontend-knowledge/skills/wiki-save/SKILL.md`
- **飞书开放平台**：https://open.feishu.cn/document/home/introduction-to-scope-and-authorization/overview
- **claude CLI 文档**：`claude --help`、`claude -p --help`
