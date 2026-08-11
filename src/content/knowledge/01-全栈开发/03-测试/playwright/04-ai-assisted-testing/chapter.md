# AI 辅助测试开发：让 Claude 帮你写测试

写测试是一件“重要但枯燥”的事。业务逻辑清晰，但一个个页面点过去、一个个断言敲出来，既耗时又容易出错。好消息是：现在我们可以让 AI（比如 Claude）来帮我们写测试代码，把人力从重复劳动里解放出来。

但很多团队第一次尝试后会失望：AI 生成的测试要么跑不起来，要么充满重复点击，要么过几天就没人能维护。问题往往不在 AI，而在**我们没有给它一个适合协作的工程环境**。

这篇文章会带你一步步搭建“AI 友好”的测试工程，让 Claude 写出来的测试既能跑、又好维护。

---

## 适合人群

- 已经会用 Playwright 写基础测试，想提升团队整体效率的人
- 团队里测试代码越写越乱、越来越难维护，想找一套组织方法的人
- 想引入 AI 辅助编码，但担心“AI 写的代码没法用”的人
- 测试 Leader / 工程效率负责人，想为团队定规范的人

如果你完全没接触过 Playwright，建议先看本小册前面几篇打好基础。

---

## 前置知识

阅读本文前，你最好了解：

1. **Playwright 基础 API**：`page.goto`、`page.click`、`page.fill`、`expect` 断言。
2. **TypeScript 基础**：函数、类、接口（interface）、`import / export`。
3. **会用一款 AI 编码工具**：比如 Claude Code、Cursor、或任何能读写你项目文件的 AI 助手。

不需要你懂复杂的设计模式，文章会从最朴素的写法讲起，循序渐进。

---

## 一、先想清楚：AI 写测试为什么会“翻车”

在动手之前，我们先理解 AI 的工作方式。Claude 这类模型本质上是“根据上下文预测下一段最合理的代码”。它写得好不好，取决于两件事：

1. **它看到了什么上下文**（你给的信息、它能读到的代码）
2. **它能依赖什么约定**（项目里有没有现成的可复用模块和规范）

如果你只甩一句“帮我写个登录测试”，AI 只能凭空想象你的页面长什么样、按钮叫什么、登录后跳转到哪。它会编造一堆选择器（selector），结果自然跑不起来。

所以，AI 辅助测试的核心思路是：**把项目改造成一个“信息充分、约定清晰”的环境，让 AI 站在巨人的肩膀上写代码，而不是从零猜。**

下面六个知识点，就是搭建这个环境的六块基石。

---

## 二、知识点 1：如何给 AI 提供清晰上下文

“上下文”就是你在让 AI 干活之前，喂给它的信息。上下文越清晰，AI 出错越少。

### ❌ 不推荐：模糊的一句话需求

```
帮我写一个新增油费的测试。
```

AI 看到这句话，脑子里全是问号：油费页面在哪？表单有哪些字段？字段是下拉还是输入框？登录账号是什么？它只能瞎猜，写出的代码 99% 跑不通。

### ✅ 推荐：结构化、带定位信息的上下文

给 AI 提供四类关键信息：**做什么、在哪做、用什么数据、怎么验证**。

```
任务：为“新增油费”功能写一个 Playwright 测试。

页面信息：
- 列表页路由：/Cost/oilFeeList
- 点击工具栏“新增”按钮打开弹窗
- 弹窗里的字段（data-path）：
  - batch（运单号，下拉，选择后自动带出 tr_id）
  - tr_id（车牌，下拉）
  - amount（金额，输入框，可自由输入）

数据来源：
- 登录信息、运单号、车牌都从统一测试上下文 getE2ETestContext() 读取，禁止硬编码

验证方式：
- 保存成功后打开详情，校验金额字段回显正确
```

注意这里有几个关键动作：

- **给出真实的路由和字段名**（`data-path`），AI 就不用猜选择器了。
- **说明字段类型和联动关系**（“选择后自动带出 tr_id”），AI 才知道要处理异步等待。
- **明确数据来源**，避免 AI 编造账号密码。

### 实战技巧：让 AI 自己先去“看”页面

更高级的做法是，不直接描述页面，而是**让 AI 先读源码或先探索页面**。如果你的 AI 工具能运行命令、读文件，可以这样引导：

