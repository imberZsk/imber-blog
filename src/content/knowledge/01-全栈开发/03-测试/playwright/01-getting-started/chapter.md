# Playwright（1）- Playwright 快速入门：从零到第一个测试

> 读完你能：围绕“Playwright 快速入门：从零到第一个测试”理解“适合人群”与“前置知识”，并结合正文示例完成实践与排障。

# 一、适合人群

本文适合以下读者：

- **E2E 测试新手**：想要学习 Web 自动化测试的开发者
- **从其他框架迁移的开发者**：有 Selenium、Puppeteer、Cypress 使用经验，想了解 Playwright 的优势
- **前端/全栈开发者**：希望为自己的项目补充自动化测试的开发者

# 二、前置知识

阅读本文前，你需要：

- 熟悉 JavaScript/TypeScript 基础语法
- 了解基本的 HTML DOM 结构和 CSS 选择器
- 安装 Node.js 20+ 环境（推荐使用 LTS 版本）

> Playwright 官方目前支持 Node.js 20.x、22.x、24.x，Node.js 16 已不再受支持，请确保本地版本不低于 20。

# 三、什么是 Playwright 及其优势

## 3.1 什么是 Playwright

Playwright 是微软开源的现代化 Web 自动化测试框架，支持 Chromium、Firefox 和 WebKit 三大浏览器引擎。它可以模拟真实用户操作（点击、输入、滚动等），验证页面行为是否符合预期。

## 3.2 为什么选择 Playwright

相比其他 E2E 测试框架，Playwright 有以下优势：

**1. 跨浏览器支持**
```typescript
// 一套代码，自动在多个浏览器中运行
// playwright.config.ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
]
```

**2. 自动等待**
```typescript
// ❌ 其他框架：需要手动等待
await driver.findElement(By.id('submit')).isDisplayed();
await driver.sleep(1000); // 固定等待
await driver.findElement(By.id('submit')).click();

// ✅ Playwright：自动等待元素可操作
await page.click('#submit'); // 自动等待元素可见、可点击
```

**3. 强大的定位能力**
```typescript
// 语义化定位，更接近用户视角
await page.getByRole('button', { name: '登录' }).click();
await page.getByLabel('用户名').fill('admin');

// 校验元素是否出现：用断言而不是单独调用 isVisible()
await expect(page.getByText('欢迎回来')).toBeVisible();
```

> 注意：`isVisible()` 返回的是布尔值的 Promise，单独 `await page.getByText('欢迎回来').isVisible();` 不构成任何断言，测试不会因为元素缺失而失败。要校验元素，应使用 `await expect(...).toBeVisible()`；只有在需要根据可见性走不同分支时，才把 `isVisible()` 的布尔返回值用在 `if` 条件里。

**4. 丰富的调试工具**
- **Codegen**：录制操作自动生成代码
- **UI Mode**：可视化运行测试，逐步调试
- **Trace Viewer**：时间旅行调试，回看每一步操作

**5. 开箱即用的最佳实践**
- 自动截图和录屏
- 并行测试执行
- TypeScript 类型支持
- 内置断言库

# 四、安装与环境配置

## 4.1 初始化项目

`npm init playwright@latest` 本身就是脚手架命令，会自动创建 `package.json`、配置文件和示例测试，无需提前 `mkdir` + `npm init -y`。

打开终端，在目标位置直接执行：

```bash
# 一条命令完成脚手架初始化（会自动创建项目文件）
npm init playwright@latest my-first-playwright-test
```

> 如果你想在当前已存在的空目录中初始化，可省略目录名直接运行 `npm init playwright@latest`。二者择一即可，不要重复手动初始化。

安装过程中会询问以下问题（推荐配置）：

```
? Do you want to use TypeScript or JavaScript? › TypeScript
? Where to put your end-to-end tests? › tests
? Add a GitHub Actions workflow? › false
? Install Playwright browsers? › true
```

## 4.2 目录结构

安装完成后，项目结构如下：

