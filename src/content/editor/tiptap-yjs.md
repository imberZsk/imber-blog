# TipTap 编辑器（8）- Yjs 协同编辑

## 前言

在多人协作的编辑场景中，如何保证文档的一致性是一个复杂的技术问题。当多个用户同时编辑同一个文档时，需要解决冲突、保持同步，并确保最终结果的一致性。目前主要有两种算法来解决这个问题：**OT（Operational Transformation）** 和 **CRDT（Conflict-free Replicated Data Types）**。

## OT 算法

### 什么是 OT 算法

OT（Operational Transformation）是一种用于协同编辑的算法，它通过转换操作来解决冲突，确保所有用户看到相同的最终结果。

### 工作原理

假设我们有一个文档，内容是 `"abc"`，两个用户同时编辑：

**初始状态：** `"abc"`

**用户 A 的操作：** 在位置 1 插入 `"x"` → `"axbc"`
**用户 B 的操作：** 在位置 2 插入 `"y"` → `"abyc"`

如果没有 OT 算法，直接应用操作会导致冲突：

- 用户 A 看到：`"axbc"`
- 用户 B 看到：`"abyc"`

### OT 算法解决冲突

OT 算法的核心思想是**转换操作**，让操作能够适应其他用户的操作：

1. **用户 A 发送操作：** `insert("x", 1)`
2. **用户 B 发送操作：** `insert("y", 2)`
3. **服务器转换操作：**
   - 用户 A 收到：`insert("x", 1)` + 转换后的 `insert("y", 3)` → `"axbyc"`
   - 用户 B 收到：`insert("y", 2)` + 转换后的 `insert("x", 1)` → `"axbyc"`

**最终结果：** 两个用户都看到 `"axbyc"`

### OT 算法的特点

- ✅ **实时性好**：操作立即生效
- ✅ **冲突解决**：通过转换操作解决冲突
- ❌ **复杂度高**：转换规则复杂，难以实现
- ❌ **中心化**：需要中央服务器协调

可视化的展示 OT 算法的执行和流转过程 [https://operational-transformation.github.io/index.html](https://operational-transformation.github.io/index.html)

## CRDT 算法

### 什么是 CRDT 算法

CRDT（Conflict-free Replicated Data Types）是一种无冲突的复制数据类型，它通过设计数据结构本身来避免冲突，而不需要转换操作。

### 工作原理

同样以文档 `"abc"` 为例，两个用户同时编辑：

**初始状态：** `"abc"`

**用户 A 的操作：** 在位置 1 插入 `"x"`
**用户 B 的操作：** 在位置 2 插入 `"y"`

### CRDT 算法解决冲突

CRDT 通过给每个字符分配唯一标识符来避免冲突。下面是简单方便理解的例子，具体 CRDT 更复杂：

**初始状态：** `"abc"`

- `"a"` 的标识符：`(0, 'A')`
- `"b"` 的标识符：`(1, 'A')`
- `"c"` 的标识符：`(2, 'A')`

**用户 A 在位置 1 插入 `"x"`：**

- 新字符 `"x"` 的标识符：`(0.5, 'A')`（在 0 和 1 之间）
- 结果：`"axbc"`

**用户 B 在位置 2 插入 `"y"`：**

- 新字符 `"y"` 的标识符：`(1.5, 'B')`（在 1 和 2 之间）
- 结果：`"abyc"`

**合并时按标识符排序：**

- `(0, 'A')` → `"a"`
- `(0.5, 'A')` → `"x"`
- `(1, 'A')` → `"b"`
- `(1.5, 'B')` → `"y"`
- `(2, 'A')` → `"c"`

**最终结果：** `"axbyc"`

### CRDT 算法的特点

- ✅ **去中心化**：不需要中央服务器
- ✅ **简单可靠**：算法相对简单，不容易出错
- ✅ **最终一致性**：保证最终结果一致
- ❌ **存储开销**：需要存储额外的元数据
- ❌ **延迟较高**：需要等待所有操作到达

## Yjs 中的实现

### Yjs 简介

[Yjs](https://docs.yjs.dev/) 是一个基于 CRDT 的协同编辑库

### 在 TipTap 中集成 Yjs

Yjs 点过来跳转到了Tiptap，也就是这里： [https://tiptap.dev/docs/collaboration/getting-started/install](https://tiptap.dev/docs/collaboration/getting-started/install)

当然也可以直接看这个Demo：[https://tiptap.dev/docs/examples/advanced/collaborative-editing](https://tiptap.dev/docs/examples/advanced/collaborative-editing)，这是官方提供的商业服务 tiptap cloud

注意用 tiptap cloud 7天没有使用需要在 [https://cloud.tiptap.dev/v1/apps/settings](https://cloud.tiptap.dev/v1/apps/settings) 恢复应用，注意只有 30 天试用期

也有免费的，应该是大部分的人的选择，也就是 [Hocuspocus](https://tiptap.dev/docs/hocuspocus/provider/examples#tiptap) ✅

启动后端服务

下面是最简单的，但是我们往往需要自己部署后端服务，可以参考 [https://tiptap.dev/docs/hocuspocus/server/examples](https://tiptap.dev/docs/hocuspocus/server/examples)

```bash
npx @hocuspocus/cli
```

前端 tiptap 接入文档 [https://tiptap.dev/docs/hocuspocus/provider/examples#tiptap](https://tiptap.dev/docs/hocuspocus/provider/examples#tiptap)

```tsx
'use client'
import './styles.scss'

import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { EditorContent, useEditor } from '@tiptap/react'

import Collaboration from '@tiptap/extension-collaboration'
import * as Y from 'yjs'

// Importing the provider and useEffect
import { useEffect } from 'react'
import { HocuspocusProvider } from '@hocuspocus/provider'

const ydoc = new Y.Doc()

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      Document,
      Paragraph,
      Text,
      Collaboration.configure({
        document: ydoc
      })
    ],
    content: `
      <p>
        This is a radically reduced version of Tiptap. It has support for a document, with paragraphs and text. That’s it. It’s probably too much for real minimalists though.
      </p>
      <p>
        The paragraph extension is not really required, but you need at least one node. Sure, that node can be something different.
      </p>
    `
  })

  // Connect to your Collaboration server
  useEffect(() => {
    const provider = new HocuspocusProvider({
      url: 'ws://127.0.0.1:1234',
      name: 'example-document',
      document: ydoc
    })
  }, [])

  return <EditorContent editor={editor} />
}
```

### 实时同步流程

1. **用户输入** → TipTap 编辑器
2. **生成操作** → Yjs 处理
3. **网络传输** → WebSocket/WebRTC
4. **接收操作** → 其他客户端
5. **应用操作** → 更新编辑器

## 总结

### OT vs CRDT 对比

| 特性     | OT 算法 | CRDT 算法 |
| -------- | ------- | --------- |
| 复杂度   | 高      | 低        |
| 实时性   | 好      | 一般      |
| 去中心化 | 否      | 是        |
| 实现难度 | 难      | 中等      |
| 存储开销 | 低      | 高        |

### 选择建议

- **OT 算法**：适合对实时性要求极高的场景
- **CRDT 算法**：适合需要去中心化、简单可靠的场景

Yjs 选择了 CRDT 算法，因为它更简单、更可靠，适合大多数协同编辑场景。在 TipTap 中集成 Yjs 可以轻松实现多人实时协作编辑功能。
