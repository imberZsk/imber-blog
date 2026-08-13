# 大模型基础（12） - AI、ML、DL 与基础模型概念边界

> 概念不是为了背缩写，而是为了判断一个需求究竟需要规则系统、传统模型、生成模型、Embedding 还是工具调用。

> 读完你能：解释 AI、ML、DL、生成式 AI、基础模型和 LLM 的包含关系，并区分聊天、推理、Embedding、多模态与本地模型。

## 核心知识清单

- 人工智能、机器学习与深度学习
- 生成式 AI、基础模型与大语言模型
- 聊天模型、推理模型与 Embedding 模型
- 多模态模型与专用视觉、语音模型
- 开源权重、闭源 API、本地部署与云端托管
- 规则、传统 ML、LLM、RAG 与 Tool 的选择边界

## 概念关系

人工智能是最外层目标，既包含规则搜索，也包含从数据学习的机器学习。深度学习是机器学习的一类，用多层神经网络学习表示。生成式 AI 关注生成文本、图片、音频或代码；基础模型是在大规模通用数据上训练、可适配多种任务的模型；LLM 是以语言为核心的一类基础模型。

聊天模型描述消息接口和对话对齐方式，推理模型针对复杂分析与规划优化。Embedding 模型把内容转换成向量，不直接生成答案。多模态模型接收图片、音频等输入，但专用 OCR、ASR 或目标检测模型在固定任务上可能更便宜、更稳定。

## 部署形态不是能力类型

“开源”需要核对权重、代码、许可证和商业限制，不等于可以任意使用；“闭源”通常通过厂商 API 调用。模型可以在本地设备、企业集群或云服务运行。数据隐私、区域、延迟、吞吐、硬件、升级和运维能力共同决定部署，而不是简单认为本地必然安全或云端必然昂贵。

## 从需求反推技术

- 规则明确且必须完全可解释：优先确定性代码或规则引擎。
- 标签稳定、输出类别固定：比较传统 ML 和小型语言模型。
- 需要生成、抽取或语义理解：评测适合的聊天或推理模型。
- 事实频繁变化：用 RAG 或业务 API，不把知识硬塞进 Prompt 或微调。
- 需要真实动作：模型只提出 Tool Call，后端负责授权和执行。
- 需要语义相似度：使用 Embedding，但最终决策仍要业务校验。

## 参考资料

- [Google Machine Learning: What is ML](https://developers.google.com/machine-learning/intro-to-ml/what-is-ml)
- [Google Introduction to Large Language Models](https://developers.google.com/machine-learning/resources/intro-llms)
- [Google Cloud Foundation Models](https://cloud.google.com/discover/what-are-foundation-models)
- [Hugging Face Model Hub](https://huggingface.co/docs/hub/models-the-hub)

