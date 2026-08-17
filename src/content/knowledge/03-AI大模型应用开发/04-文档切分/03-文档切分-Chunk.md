# 文档切分（03） - 文档切分 Chunk

> 读完后，你应能完成以下任务：
> - 绘制“RAG（17） - 文档切分 Chunk / chunk_size：一块装多少内容”的关键对象与数据流，解释“chunk_size 是每个 chunk 的大小（按字符或 token 算）。”，并用源码位置、日志或 Trace 标注证据。
> - 为“RAG（17） - 文档切分 Chunk / overlap：给相邻 chunk 留一点重叠”设计正常与异常输入，验证“光按大小切有个硬伤：关键信息可能正好被切在两个 chunk 的边界上。”，输出首个偏差位置与回归测试结果。
> - 实现“RAG（17） - 文档切分 Chunk / 企业文档常用的父子分块”的最小代码或配置，检验“普通 chunk 只存一小段，适合精确召回；”，输出命令、结果与 Diff，并说明不适用边界。

> 一句话目标：读完你能讲清为什么要切分、chunk_size 和 overlap 怎么影响检索，并能为不同文档选一个合理的切法。

# 一、与进阶篇的分工

本篇保留为 chunk 基础：重点讲 chunk_size、overlap 和语义完整性。进阶切分请读 59《知识库的 loader 和 splitter》和 60《LangChain 全部 Splitter》，那里会把不同来源、不同结构文档的切分策略讲成工程模块。

# 二、一个真实场景

你把一份 5000 字的员工手册整篇存进了知识库。用户问「报销几天内提交」，检索把整篇手册都召回来了——里面确实有这句话，但也夹着考勤、请假、保密协议一大堆无关内容。模型在这一大坨文字里找答案，要么找串了，要么被淹没。

反过来，如果你把手册切得太碎，一句话拆成两半。「报销需在费用产生后」和「30 天内提交」被切到两个 chunk 里。检索召回了前半句，但「30 天」这个关键数字不在里面，答案残缺。

切分（chunking）就是在这两个极端之间找平衡：**切出的每一块，既要足够小到只讲一件事，又要足够完整到不丢上下文**。它是入库的第一步，也是最影响检索质量的一步。

# 三、chunk_size：一块装多少内容

chunk_size 是每个 chunk 的大小（按字符或 token 算）。它直接决定了检索的「分辨率」：

| chunk_size | 问题 |
|---|---|
| 太大（如整段几百字） | 检索能命中，但答案被无关内容稀释，模型容易答偏 |
| 太小（如十几个字） | 一句话被拦腰切断，上下文丢失，命中了也看不全 |
| 适中（如一两句话） | 一块讲清一个点，检索准、答案聚焦 |

没有万能的数字。FAQ 这种「一问一答」很短，可以切小；制度条款一条就是一段，按段切更合适。原则是：**让一个 chunk 尽量对应一个完整的语义单元**——一个问答、一条规则、一个步骤。

# 四、overlap：给相邻 chunk 留一点重叠

光按大小切有个硬伤：关键信息可能正好被切在两个 chunk 的边界上。比如「……由直属主管审批。病假需在三个工作日内补交证明」这句，如果边界正好落在句号处，「病假补交证明」就和它的前提被分开了。

overlap（重叠）就是让相邻 chunk 共享一小段内容来缓解这个问题：

```text
无 overlap：
  chunk0: [........第一种是账号密码登录]
  chunk1: [第二种是企业微信扫码登录....]   ← 边界硬切

有 overlap=10：
  chunk0: [........第一种是账号密码登录，适合内部员工。第二种是企业微信扫码]
  chunk1: [第二种是企业微信扫码登录，需要管理员....]   ← 重叠部分保住了边界信息
```

overlap 让边界信息在两个 chunk 里都出现一次，检索到任意一个都不丢上下文。代价是存储和检索量略增，所以 overlap 一般取 chunk_size 的 10%~20%，不宜过大。

# 五、企业文档常用的父子分块

普通 chunk 只存一小段，适合精确召回；但合同、SOP、维修手册经常需要“先找准一句，再带回整段上下文”。这时可以用父子分块：

- 子块：小，负责召回，比如一句话、一条步骤、一行表格。
- 父块：大，负责回答，比如同一章节、同一张表、同一页图文。

