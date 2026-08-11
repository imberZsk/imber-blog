# Codex（7）- MCP 连接外部工具

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

## 可视化规格

> VISUAL_STRATEGY：架构图（Architecture）
> DIAGRAM_DESCRIPTION：围绕“Codex（7）- MCP 连接外部工具”画出系统边界、核心组件、依赖方向、数据或控制流、外部服务和故障降级路径；权限边界与持久化位置必须明确。
