# Context Engineering（03） - 仓库检索、Repo Map 与 Code RAG

> 代码检索要回答“入口、定义、引用、数据和测试怎样连接”，只搜到关键词不等于理解调用链。

## 学习目标

- 从错误、符号和路由定位真实入口与调用链。
- 组合关键词、向量和图关系完成受权限约束的 Code RAG。
- 用定位准确率、过期率和越权率评测代码检索质量。

## 一、检索顺序

1. 从精确错误、路由、类名、字段或测试名开始文本搜索。
2. 用语言服务查定义、引用、类型和实现。
3. 阅读入口、边界转换、核心逻辑、持久化和渲染，而不是只读命中文件。
4. 用测试、Git 历史和运行结果验证推断。

Repo Map 用有限 Token 表达目录、导入、符号和调用关系，适合先定位；随后仍要读取真实源码。Code RAG 的 chunk 应尽量保持完整符号，并携带 file、symbol、language、imports、commit、start_line/end_line 等元数据。

## 二、混合检索

关键词检索擅长精确标识符，Embedding 擅长语义描述，图关系擅长调用和依赖。生产 Code RAG 常先用文件/语言/版本过滤，再融合 BM25 与向量召回，最后按符号完整性、路径距离和调用关系重排。

## 三、安全与新鲜度

- 按仓库、分支和用户权限过滤，禁止跨私有项目召回。
- 提交变化触发增量索引，删除和重命名同步清理旧 chunk。
- 生成答案附文件、符号、行号和提交版本；无法找到当前证据时明确拒答。

## 四、评测

构造“找入口、找调用方、找状态来源、找权限过滤、找回归测试”任务集。评价 Recall@K、最终定位准确率、过期引用率、越权召回率和平均上下文 Token；只看相似度分数无法证明开发任务成功。

## 参考资料

- [GitHub Code Search Syntax](https://docs.github.com/en/search-github/github-code-search/understanding-github-code-search-syntax)
- [Tree-sitter Documentation](https://tree-sitter.github.io/tree-sitter/)
