<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 知识文章资料规则

- 每次新增、改写或校对知识文章前，必须使用 Context7 查询文章涉及的外部库、框架和平台的最新 API、功能与官方文档。
- 优先查询文章目标版本对应的文档；未明确版本时查询当前稳定版本，禁止混用不同版本的 API 或示例。
- 如果 Context7 没有对应资料或结果不足，使用 `curl` 补充查询官方一手文档，并在交付说明中明确未由 Context7 覆盖的内容。
