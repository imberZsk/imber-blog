# 大模型基础（01） - Token 与 Tokenizer：文本如何变成模型输入

> 从原始文本到 Token ID，建立可计数、可回归、可解释的输入契约。

> 读完后，你应能：
> - 用目标模型的 Tokenizer 统计 System、历史、工具和问题的分项 Token，输出模型、模板和 Tokenizer 版本记录作为证据。
> - 设计中英文、代码、Emoji 和工具 Schema 的差分样本，解释每次 Token 数变化对应的字段和 Token ID。
> - 在模型或消息模板升级前验证边界回归，发现本地计数与 API usage 漂移时输出原始请求快照和差异报告。

## 一、先建立主线：本文只解决“文本怎样进入模型”

一次模型调用的第一步不是发送字符串，而是把字符串交给目标模型对应的 Tokenizer。Tokenizer 根据词表和规则切分文本，再把每个片段映射成 Token ID；模型后续看到的是 ID 序列，不是字符本身。

本文的主线只有四步：确定目标模型，使用同一消息模板计数，识别特殊 Token 和 Unicode 边界，把计数结果接入预算与回归。上下文窗口和采样策略属于后续文章，本文只说明它们为什么必须使用 Token 作为共同单位。

| 输入 | Tokenizer 的产物 | 工程意义 |
| --- | --- | --- |
| 中文、英文、代码和标点 | Token 序列 | 不能用字符数代替容量 |
| Token 序列 | 整数 ID 序列 | ID 只是词表索引，不代表语义距离 |
| 消息与工具模板 | 特殊 Token 与边界标记 | 可见正文不是完整计费输入 |
| 计数结果 | 预算记录 | 允许在请求前阻止超限 |

## 二、Token 不是字符，也不等于单词

同一个汉字不保证对应一个 Token，同一个英文单词也可能被拆成词根、后缀或字节片段。空格、换行、大小写、代码缩进和 Unicode 规范化都会改变结果。生产系统不能用 `string.length`、固定“一个中文字符一个 Token”或另一模型的分词结果做硬预算。

Tokenizer 的结果还会受到特殊 Token、消息角色、工具 Schema、图片描述和供应商序列化模板影响。只复制用户可见文本进行粗估，通常会低估真实输入。

## 三、BPE、WordPiece 与 SentencePiece 的共同问题

如果词表只保存完整单词，未登录词会让词表无限增长；如果只保存字符或字节，序列会过长。子词算法在词表大小与序列长度之间做折中。BPE 反复合并高频相邻片段，WordPiece 依据似然相关评分构建子词，SentencePiece 通常直接在原始字符串上处理空格和 Unicode。

应用开发不必重新训练 Tokenizer，但必须记录以下契约：词表版本、规范化规则、预分词策略、特殊 Token、消息模板和回退策略。模型名称变化、供应商升级或聊天模板变化，都必须重新计数并回归。

## 四、特殊 Token 和消息模板为什么容易漏算

聊天协议可能把 `system`、`user`、`assistant`、工具调用和结束标记序列化为模型不可见的边界。工具 Schema 还可能比用户问题更长。多模态输入会把附件元数据、图片块或音频块映射成额外的模型输入。

| 内容 | 是否计数 | 典型漏算原因 |
| --- | --- | --- |
| System 规则 | 是 | 中间件重复追加或隐藏默认提示 |
| 历史消息 | 是 | 只计算正文，漏掉角色和边界 |
| Tool Schema | 是 | 以为工具名称很短，忽略完整参数描述 |
| 用户问题 | 是 | 只测输入框，不测服务端补充字段 |
| 预留输出 | 不属于输入计数，但必须扣除 | `max_output_tokens` 没有预算位置 |

## 五、最小 Token 计数契约

生产计数器至少接受模型标识、消息列表、工具定义和序列化版本，并返回逐部分计数，而不是只返回一个总数。这样超限时才能解释到底是历史、证据还是工具 Schema 占满了窗口。

```python runnable file=token_counter_contract.py
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
```

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

## 十、来自原稿的详细推导

## Token 是什么：Tokenizer 如何把文本变成 Token ID？

## 2.1 Token 不是字符，也不等于单词

模型接收的是 Token ID 序列。Tokenizer 先按自己的词表和切分规则把文本拆成 Token，再把每个 Token 映射为整数 ID。

同一个汉字不保证对应一个 Token，同一个英文单词也可能被拆成词根、后缀或字节片段。空格、标点、大小写、代码缩进和 Unicode 形式都可能改变结果。

因此，下面这些估算方式都不能作为生产预算：

- 用 JavaScript 的 `string.length` 当 Token 数。
- 假设一个中文字符固定等于一个 Token。
- 用模型 A 的 Tokenizer 估算模型 B。
- 只计算用户问题，漏掉 System、历史消息、工具定义和检索证据。

正确做法是使用目标模型或供应商明确指定的 Tokenizer，并让计数逻辑和实际请求序列化方式保持一致。

## 2.2 BPE 与 WordPiece 在解决什么问题？

如果词表只保存完整单词，未登录词会无限增长；如果只保存单字符或字节，序列又会过长。子词算法在词表大小与序列长度之间做平衡。

BPE（Byte Pair Encoding）从小单元出发，反复合并高频相邻片段。WordPiece 也构建子词词表，但选择合并时通常考虑语言模型似然或相关评分。不同实现的预分词、规范化、特殊 Token 和字节回退策略也会影响最终结果。

应用开发通常不需要自己训练 Tokenizer，但必须知道两个边界：

1. Tokenizer 属于模型契约，切换模型时必须重新计数和回归。
2. Token ID 只是词表索引，数字大小不表示语义远近。

## 2.3 特殊 Token 也占容量

聊天接口常在用户看不到的地方加入消息边界、角色或结束标记。工具 Schema、图片描述和结构化输出约束也可能进入模型输入。

所以“把可见文本粘到在线 Tokenizer”只能做粗查。生产计数应尽量使用 SDK 提供的消息级计数方法；若供应商不公开完整模板，则必须预留安全余量，并用真实 API 返回的用量字段校准估算误差。

| 输入部分 | 是否必须计数 | 常见遗漏 |
|---|---:|---|
| System 规则 | 是 | 多个中间件重复追加规则 |
| 历史消息 | 是 | 只算正文，漏掉角色和边界标记 |
| 检索证据 | 是 | 去重前计数与发送内容不一致 |
| Tool Schema | 是 | 工具多时 Schema 本身很大 |
| 当前问题 | 是 | 多模态附件还可能产生额外用量 |
| 预留输出 | 不属于输入，但必须占预算 | `max_output_tokens` 设置后没有剩余窗口 |

## 十一、发布前的证据记录

| 证据 | 记录内容 | 不满足时的动作 |
| --- | --- | --- |
| 输入版本 | 模型、Tokenizer、Prompt 或样本版本 | 固定版本并重新运行 |
| 中间状态 | 计数、装配、生成阶段或解析状态 | 补齐 Trace 后再判断 |
| 失败现场 | 原始输入、输出、结束原因和首个偏差 | 禁止只保留成功截图 |
| 回归结果 | 正常、边界、失败、恢复四类样本 | 逐类记录通过条件 |

这篇文章的“通过”只表示当前版本、当前样本和当前环境满足预先写下的条件。一次成功运行不能推出生产可用；必须复测原始失败样本，并确认未引入权限、质量、延迟或成本回退。

## 十二、参考资料

- [Hugging Face LLM Course](https://huggingface.co/learn/llm-course/chapter1/1)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
