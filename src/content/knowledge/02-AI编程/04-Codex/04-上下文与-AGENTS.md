# Codex（04） - 上下文与 AGENTS

> 读完后，你应能解释“项目说明”，复现“常用命令”的最小实现，并用“代码约定”检查结果与失败边界。

Codex 的表现很大程度取决于上下文。上下文不是越多越好，而是越相关越好。

你可以把上下文分成两类：

- 临时上下文：当前这次任务才需要的信息，比如报错日志、截图、需求说明。
- 长期上下文：项目一直要遵守的规则，比如代码风格、测试命令、目录约定。

AGENTS.md 就是用来承载长期上下文的常见文件。它像项目里的“给智能体看的 README”，告诉 Codex 在这个仓库里应该怎么工作。

# 一、概念解释

AGENTS.md 适合写这些内容：

| 内容 | 示例 |
| --- | --- |
| 项目是什么 | 这是一个 Next.js 管理后台 |
| 常用命令 | `npm test`、`npm run lint` |
| 目录约定 | 页面在 `src/pages`，业务组件在 `src/features` |
| 编码规范 | 不引入新状态库，优先复用 hooks |
| 测试规范 | 新增业务逻辑必须补单测 |
| 禁止事项 | 不修改自动生成文件 |

不适合写这些内容：

- 一次性需求。
- 很长的历史聊天记录。
- 敏感密钥。
- 与当前仓库无关的个人偏好。

# 二、使用示例

一个基础 AGENTS.md 可以这样写：

```md
# AGENTS.md

## 项目说明

这是一个 React + TypeScript 项目，主要用于内部运营后台。

## 常用命令

- 安装依赖：`npm install`
- 本地开发：`npm run dev`
- 单元测试：`npm test`
- 代码检查：`npm run lint`

## 代码约定

- 组件使用函数组件和 hooks。
- 样式优先使用现有 CSS Modules。
- 不引入新的 UI 组件库。
- API 请求统一放在 `src/api/`。

## 测试约定

- 修改业务逻辑时优先补充单元测试。
- 修复 bug 时补一个能复现 bug 的测试。

## 安全边界

- 不提交 `.env`、token、cookie。
- 不修改 `generated/` 下的自动生成文件。
```

这样之后，你每次让 Codex 工作时，就不需要重复说明这些规则。

# 三、多层 AGENTS.md

在复杂项目里，根目录可以有一个总 AGENTS.md，子目录也可以有更具体的 AGENTS.md。

```text
project/
├── AGENTS.md
├── frontend/
│   └── AGENTS.md
└── backend/
    └── AGENTS.md
```

根目录写全局规则，`frontend/AGENTS.md` 写前端规则，`backend/AGENTS.md` 写后端规则。越靠近任务文件的规则越具体。

# 四、常见错误

## 4.1 错误 1：把 AGENTS.md 写成百科全书

AGENTS.md 太长会降低可读性。它应该像团队 onboarding 清单，而不是完整项目文档。

建议控制在：

- 小项目：50-100 行。
- 中型项目：100-200 行。
- 大项目：根规则精简，细节放到子目录。

## 4.2 错误 2：规则不可执行

```md
- 写出优雅代码。
- 保持高质量。
```

这些规则太抽象。改成可执行的：

```md
- 新增公共函数时补充单元测试。
- 不在组件内直接拼接接口 URL，统一通过 `src/api/`。
```

## 4.3 错误 3：忘记维护

AGENTS.md 和项目代码一样会过期。目录变了、命令变了、测试框架变了，都要同步更新。

# 五、最佳实践

- 把重复说过 3 次以上的要求写进 AGENTS.md。
- 用短句和列表，不写长篇议论文。
- 把命令写成可复制的形式。
- 把“不要做什么”写清楚。
- 新增重要目录时，同步更新 AGENTS.md。

# 六、本章小结

提示词解决“这次要做什么”，AGENTS.md 解决“在这个项目里一直要怎么做”。想让 Codex 越用越顺，就要把稳定规则从聊天里沉淀到文件里。

# 七、总结

- **概念解释**：AGENTS.md 适合写这些内容：
- **使用示例**：一个基础 AGENTS.md 可以这样写：
- **多层 AGENTS.md**：在复杂项目里，根目录可以有一个总 AGENTS.md，子目录也可以有更具体的 AGENTS.md。
- **常见错误**：AGENTS.md 太长会降低可读性。

