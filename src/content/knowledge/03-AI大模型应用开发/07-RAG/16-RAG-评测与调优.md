# RAG（16） - RAG 评测与调优

> 读完后，你应能：
> - 给定 版本化数据集、切分规则、基线、Rubric、随机参数，能同输入比较基线与候选的能力、安全、延迟和成本，输出可复核记录，并用 逐样本输出、评分理由、置信区间、失败标签、版本 验证结果满足“目标指标改善，通用能力与安全集不越过回退阈值”。
> - 给定“数据泄漏、只报均分、裁判未校准或样本不可追溯”的失败样本，能定位首个异常阶段并执行“保留基线，隔离失败样本，定位数据、提示、模型或裁判”，输出根因与处置记录，再用同一输入重放证明问题不再出现。

> 一句话目标：读完你能搭一个最小评测集、算出命中率，并知道怎么用坏 case 指导调优，而不是凭感觉调参。

## 核心知识清单

- Hit Rate@K 与 Recall@K
- Precision@K、MRR 与 NDCG
- Context Relevance 与 Answer Relevance
- Faithfulness 与引用正确率
- 负样本、拒答准确率与权限样本
- 阈值 Sweep、坏案例归因与版本回归

# 一、与进阶篇的分工

本篇保留为 RAG 评测基础：重点讲评测集、命中率和坏 case。进阶观测请读 81《LangSmith 全链路观测》，那里会把单条 trace、数据集回放、指标对比和版本追踪串起来。

# 二、一个真实场景

你把 chunk_size 从 200 改成 100，又给检索加了重排，自我感觉「这下肯定更准了」。上线后用户还是抱怨搜不到。你想回滚，又不确定到底哪个改动有用——因为你从头到尾没有一个能量化「准不准」的东西。

RAG 的参数特别多：切分大小、overlap、topK、重排开不开、拒答阈值……每一个都影响效果，而且相互牵扯。靠「感觉变好了」来调，等于蒙眼开车。评测要做的，就是给你一个仪表盘：每次改动跑一遍，用数字告诉你是变好还是变坏。

# 三、先有评测集，哪怕只有 20 条

评测的前提是一份**带标准答案的问题集**。最基础的形式：每条问题，标注它「正确答案应该来自哪份文档」。

```python
EVAL_SET = [
    {"q": "几天内可以退款",       "expected_doc": "refund"},
    {"q": "多久能发货",          "expected_doc": "shipping"},
    {"q": "忘记密码怎么办",      "expected_doc": "account"},
    ...
]
```

这份集子不用大，20 条就能开工。关键是**覆盖真实问法的多样性**：同一个意图，用户会用「几天内退款」「退款时限多久」「用过了还能退吗」好几种说法，评测集要把这些变体都收进来，才测得出检索的鲁棒性。问题最好直接从真实用户日志里捞，比自己编的更有代表性。

# 四、第一个指标：命中率

最基础的指标是命中率（Hit Rate@K）：检索回的 topK 条里，只要包含标注的正确文档，就算命中。

```text
命中率 = 命中的问题数 / 总问题数
```

它回答一个最根本的问题：**正确资料到底有没有被检索到**。这是 RAG 的地基——如果正确资料压根没召回，后面回答生成做得再好也是空中楼阁。所以调优一般先盯命中率：先保证「找得到」，再优化「答得好」。

Recall@K 衡量标注相关证据中有多少进入前 K，Precision@K 衡量前 K 中真正相关结果的比例；MRR 关注第一个正确结果排第几，NDCG 同时考虑多个相关结果及其位置。单标准文档任务中 Hit Rate 与 Recall 容易接近，但多证据问题不能混用。

命中率还能直接用来对比配置。比如同一份评测集，topK=1 命中率 90%，topK=3 命中率 95%——数字告诉你放大 topK 确实减少了漏召回，但你也得权衡：topK 越大，塞进 prompt 的无关内容越多，成本和干扰也上升。这种权衡，有了数字才谈得清。

