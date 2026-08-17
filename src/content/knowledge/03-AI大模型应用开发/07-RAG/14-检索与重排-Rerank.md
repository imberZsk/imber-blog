# RAG（14） - 检索与重排 Rerank

> 读完后，你应能完成以下任务：
> - 绘制“RAG（20） - 检索与重排 Rerank / 为什么要分两段”的关键对象与数据流，解释“它的 KPI 是「别漏」——宁可多召回几条，也不能把真正的答案漏在外面。”，并用源码位置、日志或 Trace 标注证据。
> - 为“RAG（20） - 检索与重排 Rerank / 重排凭什么排得更准”设计正常与异常输入，验证“初排的向量相似度是「问题向量 vs 文档向量」的整体夹角，比较笼统。”，输出首个偏差位置与回归测试结果。
> - 实现“RAG（20） - 检索与重排 Rerank / 企业项目常见链路：BM25 + 向量 + RRF + rerank”的最小代码或配置，检验“如果用户问题很长或很口语，再在召回前加 Query Rewrite，把“这个设备老是报 E17 咋办”改写成“E17 故障码 原因 处理步骤”。”，输出命令、结果与 Diff，并说明不适用边界。

> 一句话目标：读完你能讲清为什么检索要分「初排 + 重排」两段、各自的目标是什么，并能说出重排到底改善了什么。

# 一、与进阶篇的分工

本篇保留为“初排 + 重排”的基础模型。进阶检索请读 78《ElasticSearch 全文检索》和 79《混合检索 RAG》，那里会把 BM25、中文分词、多路召回、RRF 融合和 rerank 精排串成企业 RAG 检索漏斗。

# 二、检索与重排 Rerank的真实应用场景

用户问「退货怎么操作流程」，向量检索召回了三条都含「退货」的资料：

1. 退货运费由谁承担需根据具体活动规则判断
2. 申请退货后请在七天内将商品寄回仓库
3. 退货退款进度可在订单详情页实时查看

三条字面上都和「退货」相关，向量相似度也差不多。但真正回答「怎么操作」的是第 2 条。如果直接把相似度最高的那条（可能是第 1 条）拼给模型，答案就跑偏了——用户问流程，你给他讲运费。

问题出在：向量检索的打分比较粗，它能把「相关的」捞出来，但「相关的里面谁最该排第一」分不清。重排（rerank）就是来补这一刀的。

# 三、为什么要分两段

把检索拆成初排和重排，是因为「快」和「准」很难兼得，于是分工：

```text
全库（几万条）
   │  初排：向量检索，快但粗
   ▼
候选（topK，比如 20 条）   ← 目标：别漏掉相关的
   │  重排：精细打分，慢但准
   ▼
最终（topN，比如 3 条）     ← 目标：把最该答的排到最前
   │
   ▼
拼进 prompt
```

- **初排（召回）**：用便宜快速的向量相似度，从全库捞出一批候选。它的 KPI 是「别漏」——宁可多召回几条，也不能把真正的答案漏在外面。所以它召回得多、排序粗。
- **重排（rerank）**：只对初排这一小批候选，用更精细、更贵的打分重新排序，把最相关的提到最前。它的 KPI 是「排准」。

为什么不直接对全库做精细打分？因为重排模型贵，全库几万条逐个精算扛不住。先用便宜的初排筛到 20 条，再用贵的重排精排这 20 条，性价比最高。这是典型的「漏斗」设计。

# 四、重排凭什么排得更准

初排的向量相似度是「问题向量 vs 文档向量」的整体夹角，比较笼统。重排模型不一样，它把**问题和文档拼在一起**送进模型，直接判断「这篇文档对这个问题的回答相关性有多高」，能捕捉到更细的信号：

- 问题问的是「流程/怎么操作」，文档里有没有对应的动作步骤（「申请」「寄回」）；
- 文档是直接回答问题，还是只是蹭到了几个相同的词；
- 答案是聚焦还是被无关内容稀释。

正因为它看的是「问题-文档配对」而非各自的向量，所以更准，但也更慢——这正是它只用在初排筛过的一小批候选上的原因。

# 五、企业项目常见链路：BM25 + 向量 + RRF + rerank

真实知识库很少只靠一种召回。常见做法是两路召回：

| 环节 | 解决什么 |
|---|---|
| BM25 | 专业名词、编号、故障码、合同条款号这类精确匹配 |
| 向量召回 | 用户口语化表达、同义问法、语义相近问题 |
| RRF 融合 | 把两路候选合并，避免手写权重一调就偏 |
| rerank | 对融合后的候选做精排，挑出最能支撑回答的证据 |

