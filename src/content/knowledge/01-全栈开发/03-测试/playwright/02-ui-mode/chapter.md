# Playwright（2）- UI 模式完全指南：交互式调试工作流

> 当你的测试莫名其妙地失败，与其在终端里反复 `console.log` 加打印、来回重跑，不如打开一扇可以"看见"测试全过程的窗户。Playwright 的 UI 模式（UI Mode）就是这扇窗户——它把每一步操作、每一帧页面、每一次网络请求都可视化地摊在你面前。

# 一、适合人群

- 已经会写基础 Playwright 测试，但调试起来很痛苦的开发者
- 经常遇到"本地能过、CI 偶尔挂"的不稳定测试，想搞清楚到底发生了什么
- 不想在代码里堆 `console.log` 和 `page.pause()`，希望有更高效的调试手段
- 想提升日常开发效率，让"改代码 → 看结果"的循环更快的人

# 二、前置知识

阅读本文前，你需要：

1. 已经安装好 Node.js 和 Playwright（`npm init playwright@latest` 即可初始化）
2. 写过至少一个能跑起来的 `.spec.ts` 测试文件
3. 了解 `test()`、`expect()`、`page.goto()`、`page.click()` 这些最基础的 API
4. 知道怎么在终端里执行 `npx playwright test`

如果上面有不熟悉的，建议先读本小册的第 01 篇《快速上手》。准备好了，我们开始。

---

# 三、UI Mode 是什么，什么时候用它

## 3.1 一句话理解

UI Mode 是 Playwright 官方提供的一个**图形化测试运行与调试面板**。启动后它会打开一个浏览器窗口，你能在里面：

- 看到所有测试文件和用例的树状列表
- 点一下就运行某个用例，或一键运行全部
- 在**时间轴**上看到测试的每一步操作
- 把鼠标悬停在任意一步上，**回看那一刻页面长什么样**（这就是时光机调试）
- 实时查看 DOM 快照、控制台日志、网络请求、源码定位
- 改完代码自动重跑（Watch Mode）
- 点几下就帮你生成元素定位器（Pick Locator）

简单说：**它把"盲跑测试 + 看终端报错"的传统流程，升级成了"看着测试跑、随时回放、随手定位"的可视化流程。**

## 3.2 它解决了什么痛点

我们先看看没有 UI Mode 时，调试一个失败测试的典型流程：

```bash
# ❌ 传统调试流程：低效、靠猜
npx playwright test login.spec.ts      # 跑一次，失败了
# 看终端报错：TimeoutError: locator.click...
# 不知道为什么超时，加一行 console.log
# 改代码，再跑一次
npx playwright test login.spec.ts      # 又失败，再加打印
# 改代码，再跑一次……如此循环 N 次
```

这个流程的问题在于：

1. **看不到现场**——你只知道"点击超时了"，但不知道当时页面上有没有这个按钮、是不是被弹窗挡住了
2. **反馈慢**——每改一次都要从头跑一遍，启动浏览器、登录、导航全都重来
3. **靠脑补**——失败原因全靠经验猜测

UI Mode 把这三个问题全部解决：现场能看见、改完自动重跑、原因一目了然。

## 3.3 什么时候该用 UI Mode

| 场景 | 推荐工具 |
|------|----------|
| 日常本地开发、调试单个测试 | ✅ **UI Mode** |
| 编写新测试、边写边验证 | ✅ **UI Mode**（配合 Watch Mode） |
| 排查不稳定（flaky）测试 | ✅ **UI Mode** 的时光机 |
| 不知道某个元素怎么定位 | ✅ **UI Mode** 的 Pick Locator |
| CI 流水线里批量跑测试 | ❌ 用普通 `npx playwright test`（无界面环境） |
| 分析 CI 上失败的测试 | ❌ 用 Trace Viewer 打开 CI 产出的 trace 文件 |

记住一个原则：**UI Mode 是本地交互式调试利器，但它不能在 CI 这类无图形界面的环境里运行。** CI 上的失败要靠 Trace Viewer 来事后复盘（本文最后一节会讲两者如何配合）。

---

