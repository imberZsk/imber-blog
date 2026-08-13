# 前端框架与跨端（08） - 设计 Token、组件文档与多端界面架构

> 组件库不只是封装按钮。设计 Token、状态矩阵、可访问性、文档和版本策略共同决定它能否跨团队、跨框架和跨端复用。

> 读完你能：组织 CSS Modules、Tailwind、Storybook、Design Token、Web Components 和国际化，并判断何时需要跨端框架。

## 核心知识清单

- CSS 自定义属性、Sass、CSS Modules 与 Tailwind
- Design Token 的语义层、基础层与组件层
- Storybook 状态矩阵、交互测试与视觉回归
- 组件 API、可访问性与版本兼容
- Web Components 与框架无关组件
- 国际化、复数、日期、数字与 RTL
- 小程序跨端框架与原生能力边界

## 样式与 Token

CSS Modules 解决局部类名冲突，Tailwind 提供受约束的 Utility，Sass 适合构建期抽象，CSS 自定义属性支持运行时主题。它们不能替代 Design Token：Token 用 `color.text.danger` 等语义名表达设计决策，再映射到具体颜色、间距和字号。

Token 分基础值、语义值和组件值，发布时验证引用闭环与主题对比度。业务组件使用语义 Token，不能散落硬编码颜色。

## 组件文档

Storybook 为默认、加载、空、错误、禁用、长文本、小屏和键盘操作建立 Story。交互测试验证行为，视觉回归检测布局变化，但金额、权限等业务规则仍由确定性测试覆盖。

组件 API 明确受控/非受控模式、事件和错误边界。破坏性 Prop 变更通过弃用期和迁移说明发布，不能让各业务线同步停工升级。

## 多框架与多端

Web Components 适合需要跨框架嵌入的稳定基础组件，但复杂状态和服务端渲染需验证框架互操作。国际化不只是翻译文本，还包括复数规则、日期数字、时区、文本扩张和 RTL 布局。

小程序跨端框架可共享业务代码，但登录、支付、分包和性能仍受宿主平台约束。原生能力通过适配层暴露，不把平台判断散落业务组件。

## 参考资料

- [Design Tokens Format Module](https://www.designtokens.org/tr/drafts/format/)
- [Storybook Documentation](https://storybook.js.org/docs)
- [MDN Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
- [W3C Internationalization](https://www.w3.org/International/)

