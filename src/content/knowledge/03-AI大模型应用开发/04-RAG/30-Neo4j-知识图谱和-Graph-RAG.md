# RAG（30） - Neo4j 知识图谱和 Graph RAG

> 读完你能：理解知识图谱解决什么问题，以及 Graph RAG 何时值得引入。

# 一、本篇定位

这是 GraphRAG 专项篇，和 RAG（33）《进阶：GraphRAG 与知识图谱增强》 形成互补。

# 二、一个真实场景

用户问“设备 A 的 E17 故障和哪个传感器有关，处理步骤是什么”。普通 RAG 可能召回几段相似文本，但关系链不清楚。知识图谱可以把设备、部件、故障码、原因、处理步骤连成图，先走关系，再回原文找证据。

# 三、核心拆解

- Neo4j 存的是节点和关系。节点可以是设备、人员、公司、故障、条款；关系可以是属于、导致、引用、依赖。
- Graph RAG 不是替代向量 RAG，而是增加一条关系召回路径。图谱找路径，文本 RAG 找证据，模型负责组织回答。
- 图谱建设成本高，适合实体关系明确、多跳问题多、需要证据路径的领域。

# 四、工程链路

- 从文档抽取实体和关系。
- 写入 Neo4j。
- 用户问题做实体识别。
- 查询图谱路径。
- 根据路径回查原文证据。
- 结合文本证据生成回答。

# 五、落地建议

- 先从小范围核心实体建图，不要全量抽取。
- 图谱关系要能回到原文来源。
- 图查询结果要和 RAG chunk 一起给模型。

# 六、常见坑

- 为了显得高级硬上图谱。
- 图谱没有来源，关系无法核验。
- 实体抽取错误后不做人工校正，图越建越脏。

# 七、和已有主线的关系

`../09-附录/进阶-GraphRAG与知识图谱增强.md` 讲思路；本篇聚焦 Neo4j 落地链路。

# 八、设计判断

Graph RAG 最适合“关系先于文本”的问题。如果用户只是问制度条款、产品说明，普通 RAG 往往足够；如果用户问 A 和 B 的关系、某故障由哪些部件导致、某公司和哪些项目关联，图谱才开始有明显价值。建图前先列 20 个真实问题，看其中是否大量需要多跳关系和实体消歧。没有这些问题，图谱会变成昂贵的装饰。

# 九、复述答法

> Graph RAG 适合多跳关系和实体消歧。Neo4j 存实体关系，向量库保存原文证据，回答时先查关系路径，再回到文本证据。它不是普通 RAG 的替代品，只有关系问题足够多时才值得引入。

# 十、总结

- **核心拆解**：Neo4j 存的是节点和关系。
- **常见坑**：实体抽取错误后不做人工校正，图越建越脏。
- **本篇定位**：这是 GraphRAG 专项篇，和 RAG（33）《进阶：GraphRAG 与知识图谱增强》 形成互补。
- **落地建议**：先从小范围核心实体建图，不要全量抽取。

## 十、最小可运行示例：参数化 GraphRAG 查询

~~~text
# requirements.txt
neo4j>=5,<7
~~~

~~~python
from __future__ import annotations

from neo4j import Driver


# 图扩展最大返回量，避免无界遍历进入模型上下文。
MAX_GRAPH_HITS = 20


def find_evidence(driver: Driver, tenant_id: str, entity_id: str, groups: list[str]) -> list[dict[str, object]]:
    """查询实体关联证据；身份与权限参数来自服务端鉴权。"""

    # Cypher 固定标签、关系和跳数，模型不能提交任意查询文本。
    query = """
    MATCH (entity:Entity {tenant_id: $tenant_id, entity_id: $entity_id})
          <-[:MENTIONS]-(chunk:Chunk)<-[:HAS_CHUNK]-(document:Document)
    WHERE any(group IN document.acl_groups WHERE group IN $groups)
    RETURN chunk.chunk_id AS chunk_id, chunk.source_uri AS source_uri
    LIMIT $limit
    """
    # 查询参数不通过字符串拼接进入 Cypher。
    records, _, _ = driver.execute_query(
        query,
        tenant_id=tenant_id,
        entity_id=entity_id,
        groups=groups,
        limit=MAX_GRAPH_HITS,
        database_="neo4j",
    )
    return [record.data() for record in records]
~~~

图路径必须回链到有权限的原始 Chunk。GraphRAG 单独评估实体链接、多跳命中和证据回链，不用最终答案掩盖图谱错误。

## 参考资料

- [Neo4j Cypher Manual](https://neo4j.com/docs/cypher-manual/current/)
- [Neo4j GraphRAG for Python](https://neo4j.com/docs/neo4j-graphrag-python/current/)

<!-- knowledge-scenario-inlined:AA-15 -->

## 可运行实验：GraphRAG 实体关系与路径召回

调整参数并注入失败，重点对比正常路径、保护条件和失败诊断；运行源码与文章保存在同一个 Markdown 文件。

```html runnable file=index.html title="GraphRAG 实体关系与路径召回" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AA-15 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AA-15 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'GraphRAG 实体关系与路径召回', summary: '比较向量候选、图路径和社区摘要对多跳问题的证据贡献。', controls: [
    { key: 'hops', label: '图遍历深度', type: 'range', min: 1, max: 5, value: 2, suffix: ' hops' },
    { key: 'graphWeight', label: '图路径权重', type: 'range', min: 0, max: 100, step: 10, value: 60, suffix: '%' },
    { key: 'community', label: '社区摘要', type: 'select', value: 'on', options: [['off', '关闭'], ['on', '开启']] }
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
      /** 图遍历深度带来的候选路径数量。 */
      const paths = Math.pow(3, values.hops);
      /** 向量和图路径加权后的多跳命中率。 */
      const hitRate = clamp(62 + values.hops * 7 + values.graphWeight * 0.12 + (values.community === 'on' ? 6 : 0) - (values.hops > 3 ? (values.hops - 3) * 8 : 0) - (fail ? 18 : 0), 0, 98);
      /** 遍历和社区摘要带来的估算延迟。 */
      const latency = 90 + paths * 4 + (values.community === 'on' ? 80 : 0);
      return { metrics: [[paths, '候选路径'], [hitRate.toFixed(1) + '%', '多跳命中'], [latency + 'ms', '图检索延迟'], [values.graphWeight + '%', '图证据权重']], stages: [aiStage('实体抽取', fail ? 'fail' : 'ok', fail ? 'alias missing' : 'entities'), aiStage('向量召回', 'ok', 'top 10'), aiStage('图遍历', values.hops > 3 ? 'warn' : 'ok', values.hops + ' hops'), aiStage('社区摘要', values.community === 'on' ? 'ok' : 'warn', values.community), aiStage('证据融合', hitRate >= 75 ? 'ok' : 'warn', hitRate.toFixed(1))], rows: [['适用问题', '组织关系、依赖链、人物事件等需要跨文档多跳的问题'], ['路径爆炸', values.hops > 3 ? '候选指数增长，应限制关系类型、时间和最大路径数' : '遍历深度可控'], ['实体对齐', fail ? '同一实体别名未归一，路径断裂' : '实体 ID、别名和来源均可追溯']], diagnosis: fail ? '实体对齐失败，增加遍历深度只会放大噪声。' : hitRate >= 75 ? '向量、图路径和社区摘要提供互补证据。' : '应调整图权重、遍历范围或实体抽取。', danger: fail };
     }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
