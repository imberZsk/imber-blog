# LangChain（07） - 最小 RAG 实战：Loader、Splitter、Milvus 与电子书检索

## TypeScript 实现地图

TypeScript 链路是 Loader -> `@langchain/textsplitters` -> Embeddings -> `@langchain/milvus` -> Retriever。离线阶段用 `fromDocuments()` 建库，在线阶段用 `asRetriever({ k, filter })` 和 `invoke()` 检索。

```typescript runnable file=main.ts title="TypeScript 最小 RAG 流程" description="模拟检索命中后生成带来源的答案。"
const hit = { content: 'RAG 先检索证据，再生成答案。', metadata: { chapter: 3, page: 42 } }
console.log(`答案：${hit.content}\n来源：第 ${hit.metadata.chapter} 章，第 ${hit.metadata.page} 页`)
```



> 读完后，你应能完成以下任务：
> - 绘制“Milvus（02） - Milvus RAG 实战：电子书离线建库与引用问答 / 项目目标和数据契约”的关键对象与数据流，解释“引用只从这些字段映射，不能让模型自由编页码。”，并用源码位置、日志或 Trace 标注证据。
> - 为“Milvus（02） - Milvus RAG 实战：电子书离线建库与引用问答 / 离线建库骨架”设计正常与异常输入，验证“离线任务要记录文档版本、每批状态与失败原因；”，输出首个偏差位置与回归测试结果。
> - 实现“Milvus（02） - Milvus RAG 实战：电子书离线建库与引用问答 / 在线问答链路”的最小代码或配置，检验“校验用户、租户、书籍与章节访问权限。 -> 保留问题原文，必要时生成语义改写。 -> 用同一 Embedding 模型编码 Query。 -> Milvus 在 ACL 过滤条件内召回子块。”，输出命令、结果与 Diff，并说明不适用边界。

> 更新日期：2026/08/11

# 一、项目目标和数据契约

本篇把前 04–06 篇串成一条最小链路：Loader 读电子书，Splitter 生成 chunks，Embeddings 把 chunks 转成向量，LangChain VectorStore 写入 Milvus，Retriever 找回相关文档，最后把证据交给模型生成带引用的回答。示例先用确定性本地替身跑通数据契约，再说明真实 Embeddings、Milvus 和 ChatModel 的替换点。

用户问“作者怎样解释上下文压缩”时，系统要返回答案、书名、章节、页码和原文片段。电子书正文长、跨页、同一概念分散，推荐父子分块：章节/小节为父块，段落级子块生成向量；命中子块后回取父块或相邻段落。

每个子块保存：`chunk_id/document_id/parent_id/book_title/heading_path/page_start/page_end/source_uri/text/tenant_id/acl/embedding_version`。引用只从这些字段映射，不能让模型自由编页码。

# 二、离线建库骨架


离线任务要记录文档版本、每批状态与失败原因；重跑时按稳定主键 upsert，并删除新版本中不再存在的旧 Chunk。

# 三、在线问答链路

1. 校验用户、租户、书籍与章节访问权限。
2. 保留问题原文，必要时生成语义改写。
3. 用同一 Embedding 模型编码 Query。
4. Milvus 在 ACL 过滤条件内召回子块。
5. 按 `parent_id` 去重并补全父块/相邻块。
6. Rerank 后在 Token 预算内选择证据。
7. 模型结构化返回答案与 `chunk_id` 引用。
8. 程序校验引用只来自 Context，再映射书名、章节和页码。

若书中没有证据，返回“无法从当前书籍确认”，不要用模型常识伪装成书中观点。

# 四、父块扩展与去重


# 五、电子书特有坏案例

- 双栏 PDF 解析顺序错误，章节文字互相穿插。
- 扫描页 OCR 把页码、脚注或公式识别错。
- 章节标题未继承，短段落向量失去主题。
- 整章直接向量化，细节问题无法精确定位。
- 多个相邻子块重复命中，占满 Context。
- 页码来自 PDF 物理页而读者使用印刷页，引用需同时说明。
- 书籍更新后旧版索引和语义缓存没有失效。

