# Claude Code（06） - 权限模式与 Plan Mode：安全地放手

> 读完后，你应能完成以下任务：
> - 绘制“Claude Code（06） - 权限模式与 Plan Mode：安全地放手 / 为什么要有权限”的关键对象与数据流，解释“权限机制就是给你一个「方向盘」：决定它哪些操作可以自己来、哪些得先问你。”，并用源码位置、日志或 Trace 标注证据。
> - 为“Claude Code（06） - 权限模式与 Plan Mode：安全地放手 / 几种权限模式”设计正常与异常输入，验证“切换方式：交互界面里有快捷键循环切换（界面会提示当前模式），也可以启动时用参数指定。”，输出首个偏差位置与回归测试结果。
> - 实现“Claude Code（06） - 权限模式与 Plan Mode：安全地放手 / 重点：Plan Mode（计划模式）”的最小代码或配置，检验“Plan Mode 是新手到进阶都极其好用的一招。”，输出命令、结果与 Diff，并说明不适用边界。

> 本章目标：理解各种权限模式，学会用 Plan Mode 先规划后执行，按风险控制放手程度。


---

# 一、为什么要有权限

Claude Code 能改文件、跑命令——这很强，但也意味着它可能**误删、误改、跑出有副作用的命令**。权限机制就是给你一个「方向盘」：决定它哪些操作可以自己来、哪些得先问你。

核心思想：**按操作的「可逆性 + 影响面」来把关。** 改一个文件（可逆）和 `rm -rf`（不可逆）显然不该一视同仁。

---

# 二、几种权限模式

不同模式 = 放手程度不同。从紧到松大致是：

| 模式 | 行为 | 适合场景 |
| --- | --- | --- |
| **默认（询问）** | 改文件 / 跑命令前都征求你同意 | 不熟的项目、重要改动，最安全 |
| **接受编辑（acceptEdits）** | 自动接受文件编辑，但跑命令仍可能问 | 你已信任它、改动密集的体力活 |
| **计划（plan）** | 只读！只分析、只出计划，不动任何文件 | 想先理解 / 先讨论方案，零风险 |
| **bypass（绕过）** | 几乎不问，全自动 | 沙箱/CI 等可控环境，**本机慎用** |

切换方式：交互界面里有快捷键循环切换（界面会提示当前模式），也可以启动时用参数指定。

> 🔑 经验：**任务越不可逆、影响越大，越往「紧」的模式靠。** 拿不准就用默认（询问）。

---

# 三、重点：Plan Mode（计划模式）

Plan Mode 是新手到进阶都极其好用的一招。它把 Claude Code 限制在**只读**：只能看代码、分析、给计划，**绝不碰你的文件**。

## 3.1 什么时候用

- **复杂功能开发**：任务涉及多文件、多步骤，先要个全局方案；
- **代码库分析**：动手前先系统理解项目结构；
- **方案讨论**：想反复确认需求和思路，再开始执行。

## 3.2 怎么用

进入 Plan Mode 后，这样和它对话：

```text
我需要把认证系统迁移到 OAuth2。先别改代码，给我一份详细的迁移计划。
```

它会给出步骤计划。你接着追问、施压、补充：

```text
那向后兼容怎么办？
数据库迁移这一步具体怎么做？
```

反复打磨到满意，**再退出 Plan Mode 让它执行**。

> 💡 计划出来后，通常可以直接编辑它（界面会提示快捷键），改两笔再让它按修订版执行。

## 3.3 为什么强烈推荐

「先规划，再执行」能避免它**一上来就闷头写代码、写歪了再大改**。复杂任务尤其明显：30 秒看一份计划，省下半小时返工。

---

# 四、和 CLAUDE.md 配合

可以在 `CLAUDE.md` 里固化权限相关的约定，比如「涉及数据库 migration 的操作必须先暂停让我确认」。把安全边界写成规则，它就会持续遵守（呼应第 05 章）。

---

# 五、常见错误

