# RAG（16） - LangChain Splitter 选型：递归、结构化、Token 与语义分块

> 读完你能：根据普通文本、Markdown、代码和表格选择分块器，并用同一评测集确定 Chunk Size 与 Overlap。
> 更新日期：2026/08/11

# 一、默认方案与升级条件

`RecursiveCharacterTextSplitter` 是普通文本的稳健起点：先尝试段落和句子等大边界，仍超长才降级到小分隔符。它不是所有文档的终点：Markdown 应先按标题、代码应先按函数/类、HTML 应先按 DOM、表格应保留行列关系。

| 策略 | 适合 | 主要风险 |
| --- | --- | --- |
| 固定字符 | 数据流 Demo、无结构短文本 | 切断句子与业务条件 |
| 递归字符 | 普通说明文、FAQ | 不理解标题和代码语法 |
| Token | 严格控制模型窗口 | 仍可能切断语义 |
| Markdown/HTML Header | 有明确标题结构 | 标题下大块仍需二次切 |
| 代码语法 | 源代码、API 示例 | 跨函数调用上下文不足 |
| 语义分块 | 主题变化明显的长文 | 成本高、边界和版本不稳定 |

# 二、中文递归分块示例

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 单块最大 Token/字符近似值；生产应使用目标模型 Tokenizer 计数。
CHUNK_SIZE = 500
# 只用于保护边界的重叠长度。
CHUNK_OVERLAP = 80
# 从大结构到小结构的中文分隔符优先级。
CHINESE_SEPARATORS = ["\n\n", "\n", "。", "；", "，", " ", ""]

# 普通中文文档的默认递归分块器。
splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=CHINESE_SEPARATORS,
    length_function=len,
)
# 待切分的制度文档示例。
text = "第一条 适用范围。\n本制度适用于正式员工；外包人员按合同约定执行。"
# 切分得到的可检索正文列表。
chunks = splitter.split_text(text)
print(chunks)
```

示例用字符数便于运行；接真实模型时应使用对应 Tokenizer，否则中文字符数与 Token 预算会偏离。

# 三、标题分块与父子块

Markdown 可先由 Header Splitter 得到标题单元，再对超长单元做递归切分。每个子块继承 `Header 1/2/3`，检索时把标题与正文一起编码。若答案需要完整条款，保存父块正文：子块负责精准召回，父块负责生成上下文。

Overlap 不能替代父子块。大比例重叠会扩大索引、制造重复候选，让同一文档挤占 Top K。

# 四、如何选择参数

准备同一批问题和正确证据，针对候选配置运行离线实验：

1. 比较 Recall@5/10、MRR 与正确条件完整率。
2. 统计 Chunk 数量、P50/P95 Token、重复率和索引成本。
3. 记录在线 Rerank 候选数、Context Token 与 P95。
4. 对表格、代码、否定/例外条件单独分组分析。
5. 只保留在质量或成本上有明确优势的策略。

不能根据“块看起来差不多”决定参数，也不能只在一篇文档上调到最好。

# 五、容易忽略的边界

- 工具调用 JSON、代码围栏和表格不要在结构内部切断。
- 标题很短但提供主题，Embedding 时应拼接标题，展示时仍保留正文来源。
- 列表项之间可能共享前置条件，不能每项完全孤立。
- PDF 页码边界不一定是语义边界，跨页段落应先合并。
- 更换 Splitter 或参数就是索引版本变化，要可重建、对比和回滚。

# 六、验收清单

- 没有空 Chunk、超 Token Chunk 和异常大面积重叠。
- 标题、来源、页码、权限随每个子块保存。
- 关键句、否定条件、函数和表格结构不被破坏。
- 同一输入与配置重复运行得到稳定 ID。
- 参数变化在固定评测集上有 Recall/成本证据。

# 七、参考资料

- [LangChain Text splitters](https://docs.langchain.com/oss/python/integrations/splitters)
- [LangChain RecursiveCharacterTextSplitter](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter)

# 八、总结

- 普通文本先用递归分块，结构化来源先保结构再做长度约束。
- Chunk Size 与 Overlap 是评测参数，不是网上复制的常量。
- 父子块、标题继承和 Token 预算共同决定检索与生成质量。

## 参考资料

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Milvus 文档](https://milvus.io/docs)
