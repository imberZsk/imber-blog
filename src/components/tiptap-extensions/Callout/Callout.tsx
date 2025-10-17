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
