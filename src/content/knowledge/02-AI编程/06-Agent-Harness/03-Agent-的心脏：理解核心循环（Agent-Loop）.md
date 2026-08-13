# Agent Harness（03） - Agent 的心脏：理解核心循环（Agent Loop）

> 读完后，你应能解释“怎么跑”，复现“看点”的最小实现，并用“看点”检查结果与失败边界。

> 上一章我们说："harness 的那个循环，是 Agent 的心跳。"
> 这一章就来解剖这颗心脏。看懂了它，你就看懂了 90% 的 Agent——因为**几乎所有 Agent 的本质，都是同一个循环**。

---

# 一、为什么必须是"循环"，而不是"一条直线"

先想一个问题：你让 Agent "帮我把项目里所有 `.log` 文件删掉"。这事它能一步做完吗？

不能。它得：

1. 先**看看**有哪些 `.log` 文件（要先调一个"列目录"的工具）
2. **看到**结果之后，才知道具体要删哪几个
3. 然后**逐个删**（再调"删除"工具）
4. 删完**确认**一下还有没有漏的

关键点在第 2 步：**它必须先拿到第 1 步的结果，才能决定第 2 步干嘛。** 这种"走一步、看一眼、再决定下一步"的模式，天然就是个**循环**，不可能是一条提前规划好的直线。

这就是 Agent Loop 存在的根本原因：

> **真实任务是"探索式"的——下一步取决于上一步的结果。** 所以 harness 必须反复地"问模型→执行→把结果喂回→再问模型"，直到任务完成。

---

# 二、循环的四个动作：想 → 做 → 看 → 再想

把这个循环拆开，每一圈其实就四个动作。学术点的说法叫 **ReAct（Reasoning + Acting）**，但你记这四个字就够了：

```
        ┌─────────────────────────────────────┐
        │                                      │
        ▼                                      │
   ① 想（Reason）  模型思考："现在该干嘛？"      │
        │                                      │
        ▼                                      │
   ② 做（Act）     harness 执行模型选的工具      │
        │                                      │
        ▼                                      │
   ③ 看（Observe） 把工具结果（成功/报错）拿回来  │
        │                                      │
        ▼                                      │
   ④ 喂回去 ───────────────────────────────────┘
        （把"看到的"加进对话，回到①再想一轮）

   什么时候跳出循环？
   当①里模型说"我不需要再用工具了，这是最终答案" → 结束
```

用一句大白话总结：

> Agent Loop = **反复问模型"下一步干嘛"，照它说的做，把结果告诉它，再问——直到它说"搞定了"。**

---

# 三、跟着一个真实任务走一遍循环

任务：**"统计一下 notes 文件夹里一共有几个 .txt 文件，并告诉我它们的总字数。"**

假设 harness 给了两个工具：`list_dir`（列目录）和 `read_file`（读文件）。我们一圈一圈看：

```
第 1 圈
  ① 想：模型说"我得先看看 notes 里有哪些文件" → 请求 list_dir("notes")
  ② 做：harness 执行，得到 ["a.txt", "b.txt", "readme.md"]
  ③ 看：把这个列表喂回去
  ④ 回到 ①

第 2 圈
  ① 想：模型说"有 2 个 .txt。我要读第一个数字数" → 请求 read_file("notes/a.txt")
  ② 做：harness 读到内容（120 字）
  ③ 看：喂回去
  ④ 回到 ①

第 3 圈
  ① 想：模型说"再读第二个" → 请求 read_file("notes/b.txt")
  ② 做：读到内容（80 字）
  ③ 看：喂回去
  ④ 回到 ①

第 4 圈
  ① 想：模型说"信息齐了，不用再调工具了"
       → 给出最终答案："共 2 个 .txt 文件，总字数 200。"
  → 跳出循环，结束。
```

看到没？**模型一共"出手"了 3 次工具调用，循环转了 4 圈**，最后一圈才给答案。整个过程没有任何地方是提前写死的——读几个文件、读哪些，全是模型在每一圈现场决定的。这就是 Agent "看起来很智能"的真相：**一个朴素的循环 + 模型每圈的临场判断。**

---

# 四、循环何时停止？（三道刹车）

循环会自己转，那它怎么知道该停？靠三道"刹车"：

1. **正常刹车——模型说"我说完了"。** 当模型这一圈不再请求任何工具、直接输出文字答案时，harness 就知道任务完成，跳出循环。这是最常见的结束方式。

