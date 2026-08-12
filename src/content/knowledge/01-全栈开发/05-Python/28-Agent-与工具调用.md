# Python（28） - Agent 与工具调用

> 读完你能：围绕“Agent 与工具调用”理解“零、本篇在阶段五里的位置”与“先建立前端锚点：tool use ≈ 给模型一张「函数注册表」”，并结合正文示例完成实践与排障。

> 前面 23~26 篇里，模型一直是个「关在盒子里的聪明人」——你问它答，它博学但**不能动手**：不能查实时天气、不能读你数据库、不能算一道它没把握的数学题。本篇解决的就是「让模型能动手」这件事。核心是三个概念：**tool use（工具调用）**——给模型注册一组它能调的函数；**ReAct**——让模型在「思考 → 调工具 → 看结果 → 再思考」之间循环；**多步推理**——这个循环带着记忆跑下去，直到把任务做完。一句话，Agent ≈ 一个 `while` 循环，循环体里模型反复调用你注册的函数，像你写前端时反复 `await fetch(...)` 再根据结果决定下一步。

# 一、零、本篇在阶段五里的位置

这是阶段五（AI 编程）依赖链的**终点**，前四篇全是它的地基：

| 篇 | 主题 | 给本篇提供了什么 |
|----|------|------------------|
| 23 | 调用大模型 API | 发请求、收回复、`messages` 数组（**Agent 的记忆就是这个数组**） |
| 24 | Prompt 工程 | function calling 的概念（≈ 函数注册表）、结构化输出 |
| 25 | embedding | 把文字变坐标（Agent 检索类工具会用到） |
| 26 | RAG | 检索 + 拼接 + 生成（RAG 本质是「只调一次检索工具」的最简 Agent） |
| **27（本篇）** | Agent 与工具调用 | 把上面全串起来：注册工具 + 循环调用 + 多步推理 |

如果 23 篇的「`messages` 是你自己维护的对话历史」还没读透，建议回去补一下——本篇 Agent 的「记忆」「多步」全靠操作这个数组实现。

---

# 二、先建立前端锚点：tool use ≈ 给模型一张「函数注册表」

你在前端写过「事件 → 回调」「命令 → 处理函数」这种映射吧？比如一个命令面板：

```javascript
// JavaScript：一张「命令名 → 处理函数」的注册表，典型的前端模式
const handlers = {
  getWeather: (city) => fetch(`/api/weather?city=${city}`).then(r => r.json()),
  searchDoc: (kw) => fetch(`/api/search?q=${kw}`).then(r => r.json()),
}
// 来了个命令名，就去表里找对应函数来调
const result = await handlers[cmd.name](./28-Agent与工具调用/...cmd.args)
```

**tool use 就是把这张表交给大模型**：你告诉模型「我这有 `getWeather` 和 `searchDoc` 两个函数，各自要什么参数」，模型在需要时**不直接执行**（它执行不了），而是回你一句：「请帮我调 `getWeather('北京')`」。真正的执行还是你的代码干，执行完把结果再喂回给模型。

```
你（代码）                          模型
─────────                          ─────
1. 注册工具表 + 用户问题  ───────►  
                                   2. "我需要 getWeather('北京')"
3. 真正执行 getWeather('北京')  ◄───  （模型只会"点菜"，不下厨）
   拿到 {temp: 12, ...}
4. 把结果喂回去  ───────────────►  
                                   5. "北京现在12度，记得加件外套"
```

> 类比 → 边界：**类比**——注册表的形态、「按名字找函数」的思路，和前端命令模式一模一样。**边界**——关键差异是「谁决定调哪个」。前端是你写死的 `handlers[cmd.name]`，调度逻辑在你代码里；这里是**模型自己决定**调哪个、传什么参数、甚至调不调。你交出去的不只是函数表，还有「调度权」。这是 Agent 和普通程序最本质的不同：控制流由模型动态决定，不是你预先写死的 `if/else`。

---

# 三、tool use 实操：注册一个工具，让模型来点菜

接着第 24 篇的 function calling 往下走，看完整代码。OpenAI 的 `tools` 参数要求你用 **JSON Schema** 描述每个函数（描述「形状」，回忆第 24 篇 Pydantic 转 schema 那套）：