# 五、坏 case 是调优的路标

光看一个总分（90%）没法指导改进，你得知道**那没命中的 10% 是哪些问题**。评测脚本要把未命中的问题单独列出来——这就是坏 case。

坏 case 是最值钱的调优线索。盯着它们看，往往能定位到具体原因：

- 某类问法总是漏 → 可能是 embedding 对这种表达不敏感，或者切分把答案切碎了；
- 答案明明在库里却没召回 → 可能 chunk 太大被稀释，或 topK 太小；
- 召回了不相关的 → 可能需要加重排或调拒答阈值。

调优的正确姿势是：改一个参数 → 跑评测 → 看命中率和坏 case 的变化 → 决定保留还是回滚。一次只改一个变量，否则分不清是哪个改动起的作用。

# 六、阈值 sweep：别凭感觉定 min_score

拒答阈值、topK、rerank_topN 都不要拍脑袋。做法是固定评测集，分组跑不同参数，把命中率、误拒率、误答率放在一张表里。一次只改一个变量，才能知道是哪项带来变化。

| 配置 | topK | min_score | 命中率 | 误拒率 | 误答率 |
|---|---:|---:|---:|---:|---:|
| A | 5 | 0.35 | 88% | 3% | 12% |
| B | 10 | 0.35 | 92% | 3% | 9% |
| C | 10 | 0.50 | 92% | 8% | 4% |

这张表能帮你看清取舍：阈值提高后误答少了，但误拒可能增加。企业场景不是一味追求“回答率”，而是要控制“没证据还硬答”的风险。

# 七、正样本和负样本都要有

只测“应该能回答”的问题，系统会越来越爱硬答。评测集里必须有负样本：知识库没有答案、用户无权限、证据不足。负样本的期望不是答对，而是拒答或转人工。

RAGAS、LLM-as-Judge 这类工具可以辅助评估 Faithfulness、Answer Relevancy、Context Precision/Recall，但不要只看 summary 分数。真正有价值的是每条 case 的 verdict、reason 和对应 trace：它能告诉你失败发生在召回、排序、阈值还是生成。更完整的调优流程见 `../09-附录/进阶-混合检索与RAG调优实战.md`。

# 八、工程上真正会踩的坑（本篇独有）

- **没有评测集就开始调参**。改完只能靠感觉判断好坏，等于没改。哪怕 20 条手写问题，也比零强一个数量级。先建集子，再调参。
- **评测集问法太单一**。每个意图只放一种标准问法，测出来命中率虚高，一上线遇到真实用户的花式问法就崩。要收集同义变体。
- **一次改一堆参数**。同时改了切分、topK、重排，命中率变了也不知道是谁的功劳，没法沉淀经验。一次只动一个变量。
- **改了 chunk 参数但没重建索引**。切分变了，向量索引还是旧的，评测结果就不可信。改 chunk_size、overlap、embedding 模型后要重建索引再测。
- **只看命中率，不看坏 case**。命中率告诉你「有没有问题」，坏 case 才告诉你「问题在哪、怎么修」。盯着没命中的那几条改，比盯着总分焦虑有用得多。
- **拿命中率当唯一指标**。命中率只管「找没找到」，不管「答得对不对、有没有编」。完整评测还要加回答正确率、拒答准确率，命中率只是起点。

# 九、一句话面试答法

> **RAG 怎么评测和调优？** 先建一份带标注的评测集，每条问题标好正确答案该来自哪份文档，覆盖真实的多样问法。最基础的指标是命中率（Hit Rate@K）——topK 里有没有正确文档，它回答「正确资料找没找到」这个地基问题。调优时一次只改一个参数，跑评测看命中率和坏 case 的变化。坏 case 是最值钱的线索，盯着没命中的问题改检索或切分，比凭感觉调有效得多。命中率之外还要看回答正确率和拒答准确率。

# 十、动手实践：26 RAG 评测与调优