<!-- knowledge-lab-merged -->

# 动手实践：03 context and AGENTS

这个 demo 展示如何用 AGENTS.md 给 Codex 提供长期上下文。

## 目录内容

- `AGENTS.md`：项目规则。
- `src/api/orders.ts`：示例业务文件。
- `task.md`：一次性任务。

## 使用方式

在本目录运行：

```bash
codex "请阅读 AGENTS.md 和 task.md，然后给出修改方案。先不要改文件"
```

你也可以让 Codex 直接执行：

```bash
codex "请按 task.md 修改代码，并遵守 AGENTS.md"
```

## 练习目标

- 区分长期规则和临时需求。
- 观察 Codex 如何引用 AGENTS.md 里的项目约定。

<!-- knowledge-practice-materials-merged -->

## 配套实践材料

以下材料已并入正文，便于阅读时直接对照和练习。

### `task.md`

````markdown
# 临时任务

请检查 `src/api/orders.ts` 的错误处理。

要求：

- 如果 HTTP 状态码不是 2xx，要抛出包含状态码的错误。
- 保持函数签名不变。
- 不要引入新依赖。
````

## 参考资料

- [OpenAI Codex 文档](https://developers.openai.com/codex/)
- [AGENTS.md 规范](https://agents.md/)

<!-- knowledge-scenario-inlined:AC-02 -->

## 可运行实验：上下文预算与指令优先级

调整参数并注入失败，重点对比正常路径、保护条件和失败诊断；运行源码与文章保存在同一个 Markdown 文件。

```html runnable file=index.html title="上下文预算与指令优先级" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AC-02 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AC-02 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: '上下文预算与指令优先级', summary: '计算固定指令、源文件、日志和历史对话进入窗口后的保留与裁剪。', controls: [
        { key: 'budget', label: '上下文预算', type: 'range', min: 8000, max: 32000, step: 2000, value: 16000, suffix: ' tokens' },
        { key: 'logs', label: '测试日志', type: 'range', min: 1000, max: 18000, step: 1000, value: 12000, suffix: ' tokens' },
        { key: 'files', label: '源文件', type: 'range', min: 2000, max: 14000, step: 1000, value: 8000, suffix: ' tokens' }
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
          /** 不可裁剪的系统、规则和用户请求 Token。 */
          const fixed = 2130;
          /** 历史消息占用的 Token。 */
          const history = 6000;
          /** 未压缩前的总上下文 Token。 */
          const total = fixed + values.files + values.logs + history;
          /** 先提炼日志后仍需裁剪的 Token。 */
          const optimizedLogs = fail ? values.logs : Math.min(values.logs, 2200);
          /** 实际送入模型的 Token。 */
          const kept = Math.min(values.budget, fixed + values.files + optimizedLogs + history);
          return { metrics: [[total.toLocaleString(), '原始 Tokens'], [kept.toLocaleString(), '最终保留'], [Math.max(0, total - kept).toLocaleString(), '摘要/裁剪'], [Math.round(kept / values.budget * 100) + '%', '窗口占用']], stages: [stage('System', 'ok', '900'), stage('AGENTS', 'ok', '1050'), stage('User', 'ok', '180'), stage('Files', kept < fixed + values.files ? 'warn' : 'ok', values.files), stage('Logs', fail ? 'fail' : 'ok', optimizedLogs), stage('History', total > values.budget ? 'warn' : 'ok', history)], rows: [['优先级', 'System > 子目录 AGENTS > 根规则 > 用户请求 > 证据'], ['日志策略', fail ? '整段日志挤占窗口，关键文件可能丢失' : '只保留错误栈、失败断言和相关上下文'], ['最低证据集', kept >= fixed + Math.min(values.files, 6000) ? '规则、需求和关键源码仍在' : '证据不足，应缩小任务或继续检索']], diagnosis: total > values.budget ? '上下文已超预算。正确处理是先结构化提炼日志，再按任务相关性选择源码。' : '当前内容可完整进入窗口，但仍应避免无关日志污染注意力。', danger: fail && total > values.budget };
         }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
