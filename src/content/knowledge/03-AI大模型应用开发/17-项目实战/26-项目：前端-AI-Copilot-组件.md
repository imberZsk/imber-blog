# 项目实战（26） - 项目：前端 AI Copilot 组件

> 读完后，你应能完成以下任务：
> - 绘制“项目实战（26） - 项目：前端 AI Copilot 组件 / Copilot 的核心是"页面上下文 + 安全动作"，不是聊天框”的关键对象与数据流，解释“很多人做 Copilot 第一反应是做个漂亮的聊天 UI。”，并用源码位置、日志或 Trace 标注证据。
> - 为“项目实战（26） - 项目：前端 AI Copilot 组件 / 上下文必须脱敏，而且后端要再兜一层”设计正常与异常输入，验证“Copilot 把上下文发给后端（最终可能进模型 prompt），如果原样带上这些，就是数据泄露。”，输出首个偏差位置与回归测试结果。
> - 实现“项目实战（26） - 项目：前端 AI Copilot 组件 / 写操作：后端只返回"待确认"，前端来弹窗”的最小代码或配置，检验“Copilot 能建工单、改状态、发消息——这些都是写操作，不能让模型一句话就执行了。”，输出命令、结果与 Diff，并说明不适用边界。

# 一、前端 AI Copilot 组件的真实应用场景

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

