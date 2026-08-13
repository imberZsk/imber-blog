# 工程化工作流（15） - PUA Skill：持续排障、主动验证与边界

> PUA Skill 用压力升级文案承载一套“不要过早放弃”的行为协议；真正可复用的是根因调查、换假设、验证闭环和主动性，而不是刺激性措辞。

> 读完你能：审查 PUA 的触发、排障和验证机制，保留有用工程纪律，并为成本、范围、安全和人机沟通设置硬边界。

## 核心知识清单

- 重复失败、甩锅、空口完成和被动等待触发
- 根因、事实、完成证据与同类问题检查
- 失败升级、错误签名和本质不同方案
- 工具调用、Token、延迟与范围成本
- 安全权限、破坏性动作与人工批准
- 修辞层和工程方法层的分离
- PUA Loop 与可靠 Loop Engineering 的差异

## 它实际提供什么

`tanweai/pua` 把常见失败模式编码为 Skill：重复同一方案、未验证就归因环境、把任务推回用户、修完表面问题就停止、没有运行测试却声称完成。触发后要求读取错误、搜索资料、检查源码、验证前提、反转假设，并在完成前给出构建或测试证据。

这些纪律与系统化调试、verification-before-completion 高度重叠。PUA 的独特部分是分级压力修辞和多种“企业文化”风格，它可能增加注意力，也可能制造噪声、冒犯或诱导 Agent 越权。团队应把“方法”与“语气”拆开评审。

## 建议保留的协议

```yaml
trigger:
  repeated_failure: 2                # 连续失败两次后才升级，不干扰首次尝试。
  unsupported_completion_claim: true # 空口完成时强制要求实际证据。
  unverified_environment_blame: true # 未验证就归因环境时触发调查。
required_actions:
  - preserve_original_error                 # 保留未经改写的原始失败信号。
  - list_attempted_hypotheses               # 避免忘记已经失败的方案。
  - inspect_primary_source                  # 优先核对源码或官方资料。
  - choose_materially_different_next_step   # 禁止只微调同一失败方案。
  - run_acceptance_commands                 # 完成声明必须绑定验收输出。
limits:
  max_iterations: 5                   # 限制循环轮次。
  max_minutes: 30                     # 限制持续执行时间。
  max_changed_files: 8                # 限制自动修改范围。
  destructive_actions: human_approval # 破坏性动作不能随失败升级自动获权。
stop:
  - acceptance_passed                       # 验收通过后成功停止。
  - no_new_evidence                         # 无新证据时转人工而非原地重试。
  - budget_exhausted                        # 任一预算耗尽时停止。
  - permission_or_business_decision_required # 需要新授权或业务决策时暂停。
```

生产采用时优先把这些约束写成普通、可审计的 Skill；修辞做成可关闭展示层。失败升级不能扩大权限，也不能把“穷尽一切”解释为无限网络请求、无边界重构、绕过审批或修改用户未授权的数据。

## PUA Loop 不等于可靠循环

`/pua:pua-loop` 等模式强调持续迭代，但可靠 Loop 还需要外部状态、确定性进度、错误去重、预算、幂等和 checkpoint。压力文案只能影响模型倾向，无法替代控制器。关键操作应由 Harness 强制限制，验证应由测试、Schema、浏览器或监控完成。

## 怎么评测是否真的有用

准备相同的失败任务集，固定模型、版本、初始上下文和权限，比较启用前后的任务成功率、真实缺陷发现、验证覆盖、工具调用、Token、耗时和无关改动。仓库 README 中的 benchmark 是项目方报告，可作为假设，不能代替独立复现。若成功率不升而成本、越界和噪声上升，应停用或只保留验证协议。

## 不适用场景

- 平静的首次尝试，不应提前引入压力和额外流程。
- 法务、医疗、人事等高风险决策，持续施压不能替代专家与审批。
- 用户要求仅诊断或只读时，主动性不能变成未经授权的修复。
- 团队沟通规范不接受冒犯式语言时，必须使用中性方法版。

## 学完验收

- 能从 PUA 中分离三条可执行工程纪律和三条必须限制的风险。
- 同一任务能用对照实验判断净收益，而不是引用项目宣传数字。
- 连续失败后会换假设、保留证据并按预算停止，不会越权“坚持到底”。

## 参考资料

- [PUA Skill 官方仓库](https://github.com/tanweai/pua)
- [Superpowers Systematic Debugging](https://github.com/obra/superpowers/tree/main/skills/systematic-debugging)
- [Superpowers Verification Before Completion](https://github.com/obra/superpowers/tree/main/skills/verification-before-completion)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
