# 知识库的 loader 和 splitter：从各种来源加载文档并分割成小块

> 读完你能：掌握 RAG 入库前两步：从不同来源加载内容，并切成可检索、可引用的小块。
> 来源：`吃透 AI Agent 开发` 截图目录第 7 篇，2026/01/05，可试读 36%
> 导入与重写日期：2026/07/07

## 本篇定位

这是把 17 文件解析和 21 chunk 切分合成工程入库链路的一篇。

## 一个真实场景

企业知识库的资料不会只是一堆 txt。它可能来自 Markdown、PDF、Word、网页、飞书文档、数据库记录。loader 负责把这些来源统一成文档对象，splitter 负责把文档对象切成 chunk。

## 核心拆解

- Loader 的职责是“读进来并保留来源”。它不只返回 text，还要带 source、title、page、url、created_at、permission 等 metadata。
- Splitter 的职责是“切得可检索”。它要尊重标题、段落、列表、代码块和表格边界，尽量别把一个完整语义单元切断。
- Loader 和 splitter 不应该混在一起。来源解析经常变，切分策略也经常调，拆开才能独立测试。

## 工程链路

- 按来源选择 loader。
- 输出统一的 Document 结构。
- 按文档类型选择 splitter。
- 为 chunk 继承并补充 metadata。
- 预览 chunk 质量。
- 再进入 embedding 和入库。

## 落地建议

- Markdown 优先按标题层级切。
- PDF 要保留页码，因为引用需要回跳。
- 网页要去掉导航、广告、页脚，避免污染知识库。

## 常见坑

- 把所有格式都先粗暴转纯文本，导致表格和标题结构丢失。
- 切分时丢 metadata，后面引用和权限全断。
- 切完不人工抽样，直到问答错了才发现 chunk 很烂。

## 和已有主线的关系

17 讲文件解析，21 讲 chunk；59 把它们升级成 loader/splitter 两个可替换模块。

## 复述答法

> Loader 负责把不同来源统一成带 metadata 的 Document，splitter 负责按语义边界切 chunk。工程上两者要分离，metadata 要贯穿到 chunk，切完要抽样看质量，否则后面的 embedding 和 rerank 都救不了脏入库。