# 四、启动和基本操作

## 4.1 启动命令

在项目根目录执行：

```bash
# ✅ 启动 UI Mode（最常用）
npx playwright test --ui
```

不同包管理器对应的命令：

```bash
# 使用 yarn
yarn playwright test --ui

# 使用 pnpm
pnpm exec playwright test --ui
```

执行后，Playwright 会自动打开一个 UI 窗口。你**不需要**在命令里指定具体测试文件——UI Mode 会加载项目里所有的测试，你在界面里再挑选要跑哪些。

## 4.2 界面布局速览

打开后界面大致分为三块：

```
┌─────────────┬─────────────────────────────────┐
│             │   时间轴（Timeline）             │
│  测试列表    ├─────────────────────────────────┤
│  (侧边栏)    │   Actions 步骤 │  页面快照预览     │
│             │   列表         │  (DOM Snapshot)  │
│             ├────────────────┴─────────────────┤
│             │ Source/Console/Network/Log 标签页 │
└─────────────┴─────────────────────────────────┘
```

- **左侧侧边栏**：所有测试文件和用例的树状列表，每个用例前有一个运行按钮（▶）
- **顶部时间轴**：测试运行后，这里展示整个过程的时间线，可以拖动查看不同时刻
- **中间 Actions 列表**：测试执行的每一步操作（如 `page.goto`、`click`、`fill`），点击某一步会显示对应时刻的页面
- **中间右侧快照区**：显示选中那一步时页面的真实样子
- **底部标签页**：`Source`（源码）、`Console`（控制台）、`Network`（网络）、`Log`（调用日志）、`Errors`（错误）、`Attachments`（附件）

## 4.3 第一个例子：跑起来看看

假设我们有这样一个简单的测试文件：

```typescript
// tests/example.spec.ts
import { test, expect } from '@playwright/test';

// 测试：访问 Playwright 官网首页并验证标题
test('访问首页并检查标题', async ({ page }) => {
  // 导航到目标页面
  await page.goto('https://playwright.dev/');

  // 断言页面标题包含 "Playwright"
  await expect(page).toHaveTitle(/Playwright/);

  // 点击 "Get started" 链接
  await page.getByRole('link', { name: 'Get started' }).click();

  // 断言跳转后页面出现 "Installation" 标题
  await expect(
    page.getByRole('heading', { name: 'Installation' })
  ).toBeVisible();
});
```

启动 `npx playwright test --ui` 后：

1. 在左侧找到 `example.spec.ts`，展开能看到「访问首页并检查标题」这条用例
2. 点击它前面的 ▶ 按钮，或者直接双击用例名
3. 测试开始运行，顶部时间轴和中间 Actions 列表会实时填充
4. 跑完后，点击 Actions 里的任意一步，右侧就会显示那一刻的页面

恭喜，你已经跑通了第一个 UI Mode 测试。下面我们逐个深入它的核心能力。

## 4.4 过滤和筛选测试

当项目里测试很多时，可以用侧边栏顶部的搜索框和过滤器快速定位：

- **按名称搜索**：直接在搜索框输入用例名关键字
- **按状态过滤**：只看「通过 / 失败 / 跳过」的用例
- **按项目（Project）过滤**：如果你配置了多浏览器（chromium / firefox / webkit），可以只看某个项目
- **按标签（Tag）过滤**：如果用例上打了 `@smoke` 之类的标签，可以按标签筛

```typescript
// 给测试打标签，方便在 UI Mode 里筛选
test('登录冒烟测试 @smoke', async ({ page }) => {
  // ... 测试逻辑
});

// 也可以用 tag 选项（Playwright 1.42+）
test('结算流程', { tag: '@regression' }, async ({ page }) => {
  // ... 测试逻辑
});
```

在 UI Mode 搜索框里输入 `@smoke`，就只会显示带这个标签的用例。

---

# 五、Watch Mode：改完代码自动重跑

## 5.1 痛点回顾

写测试时最折磨人的就是这个循环：改一行代码 → 切到终端 → 敲命令重跑 → 等浏览器启动、等登录、等导航 → 看结果 → 再改。每一轮都要十几秒甚至更久。

