# 07 MCP demo

这个 demo 用最小 Node 脚本模拟一个“本地知识库查询工具”的 MCP 思路。

注意：`toy-docs-server.js` 是教学用伪实现，不是完整 MCP SDK server。它的目的是让你理解“把外部能力封装成受控工具”的设计方式。

## 目录内容

- `toy-docs-server.js`：本地文档查询脚本。
- `docs.json`：模拟知识库。
- `mcp-design.md`：真实 MCP server 设计清单。

## 使用方式

先直接运行脚本：

```bash
node toy-docs-server.js "Codex"
```

再让 Codex 阅读设计：

```bash
codex exec --sandbox read-only --ask-for-approval never "请阅读 mcp-design.md，并指出这个 MCP 设计还缺哪些安全约束"
```

## 练习目标

- 理解 MCP 的核心不是“给无限权限”，而是“提供受控工具”。
- 学会为工具设计清晰输入、输出和副作用说明。
