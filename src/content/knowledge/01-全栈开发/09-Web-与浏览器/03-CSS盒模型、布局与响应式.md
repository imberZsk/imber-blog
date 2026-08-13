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

布局机制先计算盒尺寸，再根据格式化上下文分配位置。默认 `content-box` 的声明宽度不含内边距和边框，组件库通常统一使用 `border-box`，让外部尺寸可预测。Flex 根据主轴分配剩余空间，Grid 根据显式轨道处理二维关系；两者都不能替代内容自身的最小尺寸约束。

## 响应式实现

```css
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 24rem);
  gap: 1rem;
}

@container (max-width: 42rem) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

图片和嵌入内容预留宽高或 `aspect-ratio`，避免加载后推动正文。动画优先 `transform` 和 `opacity`，同时尊重 `prefers-reduced-motion`。

页面级结构使用媒体查询，组件是否换行则优先容器查询，避免组件依赖整个视口。文本容器保留可换行能力，长 URL、代码和国际化文案需要 `overflow-wrap` 或横向滚动策略。断点来自内容失效的位置，不按某个设备型号硬编码。

## 层叠与定位边界

样式结果由来源、层、优先级和声明顺序共同决定。使用 Cascade Layers 区分 reset、组件和覆盖层，比不断增加选择器权重更可维护。`transform`、`opacity`、`isolation` 等属性可能创建新的层叠上下文；浮层被遮挡时先检查祖先上下文和裁剪，再决定是否通过 Portal 移到顶层。

## 性能、失败与验收

布局抖动常由图片无尺寸、字体替换、异步插入内容和测量后立即写样式引起。批量读取布局信息，再在下一帧统一写入；高频动画避免改变 `width`、`top` 等触发布局的属性。过度使用 `will-change` 会增加合成层和显存，不能作为通用优化。

验收至少覆盖窄屏、宽屏、最长文案、200% 缩放、减少动态效果和慢速资源加载。检查横向溢出、焦点遮挡、CLS 与浮层层级；只在设计稿尺寸下截图通过，不能证明响应式实现正确。

## 参考资料

- [MDN CSS Box Model](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Box_model)
- [MDN CSS Layout](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout)
