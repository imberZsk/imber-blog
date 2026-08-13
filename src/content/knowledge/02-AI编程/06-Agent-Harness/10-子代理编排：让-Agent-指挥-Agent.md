# Agent Harness（10） - 子代理编排：让 Agent 指挥 Agent

## 核心知识清单

- Subagent 与 Multi-Agent 的适用边界
- Supervisor 集中编排与结果汇总
- Router 分类分发与并行专家
- Handoff 控制权和会话状态交接
- fan-out、fan-in 与部分失败
- 上下文隔离、权限裁剪与预算

> 读完后，你应能解释“Subagent 与 Multi-Agent 的适用边界”，复现“Supervisor 集中编排与结果汇总”的最小实现，并用“Router 分类分发与并行专家”检查结果与失败边界。

> 到这里，你已经能造一个完整的单体 Agent 了。但当任务又大又杂时，单个 Agent 会遇到瓶颈：上下文塞不下、干活太慢、容易跑偏。
> 解法是"分身术"——让**主 Agent 把活拆开，派给多个子 Agent（sub-agent）去干**。这一章讲清楚为什么要这么做，以及怎么做。

---

# 一、为什么需要子代理：单体 Agent 的三个瓶颈

想象一个任务："分析这个项目里 20 个模块，分别总结每个模块干嘛的。"

让一个 Agent 硬扛会怎样？

1. **上下文爆炸**：20 个模块的代码全读进一个上下文，窗口分分钟撑爆（第 06 章的痛）。
2. **慢**：一个一个串行读、串行分析，干到天黑。
3. **互相干扰**：读了模块 A 的细节，分析模块 B 时这些细节还堵在上下文里，又占地方又分心。

子代理就是来解决这三个问题的：

> **把大任务拆成小块，每块交给一个"全新的、干净的"子 Agent 独立处理，多个子 Agent 还能并行干。** 主 Agent 只负责拆活、派活、收结果。

这就像一个项目经理（主 Agent）带一个团队（子 Agent 们）：经理不亲自写每行代码，而是拆任务、分给组员并行做、最后汇总。

---

# 二、核心机制：上下文隔离 + 结果回传

子代理的精髓在于**上下文隔离**：

```
主 Agent（上下文：任务全局、各子任务的"结论"）
   │
   ├── 派活 ──▶ 子Agent A（独立干净的上下文：只装模块A的细节）──▶ 回传"模块A总结"
   │
   ├── 派活 ──▶ 子Agent B（独立干净的上下文：只装模块B的细节）──▶ 回传"模块B总结"
   │
   └── 派活 ──▶ 子Agent C（独立干净的上下文：只装模块C的细节）──▶ 回传"模块C总结"
```

关键点：

- **每个子 Agent 有自己独立的上下文窗口**，互不污染。子 A 读了多少模块 A 的细节，都不会占用主 Agent 或子 B 的窗口。
- **子 Agent 只把"结论"回传给主 Agent**，不回传一路读过的原始细节。主 Agent 的上下文因此保持精简——它只拿到 3 句总结，而不是 3 个模块的全部代码。
- 这正是第 06 章"上下文质量 > 数量"的放大版：**用隔离换取每个上下文的干净。**

---

# 三、子代理本质上是什么？一个"工具"

这里有个让人豁然开朗的视角：

> **从主 Agent 的角度看，"派一个子 Agent" 其实就是调用一个特殊的工具。** 这个工具叫 `spawn_agent`，输入是"子任务描述"，输出是"子 Agent 干完后的结论"。

所以子代理编排没有引入全新机制——它还是第 02 章那个循环，只不过工具箱里多了个能"再开一个 Agent 循环"的工具：

```python
def spawn_agent(task: str) -> str:
    """工具：开一个全新的子 Agent（独立上下文）去完成子任务，返回它的最终结论"""
    # 子 Agent 跑的还是同一个 agent_loop，但 messages 是全新的、干净的
    return agent_loop(task, tools=SUB_AGENT_TOOLS)  # 注意：全新对话，不带主 Agent 的历史
```

