# 工程基础（46）- 项目：前端 AI Copilot 组件

> 读完你能：讲清"嵌入式 Copilot"和"独立聊天页"的区别，把页面上下文、脱敏、trace 展示、人工确认这几件前端最擅长的事串成一个组件，并跑通一个嵌在订单页里的最小 Copilot。

# 一、一个真实场景

你维护一个订单管理后台。运营看着一个标着"异常"的订单发愣：为什么异常？该怎么处理？

传统做法是去翻文档、问客服、查另一个系统。Copilot 的做法是：页面右下角有个按钮，点开就能问"这个订单为什么异常"，助手**已经知道你正看着哪个订单**，直接结合这一页的数据回答，还能顺手帮你建工单。

这就是嵌入式 Copilot 和独立聊天页的根本区别——独立聊天页里，用户得把订单号、状态、客户名一个个复制粘贴进去；嵌入式 Copilot 直接读页面上下文，用户一句"这个订单"它就懂。**前端的价值在这里被放大了**：你不是做一个孤立的聊天框，你是把 AI 能力织进业务流程。

# 二、Copilot 的核心是"页面上下文 + 安全动作"，不是聊天框

很多人做 Copilot 第一反应是做个漂亮的聊天 UI。其实聊天 UI 是最不重要的部分。Copilot 真正要解决的是两件事：

| 能力 | 例子 | 谁的活 |
|---|---|---|
| 读懂当前页面 | "这个订单为什么异常" → 知道是哪个订单 | 前端收集上下文 |
| 安全地执行动作 | "建个工单" → 弹确认再执行 | 后端校验 + 前端确认 |

前端的两个关键职责：**采集上下文**和**承接确认**。

采集上下文，是前端主动决定上报哪些字段：

```js
function getPageContext() {
  return {
    route: "/orders/detail",
    selectedOrderId: document.getElementById("orderId").textContent,
    orderStatus: document.getElementById("orderStatus").textContent,
    // 注意：完整手机号、身份证这类敏感字段不放进来
  };
}
```

# 三、上下文必须脱敏，而且后端要再兜一层

页面上经常有敏感数据：完整手机号、身份证、银行卡。Copilot 把上下文发给后端（最终可能进模型 prompt），如果原样带上这些，就是数据泄露。

脱敏不能只靠前端自觉。前端可能漏、可能被改，所以**后端要再过一道白名单**：

```python
ALLOWED_CONTEXT_FIELDS = ["route", "selectedOrderId", "orderStatus", "customerName"]

def sanitize_context(raw):
    # 只保留白名单字段，前端多传的（含敏感字段）一律丢弃
    return {k: v for k, v in raw.items() if k in ALLOWED_CONTEXT_FIELDS}
```

demo 里做了个验证：前端故意往 pageContext 塞了个 `idCard`，后端 `sanitize_context` 直接把它丢了，根本没参与处理。这条"前端脱敏 + 后端白名单"的双保险，是 Copilot 区别于玩具 demo 的工程细节。

# 四、写操作：后端只返回"待确认"，前端来弹窗

Copilot 能建工单、改状态、发消息——这些都是写操作，不能让模型一句话就执行了。这里的协作很清楚：

```
用户说"建个工单"
   → 后端识别为写操作，不执行，返回 {needs_confirmation: true, action: {...}}
   → 前端收到后渲染一个确认区域（黄色卡片 + 确认/取消按钮）
   → 用户点"确认"，前端才发起真正的写请求
```

后端 `handle_copilot` 碰到写操作只返回 `needs_confirmation: true`，绝不直接落库。前端 `appendConfirm` 把它渲染成确认卡片。**执行权握在用户手里**，这是 Copilot 嵌进业务页面后必须守住的边界——它在你的真实系统里,误操作代价很高。

这个 demo 是个完整的小页面：一个订单详情页 + 一个嵌入式 Copilot。对应关系：

- `index.html` 的 `getPageContext`：前端采集页面上下文。
- `server.py` 的 `sanitize_context`：后端脱敏白名单。
- `handle_copilot`：结合上下文回答，写操作返回待确认。
- 前端 `appendConfirm`：渲染人工确认卡片。
- 前端 `appendMsg`：把后端 trace 展示给用户看，让 AI 的动作透明。

试两个操作最能体会差别：问"这个订单为什么异常"（它知道是哪个订单），和让它"建个工单"（弹确认而不是直接建）。

# 六、工程上真正会踩的坑

