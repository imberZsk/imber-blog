# LangChain（09） - Runnable：把写逻辑变成组装 chain

## TypeScript 实现地图

TypeScript 使用 `@langchain/core/runnables` 的 `RunnableLambda`、`RunnableSequence`、`RunnableParallel`，以 `invoke()`、`batch()`、`stream()` 复用同一条链。

```typescript runnable file=main.ts title="TypeScript 本篇最小实验" description="运行本篇 TypeScript 核心数据流。"
const steps = [(value: number) => value + 2, (value: number) => value * 3]
console.log(steps.reduce((value, step) => step(value), 4))
```



> 读完后，你应能：
> - 给定“规范化问题、检索证据、生成答案”三段胶水代码，能将它们改成有稳定输入输出的 Runnable chain，并用 Trace 证明步骤顺序与结果没有改变。
> - 给定一个字典状态，能画出每个 Runnable 的字段契约，并用缺少 `question` 或 `documents` 的失败输出验证错误发生在正确边界。
> - 给定“同时计算检索证据与问题特征”的需求，能用并行映射和分支组装数据流，并用命中、未命中两组输出验收路由结果。
> - 给定多个输入或需要边生成边展示的场景，能在 `invoke`、`batch` 和 `stream` 之间做选择，并用输出数量、顺序和分块日志验证调用方式。

# 一、Runnable 是什么：它如何替代不断增长的胶水代码？

Runnable 是 LangChain 组件共用的执行协议。一个 Runnable 接收明确输入、产生明确输出，并统一暴露 `invoke`、`batch`、`stream` 等执行方式；chain 则把前一个 Runnable 的输出交给后一个 Runnable。

假设要完成一个最小知识问答流程：

1. 清理用户问题中多余的空格。
2. 根据问题检索证据。
3. 把证据和问题组装成 Prompt。
4. 调用模型。
5. 把模型输出解析成页面需要的结构。

直接写函数并没有错。问题出现在“连接”的地方：

- 上一步返回字符串，下一步却以为是字典。
- 为了打日志，每个函数外面都要再包一层。
- 想把检索器换成测试替身时，主流程也要改。
- 想批量运行或流式输出时，又要写一套调度逻辑。

Runnable 解决的就是这个连接问题。

它不是新的业务算法，而是给每个步骤套上相同的插头：都能 `invoke`，都可以组合，都能接收运行配置。

## 1.1 第一个实验：函数调用和 chain 的差别在哪里？

下面用确定性的假检索器和假模型对比两种写法。

这段代码不需要 API Key，因为它只验证组装方式，不验证模型连接。


## 1.2 运行后要看什么？

成功输出应证明三件事：

1. 胶水代码和 chain 返回完全相同的状态。
2. Trace 按 `normalize -> retrieve -> answer` 的顺序出现。
3. 每个步骤都能看到输入字段和新增字段。

这里的收益不是代码变短。

实际上，包装 `Runnable` 后行数可能更多。真正的收益是调用协议统一，之后才能统一地加批处理、流式、配置和 Trace。

# 二、写 chain 前先把数据形状定清楚

LCEL（LangChain Expression Language）的 `a | b | c` 看起来像把函数串起来。

但是“能串”不等于“串对了”。

链路是否正确，取决于每个边界的数据形状：

| 步骤 | 必需输入 | 新增输出 | 失败信号 |
| --- | --- | --- | --- |
| Normalize | `question: str` | 规范化后的 `question` | 空字符串或类型错误 |
| Retriever | `question: str` | `documents: list[str]` | 字段缺失或检索器异常 |
| Prompt | `question` + `documents` | `prompt: str` | 证据类型不对 |
| Model | `prompt: str` | 模型消息 | 认证、超时、限流 |
| Parser | 模型消息 | 业务结构 | 格式不符合契约 |

先写这张表，再写 `|`。

否则 LCEL 只是把数据错误藏在更短的语法里。

## 2.1 第二个实验：让错误在第一个失效边界停下

这段实验故意运行一次正常输入和两次错误输入。

目标不是“不报错”，而是让错误明确说出哪个字段不合格。


## 2.2 契约不是为了让类型看起来更漂亮

这个实验应该出现两类不同错误：

- 缺少 `documents` 时，错误来自 Prompt 的必需字段检查。
- `question` 是数字时，错误来自 Normalize 的类型检查。

如果两个错误都等到模型调用后才出现，就说明失败太晚了。

生产中这会额外消耗模型配额，还会让一个输入错误看起来像模型错误。

# 三、数据不是只能一步接一步

顺序链适合明确的前后依赖。

但有些计算互不依赖：

- 用问题去检索证据。
- 同时计算问题长度和语言。
- 保留原始问题，供后面构建 Prompt。

这时如果强行串行，数据流会变得别扭。

LangChain 里常用 `RunnableParallel` 或字典映射同时构造多个字段，再让下游统一消费。

