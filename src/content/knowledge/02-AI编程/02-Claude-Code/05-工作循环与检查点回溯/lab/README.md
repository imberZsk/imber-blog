# Demo 04 · 读—改—跑—验证 + 检查点回溯实战

这个 Demo 是一个**带测试、且故意留了一个 bug** 的小项目（购物车计价）。你将完整体验一遍 Claude Code 的工作循环，并练习用 `Esc Esc` 回溯。

## 怎么用

1. 先建一个干净基线（强烈建议）：
   ```bash
   cd 05-工作循环与检查点回溯-demo
   git init && git add -A && git commit -m "baseline"
   ```
2. 跑测试，亲眼看到失败：
   ```bash
   node cart.test.js
   ```
   你会看到「折扣计算」相关用例不通过。
3. 启动 Claude Code，下达带验证方式的指令：
   ```
   运行 `node cart.test.js`，有用例失败。
   帮我定位 @cart.js 里的 bug 并修复，修完重新跑测试，全绿才算完成。
   ```
4. **观察它的工作循环**：读 → 改（看 diff）→ 跑测试 → 没过就自己再改 → 全绿交付。

## 练习检查点回溯

- 等它改完后，故意说一句「换个写法重来」之类的，让它再改一版；
- 然后按 **`Esc Esc`**，把文件回退到之前某一步，体会「后悔药」。
- 对比：`git diff` 看的是相对 baseline 的总改动；检查点回退的是会话内的某一步。

## 文件说明

- `cart.js`：购物车计价逻辑，`applyDiscount` 里有个故意的 bug。
- `cart.test.js`：极简测试（用 Node 自带 assert，无需安装依赖）。

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“Demo 04 · 读—改—跑—验证 + 检查点回溯实战”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
