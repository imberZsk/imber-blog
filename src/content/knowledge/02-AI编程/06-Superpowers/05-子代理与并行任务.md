# Superpowers（5）- Subagent Driven Development：把独立任务交给独立上下文

> 读完你能：围绕“Subagent Driven Development：把独立任务交给独立上下文”理解“标准循环”与“何时可以并行”，并结合正文示例完成实践与排障。

`subagent-driven-development`
适合已经有明确计划、任务之间大体独立的实现。每个任务使用新的子代理上下文，完成后再经过规格审查和代码质量审查，避免一个长会话积累错误假设。

# 一、标准循环

1. 主代理读取完整计划，提取任务和上下文。
2. 为一个任务派发实现代理。
3. 实现代理编码、测试并自查。
4. 规格审查代理只检查是否满足需求、是否多做。
5. 代码质量审查代理检查缺陷、可维护性和测试。
6. 问题修正并复审通过后，再进入下一任务。

# 二、何时可以并行

`dispatching-parallel-agents`
只适合互不依赖的调查或改动，例如分别分析三个独立测试失败。以下情况不要并行：

- 两个任务会修改同一文件。
- 第二个任务依赖第一个任务产生的接口。
- 根因未知，多个失败可能来自同一问题。
- 需要共享浏览器、数据库或其他有状态资源。

# 三、可直接使用的派发模板

```text
任务：只实现计划中的“收藏状态解析”。
边界：只允许修改 src/lib/favorites.ts 和对应测试，不处理 UI。
验收：无效 JSON 回退为空集合；运行目标测试并报告命令与结果。
完成前：检查 git diff，列出任何仍未解决的问题，不要自行提交。
```

并行的目标不是让更多代理同时写代码，而是缩短真正独立工作的等待时间。

# 四、官方资料

- [subagent-driven-development](https://github.com/obra/superpowers/tree/main/skills/subagent-driven-development)
- [dispatching-parallel-agents](https://github.com/obra/superpowers/tree/main/skills/dispatching-parallel-agents)

# 五、总结

- **标准循环**：主代理读取完整计划，提取任务和上下文。
- **何时可以并行**：dispatching-parallel-agents
- **可直接使用的派发模板**：并行的目标不是让更多代理同时写代码，而是缩短真正独立工作的等待时间。
- **官方资料**：subagent-driven-development
