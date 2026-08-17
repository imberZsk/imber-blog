# Embedding（01） - Embedding 向量化

> 读完后，你应能完成以下任务：
> - 绘制“RAG（18） - Embedding 向量化 / 把文本变成向量”的关键对象与数据流，解释“embedding 就是一个函数：输入一段文本，输出一个固定长度的数字向量。”，并用源码位置、日志或 Trace 标注证据。
> - 为“RAG（18） - Embedding 向量化 / 用余弦相似度量「近」”设计正常与异常输入，验证“最常用的是余弦相似度：看两个向量的夹角。”，输出首个偏差位置与回归测试结果。
> - 实现“RAG（18） - Embedding 向量化 / 工程上真正会踩的坑（本篇独有）”的最小代码或配置，检验“demo 里的词袋只认字面重叠，正好暴露它的短板：把候选换成「费用报支时限是多久」，它和「报销要多久」几乎没有共同词，余弦接近 0，但人能看出是同义。”，输出命令、结果与 Diff，并说明不适用边界。

> 一句话目标：读完你能讲清文本怎么变成向量、为什么向量的夹角能代表语义相似，并能算出两段文本的相似度。

# 一、与进阶篇的分工

本篇保留为 embedding 原理基础：重点讲文本转向量和余弦相似度。进阶应用请读 58《RAG：把文档向量化》和 61《向量数据库 Milvus》，那里会把向量化放进入库、检索、metadata 和生产索引里讲。

# 二、一个真实场景

用户在知识库里搜「报销要多久」，而你的文档里写的是「费用报支时限为三十天」。两句话没有一个共同的词——「报销」对「费用报支」，「多久」对「时限」。如果用传统的关键词匹配（像数据库的 `LIKE '%报销%'`），这条根本搜不到。

但人一眼就知道它们问的是同一件事。怎么让机器也具备这种「看意思而不是看字面」的能力？答案是 embedding：把每段文本变成一串数字（向量），意思相近的文本，向量也相近。于是「报销要多久」和「费用报支时限」即使用词不同，向量也会靠得很近，搜索就能命中。

# 三、把文本变成向量

embedding 就是一个函数：输入一段文本，输出一个固定长度的数字向量。

```text
"报销要多久"        → [0.21, -0.07, 0.88, ..., 0.13]   （比如 1536 维）
"费用报支时限"      → [0.19, -0.05, 0.85, ..., 0.15]   （方向很接近）
"今天午饭吃什么"    → [-0.6, 0.42, -0.1, ..., 0.7]    （方向完全不同）
```

这个向量不是随便给的。embedding 模型在海量文本上训练过，学到了「哪些词、哪些说法表达相近的意思」，于是它能把语义相近的文本映射到相近的向量位置。你可以把它想象成：每段文本在一个高维空间里被放到一个点上，意思越近的文本，点离得越近。

关键认知：**向量本身没有可读含义**，第 3 维是 0.88 不代表任何具体的事。有意义的是向量之间的相对关系——谁离谁近。

# 四、用余弦相似度量「近」

怎么衡量两个向量近不近？最常用的是余弦相似度：看两个向量的**夹角**。

```text
夹角小（方向一致）→ 余弦接近 1 → 语义相似
夹角大（方向无关）→ 余弦接近 0 → 语义无关
方向相反         → 余弦接近 -1 → 语义相反
```

为什么用夹角而不用直线距离？因为余弦只看方向、不看长度。一段长文本和一段短文本，只要表达的意思一致（用词比例相近），夹角就小、余弦就高，不会因为长度差异被误判为不相似。

计算公式不复杂，就是「点积除以两个向量模长的乘积」：

```python
def cosine(v1, v2):
    dot = sum(a * b for a, b in zip(v1, v2))          # 点积
    norm1 = math.sqrt(sum(a * a for a in v1))         # v1 模长
    norm2 = math.sqrt(sum(b * b for b in v2))         # v2 模长
    return dot / (norm1 * norm2)                      # 越接近 1 越相似
```

检索的本质，就是把用户问题也转成向量，然后算它和库里每个 chunk 向量的余弦相似度，取最高的几个。

# 五、工程上真正会踩的坑（本篇独有）

