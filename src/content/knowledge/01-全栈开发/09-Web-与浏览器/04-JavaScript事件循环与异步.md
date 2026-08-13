# Web 与浏览器（04） - JavaScript 事件循环与异步

> 读完你能：解释任务、微任务、渲染机会和异步 I/O 的顺序，并避免阻塞主线程和竞态覆盖。

## 核心知识清单

- 调用栈、Task Queue 与 Microtask Queue
- Promise、async/await 与错误传播
- 浏览器渲染机会与 requestAnimationFrame
- Fetch、AbortController 与请求竞态
- Web Worker 与主线程职责
- 闭包、事件监听与内存释放

## 执行顺序

当前同步栈完成后清空微任务，再获得一次渲染机会，之后处理下一项 Task。递归追加微任务会饿死渲染；大计算即使包进 Promise 仍运行在主线程，需要切片或交给 Worker。

事件循环是一种调度机制：同步代码在调用栈执行，计时器、网络和用户输入由宿主环境完成，回调进入对应队列。每个 Task 结束后，浏览器会持续清空 Microtask Queue，然后才可能进行样式、布局和绘制。`await` 之后的代码本质上也是 Promise continuation，会进入微任务队列。

## 请求取消与竞态处理

```js
let activeController = new AbortController()

async function loadUser(userId) {
  activeController.abort()
  activeController = new AbortController()
  const response = await fetch(`/api/users/${userId}`, {
    signal: activeController.signal,
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

// 页面离开或新请求开始时取消旧请求，避免旧响应覆盖新状态。
activeController.abort()
```

事件监听器、定时器和观察器在组件卸载时解除；只把必须共享的数据放入闭包，避免长期引用大型 DOM 或缓存。

取消请求不等于完成业务回滚，服务端可能已经收到写操作。读请求可以通过取消和序列号避免旧响应覆盖新状态；写请求还需要幂等键、明确的超时结果和重新查询状态。捕获 `AbortError` 时应区分主动取消与真实网络失败，不能统一弹出错误提示。

## 主线程与 Worker 决策

JSON 大解析、图片计算和复杂搜索会长期占用主线程，Promise 不能把它们自动移出主线程。任务超过一帧预算时先测量 Long Task，再选择分片、`requestIdleCallback` 或 Web Worker。Worker 适合纯计算和可序列化数据，不可直接访问 DOM；传递大型对象还需考虑结构化克隆成本。

## 失败边界与验收

常见问题包括微任务无限递归导致页面不绘制、组件卸载后继续写状态、多个请求乱序覆盖、定时器未清理以及错误在 Promise 链中被吞掉。所有异步入口都应有取消、超时、错误传播和清理策略。

验收时记录同步日志、Promise、计时器和 `requestAnimationFrame` 的实际顺序；通过快速切换用户复现请求竞态；用 Performance 面板检查 Long Task 和掉帧。测试不仅断言最终值，还应覆盖取消、超时、乱序响应和组件卸载后的行为。

## 参考资料

- [MDN Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop)
- [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
