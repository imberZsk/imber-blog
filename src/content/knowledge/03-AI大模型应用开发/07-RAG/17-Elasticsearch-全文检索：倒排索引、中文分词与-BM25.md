# RAG（17） - Elasticsearch 全文检索：倒排索引、中文分词与 BM25

> 读完后，你应能完成以下任务：
> - 绘制“RAG（23） - Elasticsearch 全文检索：倒排索引、中文分词与 BM25 / 为什么向量检索不能替代 BM25”的关键对象与数据流，解释“用户问“E17 报错”“GB/T 35273 第 6.3 条”“NullPointerException”时，关键线索是不能改写的错误码、标准号和 API 名。”，并用源码位置、日志或 Trace 标注证据。
> - 为“RAG（23） - Elasticsearch 全文检索：倒排索引、中文分词与 BM25 / 倒排索引与 BM25 到底算什么”设计正常与异常输入，验证“词频 TF：查询词在当前文档出现得越多，通常越相关，但收益会逐渐饱和。 -> 逆文档频率 IDF：越少见的词区分度越高，“E17”通常比“系统”更重要。 -> 长度归一化：避免长文档仅因包含更多词而天然占优。”，输出首个偏差位置与回归测试结果。
> - 实现“RAG（23） - Elasticsearch 全文检索：倒排索引、中文分词与 BM25 / 索引设计：正文、精确词和权限分开”的最小代码或配置，检验“exact_terms 用来保存抽取出的错误码、产品型号和接口名，避免它们被分词器切碎。”，输出命令、结果与 Diff，并说明不适用边界。

> 更新日期：2026/08/11

# 一、为什么向量检索不能替代 BM25

用户问“E17 报错”“GB/T 35273 第 6.3 条”“`NullPointerException`”时，关键线索是不能改写的错误码、标准号和 API 名。Embedding 擅长同义表达，但可能弱化这些稀有符号；倒排索引会直接保留词项与文档的对应关系。

因此生产 RAG 常用两条互补链路：

- BM25 负责错误码、型号、人名、法条号、函数名和精确短语。
- 向量检索负责口语化问题、同义词和没有共同词面的语义匹配。

# 二、倒排索引与 BM25 到底算什么

倒排索引记录“词项 → 出现该词项的文档列表”。查询不必扫描全库，而是合并相关词项的 posting list。BM25 再根据三类信号排序：

1. **词频 TF**：查询词在当前文档出现得越多，通常越相关，但收益会逐渐饱和。
2. **逆文档频率 IDF**：越少见的词区分度越高，“E17”通常比“系统”更重要。
3. **长度归一化**：避免长文档仅因包含更多词而天然占优。

`k1` 控制词频饱和速度，`b` 控制文档长度归一化强度。不要脱离标注集盲调参数；中文场景往往先修分词、字段和词典，收益比调 BM25 参数更大。

# 三、索引设计：正文、精确词和权限分开

```json
PUT knowledge_chunks
{
  "settings": {
    "analysis": {
      "analyzer": {
        "zh_business": {
          "type": "custom",
          "tokenizer": "ik_max_word",
          "filter": ["lowercase"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "chunk_id": { "type": "keyword" },
      "tenant_id": { "type": "keyword" },
      "acl": { "type": "keyword" },
      "title": { "type": "text", "analyzer": "zh_business" },
      "content": { "type": "text", "analyzer": "zh_business" },
      "exact_terms": { "type": "keyword" },
      "updated_at": { "type": "date" }
    }
  }
}
```

`exact_terms` 用来保存抽取出的错误码、产品型号和接口名，避免它们被分词器切碎。`tenant_id` 与 `acl` 必须在检索阶段过滤；先全库召回再由应用层删除无权限结果，会泄露命中数量、分数甚至高亮片段。

# 四、可直接改造的查询

```python
from typing import Any

# 标题权重应由离线评测决定，这里是便于起步的初始值。
TITLE_BOOST = 2.0
# 精确词字段权重高于普通正文，确保错误码和型号优先。
EXACT_TERM_BOOST = 4.0
# 每次稀疏召回进入融合层的候选数量。
SPARSE_TOP_K = 50


def build_bm25_query(question: str, tenant_id: str, role_ids: list[str]) -> dict[str, Any]:
    """构造带租户和角色权限过滤的 BM25 查询。"""
    # 当前请求允许访问的角色；空集合时只能命中 public。
    allowed_roles = ["public", *role_ids]
    return {
        "size": SPARSE_TOP_K,
        "_source": ["chunk_id", "title", "content", "updated_at"],
        "query": {
            "bool": {
                "filter": [
                    {"term": {"tenant_id": tenant_id}},
                    {"terms": {"acl": allowed_roles}},
                ],
                "should": [
                    {
                        "multi_match": {
                            "query": question,
                            "fields": [f"title^{TITLE_BOOST}", "content"],
                            "type": "best_fields",
                        }
                    },
                    {
                        "term": {
                            "exact_terms": {
                                "value": question,
                                "boost": EXACT_TERM_BOOST,
                            }
                        }
                    },
                ],
                "minimum_should_match": 1,
            }
        },
        "highlight": {"fields": {"title": {}, "content": {}}},
    }
```

真实项目还应先从问题里抽取精确实体，再对 `exact_terms` 做 `terms` 查询。不要直接把整句问题当作一个 keyword；上例保留这个最小分支，是为了突出字段职责。

# 五、中文分词怎么验收

先用 `_analyze` 看词元，再看搜索结果：

```json
POST knowledge_chunks/_analyze
{
  "analyzer": "zh_business",
  "text": "TMS-2026 运单轨迹回传失败"
}
```

应重点检查：

