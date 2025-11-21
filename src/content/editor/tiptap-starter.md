# TipTap 编辑器（1）- 入门指南

## 前言

[TipTap](https://tiptap.dev/docs/editor/getting-started/overview)
是一个基于 ProseMirror 的现代富文本编辑器，它提供了无头（headless）的设计理念，让开发者可以完全自定义编辑器的外观和交互方式。

## 主流富文本编辑器对比

| 编辑器          | 核心架构    | 优势                                               | 劣势                                              | 适用场景                       |
| --------------- | ----------- | -------------------------------------------------- | ------------------------------------------------- | ------------------------------ |
| **Quill.js**    | DOM-based   | 简单易用, 轻量级, 适合初学者                       | 功能扩展受限, 自定义复杂场景较困难                | 简单文档编辑                   |
| **TinyMCE**     | DOM-based   | 成熟稳定, 功能全面, 插件丰富                       | 库体积较大, 自定义复杂功能需要深入研究            | 企业应用、内容管理系统         |
| **CKEditor**    | DOM-based   | 功能强大, 支持多种文件格式, 易于集成               | 商业授权模式较复杂, 定制化能力有限                | 富文本内容管理, 复杂文档编辑   |
| **Slate.js**    | JSON-based  | 可扩展性强, 基于React, 适合复杂定制化场景          | 学习曲线陡峭, 生态体系不如DOM-based方案成熟       | 高度自定义编辑器, 知识管理系统 |
| **ProseMirror** | JSON-based  | 数据结构化, 功能强大, 定制能力极高, 支持协作和扩展 | 学习成本高, 初期开发复杂度较高                    | 高性能编辑器, 协作文档系统     |
| **Tiptap**      | ProseMirror | 基于ProseMirror, 封装更友好, Vue/React兼容性好     | 生态体系仍在完善, 需要依赖ProseMirror本身生态支持 | 快速开发的现代富文本编辑器     |

## Tiptap 的优势

1. **Headless** - 无头设计，可以完全自定义 UI
2. **容易上手** - 简洁的 API 设计，学习成本低
3. **扩展能力强** - 丰富的插件生态和自定义插件支持
4. **兼容性强** - 支持多种框架（React、Vue、Svelte 等）
5. **TypeScript 支持** - 完整的类型定义，提供更好的开发体验
6. **活跃社区** - 持续更新，社区活跃，社区模版支持 Nextjs

## 安装和基础设置

### 安装依赖

```bash
# 核心包
pnpm install @tiptap/core @tiptap/pm

# 基础扩展
pnpm install @tiptap/starter-kit

# 框架集成（我这里选的 nextjs，tiptap 也支持 vue3 等其它框架）
pnpm install @tiptap/react @tiptap/pm @tiptap/starter-kit
```

### 基础编辑器

有了 starterKit 就有了编辑器基础功能，[starterKit 文档](https://tiptap.dev/docs/editor/extensions/functionality/starterkit#included-extensions)，页面里加上一个最简易的编辑器组件

```javascript
"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

const Tiptap = () => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>Hello World! 🌎️</p>",
    immediatelyRender: false, // ssr 不马上渲染，防止水合问题
    editorProps: {
      attributes: {
        class: "focus:outline-none" // 去掉编辑器边框
      }
    }
  })

  return <EditorContent editor={editor} />
}

export default Tiptap
```

### Simple template

tiptap 提供的简单模版，不是 notion 风格，也就是不支持 slash command，在页面顶部才有操作栏

```bash
# 现有项目
npx @tiptap/cli@latest add simple-editor

# 新项目
npx @tiptap/cli@latest init simple-editor
```

然后使用

```js
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"

export default function App() {
  return <SimpleEditor />
}
```

notion 风格的模版需要收费，可以基于 simple template 来修改

## 参考

- Tiptap extension
  & 快速集成：[extension 文档](https://tiptap.dev/docs/editor/extensions/overview)

- starterKit 中包含的 extension：[starterKit 文档](https://tiptap.dev/docs/editor/extensions/functionality/starterkit#included-extensions)

- Tiptap 官方编辑器 Demo：[tiptap-templates](https://github.com/ueberdosis/tiptap-templates?tab=readme-ov-file)

- Tiptap
  extension 配置：[extension 文档](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/extension)，[extension node 文档](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/node)，[extension mark 文档](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/mark)