2. **安全刹车——到达最大轮次上限。** 万一模型抽风，陷入"读文件→读文件→读文件……"的死循环怎么办？所以**每个靠谱的 harness 都会设一个 `max_iterations`**（比如 50 圈）。到顶了无论如何都强制退出，防止烧光你的 API 额度。

3. **人工刹车——用户喊停。** 用户按 Ctrl+C，或在交互式 Agent 里打断它。

> ⚠️ 第 2 道刹车是新手最容易忘的。**没有轮次上限的循环 = 一颗随时可能引爆的账单炸弹。** 后面 demo 里我们会把它加上。

---

# 五、把循环写成代码

下面是 Agent Loop 的**真实骨架**，去掉花哨的部分就这么点东西：

```python
def agent_loop(user_input, tools, max_iterations=50):
    """Agent 的核心循环：反复"问模型→执行工具→喂回结果"，直到完成或触发刹车"""
    messages = [{"role": "user", "content": user_input}]

    # 安全刹车②：用 for + 上限，杜绝死循环烧钱
    for turn in range(max_iterations):
        reply = call_model(messages, tools=tools)   # ① 想

        # 正常刹车①：模型不再要工具 -> 这就是最终答案
        if not reply.tool_calls:
            return reply.text

        # 否则：执行模型请求的（可能多个）工具
        messages.append(reply.as_message())          # 记下"模型想调啥"
        for call in reply.tool_calls:                # ② 做
            result = tools[call.name](./03-agent核心循环/**call.args)
            messages.append(tool_result(call.id, result))  # ③ 看 + ④ 喂回

    # 兜底：转满了还没结束，强制退出（安全刹车）
    return "（已达最大轮次，任务可能未完成）"
```

把这段代码和第一章那个"伪代码循环"对一下，你会发现核心一模一样，只是多了 `max_iterations` 这道刹车，和"一圈可以有多个工具调用"的细节。

> 💡 记住这个骨架。**本小册后面所有内容，本质上都是在给这个循环"加料"**：第 04 章丰富 `tools`，第 06 章管理 `messages`（别让它撑爆），第 08 章在 `② 做` 那步加权限检查……万变不离其宗。

---

# 六、常见误区

❌ **误区 1：以为模型一次就能规划好所有步骤。**
不是。模型在第 1 圈根本不知道 notes 里有几个文件，它**只能走一步看一步**。指望它"一次性输出完整计划然后照做"，在面对未知环境时一定会翻车。循环的意义就是应对这种不确定性。

❌ **误区 2：忘了把工具结果喂回去（④）。**
新手最常见的 bug：执行了工具，但忘了把结果 append 进 messages 就进入下一圈。结果模型"瞎了"——它不知道上一步发生了什么，要么重复调用同一个工具，要么开始瞎编。**"看"和"喂回"这两步缺一不可。**

❌ **误区 3：不设轮次上限。**
前面强调过了：等于埋了个账单炸弹。务必设 `max_iterations`。

❌ **误区 4：把"循环"和"模型的思考"混为一谈。**
循环是 harness（你的代码）在转，思考是模型在做。循环本身不"聪明"，它聪明全靠每一圈调用的那个模型。**循环负责驱动，模型负责判断。**

---

# 七、最佳实践

✅ **永远设轮次上限**，并在到顶时给出清晰提示，而不是静默失败。

✅ **每一圈都完整走完"做→看→喂回"**，绝不能执行了工具却不把结果交还模型。

✅ **让循环对工具报错"有韧性"。** 工具执行失败时，别让整个程序崩溃——把错误信息也当成一种"观察结果"喂回给模型（"读文件失败：文件不存在"），让它自己决定换条路。这点第 04 章会专门讲。

✅ **调试时把每一圈都打印出来。** 循环是 Agent 的"病历"，把每圈的"想了啥、做了啥、看到啥"打出来，排查问题会非常顺手。本章 demo 就是这么干的。

---

# 八、总结

- Agent Loop 之所以是**循环**，是因为真实任务是探索式的：下一步取决于上一步的结果。
- 每一圈四个动作：**想（模型）→ 做（执行工具）→ 看（拿回结果）→ 喂回（继续）**。
- 三道刹车让它停下：**模型说完了 / 到达轮次上限 / 用户喊停**。轮次上限尤其不能忘。
- 代码骨架朴素到惊人，本小册后续内容几乎都是在给这个循环"加料"。

下一章，我们就把这个骨架变成**真能在你电脑上跑、能操作真实文件的 50 行 Agent**。

