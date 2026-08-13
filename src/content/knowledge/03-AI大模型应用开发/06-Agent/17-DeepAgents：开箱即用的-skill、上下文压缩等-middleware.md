# Agent（17） - DeepAgents：开箱即用的 skill、上下文压缩等 middleware

> 读完你能：理解 DeepAgents 这类高层框架封装了哪些 Agent 常见能力，以及何时适合使用。

# 一、本篇定位

这是框架回看篇：在学过 Tool、Memory、RAG、Graph 后，再看高层封装才不容易被名词带跑。

# 二、一个真实场景

你想做一个深度研究 Agent，不想从零实现任务拆解、文件工作区、上下文压缩、技能加载和多轮执行。DeepAgents 这类框架把常见 middleware 打包好，让你更快搭出复杂 Agent。

# 三、核心拆解

- Skill 是可复用能力包，通常包含说明、示例、工具和领域知识。它让 Agent 在需要时加载特定能力，而不是把所有知识塞进 system prompt。
- 上下文压缩 middleware 负责在历史变长时保留关键状态，减少 token 和上下文污染。
- 高层框架的价值是快，但代价是黑盒。你仍要知道底层 tool、memory、state、trace 如何工作，才能排查问题。

# 四、工程链路

- 选定任务类型。
- 加载相关 skills。
- 配置可用工具和权限。
- 启用上下文压缩。
- 运行 Agent 并观察 trace。
- 把稳定能力沉淀成自定义 skill。

# 五、落地建议

- 先用框架跑通探索版，再把关键链路拆出来理解。
- 高风险工具不要因为框架封装就默认放开。
- 压缩前后的上下文要可查看，避免重要信息被吃掉。

# 六、常见坑

- 只会调用框架，不知道出错在哪层。
- 把所有 skill 都加载进去，反而干扰模型。
- 上下文压缩不可观测，压坏了也不知道。

# 七、和已有主线的关系

82 是对前面能力的高层封装观察，83 会用它做多 Agent 调研助手。

# 八、复述答法

> DeepAgents 这类框架把 skill、上下文压缩、工具执行等 Agent 常见能力封装好，适合快速搭复杂任务。但它不是替代底层理解，权限、trace、压缩效果和工具边界仍要自己检查。

# 九、总结

- **核心拆解**：Skill 是可复用能力包，通常包含说明、示例、工具和领域知识。
- **工程链路**：运行 Agent 并观察 trace。
- **常见坑**：只会调用框架，不知道出错在哪层。
- **本篇定位**：这是框架回看篇：在学过 Tool、Memory、RAG、Graph 后，再看高层封装才不容易被名词带跑。

## 十、最小可运行示例：上下文压缩中间件

~~~text
# requirements.txt
# Python 3.10+ 标准库，无第三方依赖。
~~~

~~~python
from __future__ import annotations

from dataclasses import dataclass


# 压缩后保留的最近消息数量。
RECENT_MESSAGE_LIMIT = 6


@dataclass(frozen=True)
class Message:
    """保存一条角色消息。"""

    role: str
    content: str


def compress_context(messages: list[Message], summary: str) -> list[Message]:
    """组合历史摘要和最近窗口；messages 是全量消息，summary 是可信摘要。"""

    # 最近窗口保留工具结果与用户纠正，不做二次生成。
    recent_messages = messages[-RECENT_MESSAGE_LIMIT:]
    # 摘要作为系统可识别的上下文，不伪装成用户原话。
    summary_message = Message(role="system", content=f"历史摘要：{summary}")
    return [summary_message, *recent_messages]
~~~

压缩前保存可审计原始记录，摘要标注模型版本和来源区间。权限、未完成工具调用和用户最新纠正不能被摘要吞掉；压缩质量要进入长对话回归集。

## 参考资料

- [LangChain Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [LangGraph 文档](https://docs.langchain.com/oss/python/langgraph/overview)

<!-- knowledge-scenario-inlined:AA-14 -->

## 可运行实验：DeepAgents 上下文压缩与专家分工

调整参数并注入失败，重点对比正常路径、保护条件和失败诊断；运行源码与文章保存在同一个 Markdown 文件。

```html runnable file=index.html title="DeepAgents 上下文压缩与专家分工" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AA-14 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AA-14 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'DeepAgents 上下文压缩与专家分工', summary: '比较单 Agent、Subagents 与 Middleware 压缩的调用、Token 和失败边界。', controls: [
    { key: 'architecture', label: '执行架构', type: 'select', value: 'subagents', options: [['single', '单 Agent'], ['subagents', '专家 Subagents'], ['middleware', 'Subagents + 压缩 Middleware']] },
    { key: 'specialists', label: '专家数量', type: 'range', min: 1, max: 8, value: 4, suffix: ' 个' },
    { key: 'context', label: '原始上下文', type: 'range', min: 10000, max: 100000, step: 5000, value: 50000, suffix: ' tokens' }
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
      /** 不同架构对主上下文的压缩比例。 */
      const ratio = values.architecture === 'single' ? 1 : values.architecture === 'subagents' ? 0.58 : 0.34;
      /** 主 Agent 最终持有的上下文 Token。 */
      const finalContext = Math.round(values.context * ratio + values.specialists * 450);
      /** 一次任务中的模型调用次数。 */
      const calls = values.architecture === 'single' ? 3 : values.specialists + 2;
      /** 并行专家数量形成的估算延迟。 */
      const latency = values.architecture === 'single' ? 18 : 9 + Math.ceil(values.specialists / 4) * 4;
      return { metrics: [[finalContext.toLocaleString(), '主上下文 Tokens'], [calls, '模型调用'], [latency + 's', '估算延迟'], [Math.round((1 - ratio) * 100) + '%', '压缩比例']], stages: [aiStage('规划', 'ok', values.architecture), aiStage('分派专家', values.architecture === 'single' ? 'warn' : 'ok', values.specialists), aiStage('并行研究', fail ? 'fail' : 'ok', fail ? 'one timeout' : 'complete'), aiStage('压缩结果', values.architecture === 'middleware' ? 'ok' : 'warn', finalContext), aiStage('汇总证据', fail ? 'warn' : 'ok', 'citations')], rows: [['分工边界', values.architecture === 'single' ? '所有工具和资料挤入同一上下文' : '每个专家只接收任务所需资料'], ['压缩契约', values.architecture === 'middleware' ? '保留结论、证据、风险和未决项' : '原始输出较多，主上下文成本偏高'], ['失败传播', fail ? '一个专家超时，汇总标记缺失证据而非伪造结果' : '所有专家结果可追溯']], diagnosis: fail ? '专家失败已被隔离，但最终答案必须披露证据缺口。' : values.architecture === 'middleware' ? '专家分工和结构化压缩显著降低主上下文成本。' : '可以继续引入按角色压缩以控制上下文。', danger: fail };
     }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
