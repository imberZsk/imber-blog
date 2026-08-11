# Playwright（5）- 可维护测试架构：Operator 模式与公共库

> 读完你能：围绕“可维护测试架构：Operator 模式与公共库”理解“适合人群”与“前置知识”，并结合正文示例完成实践与排障。

> 当测试用例从 10 个增长到 500 个，决定项目生死的不是测试覆盖率，而是测试代码的可维护性。本文讲清楚一套经过大型项目验证的分层架构。

# 一、适合人群

- 负责搭建或重构团队 E2E 测试框架的技术负责人
- 维护着一堆"能跑但没人敢改"的测试脚本、想要破局的测试工程师
- 想理解"为什么我的测试越写越乱"背后结构性原因的开发者

# 二、前置知识

阅读本文前，你最好已经具备：

- Playwright 的基本使用经验（`page.click`、`page.fill`、`locator`、`expect`
  这些 API 用过）
- 一点点 TypeScript 基础（类、接口、`async/await`，看得懂就行）
- 写过至少几个真实的端到端测试用例，最好踩过"改一个登录流程要改 50 个文件"这种坑

如果你连第一个测试都还没跑起来，建议先回到入门篇，把单个用例跑通再回来。本文讨论的是"规模化之后"的问题。

---

# 三、引子：为什么你的测试越写越痛

先看一段几乎每个团队都写过的测试。它能跑，也能过，但它是一颗定时炸弹：

```typescript
// ❌ 典型的"意大利面"测试：所有细节糊在一起
import { test, expect } from "@playwright/test"

test("新增车辆成功", async ({ page }) => {
  // 登录
  await page.goto("https://tms.example.com/login")
  await page.fill("#username", "zhangsan") // 账号硬编码
  await page.fill("#password", "Pass123456") // 密码硬编码
  await page.click(".login-btn")
  await page.waitForTimeout(3000) // 凭感觉等 3 秒

  // 进入车辆列表
  await page.goto("https://tms.example.com/truck/list")
  await page.waitForTimeout(2000)

  // 点新增
  await page.click('button:has-text("新增")')
  await page.waitForTimeout(1000)

  // 填表单
  await page.fill('input[data-path="plate_no"]', "川A12345")
  await page.click(".relation-select")
  await page.waitForTimeout(500)
  await page.click('li:has-text("自有")')
  await page.fill('input[data-path="remark"]', "测试备注")

  // 保存
  await page.click('button:has-text("保存")')
  await page.waitForTimeout(2000)
  await expect(page.locator(".toast")).toContainText("添加成功")
})
```

这段代码有什么问题？单看它没毛病。但当你有 500 个这样的测试时，灾难来了：

1. **登录流程一改，500 个文件全得改。** selector `.login-btn` 变成
   `.btn-login`？恭喜，全局搜索替换祝你好运。
2. **`waitForTimeout` 满天飞。**
   机器快的时候浪费时间，机器慢的时候随机失败。没人知道到底该等多久。
3. **数据硬编码。** 账号 `zhangsan`、车牌 `川A12345` 散落各处，换个测试环境就全废。
4. **失败信息毫无价值。** 报错只会告诉你
   `Timeout 30000ms exceeded waiting for locator('.toast')`，但到底是没登录上、没进列表、还是保存失败了？没人知道，只能本地复现慢慢猜。
5. **没人敢改。**
   因为每个文件都是独立的一坨，改一个怕碰坏另一个，最后大家选择"再复制一份"。

测试代码的可维护性危机，几乎都源于同一个根因：**业务意图和实现细节被搅在了一起**。本文要讲的分层架构，核心就是把它们拆开。

---

# 四、知识点一：测试代码的三层架构

好的测试架构和好的应用架构一样，讲究分层。我们把测试代码分成清晰的三层，每一层只关心自己该关心的事：

```
┌─────────────────────────────────────────────┐
│  第一层：Spec（测试用例层）                      │
│  只回答"测什么" —— 业务流程编排 + 断言            │
│  例：登录 → 新增车辆 → 校验回显                   │
├─────────────────────────────────────────────┤
│  第二层：Operator（业务动作层）                  │
│  只回答"怎么做这个业务" —— 多步页面操作的封装       │
│  例：openCreateDialog()、fillForm()、save()    │
├─────────────────────────────────────────────┤
│  第三层：公共库 / Interaction（组件交互层）        │
│  只回答"怎么操作这个控件" —— 与具体 UI 组件打交道   │
│  例：selectDropdown()、fillInput()、clickTab() │
└─────────────────────────────────────────────┘
```

