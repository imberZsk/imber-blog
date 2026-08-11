# Agent Harness（3）- 动手搭一个最小 Harness（50 行代码跑通第一个 Agent）

> 读完你能：围绕“动手搭一个最小 Harness（50 行代码跑通第一个 Agent）”理解“我们要造什么”与“动手前：装好家伙”，并结合正文示例完成实践与排障。

> 前两章讲完了"是什么"和"怎么转"，现在该动手了。
> 这一章的目标只有一个：**让你亲手敲出一个真能跑、能操作真实文件的 Agent，并获得"我造出来了"的成就感。** 核心代码不到 50 行。

---

# 一、我们要造什么

一个能在终端里对话的 mini Agent，它有两个工具：

- `list_files(dir)`：列出某个目录下的文件
- `read_file(path)`：读取某个文件的内容

然后你就能问它："这个项目里有哪些 Python 文件？挑一个告诉我它在干嘛。" 它会自己列目录、挑文件、读内容、给你答案——这就是个**超迷你版的 Claude Code**。

> 本章正文用**真实 Anthropic SDK** 讲解（这是真本事）；配套 demo 同时提供 **mock 离线版**，没 API Key 也能跑。

---

# 二、动手前：装好家伙

```bash
pip install anthropic
export ANTHROPIC_API_KEY="你的key"   # Windows 用 set
```

没有 Key 也没关系，直接跳到 demo 跑 mock 版，照样能看到完整效果。

---

# 三、一步步搭（每块都解释为什么）

## 3.1 第 1 块：定义工具（Agent 的"手"）

先写两个普普通通的 Python 函数。注意——**它们就是普通函数，没有任何"AI 魔法"**：

```python
import os

def list_files(directory="."):
    """工具：列出指定目录下的所有文件名"""
    return "\n".join(os.listdir(directory))

def read_file(path):
    """工具：读取指定文件的文本内容"""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

# 工具注册表：把工具名映射到真实函数，循环里靠它来调度
TOOLS = {"list_files": list_files, "read_file": read_file}
```

## 3.2 第 2 块：把工具"描述"给模型看

模型不会读你的 Python 代码，它只能读**文字描述**。所以要给每个工具写一份"说明书"（schema），告诉模型：这个工具叫什么、干嘛用的、要传什么参数。

```python
TOOL_SCHEMAS = [
    {
        "name": "list_files",
        "description": "列出指定目录下的所有文件。想知道有哪些文件时用它。",
        "input_schema": {
            "type": "object",
            "properties": {
                "directory": {"type": "string", "description": "目录路径，默认当前目录"}
            },
        },
    },
    {
        "name": "read_file",
        "description": "读取指定文件的内容。想看某个文件里写了什么时用它。",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "文件路径"}
            },
            "required": ["path"],
        },
    },
]
```

> 💡 这份 schema 是模型选工具的**唯一依据**。description 写得含糊，模型就会选错工具——这点第 04 章会专门展开。

## 3.3 第 3 块：核心循环（把第 02 章的骨架变成真代码）

```python
from anthropic import Anthropic

client = Anthropic()  # 自动读取 ANTHROPIC_API_KEY

def run_agent(user_input, max_iterations=20):
    """最小 Agent 主循环：问模型→执行工具→喂回结果，直到完成或触发上限"""
    messages = [{"role": "user", "content": user_input}]

    for _ in range(max_iterations):   # 安全刹车：轮次上限
        # ① 想：把对话和工具说明书一起交给模型
        resp = client.messages.create(
            model="claude-opus-4-8",
            max_tokens=1024,
            tools=TOOL_SCHEMAS,
            messages=messages,
        )
        messages.append({"role": "assistant", "content": resp.content})

        # 正常刹车：模型没请求工具 -> 输出最终文字答案
        if resp.stop_reason != "tool_use":
            return "".join(b.text for b in resp.content if b.type == "text")

        # ② 做 + ③ 看：执行模型请求的每个工具，收集结果
        tool_results = []
        for block in resp.content:
            if block.type == "tool_use":
                func = TOOLS[block.name]          # 按名字找到真实函数
                output = func(**block.input)      # 真正执行它
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,       # 用 id 把结果和请求对上号
                    "content": output,
                })

        # ④ 喂回：把工具结果作为新一轮的 user 消息塞回去
        messages.append({"role": "user", "content": tool_results})

    return "（已达最大轮次）"
```

