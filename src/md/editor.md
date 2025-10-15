### 基于 tiptap3.x 的富文本编辑器

> 文章基于 tiptap3.x 版本，2025年07月更新的稳定版本
>
> 写作中...

### 需求

tiptap Demo

目的：通过使用 tiptap 开发富文本编辑器，提出基于 tiptap 的最佳技术解决方案。

目标：2周内交付 demo 代码。

课题：

1. 使用自定样式。✅ 使用 tailwind 实现
2. 开发自定义高亮组件。✅
3. 开发自定义分栏组件。

需要注意的点：

1. 组件与组件间的间距问题。✅ 上下边距重叠
2. 组件与组件的树型嵌套问题，如：多级无序、有序列表的嵌套样式问题。
3. 高亮组件中只允部分组件，如：不能再嵌套高亮组件、不能添加图片等。
4. 自定义组件以何种方式记录自定义数据的问题。
5. 自定义组件属性变化时，影响到组件内的内容时的切换问题。如：多列组件在列数发生变化时，列中的内容要同步按照预设的规则处理。
6. 编辑状态与非编辑状态的样式管理问题。
7. 需要考虑亮色与暗色状态时的兼容问题，如：红色，在亮色与暗色模式时是用两个不同的红色值。✅ tailwind

组件：

正文：16 1.6 2%，组件间距 16px ✅

标题组件：H1-H6，但只启用 h1-h3，样式如下：
H1 22 1.5 2%（字本大小、行高、字间距）✅
H2 19 1.5 2% ✅
H3 17 1.6 2% ✅
H1-H3 组件间距 16px ✅

粗体、斜体、删除线、下划线、代码。✅

段落对齐方式：左、中、右、两端。✅

分割线 hr。✅

超链接。✅

字体颜色：提供5种颜色。✅

字体高亮：提供5种颜色。✅

引用块：为引用的竖线提供 5 种颜色。✅

高亮块：提供 5 种颜色。✅

分栏：提供 2、3 和 取消分栏。

相关 demo 中用到的颜色，直接使用 tiptap template 中的颜色。❌

文章可编辑区的宽度最小 320 最大 720。✅

### 背景

我所在部门的项目会涉及编辑器，实现下面的需求并期望收获的一些知识点：

- tiptap 自定义合理的中文样式，以及样式隔离和可扩展方案架构
- tiptap 扩展最佳实践和规范
- 深入了解自定义开发插件的实现思路

### 知识点

- Tiptap extension & 快速集成

[extension 文档](https://tiptap.dev/docs/editor/extensions/overview)

- starterKit 中包含的 extension

[starterKit 文档](https://tiptap.dev/docs/editor/extensions/functionality/starterkit#included-extensions)

- Tiptap 官方编辑器 Demo

[tiptap-templates](https://github.com/ueberdosis/tiptap-templates?tab=readme-ov-file)

- Tiptap extension 配置

[extension 文档](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/extension)
[extension node 文档](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/node)
[extension mark 文档](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/mark)

### 思考如何自定义编辑器样式

tiptap 有 demo 是使用 @tailwindcss/typography 来实现编辑器样式，但是它的样式适合英文，不适合中文，需要想一套自定义方案，而且我觉得无 CSS 方案更优雅，所以我的方案应该全用 tailwind 来实现。

明确一下是整个页面切换主题，还是编辑器切换主题。页面一般只有黑白主题，但是编辑器有可能需要更多主题。

那我需要考虑的是，页面切换主题时，编辑器内的主题也应该随着切换，也就是编辑器的每一套主题其实都应该对应黑白色两种。

做主题的时候，我应该先把整个页面的黑白主题先做了，也就是 next-themes 来做，这个很简单。

然后编辑器主题的时候，怎么架构？怎么隔离？是否能支持不用的主题就不编译呢？

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

#### [addCommands]

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

#### [addKeyboardShortcuts]

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

### 其它方法

editor.getAttributes('textStyle') 用于获取当前选中文本或光标位置的属性信息。

lift 解除

### 编辑器样式方案

### 兼容性

### 组件嵌套

### 语义化

| 编辑器组件    | 语义化标签                                                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 根容器        | `<div role="application" aria-label="富文本编辑器">` role 表示这个元素是什么，aria-label 视觉不可见，但文本阅读器会读出，提高可访问性                      |
| 工具栏        | `<div role="toolbar" aria-label="文本格式化">`                                                                                                             |
| 标题          | `<h1> - <h6>`                                                                                                                                              |
| 正文段落      | `<p>`                                                                                                                                                      |
| 代码块        | `<pre>` + `<code>`                                                                                                                                         |
| 引用块        | `<blockquote>` 明确表示引用自其他来源的内容                                                                                                                |
| 无序/有序列表 | `<ul>` / `<ol>` + `<li>`                                                                                                                                   |
| 复选框        | `<div role="checkbox" aria-checked="true/false">` 或 `<input type="checkbox">`                                                                             |
| 表格          | `<table>, <thead>, <tbody>, <tr>, <th>, <td>`                                                                                                              |
| 粗体          | `<strong>` 而不是 `<b>`，strong 表示内容重要性，而 b 只是许引入注意，没有语义上的重要性                                                                    |
| 斜体          | `<em>` 而不是 `<i>`，em 是语义上的强调，i 表示不同语气或声音                                                                                               |
| 下划线        | `<u>`                                                                                                                                                      |
| 删除线        | `<s>`，**表示不再准确或不再相关的内容**（如商品原价）。表示文档编辑的删除。`<del>`则用于表示*从文档中删除*的内容，通常与 `<ins>`配合使用，具有更严格的语义 |
| 代码片段      | `<code>`                                                                                                                                                   |
| 标记/高亮     | `<mark>`                                                                                                                                                   |
| `上标`        | `<sup>`，表示上标（如 `x²`）                                                                                                                               |
| `下标`        | `<sub>`，表示下标（如 `H₂O`）                                                                                                                              |
| 链接          | `<a href="...">`                                                                                                                                           |
|               |                                                                                                                                                            |
|               |                                                                                                                                                            |
|               |                                                                                                                                                            |
|               |                                                                                                                                                            |
|               |                                                                                                                                                            |
|               |                                                                                                                                                            |
|               |                                                                                                                                                            |
|               |                                                                                                                                                            |
|               |                                                                                                                                                            |
|               |                                                                                                                                                            |
|               |                                                                                                                                                            |

### TODO

实现一个字数统计 Extension
