# 03 - 最小 Harness：50 行跑通第一个 Agent

本 demo 配套小册第 03 章。这是本小册**第一个完整可运行的 Agent**，一个超迷你版的 Claude Code。

它有两个工具：`list_files`（列目录）和 `read_file`（读文件）。你用一句话提需求，它会自己列目录、挑文件、读内容、给答案。

## 两个版本

| 文件 | 说明 | 是否需要 API Key |
| --- | --- | --- |
| `agent_mock.py` | 离线 mock 版，逻辑结构和真实版完全一致 | ❌ 不需要，直接跑 |
| `agent.py` | 真实 Anthropic SDK 版，真·调用大模型 | ✅ 需要 `ANTHROPIC_API_KEY` |

## 怎么跑

**离线版（推荐先跑这个）：**

```bash
python agent_mock.py
```

会自动用一个内置任务演示完整流程，打印每次工具调用。

**真实版：**

```bash
pip install anthropic
export ANTHROPIC_API_KEY="你的key"
python agent.py
# 然后输入：这个目录里有哪些文件？挑个 .py 告诉我它在干嘛。
```

## 看点

1. **四块结构**：工具函数 / 工具 schema / 核心循环 / 对话入口——对照第 03 章正文逐块看。
2. **异常处理**：故意让工具捕获异常并把错误当结果喂回（见 `read_file`），试着读一个不存在的文件，看 Agent 不崩还能自己应对。
3. **对比两个文件**：`agent.py` 和 `agent_mock.py` 的循环骨架几乎一模一样——这说明 harness 逻辑和具体模型是解耦的，换模型不用改循环。