如果用户问题很长或很口语，再在召回前加 Query Rewrite，把“这个设备老是报 E17 咋办”改写成“E17 故障码 原因 处理步骤”。但改写不能丢掉型号、时间、金额、合同编号这些硬条件。

这套链路的完整调优方法见 `../09-附录/进阶-混合检索与RAG调优实战.md`。

# 六、工程上真正会踩的坑（本篇独有）

- **初排 topK 设太小**。初排的使命是「别漏」，如果只召回 3 条，真正的答案没进候选，重排再厉害也救不回来。初排要召回得宽一点（如 20~50），重排再精筛。
- **跳过初排直接全库重排**。重排模型贵且慢，对全库几万条精算延迟和成本都炸。必须先初排筛小，再重排。
- **以为有了重排就不用管 embedding**。重排只能在初排召回的范围里调整顺序。如果初排（向量检索）压根没召回正确答案，重排无能为力。两段是接力，不是替代。
- **重排信号设计跑偏**。光看关键词命中数，会把「堆砌关键词但答非所问」的内容排上去。真实重排模型靠的是语义相关性判断，自己写规则模拟时要小心别只数词频。

# 七、一句话面试答法

> **检索为什么要做重排？** 向量检索（初排）快但排序粗，它能把相关的召回，但分不清哪条最该排第一。所以分两段：初排用向量相似度从全库宽召回一批候选，KPI 是别漏；重排用更精细的模型对这一小批候选重新打分，把最相关的提到最前，KPI 是排准。重排模型把问题和文档拼一起判断相关性，比向量夹角更准但更慢，所以只用在初排筛过的小批量上。

企业里我会优先考虑混合检索，而不是只靠向量：编号、故障码、法条号走 BM25 更稳，口语化问题走向量更稳，最后再融合和重排。

# 八、动手实践：24 检索与重排 Rerank

演示两段式检索：**初排（召回，快但粗）+ 重排（rerank，慢但准）**。同一批候选，重排后顺序会变，最该排第一的被提上来。

## 8.1 在线运行


零依赖，纯标准库。

## 8.2 预期输出

```text
查询：退货怎么操作流程

初排（词重叠召回，追求别漏，排序粗糙）：
  1. score=1  退货运费由谁承担需根据具体活动规则判断
  2. score=1  申请退货后请在七天内将商品寄回仓库
  3. score=1  退货退款进度可在订单详情页实时查看

重排（精细打分，把最该答的提到第一）：
  1. score=2.83  申请退货后请在七天内将商品寄回仓库
  2. score=0.83  退货退款进度可在订单详情页实时查看
  3. score=0.81  退货运费由谁承担需根据具体活动规则判断

最终采用：申请退货后请在七天内将商品寄回仓库
```

关键对比：初排时三条候选词重叠都是 1 分，排序基本无意义（含「退货」就召回，但运费、进度其实答非所问）；重排考虑了关键动作短语命中和句子长度后，真正讲「怎么退货」的那条被提到第一。这就是 rerank 的价值——初排负责别漏，重排负责排准。

## 8.3 代码↔概念对应

| 概念 | 在 main.py 哪里 |
|---|---|
| 初排：词重叠召回，追求别漏 | `initial_rank` |
| 重排：精细打分重新排序 | `rerank` |
| 重排信号 1：关键短语命中 | `rerank` 里 `phrase_hits` |
| 重排信号 2：长度惩罚 | `rerank` 里 `length_penalty` |
| 取重排后第一名 | `main` 里 `reranked[0]` |

## 8.4 说明

真实项目里初排是向量检索（从全库捞 topK），重排用专门的 rerank 模型（如 bge-reranker、Cohere Rerank）对这一小批候选做精细的「query-文档相关性」打分。这里用「短语命中 + 长度惩罚」模拟重排模型的判断，目的是讲清「为什么要两段、重排改变了什么」。

## 8.5 可运行源码：检索与重排 Rerank


### main.py

