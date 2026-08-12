# Paperclip 安装信息

> 读完你能：围绕“Paperclip 安装信息”理解“概述”与“关键路径”，并结合正文示例完成实践与排障。

## 概述

Paperclip 是一个自治 AI 公司的控制平面（Control Plane），用于编排 AI Agent 团队来运营业务。

- 版本：`2026.517.0`
- 包名：`paperclipai`
- 安装方式：通过 `npx` 运行（未全局安装）

## 关键路径

| 用途 | 路径 |
|------|------|
| npx 缓存包 | `~/.npm/_npx/43414d9b790239bb/node_modules/paperclipai/` |
| 数据主目录 | `~/.paperclip/` |
| 默认实例 | `~/.paperclip/instances/default/` |
| 实例配置 | `~/.paperclip/instances/default/config.json` |
| 环境变量 | `~/.paperclip/instances/default/.env` |
| 密钥文件 | `~/.paperclip/instances/default/secrets/master.key` |
| 内嵌 PostgreSQL | `~/.paperclip/instances/default/db/` (端口 54329) |
| 日志 | `~/.paperclip/instances/default/logs/server.log` |
| 数据备份 | `~/.paperclip/instances/default/data/backups/` |
| 文件存储 | `~/.paperclip/instances/default/data/storage/` |
| 项目代码 | `~/.paperclip/instances/default/projects/` |

## 服务配置

- 部署模式：`local_trusted`（本地可信）
- 监听地址：`127.0.0.1:3100`（仅本机访问）
- UI 面板：已启用（`serveUi: true`），访问 http://localhost:3100
- 数据库：内嵌 PostgreSQL，端口 54329，每小时自动备份，保留 30 天
- 密钥管理：本地加密存储

## 启动命令

```sh
npx paperclipai run
```

## 前端技术栈

| 层面 | 技术栈 | 位置 |
|------|--------|------|
| Paperclip Dashboard（控制面板） | React | 打包在 npx 缓存的 `dist/` 内，通过 `localhost:3100` 提供，本地无源码 |
| 业务项目 - landing | Astro + Tailwind | `~/.paperclip/instances/default/projects/.../landing/` |
| 业务项目 - changelog-page | 纯静态 HTML（Cloudflare Pages） | `~/.paperclip/instances/default/projects/.../changelog-page/` |

Paperclip 自身前端源码在 GitHub 仓库 `paperclipai/paperclip`，本地只有编译产物。插件 UI 使用 `@paperclipai/plugin-sdk/ui` 提供的 React hooks（`usePluginData`、`usePluginAction`）开发。

## 已有项目

实例中已存在一个项目，包含：
- `landing/` — Astro + Tailwind 落地页
- `github-webhook-worker/` — Cloudflare Worker（GitHub Webhook）
- `changelog-page/` — 纯静态 HTML，部署到 Cloudflare Pages
- `test/` — 集成测试（billing、prompts 等）

## 参考资料

- [FastAPI 大型应用](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [Docker Compose](https://docs.docker.com/compose/)
