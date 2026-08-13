# 大模型基础（11） - 多模态模型、OCR、ASR 与 TTS 应用边界

> 多模态不等于一个模型包办所有任务。视觉理解、OCR、语音识别和语音合成有不同输入契约、指标与失败模式。

> 读完你能：为图片、文档和语音任务选择通用多模态模型或专用模型，并设计保留原始证据的处理链。

## 核心知识清单

- 图片理解、目标识别与视觉问答
- OCR、版面分析、表格与阅读顺序
- ASR、说话人分离、时间戳与置信度
- TTS、音色、流式播放与内容安全
- 图片分辨率、音频采样率与 Token 成本
- 专用模型、通用多模态模型与级联架构
- 原始证据、人工复核与隐私治理

## 任务边界

图片理解回答“画面是什么”，目标识别关注对象和位置，视觉问答结合问题读取图像；OCR 专门恢复文字，文档解析还要重建标题、段落、表格和阅读顺序。扫描合同只做 OCR 会得到文本，却可能丢失表格单元格和跨页关系。

ASR 把音频转成带时间戳的文本，说话人分离标记谁在说话；TTS 把文本生成音频。客服质检通常是 ASR → 脱敏 → 分类/摘要，而不是让聊天模型直接处理整段原始音频。

## 如何选型

通用多模态模型适合开放式理解、复杂页面问答和低量探索；专用 OCR、ASR 或检测模型适合高吞吐、固定任务和明确指标。级联架构先用专用模型结构化，再让大模型推理，通常更容易评测和控制成本。

## 生产链路

1. 校验 MIME、文件大小、像素、页数、时长和恶意内容。
2. 对图片做方向校正和清晰度检查，对音频做声道与采样率归一化。
3. 保留页码、坐标、时间戳、说话人和置信度，不只保存摘要。
4. 低置信度、金额、身份和高风险字段进入人工复核。
5. Trace 记录模型、预处理版本、输入哈希、延迟和失败原因。

图片和语音都可能包含人脸、证件、声音特征和背景敏感信息。上传、存储、模型调用、日志和删除链必须分别定义权限与保留期。

## 参考资料

- [OpenAI Images and Vision](https://platform.openai.com/docs/guides/images-vision)
- [Hugging Face Automatic Speech Recognition](https://huggingface.co/docs/transformers/tasks/asr)
- [Hugging Face Text-to-Speech](https://huggingface.co/docs/transformers/tasks/text-to-speech)
- [Google Cloud Vision OCR](https://cloud.google.com/vision/docs/ocr)