主 Agent 调这个工具，就等于"招了个临时工去干一件事，干完汇报"。**循环套循环，仅此而已。**

---

# 四、并行：子代理最香的地方

子任务之间互不依赖时，可以**并行派发**，速度起飞：

```python
from concurrent.futures import ThreadPoolExecutor

def fan_out(subtasks: list[str]) -> list[str]:
    """把多个互不依赖的子任务并行派给多个子 Agent，一起拿回结果"""
    # 20 个模块并行分析，墙上时间约等于"最慢的那一个"，而不是 20 个之和
    with ThreadPoolExecutor(max_workers=5) as pool:
        return list(pool.map(spawn_agent, subtasks))
```

串行干 20 个模块要 20 份时间，并行（5 个一批）大约只要 4 份。**这是子代理相比单体 Agent 最直接的收益。**

> ⚠️ 但记住第 04 章的提醒：**只有互不依赖的子任务才能并行**。如果子任务 B 需要子任务 A 的结果，就得串行——先拿到 A 的结论，再据此派 B。

---

# 五、什么时候用、什么时候别用

子代理很强，但不是银弹。**它有成本**：每个子 Agent 都要独立跑循环、独立烧 token，开销可能成倍增长。

**适合用子代理：**

- 任务能**清晰拆成互相独立的小块**（分析多个文件、并行搜索多个方向）
- 子任务会产生**大量中间细节**，但主 Agent 只关心结论（用隔离保护主上下文）
- 需要**并行提速**

**不适合用子代理：**

- 任务很简单，单个 Agent 几步就搞定——杀鸡用牛刀，徒增开销和复杂度
- 子任务**强依赖、来回交互频繁**——拆开反而增加协调成本
- 对 token 成本敏感的场景——子代理会显著放大消耗

判断口诀：

> **"这活能拆成几摊互不相干、又各自啰嗦的子活吗？" 能，子代理就值；不能，单体 Agent 更省心。**

---

# 六、常见误区

❌ **误区 1：什么任务都拆子代理。** 简单任务拆子代理是过度设计，多花钱多添乱。先问"真的需要隔离/并行吗"。

❌ **误区 2：把一路细节也回传给主 Agent。** 那就失去了"上下文隔离"的意义。**子 Agent 只回传结论**，细节留在它自己的窗口里随用随弃。

❌ **误区 3：强依赖的子任务硬并行。** B 依赖 A 的结果却并行跑，B 拿不到 A 的产出，必然出错。有依赖就串行。

❌ **误区 4：忽视成本。** 多个子 Agent = 成倍的 token。该用则用，但心里要有账。

---

# 七、最佳实践

✅ **先判断值不值得拆**：能拆成独立、各自啰嗦的子活，才上子代理。
✅ **把子代理当成一个"工具"理解**（spawn_agent），就是循环套循环，不神秘。
✅ **子 Agent 用全新干净的上下文**，只回传结论给主 Agent，保护主上下文。
✅ **互不依赖的子任务并行派发**提速；有依赖的老老实实串行。
✅ **心里记着 token 成本**，别为省时间无脑开一堆子 Agent。

---

# 八、总结

- 单体 Agent 面对又大又杂的任务有三个瓶颈：**上下文爆炸、慢、互相干扰**。
- 子代理用**上下文隔离 + 结果回传**破局：每个子 Agent 独立干净的窗口，只把结论交回主 Agent。
- 本质上，**派子代理就是调一个 `spawn_agent` 工具**——循环套循环，没有新魔法。
- 最大收益是**并行提速**（仅限互不依赖的子任务）；但子代理**有成本**，要判断值不值得拆。

进阶篇最后一章，我们讲怎么在**不改 harness 内核**的前提下扩展能力——**Hooks 和 Skills**。

> 📁 **对应 Demo**：`09-subagent-demo/` —— 主 Agent 把"分别总结 3 个文件"的活并行派给 3 个子 Agent，对比串行 vs 并行的耗时，并展示子 Agent 只回传结论。

---

<!-- knowledge-lab-merged -->

# 动手实践：子代理编排：主 Agent 并行指挥 3 个子 Agent

