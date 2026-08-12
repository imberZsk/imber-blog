# Python（24） - 调用大模型 API

> 读完你能：围绕“调用大模型 API”理解“零、本篇在阶段五里的位置”与“先建立前端锚点：SDK ≈ 封装好的 axios”，并结合正文示例完成实践与排障。

> 你在前端调后端接口，无非就是 `fetch` / `axios` 发个请求、拿 JSON、渲染。调大模型 API 本质上**完全一样**——只不过官方给你封了一个 SDK（≈ 一个 npm 包），让你不用手写 `fetch` 拼 headers。本篇解决三件事：怎么用 OpenAI / Claude 的 Python SDK 发一次对话请求；流式输出（打字机效果）在 Python 里怎么写、和前端的 `ReadableStream` / `EventSource` 有什么对应关系；以及新手最容易踩的几个坑（API Key、消息格式、同步 vs 异步）。

# 一、零、本篇在阶段五里的位置

阶段五（AI 编程）的依赖链是这样的，本篇是起点：

| 篇 | 主题 | 一句话 |
|----|------|--------|
| **23（本篇）** | 调用大模型 API | 学会发一次请求、收一次回复（含流式） |
| 24 | function calling | 给模型注册一组可调用函数（≈ 函数注册表） |
| 25 | embedding | 把文字压成一串坐标，语义相近的点挨得近 |
| 26 | RAG | 检索 + 拼接 + 生成 |
| 27 | Agent | 带记忆的 while 循环：思考 → 调工具 → 再思考 |

把本篇当成"最小可用形态"：能稳定发请求、能收流式输出，后面四篇全建在它上面。

---

# 二、先建立前端锚点：SDK ≈ 封装好的 axios

你在前端调第三方服务，从来不会裸写 `fetch`，而是装个官方 SDK：

```javascript
// JavaScript：装个 SDK，本质是帮你封好了 fetch / headers / 鉴权
import OpenAI from "openai"

const client = new OpenAI() // 自动读环境变量 OPENAI_API_KEY
const resp = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "你好" }],
})
console.log(resp.choices[0].message.content)
```

Python 这边几乎一一对应，只是语法换成 Python：

```python
# Python：openai 官方 SDK，pip install openai
from openai import OpenAI

# client：一个客户端实例，构造时不传 api_key 就自动读环境变量 OPENAI_API_KEY
client = OpenAI()

# resp：一次对话请求的完整响应对象
resp = client.chat.completions.create(
    model="gpt-4o-mini",                         # model：用哪个模型
    messages=[{"role": "user", "content": "你好"}],  # messages：对话历史（见第三节）
)
# .choices[0].message.content：取第一个候选回复的文本内容
print(resp.choices[0].message.content)
```

**核心切入点**：调大模型 = 发一个 HTTP POST 请求，SDK 帮你把鉴权、序列化、重试都封好了。心智模型和你调任何一个 RESTful 接口没区别。

## 2.1 边界：哪里和前端不一样

1. **默认是同步阻塞的**。上面 `client.chat.completions.create(...)` 没有 `await`——它是一行卡住的同步调用，直到模型回完才返回。前端 `fetch` 永远返回 Promise，Python 这里默认不是。想要 `await` 风格得用 `AsyncOpenAI`（见第五节）。
2. **没有"自动 await 顶层"那回事**。脚本里直接调就行，不需要包 `async function main()`。

---

# 三、安装与 API Key：别把密钥写进代码

```bash
pip install openai      # OpenAI 官方 SDK
pip install anthropic   # Claude（Anthropic）官方 SDK
```

API Key 是付费凭证，**绝对不要硬编码进代码、更不要提交到 git**（这点和前端把密钥写进前端代码一样是大忌，只是后果更直接——会被刷爆账单）。标准做法是放环境变量：

```bash
# 终端里设置（或写进 .env，再用 python-dotenv 加载）
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

```python
# 推荐：用 .env 文件 + python-dotenv，类比前端的 dotenv
from dotenv import load_dotenv  # pip install python-dotenv

