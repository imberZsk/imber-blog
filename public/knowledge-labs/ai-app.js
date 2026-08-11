/** AI 应用开发在线实验的场景配置。 */
const AI_APP_SCENARIOS = {
  'AA-01': { title: '企业 RAG 全链路控制台', summary: '从离线建库到在线问答逐阶段观察数据、版本、权限和证据。', controls: [
    { key: 'documents', label: '导入文档', type: 'range', min: 10, max: 1000, step: 10, value: 240, suffix: ' 篇' },
    { key: 'quality', label: '解析质量', type: 'range', min: 60, max: 100, value: 94, suffix: '%' },
    { key: 'acl', label: '权限过滤', type: 'select', value: 'before', options: [['none', '未启用'], ['after', '召回后过滤'], ['before', '召回前过滤']] }
  ] },
  'AA-02': { title: 'Chunking 策略实验室', summary: '比较固定、递归、标题、父子和语义切分的块边界与召回表现。', controls: [
    { key: 'strategy', label: '切分策略', type: 'select', value: 'heading', options: [['fixed', '固定长度'], ['recursive', '递归字符'], ['heading', 'Markdown 标题'], ['parent', '父子 Chunk'], ['semantic', '语义切分']] },
    { key: 'size', label: 'Chunk 大小', type: 'range', min: 128, max: 1024, step: 64, value: 512, suffix: ' tokens' },
    { key: 'overlap', label: 'Overlap', type: 'range', min: 0, max: 50, step: 5, value: 15, suffix: '%' }
  ] },
  'AA-03': { title: 'Embedding 选型与向量成本', summary: '计算维度、精度、文档规模和模型升级带来的存储与重建成本。', controls: [
    { key: 'vectors', label: '向量数量', type: 'range', min: 100000, max: 5000000, step: 100000, value: 1000000, suffix: ' 条' },
    { key: 'dimensions', label: '向量维度', type: 'select', value: '1024', options: [['384', '384'], ['768', '768'], ['1024', '1024'], ['1536', '1536'], ['3072', '3072']] },
    { key: 'precision', label: '存储精度', type: 'select', value: 'float32', options: [['float32', 'Float32'], ['float16', 'Float16'], ['int8', 'Int8 量化']] }
  ] },
  'AA-04': { title: 'ES 倒排索引与 BM25 拆解', summary: '观察分词、TF、DF、IDF、文档长度和字段权重如何影响排名。', controls: [
    { key: 'k1', label: '词频饱和 k1', type: 'range', min: 0.6, max: 2.2, step: 0.1, value: 1.2, suffix: '' },
    { key: 'b', label: '长度归一化 b', type: 'range', min: 0, max: 1, step: 0.05, value: 0.75, suffix: '' },
    { key: 'analyzer', label: '分词策略', type: 'select', value: 'ik', options: [['standard', 'Standard'], ['ik', 'IK Smart'], ['keyword', 'Keyword']] }
  ] },
  'AA-05': { title: 'BM25、Vector 与 RRF 混合检索', summary: '分别查看两路召回，再调整 Top K、RRF k、过滤和 Rerank。', controls: [
    { key: 'topK', label: '每路 Top K', type: 'range', min: 3, max: 30, value: 10, suffix: '' },
    { key: 'rrfK', label: 'RRF k', type: 'range', min: 10, max: 100, step: 10, value: 60, suffix: '' },
    { key: 'filter', label: 'Metadata Filter', type: 'select', value: 'before', options: [['none', '不筛选'], ['after', '融合后过滤'], ['before', '召回前过滤']] }
  ] },
  'AA-06': { title: 'RAG ACL 与跨租户泄漏', summary: '切换鉴权时机、缓存键和租户，验证候选与引用是否会越权。', controls: [
    { key: 'filterStage', label: 'ACL 执行时机', type: 'select', value: 'before', options: [['none', '无 ACL'], ['after', '召回后'], ['before', '召回前']] },
    { key: 'cacheKey', label: '缓存键组成', type: 'select', value: 'full', options: [['query', '仅 Query'], ['tenant', 'Query + Tenant'], ['full', 'Query + Tenant + ACL 摘要']] },
    { key: 'role', label: '当前角色', type: 'select', value: 'employee', options: [['guest', '访客'], ['employee', '员工'], ['finance', '财务管理员']] }
  ] },
  'AA-07': { title: '增量建库、删除传播与索引版本', summary: '执行新增、更新或删除，观察 Chunk Diff、蓝绿索引和回滚窗口。', controls: [
    { key: 'operation', label: '文档操作', type: 'select', value: 'update', options: [['create', '新增'], ['update', '更新 v3 → v4'], ['delete', '删除']] },
    { key: 'changed', label: '变化 Chunk', type: 'range', min: 1, max: 30, value: 6, suffix: ' 个' },
    { key: 'strategy', label: '索引发布', type: 'select', value: 'bluegreen', options: [['inplace', '原地更新'], ['bluegreen', '蓝绿切换'], ['dual', '双写一段时间']] }
  ] },
  'AA-08': { title: 'LangSmith 与 LangFuse Trace 排障', summary: '展开一次 RAG Trace，从 Span、Token、耗时和评测标签定位根因。', controls: [
    { key: 'fault', label: '故障类型', type: 'select', value: 'generation', options: [['none', '无故障'], ['retrieval', '召回为空'], ['generation', '证据正确但生成错误'], ['tool', '工具超时']] },
    { key: 'sampling', label: 'Trace 采样率', type: 'range', min: 1, max: 100, value: 20, suffix: '%' },
    { key: 'redaction', label: '敏感字段脱敏', type: 'select', value: 'on', options: [['off', '关闭'], ['on', '开启']] }
  ] },
  'AA-09': { title: '模型路由、限流、重试与熔断', summary: '注入 429、超时或 5xx，观察退避、熔断、降级与幂等保护。', controls: [
    { key: 'fault', label: '上游故障', type: 'select', value: '429', options: [['none', '正常'], ['429', '429 限流'], ['timeout', '请求超时'], ['500', 'HTTP 5xx']] },
    { key: 'retries', label: '最大重试', type: 'range', min: 0, max: 6, value: 2, suffix: ' 次' },
    { key: 'breaker', label: '熔断阈值', type: 'range', min: 2, max: 10, value: 5, suffix: ' 次失败' }
  ] },
  'AA-10': { title: 'Multi-Query、Rewrite 与 HyDE', summary: '比较原始 Query、多查询、改写和假设文档检索的召回与去重。', controls: [
    { key: 'strategy', label: '查询策略', type: 'select', value: 'multi', options: [['raw', '原始 Query'], ['rewrite', 'Query Rewrite'], ['multi', 'Multi-Query'], ['hyde', 'HyDE']] },
    { key: 'variants', label: '生成查询数', type: 'range', min: 1, max: 8, value: 4, suffix: ' 条' },
    { key: 'dedupe', label: '候选去重', type: 'select', value: 'id', options: [['none', '不去重'], ['id', '按 Chunk ID'], ['semantic', '按语义相似度']] }
  ] },
  'AA-11': { title: 'Rerank 阈值、预算与延迟', summary: '调整初召回量、Rerank Top N 和阈值，观察效果、延迟及费用。', controls: [
    { key: 'recallK', label: '初召回 Top K', type: 'range', min: 10, max: 100, step: 10, value: 50, suffix: '' },
    { key: 'rerankN', label: 'Rerank Top N', type: 'range', min: 5, max: 50, step: 5, value: 20, suffix: '' },
    { key: 'threshold', label: '相关性阈值', type: 'range', min: 30, max: 90, step: 5, value: 60, suffix: '%' }
  ] },
  'AA-12': { title: 'RAG 评测与坏案例归因', summary: '计算检索与生成指标，并把错误定位到解析、切分、召回、重排或生成。', controls: [
    { key: 'k', label: '评测 Top K', type: 'range', min: 1, max: 20, value: 5, suffix: '' },
    { key: 'retrieval', label: '召回质量', type: 'range', min: 40, max: 100, value: 82, suffix: '%' },
    { key: 'grounding', label: '生成忠实度', type: 'range', min: 40, max: 100, value: 88, suffix: '%' }
  ] },
  'AA-13': { title: '异步建库队列与死信处理', summary: '观察上传任务从 Pending、Parsing、Embedding、Indexing 到完成或死信。', controls: [
    { key: 'jobs', label: '待建库任务', type: 'range', min: 10, max: 500, step: 10, value: 120, suffix: ' 个' },
    { key: 'workers', label: 'Worker 数量', type: 'range', min: 1, max: 16, value: 4, suffix: ' 个' },
    { key: 'retries', label: '最大重试', type: 'range', min: 0, max: 5, value: 3, suffix: ' 次' }
  ] },
  'AA-14': { title: 'DeepAgents 上下文压缩与专家分工', summary: '比较单 Agent、Subagents 与 Middleware 压缩的调用、Token 和失败边界。', controls: [
    { key: 'architecture', label: '执行架构', type: 'select', value: 'subagents', options: [['single', '单 Agent'], ['subagents', '专家 Subagents'], ['middleware', 'Subagents + 压缩 Middleware']] },
    { key: 'specialists', label: '专家数量', type: 'range', min: 1, max: 8, value: 4, suffix: ' 个' },
    { key: 'context', label: '原始上下文', type: 'range', min: 10000, max: 100000, step: 5000, value: 50000, suffix: ' tokens' }
  ] },
  'AA-15': { title: 'GraphRAG 实体关系与路径召回', summary: '比较向量候选、图路径和社区摘要对多跳问题的证据贡献。', controls: [
    { key: 'hops', label: '图遍历深度', type: 'range', min: 1, max: 5, value: 2, suffix: ' hops' },
    { key: 'graphWeight', label: '图路径权重', type: 'range', min: 0, max: 100, step: 10, value: 60, suffix: '%' },
    { key: 'community', label: '社区摘要', type: 'select', value: 'on', options: [['off', '关闭'], ['on', '开启']] }
  ] },
  'AA-16': { title: '多模态 RAG：OCR、表格与图片引用', summary: '观察版面解析、OCR、表格结构和坐标信息如何影响跨模态引用。', controls: [
    { key: 'ocr', label: 'OCR 准确率', type: 'range', min: 50, max: 100, value: 92, suffix: '%' },
    { key: 'layout', label: '版面解析', type: 'select', value: 'layout', options: [['plain', '纯文本'], ['layout', '版面感知'], ['vision', '视觉模型 + 版面']] },
    { key: 'coordinates', label: '保留坐标', type: 'select', value: 'yes', options: [['no', '否'], ['yes', '是']] }
  ] },
  'AA-17': { title: '语义缓存与成本计算器', summary: '比较精确与语义缓存，并验证版本、权限和知识库摘要是否进入缓存键。', controls: [
    { key: 'requests', label: '每日请求', type: 'range', min: 1000, max: 100000, step: 1000, value: 30000, suffix: ' 次' },
    { key: 'hitRate', label: '预计命中率', type: 'range', min: 0, max: 90, step: 5, value: 45, suffix: '%' },
    { key: 'key', label: '缓存键', type: 'select', value: 'full', options: [['query', '仅 Query'], ['model', 'Query + Model'], ['full', 'Query + Model + Prompt + ACL + KB 版本']] }
  ] }
};