用 20 条带标注的问题做评测集，把「调参到底变好还是变坏」变成**可比较的命中率数字**，并打印未命中的坏 case。

## 10.1 在线运行


零依赖，纯标准库。

## 10.2 预期输出

```text
评测集共 20 条问题

配置 top_k=1：命中 18/20，命中率 90%
   坏 case：['用过了还能退吗', '退款要邮箱验证吗']

配置 top_k=3：命中 19/20，命中率 95%
   坏 case：['用过了还能退吗']

结论：放大 top_k 通常能提高命中率（更不容易漏），
但代价是塞进 prompt 的无关内容变多。调参要靠这样的数字，而不是靠感觉。
```

对比两种配置：top_k=1 命中率 90%，放大到 top_k=3 后升到 95%，坏 case 从 2 条减到 1 条。剩下那条「用过了还能退吗」始终没命中——它和正确文档字面重叠太少，正好暴露了关键词检索的局限，这种坏 case 就是下一步调优的目标。

## 10.3 代码↔概念对应

| 概念 | 在 main.py 哪里 |
|---|---|
| 带标注的评测集（问题 + 期望文档） | `EVAL_SET` |
| 命中判断（topK 里有没有期望文档） | `evaluate` 里 `expected_doc in got_docs` |
| 命中率计算 | `evaluate` 里 `hit / total` |
| 坏 case 收集 | `evaluate` 里 `misses` |
| 配置对比（top_k=1 vs 3） | `main` 里 `for k in (1, 3)` |

## 10.4 说明

命中率（Hit Rate@K）是最基础的检索指标，回答这个问题：「正确资料有没有被检索到」。真实项目还会加 MRR（正确答案排第几）、回答正确率（人工或用模型判分）、拒答准确率等。但起点都是这件事——先有一个哪怕只有 20 条的标注集，每次改参数都跑一遍，用数字说话。坏 case 列表是调优的直接线索：盯着没命中的问题改切分或检索，比凭感觉调有效得多。

## 10.5 可运行源码：RAG 评测与调优


### main.py

```python
"""用标注评测集比较两组 RAG 检索参数。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class EvalCase:
    """保存问题和期望命中的文档标识。"""

    # 评测问题。
    question: str
    # 人工标注的正确文档标识。
    expected_document: str


def retrieve(question: str, strategy: str) -> str:
    """用确定性规则模拟不同检索策略；strategy 用于切换基线和调优版。"""
    # 调优版补充了同义词和关键数字映射。
    aliases = {"多久": "expense" if strategy == "tuned" else "unknown", "发票": "invoice", "年假": "leave", "住宿": "hotel"}
    for keyword, document_id in aliases.items():
        if keyword in question:
            return document_id
    return "unknown"


def evaluate(cases: list[EvalCase], strategy: str) -> tuple[float, list[EvalCase]]:
    """计算 top1 命中率并返回坏 case。"""
    # 未命中正确文档的案例。
    failures = [case for case in cases if retrieve(case.question, strategy) != case.expected_document]
    # top1 命中的案例数。
    hit_count = len(cases) - len(failures)
    return hit_count / len(cases), failures


def main() -> None:
    """构造 20 条评测数据并比较基线与调优策略。"""
    # 四类意图各重复五种问法，形成 20 条离线评测集。
    cases = [
        EvalCase(question, expected)
        for question, expected in (("报销多久提交", "expense"), ("发票要求", "invoice"), ("年假申请", "leave"), ("住宿标准", "hotel"))
        for _ in range(5)
    ]
    for strategy in ("baseline", "tuned"):
        # 当前策略的命中率和坏 case。
        hit_rate, failures = evaluate(cases, strategy)
        print(f"{strategy}: hit@1={hit_rate:.1%}, failures={len(failures)}")
        for failure in failures[:3]:
            print(f"  bad case: {failure.question} -> expected={failure.expected_document}")


if __name__ == "__main__":
    main()
```

# 十一、总结

