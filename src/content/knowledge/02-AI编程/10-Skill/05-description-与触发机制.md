# Skill（05） - description 与触发机制

> 读完后，你应能完成以下任务：
> - 绘制“Skill（05） - description 与触发机制 / 先理解：Claude 是怎么「选技能」的”的关键对象与数据流，解释“description 写得好不好，直接决定你的技能会不会被触发。”，并用源码位置、日志或 Trace 标注证据。
> - 为“Skill（05） - description 与触发机制 / 高触发率描述的写作公式”设计正常与异常输入，验证“一个好描述，回答两个问题：这技能干什么 + 用户什么时候会需要它。”，输出首个偏差位置与回归测试结果。
> - 实现“Skill（05） - description 与触发机制 / 三个关键技巧”的最小代码或配置，检验“因为 Claude 是在「替用户判断要不要用它」，描述写成「用户会在什么情况下需要它」，匹配视角才对得上。”，输出命令、结果与 Diff，并说明不适用边界。

> 本章目标：理解 Claude 靠 `description` 决定要不要加载技能，并学会写出「触发率高」的描述。学完你会拿到好/坏案例对照 + 一个写作公式。

# 一、先理解：Claude 是怎么「选技能」的

想象 Claude 面前摆着一排技能卡片，每张卡片上只印着 `name` 和 `description`。当你说一句话，它做的事情大致是：

> 「用户想干这个……我手上哪张卡片的 `description` 描述的场景跟它最像？」

匹配上了，就加载那个技能的正文去执行；没匹配上，技能就**静静躺着，永远不会被用**。

所以结论很直接：

> **`description` 写得好不好，直接决定你的技能会不会被触发。正文写得再漂亮，描述不行，也是白搭。**

这就是为什么我们要专门花一章讲它。

# 二、高触发率描述的写作公式

一个好描述，回答两个问题：**这技能干什么** + **用户什么时候会需要它**。套用这个公式：

> **当用户需要 [做某事 / 解决某问题]、涉及 [具体场景/关键词] 时使用。**

例子：

```yaml
description: 当用户需要审查代码质量、查找 bug、检查安全漏洞或代码规范问题时使用。
```

拆开看，它包含了三类「钩子」，让匹配更准：

- **动作词**：审查、查找、检查
- **对象**：代码质量、bug、安全漏洞、规范
- **场景信号**：「当用户需要……时」

用户无论说「帮我看看这段代码有没有问题」「检查下安全」「这代码规范吗」，都能命中其中某个钩子。

# 三、三个关键技巧

## 3.1 技巧一：用第三人称 + 描述场景

```yaml
# ❌ 第一人称/祈使句，像在跟技能说话
description: 审查代码并报告问题

# ✅ 第三人称，描述「何时该用」
description: 当用户需要审查代码、查找 bug 时使用
```

为什么？因为 Claude 是在「替用户判断要不要用它」，描述写成「用户会在什么情况下需要它」，匹配视角才对得上。

## 3.2 技巧二：塞进用户真实会说的词

用户不会用你的「行话」。你心里想的是「静态代码分析」，用户嘴上说的是「这代码有没有 bug」。**描述里要放用户真实会用的说法**：

```yaml
# ❌ 只有专业术语，用户的大白话匹配不上
description: 执行静态代码分析与圈复杂度评估

# ✅ 覆盖用户真实说法
description: 当用户想检查代码有没有 bug、是否安全、写得规不规范时使用
```

## 3.3 技巧三：边界要清楚，别太宽也别太窄

- **太窄**：`description: 审查 Python 的 SQL 注入漏洞` → 用户问「看看我这段 JS 代码」就匹配不上了。
- **太宽**：`description: 帮助处理代码相关的一切问题` → 太笼统，跟「写代码」「解释代码」等需求混在一起，反而抢了别的技能的活，或者该用时不用。
- **刚好**：圈定一个**清晰、单一的职责范围**，把这个范围内的常见说法覆盖全。

# 四、好 / 坏案例对照

| 场景 | ❌ 差描述 | ✅ 好描述 |
|------|----------|----------|
| 代码审查 | `代码审查工具` | `当用户需要审查代码质量、查找 bug、检查安全漏洞时使用` |
| 提交信息 | `commit` | `当用户写完代码改动、需要生成 Git 提交信息时使用` |
| 文字润色 | `润色` | `当用户需要润色、改写文字，让表达更专业通顺时使用，适用于优化邮件、文档措辞` |
| SQL 优化 | `数据库` | `当用户的 SQL 查询很慢、需要分析执行计划并优化性能时使用` |

