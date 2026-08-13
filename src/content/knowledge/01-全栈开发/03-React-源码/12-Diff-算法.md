# React 源码（12） - Diff 算法

> 读完后，你应能解释“一、diff 的入口”，复现“二、单节点 diff”的最小实现，并用“三、多节点 diff”检查结果与失败边界。

`packages/react-reconciler/src/ReactChildFiber.old.js`

# 一、diff 的入口

如下图，`react diff` 不管是 `FunctionComponent` 还是 `HostComponent` 都会来到 `reconcileChildren`，然后分为单节点 `reconcileSingleElement` 和 多节点 `reconcileChildrenArray` 的 `diff`(忽略一些别的情况，如文本节点 diff)

![](/posts/react-source/diff-enter.png)

# 二、单节点 diff

`diff` 的时候，如果它是个 `ReactElement` 类型，则是单节点

当新旧 Fiber 节点进行比较时，Diff 算法会根据节点的类型（type）和 key 属性进行判断：

- 类型不同：如果新旧节点的 type 不同，React 会直接销毁旧节点及其子树，并创建新节点及其子树。例如，一个 <p> 标签变为 <div> 标签。

- 类型相同，但 key 不同：如果新旧节点的 type 相同，但 key 不同，React 也会销毁旧节点，并创建新节点。key 的作用是帮助 React 识别列表中的唯一元素，当 key 改变时，意味着元素本身发生了变化。

类型和 key 都相同：这是最理想的情况。React 会复用旧的 Fiber 节点，并继续比较它们的属性（props）。如果属性有变化，React 会标记该节点需要更新，并继续递归比较其子节点。（但是 props 的比较在 `beginWork` 中）

# 三、多节点 diff

当一个组件的子节点列表发生变化时，Diff 算法会采用更复杂的策略来优化更新过程。它会分两个阶段进行比较：

# 四、第一阶段：线性扫描（顺序匹配、新节点耗尽删除旧节点、旧节点耗尽创建新节点）

React 会从左到右线性扫描新旧两个列表，尝试直接按位置进行节点的复用。这个阶段会处理以下几种情况：

- 更新：如果新旧节点在相同位置且 `key` 和 `type` 都相同，React 会复用旧节点并更新其属性，然后继续比较它们的子节点。

- 删除：如果旧列表中某个位置的节点在新列表中没有对应的 `key` 或 `type` 匹配，或者新列表提前结束，那么旧列表中剩余的节点会被标记为删除。

- 插入/移动：如果新列表中某个位置的节点在旧列表中没有对应的 `key` 或 `type` 匹配，或者在旧列表中找到了匹配但位置不同，那么该节点会被标记为插入或移动。

这个阶段会一直进行，直到新旧列表中的某个指针到达末尾，或者遇到第一个 `key` 或 `type` 不匹配的节点，这个时候就会跳转到第二阶段进行哈希比较。

# 五、第二阶段：哈希映射比较

如果第一阶段没有完全匹配所有节点（即新旧列表的长度不同，或者中间出现了不匹配的节点），React 会进入第二阶段。在这个阶段，React 会将旧列表中剩余的未处理节点存储在一个 Map 结构中，以 key 为键，Fiber 节点为值。需要特别指出的是react内部通过`lastPlacedIndex`机制来高效的判断哪些既有元素（在上次渲染中已存在的元素）需要移动位置，哪些可以保持在原位。lastPlacedIndex会被赋值为在上一个阶段中最后一个被成功复用且不需要移动的元素其原始索引（ oldIndex ），如果没有，则为0；

然后，React 会继续遍历新列表中剩余的未处理节点，并尝试在 Map 中查找匹配的 key：

- 找到匹配：如果在新列表中找到了一个节点，其 key 在 Map 中有匹配的旧节点，React 会比较这个旧元素的原始索引 ( current.index 或 oldIndex ) 与当前的 lastPlacedIndex
  - 如果 `oldIndex` < `lastPlacedIndex` ：这意味着这个旧元素在旧列表中的位置，比我们上一个放置的、不需要移动的元素的位置还要靠前。为了维持新列表的顺序，这个旧元素必须向右移动到新的位置。所以，React 会给这个元素的 Fiber 节点打上 Placement 标记，表示它需要被移动。
  - 如果 `oldIndex` >= `lastPlacedIndex` ：这意味着这个旧元素在旧列表中的位置，不小于（即等于或在其后）我们上一个放置的、不需要移动的元素的位置。这表明该元素可以保持其相对顺序，不需要移动。在这种情况下，React 会更新 lastPlacedIndex = oldIndex ，因为这个元素现在是新的 “最后一个不需要移动的元素” 中在旧列表里索引最大的那个。

-未找到匹配：如果一个新的子元素在旧列表中找不到对应的元素，那么它就是一个新插入的元素。React 会为它创建一个新的 Fiber 节点，并打上 Placement 标记。这种情况下， lastPlacedIndex 通常不会因为这个插入操作而改变，因为它只关心旧元素的位置。

最后，Map 中剩余的旧节点（即在新列表中没有找到匹配的节点）会被标记为删除。

这种两阶段的处理方式有几个重要的优势：

1. 第一阶段的线性扫描可以快速处理最常见的情况（列表末尾添加或不变）
2. 第二阶段的哈希映射让查找复用节点的时间复杂度从 O(n) 降低到 O(1)
3. lastPlacedIndex 的使用让 React 能够最小化 DOM 移动操作
   这个算法在处理大型列表更新时特别高效，因为它能够在保持较低时间复杂度的同时，最小化 DOM 操作的次数。

# 六、示例

```js
// 旧列表
<ul>
  <li key="A">A</li>
  <li key="B">B</li>
  <li key="C">C</li>
  <li key="D">D</li>
</ul>

// 新列表
<ul>
  <li key="A">A</li>
  <li key="C">C</li>
  <li key="B">B</li>
  <li key="D">D</li>
</ul>
```

处理过程：

1. 第一阶段：

- A 可以直接复用
  到 B/C 时发现不匹配，进入第二阶段
- 第二阶段：

2. 将剩余的旧节点（B、C、D）放入 Map

- 处理 C：从 Map 中找到并复用，lastPlacedIndex = 2
- 处理 B：从 Map 中找到，但因为 B 的原始位置(1) < lastPlacedIndex(2)，需要移动
- 处理 D：从 Map 中找到并复用，位置正确

# 七、总结

- **diff 的入口**：如下图，react diff 不管是 FunctionComponent 还是 HostComponent 都会来到 reconcileChildren，然后分为单节点 reconcileSingleElement 和 多节点 reconcileChildrenArray 的 diff(忽略一些别的
- **单节点 diff**：diff 的时候，如果它是个 ReactElement 类型，则是单节点
- **多节点 diff**：当一个组件的子节点列表发生变化时，Diff 算法会采用更复杂的策略来优化更新过程。
- **第一阶段：线性扫描（顺序匹配、新节点耗尽删除旧节点、旧节点耗尽创建新节点）**：React 会从左到右线性扫描新旧两个列表，尝试直接按位置进行节点的复用。

## 参考资料

- [React 文档](https://react.dev/learn)
- [React 源码](https://github.com/facebook/react)