```python
from openai import OpenAI
import json

client = OpenAI()  # client：SDK 客户端，自动读环境变量 OPENAI_API_KEY

# get_weather：真正干活的本地函数。模型不会执行它，只会"请求"我们执行
# city：城市名，模型从用户问题里抽取后填进来
def get_weather(city: str) -> dict:
    """查询某城市天气（这里用假数据演示，真实场景是调天气 API）"""
    # 真实项目这里会 requests.get(天气接口)，本篇为聚焦逻辑用写死的数据
    fake_db = {"北京": 12, "上海": 18, "广州": 25}  # fake_db：城市→温度的假数据库
    return {"city": city, "temp_c": fake_db.get(city, 20)}  # 返回温度（找不到给默认 20）

# tools：交给模型的"函数注册表"。每个元素描述一个可调函数的名字/用途/参数 schema
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",                       # name：函数名，必须和上面的 Python 函数对得上
            "description": "查询指定城市的当前温度",        # description：用途说明，模型靠它判断"该不该调这个"
            "parameters": {                              # parameters：参数的 JSON Schema（≈ TS 类型声明）
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市名，如 北京"},  # city 参数的类型与说明
                },
                "required": ["city"],                    # required：哪些参数必填
            },
        },
    }
]
```

发起请求，把工具表一起带上：

```python
# messages：对话历史（第 23 篇的核心）。Agent 的"记忆"就是它，后面会不断往里 append
messages = [{"role": "user", "content": "北京现在穿外套合适吗？"}]

# resp：本次请求的完整响应对象，模型的回复藏在 resp.choices 里
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=messages,
    tools=tools,          # 关键：把函数注册表交给模型
)

choice = resp.choices[0]  # choice：第一个候选回复
# finish_reason：本次为什么停下。"tool_calls" 表示"模型想调工具"，"stop" 表示"它直接答完了"
print(choice.finish_reason)  # 这里大概率是 tool_calls
```

模型不会直接回答天气，而是回一个**调用请求**，藏在 `message.tool_calls` 里：

```python
msg = choice.message  # msg：模型这一轮的回复消息
# tool_calls：模型想调的工具列表（可能一次想调多个）。它是 None 时表示模型直接给了文本答案
for call in msg.tool_calls:
    print(call.id)                  # call.id：本次调用的唯一标识，回传结果时要用它对上号
    print(call.function.name)       # 模型想调的函数名，如 "get_weather"
    print(call.function.arguments)  # 参数，注意是 JSON 字符串！如 '{"city": "北京"}'，不是 dict
```

> 易踩坑：`call.function.arguments` 是**字符串**，不是 dict，要 `json.loads` 才能用——这点和第 24 篇「模型返回 JSON 字符串」一脉相承。模型负责「填表」，类型转换是你的事。

---

# 四、把结果喂回去：一轮完整的工具调用闭环

拿到模型的「点菜单」后，流程是：① 真正执行函数；② 把执行结果作为一条 **`role: "tool"`** 的消息塞回 `messages`；③ 再请求一次，模型这次就能基于结果给出最终答案。

```python
# 第①步：执行模型点的菜
tool_call = msg.tool_calls[0]                       # 取第一个工具调用
args = json.loads(tool_call.function.arguments)     # args：把 JSON 字符串参数解析成 dict
result = get_weather(**args)                         # 真正调用本地函数，** 把 dict 展开成关键字参数

# 第②步：把"模型的点菜消息"和"执行结果"都追加进 messages（顺序不能乱）
# 先 append 模型那条带 tool_calls 的 assistant 消息，告诉模型"我收到你的请求了"
messages.append(msg)
# 再 append 一条 role=tool 的消息，承载执行结果
messages.append({
    "role": "tool",                          # role=tool：专门用于回传工具执行结果的角色
    "tool_call_id": tool_call.id,            # 关键：用 call.id 对上是哪次调用的结果（可能并发多个）
    "content": json.dumps(result),           # content：结果文本，习惯上序列化成 JSON 字符串
})

# 第③步：带着"问题 + 点菜记录 + 执行结果"再请求一次，模型这次能直接答了
# final：第二轮请求的响应，此时模型已拿到工具结果，会给出最终自然语言回答
final = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=messages,
    tools=tools,
)
print(final.choices[0].message.content)  # 如："北京现在 12 度，偏凉，建议加件外套"
```

回头看 `messages` 现在长这样，你就明白「记忆」是怎么回事了——它就是一个不断变长的数组：

```
[
  {role: "user",      content: "北京现在穿外套合适吗？"},   ← 用户问题
  {role: "assistant", tool_calls: [get_weather("北京")]},  ← 模型点菜（无文本，只有调用）
  {role: "tool",      content: '{"city":"北京","temp_c":12}'}, ← 我们回传的执行结果
  ... 下一步模型基于以上全部内容继续 ...
]
```

> 类比 → 边界：**类比**——这跟你前端「发请求 → 拿响应 → 把响应塞进 state → 重新渲染」的单向数据流神似，`messages` 数组就是那个 state。**边界**——前端 state 你想怎么改都行；这里 `messages` 的**顺序和配对是有硬约束的**：带 `tool_calls` 的 assistant 消息后面，必须紧跟对应 `tool_call_id` 的 tool 消息，缺了或乱序模型 API 会直接报错。这是新手最常见的坑之一。

