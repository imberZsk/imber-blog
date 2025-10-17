# TipTap 编辑器（5）- 插件开发实战

## 高亮 Callout 组件

这是 Tiptap 中没有的一个功能，Notion 中是有的，但是我们可以通过自定义插件来实现。

![](/editor/callout.png)

extensions

```js
import { Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: { background?: string }) => ReturnType
      toggleCallout: (attributes?: { background?: string }) => ReturnType
      unsetCallout: () => ReturnType
    }
  }
}

export const Callout = Node.create({
  name: 'callout',

  // 用于配置选项，也就是Callout.configure({})
  addOptions() {
    return {
      HTMLAttributes: {
        data: 'type="callout"'
      }
    }
  },

  // 内容为 1 个或多个 block
  content: 'block+',

  // 该节点为 block 节点
  group: 'block',

  // 确保复制到时候结构完整，把父级也复制上去
  defining: true,

  // 定义节点属性
  addAttributes() {
    return {
      background: {
        default: 'gray',
        renderHTML: (attributes) => {
          return {
            class: `callout-${attributes.background}`
          }
        }
      },
      // 添加类型属性，提高兼容性
      type: {
        default: 'callout',
        renderHTML: () => {
          return {
            'data-type': 'callout'
          }
        }
      }
    }
  },

  // 定义节点渲染HTML
  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'callout' }, 0]
  },

  // 定义如何从 HTML 解析节点
  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]'
      }
    ]
  },

  // 定义节点命令
  addCommands() {
    return {
      setCallout: () => {
        return ({ commands }) => {
          return commands.wrapIn(this.name)
        }
      },
      toggleCallout: () => {
        return ({ commands }) => {
          return commands.toggleWrap(this.name)
        }
      },
      unsetCallout:
        () =>
        ({ commands }) => {
          // 移除
          return commands.lift(this.name)
        }
    }
  }
})

```

style.ts

```js
import { cn } from '@/lib/utils'

// Notion 风格的高亮块样式
export const CalloutClassNames = cn(
  // 基础样式
  '[&_.callout-gray]:py-4 [&_.callout-gray]:my-2 [&_.callout-gray]:rounded-md',
  '[&_.callout-gray]:pl-12 [&_.callout-gray]:pr-6',
  '[&_.callout-gray]:gap-3',
  '[&_.callout-gray_p]:flex-1 [&_.callout-gray]:break-all',

  // 图标样式 - 使用伪元素
  '[&_.callout-gray]:before:content-["💡"] [&_.callout-gray]:before:absolute [&_.callout-gray]:before:left-5 [&_.callout-gray]:before:text-lg [&_.callout-gray]:before:flex-shrink-0 [&_.callout-gray]:before:mr-1',

  // 不同颜色的高亮块 - 浅色主题
  '[&_.callout-gray]:bg-stone-50 [&_.callout-gray]:text-stone-800',

  // 暗色主题支持
  'dark:[&_.callout-gray]:bg-[#30302e] dark:[&_.callout-gray]:text-stone-200'
)
```

思考：

- 如何实现不同颜色的高亮块？如何不用 tailwind 实现？
- 怎么把图标写成一个元素，然后加上可以切换图标功能？
- 兼容性是怎么样的，如何兼容 Notion?
- 不能再嵌套高亮组件、不能添加图片等?

## 分栏组件

```

```