```text
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

# 五、工程上真正会踩的坑

- **上下文只在前端脱敏**：前端代码用户可改、可能漏字段。后端必须有独立白名单兜底，别信前端传来的任何东西。
- **页面切换了上下文没更新**：用户从订单 A 跳到订单 B，Copilot 还在用 A 的上下文回答。要监听路由/选中项变化，及时刷新 context。
- **Copilot 报错把主页面带崩**：助手接口挂了，整个订单页白屏。Copilot 必须是旁路组件，`try/catch` 兜住，失败只在面板里提示，绝不影响主业务。
- **写操作确认做成了"假确认"**：弹个框但点不点都执行。确认必须是真的卡点——用户不点"确认"，写请求就不发出去。
- **trace 全藏起来**：用户不知道 Copilot 读了什么、做了什么，出了错没法判断。把"读取了哪些上下文、调了什么"展示出来，AI 才可信。

# 六、一句话面试答法

> **嵌入式 Copilot 和普通聊天机器人有什么不一样？** 普通聊天机器人是孤立的，用户得手动把信息喂进去。嵌入式 Copilot 直接读当前页面上下文，用户说"这个订单"它就懂。前端负责三件事：采集并脱敏页面上下文、展示执行过程 trace、承接写操作的人工确认。安全上我做了双保险——前端脱敏加后端白名单，写操作后端只返回待确认、前端弹窗用户点了才执行，且整个组件是旁路的，挂了也不影响主业务页面。

# 七、动手实践：46 前端 AI Copilot 组件

把 AI 助手嵌进一个真实的「订单详情」业务页面：右下角悬浮按钮唤起抽屉式 Copilot，它能读取**当前页面上下文**解释订单、展示执行过程 trace、写操作前弹**人工确认**。前端用原生 HTML/JS，后端用 Python 标准库 `http.server`。

## 7.1 运行

```bash
python3 server.py
```

然后浏览器打开 http://localhost:8046 ，点右下角蓝色 AI 按钮。

零依赖，纯标准库。

## 7.2 预期效果

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

## 7.3 代码对应文章的哪些点

| 概念 | 在哪里 |
|---|---|
| 收集页面上下文 | `index.html` 的 `getPageContext` |
| 上下文脱敏（白名单字段） | `server.py` 的 `sanitize_context` |
| 结合上下文回答 | `server.py` 的 `handle_copilot` |
| 写操作返回 needs_confirmation | `handle_copilot` + 前端 `appendConfirm` |
| 展示执行过程 trace | 前端 `appendMsg` 渲染 trace |
| 失败不影响主页面 | `send` 的 try/catch |

## 7.4 动手改

- 在 `getPageContext` 里加一个敏感字段（如 `phone`），确认后端 `sanitize_context` 把它丢掉了。
- 把 `handle_copilot` 换成真实模型调用，pageContext 拼进 system prompt。
- 给确认按钮接一个真正的 `/api/ticket` 写接口，体会"前端确认 → 后端执行"的完整链路。

# 八、总结

- **Copilot 的核心是"页面上下文 + 安全动作"，不是聊天框**：很多人做 Copilot 第一反应是做个漂亮的聊天 UI。
- **上下文必须脱敏，而且后端要再兜一层**：Copilot 把上下文发给后端（最终可能进模型 prompt），如果原样带上这些，就是数据泄露。
- **写操作：后端只返回"待确认"，前端来弹窗**：Copilot 能建工单、改状态、发消息——这些都是写操作，不能让模型一句话就执行了。
- **工程上真正会踩的坑**：后端必须有独立白名单兜底，别信前端传来的任何东西。
- **一句话面试答法**：普通聊天机器人是孤立的，用户得手动把信息喂进去。

## 参考资料

- [FastAPI 大型应用](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [Docker Compose](https://docs.docker.com/compose/)

<!-- knowledge-lab-sources-inlined -->

## 8.1 实现源码与运行边界

下方 `sandbox.html` 可直接在文章中运行；其余文件保留真实本地项目结构，用于理解接口、部署和测试。

### index.html

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>订单详情 Copilot</title>
  <style>
    body { margin: 0; font: 15px/1.6 system-ui; background: #f5f5f5; color: #171717; }
    main { max-width: 920px; margin: 40px auto; padding: 24px; background: white; border: 1px solid #ddd; }
    .tag { color: #b42318; }
    #toggle { position: fixed; right: 24px; bottom: 24px; width: 52px; height: 52px; border: 0; border-radius: 50%; color: white; background: #1769e0; }
    #panel { display: none; position: fixed; inset: 0 0 0 auto; width: min(420px, 92vw); padding: 20px; background: white; box-shadow: -8px 0 24px #0002; }
    #panel.open { display: block; }
    #messages { height: 62vh; overflow: auto; white-space: pre-wrap; }
    form { display: flex; gap: 8px; }
    input { flex: 1; padding: 10px; }
    .confirm { padding: 10px; background: #fff6d9; border: 1px solid #d9a400; }
  </style>
</head>
<body>
  <main><h1>订单 O-2026-0520</h1><p>状态：退款中 <span class="tag">异常</span></p><p>金额：89 元</p></main>
  <button id="toggle" title="打开 AI Copilot">AI</button>
  <aside id="panel"><h2>订单 Copilot</h2><div id="messages"></div><form id="form"><input id="input" placeholder="询问异常原因或创建工单"><button>发送</button></form></aside>
  <script>
    const panel = document.querySelector('#panel'); // Copilot 抽屉。
    const messages = document.querySelector('#messages'); // 对话与 trace 容器。
    const input = document.querySelector('#input'); // 用户指令输入框。
    document.querySelector('#toggle').addEventListener('click', () => panel.classList.toggle('open'));

    function getPageContext() {
      return { selectedOrderId: 'O-2026-0520', routeName: 'order-detail', idCard: '310101199001011234' }; // 后端会丢弃敏感字段。
    }

    function appendMessage(payload) {
      const block = document.createElement('div'); // 当前回答块。
      block.textContent = `${payload.reply}\nTrace: ${payload.trace.join(' -> ')}`;
      if (payload.needs_confirmation) {
        const confirmButton = document.createElement('button'); // 写操作人工确认按钮。
        confirmButton.className = 'confirm';
        confirmButton.textContent = '确认创建';
        confirmButton.addEventListener('click', () => { confirmButton.textContent = '已确认，模拟工单已创建'; confirmButton.disabled = true; });
        block.append(document.createElement('br'), confirmButton);
      }
      messages.append(block, document.createElement('hr'));
    }

    document.querySelector('#form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = input.value.trim(); // 清洗后的用户指令。
      if (!message) return;
      try {
        const response = await fetch('/api/copilot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, pageContext: getPageContext() }) }); // Copilot 响应。
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        appendMessage(await response.json());
      } catch (error) {
        appendMessage({ reply: `Copilot 暂时不可用：${error.message}`, trace: [], needs_confirmation: false });
      }
    });
  </script>
</body>
</html>
```

### sandbox.html

