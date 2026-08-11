# Demo 07 · 理解 / 查找 / 修复 三件套实战

一个**多文件的迷你项目**（用户登录 + 优惠券下单），故意埋了一个「优惠券偶尔没核销」的 bug。用来完整练习本章三件套。

## 项目结构
- `auth.js`：登录校验
- `coupon.js`：优惠券核销（埋了 bug）
- `order.js`：下单流程，串起 auth 和 coupon
- `order.test.js`：测试（会暴露 bug）

## 怎么练（照着第 07 章三件套）

1. 建基线：`git init && git add -A && git commit -m baseline`
2. 跑测试看失败：`node order.test.js`
3. 三件套对话：
   ```
   （理解）给我这个仓库的概览，说说下单流程怎么走。
   （查找）追踪从 placeOrder 到优惠券核销的完整代码路径。
   （修复）order.test.js 有用例失败。先别改，分析优惠券没核销的根因；
           认可后再修 @coupon.js，修完跑 `node order.test.js` 全绿才算完成。
   ```

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“Demo 07 · 理解 / 查找 / 修复 三件套实战”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