```
先读 src/components/utilcomponents/Select 下的组件源码，
搞清楚下拉组件是怎么触发搜索、怎么校验的，
再决定测试里该怎么操作它。
```

这样 AI 写出来的代码会贴合你项目真实的组件实现，而不是套用网上的通用写法。

> 小结：上下文 = 做什么 + 在哪做（路由/字段/选择器）+ 用什么数据 + 怎么验证。信息给得越具体，AI 越靠谱。

---

## 三、知识点 2：用 CLAUDE.md 约束 AI 输出

每次都手敲一大段上下文太累了。更聪明的办法是把**项目的固定规则**写进一个文件，让 AI 每次干活前都自动读它。在 Claude Code 里，这个文件就是项目根目录的 `CLAUDE.md`。

你可以把它理解成“给 AI 的项目说明书 + 团队规范”。它解决的是“**约定**”这件事：AI 不用每次都问“你们项目数据放哪、文件怎么组织”，照着 `CLAUDE.md` 做就行。

### CLAUDE.md 该写什么

一份好的 `CLAUDE.md` 通常包含：

```markdown
# 项目说明

这是一个基于 Playwright 的 E2E 测试框架。

## 硬性规则（必须遵守）

1. 禁止硬编码数据：登录账号、密码、车牌、运单号等业务数据
   必须来自环境变量或 getE2ETestContext()，不能写死在测试里。

2. 幂等操作优先：进入页面、筛选、勾选这类操作，必须封装成可重复
   执行的 ensureXxx 方法（先检查状态，已满足就不重复做）。
   保存、审核这类“只能做一次”的操作，禁止重复点击。

3. 失败必须报错：公共方法找不到元素时要抛出带详细信息的错误，
   不允许只打印日志然后静默跳过。

## 目录约定

- lib/interaction/  → 封装组件操作（下拉、输入、日历…）
- tests/            → 测试用例，按业务模块分目录
- 每个页面的多步操作要沉淀成 Operator 类

## 写完代码必须做的检查

运行 `npx tsc --noEmit` 检查 TypeScript 类型错误，有错先修。
```

### ❌ 不推荐：规则散落在脑子里

团队规则只在资深同学心里，每次 review AI 的代码时才发现“哎你怎么又把账号写死了”。AI 不知道你的规则，自然反复犯同样的错。

### ✅ 推荐：把规则固化进 CLAUDE.md

规则写下来后，AI 每次生成代码都会遵守。比如你写了“禁止硬编码数据”，AI 就会主动用 `getE2ETestContext()` 取数据，而不是写 `password: '123456'`。

```typescript
// ❌ AI 在没有 CLAUDE.md 约束时可能这么写
await login(page, { account: 'test001', password: '123456' });

// ✅ 有了 "禁止硬编码" 规则后，AI 会这么写
const context = getE2ETestContext();   // 从统一上下文读取登录信息
await login(page, context.login);
```

> 小结：CLAUDE.md 是“一次书写、永久生效”的团队规范。把硬性规则、目录约定、检查命令写进去，AI 就能稳定产出符合团队标准的代码。

---

## 四、知识点 3：AI 友好的代码组织模式

AI 擅长“模仿”。如果你的项目里有清晰、一致的代码组织，AI 会照着已有模式写新代码，质量自然高。反之，如果项目里每个测试都用一套不同的写法，AI 也会东学一点西学一点，越写越乱。

“AI 友好”的核心是：**把通用能力沉淀成可复用的模块，让测试用例只负责编排业务。**

### 三层结构

一个清晰的测试工程通常分三层：

```
第 1 层：lib/interaction/   组件交互层（下拉怎么选、输入框怎么填）
第 2 层：Operator 业务动作层（“新增油费”这个业务流程怎么走）
第 3 层：spec 测试用例层（编排业务步骤 + 写断言）
```

越往下越通用，越往上越贴近业务。AI 在每一层都能找到可参考的样板。

### ❌ 不推荐：所有逻辑堆在 spec 里