每一层只能向下依赖：Spec 调用 Operator，Operator 调用公共库，公共库直接操作 Playwright 的
`page`。**绝不允许跨层或反向依赖**（比如公共库里写业务逻辑，或者 Spec 里直接堆 selector）。

用一个生活化的比喻：

- **Spec** 像餐厅顾客：只说"我要一份宫保鸡丁"，不关心怎么炒。
- **Operator** 像厨师：知道宫保鸡丁的完整做法（切丁、过油、下料、翻炒、出锅）。
- **公共库**
  像厨房里的标准化工具：炒锅、灶台、计时器。厨师用这些工具，但工具本身不知道在做什么菜。

把上面那段意大利面用三层重写，效果是这样的（细节在后面逐层展开，这里先感受形态）：

```typescript
// ✅ 三层架构后的 Spec：一眼看懂在测什么
import { test } from "@playwright/test"
import { login, switchToAccount } from "@/lib"
import { getE2ETestContext } from "@/lib"
import { TruckActionOperator } from "./TruckActionOperator"

test("新增车辆成功", async ({ page }) => {
  // 统一测试上下文：账号、密码、网点都从这里来，没有任何硬编码
  const context = getE2ETestContext()

  // 第一层只做编排：登录 → 切网点 → 跑业务 → 校验
  await login(page, context.login)
  await switchToAccount(page, context.switchAccount)

  const truck = new TruckActionOperator(page)
  const record = await truck.createTruckByUi() // 一句话表达完整业务意图
  await truck.assertDetailEcho(record) // 校验详情回显
})
```

对比一下：意大利面版本读完要 30 秒还看不懂在干嘛；三层版本 5 秒就明白"这是在测新增车辆并校验回显"。**Spec 的可读性，就是测试套件的文档。**

> 一个判断架构是否健康的小技巧：把任意一个 Spec 文件给一个完全不懂技术的产品经理看，如果他能看懂这个用例在测什么业务流程，说明你的分层做对了。

---

# 五、知识点二：Operator 模式深度解析

Operator 是这套架构的灵魂。很多人听过 Page Object
Model（POM，页面对象模式），Operator 可以理解为 POM 的进化版——它不只是"封装一个页面的元素"，而是"封装一个业务能在这个页面上做的动作"。

## 5.1 Operator 到底封装什么

一个 Operator 类，对应一个业务领域（比如"车辆管理"），它对外暴露的是**业务动作**，对内隐藏的是**页面细节**。

```typescript
// ✅ Operator：对外是业务语言，对内是页面细节
import { expect, Locator, Page } from "@playwright/test"
import { selectDropdown, fillInput, checkPopups } from "@/lib"

// 一条车辆记录的数据结构。每个字段都说明它存什么
export interface TruckRecord {
  plateNo: string // 车牌号，例如 "川A12345"
  relation: string // 合作关系：自有 / 外调 / 加盟
  remark: string // 备注文本
}

export class TruckActionOperator {
  // 构造函数只接收 page，page 是与浏览器交互的唯一入口
  constructor(private readonly page: Page) {}

  /**
   * 通过 UI 完整走一遍"新增车辆"流程，并返回这次创建用到的数据。
   * 对外只暴露这一个业务动作，调用方完全不需要知道里面点了几个按钮。
   */
  async createTruckByUi(): Promise<TruckRecord> {
    // 用时间戳后 5 位生成唯一数据，避免和历史数据冲突
    const suffix = Date.now().toString().slice(-5)
    const record: TruckRecord = {
      plateNo: `川A${suffix}`,
      relation: "自有",
      remark: `E2E车辆备注${suffix}`
    }

    await this.ensureOnList() // 确保在列表页（幂等，后面细讲）
    await this.openCreateDialog() // 打开新增弹窗
    await this.fillForm(record) // 填表单
    await this.save("添加成功") // 保存并校验提示
    return record
  }

  // 以下都是 private：实现细节对外不可见，可以随意重构而不影响调用方

  private async openCreateDialog(): Promise<void> {
    await this.page.click('button:has-text("新增")')
    // 等弹窗里的关键字段出现，而不是傻等固定时间
    await expect(this.plateInput(), "新增弹窗的车牌号输入框应出现").toBeVisible({
      timeout: 10000
    })
  }

  private async fillForm(record: TruckRecord): Promise<void> {
    // 调用公共库填字段，业务层不关心 selector 怎么拼
    await fillInput(this.plateInput(), record.plateNo, "车牌号")
    await fillInput(this.remarkInput(), record.remark, "备注")
  }

  // selector 集中定义在私有方法里。将来前端改了 data-path，只改这一处
  private plateInput(): Locator {
    return this.page.locator('input[data-path="plate_no"]')
  }
  private remarkInput(): Locator {
    return this.page.locator('input[data-path="remark"]')
  }

  private async save(expectedToast: string): Promise<void> {
    await this.page.click('button:has-text("保存")')
    await checkPopups(this.page) // 自动检查是否弹出错误提示
    await expect(
      this.page.locator(".toast"),
      `保存后应出现成功提示: ${expectedToast}`
    ).toContainText(expectedToast, { timeout: 10000 })
  }
}
```