```python
"""演示初排召回与精细重排的职责差异。"""

from __future__ import annotations

import re


def terms(text: str) -> set[str]:
    """提取教学用字符词项；text 是查询或候选正文。"""
    return set(re.findall(r"[A-Za-z]+|[\u4e00-\u9fff]", text.lower()))


def recall_score(query: str, document: str) -> float:
    """用词项交集模拟快速初排。"""
    return float(len(terms(query) & terms(document)))


def rerank_score(query: str, document: str) -> float:
    """用完整意图特征模拟较慢但更准的交叉编码器重排。"""
    # 初排分数作为重排基础特征。
    base_score = recall_score(query, document)
    # 同时出现期限意图和报销主题时给予更高权重。
    intent_bonus = 5.0 if "多久" in query and ("30天" in document or "期限" in document) else 0.0
    return base_score + intent_bonus


def main() -> None:
    """对候选集分别打印初排和重排顺序。"""
    # 用户真实检索意图。
    query = "报销多久内提交"
    # 已由低成本检索召回的候选文档。
    candidates = ["报销系统提交入口", "报销需在费用发生后30天内提交", "提交年假申请", "报销发票要求"]
    # 初排只负责高召回率。
    recalled = sorted(candidates, key=lambda document: recall_score(query, document), reverse=True)
    # 重排只处理有限候选，提升 top1 精度。
    reranked = sorted(recalled, key=lambda document: rerank_score(query, document), reverse=True)
    print("初排:", recalled)
    print("重排:", reranked)


if __name__ == "__main__":
    main()
```

# 九、总结

- **为什么要分两段**：它的 KPI 是「别漏」——宁可多召回几条，也不能把真正的答案漏在外面。
- **重排凭什么排得更准**：初排的向量相似度是「问题向量 vs 文档向量」的整体夹角，比较笼统。
- **企业项目常见链路：BM25 + 向量 + RRF + rerank**：如果用户问题很长或很口语，再在召回前加 Query Rewrite，把“这个设备老是报 E17 咋办”改写成“E17 故障码 原因 处理步骤”。
- **工程上真正会踩的坑（本篇独有）**：初排的使命是「别漏」，如果只召回 3 条，真正的答案没进候选，重排再厉害也救不回来。
- **一句话面试答法**：所以分两段：初排用向量相似度从全库宽召回一批候选，KPI 是别漏；

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)

<!-- knowledge-scenario-inlined:AA-11 -->

## 9.1 可运行实验：Rerank 阈值、预算与延迟


```html runnable file=index.html title="Rerank 阈值、预算与延迟" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AA-11 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AA-11 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'Rerank 阈值、预算与延迟', summary: '调整初召回量、Rerank Top N 和阈值，观察效果、延迟及费用。', controls: [
    { key: 'recallK', label: '初召回 Top K', type: 'range', min: 10, max: 100, step: 10, value: 50, suffix: '' },
    { key: 'rerankN', label: 'Rerank Top N', type: 'range', min: 5, max: 50, step: 5, value: 20, suffix: '' },
    { key: 'threshold', label: '相关性阈值', type: 'range', min: 30, max: 90, step: 5, value: 60, suffix: '%' }
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
      /** 实际送入 Rerank 的候选数不能超过召回数。 */
      const reranked = Math.min(values.recallK, values.rerankN);
      /** 初召回和重排数量决定的估算命中率。 */
      const hitRate = clamp(65 + Math.log2(values.recallK) * 4 + Math.log2(reranked) * 2 - values.threshold * 0.08 - (fail ? 12 : 0), 0, 98);
      /** Cross-encoder 重排的估算延迟。 */
      const latency = 80 + reranked * 13;
      /** 每千次查询的估算重排费用。 */
      const cost = reranked * 0.018;
      return { metrics: [[hitRate.toFixed(1) + '%', 'Hit Rate'], [latency + 'ms', 'Rerank 延迟'], ['$' + cost.toFixed(2), '每千次费用'], [reranked, '实际重排']], stages: [aiStage('初召回', values.recallK >= 30 ? 'ok' : 'warn', values.recallK), aiStage('截取候选', 'ok', reranked), aiStage('Cross-Encoder', fail ? 'fail' : 'ok', latency + 'ms'), aiStage('阈值过滤', values.threshold > 80 ? 'warn' : 'ok', values.threshold + '%'), aiStage('证据输出', hitRate >= 75 ? 'ok' : 'warn', hitRate.toFixed(1) + '%')], rows: [['预算约束', reranked < values.recallK ? '只对最高潜力候选运行昂贵模型' : '全部召回候选进入重排'], ['阈值风险', values.threshold > 80 ? '阈值过高可能把唯一正确证据过滤掉' : '阈值保留足够候选'], ['故障注入', fail ? 'Rerank 服务超时，回退到融合排名并标记降级' : '重排服务正常']], diagnosis: fail ? 'Rerank 已降级，回答应记录 fallback 并提高拒答门槛。' : hitRate >= 75 ? '效果、延迟和费用处于可用平衡。' : '当前预算或阈值使正确证据不足。', danger: fail };
     }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
