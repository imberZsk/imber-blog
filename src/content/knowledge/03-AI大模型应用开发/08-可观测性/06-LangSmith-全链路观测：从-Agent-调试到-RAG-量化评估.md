# 可观测性（06） - LangSmith 全链路观测：从 Agent 调试到 RAG 量化评估

> 读完你能：理解 Agent/RAG 为什么必须有 trace，以及如何从调试走向量化评估。

# 一、本篇定位

这是可观测性进阶篇，衔接 40 日志与可观测性。

# 二、一个真实场景

用户反馈“回答错了”。如果你只能看到最终回答，就不知道是 query 改写错、检索没命中、rerank 排错、prompt 引导差，还是模型自己编。LangSmith 这类工具的价值，是把每一步调用、输入、输出、耗时和 token 展开给你看。

# 三、核心拆解

- Trace 是一次请求的调用树。Agent 的每个模型调用、工具调用、检索调用都应该是一个 span。
- 调试阶段看单条 trace，定位坏 case。评估阶段跑数据集，看 Hit Rate、faithfulness、answer correctness、latency 等指标。
- RAG 评估不能只看最终答案，还要评估 retrieval：正确证据是否被召回，是否排在前面。

# 四、工程链路

- 为每次请求生成 trace_id。
- 记录检索、rerank、LLM、tool 的输入输出。
- 坏 case 进入数据集。
- 改参数后批量回放评估集。
- 对比指标和成本。

# 五、落地建议

- 线上日志脱敏后再进入观测平台。
- 每次 prompt 或检索参数改动都标版本。
- 把高频坏 case 固化成回归集。

# 六、常见坑

- 只记录最终回答。
- 没有版本字段，评估结果无法复现。
- 只看平均耗时，不看 P90/P99。

# 七、和已有主线的关系

40 讲通用日志，26 讲 RAG 评测；81 把 trace 和评估平台串起来。

# 八、复述答法

> LangSmith 类工具的核心价值是 trace 和 dataset evaluation。单条 trace 帮你定位坏 case，评估集帮你对比改动是否变好。RAG 要同时看检索指标、答案忠实度、延迟和成本。

# 九、总结

- **核心拆解**：Trace 是一次请求的调用树。
- **工程链路**：为每次请求生成 traceid。
- **常见坑**：没有版本字段，评估结果无法复现。
- **本篇定位**：这是可观测性进阶篇，衔接 40 日志与可观测性。

## 十、最小可运行示例：LangSmith Trace

~~~text
# requirements.txt
langsmith
~~~

~~~python
from __future__ import annotations

import os

from langsmith import traceable


# Prompt 版本与索引版本进入 Trace，支持回放和对比。
PROMPT_VERSION = "rag-v3"
INDEX_VERSION = "knowledge-2026-08-11"


@traceable(name="retrieve", run_type="retriever")
def retrieve(query: str) -> list[dict[str, str]]:
    """返回教学候选；query 是已脱敏问题。"""

    # 生产实现记录 chunk_id 和分数，不默认上传敏感全文。
    return [{"chunk_id": "refund#1", "score": "0.82"}]


@traceable(name="rag_answer", metadata={"prompt": PROMPT_VERSION, "index": INDEX_VERSION})
def answer(query: str) -> dict[str, object]:
    """组合检索与答案；query 在进入 Trace 前应按策略脱敏。"""

    # 当前候选作为子 Span 结果进入调用树。
    hits = retrieve(query)
    return {"answer": "退款三日到账", "citations": [hit["chunk_id"] for hit in hits]}


if os.getenv("LANGSMITH_TRACING") == "true":
    print(answer("退款多久到账"))
~~~

观测平台配置失败不应阻断主业务；上传失败单独告警。截图至少展示调用树、召回候选、版本、耗时和 Token，并对正文、租户、用户与密钥脱敏。

## 参考资料

- [OpenTelemetry Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [Langfuse 文档](https://langfuse.com/docs)

<!-- knowledge-scenario-inlined:AA-08 -->

## 可运行实验：LangSmith 与 LangFuse Trace 排障

调整参数并注入失败，重点对比正常路径、保护条件和失败诊断；运行源码与文章保存在同一个 Markdown 文件。

```html runnable file=index.html title="LangSmith 与 LangFuse Trace 排障" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AA-08 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AA-08 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'LangSmith 与 LangFuse Trace 排障', summary: '展开一次 RAG Trace，从 Span、Token、耗时和评测标签定位根因。', controls: [
    { key: 'fault', label: '故障类型', type: 'select', value: 'generation', options: [['none', '无故障'], ['retrieval', '召回为空'], ['generation', '证据正确但生成错误'], ['tool', '工具超时']] },
    { key: 'sampling', label: 'Trace 采样率', type: 'range', min: 1, max: 100, value: 20, suffix: '%' },
    { key: 'redaction', label: '敏感字段脱敏', type: 'select', value: 'on', options: [['off', '关闭'], ['on', '开启']] }
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
      /** 根据故障类型构造的根因 Span。 */
      const rootSpan = fail ? 'redaction' : values.fault === 'none' ? 'none' : values.fault;
      /** 一次样例 Trace 的总耗时。 */
      const latency = values.fault === 'tool' ? 6200 : values.fault === 'retrieval' ? 780 : 1450;
      /** 一次样例 Trace 的 Token 总量。 */
      const tokens = values.fault === 'retrieval' ? 420 : 2380;
      return { metrics: [[rootSpan.toUpperCase(), '根因 Span'], [latency + 'ms', '总耗时'], [tokens, 'Tokens'], [values.sampling + '%', '采样率']], stages: [aiStage('Request', 'ok', 'trace-id'), aiStage('Retriever', values.fault === 'retrieval' ? 'fail' : 'ok', values.fault === 'retrieval' ? '0 docs' : '5 docs'), aiStage('Rerank', values.fault === 'retrieval' ? 'warn' : 'ok', 'top 3'), aiStage('Tool', values.fault === 'tool' ? 'fail' : 'ok', values.fault === 'tool' ? 'timeout' : 'n/a'), aiStage('Generation', values.fault === 'generation' ? 'fail' : 'ok', tokens), aiStage('Evaluator', rootSpan === 'none' ? 'ok' : 'warn', rootSpan)], rows: [['定位方法', values.fault === 'generation' ? '检索证据正确但 Faithfulness 低，根因在生成' : values.fault === 'retrieval' ? 'Retriever 输出为空，先查过滤和索引版本' : values.fault === 'tool' ? '工具 Span 超时，重试放大总耗时' : '各 Span 指标正常'], ['脱敏', values.redaction === 'on' && !fail ? 'Prompt、metadata 中的敏感字段已遮盖' : '敏感内容可能写入 Trace，必须阻断上报'], ['采样策略', values.sampling < 5 ? '低采样可能漏掉长尾错误，错误 Trace 应 100% 保留' : '正常请求采样，错误请求全量保留']], diagnosis: rootSpan === 'none' ? 'Trace 未发现异常，指标与评测标签一致。' : '根因已定位到 ' + rootSpan + ' 阶段，可针对该 Span 修复而非盲目改 Prompt。', danger: fail || values.redaction !== 'on' };
     }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
