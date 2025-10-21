# AI 扩展使用指南

## 📍 使用场景说明

### `@microsoft/fetch-event-source` 使用场景

- **前端使用**：`@microsoft/fetch-event-source` 用于客户端处理流式响应
- **API 路由**：使用原生的 `fetch` 和 `ReadableStream` 来创建流式响应

## 🚀 架构说明

```
前端 (AI Dropdown Menu)
├── 使用 @microsoft/fetch-event-source
├── 处理 Server-Sent Events (SSE)
└── 实时更新编辑器内容

API 路由 (/api/ai)
├── 使用 fetchEventSource (服务端)
├── 创建 ReadableStream
└── 发送流式数据到前端
```

## 🔧 技术实现

### 前端流式处理

```typescript
// 使用 fetchEventSource 处理流式响应
await fetchEventSource('/api/ai', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: actionId,
    text: selectedText
  }),
  async onopen(response) {
    // 连接建立时的处理
  },
  onmessage(event) {
    // 处理流式数据
    const data = JSON.parse(event.data)
    if (data.type === 'content') {
      // 实时更新编辑器
      editor.commands.insertContentAt(insertPos, data.content)
    }
  },
  onerror(error) {
    // 错误处理
  }
})
```

### 后端流式响应

```typescript
// API 路由中使用 ReadableStream
const stream = new ReadableStream({
  async start(controller) {
    await fetchEventSource(baseUrl, {
      // 配置...
      onmessage(event) {
        // 处理 AI 响应
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'content',
              content: content
            })}\n\n`
          )
        )
      }
    })
  }
})

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  }
})
```

## 📝 数据流

1. **用户操作** → 选中文本，选择 AI 功能
2. **前端请求** → 使用 `fetchEventSource` 发送请求
3. **API 处理** → 使用 `fetchEventSource` 调用 AI API
4. **流式响应** → 通过 SSE 实时发送数据
5. **实时更新** → 前端接收并更新编辑器

## ✅ 优势

- **实时体验**：用户可以看到 AI 生成过程
- **性能优化**：流式传输减少等待时间
- **错误处理**：完整的错误恢复机制
- **用户体验**：流畅的交互体验

## 🔍 调试

- 检查网络连接
- 查看控制台日志
- 验证 API 密钥配置
- 确认流式响应格式
