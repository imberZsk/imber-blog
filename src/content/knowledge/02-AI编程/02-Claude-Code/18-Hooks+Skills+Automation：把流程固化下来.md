# Claude Code（18） - Hooks + Skills + Automation：把流程固化下来

> 读完后，你应能完成以下任务：
> - 绘制“Claude Code（18） - Hooks + Skills + Automation：把流程固化下来 / Hooks：在关键节点自动插入动作”的关键对象与数据流，解释“Hooks 让你在 Claude Code 的特定时机自动执行一段命令或检查，不用每次嘴说。”，并用源码位置、日志或 Trace 标注证据。
> - 为“Claude Code（18） - Hooks + Skills + Automation：把流程固化下来 / 例子：改完文件自动安全扫描”设计正常与异常输入，验证“这样它每次写/改文件后都会自动跑 lint——团队规范从「靠自觉」变成「自动执行」。”，输出首个偏差位置与回归测试结果。
> - 实现“Claude Code（18） - Hooks + Skills + Automation：把流程固化下来 / Skills：把整套工作流沉淀成模板”的最小代码或配置，检验“和第 10 章的自定义命令相比：命令偏「一段提示一键发」，Skill 偏「一整套带步骤、可被自动应用的工作流」。”，输出命令、结果与 Diff，并说明不适用边界。

> 本章目标：用 Hooks 在工具调用前后插自动检查，用 Skills 沉淀可复用工作流，用 Automation 定时自动跑。


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

```text
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

# 七、动手实践：Demo 18 · Hooks 配置（可直接用）+ Skill/Automation 说明

提供一份**可直接复制**的 Hooks 配置：每次 Write/Edit 后自动跑 lint。外加 Skill 与 Automation 的设计清单。

## 7.1 文件
- `settings.hooks.example.json`：PostToolUse hook 示例，改完文件自动 lint。
- `固化清单.md`：什么时候用 Hooks / Skills / Automation。

## 7.2 怎么用 Hooks
把 `settings.hooks.example.json` 里的 `hooks` 段合并进你项目的 `.claude/settings.json`，把命令换成你项目真实的 lint/格式化命令即可。

<!-- knowledge-practice-materials-merged -->

## 7.3 配套实践材料

以下材料已并入正文，便于阅读时直接对照和练习。

### 固化清单.md

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

# 八、总结

- **Hooks：在关键节点自动插入动作**：Hooks 让你在 Claude Code 的特定时机自动执行一段命令或检查，不用每次嘴说。
- **Skills：把整套工作流沉淀成模板**：和第 10 章的自定义命令相比：命令偏「一段提示一键发」，Skill 偏「一整套带步骤、可被自动应用的工作流」。
- **Automation：让稳定流程自动运行**：当一个 Skill 已经能稳定执行，下一步就是让它自动跑，不用每次手动触发。
- **三者怎么配合（一张图理解）**：由细到粗、由手动到自动，一步步把你的经验「固化」成资产。
- **常见错误**：只用一次的流程，沉淀成 Skill 是过度工程。
- **最佳实践**：反复三次以上才固化：偶尔用对话解决就行，反复才值得做成 Skill/Hook。 -> Hook 保持轻快：只放快速检查，别拖慢每步操作。 -> 先稳后动：流程在交互里验证稳定，再交给 Automation 无人值守。 -> 自动化守住安全：高危操作不进自动流程，或保留确认。

## 参考资料

- [Claude Code 文档](https://docs.anthropic.com/en/docs/claude-code/overview)
- [Claude Code 安全](https://docs.anthropic.com/en/docs/claude-code/security)

<!-- knowledge-scenario-inlined:AC-11 -->

## 8.1 可运行实验：Hooks 与 CI 质量门禁


```html runnable file=index.html title="Hooks 与 CI 质量门禁" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AC-11 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AC-11 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'Hooks 与 CI 质量门禁', summary: '运行工具前后钩子与 Lint、Test、Build，观察失败在哪一层阻断。', controls: [
        { key: 'gate', label: '强制门禁', type: 'select', value: 'all', options: [['lint', '仅 Lint'], ['test', 'Lint + Test'], ['all', 'Lint + Test + Build']] },
        { key: 'changedFiles', label: '修改文件', type: 'range', min: 1, max: 20, value: 6, suffix: ' 个' },
        { key: 'stopHook', label: 'Stop Hook', type: 'select', value: 'verify', options: [['none', '不检查'], ['verify', '检查验证证据']] }
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
          /** 当前门禁要求运行的检查集合。 */
          const checks = values.gate === 'lint' ? ['Lint'] : values.gate === 'test' ? ['Lint', 'Test'] : ['Lint', 'Test', 'Build'];
          /** 故障注入命中的门禁名称。 */
          const failedGate = fail ? checks[Math.min(1, checks.length - 1)] : null;
          /** Stop Hook 是否要求最终验证证据。 */
          const stopAllowed = values.stopHook === 'verify' && !failedGate;
          return { metrics: [[checks.length, '强制门禁'], [values.changedFiles, '修改文件'], [failedGate || 'NONE', '失败节点'], [stopAllowed ? 'ALLOW' : 'BLOCK', 'Stop 决策']], stages: [stage('PreTool', 'ok', 'scope'), stage('Tool', 'ok', values.changedFiles + ' files'), stage('PostTool', 'ok', 'diff'), ...checks.map(function (check) { return stage(check, check === failedGate ? 'fail' : 'ok', check === failedGate ? 'failed' : 'passed'); }), stage('Stop', stopAllowed ? 'ok' : 'fail', stopAllowed ? 'evidence' : 'blocked')], rows: [['触发顺序', 'PreTool → Tool → PostTool → ' + checks.join(' → ') + ' → Stop'], ['失败传播', failedGate ? failedGate + ' 失败，后续发布步骤不执行' : '全部强制门禁通过'], ['Stop Hook', values.stopHook === 'verify' ? '检查命令、退出码与测试摘要' : '没有验证证据也可能结束']], diagnosis: stopAllowed ? '质量门禁和完成证据均通过。' : '流水线已阻断，修复失败项后必须从受影响门禁重新运行。', danger: !stopAllowed };
         }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