规律一眼可见：差的全是干巴巴的名词；好的都说清了「**谁、在什么情况下、为了什么**」会用它。

# 五、怎么验证描述写得好不好

写完别自我感觉良好，做个简单测试：

1. **想 3~5 句用户可能说的话**（用大白话，别用术语）。
2. 逐句问自己：「Claude 看到这句，能从我的描述里找到匹配的钩子吗？」
3. 如果有某句明显匹配不上 → 把那句里的关键词补进描述。
4. 实测：开新会话说那几句话，看技能到底有没有被触发（用第 02 章的「埋暗号」法）。

# 六、常见错误

- **❌ 只写技能名当描述**：`description: 周报生成器`。等于没给钩子。
- **❌ 全是术语，没有用户语言**：用户的大白话一句都匹配不上。
- **❌ 描述和正文职责不一致**：描述说「审查代码」，正文却在教「怎么写代码」，触发了也是答非所问。
- **❌ 一个描述想覆盖太多职责**：什么都想接，结果什么都接不准。该拆成多个技能。
- **❌ 写了却从不实测**：自以为能触发，实际从没被选中。

# 七、最佳实践

- **套公式起步**：「当用户需要 [做某事]、涉及 [场景关键词] 时使用」。
- **站在用户角度选词**：把用户真实会说的大白话塞进去。
- **一个技能一个清晰边界**：描述能精准圈出职责，不贪多。
- **写完必实测**：用「想几句大白话 + 埋暗号验证」来确认触发率。
- **触发不稳就回头改描述**，而不是改正文——没被触发，问题 99% 出在描述。

# 八、动手实践：05 章 Demo · description 改写练习

光看公式记不牢，自己改一遍才会。这个 Demo 给你 4 个「差描述」，你试着改好，再对照参考答案。

## 8.1 文件

```text
06-description触发开关-demo/
├── README.md          # 你正在看的
└── 练习与答案.md       # 4 道改写题 + 参考答案 + 自测话术
```

## 8.2 怎么练

1. 打开 `练习与答案.md`，先盖住答案，自己改写那 4 个差描述。
2. 每改完一个，用「自测话术」检验：想 3 句用户大白话，看能不能命中你的描述。
3. 再对照参考答案，看差距在哪。

## 8.3 进阶：真机实测

挑你改得最满意的一个，做成真技能装进 `~/.claude/skills/`，用第 02 章的「埋暗号」法验证它到底会不会被触发。**这是检验描述好坏的终极标准。**

## 8.4 你会收获什么

- 把「写作公式 + 三技巧」从「看懂」变成「会用」。
- 建立「写完必实测」的习惯。

<!-- knowledge-practice-materials-merged -->

## 8.5 配套实践材料

以下材料已并入正文，便于阅读时直接对照和练习。

### 练习与答案.md

````markdown
# description 改写练习

## 公式回顾

> 当用户需要 [做某事 / 解决某问题]、涉及 [具体场景/关键词] 时使用。

三技巧：① 第三人称讲场景 ② 塞用户大白话 ③ 边界清晰不贪多。

---

## 题目（先盖住下面的答案，自己改）

把下面 4 个「差描述」改成高触发率版本：

1. `description: 翻译`
2. `description: 测试用例生成器`
3. `description: 数据库`
4. `description: 帮助处理所有文档相关的事情`

---

## 自测话术

改完每一个，想 3 句用户真实会说的大白话，检查能不能命中。例如第 1 题：
- 「把这段英文翻成中文」
- 「这句日语啥意思」
- 「帮我把这封邮件翻译成英文」

---

## 参考答案

<details>
<summary>点开对照</summary>

1. **翻译**
   `当用户需要在不同语言之间翻译文字（如中英互译、邮件/文档翻译）时使用。`

2. **测试用例生成器**
   `当用户写完一个函数或接口、需要为它生成单元测试或测试用例时使用，覆盖正常和边界情况。`

