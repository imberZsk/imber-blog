import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DecorationSet } from '@tiptap/pm/view'

export interface AIExtensionOptions {
  /**
   * AI API 端点
   */
  apiEndpoint?: string
  /**
   * 是否启用 AI 功能
   */
  enabled?: boolean
  /**
   * AI 动作回调
   */
  onAIAction?: (action: string, text: string) => Promise<string>
}

export const AIExtension = Extension.create<AIExtensionOptions>({
  name: 'aiExtension',

  addOptions() {
    return {
      apiEndpoint: '/api/ai',
      enabled: true,
      onAIAction: undefined
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('aiExtension'),
        props: {
          decorations: () => {
            // 这里可以添加 AI 处理中的视觉指示器
            return DecorationSet.empty
          }
        }
      })
    ]
  }

  // 移除 addCommands，因为类型定义有问题
  // AI 功能通过 AIDropdownMenu 组件直接调用 API 实现
})