注意几个关键设计：

1. **selector 集中管理。** 所有 `locator`
   收敛到私有方法（`plateInput`、`remarkInput`）。前端改了元素属性，全项目只需要改这一处。这是 Operator 最直接的价值。
2. **public 是业务语言，private 是页面细节。** `createTruckByUi`
   这种 public 方法读起来像产品需求文档；`openCreateDialog`、`fillForm`
   这些实现细节藏在 private 里，可以随便重构。
3. **Operator 返回业务数据。** `createTruckByUi` 返回
   `TruckRecord`，让 Spec 拿到刚创建的数据去做后续校验，而不是把数据硬编码在两个地方。

## 5.2 Operator vs 传统 POM 的区别

传统 POM 容易写成"一个页面一个类，里面全是 getter"：

```typescript
// ❌ 退化的 POM：只是 selector 的集合，没有业务含义
class TruckPage {
  get plateInput() {
    return this.page.locator('input[data-path="plate_no"]')
  }
  get saveButton() {
    return this.page.locator('button:has-text("保存")')
  }
  get newButton() {
    return this.page.locator('button:has-text("新增")')
  }
  // ... 然后 Spec 里还是要自己把这些 getter 拼成流程
}
```

这种写法的问题是：业务流程的编排又回到了 Spec 里。Spec 还是得自己写"点新增 → 填这个 → 填那个 → 点保存"，只是 selector 不用自己写了而已。**复杂度没有被消灭，只是搬了个家。**

Operator 模式的关键升级在于：**把"多步操作的编排"也下沉到 Operator**。Spec 拿到的是
`createTruckByUi()` 这种原子化的业务动作，而不是一堆需要自己拼装的零件。

## 5.3 Operator 的分层与组合

真实项目里业务很复杂，一个 Operator 也会调用另一个 Operator。常见的是"页面级 Operator"和"动作级 Operator"的组合：

```typescript
// 页面级 Operator：负责"进入页面、切 Tab、查询"这类页面骨架操作
class CompanyManagementPageOperator {
  constructor(private readonly page: Page) {}

  // 确保进入了某个 Tab 并执行了查询，幂等
  async switchTabAndQuery(tabName: string): Promise<void> {
    /* ... */
  }
  async setup(): Promise<void> {
    /* 确保页面已加载 */
  }
}

// 动作级 Operator：聚焦"车辆"这个具体业务，复用页面级 Operator 的能力
class TruckActionOperator {
  private readonly pageOp: CompanyManagementPageOperator

  constructor(private readonly page: Page) {
    // 组合：动作级 Operator 持有页面级 Operator
    this.pageOp = new CompanyManagementPageOperator(page)
  }

  async createTruckByUi(): Promise<TruckRecord> {
    await this.pageOp.setup() // 复用页面级能力
    await this.pageOp.switchTabAndQuery("全部车辆") // 复用页面级能力
    // ... 车辆特有的新增逻辑
    return {} as TruckRecord
  }
}
```

这种组合让"进入页面、切 Tab、查询"这类通用骨架被多个动作 Operator 复用，而每个动作 Operator 只专注自己那块业务。**用组合而非继承**来复用——这是个重要的取舍，继承会让 Operator 之间产生僵硬的父子绑定，组合则灵活得多。

---

# 六、知识点三：公共库设计原则

公共库（也就是 Interaction 层）是最底层，直接和 Playwright 的 `page`
打交道。它封装的是"怎么操作某一类 UI 组件"，比如下拉框、输入框、日期选择器、Tab、表格行。

公共库写好了，整个测试套件的稳定性就有了地基；公共库写烂了，上面所有 Operator 和 Spec 都跟着遭殃。下面是几条硬核原则。

## 6.1 原则一：按前端组件组织，一一对应

公共库的文件结构应该**镜像前端的组件结构**。前端有 `Select` 组件、`input`
组件、`DateTimePicker` 组件，公共库就对应有 `Select.ts`、`input.ts`、`DateTimePicker.ts`。