/** 当前文章构建期注入的场景编号。 */
const aiAppScenarioId = document.body.dataset.scenario;
/** 当前场景的配置。 */
const aiAppScenario = AI_APP_SCENARIOS[aiAppScenarioId];
/** 参数控件的挂载节点。 */
const aiAppControlsElement = document.querySelector('#controls');
/** 典型故障注入开关。 */
const aiAppFailureElement = document.querySelector('#failure');

if (!aiAppScenario) {
  throw new Error('未知 AI 应用实验场景：' + aiAppScenarioId);
}

document.querySelector('#scenario-id').textContent = aiAppScenarioId + ' · ENGINEERING LAB';
document.querySelector('#title').textContent = aiAppScenario.title;
document.querySelector('#summary').textContent = aiAppScenario.summary;

/** 渲染单个声明式实验控件。 */
function renderAiAppControl(control) {
  /** 当前控件的标签容器。 */
  const wrapper = document.createElement('label');
  wrapper.className = 'control';
  /** 当前控件的实时值元素编号。 */
  const valueId = 'value-' + control.key;
  /** 当前控件的标题行。 */
  const heading = document.createElement('span');
  heading.className = 'head';
  heading.innerHTML = '<span>' + control.label + '</span><span class="value" id="' + valueId + '"></span>';
  wrapper.appendChild(heading);
  /** 当前控件实际接收输入的元素。 */
  const input = document.createElement(control.type === 'select' ? 'select' : 'input');
  input.dataset.key = control.key;
  if (control.type === 'select') {
    control.options.forEach(function (option) {
      /** 当前下拉选项。 */
      const optionElement = document.createElement('option');
      optionElement.value = option[0];
      optionElement.textContent = option[1];
      optionElement.selected = option[0] === control.value;
      input.appendChild(optionElement);
    });
  } else {
    input.type = 'range'; input.min = control.min; input.max = control.max; input.step = control.step || 1; input.value = control.value;
  }
  input.addEventListener('input', updateAiAppControlValues);
  wrapper.appendChild(input);
  return wrapper;
}

