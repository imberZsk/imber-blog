# 工程基础（89）- 图解 Transformer 架构：大模型底层原理

> 读完你能：用应用工程师需要的粒度理解 Transformer：token、embedding、attention、层叠和生成。

# 一、本篇定位

这是模型原理补课篇，不追论文细节，只讲和应用开发直接相关的底层概念。

# 二、一个真实场景

你不需要从零训练大模型，但必须知道上下文窗口为什么有限、为什么长 prompt 会贵、为什么模型逐 token 生成、为什么 attention 会关注上下文里的不同片段。这些原理会直接影响 prompt、RAG 和流式体验设计。

# 三、核心拆解

- 文本先被切成 token，再映射成 embedding。模型处理的不是汉字或单词，而是一串 token 向量。
- Attention 让每个 token 在生成时参考上下文里的其他 token，决定哪些信息更重要。
- Transformer 层层堆叠，每层都在更新 token 表示，最后通过概率分布预测下一个 token。

# 四、工程链路

- 输入文本分词。
- token 变 embedding。
- 加入位置编码。
- 多层 attention 和前馈网络处理。
- 输出下一个 token 概率。
- 采样或贪心生成 token。
- 循环直到结束。

# 五、落地建议

- 上下文越长，attention 成本越高，所以 RAG 要精选证据。
- 流式输出来自逐 token 生成。
- temperature 影响采样随机性，不影响模型知道不知道资料。

# 六、常见坑

- 以为模型一次生成整篇回答。
- 以为 prompt 越长越好。
- 把 embedding 和模型内部 hidden states 混为一谈。

# 七、和已有主线的关系

10 讲 API 基础；89 解释 API 背后的模型机制，为 90 训练/推理流程做铺垫。

# 八、复述答法

> Transformer 可以理解为 token 序列处理器：文本分词成 token，token 变向量，attention 在上下文中找相关信息，多层处理后预测下一个 token。应用层最重要的启发是控制上下文、理解流式、别让无关内容污染注意力。

# 九、总结

- **核心拆解**：文本先被切成 token，再映射成 embedding。
- **工程链路**：token 变 embedding。
- **常见坑**：把 embedding 和模型内部 hidden states 混为一谈。
- **本篇定位**：这是模型原理补课篇，不追论文细节，只讲和应用开发直接相关的底层概念。
