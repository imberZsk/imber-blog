# 工程化工作流（05） - Test Driven Development 与 Systematic Debugging：用证据约束修改

> 读完后，你应能解释“一、TDD 的最小循环”，复现“二、调试的四个阶段”的最小实现，并用“三、选择哪一个”检查结果与失败边界。

TDD 用失败测试定义新行为，系统化调试用可复现证据定位已有故障。共同原则是：**没有看到问题，就不要声称修复；没有看到测试先失败，就不知道测试是否真的覆盖需求。**

# 一、TDD 的最小循环

1. 写一个只描述当前行为的测试。
2. 运行它，确认因预期原因失败。
3. 写让测试通过的最小实现。
4. 再次运行测试，确认通过。
5. 保持测试通过的前提下整理代码。

```text
需求：空标题应返回“未命名文章”。
RED：新增空字符串用例，确认当前返回空字符串而失败。
GREEN：只增加空值回退，不重构其他标题逻辑。
VERIFY：运行目标测试，再运行受影响模块测试。
```

# 二、调试的四个阶段

`systematic-debugging`
强调先调查根因：稳定复现、读取错误与调用链、比较正常和异常路径、提出一个可证伪假设，然后只改能验证该假设的最小代码。

常见反模式是连续尝试多个 CSS、超时或空判断，直到现象暂时消失。这样既不知道哪个修改有效，也无法解释为什么不会复发。

# 三、选择哪一个

- 新功能或明确新规则：先 TDD。
- 历史故障、偶发异常、性能退化：先系统化调试。
- 修复根因后：用回归测试固定故障场景。

# 四、官方资料

- [test-driven-development](https://github.com/obra/superpowers/tree/main/skills/test-driven-development)
- [systematic-debugging](https://github.com/obra/superpowers/tree/main/skills/systematic-debugging)

# 五、总结

- **调试的四个阶段**：systematic-debugging
- **选择哪一个**：新功能或明确新规则：先 TDD。
- **官方资料**：test-driven-development

## 参考资料

- [Git Worktree](https://git-scm.com/docs/git-worktree)
- [pytest 文档](https://docs.pytest.org/en/stable/)

<!-- knowledge-scenario-inlined:AC-08 -->

## 可运行实验：TDD 与系统化调试闭环

调整参数并注入失败，重点对比正常路径、保护条件和失败诊断；运行源码与文章保存在同一个 Markdown 文件。

```html runnable file=index.html title="TDD 与系统化调试闭环" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AC-08 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AC-08 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'TDD 与系统化调试闭环', summary: '比较复现、假设验证和最小修复与直接修改表象的结果。', controls: [
        { key: 'reproduce', label: '先稳定复现', type: 'select', value: 'yes', options: [['yes', '是'], ['no', '否']] },
        { key: 'hypotheses', label: '待验证假设', type: 'range', min: 1, max: 5, value: 3, suffix: ' 个' },
        { key: 'regression', label: '回归范围', type: 'select', value: 'focused', options: [['none', '无回归'], ['focused', '定向 + 边界'], ['all', '全量测试']] }
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
          /** 是否有稳定失败用例作为修复基线。 */
          const hasBaseline = values.reproduce === 'yes' && !fail;
          /** 当前回归策略覆盖的用例数量。 */
          const tests = values.regression === 'none' ? 0 : values.regression === 'focused' ? 4 : 48;
          /** 是否形成可证伪的完整调试闭环。 */
          const solved = hasBaseline && values.hypotheses >= 2 && tests >= 4;
          return { metrics: [[solved ? 'ROOT CAUSE' : 'SYMPTOM', '修复层级'], [values.hypotheses, '验证假设'], [tests, '回归用例'], [solved ? 'PASS' : 'RISK', '结论']], stages: [stage('复现', hasBaseline ? 'ok' : 'fail', values.reproduce), stage('收集证据', fail ? 'fail' : 'ok', 'stack + input'), stage('验证假设', values.hypotheses >= 2 ? 'ok' : 'warn', values.hypotheses), stage('最小修复', solved ? 'ok' : 'warn', solved ? 'branch only' : 'unproven'), stage('回归', tests >= 4 ? 'ok' : 'fail', tests)], rows: [['失败基线', hasBaseline ? '固定输入可稳定复现' : '没有稳定复现，无法证明修复有效'], ['根因证据', values.hypotheses >= 2 ? '对照实验排除至少一个替代解释' : '只验证单一猜测'], ['范围控制', values.regression === 'all' ? '全量测试成本高，仍需保留定向用例' : values.regression === 'focused' ? '定向和边界用例匹配改动范围' : '没有回归证据']], diagnosis: solved ? '修复建立在可复现失败与对照证据上，并由定向回归闭环。' : '当前只能说明现象变化，不能证明根因已修复。', danger: !solved };
         }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