3. **数据库**（太宽，要收窄到单一职责）
   `当用户的 SQL 查询很慢、需要分析执行计划并优化查询性能时使用。`
   （注意：原来的「数据库」太笼统，建库、写 SQL、优化是不同的事，这里聚焦「优化慢查询」一个职责。）

4. **帮助处理所有文档相关的事情**（太宽，必须拆）
   这个不该是一个技能。应拆成多个，比如：
   - `当用户需要把零散内容整理成结构化文档（如周报、需求文档）时使用。`
   - `当用户需要润色、精简已有文档的措辞时使用。`

</details>

## 关键收获

- 差描述的通病：**只有名词、没有场景、边界要么太窄要么太宽**。
- 第 3、4 题提醒你：**描述写不下去、什么都想塞，往往是「职责不单一」的信号——该拆技能了。**
````

# 九、总结

- **先理解：Claude 是怎么「选技能」的**：description 写得好不好，直接决定你的技能会不会被触发。
- **三个关键技巧**：因为 Claude 是在「替用户判断要不要用它」，描述写成「用户会在什么情况下需要它」，匹配视角才对得上。
- **好 / 坏案例对照**：| 文字润色 | 润色 | 当用户需要润色、改写文字，让表达更专业通顺时使用，适用于优化邮件、文档措辞 |
- **常见错误**：❌ 全是术语，没有用户语言：用户的大白话一句都匹配不上。
- **最佳实践**：一个技能一个清晰边界：描述能精准圈出职责，不贪多。
- **技巧二：塞进用户真实会说的词**：你心里想的是「静态代码分析」，用户嘴上说的是「这代码有没有 bug」。

## 参考资料

- [Agent Skills 规范](https://agentskills.io/specification)
- [MCP 规范](https://modelcontextprotocol.io/specification/latest)

<!-- knowledge-scenario-inlined:AC-07 -->

## 9.1 可运行实验：Skill 触发与渐进式披露


```html runnable file=index.html title="Skill 触发与渐进式披露" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AC-07 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AC-07 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'Skill 触发与渐进式披露', summary: '比较 description 精确度、误触发率与一次性加载资料造成的上下文成本。', controls: [
        { key: 'specificity', label: '描述精确度', type: 'range', min: 20, max: 100, step: 10, value: 80, suffix: '%' },
        { key: 'skills', label: '候选 Skills', type: 'range', min: 3, max: 20, value: 8, suffix: ' 个' },
        { key: 'loading', label: '资料加载', type: 'select', value: 'progressive', options: [['all', '一次加载全部'], ['progressive', '按需渐进加载']] }
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
          /** 由描述精确度和候选规模共同决定的触发准确率。 */
          const precision = Math.max(35, Math.min(99, values.specificity - Math.max(0, values.skills - 8) * 2 - (fail ? 20 : 0)));
          /** 预计会误触发的 Skill 数量。 */
          const falseTriggers = Math.round(values.skills * (100 - precision) / 100);
          /** 本轮资料进入上下文的 Token。 */
          const tokens = values.loading === 'all' ? values.skills * 1800 : 900 + Math.max(1, falseTriggers) * 350;
          return { metrics: [[precision + '%', '触发准确率'], [falseTriggers, '误触发'], [tokens.toLocaleString(), '加载 Tokens'], [values.loading === 'all' ? 'EAGER' : 'LAZY', '披露策略']], stages: [stage('任务匹配', precision >= 75 ? 'ok' : 'warn', precision + '%'), stage('冲突消解', falseTriggers <= 1 ? 'ok' : 'warn', falseTriggers), stage('读取 SKILL', 'ok', '完整入口'), stage('加载参考', values.loading === 'progressive' ? 'ok' : 'warn', values.loading), stage('执行', fail ? 'fail' : 'ok', fail ? '资源缺失' : 'ready')], rows: [['过宽描述', precision < 70 ? '多个通用任务都会误触发，应补充适用与不适用边界' : '触发边界可区分'], ['渐进披露', values.loading === 'progressive' ? '先读入口，只在需要时加载 reference/scripts' : '一次加载全部资料，挤占任务上下文'], ['故障注入', fail ? '入口引用的资源不存在，执行前报错' : '资源引用可解析']], diagnosis: precision >= 75 && values.loading === 'progressive' && !fail ? '触发质量与上下文成本均在可接受范围。' : '应收紧 description，并按任务阶段加载资源。', danger: fail || precision < 60 };
         }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
