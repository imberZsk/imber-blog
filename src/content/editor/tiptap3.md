# TipTap 编辑器（3）- 插件开发

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

```javascript
import { Plugin, PluginKey } from '@tiptap/pm/state'

const CustomPluginKey = new PluginKey('customPlugin')

export const customPlugin = () => {
  return new Plugin({
    key: CustomPluginKey,
    state: {
      init() {
        return {
          // 初始状态
        }
      },
      apply(tr, value) {
        // 状态更新逻辑
        return value
      }
    },
    props: {
      // 处理 DOM 事件
      handleDOMEvents: {
        click: (view, event) => {
          // 处理点击事件
          return false
        }
      }
    }
  })
}
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

## 调试插件

### 开发工具

```javascript
import { Extension } from '@tiptap/core'

export const DebugPlugin = Extension.create({
  name: 'debugPlugin',

  onCreate() {
    if (process.env.NODE_ENV === 'development') {
      console.log('编辑器状态:', this.editor.state)
      console.log('编辑器配置:', this.editor.options)
    }
  }
})
```

## 总结

TipTap 的插件系统为开发者提供了强大的扩展能力，通过合理使用插件，可以：

- 快速实现自定义功能
- 保持代码的模块化
- 提高开发效率
- 增强用户体验

掌握插件开发是使用 TipTap 的关键技能，希望这篇文章能帮助您更好地理解和使用 TipTap 的插件系统。
