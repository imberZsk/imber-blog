import { mergeAttributes, Node } from "@tiptap/react"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { ImageUploadNode as ImageUploadNodeComponent } from "@/components/tiptap-node/image-upload-node/image-upload-node"
import type { NodeType } from "@tiptap/pm/model"

/**
 * 文件上传函数类型定义
 * @param {File} file - 要上传的文件对象
 * @param {Function} onProgress - 可选的进度回调函数
 * @param {AbortSignal} abortSignal - 可选的中止信号
 * @returns {Promise<string>} 解析为上传后文件URL的Promise
 */
export type UploadFunction = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
) => Promise<string>

/**
 * 图片上传节点的配置选项接口
 */
export interface ImageUploadNodeOptions {
  /**
   * 节点类型
   * @default 'image'
   */
  type?: string | NodeType | undefined
  /**
   * 可接受的上传文件类型
   * @default 'image/*'
   */
  accept?: string
  /**
   * 可上传的最大文件数量
   * @default 1
   */
  limit?: number
  /**
   * 最大文件大小（字节），0表示无限制
   * @default 0
   */
  maxSize?: number
  /**
   * 处理上传过程的函数
   */
  upload?: UploadFunction
  /**
   * 上传错误时的回调函数
   */
  onError?: (error: Error) => void
  /**
   * 上传成功时的回调函数
   */
  onSuccess?: (url: string) => void
  /**
   * 要添加到图片元素的HTML属性
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>
}

/**
 * 扩展Tiptap的Commands接口，添加图片上传相关命令
 */
declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    // imageUpload命令命名空间
    imageUpload: {
      // 设置图片上传节点的命令，可传入可选的配置选项
      setImageUploadNode: (options?: ImageUploadNodeOptions) => ReturnType
    }
  }
}

/**
 * Tiptap节点扩展，用于创建图片上传组件
 * @see @/components/tiptap-node/image-upload-node/image-upload-node
 */
export const ImageUploadNode = Node.create<ImageUploadNodeOptions>({
  // 节点名称，唯一标识
  name: "imageUpload",

  // 节点分组：属于block组
  group: "block",

  // 可拖动标志：设为true允许拖放操作
  draggable: true,

  // 可选择标志：设为true允许选中该节点
  selectable: true,

  // 原子节点标志：设为true表示该节点是一个不可分割的整体
  atom: true,

  /**
   * 添加节点配置选项
   * 返回默认的配置值，这些值可以通过configure方法覆盖
   */
  addOptions() {
    return {
      // 默认节点类型为image
      type: "image",
      // 默认接受所有图片类型
      accept: "image/*",
      // 默认限制上传1个文件
      limit: 1,
      // 默认不限制文件大小
      maxSize: 0,
      // 上传函数默认为undefined
      upload: undefined,
      // 错误处理回调默认为undefined
      onError: undefined,
      // 成功回调默认为undefined
      onSuccess: undefined,
      // 默认HTML属性为空对象
      HTMLAttributes: {},
    }
  },

  /**
   * 定义节点属性
   * 这些属性将在节点实例中可用
   */
  addAttributes() {
    return {
      // 接受的文件类型属性，默认值来自选项
      accept: {
        default: this.options.accept,
      },
      // 文件数量限制属性，默认值来自选项
      limit: {
        default: this.options.limit,
      },
      // 文件大小限制属性，默认值来自选项
      maxSize: {
        default: this.options.maxSize,
      },
    }
  },

  /**
   * 定义如何从HTML解析为编辑器节点
   * 返回一个选择器数组，用于识别HTML中的image-upload节点
   */
  parseHTML() {
    return [{ tag: 'div[data-type="image-upload"]' }]
  },

  /**
   * 定义节点的HTML渲染方式
   * @param {Object} props - 包含HTMLAttributes等属性
   * @returns {Array} 渲染数组，格式为[标签名, 属性对象]
   */
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      // 合并默认属性和自定义HTML属性
      mergeAttributes({ "data-type": "image-upload" }, HTMLAttributes),
    ]
  },

  /**
   * 添加节点视图
   * 使用React组件渲染节点内容
   */
  addNodeView() {
    // 返回使用React组件渲染的节点视图
    return ReactNodeViewRenderer(ImageUploadNodeComponent)
  },

  /**
   * 定义与imageUpload节点相关的命令
   * 这些命令可以通过editor.commands调用
   */
  addCommands() {
    return {
      // 设置imageUpload节点的命令
      setImageUploadNode:
        (options) =>
        ({ commands }) => {
          // 插入一个新的imageUpload节点，并传入配置选项作为属性
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },

  /**
   * 添加键盘快捷键处理
   * 实现Enter键在选中上传组件时触发上传操作
   */
  addKeyboardShortcuts() {
    return {
      // 定义Enter键的处理逻辑
      Enter: ({ editor }) => {
        // 获取当前选择状态和光标位置后的节点
        const { selection } = editor.state
        const { nodeAfter } = selection.$from

        // 检查光标后是否是imageUpload节点且该节点处于激活状态
        if (
          nodeAfter &&
          nodeAfter.type.name === "imageUpload" &&
          editor.isActive("imageUpload")
        ) {
          // 获取节点对应的DOM元素
          const nodeEl = editor.view.nodeDOM(selection.$from.pos)
          if (nodeEl && nodeEl instanceof HTMLElement) {
            // 由于NodeViewWrapper被div包裹，我们需要点击第一个子元素
            const firstChild = nodeEl.firstChild
            if (firstChild && firstChild instanceof HTMLElement) {
              // 模拟点击操作，触发上传组件的点击事件
              firstChild.click()
              return true // 返回true表示已处理该快捷键
            }
          }
        }
        return false // 返回false表示未处理该快捷键
      },
    }
  },
})

export default ImageUploadNode
