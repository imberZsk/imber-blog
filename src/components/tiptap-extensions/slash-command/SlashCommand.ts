import { Editor, Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import tippy from 'tippy.js'

import { GROUPS } from './groups'
import { MenuList } from './MenuList'

// 扩展名称常量
const extensionName = 'slashCommand'

// 全局弹窗实例，用于显示命令菜单
let popup: any

/**
 * SlashCommand 扩展
 * 实现类似 Notion 的斜杠命令功能，用户输入 "/" 后可以快速插入各种内容块
 */
export const SlashCommand = Extension.create({
  name: extensionName,

  // 设置较高的优先级，确保在其他扩展之前加载
  priority: 200,

  /**
   * 扩展创建时的初始化
   * 创建 tippy.js 弹窗实例，用于显示命令菜单
   */
  onCreate() {
    popup = tippy('body', {
      interactive: true, // 允许用户与弹窗交互
      trigger: 'manual', // 手动控制显示/隐藏
      placement: 'bottom-start', // 弹窗位置：下方左对齐
      theme: 'slash-command', // 自定义主题
      maxWidth: '16rem', // 最大宽度
      offset: [16, 8], // 偏移量 [垂直, 水平]
      popperOptions: {
        strategy: 'fixed', // 使用 fixed 定位策略
        modifiers: [
          {
            name: 'flip', // 禁用自动翻转，保持固定位置
            enabled: false
          }
        ]
      }
    })
  },

  /**
   * 添加 ProseMirror 插件
   * 使用 Suggestion 插件实现斜杠命令功能
   */
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/', // 触发字符
        allowSpaces: true, // 允许空格
        startOfLine: true, // 必须在行首
        pluginKey: new PluginKey(extensionName),

        /**
         * 判断是否允许显示建议菜单
         * @param state - 编辑器状态
         * @param range - 选择范围
         * @returns 是否允许显示菜单
         */
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from)
          const isRootDepth = $from.depth === 1 // 在根层级
          const isParagraph = $from.parent.type.name === 'paragraph' // 在段落中
          const isStartOfNode = $from.parent.textContent?.charAt(0) === '/' // 以 "/" 开头
          // TODO: 列布局支持
          const isInColumn = this.editor.isActive('column') // 在列布局中

          // 检查 "/" 后的内容是否有效（不能以双空格结尾）
          const afterContent = $from.parent.textContent?.substring($from.parent.textContent?.indexOf('/'))
          const isValidAfterContent = !afterContent?.endsWith('  ')

          return (
            ((isRootDepth && isParagraph && isStartOfNode) || (isInColumn && isParagraph && isStartOfNode)) &&
            isValidAfterContent
          )
        },
        /**
         * 执行选中的命令
         * 删除斜杠命令文本，然后执行对应的动作
         * @param editor - 编辑器实例
         * @param props - 命令属性
         */
        command: ({ editor, props }: { editor: Editor; props: any }) => {
          const { view, state } = editor
          const { $head, $from } = view.state.selection

          const end = $from.pos
          // 计算斜杠命令的起始位置
          const from = $head?.nodeBefore
            ? end - ($head.nodeBefore.text?.substring($head.nodeBefore.text?.indexOf('/')).length ?? 0)
            : $from.start()

          // 删除斜杠命令文本
          const tr = state.tr.deleteRange(from, end)
          view.dispatch(tr)

          // 执行命令对应的动作
          props.action(editor)
          view.focus()
        },
        /**
         * 根据查询字符串过滤和返回命令项
         * @param query - 用户输入的查询字符串
         * @returns 过滤后的命令组
         */
        items: ({ query }: { query: string }) => {
          // 根据查询字符串过滤命令
          const withFilteredCommands = GROUPS.map((group) => ({
            ...group,
            commands: group.commands
              .filter((item) => {
                const labelNormalized = item.label.toLowerCase().trim()
                const queryNormalized = query.toLowerCase().trim()

                // 支持别名搜索
                if (item.aliases) {
                  const aliases = item.aliases.map((alias) => alias.toLowerCase().trim())
                  return labelNormalized.includes(queryNormalized) || aliases.includes(queryNormalized)
                }

                return labelNormalized.includes(queryNormalized)
              })
              // 过滤掉应该隐藏的命令
              .filter((command) => (command.shouldBeHidden ? !command.shouldBeHidden(this.editor) : true))
          }))

          // 移除空的命令组
          const withoutEmptyGroups = withFilteredCommands.filter((group) => {
            return group.commands.length > 0
          })

          // 为所有命令设置启用状态
          const withEnabledSettings = withoutEmptyGroups.map((group) => ({
            ...group,
            commands: group.commands.map((command) => ({
              ...command,
              isEnabled: true
            }))
          }))

          return withEnabledSettings
        },
        /**
         * 渲染建议菜单
         * 返回生命周期方法对象，处理菜单的显示、更新、隐藏等
         */
        render: () => {
          let component: any
          let scrollHandler: (() => void) | null = null

          return {
            /**
             * 菜单开始显示时的处理
             * @param props - 建议属性
             */
            onStart: (props: SuggestionProps) => {
              // 创建 React 组件渲染器
              component = new ReactRenderer(MenuList, {
                props,
                editor: props.editor
              })

              const { view } = props.editor

              /**
               * 获取参考元素的客户端矩形
               * 用于定位弹窗位置
               */
              const getReferenceClientRect = () => {
                if (!props.clientRect) {
                  // 防止类型报错: 显式指定 any
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error
                  return props.editor.storage[extensionName]?.rect
                }

                const rect = props.clientRect()

                if (!rect) {
                  // 尝试安全访问已缓存的 rect，避免类型报错
                  // const storage: Record<string, any> = props.editor.storage as Record<string, any>
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error
                  return storage[extensionName]?.rect ?? new DOMRect(0, 0, 0, 0)
                }

                let yPos = rect.y

                // 如果菜单会超出屏幕底部，则向上调整位置
                if (rect.top + component.element.offsetHeight + 40 > window.innerHeight) {
                  const diff = rect.top + component.element.offsetHeight - window.innerHeight + 40
                  yPos = rect.y - diff
                }

                return new DOMRect(rect.x, yPos, rect.width, rect.height)
              }

              // 滚动时更新弹窗位置
              scrollHandler = () => {
                popup?.[0].setProps({
                  getReferenceClientRect
                })
              }

              // 监听滚动事件
              view.dom.parentElement?.addEventListener('scroll', scrollHandler)

              // 配置并显示弹窗
              popup?.[0].setProps({
                getReferenceClientRect,
                appendTo: () => document.body,
                content: component.element
              })

              popup?.[0].show()
            },

            /**
             * 菜单更新时的处理
             * @param props - 建议属性
             */
            onUpdate(props: SuggestionProps) {
              // 更新组件属性
              component.updateProps(props)

              const { view } = props.editor

              /**
               * 获取参考元素的客户端矩形
               * 与 onStart 中的逻辑相同
               */
              const getReferenceClientRect = () => {
                if (!props.clientRect) {
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error
                  return props.editor.storage[extensionName].rect
                }

                const rect = props.clientRect()

                if (!rect) {
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error
                  return props.editor.storage[extensionName].rect
                }

                let yPos = rect.y

                // 防止菜单超出屏幕底部
                if (rect.top + component.element.offsetHeight + 40 > window.innerHeight) {
                  const diff = rect.top + component.element.offsetHeight - window.innerHeight + 40
                  yPos = rect.y - diff
                }

                return new DOMRect(rect.x, yPos, rect.width, rect.height)
              }

              // 滚动处理函数
              const scrollHandler = () => {
                popup?.[0].setProps({
                  getReferenceClientRect
                })
              }

              view.dom.parentElement?.addEventListener('scroll', scrollHandler)

              // 更新存储的矩形信息

              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              props.editor.storage[extensionName].rect = props.clientRect
                ? getReferenceClientRect()
                : {
                    width: 0,
                    height: 0,
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0
                  }

              // 更新弹窗属性
              popup?.[0].setProps({
                getReferenceClientRect
              })
            },

            /**
             * 键盘事件处理
             * @param props - 键盘事件属性
             * @returns 是否阻止默认行为
             */
            onKeyDown(props: SuggestionKeyDownProps) {
              // ESC 键隐藏菜单
              if (props.event.key === 'Escape') {
                popup?.[0].hide()
                return true
              }

              // 如果菜单未显示，则显示它
              if (!popup?.[0].state.isShown) {
                popup?.[0].show()
              }

              // 将键盘事件传递给组件处理
              return component.ref?.onKeyDown(props)
            },

            /**
             * 菜单退出时的清理工作
             * @param props - 建议属性
             */
            onExit(props) {
              // 隐藏弹窗
              popup?.[0].hide()

              // 移除滚动事件监听器
              if (scrollHandler) {
                const { view } = props.editor
                view.dom.parentElement?.removeEventListener('scroll', scrollHandler)
              }

              // 销毁组件
              component.destroy()
            }
          }
        }
      })
    ]
  },

  /**
   * 添加扩展存储
   * 用于存储弹窗位置信息
   */
  addStorage() {
    return {
      rect: {
        width: 0,
        height: 0,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
      }
    }
  }
})

export default SlashCommand