## 怎么跑

无需 API Key，直接跑（用 sleep 模拟每个子 Agent 的处理耗时）：

```bash
python demo.py
```

输出大致是：

```
=== 串行执行 ===
子Agent 处理 a.py ... 完成
子Agent 处理 b.py ... 完成
子Agent 处理 c.py ... 完成
串行耗时：约 3.0 秒

=== 并行执行 ===
（3 个子 Agent 同时开工）
并行耗时：约 1.0 秒

=== 主 Agent 汇总 ===
主 Agent 只收到 3 句结论（没有收到 3 个文件的全部内容）：
- a.py: ...
- b.py: ...
- c.py: ...
```

## 看点

1. **上下文隔离**：每个子 Agent 处理自己的文件，主 Agent 最后只拿到结论列表——对照第 09 章"只回传结论"。
2. **并行提速**：串行约 3 秒，并行约 1 秒——这就是子代理最香的收益。
3. **spawn_agent 就是个工具**：看 `spawn_sub_agent` 函数，它对主 Agent 来说就是一次"调用"。
4. 把文件数量加到 6 个，再看串行/并行耗时差距如何拉大。

## 参考资料

- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [OWASP Agentic Security](https://genai.owasp.org/)

<!-- knowledge-scenario-inlined:AC-06 -->

## 可运行实验：Subagent 任务图与并发预算

调整参数并注入失败，重点对比正常路径、保护条件和失败诊断；运行源码与文章保存在同一个 Markdown 文件。

```html runnable file=index.html title="Subagent 任务图与并发预算" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AC-06 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AC-06 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'Subagent 任务图与并发预算', summary: '根据 DAG 依赖和共享文件写集合计算并发批次与冲突。', controls: [
        { key: 'slots', label: '并发槽位', type: 'range', min: 1, max: 5, value: 3, suffix: ' 个' },
        { key: 'tasks', label: '子任务数量', type: 'range', min: 3, max: 9, value: 6, suffix: ' 个' },
        { key: 'strategy', label: '冲突策略', type: 'select', value: 'ownership', options: [['none', '不分配文件所有权'], ['ownership', '按文件所有权'], ['serial', '全部串行']] }
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
          /** 串行策略或并发槽位决定的实际并发数。 */
          const concurrency = values.strategy === 'serial' ? 1 : Math.min(values.slots, values.tasks);
          /** 任务需要的并发批次数。 */
          const waves = Math.ceil(values.tasks / concurrency);
          /** 未划分文件所有权时可能出现的冲突数。 */
          const conflicts = values.strategy === 'none' ? Math.max(1, Math.floor(values.tasks / 3)) : fail ? 1 : 0;
          /** 完成全部批次的估算时间。 */
          const duration = waves * 4 + conflicts * 3;
          return { metrics: [[concurrency, '实际并发'], [waves, '执行批次'], [conflicts, '文件冲突'], [duration + 'm', '估算耗时']], stages: [stage('拆分 DAG', 'ok', values.tasks + ' tasks'), stage('检查依赖', fail ? 'warn' : 'ok', fail ? '缺失边' : 'valid'), stage('分配所有权', values.strategy === 'ownership' ? 'ok' : values.strategy === 'serial' ? 'warn' : 'fail', values.strategy), stage('并发执行', conflicts ? 'warn' : 'ok', concurrency), stage('汇总', conflicts ? 'fail' : 'ok', conflicts ? '待解决' : '完成')], rows: [['可并行任务', Math.max(0, values.tasks - 2) + ' 个，根任务与汇总保持依赖'], ['冲突传播', conflicts ? conflicts + ' 个任务修改同一文件，汇总前必须解决' : '写集合互斥，可直接汇总'], ['失败策略', fail ? '一个依赖任务超时，下游任务取消' : '失败只取消依赖分支']], diagnosis: conflicts ? '增加槽位不会消除共享文件冲突，应先按文件或模块划分所有权。' : 'DAG 依赖和写集合清晰，并发能缩短关键路径。', danger: conflicts > 0 };
         }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