load_dotenv()  # 读取项目根目录的 .env，把里面的键值塞进环境变量
# 之后 OpenAI() / Anthropic() 会自动从环境变量里读 key，无需显式传
```

> 对照前端：这就是你 Node 项目里 `import 'dotenv/config'` 那一套，思路完全一致。记得把 `.env` 加进 `.gitignore`。

---

# 四、messages：对话就是一个"角色数组"

`messages` 是调大模型最核心的概念。它是一个**数组**，每个元素是 `{role, content}`，描述一轮对话：

| role | 作用 | 类比 |
|------|------|------|
| `system` | 设定模型人设/规则，整段对话的"全局配置" | 像组件的 props 默认值 / 全局 config |
| `user` | 用户说的话 | 用户输入 |
| `assistant` | 模型之前说过的话 | 模型的历史回复 |

```python
# messages：一个对话历史数组。模型是"无状态"的——它不记得上一次聊了什么，
# 想让它有"记忆"，必须每次把完整历史都传进去（这点很反直觉，是新手最大的坑）
messages = [
    {"role": "system", "content": "你是一个简洁的助手，回答不超过两句话。"},  # 人设
    {"role": "user", "content": "Python 的列表和 JS 数组有啥区别？"},          # 第一轮用户
    {"role": "assistant", "content": "Python 列表更接近 JS 数组，但能混存任意类型。"},  # 模型上轮回复
    {"role": "user", "content": "那元组呢？"},                                  # 第二轮用户（依赖上文）
]

# resp：把完整对话历史发过去后拿到的响应对象
resp = client.chat.completions.create(model="gpt-4o-mini", messages=messages)
print(resp.choices[0].message.content)
```

**关键认知（容易踩坑）**：大模型 API 是**无状态**的，类似一个纯函数。它不像聊天 App 那样记得你。所谓"多轮对话"，是你自己在客户端维护那个 `messages` 数组，每次请求都把全部历史一起发过去。第 27 篇 Agent 的"记忆"本质就是在管理这个数组。

---

# 五、流式输出：打字机效果 ≈ 前端的 ReadableStream

非流式：等模型全部生成完，一次性返回整段——前端体验是"转圈几秒，然后唰一下全出来"。
流式：模型边生成边吐字，一个 token 一个 token 推给你——就是 ChatGPT 那种"打字机"效果。

前端你见过这个：`fetch` 返回的 `response.body` 是 `ReadableStream`，你用 `for await...of` 一块块读：

```javascript
// JavaScript：流式，开启 stream:true 后返回一个异步可迭代对象
const stream = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "讲个一句话笑话" }],
  stream: true,
})
// for await...of：一块块拿增量内容
for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content || ""
  process.stdout.write(delta) // 实时打印，不换行
}
```

Python 几乎是镜像——区别只是**同步版用普通 `for`**：

```python
# stream=True：开启流式。此时返回值不是完整响应，而是一个可迭代的"块"序列
stream = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "讲个一句话笑话"}],
    stream=True,  # 关键开关
)

# 普通 for 循环逐块消费（同步客户端用普通 for，不是 async for）
for chunk in stream:
    # delta.content：本块新增的文本片段，可能为 None（比如最后一块只带结束标记）
    delta = chunk.choices[0].delta.content
    # 业务场景：只有真正有文本时才打印，过滤掉 None 的收尾块
    if delta is not None:
        print(delta, end="", flush=True)  # end="" 不换行，flush 强制立刻输出，才有打字机效果
print()  # 全部结束后补一个换行
```

## 5.1 边界：和前端流式的差异

| | 前端 fetch 流式 | Python openai 流式 |
|--|----------------|--------------------|
| 迭代语法 | 永远 `for await...of`（异步） | 同步客户端用 `for`，异步客户端才用 `async for` |
| 拿到的块 | 原始字节，常要自己解析 SSE | SDK 已帮你解析成对象，直接取 `.delta.content` |
| 增量字段 | 自己拆 | 现成的 `chunk.choices[0].delta.content` |

> 一句话：SDK 已经把 SSE（Server-Sent Events）解析这层脏活干完了，你只管循环取增量。`flush=True` 是关键，否则 Python 会攒着一起输出，看不到逐字效果。

---

# 六、异步版：要 await 风格就用 AsyncOpenAI

如果你在 FastAPI（详见第 14 篇）里调大模型，路由是 `async def`，那就该用异步客户端，避免阻塞事件循环（async 心智模型详见第 17 篇，和 JS 单线程事件循环高度一致）：

```python
import asyncio
from openai import AsyncOpenAI  # 异步版客户端

client = AsyncOpenAI()  # 用法和同步版一样，只是方法都要 await

# chat：一次异步流式对话。async def 声明协程函数（详见第 17 篇）
async def chat():
    # await：等待请求建立；异步流式下返回的是"异步可迭代对象"
    stream = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "你好"}],
        stream=True,
    )
    # async for：异步逐块消费（对应 JS 的 for await...of）
    async for chunk in stream:
        delta = chunk.choices[0].delta.content  # 本块新增文本
        if delta is not None:
            print(delta, end="", flush=True)