```typescript
test('新增油费', async ({ page }) => {
  // 登录细节、选择器、等待逻辑全堆在一起，又长又难读
  await page.goto('https://xxx.com/login');
  await page.fill('input[name="account"]', 'test001');
  await page.fill('input[name="password"]', '123456');
  await page.click('.login-btn');
  await page.waitForTimeout(2000);                 // 固定等待，不稳定
  await page.goto('https://xxx.com/Cost/oilFeeList');
  await page.click('text=新增');
  await page.click('[data-path="batch"]');
  await page.fill('[data-path="batch"] input', 'YD20240001');
  await page.click('.dropdown-option:first-child');
  // ……还有几十行
});
```

这种代码 AI 也能生成，但它一次性、不可复用，下个测试又得重写一遍，且选择器一变全部要改。

### ✅ 推荐：分层封装，spec 只编排

```typescript
import { test } from '@playwright/test';
import { login, switchToAccount, getE2ETestContext } from '@/lib';
import { OilFeeOperator } from './OilFeeOperator';

test('新增油费成功', async ({ page }) => {
  // 第 3 层：spec 只负责编排业务步骤 + 断言，读起来像“需求描述”
  const context = getE2ETestContext();           // 统一上下文，拿登录与业务数据
  await login(page, context.login);              // 登录（细节封装在 lib/auth）
  await switchToAccount(page, context.switchAccount);

  const oilFee = new OilFeeOperator(page);        // 第 2 层：业务动作
  await oilFee.gotoList();                         // 进入列表页
  await oilFee.openCreateDialog();                // 打开新增弹窗
  await oilFee.fillCreateForm(context.data.oilFee); // 填表单
  await oilFee.submitCreate();                     // 保存

  await oilFee.verifyDetailEcho(context.data.oilFee); // 验证详情回显
});
```

是不是清爽多了？spec 读起来就像一段需求描述，谁都看得懂。当 AI 要写一个“新增过路费”的新测试时，它会照着这个模式，生成结构一致的代码。

### 用统一导出降低 AI 的认知负担

把公共能力通过一个统一入口导出，AI 只需要记住一个导入路径：

```typescript
// lib/index.ts —— 统一导出入口
export { login, switchToAccount } from './auth/login';
export { selectDropdown, fillInput, selectDate } from './interaction';
export { getE2ETestContext } from './constants/test-context';
// ……
```

```typescript
// 测试里只需一行导入，AI 不用到处找模块在哪
import { login, selectDropdown, fillInput, getE2ETestContext } from '@/lib';
```

> 小结：清晰的分层 + 统一导出 = AI 有样板可抄、有现成工具可用。代码组织得越规整，AI 产出的质量越高、越一致。

---

## 五、知识点 4：Operator 模式——让 AI 生成可维护代码

上一节提到的“第 2 层”就是 Operator 模式，它是 AI 友好工程里最关键的一块，值得单独展开。

### 什么是 Operator

Operator（业务操作类）是一个把“某个页面/某个功能的多步操作”打包起来的类。比如“油费 Operator”负责所有跟油费相关的页面动作：进列表、开弹窗、填表单、提交、验证。

它的好处：

- **测试用例变得极简**：spec 里只调用 `oilFee.submitCreate()`，不用关心内部怎么点的。
- **改动集中**：页面改版了，只改 Operator 一个文件，所有用它的测试自动受益。
- **AI 容易理解和扩展**：方法名就是业务语义，AI 一看 `openCreateDialog` 就知道该干嘛。

### 一个真实的 Operator 长什么样

下面是一个简化但完整的油费 Operator，注意每个方法都遵循前面定的规则（数据来自外部、操作可诊断、关键步骤等真实状态）：