aiAppScenario.controls.forEach(function (control) { aiAppControlsElement.appendChild(renderAiAppControl(control)); });

/** 更新参数标题右侧显示的可读值。 */
function updateAiAppControlValues() {
  aiAppScenario.controls.forEach(function (control) {
    /** 当前配置对应的表单控件。 */
    const input = aiAppControlsElement.querySelector('[data-key="' + control.key + '"]');
    /** 需要展示的选择文本或数值。 */
    const displayValue = control.type === 'select' ? input.options[input.selectedIndex].text : Number(input.value).toLocaleString() + (control.suffix || '');
    document.querySelector('#value-' + control.key).textContent = displayValue;
  });
}

/** 读取当前参数并把范围值转换为数字。 */
function readAiAppValues() {
  /** 传给场景计算函数的参数对象。 */
  const values = {};
  aiAppScenario.controls.forEach(function (control) {
    /** 当前参数对应的表单输入。 */
    const input = aiAppControlsElement.querySelector('[data-key="' + control.key + '"]');
    values[control.key] = control.type === 'range' ? Number(input.value) : input.value;
  });
  values.failure = aiAppFailureElement.checked;
  return values;
}

/** 创建一个可视化执行阶段。 */
function aiStage(name, state, detail) { return { name: name, state: state, detail: detail }; }