- **拿词袋当真 embedding 用**。demo 里的词袋只认字面重叠，正好暴露它的短板：把候选换成「费用报支时限是多久」，它和「报销要多久」几乎没有共同词，余弦接近 0，但人能看出是同义。真实语义检索必须用 embedding 模型，词袋只够教学演示。
- **问题和文档用了不同的 embedding 模型**。入库时用模型 A 把 chunk 转成向量，检索时用模型 B 把问题转成向量，两个向量空间对不上，相似度全是噪声。入库和检索必须用同一个模型、同一个版本。
- **忘了向量维度要一致**。不同模型输出的维度不同（768、1024、1536…），向量库建库时就锁定了维度，中途换模型得重建整个库。
- **以为相似度高就一定答得对**。embedding 只负责「找出字面/语义相关的内容」，它不理解对错。相关不等于正确，这就是后面 24 篇要用重排、26 篇要做评测的原因。

# 六、一句话面试答法

> **embedding 是什么，检索为什么用它？** embedding 是把文本映射成一个高维向量，语义相近的文本向量方向也相近。检索时把问题和每个 chunk 都转成向量，用余弦相似度算夹角，取最相近的几个。它比关键词匹配强在能识别「报销」和「费用报支」这种字面不同但意思相同的表达。要注意入库和检索必须用同一个 embedding 模型，否则向量空间对不上。

# 七、动手实践：22 Embedding 向量化

用「词袋向量 + 余弦相似度」演示什么叫**语义相似**：文本变成向量，意思近的向量夹角小、余弦值大。

## 7.1 在线运行


零依赖，纯标准库。

## 7.2 预期输出

```text
词表共 32 维

基准问题：报销需要几天内提交

  相似度 0.426  <- 报销请在三十天内提交申请
  相似度 0.224  <- 报销时需要附上发票原件
  相似度 0.000  <- 今天午餐吃什么比较好
```

同一个问题「报销需要几天内提交」，和三条候选算余弦相似度：字面重叠最多的「报销请在三十天内提交申请」排第一；同主题但用词少重叠的「附上发票原件」排第二；完全不相关的「午餐吃什么」是 0。这就是检索时「最相关排前面」的底层算法。

## 7.3 代码↔概念对应

| 概念 | 在 main.py 哪里 |
|---|---|
| 分词（中文 2 字滑窗） | `tokenize` |
| 文本 → 词袋向量 | `to_vector` |
| 余弦相似度（点积 / 模长积） | `cosine` |
| 统一词表（保证向量可比较） | `build_vocab` |
| 按相似度排序 | `main` 里 `results.sort` |

## 7.4 词袋的局限（也是为什么真实项目用 embedding API）

词袋只认字面重叠，不懂近义。把候选换成「费用报支时限是多久」，它和 query 几乎没有共同的 2 字片段，余弦会接近 0，但人能看出它们问的是同一件事。真实 embedding（OpenAI / bge 等）把语义压进几百上千维稠密向量，能识别「报销 ≈ 费用报支」这种近义关系。这个 demo 只为讲清「文本→向量→算夹角」这条链路。

## 7.5 可运行源码：Embedding 向量化


### main.py

```python
"""用词袋向量和余弦相似度解释 Embedding 检索。"""

from __future__ import annotations

import math
import re
from collections import Counter


def tokenize(text: str) -> list[str]:
    """把中英文文本拆成教学用 token；text 是待向量化文本。"""
    return re.findall(r"[A-Za-z]+|[\u4e00-\u9fff]", text.lower())


def embed(text: str, vocabulary: list[str]) -> list[float]:
    """生成词频向量；vocabulary 定义每个维度的语义。"""
    # 当前文本的 token 频次。
    counts = Counter(tokenize(text))
    return [float(counts[token]) for token in vocabulary]


def cosine_similarity(left: list[float], right: list[float]) -> float:
    """计算两个等长向量的余弦相似度。"""
    # 两个向量的点积。
    dot_product = sum(a * b for a, b in zip(left, right, strict=True))
    # 左向量的 L2 范数。
    left_norm = math.sqrt(sum(value * value for value in left))
    # 右向量的 L2 范数。
    right_norm = math.sqrt(sum(value * value for value in right))
    return dot_product / (left_norm * right_norm) if left_norm and right_norm else 0.0


def main() -> None:
    """向量化一个问题和三段资料并按相似度排序。"""
    # 查询与候选文档。
    texts = ["报销需要什么发票", "报销必须提供发票", "年假提前申请", "服务器扩容方案"]
    # 所有文本共同决定的词表维度。
    vocabulary = sorted({token for text in texts for token in tokenize(text)})
    # 查询向量。
    query_vector = embed(texts[0], vocabulary)
    # 每段候选文档与查询的余弦得分。
    scored_documents = [(cosine_similarity(query_vector, embed(document, vocabulary)), document) for document in texts[1:]]
    for score, document in sorted(scored_documents, reverse=True):
        print(f"score={score:.3f} document={document}")


if __name__ == "__main__":
    main()
```

