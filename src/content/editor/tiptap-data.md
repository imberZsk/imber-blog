## TipTap 编辑器（6）- 数据结构

### 插件对应的语义化标签

在 TipTap 编辑器中，不同的功能组件对应着不同的语义化 HTML 标签，这些标签不仅提供了视觉样式，更重要的是为屏幕阅读器和其他辅助技术提供了语义信息。

**根容器和工具栏**

- 根容器使用 `<div role="application" aria-label="富文本编辑器">`，其中 role 表示这个元素是什么，aria-label 虽然视觉不可见，但文本阅读器会读出，提高了可访问性
- 工具栏使用 `<div role="toolbar" aria-label="文本格式化">` 来标识工具栏的语义

**文本结构标签**

- 标题使用 `<h1>` 到 `<h6>` 标签，表示内容层级
- 正文段落使用 `<p>` 标签
- 代码块使用 `<pre>` 和 `<code>` 的组合
- 代码使用 `<code>` 标签
- 引用块使用 `<blockquote>` 明确表示引用自其他来源的内容

**列表和交互元素**

- 无序列表和有序列表分别使用 `<ul>` / `<ol>` 和 `<li>` 标签
- 复选框使用 `<div role="checkbox" aria-checked="true/false">` 或标准的 `<input type="checkbox">`
- 表格使用完整的表格标签结构：`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`

**文本格式标签**

- 粗体使用 `<strong>` 而不是 `<b>`，因为 strong 表示内容重要性，而 b 只是吸引注意，没有语义上的重要性
- 斜体使用 `<em>` 而不是 `<i>`，因为 em 是语义上的强调，i 表示不同语气或声音
- 下划线使用 `<u>` 标签
- 删除线使用 `<s>` 标签，**表示不再准确或不再相关的内容**（如商品原价），表示文档编辑的删除。而 `<del>` 则用于表示*从文档中删除*的内容，通常与 `<ins>` 配合使用，具有更严格的语义

**特殊格式标签**

- 代码片段使用 `<code>` 标签
- 标记/高亮使用 `<mark>` 标签
- 上标使用 `<sup>` 标签，表示上标（如 `x²`）
- 下标使用 `<sub>` 标签，表示下标（如 `H₂O`）
- 链接使用 `<a href="...">` 标签

这些语义化标签的使用不仅提高了内容的可访问性，还确保了在不同设备和环境下的一致表现，可以解决不同编辑器复制的时候兼容性问题。

### 渲染的数据

TipTap 编辑器支持多种数据格式的输入和输出，这为不同的使用场景提供了灵活性：

**支持的数据格式**

1. **HTML 字符串**
   - 直接使用 HTML 标签
   - 适合与现有 HTML 内容集成
   - 示例：`<p>Hello <strong>world</strong></p>`

2. **JSON 格式**
   - TipTap 的原生数据格式，基于 ProseMirror 的文档结构
   - 包含完整的节点信息和属性
   - 适合程序化处理和存储
   - 示例：

   ```json
   {
     "type": "doc",
     "content": [
       {
         "type": "paragraph",
         "content": [
           {
             "type": "text",
             "text": "Hello "
           },
           {
             "type": "text",
             "marks": [{ "type": "bold" }],
             "text": "world"
           }
         ]
       }
     ]
   }
   ```

3. **Markdown 格式**
   - 使用 `@tiptap/extension-markdown` 扩展支持
   - 轻量级标记语言，易于阅读和编辑
   - 适合文档写作和版本控制
   - 示例：`Hello **world**`

**数据转换方法**

TipTap 提供了丰富的数据转换 API，可以轻松在不同格式间转换：

**获取数据**

- `editor.getHTML()` - 获取 HTML 字符串格式
- `editor.getJSON()` - 获取 JSON 格式的文档结构
- `editor.getText()` - 获取纯文本内容

**设置数据**

- `editor.commands.setContent(htmlString)` - 设置 HTML 内容
- `editor.commands.setContent(jsonObject)` - 设置 JSON 内容
- `editor.commands.insertContent(content)` - 插入内容

**示例代码**

```javascript
// 获取不同格式的数据
const htmlContent = editor.getHTML()
const jsonContent = editor.getJSON()
const textContent = editor.getText()

// 设置内容
editor.commands.setContent('<p>Hello <strong>world</strong></p>')
editor.commands.setContent({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'world' }
      ]
    }
  ]
})

// 插入内容
editor.commands.insertContent('<p>New paragraph</p>')
```

**自定义转换**

- 支持自定义序列化器和解析器
- 可以扩展支持其他格式（如纯文本、富文本等）
- 可以创建自定义的导出/导入功能

**注意事项**

- JSON 格式提供了最完整的功能支持
- HTML 格式兼容性最好，适合与现有系统集成
- 高级 Markdown 功能（如表格、任务列表等）可能需要付费插件