```typescript
import { expect, Page } from '@playwright/test';
import {
  selectDropdown,
  fillInput,
  clickToolbarButton,
  clickSaveButton,
  waitForListStable,
  getInputValue,
  URLS,
} from '@/lib';

/** 油费业务操作类：封装“新增油费”相关的所有页面动作 */
export class OilFeeOperator {
  // page：当前 Playwright 页面对象，所有操作都基于它
  constructor(private readonly page: Page) {}

  /**
   * 进入油费列表页
   * 用 ensure 语义：进入后等待列表稳定，可安全重复调用
   */
  async gotoList(): Promise<void> {
    await this.page.goto(URLS().oilFeeList);  // URLS() 是函数，运行时动态取地址
    await waitForListStable(this.page);       // 等列表加载完成，而非固定 sleep
  }

  /**
   * 打开“新增油费”弹窗
   * 先检查弹窗是否已打开，避免重复点击（幂等）
   */
  async openCreateDialog(): Promise<void> {
    const dialog = this.page.locator('.modal-dialog:has-text("新增油费")');
    if (await dialog.isVisible()) return;     // 已经打开就不重复点
    await clickToolbarButton({ page: this.page, text: '新增' });
    await expect(dialog).toBeVisible();       // 等弹窗真正出现
  }

  /**
   * 填写新增表单
   * @param data 表单数据，必须由调用方传入（禁止硬编码）
   */
  async fillCreateForm(data: { batchNo: string; truckNo: string; amount: string }): Promise<void> {
    // 选运单号，选完后自动带出车牌 tr_id，用 waitForField 等待联动完成
    await selectDropdown({ page: this.page, dataPath: 'batch', keyword: data.batchNo, waitForField: 'tr_id' });
    // 车牌可能已被带出，这里确认/覆盖为期望值
    await selectDropdown({ page: this.page, dataPath: 'tr_id', keyword: data.truckNo });
    // 金额是自由输入框
    await fillInput({ page: this.page, dataPath: 'amount', value: data.amount });
  }

  /**
   * 提交保存
   * 保存是非幂等操作，只能点一次，绝不重复
   */
  async submitCreate(): Promise<void> {
    await clickSaveButton(this.page);                 // 点保存（内部会检查弹窗错误）
    await waitForListStable(this.page);               // 等保存完成、列表刷新
  }

  /**
   * 校验详情页字段回显是否正确
   * @param data 期望的数据
   */
  async verifyDetailEcho(data: { amount: string }): Promise<void> {
    const actual = await getInputValue(this.page, '[data-path="amount"]');
    expect(actual).toBe(data.amount);                 // 断言金额回显正确
  }
}
```

### ❌ 不推荐：让 AI 在 spec 里直接堆操作

如果你不引入 Operator，AI 会把所有 `selectDropdown`、`fillInput` 全塞进 test 函数里。短期能跑，长期是灾难：十个测试就有十份重复的填表代码，页面一改全军覆没。

### ✅ 推荐：先建 Operator，再让 AI 编排

正确的协作姿势是：

1. 你（或 AI）先为页面建一个 Operator，把动作封装好。
2. 写新测试时，告诉 AI：“用 OilFeeOperator 写一个修改油费的测试”。
3. AI 会复用现成方法，只补它缺的（比如加一个 `openEditDialog`）。

这样每个测试都干净，且维护成本极低。

> 小结：Operator 模式把“多步操作”收敛成“有业务语义的方法”。它让测试可读、可维护，也让 AI 有清晰的扩展点——这是 AI 生成可维护代码的关键。

---

## 六、知识点 5：用 trace 和截图辅助 AI 调试

测试写好了不代表一次就过。当测试失败时，AI 怎么知道哪里错了？答案是：**给它“证据”**。Playwright 的 trace（追踪记录）和截图，就是最好的证据。

### 先打开 trace 和截图

在 `playwright.config.ts` 里配置失败时自动记录：

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // 首次失败时记录 trace（包含每一步操作、网络请求、DOM 快照）
    trace: 'retain-on-failure',
    // 失败时自动截图
    screenshot: 'only-on-failure',
    // 失败时保留录像
    video: 'retain-on-failure',
  },
});
```

### trace 是什么，为什么对 AI 调试这么有用

trace 是一个 `.zip` 文件，里面记录了测试运行的**完整过程**：每一步点了什么、页面当时的快照、发了哪些网络请求、控制台报了什么错。

用浏览器打开它：

```bash
# 打开某次失败的 trace 文件
npx playwright show-trace trace.zip
```

你会看到一条时间线，能逐帧回看测试。**关键在于：trace 里的信息可以喂给 AI。**

### ❌ 不推荐：只把一句报错丢给 AI

```
测试失败了，报错是 TimeoutError: locator.click timeout 5000ms。
帮我看看。
```

只有这一句，AI 根本不知道是元素没出现、被遮挡、还是选择器写错了。它只能给你一堆“可能是 A、可能是 B”的猜测。

### ✅ 推荐：把 trace / 截图 / 控制台日志一起给 AI

把现场证据收集齐了再交给 AI：

```
测试失败了。现场信息如下：

