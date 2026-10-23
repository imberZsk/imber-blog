# 极客知识库迁入

## 内容与入口

- 源目录：`/Users/imber/Desktop/ai-lab/temp/geekbang`。
- 按原始抓取清单迁入 18 个知识库、320 篇 Markdown、70 个本地资源；正文逐字保留，章节顺序不变。
- `/knowledge` 增加入口，`/geekbang` 提供主题筛选、课程名和章节标题搜索、空结果提示。
- `/geekbang/[course]/[chapter]` 提供系列目录、本篇锚点目录、前后篇导航、原知识库链接。
- 正文使用博客现有 `knowledge-article`
  排版；局部 CSS 约束长链接、表格、代码与图片的窄屏尺寸，不修改共享组件。
- sitemap 收录新入口与全部章节；未知章节返回 404。页面在构建时静态生成。
- 不迁入旧 HTML 阅读器及抓取运行记录；它们的导航由博客页面替代，全部章节内容仍保留。

## 原文边界

这些内容是带来源的原文备份，不作为博客原创教程，也未重新认证原文中的 API、产品版本或外部下载地址。当前会话没有 Context7 可调用工具；未改写文章的技术内容。页面实现参考已安装 Next.js
16.3.0 的本地 page/dynamic route 文档，官方网页使用 curl 读取。

## 验证

- 320 篇 Markdown、70 个资源与源文件逐字节一致。
- 对 320 篇执行渲染验证：正文非空、目录锚点对应真实标题、58 个正文图片引用均有本地文件、HTML 净化及非法路径拒绝通过。
- `pnpm lint`：0 错误；原有 SlashCommand 中 5 条未使用 eslint-disable 警告。
- `pnpm audit:knowledge`：原有 700 篇内容审计通过；备份内容独立存储，不伪造原创课程自测题。
- `pnpm build`：通过，包含全部 320 篇静态章节页面。
- Playwright：1440px 桌面、390px 手机页面；标题检索、无结果提示、主题切换、章节跳转、前后篇及目录锚点；截图保存在本任务
  `output/playwright/`（不提交生成文件）。

## 交付隔离

原 `imber-blog` 工作树已有前端迁移的未提交改动。本任务从 `origin/main`
建立独立交付工作树，只提交知识库迁入相关文件，避免混入历史改动。环境中没有 `gp` 命令，采用
`git commit` + `git push` 完成等价提交与推送。

开发模式曾遇到 Turbopack 内部 panic，后续章节验收改为
`pnpm start --port 3109`，直接验证已构建的生产页面。生产章节、404、站点地图和知识库入口均正常。

## 目录与空入口调整

- 顶部导航以“极客知识库”替换空的“文集”Tab，桌面和手机使用相同配置。
- 首页“阅读文集”改为“极客知识库目录”，避免继续引导到空列表。
- 聚合页新增按主题分组的 18 个专题锚点目录；桌面侧栏固定定位，手机端折叠展示，搜索和分类变化时目录同步筛选。
- 保留 `/posts` 路由，不删除文章基础能力。

## 首页导航 500 修复

复现地址：`http://localhost:3110/`（Webpack 开发服务）。点击首页触发编译错误：`It's currently unsupported to use "export *" in a client boundary`。请求链为首页 → 通用 Button
→ `@/lib/utils` → 编辑器选择工具 → HorizontalRule →
`@tiptap/react`。通用入口转导出编辑器辅助方法，使服务端仅使用 `cn` 也触达客户端依赖。

修复只移除通用入口的两条编辑器转导出，并将唯一的编辑器消费方 `useTextMenuStates`
改为从原文件直接导入，辅助方法本身及编辑器行为保持原样。仓库引用搜索确认没有其他调用方依赖这两条转导出。

验证：

- 同一个 Webpack 服务下，首页、极客知识库、原知识库、作品、关于、编辑器均返回 200。
- Playwright 实际点击桌面“首页”、手机菜单“首页”，页面正常出现首页标题，无新增
  `pageerror`。
- `node --conditions=react-server --experimental-strip-types --test scripts/utils-server.test.mjs`
  通过：无 DOM 的服务端环境可直接加载通用工具，并保留类名合并行为。
- 本次两个改动文件 ESLint 和 TypeScript 检查通过；回归测试已接入 CI。
- 浏览器验证编辑器仍能正常输入，无新增 `pageerror`。