---

# 五、ReAct：把单轮闭环变成「带记忆的循环」

上面只调了**一轮**工具。但真实任务往往要调多次：「查北京天气，再查上海天气，比较一下哪边更冷」——模型得调两次 `get_weather`，看完两个结果才能比较。

**ReAct**（Reason + Act，推理 + 行动）就是这件事的范式：让模型在一个循环里反复「思考下一步 → 行动（调工具）→ 观察结果 → 再思考」，直到它认为任务完成、不再点菜为止。

```javascript
// JavaScript 伪代码：你其实写过这种"轮询到满足条件才停"的循环
let state = initial
while (!done(state)) {        // 没完成就继续
  const action = decideNext(state)   // 想下一步干啥
  const obs = await doAction(action)  // 真去做，拿结果
  state = update(state, obs)          // 把结果并进状态
}
return state
```

Agent 主循环和它**结构完全一样**，只是「想下一步」交给了模型，「做」是执行工具：

```python
def run_agent(user_input: str, max_steps: int = 5) -> str:
    """
    运行一个最简 ReAct Agent，返回最终回答。
    user_input：用户的原始问题。
    max_steps：最多循环几步，防止模型陷入死循环（关键的安全阀，见下文边界）。
    """
    # messages：Agent 的记忆，整个循环里持续累加，是"带记忆"的来源
    messages = [{"role": "user", "content": user_input}]

    # name_to_func：函数名 → 真实 Python 函数的映射，即第一节说的"注册表"
    name_to_func = {"get_weather": get_weather}

    # 主循环：每一圈就是一次"思考 → (可能)行动 → 观察"
    for _ in range(max_steps):
        # resp：本圈请求模型的响应；msg 是从中取出的模型回复消息
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=tools,
        )
        msg = resp.choices[0].message
        messages.append(msg)  # 把模型这轮回复（不管是点菜还是答案）先记进记忆

        # 分支：模型没有要调工具 → 说明它认为任务完成了，直接返回最终文本
        # 这是循环的"出口条件"，对应前端 while 的 !done(state)
        if not msg.tool_calls:
            return msg.content

        # 分支：模型要调一个或多个工具 → 逐个执行并把结果喂回去
        for call in msg.tool_calls:
            func = name_to_func[call.function.name]   # 按名字从注册表取出真实函数
            args = json.loads(call.function.arguments)  # 解析参数（仍是 JSON 字符串）
            observation = func(**args)                  # observation：工具执行结果，即 ReAct 里的"观察"
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,                # 用 id 对上是哪次调用
                "content": json.dumps(observation, ensure_ascii=False),  # 回传结果
            })
        # 这一圈结束，带着新观察结果回到 for 顶部，让模型继续思考下一步

    # 兜底：循环跑满 max_steps 还没结束，强制收尾，避免无限调用烧钱
    return "（达到最大步数，未能完成任务）"
```

把上面的循环画出来，就是 Agent 的全貌：

```
        ┌──────────────────────────────────────────┐
        │                                          │
        ▼                                          │
   ┌─────────┐   想调工具？   ┌──────────┐   把结果   │
   │ 模型思考 │ ────yes────► │ 执行工具  │ ──喂回去──┘
   └─────────┘              └──────────┘
        │ no（不再点菜）
        ▼
   返回最终答案
```

> 类比 → 边界：**类比**——这就是个 `while` 循环，「带记忆」指的是 `messages` 一直不清空、越滚越长，模型每轮都能看到全部历史。**边界**——和前端 `while` 有两个要命的差异：① **每一圈都是一次付费 API 请求**，循环 5 圈就是 5 次调用，token 还在累积变贵，所以 `max_steps` 不是可选项而是必需的安全阀（前端死循环顶多卡浏览器，这里死循环是烧钱）；② 循环能不能停**由模型决定**，不是你的确定性条件，模型可能「想不通」一直点菜，`max_steps` 就是你强行拉闸的开关。

---

# 六、多步推理：循环跑起来后到底发生了什么

「多步推理」不是什么新机制，它就是第四节那个循环**实际转了多圈**的结果。拿「比较北京和上海哪边更冷」举例，循环内部的真实轨迹：

```
第 1 圈：模型思考"要比较，得先有两地温度" → 点菜 get_weather("北京")
        我们执行 → 喂回 {temp_c: 12}
第 2 圈：模型看到北京12度 → "还差上海" → 点菜 get_weather("上海")
        我们执行 → 喂回 {temp_c: 18}
第 3 圈：模型看到两个结果都齐了 → 不再点菜，直接答
        "北京12度、上海18度，北京更冷。" → finish_reason=stop，循环退出
```

