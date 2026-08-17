import fs from 'node:fs'
import path from 'node:path'

/** AI 大模型基础文章所在目录。 */
const AI_FOUNDATION_ROOT = path.join(process.cwd(), 'src', 'content', 'knowledge', '03-AI大模型应用开发', '01-大模型基础')

/** 当前仍保留为第 01 篇的原始文章。 */
const SOURCE_FILE = path.join(AI_FOUNDATION_ROOT, '01-Token、上下文窗口与生成机制.md')

/** 当前拆分生成的三篇主题文章。 */
const SPLIT_ARTICLES = [
  {
    fileName: '01-Token与Tokenizer.md',
    title: '# 大模型基础（01） - Token 与 Tokenizer：文本如何变成模型输入',
    objective: '从原始文本到 Token ID，建立可计数、可回归、可解释的输入契约。',
    outcomes: [
      '用目标模型的 Tokenizer 统计 System、历史、工具和问题的分项 Token，并保存模型、模板和 Tokenizer 版本作为证据。',
      '设计中英文、代码、Emoji 和工具 Schema 的差分样本，解释每次 Token 数变化对应的字段和 Token ID。',
      '在模型或消息模板升级前运行边界回归，发现本地计数与 API usage 漂移时暂停发布并保留原始请求快照。'
    ],
    sourceHeadings: ['二、Token 是什么：Tokenizer 如何把文本变成 Token ID？'],
    body: `## 一、先建立主线：本文只解决“文本怎样进入模型”

一次模型调用的第一步不是发送字符串，而是把字符串交给目标模型对应的 Tokenizer。Tokenizer 根据词表和规则切分文本，再把每个片段映射成 Token ID；模型后续看到的是 ID 序列，不是字符本身。

本文的主线只有四步：确定目标模型，使用同一消息模板计数，识别特殊 Token 和 Unicode 边界，把计数结果接入预算与回归。上下文窗口和采样策略属于后续文章，本文只说明它们为什么必须使用 Token 作为共同单位。

| 输入 | Tokenizer 的产物 | 工程意义 |
| --- | --- | --- |
| 中文、英文、代码和标点 | Token 序列 | 不能用字符数代替容量 |
| Token 序列 | 整数 ID 序列 | ID 只是词表索引，不代表语义距离 |
| 消息与工具模板 | 特殊 Token 与边界标记 | 可见正文不是完整计费输入 |
| 计数结果 | 预算记录 | 允许在请求前阻止超限 |

## 二、Token 不是字符，也不等于单词

同一个汉字不保证对应一个 Token，同一个英文单词也可能被拆成词根、后缀或字节片段。空格、换行、大小写、代码缩进和 Unicode 规范化都会改变结果。生产系统不能用 \`string.length\`、固定“一个中文字符一个 Token”或另一模型的分词结果做硬预算。

Tokenizer 的结果还会受到特殊 Token、消息角色、工具 Schema、图片描述和供应商序列化模板影响。只复制用户可见文本进行粗估，通常会低估真实输入。

## 三、BPE、WordPiece 与 SentencePiece 的共同问题

如果词表只保存完整单词，未登录词会让词表无限增长；如果只保存字符或字节，序列会过长。子词算法在词表大小与序列长度之间做折中。BPE 反复合并高频相邻片段，WordPiece 依据似然相关评分构建子词，SentencePiece 通常直接在原始字符串上处理空格和 Unicode。

应用开发不必重新训练 Tokenizer，但必须记录以下契约：词表版本、规范化规则、预分词策略、特殊 Token、消息模板和回退策略。模型名称变化、供应商升级或聊天模板变化，都必须重新计数并回归。

## 四、特殊 Token 和消息模板为什么容易漏算

聊天协议可能把 \`system\`、\`user\`、\`assistant\`、工具调用和结束标记序列化为模型不可见的边界。工具 Schema 还可能比用户问题更长。多模态输入会把附件元数据、图片块或音频块映射成额外的模型输入。

| 内容 | 是否计数 | 典型漏算原因 |
| --- | --- | --- |
| System 规则 | 是 | 中间件重复追加或隐藏默认提示 |
| 历史消息 | 是 | 只计算正文，漏掉角色和边界 |
| Tool Schema | 是 | 以为工具名称很短，忽略完整参数描述 |
| 当前问题 | 是 | 只测输入框，不测服务端补充字段 |
| 预留输出 | 不属于输入计数，但必须扣除 | \`max_output_tokens\` 没有预算位置 |

## 五、最小 Token 计数契约

生产计数器至少接受模型标识、消息列表、工具定义和序列化版本，并返回逐部分计数，而不是只返回一个总数。这样超限时才能解释到底是历史、证据还是工具 Schema 占满了窗口。

\`\`\`python runnable file=token_counter_contract.py
from dataclasses import dataclass


@dataclass(frozen=True)
class TokenCount:
    """保存一次输入计数的模型和分项证据。"""

    model: str
    tokenizer_version: str
    parts: dict[str, int]

    @property
    def total(self) -> int:
        """返回各输入部分的 Token 总数。"""
        return sum(self.parts.values())


def assert_count_is_reproducible(first: TokenCount, second: TokenCount) -> None:
    """拒绝模型、Tokenizer 或分项计数发生漂移的结果。"""
    if first.model != second.model:
        raise ValueError('model changed')
    if first.tokenizer_version != second.tokenizer_version:
        raise ValueError('tokenizer changed')
    if first.parts != second.parts:
        raise ValueError('token count changed')


baseline = TokenCount('model-under-test', 'tokenizer-v1', {'system': 120, 'history': 80, 'question': 20})
replayed = TokenCount('model-under-test', 'tokenizer-v1', {'system': 120, 'history': 80, 'question': 20})
assert_count_is_reproducible(baseline, replayed)
print({'total_tokens': baseline.total, 'status': 'reproducible'})
\`\`\`

运行这段代码只能证明计数记录可重复，不能证明它和供应商实际模板完全相同。上线前还要把 API 返回的 usage 字段与本地分项计数按模型版本对比，持续记录误差分布。

## 六、Token 计数的边界样本

回归集至少包含：中英文混排、连续空格、换行缩进、Emoji、组合字符、全角半角标点、长 URL、JSON、代码、工具 Schema 和空消息。每类样本都保存原文、规范化前后文本、Token ID、Token 数和 Tokenizer 版本。

不要只测试平均文本。最长的 System 规则、最大工具 Schema 和最大历史消息往往决定生产是否超限；边界样本应该来自真实流量分位数，而不是人工写的一句短问题。

## 七、故障定位：计数不准时先找哪一步

| 现象 | 首个检查点 | 修复动作 |
| --- | --- | --- |
| 切换模型后突然超限 | 模型与 Tokenizer 是否成对发布 | 重新计数并绑定版本 |
| 本地计数比 API usage 小很多 | 消息模板或工具 Schema 未纳入 | 采用消息级计数并校准误差 |
| 同一文本每次计数不同 | 隐式追加字段或非确定性规范化 | 固定序列化版本并记录输入摘要 |
| 中文或 Emoji 误差明显 | 使用字符数估算 | 对目标 Tokenizer 做分布回归 |
| 只在工具调用时超限 | Schema 以外还有调用边界 Token | 计算完整工具定义和调用参数 |

定位时保留首个偏差，不要只记录服务端最后的“context length exceeded”。最后错误说明请求失败，不能说明是哪一段输入增长造成失败。

### 7.1 用差分样本确认计数变化来源

排查计数漂移时，先复制一份能够稳定通过的消息列表，只增加一个变量：一个换行、一个工具字段、一个 Emoji 或一段历史。比较变更前后的 Token ID，而不是只比较总数。这样可以区分“文本本身变长”和“消息模板额外注入边界”两种原因。

差分记录至少包含：变更字段、规范化前文本、规范化后文本、旧 Token ID、新 Token ID、计数差值和目标模型版本。若差值无法解释，先暂停上线，不要用一个更大的安全余量掩盖计数契约漂移。

| 差分变量 | 应验证的事实 | 证据 |
| --- | --- | --- |
| 只增加空格 | 预分词是否把空格并入相邻片段 | Token ID 差分 |
| 只增加换行 | 代码模板是否保留换行 | 序列化消息与计数 |
| 只增加工具参数 | Schema 是否完整进入请求 | 请求快照与 usage |
| 只替换 Emoji | Unicode 规范化是否一致 | 原始码点与 Token ID |
| 只切换模型 | 词表和模板是否重新绑定 | 版本映射表 |

差分实验的通过标准不是“总数看起来合理”，而是每一个变化都能在 Token ID、消息快照或供应商 usage 中找到对应证据。若只能看到总数变化，却无法解释新增 Token 来自哪一个字段，应把该情况登记为计数契约风险。

这份记录还应由模型发布流程消费：模型、Tokenizer、消息模板和计数器版本必须作为同一个发布单元进入变更评审。任何一个版本单独变化，都应自动触发 Token 边界样本回归。

审查结果还要进入发布单，而不是停留在本地终端；只有版本、样本和计数证据同时归档，后续才能解释容量变化。

## 八、落地步骤与验收

1. 为每个模型登记 Tokenizer、消息模板和特殊 Token 版本。
2. 在装配请求前输出 System、历史、工具、问题的分项 Token 数。
3. 用真实 API usage 校准本地计数误差，并设置误差告警。
4. 将边界样本纳入发布回归，模型或 SDK 升级时强制重跑。
5. 超限记录输入摘要、分项计数、版本和裁剪原因，禁止静默截断。

验收必须同时满足：目标模型计数可重放；分项总数与序列化输入一致；特殊 Token、工具和附件不被遗漏；超限发生在模型调用前；失败样本能回到首个计数偏差。

## 九、总结

Token 是模型输入契约的基本单位，Tokenizer 决定文本如何被切分，Token ID 只是词表索引。任何上下文预算、成本估算和延迟分析，都必须绑定目标模型的 Tokenizer 与消息模板，而不是依赖字符数或经验换算。

## 参考资料

- [Neural Machine Translation of Rare Words with Subword Units](https://aclanthology.org/P16-1162/)
- [SentencePiece: A simple and language independent subword tokenizer](https://aclanthology.org/D18-2012/)
- [Hugging Face Tokenizers](https://huggingface.co/docs/transformers/main/en/tokenizer_summary)
`
  },
  {
    fileName: '02-上下文窗口与长上下文.md',
    title: '# 大模型基础（02） - 上下文窗口与长上下文：预算、裁剪和位置偏差',
    objective: '把上下文窗口从一个容量数字变成可解释的预算、装配和位置评测。',
    outcomes: [
      '根据上下文上限、预留输出和安全余量生成分项预算表，并用超限样本证明调用前会停止。',
      '按权限、硬约束、当前问题、证据和历史的优先级装配上下文，保存裁剪对象、来源 ID 和原因。',
      '固定同一事实只改变证据位置和干扰强度，输出长上下文位置评测的正确率、引用命中率和 TTFT 证据。'
    ],
    sourceHeadings: ['三、上下文窗口要怎么做预算？', '四、超过预算时应该删什么？', '九、窗口装得下，为什么仍会漏掉证据？'],
    body: `## 一、先建立主线：容量、装配、有效利用

上下文窗口是一次推理可处理的总 Token 容量，不是“用户 Prompt 能写多少字”。System 规则、历史消息、检索证据、工具 Schema、当前问题和预留输出共同竞争这块容量。

本文按三个问题推进：窗口到底怎样预算；超过预算时哪些内容可压缩；即使装得下，为什么证据仍可能被忽略。Token 计数方法见上一篇；自回归生成和采样参数见下一篇。

## 二、窗口预算的公式与分层

最小预算关系是：

\`\`\`text
输入预算 = 上下文上限 - 预留输出 - 安全余量
\`\`\`

输入预算中的内容通常是 \`System + 历史 + 检索证据 + Tool Schema + 当前问题 + 模板开销\`。安全余量不能拍脑袋，应使用本地计数与 API usage 的差值分布校准。

| 层级 | 处理原则 | 失败后果 |
| --- | --- | --- |
| 权限与安全规则 | 固定保留 | 低权限文本覆盖系统边界 |
| 当前任务硬约束 | 原文或结构化保存 | 金额、时间和输出格式被摘要改写 |
| 检索证据 | ACL、去重、排序后装配 | 引用错位或证据缺失 |
| 旧历史 | 提取事实和未完成状态 | 对话连续性被破坏 |
| 输出预算 | 提前预留 | JSON 或工具参数被截断 |

## 三、上下文装配不是从最旧消息开始删除

先给不可丢内容分配预算，再给当前问题和任务相关证据分配预算，最后才处理可压缩历史。删除一条旧消息前，要判断它是否保存用户确认的业务约束；压缩一段历史时，要把事实、推断和未完成动作分开。

检索 Top-K 只是候选数量。生产链路还要做权限过滤、重复检测、Rerank、单来源上限、语义边界裁剪和来源 ID 保留。

## 四、超限裁剪的可追溯实现

\`\`\`python runnable file=context_budget.py
CONTEXT_LIMIT = 8192
RESERVED_OUTPUT = 1200
SAFETY_MARGIN = 256


def calculate_input_budget(limit: int, output: int, margin: int) -> int:
    """返回扣除输出和安全余量后的输入预算。"""
    budget = limit - output - margin
    if budget <= 0:
        raise ValueError('reserved output leaves no input budget')
    return budget


def choose_evidence(parts: list[dict[str, int | str]], budget: int) -> list[dict[str, int | str]]:
    """按相关性顺序装配完整证据段，不切断已选段落。"""
    selected = []
    used = 0
    for part in parts:
        token_count = int(part['tokens'])
        if used + token_count > budget:
            continue
        selected.append(part)
        used += token_count
    return selected


input_budget = calculate_input_budget(CONTEXT_LIMIT, RESERVED_OUTPUT, SAFETY_MARGIN)
evidence = choose_evidence([{'id': 'doc-a', 'tokens': 800}, {'id': 'doc-b', 'tokens': 1200}], input_budget)
print({'input_budget': input_budget, 'selected_ids': [item['id'] for item in evidence]})
\`\`\`

示例只负责证明“调用前预算和裁剪决策可审计”，不负责模拟具体供应商 Tokenizer。生产实现还要把 System、历史、工具和问题计数加入同一预算，并记录被跳过的证据及原因。

## 五、摘要与裁剪的安全边界

摘要不是无损压缩。每次摘要至少保存压缩前后 Token 数、消息范围、摘要器版本、原文引用 ID 和回归结果。对于权限、金额、时间、身份和未完成动作，应保留结构化字段，不要让摘要器自由改写。

证据裁剪按段落、表格行或句子边界完成；直接按字符切字符串容易截断表头、结论和引用位置。裁剪策略还应限制同一来源占比，避免单一文档垄断全部窗口。

## 六、容量够用不代表有效利用

长上下文模型允许更大的输入，但不保证各位置的信息被同等稳定地使用。证据位于中部时，模型可能比证据位于开头或结尾更容易漏答，这种位置偏差通常称为 Lost in the Middle。

位置评测必须固定问题、正确事实、模型参数和证据内容，只改变证据位置与干扰强度。不能只把证据放在开头就宣布长上下文可用。

| 维度 | 变量 | 指标 |
| --- | --- | --- |
| 证据位置 | 开头、中部、结尾 | 正确率、引用命中率 |
| 上下文长度 | 2K、8K、32K 分桶 | TTFT、成本、召回 |
| 干扰强度 | 无关、同主题、冲突文本 | 误引率、拒答率 |
| 多证据组合 | 单证据、跨段、冲突证据 | 完整率、冲突处理 |

## 七、上下文 Trace 应记录什么

每次请求至少记录模型、Tokenizer、Prompt 版本，System、历史、工具、证据、问题的分项 Token，裁剪动作、证据位置、排队时间、TTFT、输出 Token 和结束原因。正文和日志应脱敏，证据 ID 仍要能回链到版本化数据集。

## 八、故障定位与发布步骤

| 现象 | 首个偏差 | 处理 |
| --- | --- | --- |
| Prompt 没超限却返回截断 | 忽略输出预算或模板开销 | 提前扣除输出并校准模板 |
| 摘要后答案改变 | 硬约束被自然语言改写 | 结构化保存约束并保留原文引用 |
| 中部证据漏答 | 位置利用不稳定 | 缩短上下文、Rerank、位置回归 |
| 证据跨租户泄露 | ACL 在裁剪后才检查 | 装配前完成权限过滤 |

落地顺序：固定预算契约；实现分项计数；按优先级装配；记录裁剪；建立位置分桶回归；上线后监控超限率、证据引用率、TTFT 和成本。

## 九、验收清单

- [ ] 输入预算同时扣除预留输出和安全余量。
- [ ] System、硬约束、工具、历史和证据有明确优先级。
- [ ] 超限发生在模型调用前，并记录删减对象与原因。
- [ ] 摘要不会把推断写成用户确认事实。
- [ ] 证据裁剪保留段落边界、来源 ID 和租户权限。
- [ ] 长上下文回归覆盖开头、中部、结尾和干扰文本。
- [ ] Trace 能定位预算、裁剪、位置和延迟的首个偏差。

## 十、总结

上下文窗口是输入、输出和安全余量共同约束的预算，不是一个可以无限填满的 Prompt 容器。高质量装配需要先保护权限和硬约束，再压缩可恢复历史、去重证据并预留输出；长上下文还必须通过位置和干扰评测证明“装得下”之外的有效利用。

## 参考资料

- [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172)
- [Hugging Face LLM Course](https://huggingface.co/learn/llm-course/chapter1/1)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
`
  },
  {
    fileName: '03-自回归生成与采样延迟.md',
    title: '# 大模型基础（03） - 自回归生成与采样延迟：从 Logit 到首 Token',
    objective: '理解逐 Token 生成、采样参数、停止条件、Prefill、Decode 与 KV Cache 对延迟的影响。',
    outcomes: [
      '用固定 Logit 序列运行 temperature、top-p 和 stop 实验，记录采样参数、生成 Token 和结束原因。',
      '将一次请求拆成排队、Prefill、Decode、解析和副作用 Span，用 TTFT、TPOT 和输出 Token 定位首个延迟偏差。',
      '构造长度耗尽、客户端取消和 KV Cache 显存压力样本，验证半成品不会被当作正常结果提交。'
    ],
    sourceHeadings: ['五、模型为什么只能逐 Token 生成？', '六、temperature 与 top-p 怎么选？', '七、停止条件为什么必须由应用设计？', '八、Prefill 与 Decode 分别影响什么延迟？'],
    body: `## 一、先建立主线：模型怎样一步步生成答案

Decoder-only 模型接收已有 Token 序列，为词表中的每个候选计算 Logit，应用采样规则选出一个 Token，再把它追加回序列。下一个 Token 必须看到前一个 Token，所以生成阶段天然是串行循环。

本文只沿“Logit → 概率 → 选择 → 追加 → 停止”展开，再解释完整输入的 Prefill、逐 Token Decode 和 KV Cache 如何影响 TTFT 与输出速度。Tokenizer 和上下文预算分别由前两篇负责。

## 二、自回归循环与因果可见性

模型不能在生成第 5 个 Token 时偷看第 6 个 Token。因果 Mask 让每个位置只能访问自己及之前的表示；训练时可以并行计算所有位置，推理时新 Token 仍要依赖上一轮结果。

\`\`\`mermaid
flowchart LR
  A[已有 Token] --> B[输出 Logits]
  B --> C[temperature]
  C --> D[top-p 候选集]
  D --> E[选择一个 Token]
  E --> F[追加到序列]
  F --> G{停止条件}
  G -- 否 --> A
  G -- 是 --> H[结果与结束原因]
\`\`\`

## 三、Logit、Softmax 与 temperature

Logit 是模型对候选 Token 的未归一化分数。Softmax 把分数转换为概率；temperature 小于 1 会让分布更尖，temperature 增大会让低分候选获得更高机会。它只改变既有候选的选择分布，不会补充缺失事实。

temperature、top-p 不应同时大幅变化。对 JSON 抽取、分类和工具参数，优先固定低随机性并验证 Schema；创意任务才通过固定数据集评估多样性收益。

## 四、top-p 与停止条件

top-p 从高到低累加概率，只保留达到阈值的最小候选集合，再在集合中采样。\`stop\` 序列、结束 Token、输出上限、内容过滤、客户端取消和服务端超时都可能结束生成，应用必须区分正常结束与异常终止。

结构化输出的验收顺序是：先检查结束原因，再解析 JSON 或 Tool Call，随后验证 Schema、枚举、范围、权限和副作用。长度耗尽生成的半个 JSON 不能直接交给执行器。

## 五、Prefill、Decode 与 KV Cache

Prefill 一次处理完整输入，输入 Token 越多，首 Token 前的计算通常越重；TTFT 反映用户多久看到第一个结果。Decode 每轮生成一个 Token，输出长度和单 Token 时间共同决定总延迟。

在 Decode 过程中，历史 Token 的 Key/Value 可以缓存，下一轮只计算新 Token 的表示并复用历史 KV，这就是 KV Cache。它减少重复计算，但会占用显存；并发、上下文长度和输出长度都会扩大缓存需求。KV Cache 不是业务层答案缓存，也不是可以无限增长的磁盘缓存。

| 阶段 | 主要输入 | 主要指标 | 常见优化 |
| --- | --- | --- | --- |
| 排队 | 请求到达率与并发 | queue wait | 限流、优先级、过载拒绝 |
| Prefill | 完整输入 Token | TTFT | 缩短上下文、前缀复用、批处理 |
| Decode | 每轮新 Token | TPOT、tokens/s | KV Cache、连续批处理、量化 |
| 收尾 | 解析与副作用 | 完成延迟 | 流式解析、取消传播、Schema 校验 |

## 六、可运行的采样与停止模拟

\`\`\`python runnable file=decode_simulator.py
from dataclasses import dataclass
import math
import random


@dataclass(frozen=True)
class DecodeResult:
    """保存模拟生成的 Token、结束原因和轮数。"""

    tokens: list[str]
    finish_reason: str


def softmax(logits: list[float], temperature: float) -> list[float]:
    """按 temperature 把 Logit 转换成概率。"""
    if temperature <= 0:
        raise ValueError('temperature must be positive')
    scaled = [value / temperature for value in logits]
    maximum = max(scaled)
    exponentials = [math.exp(value - maximum) for value in scaled]
    total = sum(exponentials)
    return [value / total for value in exponentials]


def decode(max_tokens: int, stop_token: str, temperature: float) -> DecodeResult:
    """使用固定 Logit 序列验证正常停止与长度耗尽。"""
    vocabulary = ['A', 'B', stop_token]
    generated = []
    random.seed(7)
    for _ in range(max_tokens):
        probabilities = softmax([1.4, 0.7, 0.2], temperature)
        token = random.choices(vocabulary, weights=probabilities, k=1)[0]
        generated.append(token)
        if token == stop_token:
            return DecodeResult(generated, 'stop')
    return DecodeResult(generated, 'length')


print(decode(max_tokens=6, stop_token='<END>', temperature=0.2))
\`\`\`

实验验收不能只看“打印出一段文本”。应分别构造命中 stop、达到长度上限、客户端取消和非法结构化输出的样本，并检查结束原因、已生成 Token、取消状态和副作用是否一致。

## 七、延迟排障：不要只看总耗时

| 现象 | 首个偏差 | 处理 |
| --- | --- | --- |
| 首 Token 慢，后续正常 | 输入过长或排队 | 拆分 queue wait 与 Prefill，压缩上下文 |
| 首 Token 正常，完整回答慢 | Decode 轮数或 TPOT 偏高 | 限制输出、优化 KV Cache 和批处理 |
| 并发升高后显存爆满 | KV Cache 按请求增长 | 设置最大上下文、并发和缓存回收 |
| JSON 偶尔半截 | 结束原因为 length 或 cancel | 检查结束原因后再解析和重试 |
| 调低 temperature 仍有事实错 | 缺证据而非随机性 | 回到 Token/上下文文章检查输入 |

Trace 至少保留模型、输入 Token、输出 Token、排队时间、Prefill 时间、TTFT、TPOT、结束原因、KV Cache 命中或回收状态和取消时间点。

## 八、落地步骤与验收

1. 固定模型、Tokenizer、采样参数、输出上限和停止协议。
2. 把排队、Prefill、Decode、解析和副作用拆成独立 Span。
3. 对结构化任务先验证结束原因与 Schema，再允许执行 Tool Call。
4. 按输入长度、输出长度和并发分桶测量 TTFT、TPOT、P95/P99。
5. 逐项引入 KV Cache、连续批处理或量化，并用质量集回归。
6. 取消、超时和长度耗尽都要保存原始输出，不能冒充正常成功。

验收条件：正常结束与异常结束可区分；采样变化可被固定数据集解释；Prefill 和 Decode 的瓶颈可定位；KV Cache 显存不会随失败请求无限增长；原始失败样本可重放。

## 九、总结

自回归生成把完整回答拆成一轮轮“预测下一个 Token”的循环。temperature 和 top-p 只控制候选选择，停止条件决定协议是否完整；Prefill 决定首 Token，Decode 决定后续速度，KV Cache 用显存换取重复计算的减少。生产指标必须把这些阶段拆开观察。

## 参考资料

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [The Curious Case of Neural Text Degeneration](https://arxiv.org/abs/1904.09751)
- [vLLM Documentation](https://docs.vllm.ai/)
`
  }
]