```html runnable file=index.html title="27-项目：前端-AI-Copilot-组件 在线实验"
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'"
    />
    <title>前端 AI Copilot</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: ui-sans-serif, system-ui, sans-serif;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: #0f1211;
        color: #f3f5f4;
      }
      main {
        display: grid;
        min-height: 390px;
        grid-template-columns: 180px 1fr;
      }
      aside {
        border-right: 1px solid #303633;
        padding: 16px;
      }
      aside h2,
      section h1 {
        margin: 0 0 14px;
        font-size: 14px;
        letter-spacing: 0;
      }
      label {
        display: flex;
        gap: 8px;
        margin: 10px 0;
        color: #b9c0bd;
        font-size: 12px;
      }
      .workspace {
        min-width: 0;
        padding: 18px;
      }
      textarea {
        width: 100%;
        min-height: 74px;
        resize: vertical;
        border: 1px solid #39413d;
        border-radius: 6px;
        background: #171b19;
        color: inherit;
        padding: 10px;
        font: 13px/1.5 inherit;
      }
      button {
        border: 1px solid #3d4742;
        border-radius: 6px;
        background: #202622;
        color: inherit;
        padding: 8px 11px;
        cursor: pointer;
      }
      button.primary {
        border-color: #6ee7b7;
        background: #6ee7b7;
        color: #07110d;
        font-weight: 700;
      }
      button:disabled {
        cursor: not-allowed;
        opacity: 0.4;
      }
      .toolbar {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-top: 10px;
      }
      .scope {
        color: #8f9994;
        font:
          11px ui-monospace,
          monospace;
      }
      .diff {
        display: grid;
        min-height: 150px;
        margin-top: 16px;
        border: 1px solid #303733;
        border-radius: 6px;
        overflow: hidden;
        grid-template-columns: 1fr 1fr;
      }
      .pane {
        min-width: 0;
        padding: 12px;
      }
      .pane + .pane {
        border-left: 1px solid #303733;
      }
      .pane strong {
        display: block;
        margin-bottom: 9px;
        color: #929c97;
        font:
          11px ui-monospace,
          monospace;
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        color: #cbd2ce;
        font:
          12px/1.6 ui-monospace,
          monospace;
      }
      .added {
        color: #7ee2b8;
      }
      .notice {
        min-height: 20px;
        margin-top: 10px;
        color: #9ca6a1;
        font-size: 12px;
      }
      @media (max-width: 560px) {
        main {
          grid-template-columns: 1fr;
        }
        aside {
          border-right: 0;
          border-bottom: 1px solid #303633;
        }
        .diff {
          grid-template-columns: 1fr;
        }
        .pane + .pane {
          border-top: 1px solid #303733;
          border-left: 0;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <aside>
        <h2>上下文白名单</h2>
        <label><input type="checkbox" value="selection" checked /> 当前选区</label>
        <label><input type="checkbox" value="language" checked /> 文件语言</label>
        <label><input type="checkbox" value="diagnostics" /> 诊断信息</label>
        <label><input type="checkbox" value="secrets" disabled /> 环境密钥</label>
      </aside>
      <section class="workspace">
        <h1>Copilot 修改建议</h1>
        <textarea id="instruction">把这个请求函数补上超时处理，并返回明确错误。</textarea>
        <div class="toolbar">
          <span id="scope" class="scope">context: selection, language</span>
          <button id="generate" class="primary" type="button">生成建议</button>
        </div>
        <div class="diff">
          <div class="pane">
            <strong>当前代码</strong>
            <pre>
const response = await fetch(url)
return response.json()</pre
            >
          </div>
          <div class="pane">
            <strong>建议 Diff</strong>
            <pre id="suggestion">等待生成，不会自动写入代码。</pre>
          </div>
        </div>
        <div class="toolbar">
          <span id="notice" class="notice">高风险写操作必须由用户确认。</span>
          <button id="apply" type="button" disabled>确认应用</button>
        </div>
      </section>
    </main>
    <script>
      /** 允许发送给模型的上下文字段集合。 */
      const ALLOWED_CONTEXT = new Set(['selection', 'language', 'diagnostics'])
      /** 上下文选择框列表。 */
      const contextInputs = Array.from(document.querySelectorAll('input[type="checkbox"]'))
      /** 当前上下文范围展示区域。 */
      const scopeElement = document.querySelector('#scope')
      /** 生成建议按钮。 */
      const generateButton = document.querySelector('#generate')
      /** 确认应用按钮。 */
      const applyButton = document.querySelector('#apply')
      /** Diff 建议展示区域。 */
      const suggestionElement = document.querySelector('#suggestion')
      /** 操作结果提示区域。 */
      const noticeElement = document.querySelector('#notice')

      /** 读取并展示经过白名单过滤的上下文字段。 */
      function updateContextScope() {
        /** 用户勾选且允许出站的上下文字段。 */
        const selectedContext = contextInputs
          .filter((input) => input.checked && ALLOWED_CONTEXT.has(input.value))
          .map((input) => input.value)
        scopeElement.textContent = `context: ${selectedContext.join(', ') || 'none'}`
      }

      /** 生成确定性的代码修改建议，但不直接修改用户文件。 */
      function generateSuggestion() {
        generateButton.disabled = true
        generateButton.textContent = '生成中…'
        suggestionElement.textContent = ''
        noticeElement.textContent = '正在构造最小上下文请求…'

        window.setTimeout(() => {
          suggestionElement.innerHTML =
            '<span class="added">+ const controller = new AbortController()\n+ const timeoutId = setTimeout(() =&gt; controller.abort(), 5000)\n+ try {\n+   const response = await fetch(url, { signal: controller.signal })\n+   if (!response.ok) throw new Error(`HTTP ${response.status}`)\n+   return await response.json()\n+ } finally {\n+   clearTimeout(timeoutId)\n+ }</span>'
          generateButton.disabled = false
          generateButton.textContent = '重新生成'
          applyButton.disabled = false
          noticeElement.textContent = '建议已生成，等待人工确认；当前文件尚未改变。'
        }, 650)
      }

      contextInputs.forEach((input) => input.addEventListener('change', updateContextScope))
      generateButton.addEventListener('click', generateSuggestion)
      applyButton.addEventListener('click', () => {
        applyButton.disabled = true
        noticeElement.textContent = '已确认应用：真实项目中此处才调用受权限保护的写入接口。'
      })
      updateContextScope()
    </script>
  </body>
</html>
```

