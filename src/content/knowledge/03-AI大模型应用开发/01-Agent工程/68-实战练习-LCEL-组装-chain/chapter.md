# 实战练习 LCEL 组装 chain

> 读完你能：用 LCEL 思维组装一个 RAG chain，并知道什么时候该拆链、什么时候该上图。
> 来源：`吃透 AI Agent 开发` 截图目录第 16 篇，2026/02/26，可试读 8%
> 导入与重写日期：2026/07/07

## 本篇定位

这是 LangChain 实战练习篇，重点练固定流程的组件串联。

## 一个真实场景

一个最小 RAG chain 可以是：输入问题 → 检索文档 → 渲染 prompt → 调模型 → 解析输出。这个流程没有循环和动态分支，用 chain 表达非常自然。只要你把每步的数据结构对齐，整个链就像一条清晰流水线。

## 核心拆解

- LCEL 适合固定流程。它让你把“先检索、再提示词、再模型、再解析”写成可读的组合。
- RAG chain 的关键不是代码有多短，而是每一步都能单独替换和测试。Retriever、Prompt、LLM、Parser 都应该能独立跑。
- 一旦流程需要“检索失败就改写再检索”“工具失败就换策略”这种回路，chain 就开始吃力，需要 LangGraph。

## 工程链路

- 定义输入 question。
- Retriever 返回 documents。
- PromptTemplate 把 question 和 documents 渲染成 prompt。
- LLM 生成回答。
- Parser 校验格式并输出 answer、citations。

## 落地建议

- 先用 mock retriever 和 mock llm 验证数据流。
- 链路中间结果要能打印，便于定位坏 case。
- 回答和引用分开输出，引用不要让模型编。

## 常见坑

- 把所有逻辑塞进一个 chain，没人看得懂。
- 遇到条件分支仍强行用三元表达式拼。
- 不记录中间 documents，答错时无法判断是检索还是生成问题。

## 和已有主线的关系

67 讲 Runnable，本篇练固定 RAG chain；75 和 76 会处理 chain 不擅长的循环与分支。

## 复述答法

> LCEL 适合固定流水线，比如 RAG 的检索、prompt、模型、解析。每步要独立可测，并保留中间结果。只要出现循环、回退、动态决策，就该考虑 LangGraph，而不是继续把 chain 写复杂。
