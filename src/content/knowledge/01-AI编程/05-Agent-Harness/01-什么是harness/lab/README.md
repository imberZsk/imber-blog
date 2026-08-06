# 01 - 裸 LLM vs 带 Harness 的 Agent

本 demo 配套小册第 01 章，用**同一个问题**对比两种方式，让你直观看到"外壳"带来的差别。

> 问题：**"帮我看看当前目录下 config.json 里写了什么？"**

- `bare_llm.py`：裸 LLM 调用。模型够不着文件，只能让你自己贴内容、或干脆瞎编。
- `with_harness.py`：带一个 `read_file` 工具和一个最小循环。模型会"动嘴"说要读文件，由 harness "动手"真去读，再把内容喂回去得出答案。

## 怎么跑

本 demo 默认用**离线 Mock 模型**（`mock_llm.py`），无需 API Key、无需联网，直接跑就能看效果：

```bash
python bare_llm.py
python with_harness.py
```

你会看到 `with_harness.py` 多打印了"🔧 模型请求调用工具 → harness 执行 → 把结果喂回"的过程，最后给出基于**真实文件内容**的回答；而 `bare_llm.py` 只能两手一摊。

## 想换成真实模型？

把脚本里 `from mock_llm import chat` 换成真实的 Anthropic SDK 调用即可（需要 `pip install anthropic` 并设置 `ANTHROPIC_API_KEY`）。Mock 的接口刻意做得和真实调用很像，方便你对照。

## 看点

对照着读两个文件的 `while` 循环部分——**裸 LLM 没有循环，harness 版本有循环**。这正是第 02 章"Agent Loop"的引子。
