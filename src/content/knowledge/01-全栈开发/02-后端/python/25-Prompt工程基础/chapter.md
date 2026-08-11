# Python（24）- Prompt 工程基础

> 上一篇你已经会用 SDK 把消息发给大模型、拿到一段文本回来（第 23 篇）。但很快你会撞到三个真实问题：① 模型答得「飘」，时灵时不灵；② 你想要的是能 `JSON.parse` 的结构化数据，它却返回一段散文；③ 你想让模型「查个天气再回答」，但它根本没法上网。本篇把这三件事一次讲透——Prompt 不是玄学咒语，它本质是**给模型写「调用契约」**；结构化输出 ≈ 给返回值套上 TS 类型；函数调用（function calling）≈ 给模型注册一张「函数注册表」，让它决定调哪个。这也是后面第 25~27 篇做 Embedding / RAG / Agent 的地基。

阶段五依赖链先对齐：**23（调 API）→ 24（本篇·结构化输出 + 函数调用）→ 25（Embedding）→ 26（RAG）→ 27（Agent）**。本篇是从「能聊天」跨到「能干活」的关键一步。

---

# 一、先给锚点：Prompt ≈ 给函数传参 + 写接口契约

前端调后端接口时，你会做三件事：选对 endpoint、传对参数、约定好返回结构。和大模型交互几乎一一对应——只不过「参数」是自然语言，「返回结构」要靠提示词去约束。

先回顾第 23 篇的最小调用，建立锚点：

```python
from openai import OpenAI

client = OpenAI()   # client：SDK 客户端实例，自动读环境变量 OPENAI_API_KEY 拿密钥

# messages：对话上下文列表，每条是 {role, content}；role 有三种，见下文
resp = client.chat.completions.create(
    model="gpt-4o-mini",           # model：选用的模型，类比选哪个 API 版本
    messages=[
        {"role": "system", "content": "你是一个简洁的助手，只用一句话回答"},
        {"role": "user", "content": "Python 的 list 和 JS 的数组像吗？"},
    ],
    temperature=0.7,               # temperature：随机性旋钮，见第三节
)
# 取回复文本：choices[0] 是第一个候选回答，.message.content 是正文
print(resp.choices[0].message.content)
```

```javascript
// JS 对照（openai 的 node SDK，和 Python 形状几乎一样）
// 注意：Anthropic 的 SDK 形状不同——用 client.messages.create，system 是顶层参数而非 message，回复取 content[0].text
const resp = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: '你是一个简洁的助手，只用一句话回答' },
    { role: 'user', content: 'Python 的 list 和 JS 的数组像吗？' },
  ],
  temperature: 0.7,
})
console.log(resp.choices[0].message.content)
```

| 前端心智 | 大模型交互 | 说明 |
|----------|-----------|------|
| 接口的「全局配置/请求头」 | `system` 角色 | 设定身份、规则、输出格式（最稳定的指令位） |
| 一次请求的「请求体参数」 | `user` 角色 | 本轮你给的输入 |
| 服务端历史/会话状态 | `assistant` 角色 | 模型之前说过的话，回填进去 = 多轮记忆 |
| 接口返回的 JSON 结构 | 需用提示词/参数**显式约束** | 不约束就是自由文本，见第四节 |

> 边界（哪里不一样）：调后端接口，返回结构是**服务端代码写死的契约**，你传错参数会报 400。大模型不一样——它默认返回**自由文本**，你不约束它就「自由发挥」；而且同样的输入，多次调用结果可能不同（除非把 `temperature` 调到 0）。所以「Prompt 工程」要做的，就是用提示词 + 参数，把这个「不确定的文本生成器」逼成一个「行为可预期的接口」。

---

# 二、三种 role：system / user / assistant 怎么用

这三个角色是所有 Prompt 工程的骨架，务必分清职责。

