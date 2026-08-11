# 工程基础（16）- 前端调用 AI 接口

> 读完你能：把「调用 AI 接口」从一次 fetch 升级成一组 UI 状态管理，正确区分客户端错误、服务端错误、网络异常，并跑通一个浏览器里能看到 loading 和重试的 demo。

# 一、一个真实场景

你给问答接口写了前端：

```js
const res = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ message }) });
const data = await res.json();
showAnswer(data.answer);
```

本地点了几下，能用。上线后用户反馈一堆问题：点了发送没任何反应，不知道在不在加载（模型要 3 秒）；偶尔接口报错，页面直接卡住或显示 `undefined`；网络断了，整个页面假死。

问题在于：**调 AI 接口不是「发请求拿结果」这么简单**。模型慢、会失败、网络会断。一次 fetch 背后是一组用户能感知的状态，你得把每种状态都管起来。这恰好是前端的主场——你比谁都懂状态管理。

# 二、把一次调用拆成一组状态

像管理前端 store 一样，给这次交互定义清楚状态：

```js
const state = {
  status: "idle",    // idle | loading | error
  lastMessage: "",   // 上一条输入，重试时复用
};
```

| 状态 | 什么时候 | 界面表现 |
|---|---|---|
| `idle` | 没在请求 | 输入框可用，按钮正常 |
| `loading` | 请求发出到拿到响应 | 按钮禁用变「生成中」、显示「思考中」占位 |
| `error` | 任何一种失败 | 红色错误条 + 重试按钮 |

核心认知：**成功只是其中一条路径**。新手只写成功路径，老手先想清楚 loading 和 error 怎么展示。

# 三、三种失败，要分开处理

「失败」不是一种，是三种，处理方式不同：

```js
try {
  const res = await fetch("/api/chat", { ... });
  const data = await res.json();

  if (!res.ok) {
    // 失败一：HTTP 状态非 2xx（后端明确返回了 4xx/5xx）
    //   4xx 是请求本身有问题（比如缺字段），重试也没用，提示用户改输入
    //   5xx 是服务端的问题，可以重试
    showError(data.error);
    return;
  }

  // 成功路径
  showAnswer(data.answer);
} catch (err) {
  // 失败二：网络层异常（断网、服务没起、跨域被拦）
  //   fetch 根本没拿到响应，直接 reject，进 catch
  showError("网络异常，请检查连接");
} finally {
  // 不管成功失败，都要恢复输入框可用，否则用户被永久锁住
  syncUI();
}
```

很多人漏掉 `catch` 块，结果断网时 fetch reject、没人接，页面就假死了。`finally` 也常被忘——失败时忘了把禁用的按钮恢复，用户就再也发不出消息。

# 四、给用户一个重试入口

AI 接口失败是常态（模型偶发超时、限流）。失败时不能只甩个错误就完事，要让用户**一键重试**，而不是重新打一遍字：

```js
function showError(reason) {
  const div = appendMessage("error", "出错了：" + reason);
  const retry = document.createElement("button");
  retry.textContent = "重试";
  retry.onclick = () => sendMessage(state.lastMessage);  // 复用上次的输入
  div.appendChild(retry);
}
```

`state.lastMessage` 存着上一条输入，重试直接复用。这个小细节决定了出错时用户是骂娘还是顺手点一下。

# 六、工程上真正会踩的坑

- **不处理网络层异常**。只写 `if (!res.ok)`，忘了 `catch`。断网时 fetch reject 没人接，页面假死。两类失败都要处理。
- **失败后按钮一直禁用**。loading 时禁用了按钮，但失败路径忘了恢复。用 `finally` 兜底恢复 UI。
- **API Key 写进前端**。前端代码全公开，Key 必须在后端。前端只调你自己的接口（第 10 篇）。
- **4xx 也让用户重试**。缺字段、格式错这种 4xx 重试多少次都一样。要区分 4xx（提示改输入）和 5xx（可重试）。
- **流式响应重复追加**。如果改用 SSE，断连重连时容易把已显示的 token 再追加一遍，要去重（第 13 篇）。

# 七、一句话面试答法

> **前端调用 AI 接口要处理好哪些点？** 我把它当一组 UI 状态而不是一次 fetch：idle、loading、error，成功只是其中一条路径。失败要分三种——HTTP 4xx 是请求问题提示用户改输入、5xx 是服务端问题可重试、fetch reject 是网络层异常要单独 catch，很多人漏掉最后一个导致断网时页面假死。用 finally 兜底恢复被禁用的按钮，失败时给一键重试入口复用上次输入。长回答用 SSE 流式提升体验，注意断连重连别重复追加 token。Key 永远在后端。

# 八、下一篇

`17-文件上传与文档解析.md` —— 问答能力做完了。但如果想让 AI 回答「我们公司的」问题，得先把公司文档喂进去。下一篇讲文件上传和文档解析，这是 RAG 的入口。

# 九、总结

- **工程上真正会踩的坑**：不处理网络层异常。
- **把一次调用拆成一组状态**：像管理前端 store 一样，给这次交互定义清楚状态：
- **三种失败，要分开处理**：「失败」不是一种，是三种，处理方式不同：
- **给用户一个重试入口**：AI 接口失败是常态（模型偶发超时、限流）。

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“Agent 工程（16）- 前端调用 AI 接口”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。
