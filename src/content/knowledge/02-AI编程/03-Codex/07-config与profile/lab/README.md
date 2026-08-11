# 06 config and profile demo

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

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“06 config and profile demo”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