## 5.2 Watch Mode 怎么用

UI Mode 内置了 Watch Mode（监听模式）。开启后，只要你保存了相关文件，测试会**自动重新运行**，不用手动敲命令。

开启方式：在某个测试用例或文件旁边，点击那个**眼睛图标（👁）/ Watch 按钮**。开启后图标会高亮，表示正在监听这个用例。

```typescript
// tests/search.spec.ts
import { test, expect } from '@playwright/test';

test('搜索功能验证', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // 点击搜索按钮
  await page.getByRole('button', { name: 'Search' }).click();

  // 输入搜索关键词
  await page.getByPlaceholder('Search docs').fill('locator');

  // 验证搜索结果出现
  await expect(page.getByRole('listbox')).toBeVisible();
});
```

操作流程：

1. 点开这个用例旁的 Watch 按钮（👁）
2. 修改代码——比如把搜索词从 `'locator'` 改成 `'fixture'`
3. 按 `Ctrl+S` / `Cmd+S` 保存
4. **测试自动重跑**，你立刻就能在界面里看到新结果

## 5.3 Watch 监听的是什么

Watch Mode 足够聪明，它不只监听测试文件本身，还会监听**测试依赖的源码文件**。比如你的测试 import 了一个页面对象（Page Object），改动那个页面对象文件也会触发重跑。

```typescript
// pages/LoginPage.ts —— 改这个文件也会触发 watch 重跑
export class LoginPage {
  constructor(private page: import('@playwright/test').Page) {}

  // 执行登录操作
  async login(username: string, password: string) {
    await this.page.getByLabel('用户名').fill(username);
    await this.page.getByLabel('密码').fill(password);
    await this.page.getByRole('button', { name: '登录' }).click();
  }
}
```

```typescript
// tests/login.spec.ts —— 测试文件引用了上面的页面对象
import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test('登录流程', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await page.goto('https://example.com/login');
  await loginPage.login('admin', '123456');
  // 修改 LoginPage.ts 里的定位器，这条测试也会被 watch 自动重跑
});
```

## 5.4 最佳实践与陷阱

```typescript
// ❌ 不推荐：开了 watch 还频繁切回终端手动跑
// 既然开了 watch，就专注改代码 + 保存，让它自动跑

// ✅ 推荐：只对当前正在调的 1~2 个用例开 watch
// 不要对整个文件几十条用例都开 watch，否则每次保存都全跑一遍，反而更慢
```

**常见陷阱**：

- **陷阱 1**：对一个超大测试文件开 Watch，结果每次保存都重跑全部用例，等得更久。**解法**：只对当前在调的单个用例开 Watch。
- **陷阱 2**：以为 Watch 会监听非测试相关的配置文件（如 `playwright.config.ts`）。改配置文件通常需要**重启** UI Mode 才能生效。
- **陷阱 3**：测试里有外部副作用（如真往数据库写数据），Watch 频繁重跑会反复产生脏数据。**解法**：让测试自带清理逻辑，或用 `test.beforeEach` / `afterEach` 做好隔离。

---

# 六、Time Travel Debugging：时光机调试

这是 UI Mode 最强大、最有"魔法感"的功能。

## 6.1 什么是时光机调试

普通调试只能看到测试**当前**或**最后**的状态。时光机调试让你能**回到测试执行过程中的任意一个时刻**，看那一刻页面到底长什么样、DOM 是什么结构、控制台输出了什么。

它的原理是：UI Mode 在测试运行时，会为**每一个操作步骤**前后都拍一张 DOM 快照（snapshot）。这些快照不是截图（图片），而是**可交互的 DOM 副本**——你甚至能在快照里用浏览器开发者工具检查元素。

## 6.2 怎么用

跑完一个测试后：

1. 看中间的 **Actions 列表**，里面是每一步操作（`goto`、`click`、`fill`、`expect`...）
2. **鼠标悬停**在某一步上——右侧快照区会**预览**那一步执行前后页面的样子
3. **点击**某一步——右侧固定显示那一刻的完整页面快照
4. 顶部时间轴上还能直接拖动，定位到任意时间点