```
my-first-playwright-test/
├── tests/                    # 测试用例目录
│   └── example.spec.ts       # 示例测试
├── tests-examples/           # 更多示例
├── playwright.config.ts      # Playwright 配置文件
├── package.json              # 项目依赖
└── node_modules/             # 依赖包
```

## 4.3 验证安装

运行示例测试，确认安装成功：

```bash
npx playwright test
```

如果看到类似输出，说明安装成功：

```
Running 6 tests using 3 workers
  6 passed (5.2s)
```

# 五、编写第一个测试用例

## 5.1 测试场景

我们将编写一个简单的测试：访问 Playwright 官方提供的 TodoMVC 演示站点，新增一条待办事项，验证它出现在列表中。

> 为什么不用百度等真实网站作为入门示例？真实站点通常有反爬/风控（验证码、行为检测），自动化访问极易被拦截；而且它们的 DOM、占位符、URL 参数随时可能调整，示例很容易跑不通。入门阶段最重要的是「一次跑通带来正反馈」，因此选用官方维护、无反爬的稳定演示站点 `https://demo.playwright.dev/todomvc`。

## 5.2 创建测试文件

在 `tests/` 目录下创建 `todo.spec.ts`：

```typescript
import { test, expect } from '@playwright/test';

test('新增一条待办事项', async ({ page }) => {
  // 1. 访问 TodoMVC 演示页
  await page.goto('https://demo.playwright.dev/todomvc');

  // 2. 在输入框中输入待办内容并回车
  const newTodo = page.getByPlaceholder('What needs to be done?');
  await newTodo.fill('学习 Playwright');
  await newTodo.press('Enter');

  // 3. 验证待办项出现在列表中（用断言等待真实结果，而非固定等待）
  await expect(page.getByTestId('todo-title')).toHaveText('学习 Playwright');

  // 4. 验证剩余计数正确
  await expect(page.getByText('1 item left')).toBeVisible();
});
```

## 5.3 代码详解

让我们逐行解析：

```typescript
import { test, expect } from '@playwright/test';
```
- `test`：定义测试用例的函数
- `expect`：Playwright 内置的断言库

```typescript
test('新增一条待办事项', async ({ page }) => {
```
- `'新增一条待办事项'`：测试用例名称，用于识别测试内容
- `async`：测试函数必须是异步的
- `{ page }`：Playwright 自动提供的浏览器页面对象（fixture）

```typescript
await page.goto('https://demo.playwright.dev/todomvc');
```
- `page.goto()`：导航到指定 URL
- `await`：等待页面加载完成后再继续

```typescript
const newTodo = page.getByPlaceholder('What needs to be done?');
await newTodo.fill('学习 Playwright');
await newTodo.press('Enter');
```
- `getByPlaceholder()`：通过占位符文本定位输入框（该站点输入框的真实占位符就是 `What needs to be done?`）
- `fill()`：在输入框中填写内容
- `press('Enter')`：模拟回车提交

```typescript
await expect(page.getByTestId('todo-title')).toHaveText('学习 Playwright');
```
- `expect(...)`：对定位到的元素进行断言
- `toHaveText()`：验证元素文本，断言会自动等待元素出现并匹配，无需手动等待网络空闲

> 这里**没有**使用 `page.waitForLoadState('networkidle')`。Playwright 官方已将 `networkidle` 标注为不推荐用于测试（DISCOURAGED），因为它依赖「网络静默」这一不可靠信号，长轮询、心跳、埋点等持续请求都会让它要么超时、要么提前结束，从而引入不稳定。正确做法是直接对最终结果断言（`expect(...).toBeVisible()` / `toHaveText()`）或等待具体导航（`waitForURL(...)`），让 Playwright 的自动等待机制处理时序。

# 六、运行测试与查看结果

## 6.1 运行测试

```bash
# 运行所有测试
npx playwright test

# 运行特定测试文件
npx playwright test tests/todo.spec.ts

# 有头模式运行（显示浏览器）
npx playwright test --headed

# 调试模式（打开 Playwright Inspector）
npx playwright test --debug
```

