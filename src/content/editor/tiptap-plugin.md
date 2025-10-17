# TipTap 编辑器（4）- 插件系统

## 前言

[TipTap](https://tiptap.dev/docs/editor/getting-started/overview) 是一个基于 ProseMirror 的现代富文本编辑器，它提供了强大的插件系统，让开发者可以轻松扩展编辑器的功能。

## 插件系统架构

TipTap 的插件系统基于 ProseMirror 的插件架构，每个插件都可以：

- 扩展编辑器的功能
- 修改文档结构
- 添加自定义命令
- 处理用户交互
- 管理编辑器状态

## 创建自定义插件

### 基础插件结构

下面是 bold 插件的源码

```javascript
/** @jsxImportSource @tiptap/core */
import { Mark, markInputRule, markPasteRule, mergeAttributes } from '@tiptap/core'

export interface BoldOptions {
  /**
   * HTML attributes to add to the bold element.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bold: {
      /**
       * Set a bold mark
       */
      setBold: () => ReturnType
      /**
       * Toggle a bold mark
       */
      toggleBold: () => ReturnType
      /**
       * Unset a bold mark
       */
      unsetBold: () => ReturnType
    }
  }
}

/**
 * Matches bold text via `**` as input.
 */
export const starInputRegex = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))$/

/**
 * Matches bold text via `**` while pasting.
 */
export const starPasteRegex = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))/g

/**
 * Matches bold text via `__` as input.
 */
export const underscoreInputRegex = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/

/**
 * Matches bold text via `__` while pasting.
 */
export const underscorePasteRegex = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))/g

/**
 * This extension allows you to mark text as bold.
 * @see https://tiptap.dev/api/marks/bold
 */
export const Bold = Mark.create<BoldOptions>({
  name: 'bold',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [
      {
        tag: 'strong',
      },
      {
        tag: 'b',
        getAttrs: node => (node as HTMLElement).style.fontWeight !== 'normal' && null,
      },
      {
        style: 'font-weight=400',
        clearMark: mark => mark.type.name === this.name,
      },
      {
        style: 'font-weight',
        getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test(value as string) && null,
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return (
      <strong {...mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)}>
        <slot />
      </strong>
    )
  },

  markdownTokenName: 'strong',

  parseMarkdown: (token, helpers) => {
    // Convert 'strong' token to bold mark
    return helpers.applyMark('bold', helpers.parseInline(token.tokens || []))
  },

  renderMarkdown: (node, h) => {
    return `**${h.renderChildren(node)}**`
  },

  addCommands() {
    return {
      setBold:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name)
        },
      toggleBold:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name)
        },
      unsetBold:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-b': () => this.editor.commands.toggleBold(),
      'Mod-B': () => this.editor.commands.toggleBold(),
    }
  },

  addInputRules() {
    return [
      markInputRule({
        find: starInputRegex,
        type: this.type,
      }),
      markInputRule({
        find: underscoreInputRegex,
        type: this.type,
      }),
    ]
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: starPasteRegex,
        type: this.type,
      }),
      markPasteRule({
        find: underscorePasteRegex,
        type: this.type,
      }),
    ]
  },
})
```

## 编辑器常用字段

### 扩展配置

#### [addOptions](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/extension#addoptions)

用于配置选项，也就是 extension.configure({})

```tsx
import { Extension } from '@tiptap/core'

const MyExtension = Extension.create({
  name: 'myExtension',
  addOptions: {
    myOption: 'myOption'
  }
})

export default MyExtension
```

#### [group](https://prosemirror.net/docs/ref/#model.NodeSpec.group)

表示分组到块级元素

```tsx
import { Extension } from '@tiptap/core'

const MyExtension = Extension.create({
  name: 'myExtension',
  group: 'block' // 告诉编辑器：我是一个块级元素
})
```

#### [content](https://prosemirror.net/docs/guide/#schema.content_expressions)

content: 'block+' 表示至少有一个块级元素，块级元素如 'paragraph | heading | codeBlock | blockquote | list'

```tsx
import { Extension } from '@tiptap/core'

const MyExtension = Extension.create({
  name: 'myExtension',
  content: 'block+'
})
```

#### [defining](https://prosemirror.net/docs/ref/#model.NodeSpec.defining)

默认是 false，设置为 true 时，光标在代码块内部时，上下箭头键不会轻易跳出代码块，需要明确的操作（如 Enter、Escape）才能离开。

```tsx
import { Extension } from '@tiptap/core'

const MyExtension = Extension.create({
  name: 'myExtension',
  defining: true
})
```

#### [parseHTML](https://prosemirror.net/docs/ref/#model.NodeSpec.parseHTML)

用于解析 HTML 为 ProseMirror 节点

```tsx
import { Extension } from '@tiptap/core'

const MyExtension = Extension.create({
  name: 'myExtension',
  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (node) => {
          return {
            class: node.getAttribute('class')
          }
        }
      }
    ]
  }
})
```

#### [renderHTML](https://prosemirror.net/docs/ref/#model.NodeSpec.renderHTML)

用于渲染 HTML 为 ProseMirror 节点

```tsx
const CustomMark = Mark.create({
  name: 'customMark',

  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0]
  }
})
```

#### addCommands

用于定义扩展命令，用户可以执行的命令

```tsx
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customExtension: {
      customCommand: () => ReturnType
    }
  }
}

const CustomExtension = Extension.create({
  name: 'customExtension',

  addCommands() {
    return {
      customCommand:
        () =>
        ({ commands }) => {
          return commands.setContent('Custom command executed')
        }
    }
  }
})
```

使用

```tsx
editor.commands.customCommand() // 'Custom command executed'
editor.chain().customCommand().run() // 'Custom command executed'
```

#### addAttributes

用于定义自定义属性

```tsx
const CustomMark = Mark.create({
  name: 'customMark',

  addAttributes() {
    return {
      customAttribute: {
        default: 'value',
        parseHTML: (element) => element.getAttribute('data-custom-attribute')
      }
    }
  }
})
```

#### addKeyboardShortcuts

用于定义扩展键盘快捷键

```tsx
const CustomExtension = Extension.create({
  name: 'customExtension',

  addKeyboardShortcuts() {
    return {
      'Mod-k': () => {
        console.log('Keyboard shortcut executed')
      }
    }
  }
})
```

### 添加插件到编辑器

```javascript
import { Editor } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'
import { customPlugin } from './customPlugin'

const editor = new Editor({
  extensions: [StarterKit, customPlugin()]
})
```

## 常用插件类型

### 1. 命令插件

Mark.create 和 Node.create 表示不同节点插件，而 Extension.create 表示功能插件可以修改编辑器行为，没有新的节点

- Extension 可以参考 [TextAlign](https://tiptap.dev/docs/editor/extensions/functionality/textalign)
- Node 可以参考 [Heading](https://tiptap.dev/docs/editor/extensions/nodes/heading) 或 [CodeBlock](https://tiptap.dev/docs/editor/extensions/nodes/code-block)
- Mark 可以参考 [Bold](https://tiptap.dev/docs/editor/extensions/marks/bold)

```javascript
import { Extension } from '@tiptap/core'

export const CustomCommand = Extension.create({
  name: 'customCommand',

  addCommands() {
    return {
      insertCustomContent:
        () =>
        ({ commands }) => {
          return commands.insertContent('<p>自定义内容</p>')
        }
    }
  }
})
```

### 2. 节点插件

```javascript
import { Node } from '@tiptap/core'

export const CustomNode = Node.create({
  name: 'customNode',

  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'div[data-custom]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-custom': '' }, 0]
  }
})
```

### 3. 标记插件

```javascript
import { Mark } from '@tiptap/core'

export const CustomMark = Mark.create({
  name: 'customMark',

  parseHTML() {
    return [{ tag: 'span[data-custom]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, 'data-custom': '' }, 0]
  }
})
```

## 高级插件功能

### 状态管理

```javascript
import { Extension } from '@tiptap/core'

export const StatePlugin = Extension.create({
  name: 'statePlugin',

  addStorage() {
    return {
      count: 0
    }
  },

  addCommands() {
    return {
      incrementCount:
        () =>
        ({ editor }) => {
          const currentCount = editor.storage.statePlugin.count
          editor.storage.statePlugin.count = currentCount + 1
          return true
        }
    }
  }
})
```

### 事件处理

```javascript
import { Extension } from '@tiptap/core'

export const EventPlugin = Extension.create({
  name: 'eventPlugin',

  onCreate() {
    console.log('编辑器创建')
  },

  onUpdate() {
    console.log('内容更新')
  },

  onSelectionUpdate() {
    console.log('选择更新')
  },

  onDestroy() {
    console.log('编辑器销毁')
  }
})
```

## 插件最佳实践

### 1. 性能优化

- 避免在插件中进行昂贵的计算
- 使用防抖处理频繁的事件
- 合理使用状态缓存

### 2. 错误处理

```javascript
export const SafePlugin = Extension.create({
  name: 'safePlugin',

  addCommands() {
    return {
      safeCommand:
        () =>
        ({ editor }) => {
          try {
            // 执行命令
            return true
          } catch (error) {
            console.error('命令执行失败:', error)
            return false
          }
        }
    }
  }
})
```

### 3. 配置选项

```javascript
export const ConfigurablePlugin = Extension.create({
  name: 'configurablePlugin',

  addOptions() {
    return {
      enabled: true,
      customOption: 'default'
    }
  },

  onCreate() {
    if (!this.options.enabled) {
      return
    }
    // 插件逻辑
  }
})
```

### editor 上的方法

插件开发的基础就是灵活使用插件的方法还有 editor 上的方法

- editor.getAttributes('textStyle') 用于获取当前选中文本或光标位置的属性信息。
- lift 解除

## 总结

TipTap 的插件系统为开发者提供了强大的扩展能力，通过合理使用插件，可以：

- 快速实现自定义功能
- 保持代码的模块化
- 提高开发效率
- 增强用户体验

掌握插件开发是使用 TipTap 的关键技能，希望这篇文章能帮助您更好地理解和使用 TipTap 的插件系统。