**错误 1：图省事全程开 bypass**
本机上全自动 = 把方向盘扔了。一个误操作可能删库删文件。**bypass 只在沙箱/CI 等可控环境用。**

**错误 2：复杂任务不先 Plan，直接让它写**
它会边想边写，方向错了你才发现，已经改了一堆。复杂任务**先 Plan Mode 对齐方案**。

**错误 3：高风险操作盲目点同意**
它要跑 `rm`、要改生产配置、要动 migration——这种时候**看清楚再点**，别手滑一路 yes。

**错误 4：嫌「询问」烦就一直自动接受**
体力活可以 acceptEdits 提速，但碰核心模块/安全相关，还是回到「询问」稳妥。

---

# 六、最佳实践

1. **默认从严**：不熟的项目、重要改动，用默认（询问）模式。
2. **复杂任务先 Plan**：「先别写代码，给我计划」——性价比最高的习惯之一。
3. **按风险切换**：体力活 acceptEdits 提速，高风险操作切回询问、逐个确认。
4. **bypass 关进沙箱**：只在 CI、容器等可控环境用，本机别开。
5. **把边界写进 CLAUDE.md**：高危操作要求先确认，固化成规则。

---

# 七、动手实践：Demo 06 · 权限模式与 Plan Mode 演练

本 Demo 给你一组**场景卡片**和一段适合用 Plan Mode 演练的「迁移需求」，帮你练习「按风险选模式」和「先规划后执行」。

## 7.1 文件说明

- `场景选模式.md`：给定若干任务，练习该用哪种权限模式。
- `plan-mode演练.md`：一个适合 Plan Mode 的复杂需求脚本，照着和 Claude 对话。

## 7.2 怎么用

1. 打开 `场景选模式.md`，对每个场景先自己判断该用哪种模式，再看答案。
2. 打开 `plan-mode演练.md`，进入 Plan Mode（只读），照脚本和 Claude 反复打磨方案——全程它不会改任何文件。

<!-- knowledge-practice-materials-merged -->

## 7.3 配套实践材料

以下材料已并入正文，便于阅读时直接对照和练习。

### 场景选模式.md

````markdown
# 场景练习：这个任务该用哪种权限模式？

> 先自己判断，再看「参考」。模式从紧到松：询问 → 接受编辑 → 计划 → bypass。

## 场景 1
刚 clone 一个不熟的开源项目，想让 Claude 改一处逻辑。
- 参考：**默认（询问）**。不熟 + 重要改动，逐步确认最稳。

## 场景 2
让它把 200 个文件里的旧 API 名批量替换成新的，纯体力活，你已验证过它的方案。
- 参考：**接受编辑（acceptEdits）**。改动密集且已信任，自动接受提速。

## 场景 3
想先搞懂一个陌生模块的结构，再决定怎么改。
- 参考：**计划（Plan Mode）**。只读分析，零风险。

## 场景 4
在 CI 沙箱里跑全自动脚本，环境可随时销毁重建。
- 参考：**bypass**。可控环境才用，本机别开。

## 场景 5
它提出要跑 `rm -rf build/ && reset --hard`。
- 参考：**逐个确认**。破坏性命令看清楚再点，别一路 yes。
````

### plan-mode演练.md

````markdown
# Plan Mode 演练脚本

> 先进入 Plan Mode（只读），全程它不改文件。照下面顺序对话，体会「先规划后执行」。

## 演练需求
假设你有个用 session 做登录的项目，想迁移到 JWT。

## 对话脚本
1. 我想把登录从 session 迁移到 JWT。先别改代码，给我一份详细迁移计划。
2. 那向后兼容怎么办？已登录用户会不会掉线？
3. 数据库这边需要改吗？具体哪一步做？
4. 把计划按「阶段 + 每阶段产出 + 风险」重新整理一遍。

## 关键体会
- 全程零改动，纯讨论方案。
- 方案满意后，再退出 Plan Mode 让它执行。
- 复杂任务这样做，能避免它闷头写歪再大改。
````

# 八、总结