```
lib/interaction/
├── Select.ts          ← 对应前端 Select / DataList 组件
├── input.ts           ← 对应前端 input 组件
├── DateTimePicker.ts  ← 对应前端 timepicker 组件
├── Tab.ts             ← 对应前端 Tab 组件
├── TableRow.ts        ← 对应前端表格行
└── PopUp.ts           ← 对应前端弹窗 / 对话框组件
```

为什么这么做？因为**前端组件的行为是统一的**。同一种 Select 组件，在车辆页、司机页、费用页的交互逻辑完全一样（都是点击 → 搜索 → 选项出现 → 点击选中）。把它封装一次，全项目复用。前端改了 Select 组件的实现，你也只改这一个文件。

## 6.2 原则二：用业务语义参数，不暴露 selector 细节

公共方法的参数应该是"业务能理解的语义"，而不是"selector 字符串"。

```typescript
// ❌ 参数是裸 selector，调用方还得懂 DOM 结构
await selectDropdown(page, 'input[data-path="tr_id"]', ".dropdown-menu li", "川A12345")

// ✅ 参数是业务语义，调用方只需要知道"哪个字段、选什么值"
await selectDropdown({
  page,
  dataPath: "tr_id", // 字段标识，对应前端的 data-path
  keyword: context.data.truckNo // 要选的值，来自统一上下文
})
```

注意第二种写法用了**配置对象（options 对象）**
而不是一长串位置参数。当参数超过 2-3 个，强烈建议用配置对象：可读性好，可选参数灵活，将来加参数不破坏已有调用。

## 6.3 原则三：把"等待时序"封进公共库

`waitForTimeout`
是测试不稳定的头号元凶。公共库的一个核心职责，就是把"等待真实业务状态"的逻辑封装进去，让上层永远不用写固定等待。

React/Vue 这类框架的下拉联动是异步的：选了 A 字段，系统异步带出 B 字段。如果不等联动完成就操作 B，会随机失败。正确做法是等真实条件：

```typescript
// ✅ 公共库内部：等待联动字段真的被填充，而不是傻等
export interface DropdownConfig {
  page: Page
  dataPath: string
  keyword?: string
  /** 选完后，等待哪个字段被自动带出值（传该字段的 data-path） */
  waitForField?: string
}

export async function selectDropdown(config: DropdownConfig): Promise<void> {
  const { page, dataPath, keyword, waitForField } = config

  // ... 点击下拉、输入关键词、选中选项的逻辑 ...

  // 关键：如果指定了联动字段，等它真的有值了才返回
  if (waitForField) {
    await page.waitForFunction(
      (sel: string) => {
        const input = document.querySelector(sel) as HTMLInputElement | null
        return !!input && input.value !== "" // 等到字段有值
      },
      `input[data-path="${waitForField}"]`,
      { timeout: 5000 }
    )
  }
}
```

调用方就可以这样优雅地表达联动依赖：

```typescript
// 选运单后，等车牌被自动带出，再操作车牌字段
await selectDropdown({
  page,
  dataPath: "batch",
  keyword: context.data.batchNo,
  waitForField: "tr_id" // 等 tr_id 被带出值
})
// 走到这里，tr_id 一定已经有值了，可以安全操作
```

**陷阱提醒**：`waitForFunction`
等待的条件如果是"后续步骤的前置条件"，超时就必须抛错（让 catch 把错误吞掉是大忌）。只有明确是"观察性等待"（等不到也不影响后续）时，才允许记录日志后继续。

## 6.4 原则四：公共库不写业务逻辑

这是最容易破坏的边界。公共库只懂"组件",不懂"业务"。`selectDropdown`
知道怎么操作一个下拉框，但它不应该知道"车辆的合作关系下拉默认选自有"——那是业务规则，属于 Operator。

```typescript
// ❌ 公共库里渗入了业务规则，污染了通用性
export async function selectDropdown(config: DropdownConfig) {
  // ... 通用逻辑 ...
  if (config.dataPath === "relation" && !config.keyword) {
    config.keyword = "自有" // ❌ "默认自有"是车辆业务规则，不该在这
  }
}

// ✅ 业务规则留在 Operator，公共库保持纯粹
class TruckActionOperator {
  private async fillForm(record: TruckRecord) {
    // 业务规则（默认自有）在这里体现
    await selectDropdown({
      page: this.page,
      dataPath: "relation",
      keyword: record.relation
    })
  }
}
```

一旦公共库开始写 `if (业务字段)`
这种分支，它就不再通用了，会变成一个谁都不敢动的大杂烩。守住这条边界。