## 3.1 第三个实验：并行构造上下文，再按证据分支

下面的 `parallel_map` 模拟 `RunnableParallel`，`choose_answer` 模拟 `RunnableBranch`。

教学代码按顺序执行映射函数，目的是展示字段汇合契约，不宣称真实并发性能。


## 3.2 从输出判断映射和分支是否正确

命中问题应该走 `grounded_answer`，并保留 `[refund#1]` 证据编号。

未命中问题应该走 `no_context`，不能编造天气答案。

这个输出同时证明：

- 映射后的字段名是 `question`、`documents`、`question_length`。
- 分支判断只依赖结构化字段，不依赖隐藏的全局变量。
- 拒答是一条可测试的显式路由，不是 Prompt 里一句无法验收的期望。

# 四、invoke、batch 和 stream 不是三套业务逻辑

Runnable 把“步骤做什么”与“如何调度步骤”分开。

| 调用方式 | 输入 | 输出 | 适合场景 | 主要风险 |
| --- | --- | --- | --- | --- |
| `invoke` | 一个输入 | 一个完整结果 | 调试、同步接口 | 长回答首屏等待久 |
| `batch` | 多个输入 | 与输入对应的多个结果 | 离线评测、批量生成 | 并发过高触发限流 |
| `stream` | 一个输入 | 持续到达的分块 | 对话界面、长文本 | 中途失败时结果不完整 |

这三种方式应该复用同一个核心处理函数。

如果为 `batch` 复制一份 Prompt，为 `stream` 又复制一份 Prompt，三条路径很快就会行为不一致。

## 4.1 第四个实验：用同一个 Runnable 切换调用方式

这里用确定性字符串处理模拟模型输出。

`stream` 按单词分块，用来展示消费端如何逐块接收，不代表任何真实模型的 Token 切分规则。


## 4.2 调用方式的验收证据

运行结果应该满足：

- `invoke` 只返回一个完整字符串。
- `batch` 返回两个结果，且与输入顺序对应。
- `stream` 返回多个分块，把分块拼起来后与 `invoke` 语义一致。

真实 LangChain 可能为 `batch` 使用并发，也可能从模型直接获得流式 chunk。

但业务层仍要验证输入顺序、中途失败、并发上限和部分输出处理。

# 五、这些教学类在真实 LangChain 里对应什么？

前面用标准库复现机制，是为了让每个实验在浏览器中直接运行。

它们不是 LangChain 源码的重新实现，也不应该被复制到生产项目代替官方类。

真实项目中的对应关系如下：

| 本文机制 | LangChain 常用对象 | 作用 |
| --- | --- | --- |
| `Runnable.invoke` | `RunnableLambda` 或其他 Runnable | 把普通函数适配到统一协议 |
| `pipe` | `a | b` 或 `a.pipe(b)` | 把上游输出交给下游 |
| `parallel_map` | `RunnableParallel` 或字典映射 | 从同一输入构建多个字段 |
| `keep_question` | `RunnablePassthrough` | 保留原始输入或追加字段 |
| `choose_answer` | `RunnableBranch` | 根据条件选择后续链路 |
| `try/except` 降级 | `with_fallbacks` | 主 Runnable 失败时运行备选方案 |
| 显式 Trace | Callback 或 LangSmith Trace | 记录步骤、耗时、输入输出和异常 |

安装 Python 依赖时使用 `pnpm add langchain @langchain/core`。

具体项目应使用锁文件固定已验证版本，不要在生产部署时临时获取新版本。

## 5.1 怎么阅读一条真实 LCEL？

看到 `retriever | prompt | model | parser` 时，不要只把它念成四个名词。

按下面的顺序逐边检查：

1. `retriever` 接收字符串还是字典？
2. `retriever` 返回 `Document[]` 还是已合并的文本？
3. `prompt` 声明了哪些模板变量？
4. 供应商 `model` 返回哪种消息对象？
5. `parser` 输出普通字符串还是结构化业务对象？
6. 哪些步骤支持真正的流式，哪些步骤会缓冲完整结果？

只有这六个问题都有答案，这条链才是可理解的。

# 六、什么时候不应该把逻辑都塞进 chain？

Runnable 是组装工具，不是所有代码的唯一容器。

| 场景 | 建议 | 原因 |
| --- | --- | --- |
| 三个稳定转换，需要统一 Trace | 组成 chain | 输入输出简单，组合收益明确 |
| 大量循环、早退出和可变状态 | 保留普通函数 | 强行链式化会降低可读性 |
| 长时间持久化状态机 | 考虑 LangGraph | 需要 checkpoint、中断和恢复语义 |
| 单次固定的模型调用 | 可直接用供应商 SDK | 引入抽象的收益可能小于成本 |
| 关键业务决策 | 用命名函数或显式分支 | 避免把规则藏在多层 lambda 中 |

