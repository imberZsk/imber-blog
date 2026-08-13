# 工程化工作流（14） - gstack：角色化产品研发与发布流水线

> gstack 把产品、架构、设计、代码审查、QA、安全、发布和复盘封装成角色化 Skills，让一个需求沿着可见交接点推进。

> 读完你能：选择最小 gstack 命令链，理解每个角色的输入输出，并避免把整套流程无差别套到每个小改动上。

## 核心知识清单

- Think、Plan、Build、Review、Test、Ship、Reflect
- office-hours 与产品问题重构
- plan-ceo、plan-design、plan-eng 与 autoplan
- review、qa、cso 与证据化质量门禁
- ship、land-and-deploy 与 canary
- 角色交接、共享产物和人工决策
- Superpowers 的工程纪律与 gstack 的生命周期覆盖

## gstack 的核心不是角色扮演

高质量角色必须有不同的检查对象和产物：`/office-hours` 质疑用户真实痛点；`/plan-ceo-review` 调整价值与范围；`/plan-eng-review` 检查数据流、失败路径和测试；`/review` 查实现缺陷；`/qa` 使用真实浏览器验证；`/cso` 做威胁建模；`/ship` 运行测试并创建 PR；`/canary` 观察发布后健康度。

如果每个角色只是换一种语气复述同一份 Prompt，就没有产生独立价值。交接必须落在文件、测试计划、Trace、截图、PR 或发布记录中，后续角色读取上一步真实产物。

## 最小命令链

官方安装方式和支持宿主会变化，执行前应以仓库 README 为准并审查安装脚本。一个中等功能可从下面的最小链开始：

```text
/office-hours
/autoplan
# 按批准计划实现
/review
/qa https://staging.example.com
/ship
```

涉及认证、支付、外部输入或权限时增加 `/cso`；PR 合并后需要自动部署与观测时才使用 `/land-and-deploy` 和 `/canary`。文案修复或明确的单测补充不需要跑完整链。

## 五个关键交接点

1. **产品到计划**：office-hours 的问题重构、用户证据和范围进入 plan review。
2. **计划到实现**：eng review 给出接口、状态、错误、测试和迁移，不只给任务标题。
3. **实现到审查**：review 读取真实 diff、项目规则和测试结果，不能只读 Agent 总结。
4. **审查到 QA**：QA 使用部署或本地可运行页面，保存操作步骤、截图和控制台证据。
5. **发布到运维**：ship 记录 commit、CI 和 PR；canary 以 SLO、错误和关键页面判断健康。

## 与 Superpowers 怎么组合

Superpowers 更像开发纪律：brainstorming、计划、worktree、TDD、系统调试、代码审查和分支收尾。gstack 覆盖更长的产品到生产生命周期。组合时只保留一个主流程：例如用 Superpowers 的 brainstorming/TDD 作为 gstack 的设计与实现细则，再把 `/review`、`/qa`、`/ship` 作为交付门禁。不要让两套工具各自创建重复计划和完成声明。

## 常见风险

- 命令和角色数量会快速变化，团队必须固定版本并记录升级差异。
- QA 能打开页面不代表后端数据、权限和异步任务已经验收。
- `/ship`、部署和浏览器会产生外部状态，应保持最小权限并在人类批准后执行。
- 宣传中的效率或缺陷发现数字不能直接迁移到你的团队，必须用自己的任务集评测。

## 学完验收

- 能为一个功能选出不超过六步的命令链，并说明删掉哪些角色及原因。
- 每个交接点都有可读取产物和失败回退。
- 发布完成与线上健康是两个状态，分别有证据和负责人。

## 参考资料

- [gstack 官方仓库](https://github.com/garrytan/gstack)
- [Superpowers 官方仓库](https://github.com/obra/superpowers)
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