1. 报错：locator '[data-path="tr_id"]' click timeout 5000ms
2. 失败截图（见附件 screenshot.png）：弹窗还在加载，车牌字段是灰色禁用状态
3. trace 显示：选完 batch 后，tr_id 字段对应的 API /api/getTruck 耗时 3.2s 才返回
4. 控制台无报错

请分析根因并修复。
```

有了这些，AI 能准确判断：**问题是没等联动完成就去点车牌字段**。它会建议用 `waitForField: 'tr_id'` 等待联动 API 返回后再操作，而不是简单地把超时时间调大。

### 让 AI 帮你加“可诊断”的错误信息

更进一步，可以让 AI 在封装方法里主动输出有用的失败信息，这样下次失败时证据自动就齐了：

```typescript
/**
 * 选择下拉选项，失败时抛出带详细上下文的错误（方便 AI 和人排查）
 * @param page  页面对象
 * @param dataPath 字段标识
 * @param keyword 要搜索的关键词
 */
async function selectDropdownSafe(page: Page, dataPath: string, keyword: string): Promise<void> {
  const trigger = page.locator(`[data-path="${dataPath}"]`);
  if (!(await trigger.isVisible())) {
    // 抛错时带上字段、关键词、当前页面 URL，定位问题一目了然
    throw new Error(
      `[selectDropdown] 找不到字段 "${dataPath}"，关键词="${keyword}"，当前页面=${page.url()}`,
    );
  }
  await trigger.click();
  await page.locator('.dropdown-input').fill(keyword);
  const option = page.locator(`.dropdown-option:has-text("${keyword}")`).first();
  if (!(await option.isVisible())) {
    throw new Error(
      `[selectDropdown] 字段 "${dataPath}" 搜索 "${keyword}" 无匹配选项，请确认数据是否存在于测试环境`,
    );
  }
  await option.click();
}
```

> 小结：调试 AI 不是“描述问题”，而是“提供证据”。trace、截图、控制台日志、可诊断的错误信息——证据越全，AI 定位根因越准。

---

## 七、知识点 6：常见陷阱——避免 AI 生成重复点击

这是 AI 写测试时最常见、也最隐蔽的坑。AI 为了“保险”，经常会重复执行操作：多点几次查询、反复勾选、保存点两遍。在功能测试里这往往造成脏数据、误操作，甚至让测试本身变得不可靠。

### 为什么 AI 爱重复点击

AI 的“防御性思维”作祟：它不确定上一步成没成功，于是“再点一次保险”。但很多业务操作是**非幂等**的——点一次新增一条数据，点两次就新增两条；审核点两次可能直接报错。

### ❌ 不推荐：无脑重复点击

```typescript
// AI 常见的“防御性”写法，问题很大
await page.click('text=查询');
await page.click('text=查询');              // 重复查询，可能触发两次请求
await page.waitForTimeout(1000);

await page.check('.row-checkbox');
await page.check('.row-checkbox');          // 重复勾选，状态可能被反选

await page.click('text=保存');
await page.click('text=保存');              // 灾难：保存两次 = 新增两条数据
```

### ✅ 推荐：幂等操作用 ensure，非幂等操作只做一次

核心原则分两类对待：

**1. 可重入的操作（进页面、筛选、勾选、选行）→ 封装成 `ensureXxx`，先读状态再决定要不要做**

```typescript
/**
 * 确保某一行已被勾选（幂等：已勾选就什么都不做）
 * @param page 页面对象
 * @param rowText 行内的唯一文本，用于定位目标行
 */
async function ensureRowChecked(page: Page, rowText: string): Promise<void> {
  const row = page.locator(`tr:has-text("${rowText}")`);
  const checkbox = row.locator('input[type="checkbox"]');
  // 先读当前状态，已勾选就直接返回，绝不重复点
  if (await checkbox.isChecked()) return;
  await checkbox.check();
  await expect(checkbox).toBeChecked();    // 确认勾选成功
}
```

```typescript
/**
 * 确保筛选条件已应用并完成查询（幂等：避免重复点查询）
 * @param page 页面对象
 * @param keyword 查询关键词
 */