---

# 七、知识点四：幂等操作 vs 非幂等操作

这是个非常容易被忽视、但对测试稳定性影响巨大的概念。

**幂等（idempotent）**：执行一次和执行多次，结果一样。比如"确保进入了车辆列表页"——不管你调几次，最终状态都是"在车辆列表页"。

**非幂等**：执行多次会产生多次效果。比如"点击保存"——点两次可能创建两条数据，或者第二次点在已关闭的弹窗上报错。

## 7.1 为什么要区分

测试代码经常需要"重试"或"兜底"。如果操作是幂等的，重试很安全；如果是非幂等的，重试就是灾难。

```typescript
// ❌ 无脑重复点击：进入页面点了，又点一次菜单，状态全乱
async function gotoTruckList(page: Page) {
  await page.click("text=车辆管理") // 万一已经在这个页面，再点可能触发收起/展开
  await page.click("text=全部车辆")
  await page.click('button:has-text("查询")') // 重复查询，浪费且可能打断加载
}
```

正确的做法：**幂等操作用 `ensure*` 前缀封装，内部先检查状态，已满足就跳过。**

```typescript
// ✅ ensureOnTruckList：先看在不在，不在才导航。可以安全地反复调用
async function ensureOnTruckList(page: Page): Promise<void> {
  // 先判断：列表的标志性元素是否已可见
  const listTitle = page.locator('.page-title:has-text("车辆管理")')
  if (await listTitle.isVisible().catch(() => false)) {
    return // 已经在列表页，直接返回，不重复操作
  }
  // 不在才真正导航
  await page.goto(URLS().truckList)
  await expect(listTitle, "导航后应进入车辆列表页").toBeVisible({ timeout: 15000 })
}
```

同理还有
`ensureFilterApplied`（确保筛选条件已应用）、`ensureChecked`（确保复选框已勾选）、`ensureRowSelected`（确保表格行已选中）。这些都是"页面进入、筛选、勾选、选行"类操作，**优先做成可重入的
`ensure*`**。

## 7.2 非幂等操作只能执行一次

而"保存、审核、提交、结算"这类会改变业务数据的动作，**绝对不能包装成可重试的
`ensure*`**。它们必须：

1. 在流程中只被调用一次；
2. 调用后立即校验结果（成功提示、详情回显、状态变更）；
3. 不做"失败就重试"——保存失败要抛错让人来查，而不是偷偷再点一次。

```typescript
// ✅ 非幂等动作：执行一次 + 立即校验，不重试
private async save(expectedToast: string): Promise<void> {
  await this.saveButton().click();          // 只点一次
  await checkPopups(this.page);             // 检查有没有弹错误
  await expect(
    this.toast(),
    `保存后应出现提示: ${expectedToast}`
  ).toContainText(expectedToast, { timeout: 10000 });  // 立即校验结果
  // 注意：这里没有任何 retry。失败就让它失败，暴露问题。
}
```

一句话总结这条原则：**导航/筛选/勾选这类"位置和选择状态"用 `ensure*`
保证可重入；保存/审核这类"产生业务副作用"的动作严格只执行一次并立即校验。**

---

# 八、知识点五：失败信息可诊断性设计

测试的价值有一半在于"失败时能告诉你哪里出了问题"。一个失败信息含糊的测试，调试成本比没有测试还高。

## 8.1 反面教材：Playwright 默认报错

```typescript
// ❌ 失败时只会得到：Timeout 10000ms exceeded waiting for locator('.toast')
await page.click('button:has-text("保存")')
await expect(page.locator(".toast")).toContainText("成功")
```

这条报错的问题：你不知道是没点到保存、保存接口报错、还是 toast 选择器变了。只能本地复现慢慢猜，可能要花半小时。

## 8.2 正确做法：每个关键断言都带业务描述

Playwright 的 `expect` 支持传第二个参数作为失败描述，**务必用上**。

```typescript
// ✅ 每个关键操作都带上"这是在做什么"的描述
await expect(
  this.saveButton(),
  "保存按钮应可见且可点击" // 描述
).toBeEnabled({ timeout: 5000 })

await this.saveButton().click()

await expect(
  this.toast(),
  '点击保存后应出现"添加成功"提示' // 描述：失败时一眼知道卡在哪一步
).toContainText("添加成功", { timeout: 10000 })
```

## 8.3 公共库抛错要带上下文

公共库找不到元素、选项、或操作失败时，抛出的错误必须包含：**操作名、字段名、selector、关键词、候选项摘要**。这样上层不用进公共库源码也能定位问题。

