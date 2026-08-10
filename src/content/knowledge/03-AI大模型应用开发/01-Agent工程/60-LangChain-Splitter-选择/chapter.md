# LangChain 全部 Splitter，其实只需要其中的一个

> 读完你能：知道 splitter 不需要全背，重点理解为什么递归字符切分通常是默认首选。
> 来源：`吃透 AI Agent 开发` 截图目录第 8 篇，2026/01/10，可试读 10%
> 导入与重写日期：2026/07/07

## 本篇定位

这是切分策略的取舍篇，帮助你从一堆 LangChain splitter 名词里抓住主线。

## 一个真实场景

LangChain 提供很多 splitter：Character、RecursiveCharacter、MarkdownHeader、Token、HTML、Code。初学者容易以为每个都要学。真实项目里，第一版通常用 RecursiveCharacterTextSplitter 起步，然后针对 Markdown、代码、表格做少量定制。

## 核心拆解

- Recursive splitter 的思路是按优先级尝试分隔符：先按大结构切，切不开再按小结构切，最后才按字符硬切。
- 它适合大多数普通文本，因为既能保留段落边界，又能保证 chunk 不超过目标大小。
- 专用 splitter 的价值在结构明显时才出现，比如 Markdown 标题、HTML 标签、代码函数。否则过早引入只会增加调试成本。

## 工程链路

- 先设定目标 chunk_size 和 overlap。
- 用递归 splitter 处理普通文本。
- 抽样检查边界是否合理。
- 发现 Markdown 标题或代码结构被破坏时，再引入专用 splitter。
- 用评测集比较命中率，而不是凭感觉换 splitter。

## 落地建议

- 默认从递归字符切分开始。
- 制度文档优先保留条款和标题。
- 代码文档优先按函数或类切。
- 表格不要硬切成散句，先转成结构化描述。

## 常见坑

- 为了显得专业选最复杂的 splitter。
- 只调 chunk_size 不看实际切出来的文本。
- 用英文分隔符策略切中文，导致边界很差。

## 和已有主线的关系

21 讲 chunk_size 和 overlap；60 说明在 LangChain 生态里怎样选 splitter。

## 复述答法

> splitter 不用全背。默认先用递归字符切分，因为它会优先保留段落等大边界，实在切不开才细切。只有当文档结构很明确，比如 Markdown、HTML、代码、表格时，再换专用 splitter，并用评测结果证明它更好。
