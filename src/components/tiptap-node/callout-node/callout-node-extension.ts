import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CalloutNode as CalloutNodeComponent } from '@/components/tiptap-node/callout-node/callout-node'

// 扩展Tiptap核心模块，为Commands接口添加callout相关命令的类型定义
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    // callout命令命名空间
    callout: {
      // 设置callout节点的命令，可传入可选的background属性
      setCallout: (attributes?: { background?: string }) => ReturnType
    }
  }
}

// 创建Callout节点扩展
export const Callout = Node.create({
  // 节点名称，唯一标识
  name: 'callout',

  // 节点分组：属于block组
  group: 'block',

  // 可选择标志：设为true允许选中该节点
  selectable: true,

  // 原子节点标志：设为false以支持包含多个段落的复杂内容
  // 这样可以更好地处理从Notion复制过来的带有空行的内容
  atom: false,

  // 内容规则：至少包含一个block类型的子节点
  // 使用block+而不是paragraph+可以支持更复杂的内容结构，如多个段落、列表等
  // 更好地匹配Notion复制过来的内容格式
  content: '(paragraph)+',

  /**
   * 添加节点配置选项
   * 这些选项可以通过Callout.configure({})来配置
   */
  addOptions() {
    return {
      // 设置默认的HTML属性
      defaultIcon: '💡',
      defaultBackground: null
    }
  },

  // 定义性标志：设为true确保复制粘贴时保留完整的节点结构
  // 这对于从Notion粘贴包含复杂内容和空行的callout非常重要
  defining: true,

  /**
   * 定义节点属性
   * 这些属性可以存储节点的状态和配置信息
   */
  addAttributes() {
    return {
      icon: {
        default: this.options.defaultIcon,
        // 从HTML元素的data-icon属性解析图标，若不存在则使用默认值
        parseHTML: (element) => element.dataset.icon || this.options.defaultIcon,
        // 渲染时将图标作为data-icon属性包含在HTML中
        renderHTML: (attributes) => ({
          'data-icon': attributes.icon
        })
      },
      background: {
        default: null,
        // 从HTML元素的data-background属性解析背景颜色
        parseHTML: (element) => element.dataset.background || null,
        // 渲染时将背景颜色作为data-background属性包含在HTML中
        renderHTML: (attributes) => ({
          'data-background': attributes.background
        })
      }
    }
  },

  /**
   * 定义如何从HTML解析为编辑器节点
   * 返回一个选择器数组，用于识别HTML中的callout节点
   * 优化对Notion格式callout的支持，特别是带有空行和emoji的情况
   */
  parseHTML() {
    return [
      {
        // 通过标签名和data-type属性来识别callout节点
        tag: 'div[data-type="callout"]'
      }
      // TODO: 解析不了 Notion 格式的 callout
      // {
      //   // 支持Notion格式的callout：<aside>标签
      //   tag: 'aside',
      //   // 增加parse函数以更好地处理Notion的callout内容结构
      //   parse: () => {
      //     // 确保内容被正确处理，即使包含空行和emoji
      //     return {
      //       // 不需要特殊属性处理
      //     }
      //   },
      //   // 设置更高优先级以确保Notion格式优先被解析
      //   priority: 1000
      // }
    ]
  },

  /**
   * 定义节点的HTML渲染方式
   * @param {Object} props - 包含HTMLAttributes等属性
   * @returns {Array} 渲染数组，格式为[标签名, 属性对象, 子节点内容占位符]
   */
  renderHTML({ HTMLAttributes }) {
    // 使用<div>标签渲染，与ReactNodeViewRenderer中的实际渲染保持一致
    // 但为了支持Notion格式的复制粘贴，我们仍然保留data-type属性
    // 必须包含子内容占位符0，因为我们设置了content: 'paragraph+'
    return ['div', { ...HTMLAttributes, 'data-type': 'callout' }, 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeComponent)
  },

  /**
   * 定义与callout节点相关的命令
   * 这些命令可以通过editor.commands调用
   */
  addCommands() {
    return {
      // 设置callout命令：将当前选中文本包装在callout节点中
      setCallout: () => {
        return ({ commands }) => {
          // 使用wrapIn命令将内容包装在callout节点中
          return commands.wrapIn(this.name)
        }
      }
    }
  }
})