## 6.2 查看测试报告

测试完成后，查看 HTML 报告：

```bash
npx playwright show-report
```

报告中包含：
- 测试用例通过/失败状态
- 运行时间
- 失败时的截图
- 详细的错误堆栈

## 6.3 使用 UI Mode（推荐）

UI Mode 是 Playwright 最强大的调试工具：

```bash
npx playwright test --ui
```

功能特点：
- **可视化运行**：看到浏览器中的每一步操作
- **时间旅行**：拖动时间轴回看任意时刻的页面状态
- **定位器调试**：测试选择器是否正确
- **逐步执行**：单步调试每个操作

# 七、进阶技巧：优化测试代码

## 7.1 使用更好的定位器

我们第一个示例已经用了 `getByPlaceholder` 和 `getByTestId` 这类语义化定位器。相比 CSS 选择器（`#kw`、`.s_btn`），它们更接近用户视角，也更抗前端重构。

## 7.2 不推荐的定位方式

```typescript
// ❌ 依赖 id（前端重构后可能变化）
await page.click('#submit');

// ❌ 依赖 class（样式调整后可能失效）
await page.click('.btn-primary');

// ❌ 依赖 DOM 结构（页面改版后会失效)
await page.click('form > input:nth-child(2)');
```

## 7.3 推荐的定位方式

```typescript
// ✅ 使用 role（最接近用户视角）
await page.getByRole('button', { name: '提交' }).click();

// ✅ 使用 label（表单场景）
await page.getByLabel('用户名').fill('admin');

// ✅ 使用 text（唯一文本）
await page.getByText('下一页').click();

// ✅ 使用 placeholder
await page.getByPlaceholder('What needs to be done?').fill('学习 Playwright');

// ✅ 使用 data-testid（与前端约定的测试属性）
await page.getByTestId('todo-title');
```

> 不确定页面上元素的真实属性时，先用 `npx playwright codegen <url>` 录制一遍，Codegen 会给出官方推荐的、确实能命中的定位器，避免凭猜测写出跑不通的选择器。

## 7.4 提取公共逻辑

当多个测试需要相同的前置步骤时，使用 `beforeEach`：

```typescript
import { test, expect } from '@playwright/test';

test.describe('TodoMVC 功能', () => {
  // 每个测试前都执行：访问演示页
  test.beforeEach(async ({ page }) => {
    await page.goto('https://demo.playwright.dev/todomvc');
  });

  test('新增待办', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');
    await newTodo.fill('学习 Playwright');
    await newTodo.press('Enter');
    await expect(page.getByTestId('todo-title')).toHaveText('学习 Playwright');
  });

  test('新增多条待办后计数正确', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');
    await newTodo.fill('任务一');
    await newTodo.press('Enter');
    await newTodo.fill('任务二');
    await newTodo.press('Enter');
    await expect(page.getByText('2 items left')).toBeVisible();
  });
});
```

## 7.5 封装 Page Object

当页面交互复杂时，使用 Page Object 模式封装：

```typescript
// pages/TodoPage.ts
import { Page, Locator } from '@playwright/test';

export class TodoPage {
  // 待办输入框定位器
  private readonly newTodoInput: Locator;
  // 待办标题列表定位器
  readonly todoTitles: Locator;

  // 构造函数：注入 page 并初始化常用定位器
  constructor(private readonly page: Page) {
    this.newTodoInput = page.getByPlaceholder('What needs to be done?');
    this.todoTitles = page.getByTestId('todo-title');
  }

  /**
   * 访问 TodoMVC 演示页
   */
  async goto() {
    await this.page.goto('https://demo.playwright.dev/todomvc');
  }

  /**
   * 新增一条待办事项
   * @param text 待办内容
   */
  async addTodo(text: string) {
    // 填写输入框并回车提交
    await this.newTodoInput.fill(text);
    await this.newTodoInput.press('Enter');
  }
}
```