```python
messages = [
    # system：全局规则，整段对话只放一条，放在最前。优先级最高、最稳定
    # 把「身份 + 规则 + 输出格式要求」都写这里，类比接口的全局中间件/配置
    {"role": "system", "content": "你是资深前端面试官，回答控制在 100 字内，用中文"},

    # user：用户输入。多轮对话里会有多条，按时间顺序排
    {"role": "user", "content": "讲讲事件循环"},

    # assistant：模型上一轮的回答。要实现「多轮记忆」，必须把它回填进 messages
    # 注意：API 是无状态的——它不记得你上次聊了啥，全靠你每次把历史带上
    {"role": "assistant", "content": "事件循环是 JS 单线程处理异步任务的机制……"},

    # 再追问，模型能结合上面的 assistant 内容理解「它」指什么
    {"role": "user", "content": "那它和宏任务微任务什么关系？"},
]
```

> ⚠️ 前端最容易踩的坑：以为 API 像聊天软件一样「记得上下文」。**它不记得**。HTTP 接口是无状态的，每一次 `create` 都是独立请求。多轮对话的「记忆」完全靠你**手动把历史 messages 全部重新发过去**。聊得越久，messages 越长，token 消耗越大——这也是为什么后面 RAG（第 26 篇）要做检索而不是把所有资料一股脑塞进去。

写 system prompt 的几条实用原则（类比写接口文档）：

- **明确角色与边界**：「你是 X，只做 Y，不做 Z」。比「你很厉害」有用一万倍。
- **给格式约束**：要 JSON 就说「只返回 JSON，不要解释」；要列表就说「用 markdown 无序列表」。
- **给例子（few-shot）**：在 system 或 user 里塞 1~2 个「输入→期望输出」示例，比纯文字描述更稳。这就是 few-shot prompting，类比「给后端同学一个示例 request/response 让他照着实现」。

---

# 三、temperature：随机性旋钮（类比 Math.random 的「强度」）

`temperature` 控制输出的随机程度。OpenAI Chat API 官方取值范围是 **0~2**，**默认值为 1**（注意：默认不是 0.7，0.7 只是常见的「平衡」取值）。

| temperature | 行为 | 适用场景 |
|-------------|------|----------|
| `0`（或接近 0） | 几乎确定性，同输入基本同输出 | 提取信息、分类、要结构化数据、要可复现 |
| `0.7` | 平衡，有一定多样性 | 普通问答、对话 |
| `1.0`（默认） | 默认值，较发散 | 通用场景 |
| `1.5+` | 更发散、有创意、也更易跑偏 | 头脑风暴、文案、起名 |

```python
# 业务场景：做「把用户输入分类成 bug/需求/咨询」这种确定性任务，必须把随机性压到最低
# WHY temperature=0：分类结果要稳定可复现，今天分对、明天分错是灾难
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "把用户反馈分类为 bug / feature / question 之一，只输出这一个单词"},
        {"role": "user", "content": "你们这个按钮点了没反应"},
    ],
    temperature=0,   # 确定性输出
)
print(resp.choices[0].message.content)   # 期望稳定输出：bug
```

> 类比 + 边界：你可以把 `temperature` 想成「`Math.random()` 的音量旋钮」——调到 0 就基本不随机。但**边界是**：即使 `temperature=0` 也不保证 100% 逐字一致（底层浮点、模型更新都可能带来微小差异），它只是「尽量确定」，不是 `===` 级别的确定。所以要结构化数据时，**光靠调 temperature 不够**，还得配合下一节的结构化输出手段。


---

# 四、结构化输出：让模型返回能 `JSON.parse` 的数据

这是前端转 AI 编程最实用的一招。你做应用，几乎不会想要一段散文，而是想要 `{ "name": "...", "age": 25 }` 这种能直接喂给前端、能 `.属性` 取值的对象。

## 4.1 最朴素的办法：提示词里要求 JSON（可用但不保险）

