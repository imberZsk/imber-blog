## 整体流程

从 Tool 开始，让大模型调用工具读取文件。核心是一个「调用模型 → 执行工具 → 回填结果 → 再次调用」的循环，直到模型不再请求工具为止。

下表中的 step 与 `lab/nodejs/tool-file-read.mjs` 里的 `step` 注释一一对应：

| step | 说明 | 对应代码 |
|------|------|---------|
| step1 | 初始化大模型 | `new ChatOpenAI(...)` |
| step2 | 创建工具函数并绑定到模型 | `readFileTool` + `model.bindTools(tools)` |
| step3 | 设定人设与用户问题 | `SystemMessage` + `HumanMessage` |
| step4 | 执行第一轮调用、把回复放入历史、拿到 tool_calls（非空则代表模型想继续调工具） | `modelWithTools.invoke(messages)` + `while` 循环入口 |
| step5 | 遍历 tool_calls，通过 `Promise.all` 并发调用对应工具并拿到执行结果 | `Promise.all(response.tool_calls.map(...))` |
| step6 | 将工具执行结果与工具 id（tool_call_id）存回历史，再次调用模型进入下一轮 | `ToolMessage` + `modelWithTools.invoke(messages)` |
| step7 | 循环结束，模型不再调用工具，输出最终结果 | `console.log(response.content)` |

> 说明：step5 实际使用 `Promise.all` **并发**执行所有 tool_calls（并非严格顺序执行），文档描述以实际代码为准。
