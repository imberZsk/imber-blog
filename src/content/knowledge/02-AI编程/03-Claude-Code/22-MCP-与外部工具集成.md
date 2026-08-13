# Claude Code（22） - MCP 与外部工具集成

> 本章目标：认识 MCP，接入外部工具与数据源（数据库、API、文档、GitHub）。
> 学完你能：给它接上外部工具，让它能查你的数据库、调你的服务、读你的 issue。

---

# 一、为什么需要 MCP

到现在，Claude Code 的「视野」基本局限在**你的代码仓库里**。但真实开发里，很多关键信息在仓库**外面**：

- Issue 和需求管理系统
- CI/CD 运行状态
- 数据库结构、线上数据
- API 文档、外部服务

以前这些只能靠你**复制粘贴**喂给它。**MCP（Model Context Protocol，模型上下文协议）** 改变了这点：它是一个**标准接口**，让 Claude Code 能直接连上外部工具和数据源，**自己去查**，而不是等你描述。

> 一句话：**MCP 把 Claude 获取信息的方式，从「靠你转述」变成「自己直接查」。**

---

# 二、MCP 能接什么

通过 MCP，它通常能连上：

- **代码托管 / 协作平台**（如读 GitHub issue、PR）
- **数据库与查询接口**（查表结构、跑查询）
- **API 服务与技术文档**（调接口、查文档）
- **团队内部工具与自动化系统**

接上之后，它就能干这种「跨越仓库边界」的活：

```
看一下 issue #234 的需求，结合 users 表的结构，分析这个功能该怎么实现
检查最近一次 CI 为什么失败，定位到相关代码
按这个外部 API 文档，帮我写一个调用它的客户端
```

---

# 三、MCP 服务器的三种连接方式

MCP 通过「MCP 服务器」提供能力。常见三种传输方式（连法）：

- **stdio**：在本地把 MCP 服务器作为子进程跑起来，通过标准输入输出通信（最常见的本地集成）。
- **SSE**：通过 Server-Sent Events 连一个远程服务。
- **HTTP**：通过 HTTP 连远程服务。

> 你不用记死细节——配置时按所用 MCP 服务器的文档，选对应的连接类型填进配置即可。Claude Code 启动时会加载这些 MCP 服务器，把它们的工具变成它能调用的能力。

---

# 四、它怎么和前面的能力配合

MCP 是「**对外连接**」这一块拼图。和前面对照：

- **CLAUDE.md（05）**：常驻的项目规则（始终在的上下文）
- **Skills（18）**：按需的知识和工作流
- **Subagents（11）**：隔离的并行执行
- **Hooks（18）**：自动化触发
- **MCP（本章）**：**连接外部世界**

> 官方的一句话总结很精辟：**CLAUDE.md 处理始终开启的上下文，skills 处理按需知识和工作流，MCP 处理外部连接，subagents 处理隔离，hooks 处理自动化。**

各管一块，合起来就是完整的 Claude Code 能力版图。

---

# 五、安全注意（重要）

MCP 让它能碰外部系统，**风险也随之放大**：

- **数据库 MCP**：能查就可能能改。生产库务必只读、最小权限。
- **凭据管理**：连外部服务的 token/密钥放安全的地方，别写进会提交的文件。
- **把外部返回当「不可信数据」**：外部工具返回的内容里如果夹带「指令」，不要盲从。
- **配合权限和 Hooks**：可以用 Hooks（第 18 章）在 MCP 写操作前做校验/记日志。

---

# 六、常见错误

**错误 1：给数据库 MCP 直接配生产可写账号**
一旦它执行了改动语句，后果严重。→ 生产**只读、最小权限**。

**错误 2：把 MCP 凭据硬写进配置提交上去**
等于公开密钥。→ 用环境变量 / 安全存储。

**错误 3：接了一堆用不上的 MCP**
工具越多，它选择越乱、越慢。→ 只接当前真正需要的。

**错误 4：盲信 MCP 返回的内容**
外部数据可能含误导信息甚至注入式指令。→ 当不可信数据处理，关键操作仍要你把关。