```python
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        # 在 system 里硬性约定输出格式，并给出字段
        {"role": "system", "content": "从用户的话里提取信息，只返回 JSON，字段为 name、age，不要任何多余文字"},
        {"role": "user", "content": "我叫小明，今年 25 岁"},
    ],
    temperature=0,
)
raw = resp.choices[0].message.content   # raw：模型返回的字符串，期望是一段 JSON 文本
import json
data = json.loads(raw)                  # 把 JSON 字符串解析成 Python dict，类比 JS 的 JSON.parse
print(data["name"], data["age"])        # 小明 25
```

> ⚠️ 这个写法**不保险**：模型有时会画蛇添足，回成 ` ```json\n{...}\n``` ` 带代码块围栏，或前面加一句「好的，结果如下：」，导致 `json.loads` 直接抛异常。所以纯靠提示词约束，你必须自己写容错（剥离围栏、try/except）。生产里别这么裸用。

## 4.2 开关式保险：`response_format` 强制 JSON

OpenAI 兼容 API 提供了一个参数，强制模型输出合法 JSON（JSON mode）：

```python
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        # 用了 json 模式时，提示里也要出现「JSON」字样，否则部分模型会报错——这是 API 的约定
        {"role": "system", "content": "提取 name 和 age，以 JSON 返回"},
        {"role": "user", "content": "我叫小明，今年 25 岁"},
    ],
    response_format={"type": "json_object"},   # 强制返回合法 JSON，不会再夹带散文/围栏
    temperature=0,
)
data = json.loads(resp.choices[0].message.content)   # 此时基本能保证 parse 成功
```

> 边界：`json_object` 模式只保证「是合法 JSON」，**不保证字段名/类型符合你的期望**——它可能把 `age` 返回成字符串 `"25"`，或漏掉字段。要连「形状」也锁死，得用下面的 Pydantic 方案。

## 4.3 最稳的工程做法：Pydantic 模型 + 解析（≈ 给返回值套 TS 类型 + zod 校验）

还记得第 15 篇里 FastAPI 用 Pydantic 校验请求体吗？同一套东西可以用来**校验模型的输出**。新版 openai SDK 提供了 `parse` 接口，直接把回复反序列化成 Pydantic 对象：

```python
from pydantic import BaseModel

# 定义期望的输出「形状」，等价于 TS interface + 运行时校验（详见第 15 篇）
class Person(BaseModel):
    name: str    # 姓名：必填，类型不对会校验失败
    age: int     # 年龄：必填，模型若返回 "25" 字符串，Pydantic 会尝试转成 int 25

# 用 .parse（结构化输出专用接口）；response_format 直接传 Pydantic 类
completion = client.chat.completions.parse(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "从用户的话里提取人物信息"},
        {"role": "user", "content": "我叫小明，今年 25 岁"},
    ],
    response_format=Person,   # 把「期望结构」作为契约传给模型，SDK 自动转 schema 下发
)
# .parsed 直接就是一个 Person 实例，不是字符串，无需手动 json.loads
person: Person = completion.choices[0].message.parsed
print(person.name, person.age)   # 小明 25，且 age 一定是 int
```

```typescript
// JS/TS 心智对照：你平时这样定义接口返回类型 + 用 zod 在运行时校验
import { z } from 'zod'
const Person = z.object({ name: z.string(), age: z.number() })
type Person = z.infer<typeof Person>
// 拿到模型返回后：Person.parse(rawData) —— 校验不过就抛错
```

> 类比 + 边界：Pydantic 模型在这里扮演的角色，和你在前端用 zod 校验后端返回 / 表单数据**几乎一模一样**——定义形状、运行时校验、不符合就报错。差异在于：这里它还会被 SDK 翻译成 JSON Schema **下发给模型**，相当于把「我要的返回类型」写进了请求契约，模型照着填。这是目前最稳的结构化输出姿势，优先用它。


---

# 五、函数调用（function calling）：给模型注册一张「函数注册表」

