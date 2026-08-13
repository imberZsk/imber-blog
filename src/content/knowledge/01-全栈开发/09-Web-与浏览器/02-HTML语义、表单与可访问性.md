# Web 与浏览器（02） - HTML 语义、表单与可访问性

> 读完你能：用原生语义构建键盘可操作、可校验、可被辅助技术理解的页面骨架。

## 核心知识清单

- HTML语义化、Landmark 与文档大纲
- Label、Fieldset 与原生表单校验
- 键盘焦点、Tab 顺序与焦点可见性
- Accessible Name、ARIA 与原生元素优先
- 图片替代文本、状态播报与错误关联
- 渐进增强与无 JavaScript 基线

## 语义优先

`button` 自带键盘、焦点和点击语义，`div role="button"` 需要补齐大量行为。标题层级表达结构，`nav`、`main`、`article` 帮助辅助技术导航。ARIA 用于补充平台缺少的语义，不能修复错误的焦点顺序或不可点击元素。

```html
<form aria-labelledby="profile-title">
  <h2 id="profile-title">个人资料</h2>
  <label for="email">邮箱</label>
  <input id="email" name="email" type="email" required aria-describedby="email-error" />
  <p id="email-error" role="alert"></p>
  <button type="submit">保存</button>
</form>
```

错误出现后保持用户输入，把焦点移动到错误摘要或首个无效字段，并通过 `aria-describedby` 关联具体原因。不要只用颜色表示状态。

## 参考资料

- [MDN HTML](https://developer.mozilla.org/en-US/docs/Web/HTML)
- [WAI Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/)
