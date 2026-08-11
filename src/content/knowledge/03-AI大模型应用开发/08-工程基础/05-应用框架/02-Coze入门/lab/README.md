# 34 Coze 入门 demo

用纯 Python 标准库模拟 Coze「Bot + 插件（Plugin）」的调用流程：Bot 根据用户问题自己选插件、传参数，平台执行后用结果生成回答。

## 运行

```bash
python3 main.py
```

零依赖，纯标准库，离线可跑。

## 预期输出

```
=== 场景 1：问天气（命中天气插件）===
用户：北京今天天气怎么样？
  [Bot] 决定调用插件 get_weather({"city": "北京"})
  [插件] 返回：北京今天晴，12 到 24 度
Bot：为你查到：北京今天晴，12 到 24 度。

=== 场景 2：问股价（命中股票插件）===
用户：帮我查下 AAPL 股价
  [Bot] 决定调用插件 get_stock({"symbol": "AAPL"})
  [插件] 返回：AAPL 当前价格 $218.30
Bot：为你查到：AAPL 当前价格 $218.30。

=== 场景 3：问股价但没给代码（参数缺失被拦）===
用户：帮我看看那支股票涨了没
  [Bot] 决定调用插件 get_stock({"symbol": ""})
  [插件] 失败：插件 get_stock 缺少参数：symbol
Bot：抱歉，插件 get_stock 缺少参数：symbol。
```

同样的「Bot 选插件」机制，问天气走天气插件，问股价走股票插件，参数抽不全就被拦。

## 代码 ↔ 概念对应

| Coze 概念 | 在 main.py 哪里 |
|---|---|
| 插件市场 / 给 Bot 勾选的插件 | `PLUGINS` |
| 插件的「功能描述」（Bot 选插件的依据） | 每个插件的 `triggers` |
| Bot 自己决定调哪个插件 | `bot_select_plugin` |
| 模型从问题里抽插件参数 | `_extract_args` |
| 平台执行插件 + 参数校验 | `run_plugin` |
| Bot 用插件结果生成回答 | `bot_reply` |

## 真实 Coze 怎么用

这个 demo 是「代码版的 Coze Bot」。真实使用时：

1. 打开 Coze（coze.com 或国内 coze.cn），创建一个 Bot。
2. 在「插件」里从插件市场添加现成插件（天气、搜索、画图），或自己上传一个插件（本质是一段 HTTP API + OpenAPI schema 描述，对应 `PLUGINS` 的定义）。
3. 写 Bot 的人设和 Prompt，告诉它什么时候该用哪个插件（对应 `triggers`）。
4. 用户提问时，Coze 的模型读插件描述，自己决定调哪个、传什么参数（对应 `bot_select_plugin` + `_extract_args`），平台执行后把结果回填给模型生成回答。
5. 发布到豆包、飞书、微信等渠道。

Coze 和 Function Calling（第 28 篇）是同一套机制：模型只提议调哪个工具/插件，真正执行和校验在平台/后端。Coze 把它做成了可视化配置。

## 动手改

- 给 `PLUGINS` 加一个「翻译」插件，写好 `triggers`，看 Bot 能不能选中。
- 故意让一个插件的 `triggers` 和另一个重叠，观察 Bot 选错插件——这对应真实 Coze 里「插件描述写得含糊导致误调」。
- 把 `run_plugin` 里的 mock 数据换成真实 HTTP 请求（`urllib.request`），体验插件接外部 API。

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“34 Coze 入门 demo”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