### server.py

```python
"""提供订单页和带上下文白名单、人工确认的 Copilot API。"""

from __future__ import annotations

import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

HOST = "127.0.0.1"
PORT = 8046
LAB_DIRECTORY = Path(__file__).resolve().parent
ALLOWED_CONTEXT_FIELDS = {"selectedOrderId", "routeName"}
ORDERS = {"O-2026-0520": {"status": "退款中", "amount": 89, "abnormal": True}}


def sanitize_context(raw_context: object) -> dict[str, str]:
    """只保留后端允许的页面上下文字段。"""
    if not isinstance(raw_context, dict):
        return {}
    return {key: str(value) for key, value in raw_context.items() if key in ALLOWED_CONTEXT_FIELDS}


def handle_copilot(message: str, page_context: dict[str, str]) -> dict[str, Any]:
    """结合已脱敏上下文回答，写操作只返回待确认计划。"""
    # 当前页面选中的订单主键。
    order_id = page_context.get("selectedOrderId", "")
    # 服务端权限域内查询到的订单。
    order = ORDERS.get(order_id)
    # 可展示给用户的执行轨迹。
    trace = [f"读取页面上下文 selectedOrderId={order_id or '无'}"]
    if "工单" in message:
        trace.append("识别为写操作，暂停等待人工确认")
        return {"reply": "即将为当前订单创建人工工单，请确认。", "trace": trace, "needs_confirmation": True, "action": {"type": "create_ticket", "orderId": order_id}}
    if order:
        trace.append("命中订单数据，判定为异常订单" if order["abnormal"] else "命中正常订单")
        return {"reply": f"订单 {order_id} 状态为「{order['status']}」，金额 {order['amount']} 元，处于退款流程，属于需要关注的异常订单。", "trace": trace, "needs_confirmation": False}
    return {"reply": "没有可用订单上下文。", "trace": trace, "needs_confirmation": False}


class CopilotHandler(SimpleHTTPRequestHandler):
    """托管业务页面与 POST /api/copilot。"""

    def __init__(self, *args: object, **kwargs: object) -> None:
        """固定静态页面目录。"""
        super().__init__(*args, directory=str(LAB_DIRECTORY), **kwargs)

    def do_POST(self) -> None:
        """校验并处理 Copilot 请求。"""
        if self.path != "/api/copilot":
            self.send_error(404)
            return
        # HTTP 请求体长度。
        content_length = int(self.headers.get("Content-Length", "0"))
        try:
            # 前端提交的请求对象。
            payload = json.loads(self.rfile.read(content_length))
        except json.JSONDecodeError:
            self.send_error(400, "invalid_json")
            return
        # 清洗后的用户指令。
        message = payload.get("message", "").strip() if isinstance(payload, dict) else ""
        if not message:
            self.send_error(400, "message_required")
            return
        # 白名单过滤后的页面上下文。
        context = sanitize_context(payload.get("pageContext"))
        # Copilot 业务结果。
        response_payload = handle_copilot(message, context)
        # UTF-8 JSON 响应体。
        body = json.dumps(response_payload, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    """启动订单页和 Copilot API。"""
    # 支持静态页面与 API 并发的服务。
    server = ThreadingHTTPServer((HOST, PORT), CopilotHandler)
    print(f"打开 http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
```