asyncio.run(chat())  # 启动事件循环的入口（≈ JS 顶层 await）
```

**记忆口诀**：同步客户端配普通 `for`，异步客户端配 `async for`。混用会直接报错。

---

# 七、Claude（Anthropic）SDK：思路一样，两处不同

Claude 的 SDK 整体思路和 OpenAI 一致，但有两个**必须注意**的差异：

```python
from anthropic import Anthropic

client = Anthropic()  # 自动读环境变量 ANTHROPIC_API_KEY

# message：一次对话响应
message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,  # 差异1：max_tokens 是必填的（OpenAI 可不填），不传会直接报错
    # 差异2：system 是顶层独立参数，不放进 messages 数组里
    system="你是一个简洁的助手。",
    messages=[{"role": "user", "content": "你好"}],
)
# content 是一个"内容块"列表，取第一块的 .text 才是文本（不是 .message.content）
print(message.content[0].text)
```

流式 Claude 提供了更顺手的写法——用 `with` 上下文管理器（详见第 9 篇）配 `text_stream`：

```python
# with：上下文管理器，自动管理流的开启与关闭（类比 try/finally）
with client.messages.stream(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": "讲个一句话笑话"}],
) as stream:
    # text_stream：Anthropic 贴心封装的"纯文本增量"迭代器，直接给你文字，不用自己取 delta
    for text in stream.text_stream:
        print(text, end="", flush=True)
print()
```

OpenAI 与 Claude 速查对照：

| | OpenAI | Claude (Anthropic) |
|--|--------|--------------------|
| 入口方法 | `client.chat.completions.create` | `client.messages.create` |
| system 提示 | 放进 `messages` 数组 | 顶层独立 `system` 参数 |
| `max_tokens` | 可选 | **必填** |
| 取文本 | `resp.choices[0].message.content` | `message.content[0].text` |
| 流式纯文本迭代 | 自己取 `chunk.choices[0].delta.content` | `stream.text_stream` 直接给文字 |

---

# 八、错误处理：网络会抖、key 会错、额度会爆

调外部 API 一定要处理异常（异常机制详见第 7 篇 Java 对照 / 第 9 篇）。常见错误类型 SDK 都给了类，建议至少兜住鉴权错误和限流错误：

```python
from openai import OpenAI, AuthenticationError, RateLimitError, APIError

# client：同步客户端实例，自动读环境变量 OPENAI_API_KEY
client = OpenAI()

try:
    # resp：一次对话请求的响应对象，请求失败时不会赋值而是直接抛异常
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "你好"}],
    )
    print(resp.choices[0].message.content)
except AuthenticationError:
    # 业务场景：API Key 错误或失效，属于配置问题，重试无意义，要让用户检查 key
    print("鉴权失败，检查 OPENAI_API_KEY")
except RateLimitError:
    # 业务场景：触发限流或额度用尽，可做退避重试或排队
    print("被限流了，稍后重试")
except APIError as e:
    # 业务场景：兜底所有其他 API 侧错误（5xx、超时等）
    print(f"调用出错：{e}")
```

> 对照前端：等价于 `try { await axios(...) } catch (e) { if (e.response?.status === 401) ... }`。区别是 Python SDK 把状态码包成了具体的异常类，`except` 分支比判断 `status` 更语义化。

---

# 九、总结

调大模型 API 对前端来说几乎零门槛：**它就是一次封装好的 HTTP 请求**。SDK ≈ axios，`messages` ≈ 你手动维护的对话历史数组，流式输出 ≈ `ReadableStream` + `for await...of`。真正要刻进肌肉的就三点：模型无状态（记忆靠你传历史）、密钥进环境变量、流式记得 `flush`。

✅ **该掌握**
- `client.chat.completions.create(model, messages)` 发一次请求，`resp.choices[0].message.content` 取结果
- `messages` 三种 role：`system` / `user` / `assistant`，多轮对话靠自己累加数组
- 流式：`stream=True` + 同步 `for`（或异步 `async for`）+ `flush=True`
- API Key 放环境变量 + `.gitignore`，至少兜住 `AuthenticationError` / `RateLimitError`

⚠️ **易混淆**
- **模型无状态**：不传历史它就"失忆"，别以为它记得上一句
- **同步 vs 异步**：`OpenAI()` 默认同步阻塞（无需 await），`AsyncOpenAI()` 才用 await；`for` 配同步、`async for` 配异步，混用报错
- **OpenAI vs Claude**：Claude 的 `system` 是顶层参数、`max_tokens` 必填、取文本是 `content[0].text`
- **流式不 flush**：忘了 `flush=True` 会攒着一次性输出，看不到打字机效果

## 参考资料

- [Python 3 文档](https://docs.python.org/3/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
