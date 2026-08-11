# 02 - UI 模式完全指南：交互式调试工作流

本 Demo 是文章《UI 模式完全指南：交互式调试工作流》的配套可运行项目。
通过一个真实的待办事项（TodoMVC）应用，演示 Playwright UI 模式的四大核心能力：
**Watch Mode、时光机调试（Time Travel）、Pick Locator、与 Trace Viewer 的配合**。

测试目标站点是 Playwright 官方公开的演示站 `https://demo.playwright.dev/todomvc`，
无需自建服务，联网即可直接运行。

## 这个 Demo 演示什么

`tests/debug-example.spec.ts` 包含三条用例，每条都对应文章里的一个调试知识点：

| 用例 | 呼应文章 | 调试演示点 |
|------|----------|-----------|
| 能添加多条待办 `@smoke` | 第四节 时光机 | 数量不对时回看 `addTodo` 的 After 快照 |
| 能完成一条待办 `@smoke` | 第五节 Pick Locator | 用 Pick Locator 核对 checkbox 定位器 |
| 完成的待办会从 Active 过滤视图消失 | 第四节 时光机 | 回放过滤前后列表变化 |

`playwright.config.ts` 配置了 `trace: 'on-first-retry'`，呼应文章第六节
「与 Trace Viewer 的配合」——CI 上失败重试时自动录制 trace，便于事后复盘。

用例上打了 `@smoke` 标签，可在 UI 模式搜索框输入 `@smoke` 按标签筛选（文章 2.4 节）。

## 如何运行

### 1. 安装依赖

```bash
npm install
npx playwright install
```

### 2. 启动 UI 模式（本文主角）

```bash
npx playwright test --ui
# 或
npm run test:ui
```

启动后在左侧测试列表里：

1. 找到 `debug-example.spec.ts`，点用例前的 ▶ 运行
2. 跑完后点中间 Actions 列表的任意一步，右侧回看那一刻的页面快照（**时光机**）
3. 对某条用例点 👁 开启 **Watch Mode**，改完代码保存自动重跑
4. 点顶部十字光标按钮（**Pick Locator**），在快照上选元素自动生成定位器

### 3. 普通命令行运行（CI 同款）

```bash
npx playwright test        # 无头批量运行
npm run report             # 查看 HTML 报告
```

### 4. 复盘 trace（呼应第六节）

当测试在 CI 失败并产出 `trace.zip` 后，本地用 Trace Viewer 回放：

```bash
npx playwright show-trace trace.zip
# 或从 HTML 报告点进 trace
npx playwright show-report
```

## 可用脚本

| 命令 | 作用 |
|------|------|
| `npm test` | 命令行运行全部测试 |
| `npm run test:ui` | 启动 UI 模式（交互式调试） |
| `npm run test:headed` | 有头模式运行（显示浏览器） |
| `npm run test:debug` | 启动 Playwright Inspector 调试 |
| `npm run report` | 查看 HTML 测试报告 |

## 小贴士

- **UI 模式只能本地用**：它需要图形界面，无法在 CI 无头环境运行。CI 上的失败靠 Trace Viewer 复盘。
- **Watch Mode 只开 1~2 个用例**：对整个文件开 Watch 会每次保存全跑一遍，反而更慢（文章 3.4 节）。
- **改了 `playwright.config.ts` 需重启 UI 模式**才能生效。

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“02 - UI 模式完全指南：交互式调试工作流”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。