# 八、总结

- **把文本变成向量**：embedding 就是一个函数：输入一段文本，输出一个固定长度的数字向量。
- **用余弦相似度量「近」**：最常用的是余弦相似度：看两个向量的夹角。
- **工程上真正会踩的坑（本篇独有）**：demo 里的词袋只认字面重叠，正好暴露它的短板：把候选换成「费用报支时限是多久」，它和「报销要多久」几乎没有共同词，余弦接近 0，但人能看出是同义。
- **一句话面试答法**：embedding 是把文本映射成一个高维向量，语义相近的文本向量方向也相近。

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)

<!-- knowledge-scenario-inlined:AA-03 -->

## 8.1 可运行实验：Embedding 选型与向量成本


```html runnable file=index.html title="Embedding 选型与向量成本" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AA-03 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AA-03 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'Embedding 选型与向量成本', summary: '计算维度、精度、文档规模和模型升级带来的存储与重建成本。', controls: [
    { key: 'vectors', label: '向量数量', type: 'range', min: 100000, max: 5000000, step: 100000, value: 1000000, suffix: ' 条' },
    { key: 'dimensions', label: '向量维度', type: 'select', value: '1024', options: [['384', '384'], ['768', '768'], ['1024', '1024'], ['1536', '1536'], ['3072', '3072']] },
    { key: 'precision', label: '存储精度', type: 'select', value: 'float32', options: [['float32', 'Float32'], ['float16', 'Float16'], ['int8', 'Int8 量化']] }
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
      /** 每个向量元素占用的字节数。 */
      const bytesPerValue = values.precision === 'float32' ? 4 : values.precision === 'float16' ? 2 : 1;
      /** 向量裸数据的 GiB 大小。 */
      const storageGiB = values.vectors * Number(values.dimensions) * bytesPerValue / 1024 / 1024 / 1024;
      /** 按每批 128 条计算的 Embedding 请求批次。 */
      const batches = Math.ceil(values.vectors / 128);
      /** 升级模型时需要重算的向量数量。 */
      const rebuild = fail ? values.vectors : Math.round(values.vectors * 0.08);
      return { metrics: [[storageGiB.toFixed(2) + ' GiB', '裸向量存储'], [batches.toLocaleString(), 'Embedding 批次'], [rebuild.toLocaleString(), '需重算向量'], [values.dimensions, '索引维度']], stages: [aiStage('模型契约', fail ? 'fail' : 'ok', fail ? 'query/doc 不同模型' : 'same model'), aiStage('归一化', fail ? 'warn' : 'ok', 'cosine'), aiStage('批处理', 'ok', 128), aiStage('写入索引', 'ok', values.precision), aiStage('版本切换', fail ? 'fail' : 'ok', fail ? 'mixed' : 'atomic')], rows: [['估算边界', '未计 HNSW 图、metadata、副本和 WAL，生产容量需再乘 1.5～3'], ['模型升级', fail ? '新旧向量混入同一索引，距离不可比较' : '建立新版本索引并离线回归'], ['精度权衡', values.precision === 'int8' ? '容量最低，但必须评测量化召回损失' : '保留较高精度，成本相应增加']], diagnosis: fail ? 'Embedding 模型或版本不一致，查询必须阻断。' : '维度、距离与版本契约一致，可据此估算容量和重建窗口。', danger: fail };
     }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
