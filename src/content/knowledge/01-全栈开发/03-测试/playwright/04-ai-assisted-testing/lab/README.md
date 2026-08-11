# 04 · AI 辅助测试开发：让 Claude 帮你写测试（可运行 Demo）

本目录是文章《AI 辅助测试开发：让 Claude 帮你写测试》的配套 Demo。
它把文章里的 6 个核心知识点落成一份**可直接运行**的最小工程，
用一个本地静态页面（无需后端、无需网络）模拟「新增油费」业务。

## 这个 Demo 演示什么

| 文章知识点 | 在 Demo 中的体现 |
|---|---|
| 1. 清晰上下文 | `getTestContext()` 统一提供登录与业务数据，用例零硬编码 |
| 2. CLAUDE.md 约束 | `tests/CLAUDE.md` 写明团队硬性规则与目录约定 |
| 3. AI 友好的组织 | 分层：交互封装 → Operator → spec，spec 只编排 |
| 4. Operator 模式 | `OilFeeOperator` 把多步操作收敛成业务语义方法 |
| 5. trace/截图辅助调试 | `playwright.config.ts` 失败时自动留 trace/截图/录像 |
| 6. 避免重复点击 | `ensureFilterApplied`/`ensureRowChecked` 幂等；`submitCreate` 只点一次并等真实结果 |

## 目录结构

```
04-ai-assisted-testing/
├── README.md                 # 本文件
├── package.json              # 依赖与脚本
├── playwright.config.ts      # 基础配置（含 trace/截图）
├── tsconfig.json             # 类型检查配置
├── fixtures/
│   ├── oil-fee.html          # 模拟被测系统的本地静态页面
│   └── oil-fee.js            # 页面交互逻辑（下拉、联动、保存）
└── tests/
    ├── CLAUDE.md             # 给 AI 的项目说明书 + 团队规范
    ├── good-operator.ts      # 交互封装 + Operator + 统一上下文
    └── oil-fee.spec.ts       # 测试用例（只编排业务步骤 + 断言）
```

## 如何运行

```bash
# 1. 安装依赖
npm install

# 2. 安装 Playwright 浏览器（首次运行需要）
npx playwright install chromium

# 3. 运行全部测试
npm test
# 或： npx playwright test

# 有头模式（看浏览器实际操作）
npm run test:headed

# UI 模式（交互式调试）
npm run test:ui

# 查看测试报告
npm run report
```

测试用例覆盖：

1. **新增油费成功** —— 完整走通 Operator 编排流程（进列表 → 开弹窗 → 填表单 → 保存 → 详情回显校验），其中包含「选运单号自动带出车牌」的联动等待（`waitForField`）。
2. **打开弹窗操作可重复调用（幂等）** —— 连续调用 `openCreateDialog` 两次，验证幂等不重复点击。
3. **筛选与勾选可重入（ensure 幂等）** —— 重复调用 `ensureFilterApplied`/`ensureRowChecked`，验证不会重复查询或反选。

## 失败时如何用 trace 辅助 AI 调试（呼应知识点 5）

```bash
# 失败后会在 test-results/ 下生成 trace.zip，用浏览器逐帧回看现场
npx playwright show-trace test-results/<某次失败目录>/trace.zip
```

把 trace 截图、报错、API 耗时一起喂给 AI，它才能准确定位根因，
而不是只凭一句报错瞎猜。

## 类型检查（遵守 CLAUDE.md 规则）

```bash
npx tsc --noEmit
```

## 说明

为了让 Demo 离线可跑，这里用 `file://` 加载本地 HTML，没有真实登录与后端。
真实项目中 `getTestContext()` 应从环境变量 / fixture 读取，登录走真实流程，
但**分层结构、Operator 模式、ensure 幂等、避免重复点击**这些工程约定完全一致。