```typescript
// ✅ 公共库抛错：信息量拉满，调用方一看就懂
export async function selectDropdown(config: DropdownConfig): Promise<void> {
  const { page, dataPath, keyword } = config
  const trigger = page.locator(`input[data-path="${dataPath}"]`)

  // 触发器找不到：报清楚是哪个操作、哪个字段、什么 selector
  if (!(await trigger.isVisible().catch(() => false))) {
    throw new Error(
      `[selectDropdown] 下拉触发器不可见 | 字段=${dataPath} | ` +
        `selector=input[data-path="${dataPath}"] | 关键词=${keyword ?? "(无)"}`
    )
  }

  await trigger.click()
  await trigger.fill(keyword ?? "")

  const options = page.locator(".fn-dropdown__menu:visible li")
  const target = options.filter({ hasText: keyword ?? "" }).first()

  // 选项找不到：把当前实际有哪些候选项也打出来，方便对比
  if (!(await target.isVisible().catch(() => false))) {
    const available = await options.allTextContents()
    throw new Error(
      `[selectDropdown] 未找到匹配选项 | 字段=${dataPath} | 关键词=${keyword} | ` +
        `当前候选项=[${available.slice(0, 10).join(", ")}]` // 给出实际候选，定位是数据问题还是关键词问题
    )
  }

  await target.click()
}
```

看这条假想的报错：

```
[selectDropdown] 未找到匹配选项 | 字段=tr_id | 关键词=川A99999 | 当前候选项=[川A11111, 川A22222, 川A33333]
```

一眼就知道：不是 selector 坏了，是测试数据 `川A99999`
在环境里不存在。这种报错能把调试时间从半小时压缩到 30 秒。

## 8.4 显式失败，禁止静默跳过

最后一条铁律：**公共方法关键失败必须抛错，不允许只打印 `console.log` 后继续往下走。**

```typescript
// ❌ 静默吞错：测试"假装"通过了，实际啥也没干
async function selectRow(page: Page, keyword: string) {
  const row = page.locator("tr").filter({ hasText: keyword })
  if (!(await row.isVisible().catch(() => false))) {
    console.log("没找到行，跳过") // ❌ 测试会继续跑，最后甚至可能 PASS
    return
  }
  await row.click()
}

// ✅ 显式抛错：找不到就让测试红，逼着人去看
async function selectRow(page: Page, keyword: string) {
  const row = page.locator("tr").filter({ hasText: keyword })
  if (!(await row.isVisible().catch(() => false))) {
    throw new Error(`[selectRow] 未找到目标行 | 关键词=${keyword}`)
  }
  await row.click()
}
```

只有明确标记为 `optional`
的非关键字段才允许跳过。其余一律抛错。一个会"假装通过"的测试，比没有测试更危险——它给了你虚假的安全感。

---

# 九、知识点六：从意大利面到清晰架构的重构路径

道理都懂，但手上已经有一坨意大利面怎么办？不要推倒重来（风险太大），按下面的渐进式路径走。

## 9.1 第一步：抽取登录和环境配置

收益最大、风险最低的一步。把硬编码的账号、URL、登录流程抽到公共库和统一上下文。

```typescript
// 重构前：每个文件都重复这段
await page.goto("https://tms.example.com/login")
await page.fill("#username", "zhangsan")
await page.fill("#password", "Pass123456")
await page.click(".login-btn")

// 重构后：一行，数据来自环境变量 / 统一上下文
const context = getE2ETestContext()
await login(page, context.login)
```

做完这一步，换测试环境、改登录流程就只动一处了。

## 9.2 第二步：把固定等待替换成条件等待

全局搜索 `waitForTimeout`，逐个替换成 `expect(...).toBeVisible()` 或 `waitForFunction`。

```typescript
// 重构前
await page.click('button:has-text("新增")')
await page.waitForTimeout(2000) // 凭感觉等

// 重构后：等真实信号
await page.click('button:has-text("新增")')
await expect(page.locator('input[data-path="plate_no"]'), "新增弹窗应打开").toBeVisible({
  timeout: 10000
})
```

## 9.3 第三步：把组件操作下沉到公共库

把散落的下拉、输入、日期操作收敛到
`lib/interaction/`。判断标准：**一个组件操作只要在 2 处以上用到，就抽成公共库；只在单个测试用到的，先留在测试里**（不要过度设计）。

```typescript
// 重构前：每个测试都自己拼下拉操作
await page.click(".relation-select")
await page.waitForTimeout(500)
await page.click('li:has-text("自有")')

// 重构后：调公共库
await selectDropdown({ page, dataPath: "relation", keyword: "自有" })
```

