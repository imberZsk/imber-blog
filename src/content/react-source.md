## React 渲染流程：root.render(\</APP>)

如下图，会去拿到两个信息，一个是 eventTime，可以粗略的理解为 performance.now()，另一个 lane，获取当前根容器的 fiber 的车道模型，当前为 defaultLane

![image-20250917233007619](/posts/react-source/image-20250917233007619.png)

如下图，接着看updateContainer 逻辑，主要是创建 update 对象，然后放入全局队列，供后续消费

![image-20250918155556578](/../../../Library/Application Support/typora-user-images/image-20250918155556578.png)

```js
// 用户首次调用
root.render(<App />)

// 执行流程：
// 1. 创建更新对象
const update = {
  eventTime: now(),
  lane: 16,
  payload: { element: <App /> },
  callback: null
}

// 2. 检查是否为渲染阶段更新
// 首次渲染：isUnsafeClassRenderPhaseUpdate(fiber) = false
// 走正常并发更新路径

// 3. 加入并发队列
concurrentQueues = [fiber, queue, update, 16]
concurrentQueuesIndex = 4

// 4. 更新Fiber状态
fiber.lanes = 16 // 标记这个Fiber有工作要做

// 5. 返回根节点
return fiberRoot

// 6. 后续调度
scheduleUpdateOnFiber(fiberRoot, current, 16, eventTime)
```
