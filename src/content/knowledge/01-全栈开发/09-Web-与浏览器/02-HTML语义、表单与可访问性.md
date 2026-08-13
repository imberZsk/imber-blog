# Web 与浏览器（02） - HTML 语义、表单与可访问性

> 读完你能：用原生语义构建键盘可操作、可校验、可被辅助技术理解的页面骨架。

## 核心知识清单

- HTML 语义化、Landmark 与文档大纲
- Label、Fieldset 与原生表单校验
- 键盘焦点、Tab 顺序与焦点可见性
- Accessible Name、ARIA 与原生元素优先
- 图片替代文本、状态播报与错误关联
- 渐进增强与无 JavaScript 基线

## 语义优先

`button` 自带键盘、焦点和点击语义，`div role="button"` 需要补齐大量行为。标题层级表达结构，`nav`、`main`、`article` 帮助辅助技术导航。ARIA 用于补充平台缺少的语义，不能修复错误的焦点顺序或不可点击元素。

浏览器会把 HTML 解析成 DOM，同时基于元素角色、名称、状态和值生成可访问性树。屏幕阅读器、语音控制和自动化工具主要消费这棵语义树，而不是视觉像素。因此语义元素不仅影响 SEO，还决定不同输入设备能否理解和操作页面。

## 表单实现与错误反馈

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

`label` 的 `for` 必须指向唯一输入框；一组相关选项使用 `fieldset` 和 `legend`。原生 `required`、`type="email"` 等约束提供基础校验，但服务端仍需重复验证，因为客户端规则可以被绕过。提交失败时应同时提供错误摘要、字段级原因和可恢复操作。

## 键盘与动态状态

交互顺序应与 DOM 顺序一致，不用正数 `tabindex` 人工重排焦点。弹窗打开后把焦点移入，关闭后归还触发按钮；异步保存成功可用 `aria-live="polite"` 播报，阻断性错误使用 `role="alert"`。自定义组件至少验证 Tab、Shift+Tab、Enter、Space、Escape 和方向键行为。

## 失败边界与验收

常见失败包括把可点击 `div` 当按钮、图片没有与场景匹配的替代文本、标题为视觉大小而跳级、焦点样式被全局 CSS 移除，以及 ARIA 状态与真实 UI 不同步。优先修复原生结构，只有平台缺少对应语义时才补 ARIA。

验收时关闭鼠标完成一次关键流程，再使用浏览器 Accessibility Tree 检查名称和角色，并运行自动扫描。自动工具无法判断替代文本是否准确，也无法证明流程容易理解，最终仍需人工键盘和屏幕阅读器抽查。

## 参考资料

- [MDN HTML](https://developer.mozilla.org/en-US/docs/Web/HTML)
- [WAI Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/)
