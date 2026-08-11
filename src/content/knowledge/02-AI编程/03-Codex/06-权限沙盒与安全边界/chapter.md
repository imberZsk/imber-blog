# Codex（5）- 权限、沙盒与安全边界

> 读完你能：围绕“权限、沙盒与安全边界”理解“概念解释”与“使用示例”，并结合正文示例完成实践与排障。

Codex 能运行命令、读写文件，所以安全边界非常重要。你需要理解两个概念：sandbox 和 approval。

- sandbox 决定 Codex 能在什么范围内执行命令。
- approval 决定哪些操作需要先问你。

这很像浏览器权限：页面能不能访问摄像头是一回事，访问前要不要弹窗确认是另一回事。

# 一、概念解释

常见沙盒模式：

| 模式 | 含义 | 适合场景 |
| --- | --- | --- |
| `read-only` | 只读，不能写文件 | 解释、审查、风险评估 |
| `workspace-write` | 可写当前工作区 | 常规开发任务 |
| `danger-full-access` | 基本不限制文件访问 | 你明确知道风险的本地任务 |

常见审批策略：

| 策略 | 含义 |
| --- | --- |
| `untrusted` | 只允许可信命令直接跑，其他询问 |
| `on-request` | Codex 判断何时请求审批 |
| `never` | 不询问，失败就返回给 Codex |

注意：不同环境可能有额外外层限制。不要把“CLI 参数允许”理解成“所有环境都一定能执行”。

# 二、使用示例

## 2.1 只读审查

```bash
codex exec \
  -C /path/to/project \
  --sandbox read-only \
  --ask-for-approval never \
  "请审查当前项目的测试覆盖风险，不要修改文件"
```

适合你只想要报告，不希望它动代码。

## 2.2 常规开发

```bash
codex \
  -C /path/to/project \
  --sandbox workspace-write \
  --ask-for-approval on-request \
  "帮我修复用户列表分页 bug，并运行相关测试"
```

Codex 可以在项目里改文件，遇到需要更高权限的操作再问你。

## 2.3 高风险模式

```bash
codex \
  -C /path/to/project \
  --sandbox danger-full-access \
  --ask-for-approval never
```

这个组合风险很高，只适合外部已经隔离好的环境，比如临时容器、一次性工作区。

# 三、什么操作要特别小心

- 删除文件或目录。
- 改数据库迁移。
- 修改生产配置。
- 操作云资源。
- 写入全局配置。
- 提交、推送、发布。
- 处理密钥、cookie、token。

这类任务要明确写边界，并尽量让 Codex 先给计划。

# 四、常见错误

## 4.1 错误 1：为了省事长期使用最高权限

`danger-full-access` 很方便，但它会让误操作的影响范围变大。日常开发优先使用 `workspace-write`。

## 4.2 错误 2：把密钥贴给 Codex

不要把真实 token、cookie、私钥写进提示词或文件。需要调试鉴权时，用脱敏样例。

```text
Authorization: Bearer <redacted-token>
```

## 4.3 错误 3：让 Codex 直接操作生产环境

比如：

```text
帮我连上生产数据库删掉异常数据。
```

更安全的流程是：

1. 让 Codex 分析 SQL。
2. 在只读环境验证查询。
3. 人工确认变更脚本。
4. 走团队发布流程。

# 五、最佳实践

- 默认从最小权限开始。
- 高风险任务先让 Codex 输出计划，不直接执行。
- 把禁止事项写进提示词和 AGENTS.md。
- 对外部系统操作优先通过 MCP 或内部工具封装权限，而不是让 Codex 拿裸密钥。
- 执行前后检查 git diff，确认没有无关改动。

# 六、本章小结

安全不是“不让 Codex 做事”，而是给它合适的活动范围。低风险任务放开一点，高风险任务收紧一点，才是长期可用的方式。

# 七、总结

- **概念解释**：注意：不同环境可能有额外外层限制。
- **使用示例**：适合你只想要报告，不希望它动代码。
- **什么操作要特别小心**：处理密钥、cookie、token。
- **常见错误**：danger-full-access 很方便，但它会让误操作的影响范围变大。

<!-- knowledge-lab-merged -->

# 动手实践：05 sandbox and approval

这个 demo 用来练习不同权限组合下该如何给 Codex 任务。

## 目录内容

- `safe-review-prompt.md`：只读审查任务。
- `write-task-prompt.md`：允许修改工作区的任务。
- `notes.md`：示例文件。

## 使用方式

只读审查：

```bash
codex exec --sandbox read-only --ask-for-approval never - < safe-review-prompt.md
```

允许修改当前工作区：

```bash
codex --sandbox workspace-write --ask-for-approval on-request - < write-task-prompt.md
```

## 练习目标

- 理解只读任务和写任务的区别。
- 给高风险操作设置明确边界。
- 学会在提示词里写禁止事项。
