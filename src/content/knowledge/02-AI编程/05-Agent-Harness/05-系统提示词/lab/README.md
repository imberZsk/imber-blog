# 05 - System Prompt 的威力：换个"宪法"判若两人

本 demo 配套小册第 05 章。**同一个模型、同一个问题，只更换 system prompt**，观察 Agent 的回答风格如何天差地别。

这是理解"system prompt 是性价比最高的控制手段"最直观的方式。

## 怎么跑

默认离线 mock，无需 API Key：

```bash
python demo.py
```

它会用三套不同的 system prompt 回答同一个问题"怎么学习编程？"：

1. **严谨工程师**：简洁、给步骤、重实践
2. **活泼朋友**：口语化、带鼓励、轻松
3. **苏格拉底导师**：不直接给答案，用反问引导思考

## 看点

1. 三个回答的差异**完全来自 system prompt**，模型和问题都没变——这就是"宪法"的塑造力。
2. 看 `SYSTEM_PROMPTS` 字典里每套 prompt 的结构：身份 + 行为准则 + 输出风格，对照第 05 章"五层结构"。
3. 试着自己加一套 system prompt（比如"毒舌但有用"），再跑一遍，体会改字符串就能改行为的爽感。

> 真实版：把 `mock_respond` 换成 `client.messages.create(system=sp, ...)` 即可，system 参数就是这里的 system prompt。