- 错误码、型号、缩写是否完整保留。
- 同一业务词在索引和查询阶段是否使用同一分析器。
- 自定义词典更新是否需要重建索引，滚动发布时各节点词典是否一致。
- `match`、`term`、`match_phrase` 是否放在正确字段；`term` 不会替你做全文分词。

# 六、评测与排障

检索评测至少保存 `Recall@K`、`MRR`、无结果率和 P95 延迟。坏案例按下面顺序查：

1. `_analyze` 是否产生了预期词元。
2. 文档是否进入正确索引、租户和权限范围。
3. `explain: true` 下哪些字段贡献了分数。
4. 正确证据是否在 Top K 外，还是根本没有命中。
5. 改词典或字段后，固定评测集是否整体提升，而不是只修好一个例子。

# 七、常见错误

- 只建一个 `text` 字段，精确过滤、聚合和全文检索全部混用。
- 把 BM25 `_score` 与向量余弦分直接相加，两种分值没有统一量纲。
- 业务词典只在一台 ES 节点更新，导致同一查询结果漂移。
- 为了召回率把 `minimum_should_match` 放得过松，Top K 被通用词占满。
- 忘记记录查询 DSL、索引版本和词典版本，线上坏案例无法复现。

# 八、总结

- **为什么向量检索不能替代 BM25**：用户问“E17 报错”“GB/T 35273 第 6.3 条”“NullPointerException”时，关键线索是不能改写的错误码、标准号和 API 名。
- **倒排索引与 BM25 到底算什么**：词频 TF：查询词在当前文档出现得越多，通常越相关，但收益会逐渐饱和。 -> 逆文档频率 IDF：越少见的词区分度越高，“E17”通常比“系统”更重要。 -> 长度归一化：避免长文档仅因包含更多词而天然占优。
- **索引设计：正文、精确词和权限分开**：exact_terms 用来保存抽取出的错误码、产品型号和接口名，避免它们被分词器切碎。
- **可直接改造的查询**：上例保留这个最小分支，是为了突出字段职责。
- **中文分词怎么验收**：错误码、型号、缩写是否完整保留。
- **评测与排障**：_analyze 是否产生了预期词元。 -> 文档是否进入正确索引、租户和权限范围。 -> explain: true 下哪些字段贡献了分数。 -> 正确证据是否在 Top K 外，还是根本没有命中。

## 参考资料

- [Elasticsearch：BM25 similarity](https://www.elastic.co/docs/reference/elasticsearch/index-settings/similarity)
- [Elasticsearch：Analyze API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-analyze)
- [Elasticsearch：Hybrid search](https://www.elastic.co/docs/solutions/search/hybrid-search)

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)

<!-- knowledge-scenario-inlined:AA-04 -->

## 8.1 可运行实验：ES 倒排索引与 BM25 拆解


```html runnable file=index.html title="ES 倒排索引与 BM25 拆解" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AA-04 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AA-04 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'ES 倒排索引与 BM25 拆解', summary: '观察分词、TF、DF、IDF、文档长度和字段权重如何影响排名。', controls: [
    { key: 'k1', label: '词频饱和 k1', type: 'range', min: 0.6, max: 2.2, step: 0.1, value: 1.2, suffix: '' },
    { key: 'b', label: '长度归一化 b', type: 'range', min: 0, max: 1, step: 0.05, value: 0.75, suffix: '' },
    { key: 'analyzer', label: '分词策略', type: 'select', value: 'ik', options: [['standard', 'Standard'], ['ik', 'IK Smart'], ['keyword', 'Keyword']] }
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
      /** 三篇样例文档的词频。 */
      const frequencies = [3, 1, 2];
      /** 三篇样例文档的长度。 */
      const lengths = [140, 60, 280];
      /** 样例集合的平均文档长度。 */
      const averageLength = lengths.reduce(function (sum, length) { return sum + length; }, 0) / lengths.length;
      /** 查询词在样例集合中的 IDF。 */
      const idf = Math.log(1 + (3 - 2 + 0.5) / (2 + 0.5));
      /** 根据 BM25 公式计算的三个分数。 */
      const scores = frequencies.map(function (frequency, index) { return idf * frequency * (values.k1 + 1) / (frequency + values.k1 * (1 - values.b + values.b * lengths[index] / averageLength)); });
      if (values.analyzer === 'keyword' || fail) { scores[0] = 0; }
      /** 分数最高的文档编号。 */
      const winner = scores.indexOf(Math.max.apply(null, scores)) + 1;
      return { metrics: [[idf.toFixed(3), 'IDF'], [scores[0].toFixed(3), 'Doc 1 分数'], [scores[1].toFixed(3), 'Doc 2 分数'], ['Doc ' + winner, '最终第一']], stages: [aiStage('Analyzer', values.analyzer === 'keyword' || fail ? 'fail' : 'ok', values.analyzer), aiStage('倒排表', 'ok', '退款→D1,D3'), aiStage('TF 饱和', 'ok', 'k1=' + values.k1), aiStage('长度归一', values.b === 0 ? 'warn' : 'ok', 'b=' + values.b), aiStage('字段加权', 'ok', 'title×2')], rows: [['BM25 公式', 'IDF × TF×(k1+1) / (TF+k1×(1-b+b×dl/avgdl))'], ['分词结果', values.analyzer === 'ik' && !fail ? '“退款接口”拆为领域可检索词' : '查询词未进入正确倒排项'], ['长文档影响', values.b > 0.8 ? '长度惩罚较强，需用业务评测确认' : '当前长度归一化适中']], diagnosis: values.analyzer === 'keyword' || fail ? '分词契约错误使精确词无法召回，调 k1/b 不能修复 Analyzer 问题。' : '分词、倒排和 BM25 参数共同形成可解释排名。', danger: values.analyzer === 'keyword' || fail };
     }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