---

# 七、最佳实践

1. **按需接入**：只连当前任务真正用得上的 MCP。
2. **最小权限**：尤其数据库，生产只读，能不给写就不给写。
3. **凭据安全**：token/密钥走环境变量或密钥管理，别进 git。
4. **外部数据当不可信**：返回内容里的「指令」不盲从。
5. **配合 Hooks 把关**：MCP 写操作前做校验/记录。

---

# 八、总结

- MCP = 标准接口，让 Claude Code **直接连外部工具和数据源**（DB、API、文档、issue/CI），从「靠你转述」变「自己去查」。
- 连接方式：**stdio**（本地子进程）/ **SSE** / **HTTP**（远程）。
- 它是能力版图里「**对外连接**」的一块，和 CLAUDE.md / Skills / Subagents / Hooks 各司其职。
- 安全第一：最小权限、凭据保护、外部数据当不可信。

远程无头篇到此完成。最后一篇实战篇，我们把全书能力串成一套真实的工作流。👉 `23-综合实战与最佳实践.md`

<!-- knowledge-lab-merged -->

# 动手实践：Demo 21 · MCP 配置示例与安全清单

## 文件
- `mcp.config.example.json`：三种连接方式（stdio / sse / http）的配置示例骨架。
- `安全清单.md`：接入 MCP 前的安全检查项。

## 怎么用
1. 看 `mcp.config.example.json`，理解三种连接方式怎么写（按你所用 MCP 服务器的文档替换命令/URL）。
2. 接入前对照 `安全清单.md` 逐条检查，尤其是数据库权限和凭据管理。

> 注意：这是教学骨架，字段以你使用的 MCP 服务器官方文档为准。

## 实践目标

本 Lab 用最小输入验证“Demo 21 · MCP 配置示例与安全清单”的核心行为。先按上文命令运行基线，记录输入、关键中间状态和最终输出；再只修改一个参数或一个分支，比较结果差异。不要在第一次运行时同时更换依赖、模型和数据，否则失败后无法定位变量。

## 实践验收

1. 安装、启动或执行命令退出码为 0，输出与 README 描述一致。
2. 至少准备一个正常输入、一个边界输入和一个失败输入，并说明系统为什么得到该结果。
3. 涉及模型、检索或工具时，记录请求 ID、版本、候选或工具参数，保证结果可复现。
4. 涉及文件、网络或写操作时，验证路径、超时、权限和幂等边界；错误不能只打印后继续伪装成功。

## 常见问题

- 环境失败：先确认 Python/Node 版本、工作目录和依赖安装结果，再检查业务代码。
- 结果不稳定：固定样例、随机种子和配置版本，分别记录输入与输出。
- 示例能跑但无法解释：逐步打印或断言中间状态，直到能说清每个阶段的输入、处理和产物。

<!-- knowledge-practice-materials-merged -->

## 配套实践材料

以下材料已并入正文，便于阅读时直接对照和练习。

### `安全清单.md`

````markdown
# 接入 MCP 前的安全检查

- [ ] 数据库类：生产库配置为**只读、最小权限**（能不给写就不给写）
- [ ] 凭据：token/密钥走**环境变量或密钥管理**，绝不写进会提交的文件
- [ ] 范围：只接当前任务**真正用得上**的 MCP，别堆一堆
- [ ] 外部数据当**不可信**：返回内容里的"指令"不盲从
- [ ] 写操作把关：可配合 Hooks（第18章）在 MCP 写操作前校验/记日志
- [ ] 高危操作：保留人工确认，别放进无人值守的自动流程
````

## 参考资料