/** 将数字限制在给定闭区间内。 */
function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }

/** 根据当前场景和参数执行 RAG 或生产工程机制计算。 */
function simulateAiApp(id, values) {
  /** 统一触发场景典型失败路径的开关。 */
  const fail = values.failure;
  switch (id) {
    case 'AA-01': {
      /** 解析成功的文档数量。 */
      const parsed = Math.floor(values.documents * values.quality / 100);
      /** 按平均每篇 8 个块估算的有效 Chunk 数量。 */
      const chunks = parsed * 8;
      /** ACL 执行位置带来的越权候选数量。 */
      const leaks = values.acl === 'before' && !fail ? 0 : values.acl === 'after' ? 2 : 7;
      /** 证据和权限均通过时的回答状态。 */
      const answer = parsed > 0 && leaks === 0 && !fail ? 'GROUNDED' : leaks ? 'BLOCKED' : 'REFUSE';
      return { metrics: [[parsed, '解析成功'], [chunks.toLocaleString(), '有效 Chunks'], [leaks, '越权候选'], [answer, '问答结果']], stages: [aiStage('Parse', values.quality >= 80 ? 'ok' : 'warn', parsed), aiStage('Clean', fail ? 'warn' : 'ok', 'metadata'), aiStage('Chunk', 'ok', chunks), aiStage('Embed', fail ? 'fail' : 'ok', 'v4'), aiStage('Index', fail ? 'fail' : 'ok', 'green'), aiStage('ACL', leaks ? 'fail' : 'ok', values.acl), aiStage('Retrieve', leaks ? 'warn' : 'ok', 'top 20'), aiStage('Rerank', 'ok', 'top 5'), aiStage('Generate', answer === 'GROUNDED' ? 'ok' : 'fail', answer)], rows: [['索引版本', fail ? '查询仍指向 index_v3，Embedding v4 不可混用' : '离线校验后原子切换到 index_v4'], ['证据门槛', answer === 'GROUNDED' ? 'Top 证据覆盖问题且引用可回溯' : '证据或权限不足，拒绝生成'], ['失败边界', '解析失败、空 Chunk、版本不一致与 ACL 失败均不进入生成']], diagnosis: answer === 'GROUNDED' ? '全链路数据契约、版本和权限一致，可以生成带引用回答。' : '链路已在错误阶段阻断，不能让模型用缺失或越权证据补答案。', danger: answer !== 'GROUNDED' };
    }
    case 'AA-02': {
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
    case 'AA-03': {
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
    case 'AA-04': {
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
    case 'AA-05': {
      /** 两路候选在去重后的最大规模。 */
      const candidates = Math.round(values.topK * (fail ? 1.8 : 1.5));
      /** RRF 首位候选的理论分数。 */
      const topScore = 1 / (values.rrfK + 1) + 1 / (values.rrfK + 2);
      /** 过滤策略造成的越权候选数。 */
      const leaks = values.filter === 'before' && !fail ? 0 : values.filter === 'after' ? 2 : 5;
      /** 在可控候选规模内的估算召回率。 */
      const recall = clamp(68 + values.topK * 1.1 - (values.rrfK < 20 ? 8 : 0) - leaks * 2, 0, 98);
      return { metrics: [[candidates, '融合候选'], [topScore.toFixed(4), 'RRF Top 分'], [recall.toFixed(0) + '%', '估算 Recall'], [leaks, '越权候选']], stages: [aiStage('BM25', 'ok', 'top ' + values.topK), aiStage('Vector', 'ok', 'top ' + values.topK), aiStage('ACL Filter', leaks ? 'fail' : 'ok', values.filter), aiStage('RRF', 'ok', 'k=' + values.rrfK), aiStage('Rerank', candidates > 35 ? 'warn' : 'ok', Math.min(candidates, 20))], rows: [['融合原则', '按排名计算 1/(k+rank)，不直接相加不同量纲的原始分数'], ['Top K', values.topK < 5 ? '候选过少，融合前已丢失长尾证据' : '两路候选规模可用于融合'], ['过滤时机', leaks ? '越权候选已进入 Trace 或缓存，事后过滤不够安全' : '每路召回前都带租户与 ACL 条件']], diagnosis: leaks ? '混合检索结果包含越权候选，应把过滤前移到每个召回器。' : '两路召回、RRF 和权限过滤顺序正确，可继续离线调参。', danger: leaks > 0 };
    }
    case 'AA-06': {
      /** 当前角色可访问的样例文档数量。 */
      const visible = values.role === 'finance' ? 12 : values.role === 'employee' ? 8 : 3;
      /** ACL 和缓存键不完整造成的泄漏数。 */
      const leaks = values.filterStage !== 'before' || values.cacheKey !== 'full' || fail ? (values.role === 'guest' ? 5 : 2) : 0;
      return { metrics: [[visible, '合法文档'], [leaks, '泄漏候选'], [values.filterStage.toUpperCase(), 'ACL 时机'], [leaks ? 'DENY' : 'ALLOW', '回答决策']], stages: [aiStage('解析身份', 'ok', values.role), aiStage('生成 ACL 摘要', fail ? 'fail' : 'ok', 'tenant + groups'), aiStage('召回过滤', values.filterStage === 'before' ? 'ok' : 'fail', values.filterStage), aiStage('缓存键', values.cacheKey === 'full' ? 'ok' : 'fail', values.cacheKey), aiStage('引用鉴权', leaks ? 'fail' : 'ok', leaks ? 'blocked' : 'pass')], rows: [['跨租户', values.filterStage === 'before' ? '向量与关键词查询均带 tenant_id' : '候选先进入内存，存在日志与缓存泄漏'], ['缓存隔离', values.cacheKey === 'full' ? '包含 tenant、权限摘要和知识库版本' : '不同权限用户可能复用同一答案'], ['引用接口', leaks ? '二次鉴权阻断返回，记录安全事件' : '下载或预览前再次校验文档权限']], diagnosis: leaks ? '检测到跨权限候选。系统必须拒答并修复召回、缓存和引用三层边界。' : '权限在检索前、缓存键和引用接口三处闭环。', danger: leaks > 0 };
    }
    case 'AA-07': {
      /** 本次需要重新计算 Embedding 的 Chunk 数。 */
      const reembedded = values.operation === 'delete' ? 0 : values.changed;
      /** 未正确传播删除时残留的旧向量数量。 */
      const stale = values.operation === 'delete' || values.operation === 'update' ? (fail ? Math.max(1, Math.floor(values.changed / 2)) : 0) : 0;
      /** 蓝绿发布需要同时保留的索引版本数。 */
      const versions = values.strategy === 'inplace' ? 1 : 2;
      return { metrics: [[reembedded, '重算 Embedding'], [stale, '残留旧向量'], [versions, '并存索引版本'], [stale ? 'ROLLBACK' : 'PROMOTE', '发布决策']], stages: [aiStage('Checksum', 'ok', 'changed'), aiStage('Chunk Diff', 'ok', '+' + values.changed), aiStage('Embed', 'ok', reembedded), aiStage('Tombstone', stale ? 'fail' : 'ok', stale), aiStage('离线校验', stale ? 'fail' : 'ok', 'retrieval + ACL'), aiStage('切换 Alias', stale ? 'warn' : 'ok', values.strategy), aiStage('清缓存', fail ? 'fail' : 'ok', 'v3')], rows: [['更新策略', values.operation + ' 只处理变化 Chunk，未变化向量复用'], ['索引切换', values.strategy === 'inplace' ? '无法原子回滚，线上可能读到中间态' : '校验新索引后原子切换 active alias'], ['删除传播', stale ? '旧规定仍可召回，必须清向量、关键词索引和缓存' : 'Tombstone 已传播到全部存储层']], diagnosis: stale ? '增量任务未清除旧证据，不能发布新索引。' : '变化集、版本、删除传播和回滚窗口均可追踪。', danger: stale > 0 };
    }
    case 'AA-08': {
      /** 根据故障类型构造的根因 Span。 */
      const rootSpan = fail ? 'redaction' : values.fault === 'none' ? 'none' : values.fault;
      /** 一次样例 Trace 的总耗时。 */
      const latency = values.fault === 'tool' ? 6200 : values.fault === 'retrieval' ? 780 : 1450;
      /** 一次样例 Trace 的 Token 总量。 */
      const tokens = values.fault === 'retrieval' ? 420 : 2380;
      return { metrics: [[rootSpan.toUpperCase(), '根因 Span'], [latency + 'ms', '总耗时'], [tokens, 'Tokens'], [values.sampling + '%', '采样率']], stages: [aiStage('Request', 'ok', 'trace-id'), aiStage('Retriever', values.fault === 'retrieval' ? 'fail' : 'ok', values.fault === 'retrieval' ? '0 docs' : '5 docs'), aiStage('Rerank', values.fault === 'retrieval' ? 'warn' : 'ok', 'top 3'), aiStage('Tool', values.fault === 'tool' ? 'fail' : 'ok', values.fault === 'tool' ? 'timeout' : 'n/a'), aiStage('Generation', values.fault === 'generation' ? 'fail' : 'ok', tokens), aiStage('Evaluator', rootSpan === 'none' ? 'ok' : 'warn', rootSpan)], rows: [['定位方法', values.fault === 'generation' ? '检索证据正确但 Faithfulness 低，根因在生成' : values.fault === 'retrieval' ? 'Retriever 输出为空，先查过滤和索引版本' : values.fault === 'tool' ? '工具 Span 超时，重试放大总耗时' : '各 Span 指标正常'], ['脱敏', values.redaction === 'on' && !fail ? 'Prompt、metadata 中的敏感字段已遮盖' : '敏感内容可能写入 Trace，必须阻断上报'], ['采样策略', values.sampling < 5 ? '低采样可能漏掉长尾错误，错误 Trace 应 100% 保留' : '正常请求采样，错误请求全量保留']], diagnosis: rootSpan === 'none' ? 'Trace 未发现异常，指标与评测标签一致。' : '根因已定位到 ' + rootSpan + ' 阶段，可针对该 Span 修复而非盲目改 Prompt。', danger: fail || values.redaction !== 'on' };
    }
    case 'AA-09': {
      /** 当前故障是否允许自动重试。 */
      const retryable = ['429', 'timeout', '500'].includes(values.fault);
      /** 带抖动指数退避的累计等待秒数。 */
      const backoff = retryable ? Array.from({ length: values.retries }, function (_, index) { return Math.pow(2, index) * 0.5; }).reduce(function (sum, delay) { return sum + delay; }, 0) : 0;
      /** 是否达到熔断阈值。 */
      const opened = fail || values.retries >= values.breaker;
      /** 最终是否切换到备用模型。 */
      const fallback = values.fault !== 'none' && (opened || values.retries >= 2);
      return { metrics: [[values.retries, '重试次数'], [backoff.toFixed(1) + 's', '累计退避'], [opened ? 'OPEN' : 'CLOSED', '熔断器'], [fallback ? 'BACKUP' : 'PRIMARY', '最终路由']], stages: [aiStage('限流', values.fault === '429' ? 'warn' : 'ok', values.fault), aiStage('幂等检查', fail ? 'fail' : 'ok', fail ? 'tool duplicated' : 'request-id'), aiStage('指数退避', retryable && values.retries ? 'ok' : 'warn', backoff.toFixed(1) + 's'), aiStage('熔断', opened ? 'warn' : 'ok', values.breaker), aiStage('降级模型', fallback ? 'ok' : 'warn', fallback ? 'backup' : 'unused')], rows: [['重试边界', values.retries > 3 ? '重试过多会放大拥塞和成本，应尽快降级' : '重试次数受控'], ['非幂等工具', fail ? '流式中途失败后重复执行扣款工具，幂等检查应阻断' : '工具调用携带稳定 idempotency key'], ['状态码策略', '429/5xx/超时可有限重试；参数错误和安全拒绝不应重试']], diagnosis: fail ? '检测到非幂等副作用风险，必须终止自动重试。' : fallback ? '主模型异常后按预算退避并切换备用模型。' : '主模型健康，熔断器保持关闭。', danger: fail };
    }
    case 'AA-10': {
      /** 不同查询策略的基础召回分。 */
      const baseRecall = { raw: 62, rewrite: 74, multi: 86, hyde: 82 }[values.strategy];
      /** 查询变体带来的候选总数。 */
      const rawCandidates = values.variants * 8;
      /** 去重策略减少后的候选数。 */
      const candidates = values.dedupe === 'none' ? rawCandidates : values.dedupe === 'id' ? Math.round(rawCandidates * 0.72) : Math.round(rawCandidates * 0.58);
      /** 变体数量和故障对召回率的修正。 */
      const recall = clamp(baseRecall + Math.min(values.variants, 4) * 2 - (fail ? 18 : 0), 0, 98);
      return { metrics: [[values.variants, '查询变体'], [rawCandidates, '原始候选'], [candidates, '去重候选'], [recall + '%', '估算 Recall']], stages: [aiStage('理解意图', fail ? 'fail' : 'ok', values.strategy), aiStage('生成查询', 'ok', values.variants), aiStage('并行召回', 'ok', rawCandidates), aiStage('候选去重', values.dedupe === 'none' ? 'warn' : 'ok', candidates), aiStage('覆盖检查', recall >= 80 ? 'ok' : 'warn', recall + '%')], rows: [['策略差异', values.strategy === 'hyde' ? '先生成假设答案再检索，可能放大模型偏见' : values.strategy === 'multi' ? '从同义词、业务实体和时间条件扩展查询' : '只改写或直接使用原问题'], ['去重键', values.dedupe === 'id' ? '同一 Chunk ID 只保留一次' : values.dedupe === 'semantic' ? '相近候选聚类，保留最高分证据' : '重复证据会浪费 Rerank 预算'], ['故障注入', fail ? '改写丢失“3 天未到账”时间约束' : '关键实体和约束均保留']], diagnosis: recall >= 80 && values.dedupe !== 'none' && !fail ? '查询扩展提高覆盖率，候选去重控制了后续成本。' : '需要修复意图保持或候选去重。', danger: fail };
    }
    case 'AA-11': {
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
    case 'AA-12': {
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
    case 'AA-13': {
      /** 每分钟单个 Worker 的确定性处理能力。 */
      const ratePerWorker = 6;
      /** 当前队列预计清空所需分钟。 */
      const minutes = Math.ceil(values.jobs / (values.workers * ratePerWorker));
      /** 故障任务经过重试后进入死信的数量。 */
      const deadLetters = fail ? Math.max(1, Math.floor(values.jobs * 0.03)) : 0;
      /** 重试产生的额外任务执行次数。 */
      const attempts = values.jobs + deadLetters * values.retries;
      return { metrics: [[minutes + 'm', '预计清空'], [attempts, '总执行次数'], [deadLetters, '死信任务'], [values.workers * ratePerWorker + '/m', '消费速率']], stages: [aiStage('Pending', 'ok', values.jobs), aiStage('Parsing', fail ? 'warn' : 'ok', values.workers), aiStage('Embedding', 'ok', 'batch'), aiStage('Indexing', 'ok', 'idempotent'), aiStage('Retry', deadLetters ? 'warn' : 'ok', values.retries), aiStage('Dead Letter', deadLetters ? 'fail' : 'ok', deadLetters), aiStage('Done', deadLetters ? 'warn' : 'ok', values.jobs - deadLetters)], rows: [['幂等键', 'tenant_id + document_id + checksum + pipeline_version'], ['重试策略', values.retries > 3 ? '重试过多会阻塞正常任务，应指数退避并进入死信' : '有限重试后转死信'], ['可观测性', deadLetters ? '记录阶段、异常类型、源文件和最后一次 Trace ID' : '全部任务完成']], diagnosis: deadLetters ? '部分任务进入死信，在线索引不能把它们标记为可查询。' : '队列吞吐、幂等和状态迁移正常。', danger: deadLetters > 0 };
    }
    case 'AA-14': {
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
    case 'AA-15': {
      /** 图遍历深度带来的候选路径数量。 */
      const paths = Math.pow(3, values.hops);
      /** 向量和图路径加权后的多跳命中率。 */
      const hitRate = clamp(62 + values.hops * 7 + values.graphWeight * 0.12 + (values.community === 'on' ? 6 : 0) - (values.hops > 3 ? (values.hops - 3) * 8 : 0) - (fail ? 18 : 0), 0, 98);
      /** 遍历和社区摘要带来的估算延迟。 */
      const latency = 90 + paths * 4 + (values.community === 'on' ? 80 : 0);
      return { metrics: [[paths, '候选路径'], [hitRate.toFixed(1) + '%', '多跳命中'], [latency + 'ms', '图检索延迟'], [values.graphWeight + '%', '图证据权重']], stages: [aiStage('实体抽取', fail ? 'fail' : 'ok', fail ? 'alias missing' : 'entities'), aiStage('向量召回', 'ok', 'top 10'), aiStage('图遍历', values.hops > 3 ? 'warn' : 'ok', values.hops + ' hops'), aiStage('社区摘要', values.community === 'on' ? 'ok' : 'warn', values.community), aiStage('证据融合', hitRate >= 75 ? 'ok' : 'warn', hitRate.toFixed(1))], rows: [['适用问题', '组织关系、依赖链、人物事件等需要跨文档多跳的问题'], ['路径爆炸', values.hops > 3 ? '候选指数增长，应限制关系类型、时间和最大路径数' : '遍历深度可控'], ['实体对齐', fail ? '同一实体别名未归一，路径断裂' : '实体 ID、别名和来源均可追溯']], diagnosis: fail ? '实体对齐失败，增加遍历深度只会放大噪声。' : hitRate >= 75 ? '向量、图路径和社区摘要提供互补证据。' : '应调整图权重、遍历范围或实体抽取。', danger: fail };
    }
    case 'AA-16': {
      /** 版面策略对结构保真的基础增益。 */
      const layoutBonus = values.layout === 'plain' ? 0 : values.layout === 'layout' ? 8 : 13;
      /** OCR、版面和坐标共同决定的引用准确率。 */
      const citation = clamp(values.ocr * 0.72 + layoutBonus + (values.coordinates === 'yes' ? 8 : 0) - (fail ? 20 : 0), 0, 99);
      /** 表格结构是否可以在问答中安全使用。 */
      const tableSafe = values.layout !== 'plain' && values.ocr >= 80 && !fail;
      return { metrics: [[values.ocr + '%', 'OCR 准确率'], [citation.toFixed(1) + '%', '引用准确率'], [tableSafe ? 'KEPT' : 'BROKEN', '表格结构'], [values.coordinates === 'yes' ? 'VISIBLE' : 'TEXT ONLY', '可视化引用']], stages: [aiStage('页面渲染', 'ok', 'page image'), aiStage('OCR', values.ocr >= 80 ? 'ok' : 'warn', values.ocr + '%'), aiStage('版面识别', values.layout === 'plain' ? 'warn' : 'ok', values.layout), aiStage('表格解析', tableSafe ? 'ok' : 'fail', tableSafe ? 'cells' : 'flattened'), aiStage('跨模态索引', fail ? 'fail' : 'ok', 'text + image'), aiStage('坐标引用', values.coordinates === 'yes' ? 'ok' : 'warn', values.coordinates)], rows: [['Chunk 元数据', values.coordinates === 'yes' ? '保留 page、bbox、element_id 和 source_uri' : '只有文本，无法高亮原页位置'], ['表格处理', tableSafe ? '表头、行列和合并单元格关系保留' : '纯文本展开后数值可能失去所属字段'], ['故障注入', fail ? 'OCR 把金额小数点识别错误，数值校验阻断入库' : '关键数字通过格式与范围校验']], diagnosis: tableSafe && citation >= 80 && values.coordinates === 'yes' ? '文本、版面和坐标契约完整，可返回可验证的多模态引用。' : '需要提高 OCR、结构解析或坐标保留质量。', danger: fail || !tableSafe };
    }
    case 'AA-17': {
      /** 每日由缓存命中的请求数量。 */
      const hits = Math.round(values.requests * values.hitRate / 100);
      /** 未命中时按每次 0.012 美元计算的每日模型费用。 */
      const dailyCost = (values.requests - hits) * 0.012;
      /** 缓存相对完全不缓存节省的费用。 */
      const saved = hits * 0.012;
      /** 缓存键缺少上下文版本时预计发生的错误复用数量。 */
      const wrongHits = values.key === 'full' && !fail ? 0 : Math.max(1, Math.round(hits * (values.key === 'query' ? 0.08 : 0.025)));
      return { metrics: [[hits.toLocaleString(), '每日命中'], ['$' + saved.toFixed(2), '每日节省'], ['$' + dailyCost.toFixed(2), '每日模型费'], [wrongHits, '错误复用']], stages: [aiStage('规范化 Query', 'ok', 'normalized'), aiStage('权限摘要', values.key === 'full' ? 'ok' : 'fail', values.key), aiStage('语义匹配', 'ok', values.hitRate + '%'), aiStage('版本校验', fail ? 'fail' : values.key === 'full' ? 'ok' : 'warn', fail ? 'KB changed' : values.key), aiStage('返回缓存', wrongHits ? 'fail' : 'ok', wrongHits)], rows: [['完整缓存键', 'tenant + ACL hash + normalized query + model + prompt + KB version'], ['语义阈值', '必须用坏案例集评测，不能只追求命中率'], ['失效策略', fail ? '知识库已发布 v5，但缓存仍绑定 v4，必须批量失效' : '索引与 Prompt 版本变化会生成新命名空间']], diagnosis: wrongHits ? '缓存节省了费用，但产生错误或越权复用，当前方案不可上线。' : '缓存键隔离完整，在保证正确性的前提下降低模型费用。', danger: wrongHits > 0 };
    }
    default: throw new Error('未实现的 AI 应用场景：' + id);
  }
}

/** 把场景结果渲染到指标、阶段、表格和诊断区域。 */
function renderAiAppResult(result) {
  document.querySelector('#metrics').innerHTML = result.metrics.map(function (metric) { return '<div class="metric"><b>' + metric[0] + '</b><span>' + metric[1] + '</span></div>'; }).join('');
  document.querySelector('#stages').innerHTML = result.stages.map(function (item) { return '<div class="stage ' + item.state + '"><b>' + item.name + '</b><small>' + item.detail + '</small></div>'; }).join('');
  document.querySelector('#rows').innerHTML = result.rows.map(function (row) { return '<tr><td>' + row[0] + '</td><td>' + row[1] + '</td></tr>'; }).join('');
  /** 当前结果的诊断提示元素。 */
  const diagnosisElement = document.querySelector('#diagnosis');
  diagnosisElement.textContent = result.diagnosis;
  diagnosisElement.className = 'diagnosis' + (result.danger ? ' danger' : '');
}

/** 使用当前参数运行一次实验。 */
function runAiAppScenario() { renderAiAppResult(simulateAiApp(aiAppScenarioId, readAiAppValues())); }

document.querySelector('#run').addEventListener('click', runAiAppScenario);
aiAppFailureElement.addEventListener('change', runAiAppScenario);
updateAiAppControlValues();
runAiAppScenario();