组装的目标是让边界更清楚。

如果一条 chain 需要不断在 lambda 中做字典解包、重组和隐式副作用，就应该停下来重新划分组件。

# 七、常见问题要怎么定位？

| 现象 | 根因 | 定位方法 | 修复方式 | 预防方式 |
| --- | --- | --- | --- | --- |
| Prompt 提示缺少变量 | 上游字段名与模板变量不同 | 在 Prompt 前记录字段名，不记录敏感值 | 统一字段契约或增加显式映射 | 为链路边界写契约测试 |
| 字符串被当成字典访问 | 组件输出类型判断错误 | 单独 `invoke` 上游组件并查看实际类型 | 增加 Parser 或改变下游契约 | 在组装前写输入输出表 |
| `batch` 频繁返回 429 | 并发超过供应商限制 | 记录每批并发数、RPM、TPM 和 429 比例 | 限制 `max_concurrency`，只对可重试错误退避 | 用压测确定默认并发上限 |
| 流式页面最后才一次性显示 | 中间 Runnable 缓冲了完整输出 | 对每个步骤记录首个 chunk 时间 | 替换阻断流式的组件或改变链路位置 | 对首 chunk 延迟设阈值 |
| fallback 把程序错误也吞掉 | 降级范围过宽 | 在降级记录原异常类型与步骤 | 只对明确的上游短暂错误 fallback | 用程序错误测试证明异常仍会上报 |

排查顺序应该从最小边界开始：

1. 单独 `invoke` 失败组件。
2. 保存它的实际输入类型和字段名。
3. 与契约表对比。
4. 修复一个边界后重放同一个失败样本。
5. 确认正常、边界和失败路径都没有回归。

# 八、组装好的 chain 应该如何验收？

- [ ] 每个 Runnable 都有明确输入类型、必需字段和输出类型。
- [ ] 单独 `invoke` 每个组件时，结果符合契约。
- [ ] 组合后的 chain 与原胶水代码在相同输入下结果一致。
- [ ] 空问题、缺字段和错类型能在模型调用前失败。
- [ ] 并行映射不会覆盖同名字段，分支条件有命中和未命中测试。
- [ ] `batch` 设置了可解释的并发上限，429 不会无限重试。
- [ ] `stream` 记录首 chunk 延迟，中途异常不会被当成完整成功。
- [ ] fallback 只处理已声明的可恢复错误，程序错误仍然上报。
- [ ] Trace 能定位到具体 Runnable，且不记录 API Key、完整敏感 Prompt 或隐私文档。
- [ ] 依赖版本已进入锁文件，升级后重跑契约与回归用例。

# 九、先补上 LangChain Prompt 输入契约

Runnable 组合之前，Prompt 的变量必须先成为可检查的输入契约。

下面的实验不访问模型，只验证消息角色、模板变量和缺失字段错误。

## 9.1 可运行实验：LangChain Prompt 模板变量与消息格式

```typescript runnable file=main.ts title="TypeScript Prompt 变量契约" description="渲染 System/Human 消息，并验证缺少变量时提前失败。"
/** Prompt 模板要求的全部变量。 */
const requiredVariables = ['context', 'question'] as const
/** 渲染 Prompt 使用的输入。 */
const input: Record<string, string> = { context: 'Runnable 可以组合步骤', question: 'Runnable 是什么？' }
for (const variableName of requiredVariables) {
  if (!input[variableName]) throw new Error(`missing prompt variable: ${variableName}`)
}
console.log({ role: 'system', content: `只根据资料回答：${input.context}` })
console.log({ role: 'human', content: input.question })
```

运行通过需要同时看到两条消息和一次缺失 `context` 的错误。

这能证明失败停在模型调用之前，而不是等错误答案出现后再猜原因。

# 十、总结

- Runnable 的核心价值是统一调用、组合和配置协议，不是单纯缩短代码。
- LCEL 的 `|` 只负责连接步骤，数据形状是否匹配仍然由开发者负责。
- 组装前要写清每一步的必需输入、新增输出和失败信号，不要等模型调用后才发现字段错误。
- 顺序管道处理依赖关系，并行映射构造多个字段，分支根据显式条件选择后续路径。
- `invoke`、`batch` 和 `stream` 应复用同一条业务链；验收时分别检查单调用结果、输入顺序和分块语义。
- 复杂状态机不要强行塞进 LCEL；需要持久化、中断和恢复时应评估 LangGraph。
- 生产环境要限制批处理并发，正确处理流式中断，缩小 fallback 范围，并为每个 Runnable 保留可定位的 Trace。

## 参考资料

- [LangChain Runnable interface](https://docs.langchain.com/oss/javascript/langchain/overview)
- [LangChain Core Runnable reference](https://reference.langchain.com/javascript/langchain-core/runnables/)