在线检索时先用子块召回，再把对应父块拼进 prompt。这样既保留召回精度，又不会让模型只看到半句话。

图文表也要当资产处理。表格要保留表名、页码、行列含义；图片要保留标题、页码、OCR/VLM 描述；原文件最好能回跳到页码或截图。否则回答里说“见下表”，用户却找不到证据。更完整的企业级做法见 `../09-附录/进阶-企业级RAG项目拆解.md`。

# 六、工程上真正会踩的坑（本篇独有）

- **overlap 设得比 chunk_size 还大**。窗口起点回退量超过窗口大小，下一窗起点反而比上一窗还靠前，会死循环。demo 里 `chunk_by_size` 开头就校验 `overlap < chunk_size`。
- **只按固定字符数硬切，无视语义边界**。把表格、代码块、Markdown 标题从中间切断，chunk 就废了。真实项目应优先按标题、段落、句子等语义边界切，固定窗口只做兜底。
- **把图表当普通文本切碎**。表格没表头、图片没说明、页码没保留，后面就无法引用和回跳原文。图文表要先资产化，再决定怎么分块。
- **全库一个 chunk_size 走天下**。FAQ 和长篇制度文档的最佳切法完全不同。按文档类型分别配置，比统一参数效果好得多。
- **切完不带元数据**。每个 chunk 至少要记住「来自哪份文档、第几段」，否则后面 25 篇要做的引用来源就无从生成。切分时就要把 source 带上。

# 七、一句话面试答法

> **chunk 怎么切才合理？** 目标是让每个 chunk 对应一个完整语义单元——一个问答、一条规则。chunk_size 太大答案会被无关内容稀释，太小会切断上下文，要按文档类型调。再配 10%~20% 的 overlap，让关键信息不会正好被切在边界丢掉。优先按标题、段落等语义边界切，固定字符窗口只做兜底，并且每个 chunk 都带上来源元数据，供后面做引用。

# 八、动手实践：21 文档切分 Chunk

用同一段文档跑三组切分参数，直观对比 **chunk_size 太大、太小、折中带 overlap** 的区别。

## 8.1 在线运行


零依赖，纯标准库。

## 8.2 预期输出

```text
=== 切太大（chunk_size=120, overlap=0）===
原文 130 字，切成 2 个 chunk：
  [0] (120字) 本系统支持三种登录方式。第一种是账号密码登录，适合内部员工。第二种是企业微信扫码登录，需要管理员先在后台绑定企业。第三种是 API Token 登录，仅供服务端调用，Token 在控制台生成且只显示一次。忘记密码可在登录页点击找回，系统会发
  [1] (10字) 送验证码到注册邮箱。

=== 切太小（chunk_size=20, overlap=0）===
原文 130 字，切成 7 个 chunk：
  [0] (20字) 本系统支持三种登录方式。第一种是账号密码
  [1] (20字) 登录，适合内部员工。第二种是企业微信扫码
  [2] (20字) 登录，需要管理员先在后台绑定企业。第三种
  [3] (20字) 是 API Token 登录，仅供服务端
  [4] (20字) 调用，Token 在控制台生成且只显示一
  [5] (20字) 次。忘记密码可在登录页点击找回，系统会发
  [6] (10字) 送验证码到注册邮箱。

=== 折中 + overlap（chunk_size=40, overlap=10）===
原文 130 字，切成 4 个 chunk：
  [0] (40字) 本系统支持三种登录方式。第一种是账号密码登录，适合内部员工。第二种是企业微信扫码
  [1] (40字) 第二种是企业微信扫码登录，需要管理员先在后台绑定企业。第三种是 API Toke
  [2] (40字) 是 API Token 登录，仅供服务端调用，Token 在控制台生成且只显示一
  [3] (40字) 控制台生成且只显示一次。忘记密码可在登录页点击找回，系统会发送验证码到注册邮箱。
```

看三组的区别：切太大时整段挤进一个 chunk，检索命中后答案会被无关内容淹没；切太小时一句话被拦腰截断（比如「登录」和前面的方式名分了家）；折中带 overlap 时，相邻 chunk 有重叠（「第二种是企业微信扫码」同时出现在 chunk 0 和 1），关键信息不会正好被切在边界丢掉。

## 8.3 代码↔概念对应