关键体会：模型**不是一开始就规划好全部步骤**，而是走一步看一步——每拿到一个观察结果，才决定下一步干啥。这正是「Reason + Act」交替的含义，也是它能处理事先不知道要几步的任务的原因。

> 对照前端：很像你写的「分页拉取直到没有下一页」——你事先不知道要拉几次，每次拿到响应看 `hasMore` 再决定要不要继续。区别是这里的「要不要继续」是模型基于语义判断的，比 `hasMore` 这种布尔标志灵活得多，但也更不可控。

## 6.1 几个工程上必须知道的点

1. **上下文会膨胀**：每圈都往 `messages` 里塞东西，转得越多数组越大，token 成本越高、还可能撞上模型上下文长度上限。长任务要考虑裁剪历史或做摘要。
2. **工具会失败**：`get_weather` 调真实 API 会超时、报错。别让异常炸穿循环，而是把错误信息**当作一种观察结果喂回给模型**，让它自己决定重试还是换路子：

```python
try:
    observation = func(**args)            # 正常执行
except Exception as e:
    # 业务场景：工具执行失败时，不抛出去中断 Agent，而是把错误描述喂回模型
    # WHY：模型看到"这个工具报错了"后，往往能自己改参数重试或换工具，比直接崩溃更健壮
    observation = {"error": str(e)}
```

3. **别盲目信任模型点的菜**：模型可能传非法参数、调本不该调的工具。涉及写数据库、发消息、花钱的「危险工具」，执行前要做校验甚至人工确认（这点和你前端「危险操作弹二次确认框」一个道理）。

---

# 七、不用裸写循环：框架与现成方案

上面手写循环是为了讲清原理。真实项目里你通常会用现成框架，它们把循环、工具注册、错误处理、历史管理都封好了——**就像前端你不会裸写 `XMLHttpRequest`，而是用 axios / React Query**。

| 你想要的 | 前端类比 | Python 生态常见选择 |
|----------|----------|---------------------|
| 封装好的 Agent 循环 | React Query 帮你管请求状态 | LangChain、LlamaIndex 的 Agent |
| 把 Python 函数自动转成工具 schema | 装饰器自动注册路由 | 框架的 `@tool` 装饰器（少写手搓 JSON Schema） |
| 多 Agent 协作编排 | 状态机 / 工作流引擎 | LangGraph 等 |

但**先吃透手写版再上框架**——否则框架报错时你会完全不知道发生了什么。本篇的循环就是所有框架内部的核心，框架只是替你把它和一堆周边能力打包了。

> 一句话边界：框架降低的是「写样板代码」的成本，**不降低**你对「模型无状态、记忆靠 messages、循环要有上限、工具会失败」这些本质的理解需求。这些是地基，框架是楼。

---

# 八、总结

Agent 没有魔法，它就是**第 23 篇的「发请求」 + 第 24 篇的「函数注册表」 + 一个带记忆的 `while` 循环**。模型负责「点菜」（决定调哪个工具、传什么参数），你的代码负责「下厨」（真正执行）并把结果喂回去；循环转到模型不再点菜，任务就完成了。从前端视角看，这套东西你其实早就熟悉——注册表、单向数据流、轮询到满足条件才停的循环，只是「下一步干啥」的决策权交给了模型。

✅ **该掌握**
- tool use 三件套：`tools`（JSON Schema 描述函数）→ 模型回 `tool_calls`（点菜）→ 你执行后用 `role:"tool"` + `tool_call_id` 把结果喂回去
- ReAct 主循环：`while` 里反复「请求模型 → 没点菜就返回 / 点了菜就执行并回传」，记忆就是不断累加的 `messages`
- 多步推理 = 循环转了多圈，模型走一步看一步，每拿到一个观察才决定下一步
- 必须有 `max_steps` 安全阀；工具异常要捕获后当观察喂回，而非炸穿循环

⚠️ **易混淆**
- **模型不执行工具**：它只「请求」调用，真正执行永远是你的代码——它会点菜，不会下厨
- **`arguments` 是字符串**：`call.function.arguments` 要 `json.loads` 才是 dict
- **messages 顺序有硬约束**：带 `tool_calls` 的 assistant 消息后必须紧跟对应 `tool_call_id` 的 tool 消息，乱序/缺失会报错
- **循环 ≠ 免费**：每圈都是一次付费请求且 token 累积，死循环是烧钱不是卡浏览器，`max_steps` 是必需而非可选
- **记忆靠 messages，模型本身无状态**：这点从第 23 篇贯穿到这里，是整个阶段五的底层共识

## 参考资料

- [Python 3 文档](https://docs.python.org/3/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
