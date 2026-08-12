# Agent（15） - 给 Agent 加上语音交互：ASR + 流式 TTS

> 读完你能：理解语音 Agent 的链路：语音转文字、Agent 推理、文字转语音，以及流式体验。

# 一、本篇定位

这是交互形态升级篇，重点是低延迟和状态衔接，而不是单独调用一个语音 API。

# 二、一个真实场景

用户对着麦克风说“帮我查一下今天的会议安排”，系统要边听边转写，识别完成后交给 Agent 调日历工具，回答出来后再边生成边播放。语音交互的问题是延迟会被每个环节叠加，必须做流式和并行。

# 三、核心拆解

- ASR 把音频转文字，是 Agent 的输入层。它要处理断句、噪声、说话人和中途打断。
- Agent 仍然走文本链路：理解意图、调用工具、生成回答。语音不是替代 Agent，只是换了输入输出通道。
- TTS 把回答转音频。流式 TTS 可以边收到文本边合成，降低用户等待。

# 四、工程链路

- 前端采集音频。
- ASR 流式转写。
- 转写稳定后提交给 Agent。
- Agent 调工具并流式生成文本。
- TTS 分句合成音频。
- 前端播放并支持打断。

# 五、落地建议

- TTS 最好按句子分段，避免等完整回答。
- 用户打断时要取消 Agent 和 TTS 后续任务。
- 语音转写结果要在界面显示，方便用户纠错。

# 六、常见坑

- ASR 未稳定就提交，导致误识别。
- 完整回答结束后才开始 TTS，延迟很高。
- 没有打断机制，用户体验像听录音。

# 七、和已有主线的关系

13 流式响应讲文本体验；73 把流式思路扩展到语音输入和语音输出。

# 八、设计判断

语音 Agent 的产品体验核心不是“能说话”，而是回合控制。用户什么时候开始说、什么时候结束、系统什么时候插话、用户能不能打断，都会影响可用性。工程上通常要把状态拆成 listening、transcribing、thinking、speaking、interrupted。每个状态都能取消前一个异步任务，避免 ASR 还在转写、Agent 还在生成、TTS 还在播放三条链路互相打架。

# 九、复述答法

> 语音 Agent 是 ASR + 文本 Agent + TTS 的组合。ASR 负责把语音变成文字，Agent 仍按工具/RAG 链路处理，TTS 再把回答读出来。体验关键是流式、分句播放和可打断。

# 十、总结

- **核心拆解**：ASR 把音频转文字，是 Agent 的输入层。
- **工程链路**：Agent 调工具并流式生成文本。
- **常见坑**：ASR 未稳定就提交，导致误识别。
- **本篇定位**：这是交互形态升级篇，重点是低延迟和状态衔接，而不是单独调用一个语音 API。

## 十、最小可运行示例：本地 ASR 与 TTS 边界

~~~text
# requirements.txt
faster-whisper
pyttsx3
~~~

~~~python
from __future__ import annotations

from pathlib import Path

import pyttsx3
from faster_whisper import WhisperModel


# 本地 ASR 模型大小在准确率、显存和延迟之间取舍。
ASR_MODEL_SIZE = "small"


def transcribe(audio_path: Path) -> str:
    """转写本地音频；audio_path 必须由上传服务完成类型和大小校验。"""

    # 模型在长驻进程中应复用，示例为清晰起见在函数内创建。
    model = WhisperModel(ASR_MODEL_SIZE, device="cpu", compute_type="int8")
    # 分段结果包含文本和时间戳，可用于增量展示与回放。
    segments, _ = model.transcribe(str(audio_path), vad_filter=True)
    return "".join(segment.text for segment in segments).strip()


def speak(text: str) -> None:
    """使用本机语音合成；text 是已脱敏且限制长度的回答。"""

    # TTS 引擎只处理最终可见文本，不读取系统 Prompt 或工具结果。
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait()
~~~

实时语音链路要额外处理采样率、VAD、打断、半包、字幕时间戳和音频删除策略。外部 ASR/TTS 服务前先确认数据地域、保留期和敏感信息合规。

## 参考资料

- [LangChain Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [LangGraph 文档](https://docs.langchain.com/oss/python/langgraph/overview)