**使用 Page Object：**

```typescript
// tests/todo.spec.ts
import { test, expect } from '@playwright/test';
import { TodoPage } from '../pages/TodoPage';

test('使用 Page Object 新增待办', async ({ page }) => {
  const todoPage = new TodoPage(page);

  // 访问演示页
  await todoPage.goto();

  // 新增待办
  await todoPage.addTodo('学习 Playwright');

  // 验证待办出现在列表中
  await expect(todoPage.todoTitles).toHaveText('学习 Playwright');
});
```

# 八、常见问题排查

## 8.1 问题 1：元素找不到

**错误信息：**
```
Error: Timeout 30000ms exceeded.
waiting for selector "#submit"
```

**原因分析：**
- 选择器错误（拼写错误、id 变化）
- 元素尚未加载（网络慢、动态渲染）
- 元素被隐藏或不可见

**解决方案：**

```typescript
// 方案 1：使用 Codegen 录制，获取正确的选择器
// 运行命令：npx playwright codegen https://example.com

// 方案 2：等待元素可见后再操作
await page.locator('#submit').waitFor({ state: 'visible' });
await page.click('#submit');

// 方案 3：使用更稳定的定位器
await page.getByRole('button', { name: '提交' }).click();

// 方案 4：增加超时时间（不推荐作为首选）
await page.click('#submit', { timeout: 60000 });
```

## 8.2 问题 2：测试不稳定（时而通过时而失败）

**常见原因：**
- 使用固定等待时间（`waitForTimeout`）
- 依赖网络请求时序
- 动画、加载状态处理不当

**解决方案：**

```typescript
// ❌ 不推荐：固定等待
await page.click('#loadData');
await page.waitForTimeout(2000); // 可能不够或浪费时间
await expect(page.locator('.result')).toBeVisible();

// ❌ 不推荐：等待网络空闲
// Playwright 官方已将 networkidle 标注为 DISCOURAGED，
// 它依赖「网络静默」这一不可靠信号，长轮询/心跳/埋点会让它超时或提前结束
await page.click('#loadData');
await page.waitForLoadState('networkidle');
await expect(page.locator('.result')).toBeVisible();

// ✅ 推荐：直接对最终结果断言（断言会自动等待）
await page.click('#loadData');
await expect(page.locator('.result')).toBeVisible();

// ✅ 推荐：等待具体的网络请求完成
await page.click('#loadData');
await page.waitForResponse(res => res.url().includes('/api/data'));
await expect(page.locator('.result')).toBeVisible();

// ✅ 推荐：等待具体导航
await page.getByRole('button', { name: '登录' }).click();
await page.waitForURL('**/dashboard');
```

> 核心原则：**等待真实的业务结果，而不是模糊的「网络空闲」或「固定毫秒」**。Playwright 的断言（`expect`）和 `waitForURL`、`waitForResponse` 都内置自动等待，能精准等到目标状态。

## 8.3 问题 3：弹窗和对话框处理

**场景：** 点击按钮后弹出浏览器原生 alert/confirm 对话框

```typescript
// ✅ 提前监听对话框，自动接受
page.on('dialog', dialog => dialog.accept());
await page.click('#deleteButton');

// ✅ 提前监听并验证对话框内容
page.on('dialog', async dialog => {
  expect(dialog.message()).toContain('确认删除');
  await dialog.accept();
});
await page.click('#deleteButton');
```

## 8.4 问题 4：截图和录屏调试

```typescript
// 测试失败时自动截图（playwright.config.ts 已默认配置）
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}

// 手动截图
await page.screenshot({ path: 'debug.png', fullPage: true });

// 单个元素截图
await page.locator('.result').screenshot({ path: 'result.png' });

// 查看失败时的截图和视频
// 位置：test-results/<测试名称>/
```

# 九、完整 Demo：登录表单测试

