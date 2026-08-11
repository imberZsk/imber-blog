# 03 · 等待策略完全指南：告别 waitForTimeout（配套 Demo）

本 Demo 配套文章《等待策略完全指南：告别 waitForTimeout》，用**本地静态 HTML**（`file://` 加载，无需后端）演示 Playwright 的各种等待策略，可直接运行。

## 演示了什么

| 知识点 | 对应文件 / 用例 |
|---|---|
| 自动等待（click 等 enabled、断言自动重试） | `tests/auto-wait.spec.ts` |
| `waitForSelector` 的 `visible` / `hidden` / `attached` | `tests/auto-wait.spec.ts` |
| 封装等待函数返回元素数量 | `tests/auto-wait.spec.ts` |
| `waitForFunction` 等联动字段被填充 | `tests/wait-for-field.spec.ts` |
| 回调参数必须显式传入浏览器上下文 | `tests/wait-for-field.spec.ts` |
| 链式联动逐级等待（运单→车牌→司机） | `tests/wait-for-field.spec.ts` |
| 超时时读取当前值给出诊断信息 | `tests/wait-for-field.spec.ts` |
| 三层超时配置（测试 / 动作 / 断言） | `playwright.config.ts` |

## 被测页面

- `app/auto-wait.html`：按钮延迟 800ms 才启用，点击后先 spinner 再成功消息，并延迟挂载新节点 —— 验证自动等待与 `waitForSelector` 的各种 `state`。
- `app/linked-form.html`：选择运单后分两段异步带出车牌、司机 —— 模拟 React 异步联动，验证 `waitForFunction`。

## 运行

```bash
# 安装依赖
npm install
npx playwright install chromium

# 运行全部测试
npm test

# 有头模式 / UI 模式 / 调试
npm run test:headed
npm run test:ui
npm run test:debug

# 查看 HTML 报告
npm run report
```

## 核心要点

1. **优先自动等待**：`click`、`fill`、`expect` 已内置智能等待，不要在前面加 `waitForTimeout`。
2. **等真实条件**：联动字段用 `waitForFunction` 等「字段有值」，而非估算时间。
3. **回调要传参**：`waitForFunction` 回调在浏览器上下文执行，外部变量必须通过第二个参数传入。
4. **失败要可诊断**：超时时读取当前状态，抛出带字段名、当前值的错误。

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“03 · 等待策略完全指南：告别 waitForTimeout（配套 Demo）”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。