- **与进阶篇的分工**：进阶观测请读 81《LangSmith 全链路观测》，那里会把单条 trace、数据集回放、指标对比和版本追踪串起来。
- **先有评测集，哪怕只有 20 条**：评测的前提是一份带标准答案的问题集。
- **第一个指标：命中率**：最基础的指标是命中率（Hit Rate@K）：检索回的 topK 条里，只要包含标注的正确文档，就算命中。
- **坏 case 是调优的路标**：光看一个总分（90%）没法指导改进，你得知道那没命中的 10% 是哪些问题。
- **阈值 sweep：别凭感觉定 min_score**：做法是固定评测集，分组跑不同参数，把命中率、误拒率、误答率放在一张表里。
- **正样本和负样本都要有**：评测集里必须有负样本：知识库没有答案、用户无权限、证据不足。

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)

<!-- knowledge-scenario-inlined:AA-12 -->

## 11.1 可运行实验：RAG 评测与坏案例归因


```html runnable file=index.html title="RAG 评测与坏案例归因" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AA-12 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AA-12 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'RAG 评测与坏案例归因', summary: '计算检索与生成指标，并把错误定位到解析、切分、召回、重排或生成。', controls: [
    { key: 'k', label: '评测 Top K', type: 'range', min: 1, max: 20, value: 5, suffix: '' },
    { key: 'retrieval', label: '召回质量', type: 'range', min: 40, max: 100, value: 82, suffix: '%' },
    { key: 'grounding', label: '生成忠实度', type: 'range', min: 40, max: 100, value: 88, suffix: '%' }
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
      /** 根据召回质量和 K 估算 Hit@K。 */
      const hitAtK = clamp(values.retrieval + Math.log2(values.k) * 4 - (fail ? 15 : 0), 0, 100);
      /** 根据排序深度估算 MRR。 */
      const mrr = clamp(hitAtK / 100 - Math.max(0, values.k - 5) * 0.01, 0, 1);
      /** 引用准确率受召回与忠实度共同约束。 */
      const citation = Math.min(hitAtK, values.grounding) - (fail ? 10 : 0);
      /** 根据最低指标定位最可能的故障阶段。 */
      const rootCause = hitAtK < 70 ? 'RETRIEVAL' : values.grounding < 75 ? 'GENERATION' : citation < 75 ? 'CITATION' : 'PASS';
      return { metrics: [[hitAtK.toFixed(1) + '%', 'Hit@K'], [mrr.toFixed(3), 'MRR'], [values.grounding + '%', 'Faithfulness'], [citation.toFixed(1) + '%', 'Citation']], stages: [aiStage('解析集', fail ? 'warn' : 'ok', 'golden set'), aiStage('检索评测', hitAtK >= 70 ? 'ok' : 'fail', hitAtK.toFixed(1)), aiStage('排序评测', mrr >= 0.7 ? 'ok' : 'warn', mrr.toFixed(3)), aiStage('生成评测', values.grounding >= 75 ? 'ok' : 'fail', values.grounding), aiStage('引用评测', citation >= 75 ? 'ok' : 'fail', citation.toFixed(1))], rows: [['错误归因', rootCause === 'RETRIEVAL' ? '先检查解析、切分、过滤、Query 和召回器' : rootCause === 'GENERATION' ? '证据存在但回答偏离，检查 Prompt 和模型' : rootCause === 'CITATION' ? '答案正确但引用映射错误，检查证据 ID 契约' : '关键指标均通过'], ['指标边界', 'Hit@K/MRR 评检索；Faithfulness/Citation 评生成，不能混成单分'], ['坏案例', fail ? '样例黄金答案已过期，先修评测集版本' : '评测集版本与知识库版本一致']], diagnosis: rootCause === 'PASS' && !fail ? '检索、排序、生成和引用指标均达到基础门槛。' : '坏案例根因优先定位到 ' + rootCause + '，应在对应阶段修复。', danger: rootCause !== 'PASS' || fail };
     }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
