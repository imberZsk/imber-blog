import { Node } from '@tiptap/core'

export enum ColumnLayout {
  SidebarLeft = 'sidebar-left',
  SidebarRight = 'sidebar-right',
  TwoColumn = 'two-column'
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columns: {
      setColumns: () => ReturnType
      setLayout: (layout: ColumnLayout) => ReturnType
    }
  }
}

export const Columns = Node.create({
  name: 'columns',

  group: 'columns',

  content: 'column column',

  // 节点默认会被丢弃，因为整个内容被替换（例如粘贴新内容时）。如果需要保留节点进行此类替换作，请将其配置为定义作 。
  defining: true,

  // 隔离节点：设为true表示该节点是隔离的，不会与其他节点合并
  isolating: true,

  addAttributes() {
    return {
      layout: {
        default: ColumnLayout.TwoColumn
      }
    }
  },

  addCommands() {
    return {
      setColumns:
        () =>
        ({ commands }) =>
          commands.insertContent(
            `<div data-type="columns"><div data-type="column" data-position="left"><p></p></div><div data-type="column" data-position="right"><p></p></div></div>`
          ),
      setLayout:
        (layout: ColumnLayout) =>
        ({ commands }) =>
          commands.updateAttributes('columns', { layout })
    }
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-type': 'columns', class: `layout-${HTMLAttributes.layout}` }, 0]
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="columns"]'
      }
    ]
  }
})

export default Columns
