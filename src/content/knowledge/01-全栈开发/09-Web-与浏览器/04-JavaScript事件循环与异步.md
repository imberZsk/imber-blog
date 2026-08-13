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

```js
const controller = new AbortController()

async function loadUser(userId) {
  const response = await fetch(`/api/users/${userId}`, { signal: controller.signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

// 页面离开或新请求开始时取消旧请求，避免旧响应覆盖新状态。
controller.abort()
```

事件监听器、定时器和观察器在组件卸载时解除；只把必须共享的数据放入闭包，避免长期引用大型 DOM 或缓存。

## 参考资料

- [MDN Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop)
- [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

