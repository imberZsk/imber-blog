# Superpowers（6）- Code Review、Verification 与 Finishing：完成不等于写完

交付阶段要回答三个不同问题：实现是否满足规格、代码是否存在质量问题、分支下一步怎样处理。一次“测试通过”不能替代这三项判断。

# 一、两类审查

`requesting-code-review`
应提供需求、改动范围、基线与当前提交，让审查者优先报告会导致错误或回归的问题。收到意见后使用
`receiving-code-review`：先验证意见是否符合当前代码和运行环境，再修改真实问题，不能为了显得配合而盲改。

# 二、完成前验证

`verification-before-completion`
的核心是新鲜证据。准备宣布完成前，应重新运行能直接证明结论的命令：

```bash
# 检查实际改动范围，防止混入无关文件。
git diff --stat
git diff --check

# 使用项目自己的验证命令替换下面两行。
npm test
npm run build
```

“之前通过过”“看起来没问题”“代理说已经完成”都不是当前证据。命令失败时应如实报告失败，而不是把部分通过描述成全部通过。

# 三、分支收尾

`finishing-a-development-branch`
在验证通过后给出明确选择：本地合并、推送并创建 PR、保留分支稍后处理，或在得到授权后丢弃。涉及删除工作树或分支时，先检查未提交改动和远程状态。

# 四、官方资料

- [requesting-code-review](https://github.com/obra/superpowers/tree/main/skills/requesting-code-review)
- [receiving-code-review](https://github.com/obra/superpowers/tree/main/skills/receiving-code-review)
- [verification-before-completion](https://github.com/obra/superpowers/tree/main/skills/verification-before-completion)
- [finishing-a-development-branch](https://github.com/obra/superpowers/tree/main/skills/finishing-a-development-branch)

# 五、总结

- **两类审查**：requesting-code-review
- **完成前验证**：verification-before-completion
- **分支收尾**：finishing-a-development-branch
- **官方资料**：requesting-code-review

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“Superpowers（6）- Code Review、Verification 与 Finishing：完成不等于写完”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。
