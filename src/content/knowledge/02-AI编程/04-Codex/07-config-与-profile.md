# Codex（07） - config 与 profile

> 读完后，你应能解释“5.1 错误 1：把项目规范都塞进 config”，复现“5.2 错误 2：profile 名字太抽象”的最小实现，并用“5.3 错误 3：自动化依赖隐式默认值”检查结果与失败边界。

如果你每次启动 Codex 都要手写一堆参数，说明这些参数应该进入配置。

Codex 支持通过配置文件保存默认行为，也支持用 profile 为不同场景准备不同配置。你可以把它理解成前端项目里的 `.env.development`、`.env.production`：同一个工具，在不同环境下使用不同默认值。

# 一、概念解释

常见配置内容包括：

- 默认模型。
- 默认沙盒模式。
- 默认审批策略。
- 是否启用某些 feature。
- MCP server 配置。
- hooks 配置。

CLI 里也可以用 `-c key=value` 临时覆盖配置：

```bash
codex -c model="gpt-5" -c shell_environment_policy.inherit=all
```

`-c` 的值会按 TOML 解析，适合临时试验。

# 二、profile 是什么

profile 是一组可切换配置。比如你可以准备：

| profile | 用途 |
| --- | --- |
| `safe` | 只读审查、学习、解释 |
| `dev` | 日常开发，可写工作区 |
| `automation` | 非交互脚本，输出结构化结果 |

使用方式类似：

```bash
codex -p dev -C /path/to/project
codex exec -p safe -C /path/to/project "请审查这个项目，不要修改文件"
```

# 三、使用示例

一个偏保守的配置片段：

```toml
model = "gpt-5"
sandbox_mode = "read-only"
approval_policy = "never"

[features]
web_search = false
```

一个日常开发 profile 可以更开放：

```toml
model = "gpt-5"
sandbox_mode = "workspace-write"
approval_policy = "on-request"
```

注意：具体字段名和可用 feature 会随 Codex 版本演进。写配置后可以用：

```bash
codex --strict-config --help
codex doctor
```

来帮助发现明显配置问题。

# 四、什么时候用命令行参数，什么时候用配置

| 场景 | 推荐 |
| --- | --- |
| 偶尔试一次 | 命令行参数 |
| 每个项目都一样 | 全局 config |
| 某个仓库特有 | 项目配置或 AGENTS |
| 某种工作模式反复使用 | profile |
| 自动化脚本 | profile + 显式参数 |

# 五、常见错误

## 5.1 错误 1：把项目规范都塞进 config

config 适合机器可读的运行参数，项目规范适合 AGENTS.md。

例如：

- “默认使用 workspace-write”适合 config。
- “新增接口要更新 API 文档”适合 AGENTS.md。

## 5.2 错误 2：profile 名字太抽象

`profile1`、`test2` 过段时间就忘了。建议使用语义化名字：

- `safe-review`
- `daily-dev`
- `ci-report`

## 5.3 错误 3：自动化依赖隐式默认值

脚本里最好显式写关键参数，比如工作目录、沙盒、输出文件。不要让脚本依赖你本机当前的隐式配置。

# 六、最佳实践

- 用 `safe` profile 做只读审查。
- 用 `dev` profile 做日常开发。
- 用 `automation` profile 做非交互任务。
- 每次升级 Codex 后，检查关键配置是否仍然有效。
- 把团队共享规则写进仓库，把个人偏好写进个人配置。

# 七、本章小结

配置解决“每次都一样”的运行参数，profile 解决“不同场景不同默认值”。把配置、AGENTS、提示词各放在合适位置，Codex 才会既听话又灵活。

# 八、总结

- **概念解释**：CLI 里也可以用 -c key=value 临时覆盖配置：
- **profile 是什么**：profile 是一组可切换配置。
- **使用示例**：一个日常开发 profile 可以更开放：
- **常见错误**：config 适合机器可读的运行参数，项目规范适合 AGENTS.md。

<!-- knowledge-lab-merged -->

# 动手实践：06 config and profile

这个 demo 展示如何维护不同场景下的 Codex 配置片段。

## 目录内容

- `safe.config.toml`：只读审查配置示例。
- `dev.config.toml`：日常开发配置示例。
- `automation.config.toml`：自动化配置示例。

## 使用方式

这些文件是学习样例，不会自动生效。

你可以参考它们，把适合自己的配置迁移到 Codex 配置目录，或者在命令行里临时覆盖：

```bash
codex exec \
  --sandbox read-only \
  --ask-for-approval never \
  "请审查当前目录，不要修改文件"
```

## 练习目标

- 区分 config、profile、AGENTS.md 的职责。
- 为不同风险等级准备不同默认值。

## 参考资料

- [OpenAI Codex 文档](https://developers.openai.com/codex/)
- [AGENTS.md 规范](https://agents.md/)