async function ensureFilterApplied(page: Page, keyword: string): Promise<void> {
  const input = page.locator('[data-path="searchKeyword"]');
  // 如果输入框里已经是目标值，说明查过了，不重复操作
  if ((await input.inputValue()) === keyword) return;
  await input.fill(keyword);
  await page.click('text=查询');           // 只点一次查询
  await waitForListStable(page);           // 等列表刷新完成，而不是 sleep
}
```

**2. 非幂等的业务动作（保存、审核、结算、提交）→ 严格只执行一次，靠“等待真实结果”来确认成功，而不是“再点一次”**

```typescript
/**
 * 提交保存——非幂等操作，只能点一次
 * 通过等待真实结果（弹窗关闭 / 成功提示）来确认成功
 * @param page 页面对象
 */
async function submitOnce(page: Page): Promise<void> {
  const saveBtn = page.locator('button:has-text("保存")');
  await saveBtn.click();                   // 只点一次
  // 用“等待结果”代替“重复点击”：等弹窗关闭或出现成功提示
  await expect(page.locator('.modal-dialog')).toBeHidden({ timeout: 10000 });
}
```

### 怎么让 AI 不踩这个坑

最有效的办法还是回到知识点 2：**把规则写进 CLAUDE.md**。比如：

```markdown
## 硬性操作规则

- 进入页面、筛选、勾选、选行：必须封装成 ensureXxx，先读状态再操作，禁止无条件重复执行。
- 保存、审核、结算、提交等非幂等动作：只能执行一次，靠等待真实结果确认成功，禁止“再点一次保险”。
- 禁止用 waitForTimeout 固定等待来“等操作生效”，应等待真实业务状态。
```

有了这条规则，AI 在生成代码时会主动避免重复点击，转而用 `ensure` 封装和“等待结果”的写法。

> 小结：AI 爱重复点击，是因为它分不清幂等与非幂等。用 `ensureXxx` 处理可重入操作、用“等待真实结果”确认非幂等操作，再把规则写进 CLAUDE.md，就能根治这个毛病。

---

## 八、完整 Demo：从零让 AI 写一个可维护的测试

下面把六个知识点串起来，演示一次完整的 AI 协作流程。

### 步骤 1：准备 CLAUDE.md（约定先行）

```markdown
# 测试项目说明

基于 Playwright 的 E2E 框架。

## 硬性规则
1. 禁止硬编码业务数据，统一从 getE2ETestContext() 读取。
2. 进页面/筛选/勾选 → 封装 ensureXxx；保存/审核 → 只做一次。
3. 公共方法失败必须抛带上下文的错误。
4. 多步操作沉淀为 Operator，spec 只编排。
5. 写完跑 `npx tsc --noEmit` 检查类型。
```

### 步骤 2：给 AI 清晰的任务上下文

```
任务：用 Operator 模式为“过路费”写一个新增测试。
参考已有的 OilFeeOperator 的结构。

页面信息：
- 列表页 URLS().tollFeeList
- 工具栏“新增”按钮打开弹窗
- 字段：batch（运单，下拉，带出 tr_id）、tr_id（车牌，下拉）、amount（金额，输入框）

数据：全部来自 getE2ETestContext().data.tollFee
验证：保存后打开详情，校验 amount 回显
```

### 步骤 3：AI 生成的 Operator（符合规范）

```typescript
import { expect, Page } from '@playwright/test';
import {
  selectDropdown, fillInput, clickToolbarButton,
  clickSaveButton, waitForListStable, getInputValue, URLS,
} from '@/lib';

/** 过路费业务操作类 */
export class TollFeeOperator {
  // page：当前页面对象
  constructor(private readonly page: Page) {}

  /** 进入过路费列表页并等待稳定 */
  async gotoList(): Promise<void> {
    await this.page.goto(URLS().tollFeeList);
    await waitForListStable(this.page);
  }

  /** 打开新增弹窗（幂等：已打开则不重复点） */
  async openCreateDialog(): Promise<void> {
    const dialog = this.page.locator('.modal-dialog:has-text("新增过路费")');
    if (await dialog.isVisible()) return;
    await clickToolbarButton({ page: this.page, text: '新增' });
    await expect(dialog).toBeVisible();
  }