## 6.3 Action 的 Before / After

每个操作步骤其实有两个关键时刻：

- **Before（执行前）**：操作即将发生时页面的状态。比如 `click` 之前，你能看到 Playwright **高亮**了它即将点击的元素——这对排查"点错了元素"超级有用
- **After（执行后）**：操作完成后页面的状态。比如点完一个"提交"按钮，After 快照里能看到弹出的成功提示

```typescript
// tests/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('下单流程时光机演示', async ({ page }) => {
  await page.goto('https://demo.shop/cart');

  // 【时光机要点 1】点击这一步的 Before 快照里，
  // 会高亮即将点击的 "结算" 按钮，确认定位是否点对了元素
  await page.getByRole('button', { name: '结算' }).click();

  // 【时光机要点 2】填写地址，After 快照能看到输入框里已填入的值
  await page.getByLabel('收货地址').fill('北京市朝阳区xx路1号');

  // 【时光机要点 3】如果下面这步失败，
  // 回看它的 Before 快照就能看到当时页面有没有 "提交订单" 按钮
  await page.getByRole('button', { name: '提交订单' }).click();

  // 断言订单成功
  await expect(page.getByText('下单成功')).toBeVisible();
});
```

## 6.4 用时光机排查真实失败

假设上面的「提交订单」点击超时失败了。传统方式你只能看到 `TimeoutError`，但用时光机：

1. 在 Actions 列表里找到那条**标红失败**的 `click` 步骤
2. 点它，看 Before 快照
3. **真相大白**——原来页面上根本没有"提交订单"按钮，而是"确认下单"。定位器写错了！

这个排查过程在传统模式下可能要折腾半小时（加打印、截图、重跑），在时光机里 10 秒搞定。

## 6.5 配合底部标签页

时光机不只看页面，还能联动底部的几个标签页。**当你选中某一步操作时，底部标签页显示的也是那一刻的对应信息**：

```typescript
// tests/api-debug.spec.ts
import { test, expect } from '@playwright/test';

test('网络请求时光机排查', async ({ page }) => {
  await page.goto('https://demo.shop/products');

  // 点击 "加载更多"，会触发一个 API 请求
  await page.getByRole('button', { name: '加载更多' }).click();

  // 【排查技巧】选中上面这步后，切到底部 Network 标签页，
  // 能看到这一刻触发的请求、状态码、响应体——
  // 如果接口返回 500，列表加载失败的原因就在这里
  await expect(page.getByRole('listitem')).toHaveCount(20);
});
```

各标签页的用途：

- **Source**：高亮显示当前步骤对应的测试源码行，让你知道这一步是哪行代码
- **Console**：那一刻浏览器控制台的输出（包括页面里的 `console.log`、报错）
- **Network**：这一步触发的网络请求详情（URL、方法、状态码、响应）
- **Log**：Playwright 内部的调用日志，能看到它做了哪些等待和重试
- **Errors**：失败时的错误信息和堆栈
- **Attachments**：测试附件，比如对比截图、自定义附件

---

# 七、Pick Locator：快速定位元素

## 7.1 痛点

写测试时最费时间的活儿之一，就是给元素写定位器（locator）。打开浏览器开发者工具、复制 XPath、再翻译成 Playwright 的 API……又慢又容易写出脆弱的定位器。

## 7.2 Pick Locator 怎么用

UI Mode 顶部有一个 **Pick Locator** 按钮（图标像一个十字光标 / 取色器）。点击它后：

1. UI Mode 进入"拾取模式"
2. 把鼠标移到右侧的页面快照上，移到哪个元素，哪个元素就高亮
3. UI Mode **自动生成**该元素的推荐 Playwright 定位器，显示在顶部的输入框里
4. 点击该元素，定位器就被锁定，你可以**复制**它直接粘到代码里

## 7.3 Locator Playground：边调边看

更强的是，生成的定位器出现在一个**可编辑的输入框**里（叫 Locator Playground / 定位器试验场）。你可以：