| 概念 | 在 main.py 哪里 |
|---|---|
| 固定窗口切分 | `chunk_by_size` |
| overlap 重叠（回退起点） | `chunk_by_size` 里 `start = end - overlap` |
| overlap 必须小于 size 的约束 | `chunk_by_size` 开头的校验 |
| 三组参数横向对比 | `main` 里三次 `show` |

## 8.4 说明

这里用「按字符数固定窗口」切分，是最基础的策略。真实项目通常先按标题、段落、句子等语义边界切，再用 size/overlap 兜底。但理解了窗口和 overlap，再看语义切分就不难。

## 8.5 可运行源码：文档切分 Chunk


### main.py

```python
"""比较不同 chunk_size 与 overlap 的切分效果。"""

from __future__ import annotations


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """按固定窗口切分；chunk_size 是块长，overlap 是相邻重叠字符数。"""
    if chunk_size <= 0 or overlap < 0 or overlap >= chunk_size:
        raise ValueError("需要满足 chunk_size > overlap >= 0")
    # 每次窗口向前移动的字符数。
    step = chunk_size - overlap
    return [text[start : start + chunk_size] for start in range(0, len(text), step) if text[start : start + chunk_size]]


def main() -> None:
    """用同一文档运行三组参数并打印边界。"""
    # 包含多个事实的示例制度文本。
    document = "报销需要在30天内提交。交通费需附行程单。住宿费需附酒店发票。超过标准需要经理审批。"
    # 代表过大、过小和折中的三组参数。
    strategies = ((80, 0, "太大"), (12, 0, "太小"), (24, 6, "折中+overlap"))
    for chunk_size, overlap, label in strategies:
        # 当前策略生成的文本块。
        chunks = chunk_text(document, chunk_size, overlap)
        print(f"\n{label}: chunk_size={chunk_size}, overlap={overlap}, count={len(chunks)}")
        for index, chunk in enumerate(chunks, start=1):
            print(f"  [{index}] {chunk}")


if __name__ == "__main__":
    main()
```

# 九、总结

- **chunk_size：一块装多少内容**：chunk_size 是每个 chunk 的大小（按字符或 token 算）。
- **overlap：给相邻 chunk 留一点重叠**：光按大小切有个硬伤：关键信息可能正好被切在两个 chunk 的边界上。
- **企业文档常用的父子分块**：普通 chunk 只存一小段，适合精确召回；
- **工程上真正会踩的坑（本篇独有）**：只按固定字符数硬切，无视语义边界。
- **一句话面试答法**：再配 10%20% 的 overlap，让关键信息不会正好被切在边界丢掉。

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)

<!-- knowledge-scenario-inlined:AA-02 -->

## 9.1 可运行实验：Chunking 策略实验室


