# Codex（7）- MCP 连接外部工具

> 读完你能：围绕“MCP 连接外部工具”理解“概念解释”与“使用示例”，并结合正文示例完成实践与排障。

MCP 是 Model Context Protocol，可以把外部工具、数据源或服务接给 Codex 使用。简单说，MCP 像给 Codex 装“接口插件”：它不再只看本地文件，还能通过受控工具访问文档、数据库、浏览器、内部系统等。

从前端视角类比：Codex 是页面，MCP server 是后端 API。页面不能凭空知道数据库内容，必须通过 API 调用；Codex 也一样。

# 一、概念解释

MCP 里通常有三类东西：

| 概念 | 作用 |
| --- | --- |
| server | 提供工具或资源的服务 |
| tool | 可被 Codex 调用的动作，比如查询、发送、创建 |
| resource | 可读取的上下文，比如文档、文件、记录 |

Codex CLI 提供了 MCP 管理命令：

```bash
codex mcp list
codex mcp add <name> --url <url>
codex mcp get <name>
codex mcp remove <name>
codex mcp login <name>
```

也可以添加 stdio server：

```bash
codex mcp add my-tool -- node server.js
```

# 二、使用示例

## 2.1 添加远程 MCP server

```bash
codex mcp add docs --url https://example.com/mcp
codex mcp get docs
```

如果服务需要 OAuth 或 bearer token，需要按服务要求配置登录或环境变量。

## 2.2 添加本地 MCP server

```bash
codex mcp add local-notes -- node ./mcp-server.js
```

这适合把你自己的脚本封装成工具。

## 2.3 在提示词里使用 MCP

```text
请使用已配置的 docs MCP 查询“订单状态机”相关文档，然后对照当前代码检查实现是否一致。
```

重点是告诉 Codex：这次需要用哪个外部上下文，以及用它解决什么问题。

# 三、适合接入 MCP 的场景

- 私有文档检索。
- 项目管理系统查询。
- 内部 API 调试。
- 浏览器自动化测试。
- 数据库只读查询。
- 设计稿、知识库、云文档读取。

# 四、常见错误

## 4.1 错误 1：把 MCP 当成无限权限入口

MCP 应该提供受控能力，而不是把所有系统权限都暴露给 Codex。优先提供小而明确的工具。

例如：

- 好：`searchDocs(query)`、`getTicket(id)`。
- 危险：`runAnySql(sql)`、`execShell(command)`。

## 4.2 错误 2：工具描述太模糊

如果 MCP 工具的名称和描述不清楚，Codex 可能不知道什么时候该用。

工具描述应该说明：

- 它能做什么。
- 输入参数是什么。
- 返回什么。
- 有什么副作用。

## 4.3 错误 3：忘记鉴权和审计

外部系统通常有权限边界。MCP server 应该记录关键操作，避免把个人高权限账号变成无审计入口。

# 五、最佳实践

- 先做只读工具，再考虑写操作。
- 工具颗粒度小一点，名称清楚一点。
- 对有副作用的工具加确认或限制。
- 用环境变量传密钥，不把密钥写进仓库。
- 在 AGENTS.md 里说明常用 MCP 的用途。

# 六、本章小结

MCP 的价值是让 Codex 接入真实工作流，但它也会扩大影响范围。把 MCP 当成“受控 API 层”来设计，才能既强大又安全。

# 七、总结

- **概念解释**：Codex CLI 提供了 MCP 管理命令：
- **使用示例**：如果服务需要 OAuth 或 bearer token，需要按服务要求配置登录或环境变量。
- **常见错误**：MCP 应该提供受控能力，而不是把所有系统权限都暴露给 Codex。
- **最佳实践**：工具颗粒度小一点，名称清楚一点。

<!-- knowledge-lab-merged -->

# 动手实践：07 MCP

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

<!-- knowledge-practice-materials-merged -->

## 配套实践材料

以下材料已并入正文，便于阅读时直接对照和练习。

### `mcp-design.md`

````markdown
# MCP 工具设计清单

## 工具名

`search_personal_docs`

## 用途

查询个人学习目录里的 Markdown 笔记。

## 输入

- `query`：搜索关键词。
- `limit`：最多返回多少条，默认 5。

## 输出

- `title`：笔记标题。
- `path`：本地路径。
- `snippet`：命中的短摘要。

## 权限

- 只读。
- 只能访问学习目录。
- 不读取 `.env`、密钥文件、浏览器数据。

## 审计

- 记录查询关键词。
- 记录返回文件路径。
- 不记录文件全文。

## 后续扩展

- 支持按主题过滤。
- 支持读取某篇笔记全文。
- 写操作单独设计，不和搜索工具混在一起。
````