这是本篇最重要的概念，也是第 27 篇 Agent 的内核。

## 5.1 先想通：模型为什么需要「调用函数」

模型本身**不能上网、不能查数据库、不能读你的本地文件**——它只是个文本生成器。所以遇到「北京今天天气怎样」「查一下订单 123 的状态」这类问题，它没法凭空知道。

function calling 的思路：**你把一组可用函数的「说明书」告诉模型，模型不直接执行，而是返回「我想调哪个函数、传什么参数」，由你的代码去真正执行，再把结果喂回去。**

> 类比：这完全就是前端的**事件回调 / 函数注册表**模式。你给某个库注册一堆回调（`on('click', fn)`），库在合适时机告诉你「该触发哪个了」，但真正跑函数的是你的环境。这里模型扮演「决定调哪个」的大脑，**执行权始终在你手里**——模型只会说「请帮我调 get_weather('北京')」，绝不会自己偷偷联网。

## 5.2 三步闭环（记住这个循环，第 27 篇的 Agent 就是它套上 while）

```
1. 你下发：用户问题 + 函数清单（tools）
2. 模型回：我要调 get_weather，参数 {"city": "北京"}   ← 它不执行，只告诉你意图
3. 你执行 get_weather("北京") 拿到结果，再把结果发回去 → 模型据此生成最终回答
```

## 5.3 完整代码：注册一个查天气函数

```python
import json
from openai import OpenAI

client = OpenAI()

# 第一步：定义真正干活的本地函数（这才是会被执行的代码）
# 用途：根据城市名返回天气；真实场景这里会调第三方天气 API，demo 里写死
def get_weather(city: str) -> dict:
    # city：要查询的城市名。返回一个 dict，模拟天气服务的响应
    return {"city": city, "temp": 28, "desc": "晴"}

# 第二步：写「函数说明书」（tools）下发给模型——这是给模型看的，不是给 Python 看的
# 结构是固定的 JSON Schema：告诉模型函数叫什么、干嘛的、要哪些参数、参数什么类型
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",                    # 必须和上面真实函数名对应，方便你分发
            "description": "查询某个城市的实时天气",      # WHY 重要：模型靠这句话判断「该不该调它」
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "城市名，如 北京"},
                },
                "required": ["city"],                  # 标明 city 是必填参数
            },
        },
    }
]

# 第三步：发起对话，把 tools 一起带上
messages = [{"role": "user", "content": "北京今天天气怎么样？"}]
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=messages,
    tools=tools,            # 把函数清单交给模型，它自行决定要不要调
)
msg = resp.choices[0].message   # msg：模型这一轮的回复对象

# 分支判断：模型可能直接回答（普通文本），也可能要求调函数
# tool_calls 不为空 = 模型决定调函数（业务场景：它判断需要外部数据才能回答）
if msg.tool_calls:
    messages.append(msg)                    # 先把模型「要调函数」的这条消息存进历史
    for call in msg.tool_calls:             # 可能一次要调多个函数，逐个处理
        # 模型给的参数是 JSON 字符串，要 parse 成 dict
        args = json.loads(call.function.arguments)
        # 按函数名分发到真实函数（这里只有一个，复杂场景用 dict 做路由表）
        if call.function.name == "get_weather":
            result = get_weather(**args)    # 真正执行，**args 把 {"city":"北京"} 展开成关键字参数
        # 把执行结果作为一条 role=tool 的消息回填，tool_call_id 要对应上是哪次调用
        messages.append({
            "role": "tool",
            "tool_call_id": call.id,
            "content": json.dumps(result, ensure_ascii=False),
        })
    # 第四步：带着函数结果再请求一次，模型据此生成给用户看的自然语言回答
    final = client.chat.completions.create(model="gpt-4o-mini", messages=messages)
    print(final.choices[0].message.content)   # 例如：北京今天晴，气温 28 度
else:
    # 模型觉得不用调函数，直接就是答案
    print(msg.content)
```