```html runnable file=index.html title="Chunking 策略实验室" description="调整参数并对比正常路径与典型失败路径"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AA-02 在线实验</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0f1211;color:#e7ece9;font-size:13px}.shell{padding:16px}.top{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}h1{margin:3px 0;font-size:18px}.id,.value{color:#68e0b5;font-family:ui-monospace,monospace}.summary{margin:4px 0;color:#a5afa9}.run{border:0;border-radius:6px;background:#68e0b5;color:#07110d;padding:8px 14px;font-weight:700}.grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.8fr);gap:12px}.panel{border:1px solid #29322e;background:#141817;padding:12px}.control{display:grid;gap:5px;margin-bottom:11px}.head{display:flex;justify-content:space-between;gap:8px}select,input{width:100%;accent-color:#68e0b5;background:#0d100f;color:#e7ece9}.toggle{display:flex;justify-content:space-between;border-top:1px solid #29322e;padding-top:9px}.toggle input{width:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border:1px solid #29322e;padding:8px}.metric b{display:block;color:#68e0b5;font-size:16px}.stages{display:flex;gap:6px;overflow:auto;margin:10px 0}.stage{border:1px solid #8a6230;padding:7px;min-width:90px}.stage.ok{border-color:#367a61}.stage.fail{border-color:#8b4545}table{width:100%;border-collapse:collapse}td{border-top:1px solid #29322e;padding:7px}.diagnosis{margin-top:9px;border-left:3px solid #68e0b5;background:#101412;padding:9px;line-height:1.5}.danger{border-color:#ef7f7f}@media(max-width:680px){.top,.grid{display:grid;grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><div><div class="id">AA-02 · DETERMINISTIC LAB</div><h1 id="title"></h1><p class="summary" id="summary"></p></div><button class="run" id="run">运行实验</button></header>
    <section class="grid"><div class="panel"><div id="controls"></div><label class="toggle"><span>注入典型故障</span><input id="failure" type="checkbox"></label></div><div class="panel"><div class="metrics" id="metrics"></div><div class="stages" id="stages"></div><table><tbody id="rows"></tbody></table><div class="diagnosis" id="diagnosis"></div></div></section>
  </main>
  <script>
    const scenario = { title: 'Chunking 策略实验室', summary: '比较固定、递归、标题、父子和语义切分的块边界与召回表现。', controls: [
    { key: 'strategy', label: '切分策略', type: 'select', value: 'heading', options: [['fixed', '固定长度'], ['recursive', '递归字符'], ['heading', 'Markdown 标题'], ['parent', '父子 Chunk'], ['semantic', '语义切分']] },
    { key: 'size', label: 'Chunk 大小', type: 'range', min: 128, max: 1024, step: 64, value: 512, suffix: ' tokens' },
    { key: 'overlap', label: 'Overlap', type: 'range', min: 0, max: 50, step: 5, value: 15, suffix: '%' }
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
      /** 策略对边界完整性的基础评分。 */
      const strategyScore = { fixed: 62, recursive: 74, heading: 86, parent: 92, semantic: 89 }[values.strategy];
      /** Chunk 过小或过大造成的尺寸惩罚。 */
      const sizePenalty = Math.abs(values.size - 512) / 32;
      /** Overlap 过大造成的重复惩罚。 */
      const duplicateRate = Math.round(values.overlap * 0.9 + (values.strategy === 'parent' ? 8 : 0));
      /** 综合边界质量。 */
      const quality = clamp(Math.round(strategyScore - sizePenalty - (fail ? 18 : 0)), 20, 98);
      return { metrics: [[quality + '%', '边界完整度'], [Math.ceil(12000 / (values.size * (1 - values.overlap / 100))), 'Chunk 数'], [duplicateRate + '%', '重复率'], [clamp(quality - duplicateRate / 3, 0, 100) + '%', '检索质量']], stages: [aiStage('识别结构', ['heading', 'parent', 'semantic'].includes(values.strategy) ? 'ok' : 'warn', values.strategy), aiStage('保护表格', fail ? 'fail' : values.strategy === 'fixed' ? 'warn' : 'ok', fail ? '拆断' : 'checked'), aiStage('切分', 'ok', values.size), aiStage('Overlap', duplicateRate > 30 ? 'warn' : 'ok', duplicateRate + '%'), aiStage('召回测试', quality > 75 ? 'ok' : 'warn', quality + '%')], rows: [['标题与正文', values.strategy === 'fixed' ? '可能分离，需向 Chunk 补充标题路径' : '保留层级路径'], ['父子检索', values.strategy === 'parent' ? '子块召回，父块进入生成上下文' : '当前策略未使用父子映射'], ['典型失败', fail ? '表格行被从表头拆开，结构校验失败' : '未检测到跨块结构破坏']], diagnosis: quality >= 80 && duplicateRate <= 30 && !fail ? '当前策略兼顾语义边界、召回颗粒度和重复成本。' : '需要调整结构保护、Chunk 大小或 Overlap。', danger: fail };
     }
    function render() { const result = simulate(readValues()); document.querySelector('#metrics').innerHTML = result.metrics.map(item => '<div class="metric"><b>' + item[0] + '</b><span>' + item[1] + '</span></div>').join(''); document.querySelector('#stages').innerHTML = result.stages.map(item => '<div class="stage ' + item.state + '"><b>' + item.name + '</b><div>' + item.detail + '</div></div>').join(''); document.querySelector('#rows').innerHTML = result.rows.map(item => '<tr><td>' + item[0] + '</td><td>' + item[1] + '</td></tr>').join(''); const diagnosis = document.querySelector('#diagnosis'); diagnosis.textContent = result.diagnosis; diagnosis.className = 'diagnosis' + (result.danger ? ' danger' : ''); }
    scenario.controls.forEach(control => controls.appendChild(renderControl(control))); updateValues(); document.querySelector('#run').addEventListener('click', render); render();
  </script>
</body>
</html>
```