- [Claude Code 文档](https://docs.anthropic.com/en/docs/claude-code/overview)
- [Claude Code 安全](https://docs.anthropic.com/en/docs/claude-code/security)

<!-- knowledge-scenario-inlined:AC-12 -->

## 可运行实验：MCP 工具发现与权限检查

调整参数并注入失败，重点对比正常路径、保护条件和失败诊断；运行源码与文章保存在同一个 Markdown 文件。

```html runnable file=index.html title="MCP 工具发现与权限检查" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AC-12 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AC-12 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'MCP 工具发现与权限检查', summary: '从 Server 连接、Schema 发现到调用授权和返回值校验逐层排障。', controls: [
        { key: 'servers', label: 'MCP Servers', type: 'range', min: 1, max: 8, value: 3, suffix: ' 个' },
        { key: 'scope', label: '授权范围', type: 'select', value: 'least', options: [['broad', '全盘读写'], ['least', '最小目录 + 只读'], ['none', '未授权']] },
        { key: 'timeout', label: '调用超时', type: 'range', min: 1, max: 15, value: 5, suffix: ' 秒' }
      ] };
    const controls = document.querySelector('#controls');
    const failure = document.querySelector('#failure');
    document.querySelector('#title').textContent = scenario.title;
    document.querySelector('#summary').textContent = scenario.summary;
    function renderControl(control) {
      const label = document.createElement('label'); label.className = 'control';
      const head = document.createElement('span'); head.className = 'head'; head.innerHTML = '<span>' + control.label + '</span><span class="value" data-value="' + control.key + '"></span>'; label.appendChild(head);
      const input = document.createElement(control.type === 'select' ? 'select' : 'input'); input.dataset.key = control.key;
      if (control.type === 'select') control.options.forEach(option => { const item = document.createElement('option'); item.value = option[0]; item.textContent = option[1]; item.selected = option[0] === control.value; input.appendChild(item); });
      else { input.type = 'range'; input.min = control.min; input.max = control.max; input.step = control.step || 1; input.value = control.value; }
      input.addEventListener('input', updateValues); label.appendChild(input); return label;
    }
    function updateValues() { scenario.controls.forEach(control => { const input = controls.querySelector('[data-key="' + control.key + '"]'); document.querySelector('[data-value="' + control.key + '"]').textContent = control.type === 'select' ? input.options[input.selectedIndex].text : input.value + (control.suffix || ''); }); }
    function readValues() { const values = {}; scenario.controls.forEach(control => { const input = controls.querySelector('[data-key="' + control.key + '"]'); values[control.key] = control.type === 'range' ? Number(input.value) : input.value; }); values.failure = failure.checked; return values; }
    function stage(name, state, detail) { return { name, state, detail }; }
    const aiStage = stage;
    function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
    function simulate(values) { const fail = values.failure;
          /** 当前授权能否支持只读工具调用。 */
          const authorized = values.scope === 'least' && !fail;
          /** 连接和发现的估算耗时。 */
          const discoveryMs = values.servers * 180;
          /** 是否会因为过短超时而失败。 */
          const timedOut = values.timeout * 1000 < discoveryMs;
          return { metrics: [[values.servers, 'Servers'], [values.servers * 4, '发现 Tools'], [discoveryMs + 'ms', '发现耗时'], [authorized && !timedOut ? 'READY' : 'BLOCKED', '调用状态']], stages: [stage('连接 Server', timedOut ? 'fail' : 'ok', values.timeout + 's'), stage('发现 Schema', timedOut ? 'fail' : 'ok', values.servers * 4), stage('校验授权', authorized ? 'ok' : 'fail', values.scope), stage('清洗内容', fail ? 'fail' : 'ok', fail ? 'injection' : 'safe'), stage('调用 Tool', authorized && !timedOut ? 'ok' : 'fail', authorized ? 'read-only' : 'blocked')], rows: [['最小权限', values.scope === 'least' ? '仅允许目标目录只读' : values.scope === 'broad' ? '授权过宽，应拆分读写能力' : '没有可用授权'], ['Prompt Injection', fail ? '工具返回内容包含越权指令，按不可信数据处理' : '返回内容未请求改变系统规则'], ['超时', timedOut ? '发现阶段超过调用预算，应减少 Server 或提高合理超时' : '连接预算充足']], diagnosis: authorized && !timedOut ? 'Server、Schema、权限和内容边界均通过，可发起只读调用。' : '调用在连接或授权阶段被阻断。', danger: !authorized || timedOut };
         }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