下面是一个完整的实战示例，测试登录功能（以你自己的应用为例）：

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('登录功能测试', () => {
  test('成功登录', async ({ page }) => {
    // 访问登录页
    await page.goto('https://example.com/login');

    // 填写用户名（使用 label 定位）
    await page.getByLabel('用户名').fill('testuser');

    // 填写密码
    await page.getByLabel('密码').fill('password123');

    // 点击登录按钮
    await page.getByRole('button', { name: '登录' }).click();

    // 等待导航到首页（等待具体导航，而非网络空闲）
    await page.waitForURL('**/dashboard');

    // 验证成功登录（页面出现欢迎信息）
    await expect(page.getByText('欢迎回来')).toBeVisible();
  });

  test('登录失败 - 用户名为空', async ({ page }) => {
    await page.goto('https://example.com/login');

    // 不填写用户名，直接点登录
    await page.getByRole('button', { name: '登录' }).click();

    // 验证错误提示
    await expect(page.getByText('请输入用户名')).toBeVisible();
  });

  test('登录失败 - 密码错误', async ({ page }) => {
    await page.goto('https://example.com/login');

    await page.getByLabel('用户名').fill('testuser');
    await page.getByLabel('密码').fill('wrongpassword');
    await page.getByRole('button', { name: '登录' }).click();

    // 验证错误提示
    await expect(page.getByText('用户名或密码错误')).toBeVisible();
  });
});
```

# 十、总结

读完这篇，你已经掌握了：

1. **Playwright 的核心优势**：跨浏览器、自动等待、强大定位器
2. **环境安装和配置**：用一条 `npm init playwright@latest` 快速搭建
3. **编写第一个测试**：从简单的待办新增到完整登录流程
4. **最佳实践**：
   - 使用语义化定位器（role、label、text、placeholder、testid）
   - 用断言等待真实结果，避免 `networkidle` 和固定等待
   - 使用 Page Object 封装复杂交互
5. **调试技巧**：Codegen、UI Mode、Trace Viewer

## 10.1 关键要点

- **始终使用 `await`**：Playwright 操作都是异步的
- **优先语义化定位**：`getByRole` > `getByLabel` > `getByText` > CSS 选择器
- **等待真实状态**：`expect(...).toBeVisible()`、`waitForURL`、`waitForResponse` > `waitForLoadState('networkidle')` > `waitForTimeout`
- **断言才是校验**：`expect(...).toBeVisible()` 才能让测试失败；单独 `await locator.isVisible()` 只返回布尔值，不构成校验
- **失败时查看报告**：`npx playwright show-report`

# 十一、延伸阅读

## 11.1 官方资源

- [Playwright 官方文档](https://playwright.dev/)
- [最佳实践指南](https://playwright.dev/docs/best-practices)
- [API 参考](https://playwright.dev/docs/api/class-playwright)

## 11.2 进阶主题

- **并行测试**：如何配置 workers 加速测试
- **Mock 网络请求**：使用 `page.route()` 拦截和模拟 API
- **CI/CD 集成**：在 GitHub Actions、Jenkins 中运行测试
- **视觉回归测试**：使用 `toHaveScreenshot()` 检测 UI 变化
- **移动端测试**：模拟移动设备和触摸操作

## 11.3 社区资源

- [Playwright GitHub](https://github.com/microsoft/playwright)
- [Awesome Playwright](https://github.com/mxschmitt/awesome-playwright)
- [示例项目集合](https://github.com/topics/playwright)

---

现在，打开你的编辑器，写下第一个测试吧！

# 十二、总结

- **常见问题排查**：选择器错误（拼写错误、id 变化）
- **适合人群**：E2E 测试新手：想要学习 Web 自动化测试的开发者
- **前置知识**：熟悉 JavaScript/TypeScript 基础语法
- **什么是 Playwright 及其优势**：Playwright 是微软开源的现代化 Web 自动化测试框架，支持 Chromium、Firefox 和 WebKit 三大浏览器引擎。

<!-- knowledge-lab-merged -->

# 动手实践：Playwright 快速入门

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