- 手动修改这个定位器
- **页面快照里会实时高亮**它匹配到的元素
- 如果匹配到多个或零个元素，会立刻提示你——帮你验证定位器是否唯一、是否正确

```typescript
// 假设用 Pick Locator 选中了登录按钮，它生成了这个：
page.getByRole('button', { name: '登录' })

// ✅ 推荐：优先用 Pick Locator 生成的语义化定位器
// getByRole / getByLabel / getByText / getByPlaceholder 这类
// 它们贴近用户视角，页面样式变了也不容易失效
await page.getByRole('button', { name: '登录' }).click();
await page.getByLabel('邮箱').fill('user@example.com');
await page.getByPlaceholder('请输入搜索内容').fill('Playwright');

// ❌ 不推荐：手写脆弱的 CSS/XPath 定位器
// 一旦页面结构调整（多包一层 div、class 名变化），立刻失效
await page.locator('div.container > form > div:nth-child(3) > button').click();
await page.locator('//*[@id="app"]/div[2]/div/button[1]').click();
```

## 7.4 Pick Locator 的最佳实践

```typescript
// ✅ 推荐流程：用 Pick Locator 验证定位器唯一性
// 1. 点 Pick Locator，选中目标元素
// 2. 看 Playground 里高亮的元素是不是只有 1 个（你要的那个）
// 3. 如果高亮了多个，说明定位器不够精确，需要加条件缩小范围

// 比如页面上有多个 "删除" 按钮，泛泛的定位器会匹配到多个：
page.getByRole('button', { name: '删除' })  // ⚠️ 可能匹配多个

// 用 filter 或父容器缩小范围，让它唯一：
page
  .getByRole('row', { name: '订单 #1001' })   // 先定位到目标行
  .getByRole('button', { name: '删除' });       // 再在行内找删除按钮
```

**常见陷阱**：

- **陷阱**：直接复制 Pick Locator 在某个动态页面上生成的定位器，但那个元素带了随机 ID 或动态文本。**解法**：在 Playground 里手动调整，去掉动态部分，换成稳定的语义定位器。
- **陷阱**：选中元素后生成的是 `nth-child` 之类的位置定位器。**解法**：尽量改用 `getByRole`、`getByLabel` 等语义定位器，更稳定。

---

# 八、与 Trace Viewer 的配合

很多人会把 UI Mode 和 Trace Viewer 搞混，因为它们界面长得很像。这一节讲清楚它俩的关系和分工。

## 8.1 两者的关系

可以这样理解：

- **UI Mode** = 实时的、本地的、交互式的测试运行 + 调试环境（你主动跑测试，边跑边看）
- **Trace Viewer** = 事后的、离线的 trace 文件查看器（看一个已经跑完并保存下来的 trace 记录）

它们的调试界面（时间轴、Actions、快照、网络面板）几乎一模一样，因为底层用的是同一套快照技术。区别在于**数据来源**：

| 维度 | UI Mode | Trace Viewer |
|------|---------|--------------|
| 运行环境 | 本地，有图形界面 | 任何地方（看文件即可） |
| 数据来源 | 实时运行测试 | 已保存的 `trace.zip` 文件 |
| 典型场景 | 本地开发调试 | 复盘 CI 上的失败 |
| 能否改代码重跑 | ✅ 能（Watch Mode） | ❌ 不能，只能看 |

## 8.2 为什么需要 Trace Viewer

UI Mode 有个硬限制：**它需要图形界面，不能在 CI 这种无头服务器上跑**。但 CI 恰恰是最容易出现"诡异失败"的地方（环境不同、时序不同）。

解法是：让 CI 在运行测试时**自动录制 trace 文件**，失败后把这个文件作为产物（artifact）保存下来。你下载到本地，用 Trace Viewer 打开，就能像 UI Mode 一样**回放 CI 上那次失败的完整过程**。

## 8.3 配置 Trace 录制

在 `playwright.config.ts` 里配置：

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // trace 录制策略，推荐 'on-first-retry'：
    // 首次失败重试时才录制，既能抓到失败现场，又不浪费性能
    trace: 'on-first-retry',
  },

  // 配合 retries，让失败的测试自动重试一次（重试时会录 trace）
  retries: process.env.CI ? 2 : 0,
});
```

`trace` 的几个可选值：

```typescript
// ✅ 推荐：CI 上用 'on-first-retry'，平衡性能和调试需求
trace: 'on-first-retry'