  /**
   * 填写表单
   * @param data 过路费数据，由调用方传入
   */
  async fillCreateForm(data: { batchNo: string; truckNo: string; amount: string }): Promise<void> {
    await selectDropdown({ page: this.page, dataPath: 'batch', keyword: data.batchNo, waitForField: 'tr_id' });
    await selectDropdown({ page: this.page, dataPath: 'tr_id', keyword: data.truckNo });
    await fillInput({ page: this.page, dataPath: 'amount', value: data.amount });
  }

  /** 提交保存（非幂等，只点一次） */
  async submitCreate(): Promise<void> {
    await clickSaveButton(this.page);
    await waitForListStable(this.page);
  }

  /**
   * 校验详情回显
   * @param data 期望数据
   */
  async verifyDetailEcho(data: { amount: string }): Promise<void> {
    const actual = await getInputValue(this.page, '[data-path="amount"]');
    expect(actual).toBe(data.amount);
  }
}
```

### 步骤 4：AI 生成的 spec（只编排）

```typescript
import { test } from '@playwright/test';
import { login, switchToAccount, getE2ETestContext } from '@/lib';
import { TollFeeOperator } from './TollFeeOperator';

test('新增过路费成功', async ({ page }) => {
  // 从统一上下文取登录与业务数据，无任何硬编码
  const context = getE2ETestContext();
  await login(page, context.login);
  await switchToAccount(page, context.switchAccount);

  // 业务编排：每一步都是清晰的业务语义
  const tollFee = new TollFeeOperator(page);
  await tollFee.gotoList();
  await tollFee.openCreateDialog();
  await tollFee.fillCreateForm(context.data.tollFee);
  await tollFee.submitCreate();
  await tollFee.verifyDetailEcho(context.data.tollFee);
});
```

### 步骤 5：跑测试 → 失败 → 喂证据给 AI

假设第一次运行失败了，按知识点 5 的方法收集证据：

```bash
# 运行测试
npx playwright test tests/过路费/create-toll-fee.spec.ts

# 失败后打开 trace 看现场
npx playwright show-trace test-results/.../trace.zip
```

把 trace 截图 + 报错 + API 耗时一起交给 AI，让它定位根因（比如联动没等够），AI 修一版，再跑，直到通过。

### 步骤 6：类型检查收尾

```bash
# 遵守 CLAUDE.md 的规则，提交前必查类型
npx tsc --noEmit
```

整个流程下来，你会发现 AI 做了 80% 的体力活，而你只负责给上下文、定规则、看证据、做决策。这才是 AI 辅助测试的正确姿势。

---

## 九、小结

让 Claude 帮你写测试，关键不在于 AI 多聪明，而在于**你给它的环境有多友好**。回顾六块基石：

1. **清晰上下文**：做什么 + 在哪做 + 用什么数据 + 怎么验证，信息越具体越好。
2. **CLAUDE.md 约束**：把团队硬性规则一次写定，AI 每次都遵守。
3. **AI 友好的组织**：分层 + 统一导出，让 AI 有样板可抄。
4. **Operator 模式**：把多步操作收敛成业务方法，代码可读可维护。
5. **trace 与截图辅助调试**：给 AI 证据而非描述，根因定位才准。
6. **避免重复点击**：幂等用 `ensure`，非幂等只做一次并等待真实结果。

一句话总结：**AI 是放大器。工程规范好，它放大你的效率；工程混乱，它放大你的混乱。** 先把环境搭好，再让 AI 来跑，事半功倍。

---

## 十、延伸阅读

- Playwright 官方文档 - Trace Viewer：`https://playwright.dev/docs/trace-viewer`
- Playwright 官方文档 - 最佳实践（Best Practices）：`https://playwright.dev/docs/best-practices`
- Playwright 官方文档 - Page Object Model（Operator 模式的理论基础）：`https://playwright.dev/docs/pom`
- Anthropic Claude Code 文档（CLAUDE.md 用法）：`https://docs.anthropic.com/en/docs/claude-code`
- 本小册前序章节：定位器与自动等待、断言与稳定性、夹具（fixtures）与测试组织