## 9.4 第四步：把多步流程封装成 Operator

最后把"打开弹窗 → 填表 → 保存 → 校验"这类多步流程提到 Operator。这一步让 Spec 真正变清爽。

```typescript
// 重构前：Spec 里一长串步骤
// (打开弹窗、填 5 个字段、保存、校验... 30 行)

// 重构后：Spec 只剩业务编排
const truck = new TruckActionOperator(page)
const record = await truck.createTruckByUi()
await truck.assertDetailEcho(record)
```

## 9.5 重构的节奏建议

- **一次只做一层。** 别想着一口气全改完，每改一层就跑一遍测试确认没坏。
- **新代码立刻按规范写，旧代码碰到再改。**
  不要为了重构而重构，让新需求和 bug 修复自然带动旧代码升级。
- **先抽出现频率最高的部分。** 登录、下拉、列表查询这些每个测试都用的东西，重构收益最大。

> 一个常见误区：以为"架构"是项目开始前一次性设计好的。其实好架构是**长出来的**——先有几个真实用例，发现重复，再抽象。一上来就建一堆抽象层，往往抽象错地方，反而更难维护。

---

# 十、完整 Demo：一个端到端的车辆管理测试

把前面所有知识点串起来，下面是一个完整的、可运行形态的三层架构示例。

**第三层 · 公共库**（`lib/interaction/Select.ts` 节选，已在前文给出 `selectDropdown`
完整实现，这里复用）。

**第二层 · Operator**（`tests/车辆管理/TruckActionOperator.ts`）：

```typescript
import { expect, Locator, Page } from "@playwright/test"
import { selectDropdown, fillInput, checkPopups, URLS } from "@/lib"

// 车辆记录数据结构。每个字段标注它存什么
export interface TruckRecord {
  plateNo: string // 车牌号
  relation: string // 合作关系：自有/外调/加盟
  remark: string // 备注
}

export class TruckActionOperator {
  constructor(private readonly page: Page) {}

  /** 业务动作：通过 UI 新增一台车辆，返回所用数据 */
  async createTruckByUi(): Promise<TruckRecord> {
    const suffix = Date.now().toString().slice(-5) // 唯一后缀，避免数据冲突
    const record: TruckRecord = {
      plateNo: `川A${suffix}`,
      relation: "自有",
      remark: `E2E备注${suffix}`
    }

    await this.ensureOnList() // 幂等：确保在列表页
    await this.openCreateDialog() // 非幂等的入口操作，执行一次
    await this.fillForm(record)
    await this.save("添加成功")
    return record
  }

  /** 业务动作：校验详情页回显与创建数据一致 */
  async assertDetailEcho(record: TruckRecord): Promise<void> {
    await this.ensureOnList()
    await this.openDetail(record.plateNo)
    await expect(this.plateInput(), `详情页车牌应回显为 ${record.plateNo}`).toHaveValue(
      record.plateNo
    )
    await expect(this.remarkInput(), `详情页备注应回显为 ${record.remark}`).toHaveValue(
      record.remark
    )
  }

  // ── 以下为 private 实现细节 ──

  /** 幂等：先判断是否已在列表页，不在才导航 */
  private async ensureOnList(): Promise<void> {
    const title = this.page.locator('.page-title:has-text("车辆管理")')
    if (await title.isVisible().catch(() => false)) return
    await this.page.goto(URLS().truckList)
    await expect(title, "应进入车辆列表页").toBeVisible({ timeout: 15000 })
  }

  private async openCreateDialog(): Promise<void> {
    await this.page.click('button:has-text("新增")')
    await expect(this.plateInput(), "新增弹窗应打开").toBeVisible({ timeout: 10000 })
  }

  private async fillForm(record: TruckRecord): Promise<void> {
    if (record.relation !== "自有") {
      // 业务规则留在 Operator：非默认值才需要手动选
      await selectDropdown({
        page: this.page,
        dataPath: "relation",
        keyword: record.relation
      })
    }
    await fillInput(this.plateInput(), record.plateNo, "车牌号")
    await fillInput(this.remarkInput(), record.remark, "备注")
  }

  /** 非幂等：保存只执行一次并立即校验 */
  private async save(expectedToast: string): Promise<void> {
    await this.page.click('button:has-text("保存")')
    await checkPopups(this.page)
    await expect(
      this.page.locator(".toast"),
      `保存后应提示: ${expectedToast}`
    ).toContainText(expectedToast, { timeout: 10000 })
  }

  private async openDetail(plateNo: string): Promise<void> {
    const row = this.page.locator("tr").filter({ hasText: plateNo })
    if (!(await row.isVisible().catch(() => false))) {
      throw new Error(`[openDetail] 未找到车辆行 | 车牌=${plateNo}`)
    }
    await row.locator('a:has-text("详情")').click()
  }

  // selector 集中管理：前端属性变更只改这里
  private plateInput(): Locator {
    return this.page.locator('input[data-path="plate_no"]')
  }
  private remarkInput(): Locator {
    return this.page.locator('input[data-path="remark"]')
  }
}
```

