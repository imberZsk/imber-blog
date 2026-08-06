# 结构化大模型输出：output parser 还是 tool?

> 读完你能：学会在 JSON parser、structured output 和 tool calling 之间做选择。
> 来源：`吃透 AI Agent 开发` 截图目录第 12 篇，2026/01/27，可试读 1%
> 导入与重写日期：2026/07/07

## 本篇定位

这是结构化输出的进阶取舍篇。12 讲 JSON 输出基础，64 讨论生产里该选哪种约束方式。

## 一个真实场景

你让模型从用户输入里抽取姓名、时间、事项，返回 JSON。用 prompt 要求“只输出 JSON”经常会混入解释；用 parser 可以修，但失败还要重试；用 tool calling 则让模型按函数参数格式输出。三种方式不是谁替代谁，而是适用场景不同。

## 核心拆解

- Output parser 适合轻量任务：模型输出文本后，后端按 schema 解析和校验。它灵活，但依赖模型自觉遵守格式。
- Structured output 让模型接口层支持 schema 约束，稳定性更好，适合强格式返回。
- Tool calling 适合“结构化输出之后还要执行动作”的场景。模型输出的是工具名和参数，后端决定是否执行。

## 工程链路

- 只需要展示结构化结果，用 structured output。
- 需要兼容普通文本模型，用 output parser 加校验重试。
- 结构化结果会触发外部动作，用 tool calling。
- 不管哪种方式，后端都要做 schema 校验。

## 落地建议

- 表单抽取优先 structured output。
- 工具调用参数必须再过业务校验。
- 解析失败要返回可恢复错误，别让前端拿到半截 JSON。

## 常见坑

- 只靠 prompt 说“不要输出多余内容”。
- 把 parser 当安全机制，解析成功不代表业务安全。
- 明明只是抽取信息，却强行包装成工具调用。

## 和已有主线的关系

12 是结构化输出入门，28 是 Function Calling；64 说明两者在生产任务里的边界。

## 复述答法

> 如果只是要稳定 JSON，优先 structured output；接口不支持时用 output parser 加校验重试；如果结构化参数会触发外部动作，就用 tool calling。无论哪种方式，后端 schema 和业务校验都不能省。