- **为什么要有权限**：权限机制就是给你一个「方向盘」：决定它哪些操作可以自己来、哪些得先问你。
- **几种权限模式**：| 模式 | 行为 | 适合场景 |
- **重点：Plan Mode（计划模式）**：Plan Mode 是新手到进阶都极其好用的一招。
- **和 CLAUDE.md 配合**：可以在 CLAUDE.md 里固化权限相关的约定，比如「涉及数据库 migration 的操作必须先暂停让我确认」。
- **常见错误**：错误 3：高风险操作盲目点同意
- **最佳实践**：默认从严：不熟的项目、重要改动，用默认（询问）模式。 -> 复杂任务先 Plan：「先别写代码，给我计划」——性价比最高的习惯之一。 -> 按风险切换：体力活 acceptEdits 提速，高风险操作切回询问、逐个确认。 -> bypass 关进沙箱：只在 CI、容器等可控环境用，本机别开。

## 参考资料

- [Claude Code 文档](https://docs.anthropic.com/en/docs/claude-code/overview)
- [Claude Code 安全](https://docs.anthropic.com/en/docs/claude-code/security)

<!-- knowledge-scenario-inlined:AC-03 -->

## 8.1 可运行实验：权限、Plan Mode 与 Diff 审批


```html runnable file=index.html title="权限、Plan Mode 与 Diff 审批" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AC-03 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AC-03 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: '权限、Plan Mode 与 Diff 审批', summary: '同一动作在只读、询问和自动执行模式下必须得到不同决策。', controls: [
        { key: 'mode', label: '授权模式', type: 'select', value: 'ask', options: [['plan', 'Plan Mode'], ['ask', 'Ask before write'], ['auto', 'Auto edit']] },
        { key: 'action', label: '工具动作', type: 'select', value: 'patch', options: [['read', '读取文件'], ['patch', '应用补丁'], ['network', '访问网络'], ['delete', '删除目录']] },
        { key: 'scope', label: '目标范围', type: 'select', value: 'file', options: [['file', '单个已解析文件'], ['workspace', '当前工作树'], ['broad', '未解析的宽泛路径']] }
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
          /** 当前动作是否只读取现有状态。 */
          const readOnly = values.action === 'read';
          /** 当前动作是否属于高风险删除。 */
          const destructive = values.action === 'delete';
          /** 当前决策是否允许直接执行。 */
          const allowed = !fail && values.scope !== 'broad' && (readOnly || (values.mode === 'auto' && !destructive));
          /** 当前决策是否必须询问用户。 */
          const ask = !allowed && values.mode !== 'plan' && values.scope !== 'broad';
          return { metrics: [[allowed ? 'ALLOW' : ask ? 'ASK' : 'DENY', '最终决策'], [values.mode.toUpperCase(), '授权模式'], [values.scope, '目标范围'], [destructive ? 'HIGH' : readOnly ? 'LOW' : 'MEDIUM', '风险级别']], stages: [stage('解析目标', values.scope === 'broad' ? 'fail' : 'ok', values.scope), stage('权限匹配', values.mode === 'plan' && !readOnly ? 'warn' : 'ok', values.mode), stage('Diff 审批', readOnly ? 'ok' : allowed ? 'ok' : ask ? 'warn' : 'fail', allowed ? '通过' : '待确认'), stage('执行', allowed ? 'ok' : 'fail', allowed ? '已模拟' : '未执行')], rows: [['Plan Mode', values.mode === 'plan' ? '只允许读取和规划，不构成写入授权' : '当前不在只读计划模式'], ['宽泛路径', values.scope === 'broad' ? '目标未解析，拒绝递归或破坏性动作' : '目标已限定'], ['故障注入', fail ? '模拟共享组件影响面未检查，强制阻断' : '未发现额外风险']], diagnosis: allowed ? '动作满足当前授权和目标边界，可以进入执行后验证。' : '动作未执行。拒绝或询问是权限系统的正确结果，不是工具故障。', danger: !allowed };
         }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