/** 移除旧脚本自动生成的通用工作块，避免拆分文章继承错误主线。 */
function stripGeneratedBlocks(markdown) {
  /** 文章中自动生成的工作块起止标记。 */
  return markdown.replace(/<!-- article-progressive-block:start -->[\s\S]*?<!-- article-progressive-block:end -->\s*/g, '')
}

/** 取出原文章中指定一级章节的正文，保留经过人工审查的事实和代码。 */
function extractSections(markdown, headings) {
  /** 去掉旧的通用开场，防止标题主题再次混入新文章。 */
  const source = stripGeneratedBlocks(markdown)
  /** 一级章节的起始位置。 */
  const matches = [...source.matchAll(/^#\s+(.+)$/gm)]
  /** 每个章节标题到下一章节标题之间的原文。 */
  return headings.map((heading) => {
    const matchIndex = matches.findIndex((match) => match[1].trim() === heading)
    if (matchIndex < 0) throw new Error(`缺少原文章节：${heading}`)
    const start = matches[matchIndex].index
    const end = matches[matchIndex + 1]?.index ?? source.length
    return source.slice(start, end).trim()
  }).join('\n\n')
}

/** 把原章节标题改成当前拆分文章中的局部编号。 */
function renumberSourceHeadings(markdown) {
  /** 原章节的中文序号不再代表新文章的全局序号。 */
  return markdown.replace(/^#\s+(.+)$/gm, '## $1')
}

/** 用主题化的结构、原文事实和专属验收生成一篇拆分文章。 */
function buildArticle(article, sourceMarkdown) {
  /** 当前拆分文章保留的原文章节。 */
  const sourceSections = renumberSourceHeadings(extractSections(sourceMarkdown, article.sourceHeadings))
  /** 目标主题的学习目标和正文。 */
  return [article.title, '', `> ${article.objective}`, '', '> 读完后，你应能：', ...article.outcomes.map((outcome) => `> - ${outcome}`), '', article.body.trim(), '', '## 十、来自原稿的详细推导', '', sourceSections, '', '## 十一、发布前的证据记录', '', '| 证据 | 记录内容 | 不满足时的动作 |', '| --- | --- | --- |', '| 输入版本 | 模型、Tokenizer、Prompt 或样本版本 | 固定版本并重新运行 |', '| 中间状态 | 计数、装配、生成阶段或解析状态 | 补齐 Trace 后再判断 |', '| 失败现场 | 原始输入、输出、结束原因和首个偏差 | 禁止只保留成功截图 |', '| 回归结果 | 正常、边界、失败、恢复四类样本 | 逐类记录通过条件 |', '', '这篇文章的“通过”只表示当前版本、当前样本和当前环境满足预先写下的条件。一次成功运行不能推出生产可用；必须复测原始失败样本，并确认未引入权限、质量、延迟或成本回退。', '', '## 十二、参考资料', '', '- [Hugging Face LLM Course](https://huggingface.co/learn/llm-course/chapter1/1)', '- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)', ''].join('\n')
}

/** 计算目录内当前文件的最大数字前缀。 */
function getMaximumSequence() {
  /** 目录中所有正式文章的数字前缀。 */
  const sequences = fs.readdirSync(AI_FOUNDATION_ROOT)
    .filter((fileName) => /\.mdx?$/.test(fileName))
    .map((fileName) => Number.parseInt(fileName.match(/^(\d+)-/)?.[1] || '', 10))
    .filter(Number.isInteger)
  return Math.max(...sequences)
}

/** 将原有第 02 篇及之后的文章整体后移，为新增的两篇文章腾出连续课号。 */
function shiftExistingArticles() {
  /** 当前目录中需要后移的文章，按数字从大到小处理避免覆盖。 */
  const files = fs.readdirSync(AI_FOUNDATION_ROOT)
    .filter((fileName) => /\.mdx?$/.test(fileName))
    .map((fileName) => ({ fileName, sequence: Number.parseInt(fileName.match(/^(\d+)-/)?.[1] || '', 10) }))
    .filter((entry) => entry.sequence >= 2)
    .sort((left, right) => right.sequence - left.sequence)
  files.forEach(({ fileName, sequence }) => {
    /** 先用临时后缀保存，避免目标文件已经存在。 */
    const temporaryName = `.__split_${String(sequence).padStart(2, '0')}__${fileName}`
    fs.renameSync(path.join(AI_FOUNDATION_ROOT, fileName), path.join(AI_FOUNDATION_ROOT, temporaryName))
  })
  fs.readdirSync(AI_FOUNDATION_ROOT).filter((fileName) => fileName.startsWith('.__split_')).forEach((temporaryName) => {
    /** 临时文件中的旧数字课号。 */
    const oldSequence = Number.parseInt(temporaryName.match(/__split_(\d+)__/u)?.[1] || '', 10)
    /** 去掉临时前缀后保留原主题文件名。 */
    const originalName = temporaryName.replace(/^\.__split_\d+__/, '')
    /** 新文件名将旧文章顺延两篇。 */
    const newName = `${String(oldSequence + 2).padStart(2, '0')}-${originalName.replace(/^\d+-/, '')}`
    const oldPath = path.join(AI_FOUNDATION_ROOT, temporaryName)
    const newPath = path.join(AI_FOUNDATION_ROOT, newName)
    let markdown = fs.readFileSync(oldPath, 'utf8')
    markdown = markdown.replace(/^#\s+大模型基础（\d+）/m, `# 大模型基础（${String(oldSequence + 2).padStart(2, '0')}）`)
    fs.writeFileSync(newPath, markdown)
    fs.unlinkSync(oldPath)
  })
}

/** 更新引用第一篇 AI 基础文章的课程入口与迁移记录。 */
function updateCourseReferences() {
  /** 课程入口文件仍指向拆分后的第一篇 Token 文章。 */
  const knowledgeFile = path.join(process.cwd(), 'src', 'lib', 'knowledge.ts')
  const knowledgeMarkdown = fs.readFileSync(knowledgeFile, 'utf8').replaceAll('01-Token、上下文窗口与生成机制', '01-Token与Tokenizer')
  fs.writeFileSync(knowledgeFile, knowledgeMarkdown)
  /** 旧路径映射继续指向第一篇，确保历史 URL 不丢失。 */
  const migrationFile = path.join(process.cwd(), 'src', 'content', 'knowledge-path-migrations.json')
  const migrations = JSON.parse(fs.readFileSync(migrationFile, 'utf8'))
  migrations['03-AI大模型应用开发/01-大模型基础/01-Token、上下文窗口与生成机制'] = '03-AI大模型应用开发/01-大模型基础/01-Token与Tokenizer'
  fs.writeFileSync(migrationFile, `${JSON.stringify(migrations, null, 2)}\n`)
}

/** 执行一次幂等的文章拆分和目录同步。 */
function main() {
  /** 已完成拆分时直接校验，不重复后移目录。 */
  if (fs.existsSync(path.join(AI_FOUNDATION_ROOT, '01-Token与Tokenizer.md'))) {
    console.log('主题文章已经拆分，跳过重复迁移。')
    return
  }
  /** 源稿在重命名之前读取，避免后续文件顺延影响章节抽取。 */
  const sourceMarkdown = fs.readFileSync(SOURCE_FILE, 'utf8')
  shiftExistingArticles()
  SPLIT_ARTICLES.forEach((article) => fs.writeFileSync(path.join(AI_FOUNDATION_ROOT, article.fileName), buildArticle(article, sourceMarkdown)))
  updateCourseReferences()
  console.log(`已拆分 ${SPLIT_ARTICLES.length} 篇主题文章，当前最大课号 ${getMaximumSequence()}。`)
}

main()