## 3.4 第 4 块：加个对话入口

```python
if __name__ == "__main__":
    print("🤖 Mini Agent 已启动（输入 quit 退出）")
    while True:
        q = input("\n👤 你：")
        if q.strip().lower() == "quit":
            break
        print(f"\n🤖 {run_agent(q)}")
```

**就这些。** 把这四块拼起来，一个真能干活的 Agent 就诞生了。核心循环部分（第 3 块）满打满算不到 30 行。

---

# 四、它跑起来是什么样

```
🤖 Mini Agent 已启动（输入 quit 退出）

👤 你：这个目录里有哪些文件？挑个 .py 告诉我它在干嘛。

  [模型调用 list_files(directory=".")]
  [模型调用 read_file(path="agent.py")]

🤖 这个目录里有 agent.py、mock_llm.py、README.md。
   其中 agent.py 是核心，它定义了两个工具并实现了一个带轮次上限的 Agent 循环……
```

你让它做的只是一句话，它自己**列了目录、挑了文件、读了内容、给了答案**——转了好几圈循环，全程没有一步是你写死的。回头看第 02 章那张循环图，是不是一下就对上了？

---

# 五、常见错误（新手 100% 会踩）

❌ **错误 1：忘了把模型的回复 append 回 messages。**
很多人执行完工具就直接喂结果，漏了先把 `assistant` 的回复（含 tool_use 请求）加进去。结果 API 报错"tool_result 找不到对应的 tool_use"。**顺序必须是：先 append 模型回复，再 append 工具结果。**

❌ **错误 2：`tool_use_id` 没对上。**
工具结果必须带上对应请求的 `id`（`tool_use_id`）。模型一圈可能调多个工具，靠这个 id 才能把"哪个结果对应哪个请求"对上号。复制粘贴时最容易把这个搞丢。

❌ **错误 3：工具函数抛异常，整个程序崩了。**
比如模型让你 `read_file("不存在.txt")`，函数直接抛 `FileNotFoundError`，程序当场退出。**正确做法是把异常捕获、当成普通结果喂回去**（"读取失败：文件不存在"），让模型自己换条路。demo 里演示了这种写法。

❌ **错误 4：`stop_reason` 判断写错。**
得用 `resp.stop_reason == "tool_use"` 来判断"模型还想调工具"。判断条件写反，要么死循环，要么工具永远不执行。

---

# 六、最佳实践

✅ **从最小开始，能跑了再加。** 先让两个工具跑通，再考虑加 `write_file`、`run_command`……一上来堆十个工具，出了 bug 都不知道在哪。

✅ **工具函数里做好异常处理**，把错误转成给模型看的文字，而不是让程序崩溃。这是 demo 到产品的第一道分水岭。

✅ **打印工具调用过程**（哪怕只是简单 print）。看不见 Agent 在调什么工具，调试就是抓瞎。

✅ **给工具描述（description）写清楚"什么时候该用我"**，而不只是"我是什么"。模型选不选你这个工具，全看这句话。

---

# 七、总结

- 一个能干活的 Agent = **工具函数（手）+ 工具 schema（说明书）+ 核心循环（心跳）+ 对话入口**。
- 工具就是**普通函数**，没有魔法；模型靠 schema 的文字描述来决定用哪个。
- 拼接顺序的坑（先 append 模型回复、对齐 tool_use_id、捕获异常）是新手必踩的，记牢能省好几小时。
- 你现在已经有一个**可运行的 mini Agent** 了——入门篇到此打通，恭喜！

接下来进入**核心机制篇**。第 04 章我们先把"工具"这块做深：当工具从 2 个变成 10 个，怎么让模型选得准、调得对、错了能恢复。

> 📁 **对应 Demo**：`03-minimal-harness-demo/` —— 提供真实 SDK 版（`agent.py`）和离线 mock 版（`agent_mock.py`），后者无需 Key 直接跑。

---

<!-- knowledge-lab-merged -->

# 动手实践：最小 Harness：50 行跑通第一个 Agent

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