## 5.4 关键认知

| 误区 | 真相 |
|------|------|
| 「模型会自己执行函数」 | ❌ 模型只返回**意图**（调谁、传什么），执行永远是你的代码 |
| 「写了 tools 模型就一定会调」 | ❌ 调不调由模型判断，简单问题它直接答；靠 `description` 写清楚来引导 |
| 「参数是 dict 直接能用」 | ❌ `call.function.arguments` 是 **JSON 字符串**，要先 `json.loads` |

> 边界 + 前瞻：function calling 是「一问一调一答」的单步。把它放进一个 **while 循环**——「模型思考 → 调工具 → 拿结果 → 再思考 → 再调…直到它说『不用调了，这是最终答案』」——就是第 27 篇的 **ReAct / Agent**。所以本篇这套三步闭环吃透了，Agent 那篇就只是「给它套个带记忆的循环」而已。


---

# 六、前端新手最容易踩的几个坑

1. **以为 API 有记忆**。它无状态，多轮对话必须自己回填全部历史 messages（见第二节）。
2. **裸用提示词要 JSON 不做容错**。模型爱加代码块围栏、加前言，`json.loads` 直接炸。优先用 `response_format` 或 Pydantic `.parse`（第四节）。
3. **把 Prompt 当咒语堆形容词**。「你是世界顶级专家」没用。有用的是：明确角色边界、给输出格式、给 1~2 个例子（few-shot）。
4. **忘了 token 是要花钱的**。messages 越长越贵越慢，长上下文别无脑全塞——这正是 RAG（第 26 篇）存在的理由。
5. **以为 function calling 模型会自己跑函数**。它只给意图，执行在你手里；参数是 JSON 字符串要 parse。
6. **温度调了就以为结果稳定**。`temperature=0` 只是「尽量确定」，要锁结构还得靠 Pydantic 校验。

---

# 七、和前端的整体对照速查

| 前端做法 | AI 编程对应 | 篇内位置 |
|----------|-------------|----------|
| 接口全局配置 / 中间件 | `system` 消息 | 第二节 |
| 会话状态 / 历史记录 | 回填 `assistant` 消息（手动） | 第二节 |
| `Math.random()` 强度 | `temperature` | 第三节 |
| `JSON.parse(res)` | `json.loads` / `response_format` | 第四节 |
| zod / TS interface 运行时校验返回 | Pydantic 模型 + `.parse` | 第四节 |
| `on('event', callback)` 注册回调 | `tools` 注册函数 schema | 第五节 |
| 库回调「该触发哪个了」 | 模型返回 `tool_calls` 意图 | 第五节 |

---

# 八、总结

Prompt 工程不是写咒语，而是**把一个「不确定的文本生成器」逼成「行为可预期的接口」**：用 role 组织上下文、用 temperature 控随机、用 Pydantic 锁结构、用 function calling 让它能调用你的代码干活。

✅ 该掌握
- 三种 role 的职责，以及「API 无状态、记忆靠手动回填历史」
- `temperature=0` 用于确定性任务（分类/提取），高温用于创意
- 结构化输出优先级：**Pydantic `.parse` > `response_format=json_object` > 裸提示词 + 容错**
- function calling 的「下发 tools → 模型给意图 → 你执行 → 回填结果 → 再生成」四步闭环

⚠️ 易混淆
- 模型**不执行**函数，只返回「调谁、传什么」的意图；执行权在你
- `tool_calls[i].function.arguments` 是 **JSON 字符串**，必须 `json.loads`
- `json_object` 模式只保证「合法 JSON」，不保证字段/类型对——要锁形状用 Pydantic
- `temperature=0` 是「尽量确定」不是「逐字一致」

下一篇：25 - 向量与 Embedding（把文字压成一串坐标，语义相近的点挨得近，检索 = 找最近的点；这是 RAG 的地基）。

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“Python（24）- Prompt 工程基础”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
