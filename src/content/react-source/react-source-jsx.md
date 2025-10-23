# React 源码（2）- JSX 和 ReactElement

## 前言

带着问题学习 React 源码，下面是一些参考资料

- 一些概念的问题，可以看卡颂大佬的 [React 技术揭秘](https://react.iamkasong.com/) ，永不过时
- 最精简的搞懂 React 核心逻辑，可以跟着国外一个大佬的博客写一遍， [Build Your Own React](https://pomb.us/build-your-own-react/)
- 细看 React 源码的时候，可以比对下某位大佬的 [源码流程图](https://www.processon.com/view/link/63bcef8cf27176074bb81a21)

## JSX（函数组件） 会被编译成什么？

在从 `ReactDOM.createRoot(document.getElementById('root'))` 之前，需要先了解 JSX，JSX 也就是 JS 的扩展，它可以通过 babel 编译成 JS ，这个结果可以在 [babel](https://www.babeljs.cn/repl#?browsers=defaults%2C%20not%20ie%2011%2C%20not%20ie_mob%2011&build=&builtIns=false&corejs=false&spec=false&loose=false&code_lz=GYVwdgxgLglg9mABAQQA6oBQEpEG8BQiiATgKZQjFIaFGIA8AJjAG6IQA2AhgM48ByXALakAvACI0qcQD5adBgAtSXRqWLtufQSIlSAtMtXrZANnP0A9EbXE5Cq8xb3EWfAF98-UgA9UcYihENWAuEA4gqXwgA&debug=false&forceAllTransforms=false&modules=false&shippedProposals=false&evaluate=false&fileSize=true&timeTravel=false&sourceType=module&lineWrap=true&presets=env%2Creact%2Cstage-2&prettier=true&targets=&version=7.28.4&externalPlugins=&assumptions=%7B%7D) 在线工具看

函数组件

```js
function App() {
  return (
    <div className="App">
      <header className="App-header">666</header>
    </div>
  )
}

export default App
```

babel classic 编译的代码

```js
function App() {
  return /*#__PURE__*/ React.createElement(
    'div',
    {
      className: 'App'
    },
    /*#__PURE__*/ React.createElement(
      'header',
      {
        className: 'App-header'
      },
      '666'
    )
  )
}
export default App
```

babel automatic 编译的代码（通过 @babel/plugin-transform-react-jsx 插件，并配置 { "runtime": "automatic" } ）

```js
import { jsx as _jsx } from 'react/jsx-runtime'
function App() {
  return /*#__PURE__*/ _jsx('div', {
    className: 'App',
    children: /*#__PURE__*/ _jsx('header', {
      className: 'App-header',
      children: '666'
    })
  })
}
export default App
```

对于包含多个子元素的 JSX 如：

```js
const list = (
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
)
```

它会被编译为 jsxs 函数调用，以优化静态子元素的性能：

```js
import { jsxs } from 'react/jsx-runtime'

const list = jsxs('ul', { children: [jsx('li', { children: 'Item 1' }), jsx('li', { children: 'Item 2' })] })
```

从这个编译结果，还能清楚另一个问题：为什么 React17 为什么不需要引入 React ？

小结：classic 编译的代码里，没有手动引入 React，却使用了 React.createElement 方法，而 automatic 编译的代码里，自动引入了 react/jsx-runtime

## React Element

一个典型的 React Element 对象结构如下：

```js
{
  $$typeof: Symbol.for('react.element'), // 唯一标识，防止 XSS 攻击
  type: 'h1', // 元素类型：字符串（DOM 标签）或函数/类（组件）
  key: null, // 用于列表渲染的唯一标识
  ref: null, // 用于获取 DOM 实例或组件实例的引用
  props: { // 元素的属性，包括 children
    className: 'greeting',
    children: 'Hello, world!'
  },
  _owner: null, // 内部属性，指向创建该 Element 的 Fiber
  _store: {}, // 内部属性，用于开发模式下的检查
  // ... 其他内部属性，如 _source, _self 等，主要用于开发模式和调试
}
```

## createElement 和 jsx 方法有什么区别吗？

它们的入参结构是不同的，createElement的入参是 (type, config, children)，jsx 的入参是 (type, config, maybeKey)，那它们有没有本质的区别呢？

![jsx](/posts/react-source/jsx.png)

小结：返回结果都是一样的，都是返回 ReactElement 对象，但是 jsx 的 props 参数 对应了 ReactElement 对象的 props 参数，而 createElement 会多做一些遍历生成 Props 参数，所以 jsx 方法性能会更好（这里也算一种看了源码之后，知道的性能优化）