**第一层 · Spec**（`tests/车辆管理/create-truck.spec.ts`）：

```typescript
import { test } from "@playwright/test"
import { login, switchToAccount, getE2ETestContext } from "@/lib"
import { TruckActionOperator } from "./TruckActionOperator"

test("新增车辆并校验详情回显", async ({ page }) => {
  // 统一上下文：所有账号/网点数据来自这里，零硬编码
  const context = getE2ETestContext()

  await login(page, context.login)
  await switchToAccount(page, context.switchAccount)

  const truck = new TruckActionOperator(page)
  const record = await truck.createTruckByUi() // 新增
  await truck.assertDetailEcho(record) // 校验回显
})
```

看这个 Spec：14 行，没有一个 selector，没有一个
`waitForTimeout`，没有一个硬编码数据，业务流程一目了然。这就是分层架构的最终形态——**复杂度没有消失，而是被安放到了正确的层级。**

---

# 十一、总结

回顾本文的核心：

1. **三层架构**：Spec 管"测什么"，Operator 管"怎么做业务"，公共库管"怎么操作组件"。只向下依赖，不跨层。
2. **Operator 模式**：封装多步业务动作，public 是业务语言、private 是页面细节，selector 集中管理，用组合而非继承复用。
3. **公共库设计**：镜像前端组件结构，用业务语义参数，把等待时序封进去，且绝不渗入业务逻辑。
4. **幂等 vs 非幂等**：导航/筛选/勾选用 `ensure*`
   保证可重入；保存/审核严格只执行一次并立即校验。
5. **可诊断性**：每个关键断言带业务描述，公共库抛错带满上下文，显式失败禁止静默跳过。
6. **重构路径**：登录→等待→组件→流程，逐层推进，新代码立刻规范、旧代码碰到再改，让架构"长出来"。

记住一句话：**写测试容易，维护测试难。**
这套架构所有的设计，都是为了让"第 500 个测试"和"第 1 个测试"一样好写、好读、好改。前期多花的那点封装成本，会在规模化时连本带利地还给你。

# 十二、延伸阅读

- Playwright 官方文档 - Page Object Models：https://playwright.dev/docs/pom
- Playwright 官方文档 - Best
  Practices（测试稳定性与定位策略）：https://playwright.dev/docs/best-practices
- Playwright 官方文档 - Auto-waiting（理解自动等待，告别
  `waitForTimeout`）：https://playwright.dev/docs/actionability
- Martin Fowler《Refactoring》—— 渐进式重构的思想源头，对"长出架构"这一理念有深入论述
- 本系列其他篇目：定位器与等待策略、测试数据管理、CI 集成与并行化

<!-- knowledge-lab-merged -->

# 动手实践：把意大利面用例重构为三层架构

配套项目用本地静态页面完成“登录、创建车辆、校验回显”，不依赖后端。页面故意加入异步延迟，用来验证测试是否等待真实业务信号。

## 如何运行

```bash
# 1. 安装依赖
npm install

# 2. 安装 Playwright 浏览器（首次需要）
npx playwright install chromium

# 3. 运行全部测试（两个 spec 都会通过）
npx playwright test

# 有头模式观察浏览器实际操作
npx playwright test --headed

# 查看 HTML 报告
npx playwright show-report
```

## 建议的阅读顺序

1. 对比 `tests/before-refactor.spec.ts` 与
   `tests/after-refactor.spec.ts`，确认重构后 Spec 只保留业务编排和断言。
2. 阅读 `tests/LoginOperator.ts`，区分 public 业务动作、private 页面细节与公共交互函数。
3. 将页面延迟调大，确认用例仍等待标题、输入框和回显，而不是依赖 `waitForTimeout`。

验收标准：两个 Spec 都通过；重构后的 Spec 不出现账号、密码和 selector；保存动作只执行一次且立即校验结果；失败消息包含操作、字段和值。真实项目应将公共交互函数拆到
`lib/interaction/`，Operator 按业务模块组织。
