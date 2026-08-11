# 05 · 可维护测试架构：Operator 模式与公共库

配套文章《可维护测试架构：Operator 模式与公共库》的可运行 Demo。

## 这个 Demo 演示什么

用一个「登录 → 新增车辆 → 校验回显」的小流程，对比两种写法，把文章的核心知识点跑起来：

- **`tests/before-refactor.spec.ts`** —— ❌ 意大利面写法：账号、密码、车牌硬编码，selector 全堆在 spec 里，业务意图和实现细节搅在一起。
- **`tests/after-refactor.spec.ts`** —— ✅ 三层架构写法：Spec 只做业务编排和断言，14 行看懂在测什么。
- **`tests/LoginOperator.ts`** —— 第二层 Operator + 第三层公共库 + 统一测试上下文，集中放一处方便对照阅读。

对应的知识点：

| 知识点 | 在 Demo 中的体现 |
|---|---|
| 三层架构（Spec / Operator / 公共库） | `after-refactor.spec.ts` → `LoginOperator`/`TruckActionOperator` → `fillInput`/`checkPopups` |
| Operator 模式：public 业务语言、private 页面细节 | `TruckActionOperator.createTruckByUi()` 为 public，`openCreateDialog`/`fillForm`/`save` 为 private |
| selector 集中管理 | 所有 `locator` 收敛进 Operator 私有方法（`plateInput`/`remarkInput`） |
| 禁止硬编码数据 | `getE2ETestContext()` 提供账号/密码，车牌用时间戳动态生成 |
| 等真实状态而非 `waitForTimeout` | 登录后等「车辆管理」标题可见、新增后等车牌输入框可见 |
| 幂等 vs 非幂等 | `save()` 只点一次并立即校验，无 retry |
| 失败信息可诊断 | `fillInput`/`checkPopups` 抛错带操作名、字段名、值；断言带业务描述 |

被测页面是本地静态 HTML（`app/index.html`），无需任何后端，开箱即跑。页面里故意加了异步延迟（登录 500ms、弹窗 400ms、保存 600ms），用来演示「等真实信号」的价值。

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

## 目录结构

```
05-maintainable-architecture/
├── app/
│   └── index.html              # 被测页面（本地静态，模拟登录+车辆管理）
├── tests/
│   ├── before-refactor.spec.ts # ❌ 意大利面写法（反面教材）
│   ├── after-refactor.spec.ts  # ✅ 三层架构写法
│   └── LoginOperator.ts        # Operator + 公共库 + 统一上下文
├── playwright.config.ts        # 基础配置
├── package.json
└── README.md
```

## 建议的阅读顺序

1. 先看 `before-refactor.spec.ts`，感受所有细节糊在一起的样子。
2. 再看 `after-refactor.spec.ts`，体会 Spec 变清爽后的可读性。
3. 最后看 `LoginOperator.ts`，理解复杂度被搬到了哪一层、怎么分层。

> 真实项目中，`LoginOperator.ts` 里的公共库（`fillInput` 等）应拆到 `lib/interaction/`，Operator 拆到 `tests/<业务模块>/`。这里合并到一个文件只是为了 Demo 便于对照。

## 可视化规格

> VISUAL_STRATEGY：截图（Screenshot）
> SCREENSHOT_DESCRIPTION：围绕“05 · 可维护测试架构：Operator 模式与公共库”展示操作入口、关键配置、成功状态和一处典型错误；账号、密钥、租户与业务数据必须脱敏。
