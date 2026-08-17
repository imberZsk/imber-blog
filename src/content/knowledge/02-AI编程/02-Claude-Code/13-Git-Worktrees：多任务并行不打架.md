# Claude Code（13） - Git Worktrees：多任务并行不打架

> 读完后，你应能完成以下任务：
> - 绘制“Claude Code（13） - Git Worktrees：多任务并行不打架 / 并行干活的「打架」问题”的关键对象与数据流，解释“Git Worktree 是 git 原生能力：从同一个仓库签出多个工作目录，”，并用源码位置、日志或 Trace 标注证据。
> - 为“Claude Code（13） - Git Worktrees：多任务并行不打架 / 用 Claude Code 开 worktree”设计正常与异常输入，验证“这样你可以同时开好几个终端，”，输出首个偏差位置与回归测试结果。
> - 实现“Claude Code（13） - Git Worktrees：多任务并行不打架 / 和前两章怎么配合”的最小代码或配置，检验“💡 本小册就是在 worktree 里写的——正是为了不影响你工作目录的其他东西。”，输出命令、结果与 Diff，并说明不适用边界。

> 本章目标：用 `claude --worktree` 给每个并行会话开独立工作区，改文件互不冲突。


---

# 一、并行干活的「打架」问题

上两章让多个代理并行干活。
但如果它们都在**同一个目录、同一份文件**上改，
就会打架：A 改到一半，
B 也来改同一个文件，
互相覆盖、冲突一团乱。

**Git Worktree** 是 git 原生能力：从同一个仓库**签出多个工作目录**，
每个目录在自己的分支上。
各干各的，文件层面完全隔离。

> 类比：一个剧本（仓库），印好几份分给不同演员（worktree），各自在自己那份上排练，互不干扰，最后合成一台戏。

---

# 二、用 Claude Code 开 worktree

一个命令就能创建并进入一个隔离的 worktree 会话：

```bash
# 起一个叫 feature-auth 的 worktree（在新分支上）
claude --worktree feature-auth

# 修 bug 用
claude --worktree bugfix-123

# 不起名，自动生成一个
claude --worktree
```

这样你可以**同时开好几个终端**，
每个跑一个 `claude --worktree`，
各自在独立分支、独立目录上干不同的活：

```text
终端1: claude --worktree feature-pagination   # 做分页功能
终端2: claude --worktree feature-export        # 做导出功能
终端3: claude --worktree bugfix-login          # 修登录 bug
```

三件事并行推进，谁也不碰谁的文件。

---

# 三、和前两章怎么配合

- **子代理 / Agent Team**：解决「多个智能体并行思考」。
- **Worktree**：解决「多个并行任务在**文件层面**不冲突」。

两者正交、可叠加：你可以让一支 Agent Team 的不同成员各自在不同 worktree 里干活，
既并行协作、又互不覆盖。

> 💡 本小册就是在 worktree 里写的——正是为了不影响你工作目录的其他东西。

---

# 四、干完之后：合并与清理

每个 worktree 在自己的分支上。
干完一个功能，正常走 git 流程：

1. 在该 worktree 里提交；
2. 推分支、提 PR（第 09 章那一套）；
3. 合并后，删掉用完的 worktree（`git worktree remove`）保持整洁。

> 如果一个 worktree 没产生任何改动，通常可以直接清理掉，不留垃圾。

---

# 五、常见错误

**错误 1：单个小任务也开 worktree**
就改一个文件、串行做完的活，没必要隔离。
**worktree 是为「真正并行」准备的。
**

**错误 2：开一堆 worktree 不清理**
用完不删，磁盘和分支列表越积越乱。
→ 合并后及时 `git worktree remove`。

**错误 3：以为 worktree 之间共享未提交改动**
不共享。
每个 worktree 是独立工作目录，A 没提交的改动 B 看不到。
**靠分支 + 合并来汇流。
**

**错误 4：在 worktree 里忘了自己在哪个分支**
并行多个容易晕。
给 worktree 起**见名知意**的名字（`feature-xxx`、`bugfix-xxx`）。

---

# 六、最佳实践

1. **真并行才用**：多个独立任务同时推进时才开 worktree。
2. **命名见意**：`feature-pagination`、`bugfix-login`，一眼知道在干啥。
3. **一 worktree 一任务**：别在一个 worktree 里塞多个不相关的活。
4. **干完即清理**：合并后删除，保持仓库整洁。
5. **配合代理协作**：团队成员分到不同 worktree，并行又不打架。

