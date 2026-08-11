# 工程基础（34）- Coze 入门

> 读完你能：讲清 Coze「Bot + 插件」的运行机制（它和 Function Calling 是一回事），用一个纯 Python 的 mini Bot 跑通「选插件 → 抽参数 → 执行 → 回答」，并知道插件描述为什么是 Bot 选对插件的关键。

# 一、一个真实场景

运营同学想在飞书里放一个「行情小助手」：同事问「AAPL 现在多少钱」它报股价，问「北京下雨吗」它报天气，问别的就正常聊天。

这种「对话 + 调外部能力」的需求，用 Coze 几乎是拖出来的：建个 Bot，从插件市场勾上「股票查询」和「天气查询」两个插件，写两句人设，发布到飞书。十几分钟的事。

Coze 的定位和 Dify 类似（都是字节系低代码平台），但侧重点不同：**Dify 偏工作流和知识库，Coze 偏「Bot + 插件」生态——给一个对话机器人挂上各种外部能力。** 这一篇的核心就是搞懂：Bot 是怎么从一堆插件里挑对那一个的。

# 二、Bot 选插件，本质就是 Function Calling

如果你读过第 28 篇 Function Calling，Coze 的插件机制会非常眼熟，因为它就是同一套东西换了个可视化外壳：

```
你给 Bot 挂了 N 个插件（每个插件有名字、功能描述、参数定义）
              ↓
用户提问："北京今天天气怎么样"
              ↓
Bot（模型）读每个插件的功能描述，判断："这问题该调 get_weather"   ← 模型只提议
              ↓
Bot 从问题里抽出参数：{city: "北京"}
              ↓
Coze 平台真正执行插件（调外部 HTTP API）                        ← 执行在平台
              ↓
Bot 拿到结果，生成自然语言回答："北京今天晴，12 到 24 度"
```

关键认知和 Function Calling 完全一致：**模型只负责「提议调哪个插件、传什么参数」，真正的执行和参数校验在平台。** Coze 把 schema 定义、参数抽取、执行回填这些都封装成了配置项，但底下的逻辑没变。

# 三、插件描述是 Bot 选对插件的唯一依据

Bot 没读过你的代码，它凭什么知道「问天气该调 get_weather」？凭你给插件写的**功能描述**。描述就是模型做决策时唯一能看的东西。

在 demo 里我用「触发词」简化模拟这件事：

```python
PLUGINS = [
    {
        "name": "get_weather",
        "description": "查询某个城市的天气",
        "triggers": ["天气", "下雨", "气温"],  # Bot 据此判断该不该调
        "params": ["city"],
    },
    {
        "name": "get_stock",
        "description": "查询某支股票的最新价格",
        "triggers": ["股价", "股票", "涨", "跌"],
        "params": ["symbol"],
    },
]

def bot_select_plugin(message):
    """Bot 扫描每个插件的触发词，命中就选它（模拟模型读描述选插件）。"""
    for plugin in PLUGINS:
        if any(trigger in message for trigger in plugin["triggers"]):
            return {"name": plugin["name"], "arguments": _extract_args(message, plugin)}
    return None
```

真实 Coze 里这一步是模型读 `description` 自己判断，比触发词聪明，但原理一样：**描述写得清楚，模型选得准；描述含糊或两个插件描述重叠，模型就乱选。** 这是配 Coze 插件时最该花心思的地方。

# 四、参数抽不全要拦住，别让插件空跑

Bot 选对了插件，还得从问题里抽出插件要的参数。用户说「帮我看看那支股票涨了没」——选对了 `get_stock`，但没给股票代码，参数 `symbol` 是空的。这种必须拦：

```python
def run_plugin(call):
    """执行插件前先校验必填参数，缺参数直接拦下。"""
    plugin = next((p for p in PLUGINS if p["name"] == call["name"]), None)
    for field in plugin["params"]:
        if not call["arguments"].get(field):
            return {"ok": False, "error": f"插件 {call['name']} 缺少参数：{field}"}
    # 参数齐了才真正调插件后端 ...
```

拦下来之后，Bot 应该反问用户「你要查哪支股票」，而不是拿空参数去调 API 报一堆错。这就是 Function Calling 那篇讲的「参数校验」层，在 Coze 里同样不能少。

# 六、工程上真正会踩的坑

- **插件描述含糊导致误调**。两个插件描述都沾点边，模型分不清调哪个。描述要写明「什么场景用、什么场景不用」，必要时在 Bot 人设里补规则。
- **指望模型校验参数**。模型抽参数会漏、会错（把「那支股票」当成了股票名）。参数必填校验、格式校验必须在插件后端做，对应 demo 的 `run_plugin` 校验。
- **插件返回结构不稳定**。插件接的外部 API 偶尔超时或返回异常结构，Bot 直接把报错念给用户。插件后端要兜底，返回结构化的成功/失败，让 Bot 能把失败转成友好提示。
- **把所有能力都做成插件**。插件越多，模型选错的概率越高。能用一个插件参数区分的，别拆成多个插件。

# 七、一句话面试答法

> **Coze 的插件机制和 Function Calling 是什么关系？** 本质是同一套东西。Coze 给 Bot 挂插件，模型读插件的功能描述，自己决定调哪个、传什么参数，平台负责真正执行和参数校验——这就是 Function Calling 的「模型提议、后端执行」。Coze 只是把 schema 定义、参数抽取、执行回填封装成了可视化配置。配插件时最关键的是把功能描述写清楚，因为那是模型选对插件的唯一依据。

# 八、下一篇

`35-LangChain入门.md` —— Dify、Coze 是低代码平台，灵活度有天花板。需要用代码精细控制 chain、prompt、检索、工具时，就轮到 LangChain。下一篇用纯标准库实现 LangChain 几个核心概念的 mini 版，让你看清框架封装了什么。

# 九、总结

- **Bot 选插件，本质就是 Function Calling**：如果你读过第 28 篇 Function Calling，Coze 的插件机制会非常眼熟，因为它就是同一套东西换了个可视化外壳：
- **工程上真正会踩的坑**：插件描述含糊导致误调。
- **插件描述是 Bot 选对插件的唯一依据**：Bot 没读过你的代码，它凭什么知道「问天气该调 getweather」？
- **参数抽不全要拦住，别让插件空跑**：Bot 选对了插件，还得从问题里抽出插件要的参数。

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“Agent 工程（34）- Coze 入门”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
