# Demo 16 · /goal 目标导向实战

一个有失败测试 + 残留 console.log 的小项目，正好用来设一个「可判定」的目标，让 Claude 自己干到达标。

## 文件
- `calc.js`：几个计算函数，留了 bug + console.log
- `calc.test.js`：测试（会失败）
- `goal练习.md`：可判定 vs 不可判定目标对照

## 怎么练
1. 跑测试看失败：`node calc.test.js`
2. 设一个可判定目标让它自己跑到成：
   ```
   /goal `node calc.test.js` 全部通过，且 calc.js 里不再有任何 console.log
   ```
3. 观察：它跑测试→改→再跑→清掉 console.log→再验证，直到两个条件都满足才停。

## 非交互式（脚本/CI）
```bash
claude -p "/goal node calc.test.js 全部通过，且 calc.js 无 console.log"
```

## 可视化规格

> VISUAL_STRATEGY：流程图（Flowchart / Mermaid）
> DIAGRAM_DESCRIPTION：围绕“Demo 16 · /goal 目标导向实战”展示输入、关键处理步骤、主要分支、输出和失败回退；箭头必须标明数据流或控制流方向。