> 📁 **对应 Demo**：`02-agent-loop-demo/` —— 把循环每一圈的"想/做/看"全程打印出来，看着 Agent 一步步统计文件字数。

---

<!-- knowledge-lab-merged -->

# 动手实践：Agent Loop 全程可视化

> 任务：**"统计 notes 文件夹里有几个 .txt 文件，并算出它们的总字数。"**

Agent 不会一步做完——它会：先列目录（看到有哪些文件）→ 逐个读 .txt 文件（数字数）→ 最后汇总作答。每一圈都依赖上一圈的结果，这正是"为什么必须是循环"的活例子。

## 怎么跑

默认用离线 Mock 模型，无需 API Key：

```bash
python agent.py
```

你会看到类似这样的输出（节选）：

```
========== 第 1 圈 ==========
① 想：模型决定调用工具 list_dir(path='notes')
② 做：harness 执行 list_dir ...
③ 看：得到结果 ['a.txt', 'b.txt', 'readme.md']
④ 喂回：已加入对话，进入下一圈

========== 第 2 圈 ==========
① 想：模型决定调用工具 read_file(path='notes/a.txt')
...

========== 第 4 圈 ==========
① 想：模型认为信息已齐，给出最终答案
✅ 最终答案：notes 里共有 2 个 .txt 文件，总字数 ...
```

运行时 demo 会自动在 `notes/` 下创建几个示例文件，跑完不会删除（方便你查看），可手动清理。

## 看点

1. **循环转了几圈、模型出手了几次工具**——对照第 02 章"跟着任务走一遍"那节。
2. **`max_iterations` 这道安全刹车**——见 `agent.py` 里的 `for turn in range(...)`，故意留了注释解释它防的是什么。
3. 试着把 `notes/` 里多放几个 .txt 文件再跑，看循环圈数怎么变——这就是"探索式任务"的直观体现。

## 参考资料

- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [OWASP Agentic Security](https://genai.owasp.org/)

<!-- knowledge-scenario-inlined:AC-04 -->

## 可运行实验：Agent Harness 核心循环

调整参数并注入失败，重点对比正常路径、保护条件和失败诊断；运行源码与文章保存在同一个 Markdown 文件。

```html runnable file=index.html title="Agent Harness 核心循环" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AC-04 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AC-04 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'Agent Harness 核心循环', summary: '逐步运行 Observe、Plan、Tool、Verify、Retry 或 Finish。', controls: [
        { key: 'maxSteps', label: '最大步数', type: 'range', min: 3, max: 10, value: 7, suffix: ' 步' },
        { key: 'verify', label: '验证策略', type: 'select', value: 'tests', options: [['none', '跳过验证'], ['syntax', '仅语法检查'], ['tests', '定向测试']] },
        { key: 'retries', label: '重试上限', type: 'range', min: 0, max: 3, value: 2, suffix: ' 次' }
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
          /** 是否具备足够验证能力发现负数边界问题。 */
          const verified = values.verify === 'tests' && !fail;
          /** 修复边界问题需要的最少步骤。 */
          const neededSteps = verified ? 7 : 5;
          /** 是否在步数预算内完成正确修复。 */
          const success = values.maxSteps >= neededSteps && verified && values.retries >= 1;
          return { metrics: [[Math.min(values.maxSteps, neededSteps), '实际步数'], [success ? 'PASS' : 'FAIL', '完成状态'], [verified ? 2 : 0, '验证用例'], [success ? 1 : Math.max(0, values.retries), '重试次数']], stages: [stage('Observe', 'ok', '失败测试'), stage('Plan', 'ok', '最小范围'), stage('Tool', fail ? 'warn' : 'ok', 'apply_patch'), stage('Verify', values.verify === 'none' ? 'fail' : verified ? 'ok' : 'warn', values.verify), stage('Retry', values.retries ? 'ok' : 'warn', values.retries), stage('Finish', success ? 'ok' : 'fail', success ? '证据齐全' : '未完成')], rows: [['停止原因', success ? '定向测试通过且达到完成条件' : values.verify === 'none' ? '错误地把工具成功当成任务成功' : '步数或重试预算不足'], ['边界用例', verified ? '负数金额格式化已覆盖' : '未执行能暴露根因的测试'], ['防无限循环', 'maxSteps=' + values.maxSteps + '，retries=' + values.retries]], diagnosis: success ? 'Harness 通过验证证据结束任务。' : 'Harness 不应宣布完成；需要补足验证、重试或步数预算。', danger: !success };
         }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
