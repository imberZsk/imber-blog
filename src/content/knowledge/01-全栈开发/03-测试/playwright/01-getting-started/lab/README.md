# 01 - Playwright 快速入门 Demo

本目录是文章《Playwright 快速入门：从零到第一个测试》的配套可运行 Demo。

通过一个访问官方 TodoMVC 演示站点、新增待办事项的例子，演示 Playwright 的核心用法：语义化定位器、自动等待断言、公共前置步骤提取、跨浏览器运行。

## 目录结构

```
01-getting-started/
├── tests/
│   └── basic.spec.ts      # 测试用例：新增待办 + 计数校验
├── playwright.config.ts   # Playwright 配置（跨浏览器、截图/录屏/Trace）
├── package.json           # 依赖与脚本
└── README.md
```

## 前置要求

- Node.js 20+（推荐 LTS 版本）

## 安装

```bash
# 安装依赖
npm install

# 安装 Playwright 浏览器（首次运行必须）
npx playwright install
```

## 运行测试

```bash
# 运行所有测试（默认无头，跨 chromium/firefox/webkit 三引擎）
npm test

# 有头模式运行（显示浏览器）
npm run test:headed

# UI Mode（可视化运行 + 时间旅行调试，强烈推荐）
npm run test:ui

# 调试模式（打开 Playwright Inspector）
npm run test:debug

# 只运行指定文件
npx playwright test tests/basic.spec.ts

# 只运行单一浏览器
npx playwright test --project=chromium
```

## 查看报告

```bash
# 运行结束后查看 HTML 报告
npm run report
```

报告包含通过/失败状态、运行时间、失败截图和错误堆栈。

## 对应文章知识点

- **语义化定位器**：`getByPlaceholder`、`getByTestId`、`getByText`，比 CSS 选择器更抗重构
- **自动等待断言**：`expect(...).toHaveText()` / `toBeVisible()` 会自动等待目标状态，无需 `waitForTimeout` 或 `networkidle`
- **公共前置步骤**：`test.describe` + `test.beforeEach` 复用「访问演示页」
- **跨浏览器**：`playwright.config.ts` 中配置 chromium / firefox / webkit 三个 project，一套代码自动多引擎运行
- **失败可诊断**：配置了失败截图、录屏与首次重试 Trace

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“01 - Playwright 快速入门 Demo”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。