---

# 七、动手实践：Demo 13 · Worktree 并行实操脚本

本 Demo 是一份**可照敲的命令脚本**，
带你在一个真实 git 仓库里体验多 worktree 并行。

## 7.1 文件
- `演练脚本.sh`：注释详尽的命令清单（建议逐行手敲理解，而非直接跑）。

## 7.2 前提
在任意一个 git 仓库里操作（不是这个 demo 目录）。

## 7.3 实践目标

本 Lab 用最小输入验证“Demo 13 · Worktree 并行实操脚本”的核心行为。
再只修改一个参数或一个分支，比较结果差异。

## 7.4 实践验收


## 7.5 常见问题

# 八、总结

- **并行干活的「打架」问题**：Git Worktree 是 git 原生能力：从同一个仓库签出多个工作目录，每个目录在自己的分支上。
- **用 Claude Code 开 worktree**：一个命令就能创建并进入一个隔离的 worktree 会话：
- **和前两章怎么配合**：💡 本小册就是在 worktree 里写的——正是为了不影响你工作目录的其他东西。
- **干完之后：合并与清理**：在该 worktree 里提交； -> 推分支、提 PR（第 09 章那一套）； -> 合并后，删掉用完的 worktree（git worktree remove）保持整洁。
- **常见错误**：worktree 是为「真正并行」准备的。
- **最佳实践**：真并行才用：多个独立任务同时推进时才开 worktree。 -> 命名见意：feature-pagination、bugfix-login，一眼知道在干啥。 -> 一 worktree 一任务：别在一个 worktree 里塞多个不相关的活。 -> 干完即清理：合并后删除，保持仓库整洁。

## 参考资料

- [Claude Code 文档](https://docs.anthropic.com/en/docs/claude-code/overview)
- [Claude Code 安全](https://docs.anthropic.com/en/docs/claude-code/security)

<!-- knowledge-scenario-inlined:AC-09 -->

## 8.1 可运行实验：Git Worktree 并行冲突

调整参数并注入失败，重点对比正常路径、保护条件和失败诊断；
运行源码与文章保存在同一个 Markdown 文件。

```html runnable file=index.html title="Git Worktree 并行冲突" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AC-09 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AC-09 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'Git Worktree 并行冲突', summary: '模拟多个工作树的文件所有权、脏状态、合并冲突与收尾。', controls: [
        { key: 'worktrees', label: '并行工作树', type: 'range', min: 1, max: 5, value: 3, suffix: ' 个' },
        { key: 'sharedFiles', label: '共享修改文件', type: 'range', min: 0, max: 5, value: 1, suffix: ' 个' },
        { key: 'cleanup', label: '收尾策略', type: 'select', value: 'safe', options: [['none', '直接删除'], ['safe', '检查 clean + merged'], ['stash', '隐藏后删除']] }
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
          /** 并行工作树之间预期的内容冲突数。 */
          const conflicts = Math.max(0, values.sharedFiles * Math.max(0, values.worktrees - 1) - (fail ? 0 : 1));
          /** 收尾策略是否会保护脏工作树。 */
          const safeCleanup = values.cleanup === 'safe' && !fail;
          return { metrics: [[values.worktrees, '工作树'], [conflicts, '潜在冲突'], [safeCleanup ? 'SAFE' : 'UNSAFE', '清理策略'], [Math.max(1, values.worktrees - conflicts), '可独立合并']], stages: [stage('创建分支', 'ok', values.worktrees), stage('分配范围', values.sharedFiles ? 'warn' : 'ok', values.sharedFiles + ' shared'), stage('并行修改', conflicts ? 'warn' : 'ok', conflicts), stage('合并验证', conflicts ? 'fail' : 'ok', conflicts ? 'resolve' : 'clean'), stage('移除工作树', safeCleanup ? 'ok' : 'fail', values.cleanup)], rows: [['脏状态', fail ? '一个工作树存在未提交改动，禁止删除' : '合并前逐个检查 status'], ['共享文件', values.sharedFiles ? '应指定单一所有者或把公共改动前置' : '写集合互斥'], ['安全收尾', safeCleanup ? '确认 clean、merged 后再移除明确路径' : '隐藏或直接删除不能证明数据可恢复']], diagnosis: conflicts || !safeCleanup ? '并行边界或清理条件不成立，不能批量移除工作树。' : '任务边界互斥且清理证据完整，可以安全收尾。', danger: conflicts > 0 || !safeCleanup };
         }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