- **上下文只在前端脱敏**：前端代码用户可改、可能漏字段。后端必须有独立白名单兜底，别信前端传来的任何东西。
- **页面切换了上下文没更新**：用户从订单 A 跳到订单 B，Copilot 还在用 A 的上下文回答。要监听路由/选中项变化，及时刷新 context。
- **Copilot 报错把主页面带崩**：助手接口挂了，整个订单页白屏。Copilot 必须是旁路组件，`try/catch` 兜住，失败只在面板里提示，绝不影响主业务。
- **写操作确认做成了"假确认"**：弹个框但点不点都执行。确认必须是真的卡点——用户不点"确认"，写请求就不发出去。
- **trace 全藏起来**：用户不知道 Copilot 读了什么、做了什么，出了错没法判断。把"读取了哪些上下文、调了什么"展示出来，AI 才可信。

# 七、一句话面试答法

> **嵌入式 Copilot 和普通聊天机器人有什么不一样？** 普通聊天机器人是孤立的，用户得手动把信息喂进去。嵌入式 Copilot 直接读当前页面上下文，用户说"这个订单"它就懂。前端负责三件事：采集并脱敏页面上下文、展示执行过程 trace、承接写操作的人工确认。安全上我做了双保险——前端脱敏加后端白名单，写操作后端只返回待确认、前端弹窗用户点了才执行，且整个组件是旁路的，挂了也不影响主业务页面。

# 九、总结

- **Copilot 的核心是"页面上下文 + 安全动作"，不是聊天框**：很多人做 Copilot 第一反应是做个漂亮的聊天 UI。
- **工程上真正会踩的坑**：上下文只在前端脱敏：前端代码用户可改、可能漏字段。
- **上下文必须脱敏，而且后端要再兜一层**：页面上经常有敏感数据：完整手机号、身份证、银行卡。
- **写操作：后端只返回"待确认"，前端来弹窗**：Copilot 能建工单、改状态、发消息——这些都是写操作，不能让模型一句话就执行了。

<!-- knowledge-lab-merged -->

# 动手实践：46 前端 AI Copilot 组件

把 AI 助手嵌进一个真实的「订单详情」业务页面：右下角悬浮按钮唤起抽屉式 Copilot，它能读取**当前页面上下文**解释订单、展示执行过程 trace、写操作前弹**人工确认**。前端用原生 HTML/JS，后端用 Python 标准库 `http.server`。

## 运行

```bash
python3 server.py
```

然后浏览器打开 http://localhost:8046 ，点右下角蓝色 AI 按钮。

零依赖，纯标准库。

## 预期效果

页面是一个订单详情页（订单 O-2026-0520，状态退款中，标了"异常"）。点开 Copilot 后：

- 问"这个订单为什么异常" → 回答会结合页面上下文和订单数据，并展示 trace。
- 让它"建个工单" → 弹出黄色确认区域，点"确认创建"才执行，写操作不自动跑。

命令行也能验证后端接口：

```bash
curl -X POST http://localhost:8046/api/copilot -H "Content-Type: application/json" \
  -d '{"message":"这个订单为什么异常","pageContext":{"selectedOrderId":"O-2026-0520","idCard":"310101199001011234"}}'
```

预期返回（注意：传进去的 `idCard` 被后端脱敏丢弃，没参与处理）：

```json
{"reply": "订单 O-2026-0520 状态为「退款中」，金额 89 元，处于退款流程，属于需要关注的异常订单。",
 "trace": ["读取页面上下文 selectedOrderId=O-2026-0520", "命中订单数据，判定为异常订单"]}
```

## 代码对应文章的哪些点

| 概念 | 在哪里 |
|---|---|
| 收集页面上下文 | `index.html` 的 `getPageContext` |
| 上下文脱敏（白名单字段） | `server.py` 的 `sanitize_context` |
| 结合上下文回答 | `server.py` 的 `handle_copilot` |
| 写操作返回 needs_confirmation | `handle_copilot` + 前端 `appendConfirm` |
| 展示执行过程 trace | 前端 `appendMsg` 渲染 trace |
| 失败不影响主页面 | `send` 的 try/catch |

## 动手改

- 在 `getPageContext` 里加一个敏感字段（如 `phone`），确认后端 `sanitize_context` 把它丢掉了。
- 把 `handle_copilot` 换成真实模型调用，pageContext 拼进 system prompt。
- 给确认按钮接一个真正的 `/api/ticket` 写接口，体会"前端确认 → 后端执行"的完整链路。