// 只在最终失败时保留 trace
trace: 'retain-on-failure'

// ❌ 不推荐在 CI 常开：'on' 会给每个测试都录 trace，体积大、变慢
trace: 'on'

// 完全关闭（默认值）
trace: 'off'
```

## 8.4 打开 trace 文件

CI 失败后，从产物里下载到 `trace.zip`，本地用命令打开：

```bash
# ✅ 用 Trace Viewer 打开下载下来的 trace 文件
npx playwright show-trace trace.zip

# 也可以打开测试报告，从报告里点进 trace
npx playwright show-report
```

打开后你会看到一个和 UI Mode 几乎一样的界面，同样能时光机回放、看网络、看控制台——只不过这次看的是 CI 上那次失败的"录像"。

## 8.5 完整工作流：本地 + CI 闭环

把两者结合起来，就形成了一套完整的调试工作流：

```
本地开发阶段
   └── 用 UI Mode（--ui）边写边调，Watch Mode 自动重跑
            ↓ 代码推送到远程
CI 运行阶段
   └── 普通 npx playwright test 跑测试，配置 trace: 'on-first-retry'
            ↓ 某个测试失败
复盘阶段
   └── 下载 CI 产出的 trace.zip
   └── 本地 npx playwright show-trace trace.zip 回放失败现场
            ↓ 找到原因，回到本地用 UI Mode 修复验证
```

```typescript
// ❌ 不推荐：想在 CI 里用 UI Mode 调试
// CI 没有图形界面，--ui 根本起不来
// "npx playwright test --ui" on CI  → 失败

// ✅ 推荐：CI 录 trace，本地用 Trace Viewer / UI Mode 复盘
// CI: npx playwright test  (config 里 trace: 'on-first-retry')
// 本地: npx playwright show-trace path/to/trace.zip
```

---

# 九、完整 Demo：一次真实的调试之旅

下面用一个相对完整的例子，串起本文讲到的所有能力。场景：测试一个待办事项（Todo）应用的"添加 + 完成"流程。

```typescript
// tests/todo.spec.ts
import { test, expect, Page } from '@playwright/test';

// ============ 页面对象：封装 Todo 应用的常用操作 ============
// 把页面操作收敛到一个类里，watch 模式下改这里也会触发重跑
class TodoPage {
  // 构造函数接收 Playwright 的 page 实例
  constructor(private readonly page: Page) {}

  // 打开 Todo 应用首页
  async goto() {
    await this.page.goto('https://demo.playwright.dev/todomvc');
  }

  // 添加一条待办：输入文本并回车
  async addTodo(text: string) {
    // 用 placeholder 语义定位输入框（Pick Locator 推荐的稳定写法）
    const input = this.page.getByPlaceholder('What needs to be done?');
    await input.fill(text);
    await input.press('Enter');
  }

  // 把指定文本的待办标记为完成
  async completeTodo(text: string) {
    // 先定位到对应的待办项，再点它内部的完成复选框
    const item = this.page.getByRole('listitem').filter({ hasText: text });
    await item.getByRole('checkbox').check();
  }

  // 返回当前待办列表中所有项的文本
  getTodoItems() {
    return this.page.getByTestId('todo-title');
  }
}