# 六、验收指标

- 目录/页码解析准确率、OCR 抽样准确率和空页率。
- 章节级与段落级 Recall@K、MRR 和引用页准确率。
- 父块扩展后的条件完整率与 Context 重复率。
- 证据不足拒答准确率、答案忠实度与引用覆盖率。
- 建库吞吐、索引对账、在线 P95、Token 和单问成本。

# 七、最小可运行验证

前两个 Python 代码块共同组成 `rag-book.ts`。它们通过 `embed_batch`、`insert_rows` 和 `get_parent` 隔离了外部服务，因此可以先验证批处理、稳定主键和父块去重，再接入 Milvus。新建下面的 `test_rag-book.ts`：


运行命令和预期结果：

```bash
python -m unittest -v
```

```text
test_build_index_keeps_metadata ... ok
test_parent_context_is_deduplicated ... ok
```

这个测试不声称验证了 Milvus 网络、Schema 或索引参数。接入真实 `@zilliz/milvus2-sdk-node` 适配器后，还要在隔离测试 Collection 中验证向量维度、`tenant_id/acl` 过滤、重复 upsert、删除传播和索引切换；这些属于集成测试，不能由内存替身代替。

# 八、总结

- **项目目标和数据契约**：引用只从这些字段映射，不能让模型自由编页码。
- **离线建库骨架**：离线任务要记录文档版本、每批状态与失败原因；
- **在线问答链路**：校验用户、租户、书籍与章节访问权限。 -> 保留问题原文，必要时生成语义改写。 -> 用同一 Embedding 模型编码 Query。 -> Milvus 在 ACL 过滤条件内召回子块。
- **电子书特有坏案例**：双栏 PDF 解析顺序错误，章节文字互相穿插。
- **验收指标**：目录/页码解析准确率、OCR 抽样准确率和空页率。
- **最小可运行验证**：它们通过 embed_batch、insert_rows 和 get_parent 隔离了外部服务，因此可以先验证批处理、稳定主键和父块去重，再接入 Milvus。

## 可运行实验：最小 RAG 数据流

下面的浏览器沙盒把 Loader、Splitter、Embedding、VectorStore 和 Retriever 串成一条可观察流水线。它使用确定性词频向量，目的不是模拟真实 Embeddings 质量，而是让用户在没有 API Key 和 Milvus 的情况下先验证文档元数据、分块边界、相似度排序和引用去重。

