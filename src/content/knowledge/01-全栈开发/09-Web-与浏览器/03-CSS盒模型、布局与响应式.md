# Web 与浏览器（03） - CSS 盒模型、布局与响应式

> 读完你能：根据内容和交互选择正常流、Flex 或 Grid，并定位溢出、层叠和布局抖动。

## 核心知识清单

- CSS盒模型、box-sizing 与格式化上下文
- 正常流、Flexbox 与 Grid 的选择
- 层叠、优先级、继承与 Cascade Layers
- 定位、包含块、Stacking Context 与 z-index
- 响应式、容器查询与内容约束
- 重排、重绘与累积布局偏移

## 布局决策

文本和块级内容优先正常流；一维对齐用 Flex；二维轨道用 Grid。固定高度常导致字体放大或多语言溢出，应使用 `minmax()`、`min-inline-size: 0` 和内容驱动尺寸。`z-index` 只在同一层叠上下文内比较，盲目加大数字无法跨越父元素创建的上下文。

```css
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 24rem);
  gap: 1rem;
}

@container (max-width: 42rem) {
  .layout { grid-template-columns: minmax(0, 1fr); }
}
```

图片和嵌入内容预留宽高或 `aspect-ratio`，避免加载后推动正文。动画优先 `transform` 和 `opacity`，同时尊重 `prefers-reduced-motion`。

## 参考资料

- [MDN CSS Box Model](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Box_model)
- [MDN CSS Layout](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout)