// ============ 测试用例 ============
test.describe('Todo 应用核心流程', () => {
  // 每个用例运行前都先打开页面，保证隔离
  test.beforeEach(async ({ page }) => {
    const todo = new TodoPage(page);
    await todo.goto();
  });

  test('能添加多条待办', async ({ page }) => {
    const todo = new TodoPage(page);

    // 添加两条待办
    await todo.addTodo('学习 Playwright UI Mode');
    await todo.addTodo('实践时光机调试');

    // 断言列表里正好有 2 条
    // 【调试点】若数量不对，时光机回看 addTodo 的 After 快照，
    // 看看回车后列表到底加了几项
    await expect(todo.getTodoItems()).toHaveCount(2);
  });

  test('能完成一条待办', async ({ page }) => {
    const todo = new TodoPage(page);

    // 准备数据：先加一条
    await todo.addTodo('写测试文档');

    // 标记完成
    await todo.completeTodo('写测试文档');

    // 断言这条待办带上了 completed 样式类
    // 【调试点】若失败，用 Pick Locator 确认 checkbox 定位是否点对
    const item = page.getByRole('listitem').filter({ hasText: '写测试文档' });
    await expect(item).toHaveClass(/completed/);
  });
});
```

**用 UI Mode 调试这个 Demo 的推荐步骤：**

1. **启动**：`npx playwright test --ui`
2. **开 Watch**：对「能完成一条待办」这条用例点 👁，进入边改边跑模式
3. **跑一次**：双击用例运行，观察 Actions 列表里每一步是否符合预期
4. **遇到失败用时光机**：假设 `completeTodo` 的 `check()` 失败了，点那一步看 Before 快照，确认 checkbox 当时在不在、是不是被遮挡
5. **不确定定位器就用 Pick Locator**：点 Pick Locator，在快照上选中那个 checkbox，看生成的定位器和你代码里的是否一致
6. **改代码 → 保存 → 自动重跑**：Watch Mode 会立刻反馈修复结果
7. **CI 复盘**：如果这个测试在 CI 上偶发失败，从 CI 下载 trace，`npx playwright show-trace trace.zip` 回放

---

# 十、总结

UI Mode 把 Playwright 的调试体验从"盲跑 + 脑补"升级成了"可视化 + 可回放"。回顾本文的核心要点：

1. **UI Mode 是本地交互式调试面板**，用 `npx playwright test --ui` 启动，适合本地开发调试，但不能在 CI 上跑。
2. **Watch Mode** 让你改完代码自动重跑，告别手动敲命令。建议只对当前在调的 1~2 个用例开启。
3. **Time Travel Debugging（时光机）** 是最核心的能力——每一步操作都有 Before/After 快照，能精确回到失败那一刻，配合底部 Source/Console/Network 标签页定位根因。
4. **Pick Locator** 帮你快速生成稳定的语义化定位器，并能在 Locator Playground 里实时验证唯一性。优先用 `getByRole`/`getByLabel`，避免脆弱的 CSS/XPath。
5. **Trace Viewer 是 UI Mode 的离线版**，专治 CI 上的诡异失败：CI 录 trace（推荐 `on-first-retry`），本地 `show-trace` 回放，形成"本地调 + CI 复盘"的完整闭环。

一句话总结最佳实践：**本地用 UI Mode 把测试调稳，CI 配好 trace 录制，失败时用 Trace Viewer 复盘。** 掌握这套工作流，你的测试调试效率会有质的提升。

# 十一、延伸阅读

- Playwright 官方文档 - UI Mode：`https://playwright.dev/docs/test-ui-mode`
- Playwright 官方文档 - Trace Viewer：`https://playwright.dev/docs/trace-viewer`
- Playwright 官方文档 - 定位器（Locators）：`https://playwright.dev/docs/locators`
- Playwright 官方文档 - 调试测试：`https://playwright.dev/docs/debug`
- Playwright 官方文档 - 最佳实践：`https://playwright.dev/docs/best-practices`
- 本小册第 01 篇《快速上手》：建立基础后再回看本文，效果更佳
- 本小册第 03 篇《等待策略》：很多"超时失败"的根因在等待，配合时光机一起看更清晰

# 十二、总结

- **适合人群**：已经会写基础 Playwright 测试，但调试起来很痛苦的开发者
- **前置知识**：已经安装好 Node.js 和 Playwright（npm init playwright@latest 即可初始化）
- **UI Mode 是什么，什么时候用它**：UI Mode 是 Playwright 官方提供的一个图形化测试运行与调试面板。
- **启动和基本操作**：执行后，Playwright 会自动打开一个 UI 窗口。

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“Playwright（2）- UI 模式完全指南：交互式调试工作流”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。