```typescript runnable file=main.ts title="TypeScript 最小 RAG 流水线" description="加载电子书片段，完成分块、向量化、相似度检索和引用输出。"
/** 原始电子书章节。 */
interface BookChapter {
  id: string
  title: string
  page: number
  content: string
}

/** 分块后进入向量库的文档实体。 */
interface ChunkDocument {
  id: string
  parentId: string
  title: string
  page: number
  content: string
  vector: number[]
}

/** 检索返回的文档和相似度。 */
interface SearchResult {
  document: ChunkDocument
  score: number
}

/** 向量维度使用固定词表，保证实验结果可复现。 */
const VOCABULARY = ['agent', 'tool', 'memory', 'retrieval', 'vector', 'document'] as const
/** 每个分块允许保留的最大单词数。 */
const CHUNK_SIZE = 8
/** 相邻分块重复的单词数，用于保留边界上下文。 */
const CHUNK_OVERLAP = 2
/** 模拟 Loader 读取到的两章电子书。 */
const chapters: BookChapter[] = [
  {
    id: 'chapter-agent',
    title: 'Agent 与 Tool',
    page: 12,
    content: 'agent selects a tool and uses tool results to continue reasoning'
  },
  {
    id: 'chapter-memory',
    title: 'Memory 与 Retrieval',
    page: 36,
    content: 'memory stores conversation summary and retrieval finds relevant document context'
  }
]

/**
 * 使用滑动窗口切分章节文本。
 * @param chapter Loader 返回的单章文档。
 * @returns 带父章节和页码元数据的文本块。
 */
function splitChapter(chapter: BookChapter): Omit<ChunkDocument, 'vector'>[] {
  /** 当前章节按空格拆分后的单词。 */
  const words = chapter.content.split(/\s+/)
  /** 每次窗口向前移动的单词数。 */
  const step = CHUNK_SIZE - CHUNK_OVERLAP
  /** 当前章节最终生成的全部文本块。 */
  const chunks: Omit<ChunkDocument, 'vector'>[] = []

  for (let start = 0; start < words.length; start += step) {
    /** 当前窗口包含的连续单词。 */
    const chunkWords = words.slice(start, start + CHUNK_SIZE)
    if (chunkWords.length === 0) break
    chunks.push({
      id: `${chapter.id}:${start}`,
      parentId: chapter.id,
      title: chapter.title,
      page: chapter.page,
      content: chunkWords.join(' ')
    })
    if (start + CHUNK_SIZE >= words.length) break
  }

  return chunks
}

/**
 * 用固定词表生成归一化词频向量。
 * @param text 需要向量化的文档或查询。
 * @returns 与固定词表等长的单位向量。
 */
function embed(text: string): number[] {
  /** 标准化后的单词集合。 */
  const words = text.toLowerCase().split(/\W+/)
  /** 每个词表项在文本中的出现次数。 */
  const counts = VOCABULARY.map((term) => words.filter((word) => word === term).length)
  /** 词频向量的欧几里得长度。 */
  const magnitude = Math.hypot(...counts) || 1
  return counts.map((count) => count / magnitude)
}

/**
 * 计算两个单位向量的点积相似度。
 * @param left 查询向量。
 * @param right 文档向量。
 * @returns 越接近 1 表示语义越相似。
 */
function cosineSimilarity(left: number[], right: number[]): number {
  return left.reduce((score, value, index) => score + value * (right[index] || 0), 0)
}

/** 分块、向量化后写入内存 VectorStore 的文档。 */
const vectorStore: ChunkDocument[] = chapters.flatMap(splitChapter).map((document) => ({
  ...document,
  vector: embed(document.content)
}))

/** 用户当前提出的语义查询。 */
const question = 'How does memory retrieval find document context?'
/** 与用户问题对应的查询向量。 */
const queryVector = embed(question)
/** Retriever 返回的相似度最高的两个文本块。 */
const results: SearchResult[] = vectorStore
  .map((document) => ({ document, score: cosineSimilarity(queryVector, document.vector) }))
  .sort((left, right) => right.score - left.score)
  .slice(0, 2)

console.log(`question: ${question}`)
for (const result of results) {
  console.log(`${result.score.toFixed(3)} | ${result.document.title} p.${result.document.page}`)
  console.log(`  ${result.document.content}`)
}
```

运行后，Memory 章节应排在 Agent 章节之前，并且每条结果都保留 `parentId`、章节标题和页码。替换为真实 LangChain 时，`embed()` 对应 Embeddings 模型，`vectorStore` 对应 Milvus Collection，排序与截断对应 `asRetriever({ k: 2 })` 或 `similaritySearchWithScore()`。

## 沙盒验收边界

- 修改 `question` 后重新运行，观察相似度排序是否随查询变化。
- 把 `CHUNK_SIZE` 调小，确认块数量增加但父章节元数据没有丢失。
- 真实项目必须在检索表达式中加入租户和 ACL 过滤，不能只依赖向量相似度。
- 生成答案时只允许引用 Retriever 返回的页码，模型不能自行补造来源。

该沙盒故意不调用真实模型或 Milvus，只验证数据契约；接入真实系统时替换 `retrieve` 为 `retriever.invoke(question)`，再把返回文档交给 ChatModel 生成答案。

## 参考资料

- [Milvus Overview](https://milvus.io/docs/overview.md)
- [Milvus Filtered search](https://milvus.io/docs/filtered-search.md)
- [LangChain Retrieval](https://docs.langchain.com/oss/javascript/langchain/retrieval)
