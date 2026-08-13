# Playwright（04） - 等待策略完全指南:告别 waitForTimeout

> 读完后，你应能解释“3.1 问题根源”，复现“3.2 真实案例”的最小实现，并用“4.1 内置智能等待”检查结果与失败边界。

# 一、适合人群

- 写过 Playwright 测试但经常遇到时序问题的开发者
- 测试用例中充斥着 `waitForTimeout(1000)` 代码的工程师
- 想要提升测试稳定性和执行速度的自动化测试新手

# 二、前置知识

在阅读本文前,你需要了解:

- Playwright 基础 API(`page.click()`, `page.fill()` 等)
- JavaScript/TypeScript 基础语法
- 异步编程概念(`async/await`)

# 三、为什么不用 waitForTimeout

## 3.1 问题根源

很多测试新手会这样写代码:

```typescript
// ❌ 不推荐:固定等待
await page.click('button[data-path="submit"]');
await page.waitForTimeout(2000); // 等待2秒
await expect(page.locator('.success-message')).toBeVisible();
```

这段代码有几个严重问题:

1. **时间难以控制**:网络快时浪费1.5秒,网络慢时仍会失败
2. **不可靠**:在不同环境(开发/CI)表现不一致
3. **拖慢测试**:每个 `waitForTimeout` 都是纯等待,无法提前完成
4. **难以维护**:时间常量分散在各处,调整困难

## 3.2 真实案例

在我们的项目中,有个测试用例选择"运单"下拉后需要等待"车牌"字段被自动填充:

```typescript
// ❌ 改进前:固定等待
await selectDropdown({ page, dataPath: 'batch', keyword: '运单号123' });
await page.waitForTimeout(1500); // 希望车牌字段已填充
await selectDropdown({ page, dataPath: 'tr_id', keyword: '川A12345' });
```

问题在于:
- React 联动是异步的(API 调用 + 状态更新),1500ms 不一定够
- 如果在联动完成前操作 `tr_id`,会触发搜索时组件状态不稳定,返回"无相关数据"
- 需要重试多次才能成功,大幅增加测试耗时

# 四、Playwright 自动等待机制

## 4.1 内置智能等待

Playwright 的大部分操作都内置了自动等待:

```typescript
// ✅ 这些操作会自动等待元素可用
await page.click('.submit-btn');        // 等待元素存在、可见、启用、稳定
await page.fill('input[name="email"]', 'test@example.com'); // 等待输入框可编辑
await expect(page.locator('.message')).toBeVisible(); // 等待元素可见
```

自动等待会检查:
- **attached**: 元素已挂载到 DOM
- **visible**: 元素可见(不是 `display: none` 或 `visibility: hidden`)
- **stable**: 元素位置稳定(不在动画中)
- **enabled**: 元素未禁用(不是 `disabled`)
- **editable**: 输入框可编辑(针对 `fill` 操作)

## 4.2 默认超时时间

```typescript
// 单个操作超时(见下方说明,@playwright/test 中默认不单独限制)
await page.click('.btn', { timeout: 5000 });

// 断言超时(默认 5 秒)
await expect(page.locator('.message')).toBeVisible({ timeout: 10000 });
```

**关于动作超时,这里要区分两层,别搞混:**

- **`@playwright/test` 测试运行器**:`actionTimeout` 和 `navigationTimeout` 的默认值是 **`0`**,也就是不单独限制单个动作,统一由整个测试的 `timeout`(默认 30 秒)兜底。也就是说测试里每个操作并没有天然的 30 秒上限,而是共享整条用例的总时长预算。
- **Playwright 库 API**(直接用 `playwright` 包,非测试运行器):`page.click()` 等动作的内置默认超时才是 **30 秒**。

下面 `playwright.config.ts` 示例里写的 `actionTimeout: 30_000` 是「主动设置」的值,不是框架默认。如果你不配置它,测试运行器是不会给单个动作加 30 秒上限的。

# 五、三种核心等待策略

## 5.1 waitForSelector: 等待元素出现

**使用场景**: 等待某个元素出现在 DOM 中

> ⚠️ **先看这条**:`page.waitForSelector` 是较旧的 API,Playwright 官方已不再推荐在新代码中作为首选。新代码请优先用 web-first 断言 `await expect(page.locator(...)).toBeVisible()`,或 `await page.locator(...).waitFor({ state: 'visible' })`。这两者自带自动重试,且对元素脱离/重新挂载 DOM 更健壮。`waitForSelector` 主要留给那些无法用断言表达的场景(例如只想拿到选项数量、等待 `detached` 等)。下面的示例为了说明 `state` 参数仍用 `waitForSelector`,但实际项目中能用断言就优先用断言。

```typescript
// ✅ 等待成功消息出现
await page.waitForSelector('.success-message', { state: 'visible' });

// ✅ 等待加载动画消失
await page.waitForSelector('.loading-spinner', { state: 'hidden' });

// ✅ 等待元素从 DOM 移除
await page.waitForSelector('.modal', { state: 'detached' });
```

**等价的推荐写法**(新代码优先):

```typescript
// 推荐:web-first 断言,自带自动重试
await expect(page.locator('.success-message')).toBeVisible();
await expect(page.locator('.loading-spinner')).toBeHidden();
await expect(page.locator('.modal')).toHaveCount(0);

// 或:locator.waitFor(),适合非断言语境
await page.locator('.success-message').waitFor({ state: 'visible' });
```

**参数说明**:
- `state: 'attached'` - 元素存在于 DOM(默认)
- `state: 'visible'` - 元素可见
- `state: 'hidden'` - 元素不可见或不存在
- `state: 'detached'` - 元素已从 DOM 移除

**实战示例**: 等待下拉菜单出现

```typescript
/**
 * 等待下拉菜单就绪(有选项且非"无相关数据")
 * 
 * @param page - Playwright Page 对象
 * @param timeout - 超时时间(毫秒)
 * @returns 下拉选项数量
 */
async function waitForDropdownReady(page: Page, timeout = 3000): Promise<number> {
  // 第一步:等待下拉菜单容器出现
  await page.waitForSelector('.fn-dropdown__menu', { 
    state: 'visible', 
    timeout 
  });

  // 第二步:等待至少有一行选项
  await page.waitForSelector('.fn-dropdown__menu tbody tr', { 
    state: 'visible', 
    timeout 
  });

  // 第三步:获取有效选项数(排除"无相关数据"提示行)
  const rows = page.locator('.fn-dropdown__menu tbody tr');
  const count = await rows.count();
  
  return count;
}

// 使用示例
await page.click('input[data-path="company"]');
const optionCount = await waitForDropdownReady(page);
console.log(`下拉菜单出现,共 ${optionCount} 个选项`);
```

## 5.2 waitForFunction: 等待自定义条件

**使用场景**: 等待复杂的业务状态,如字段有值、数据加载完成、状态变更

```typescript
// ✅ 等待输入框有值
await page.waitForFunction(
  // 这个函数会在浏览器上下文中执行
  () => {
    const input = document.querySelector('input[data-path="truck_no"]') as HTMLInputElement;
    return input && input.value.trim() !== '';
  },
  { timeout: 5000 }
);

// ✅ 等待表格加载完成(至少有10行数据)
await page.waitForFunction(
  () => {
    const rows = document.querySelectorAll('table tbody tr');
    return rows.length >= 10;
  }
);

// ✅ 等待 API 调用完成(通过全局状态判断)
await page.waitForFunction(
  () => window.__API_LOADING__ === false
);
```

**重要**: `waitForFunction` 的回调函数在浏览器上下文中执行,不能访问 Node.js 变量,需要通过参数传递:

```typescript
// ❌ 错误:无法访问外部变量
const targetValue = '川A12345';
await page.waitForFunction(() => {
  const input = document.querySelector('input');
  return input.value === targetValue; // targetValue 是 undefined
});

// ✅ 正确:通过参数传递
const targetValue = '川A12345';
await page.waitForFunction(
  (value) => {
    const input = document.querySelector('input');
    return input.value === value;
  },
  targetValue // 第二个参数会传给回调函数
);

// ✅ 更推荐:使用对象传递多个参数
await page.waitForFunction(
  ({ selector, value }) => {
    const input = document.querySelector(selector) as HTMLInputElement;
    return input && input.value === value;
  },
  { selector: 'input[data-path="truck_no"]', value: '川A12345' }
);
```

## 5.3 waitForResponse: 等待 API 响应

**使用场景**: 等待特定的网络请求完成

> ⚠️ **字符串参数是 glob,且匹配的是【完整 URL】**:`page.waitForResponse(urlOrPredicate)` 传字符串时,Playwright 按 **glob 模式**匹配整个 URL(并会基于 config 的 `baseURL` 解析)。所以裸路径 `'/api/search'` 实际要求整个 URL 精确等于这个 glob——真实环境里 URL 往往带 host 和 query(如 `https://example.com/api/search?kw=x`),裸路径会匹配失败、一直等到超时。
> 正确写法是用通配 glob `'**/api/search'`,或直接用谓词函数 `res => res.url().includes('/api/search')`。两者按需选用:glob 写法简洁,谓词写法可以同时判断 `status()`、请求方法等。

```typescript
// ✅ 等待保存接口返回(谓词函数,可同时校验状态码)
const responsePromise = page.waitForResponse(
  response => response.url().includes('/api/save') && response.status() === 200
);
await page.click('.save-btn');
const response = await responsePromise;
const data = await response.json();
console.log('保存成功:', data);

// ✅ 等待搜索接口返回(glob:用 **/ 通配 host 与前缀)
const searchPromise = page.waitForResponse('**/api/search');
await page.fill('input[name="keyword"]', '查询关键词');
await page.click('.search-btn');
await searchPromise;

// ✅ 组合使用:等待多个接口(同样用 **/ 通配)
await Promise.all([
  page.waitForResponse('**/api/user'),
  page.waitForResponse('**/api/config'),
  page.click('.load-data-btn')
]);
```

**高级用法**: 捕获响应数据用于后续断言

```typescript
// 等待创建接口,提取返回的ID
const responsePromise = page.waitForResponse(
  res => res.url().includes('/api/batch/create')
);
await page.click('.create-btn');
const response = await responsePromise;
const { code, data } = await response.json();

expect(code).toBe(0);
expect(data.batch_id).toBeTruthy();

// 使用返回的ID进行后续操作
await page.goto(`/batch/detail?id=${data.batch_id}`);
```

# 六、联动字段等待模式(waitForField 实战)

## 6.1 问题场景

在表单中,选择某个字段后,系统会自动填充其他关联字段:

- 选择"运单"→ 自动带出"车牌"、"司机"
- 选择"车牌"→ 自动带出"司机"、"油卡号"
- 选择"客户"→ 自动带出"联系人"、"地址"

如果在联动完成前操作目标字段,会导致组件状态不稳定。

## 6.2 解决方案

封装 `waitForField` 参数,在选择后自动等待关联字段被填充:

```typescript
/**
 * 下拉选择配置
 */
interface DropdownConfig {
  page: Page;
  dataPath: string;      // 当前字段的 data-path
  keyword?: string;      // 搜索关键词
  waitForField?: string; // 选择后等待该字段被自动填充
}

/**
 * 通用下拉选择(支持联动等待)
 */
async function selectDropdown(config: DropdownConfig): Promise<void> {
  const { page, dataPath, keyword, waitForField } = config;

  // 第一步:定位输入框
  const input = page.locator(`input[data-path="${dataPath}"]`);
  
  // 第二步:打开下拉菜单
  await input.click();
  await page.waitForSelector('.fn-dropdown__menu tbody tr', { 
    state: 'visible' 
  });

  // 第三步:选择选项
  if (keyword) {
    // 输入关键词搜索
    await input.fill(keyword);
    await page.waitForSelector('.fn-dropdown__menu tbody tr');
    
    // 点击匹配的选项
    const option = page.locator('.fn-dropdown__menu tbody tr')
      .filter({ hasText: keyword });
    await option.first().click();
  } else {
    // 不传关键词,选第一项
    await page.locator('.fn-dropdown__menu tbody tr').first().click();
  }

  // 第四步:等待联动字段被填充(核心改进点)
  if (waitForField) {
    console.log(`等待 ${waitForField} 被自动填充...`);
    
    await page.waitForFunction(
      ({ targetField }) => {
        const input = document.querySelector(
          `input[data-path="${targetField}"]`
        ) as HTMLInputElement | null;
        // 等待字段存在且有非空值
        return input && input.value.trim() !== '';
      },
      { targetField: waitForField }, // 传递参数到浏览器上下文
      { timeout: 5000 }
    );
    
    console.log(`${waitForField} 已填充完成`);
  }
}
```

## 6.3 使用示例

```typescript
// ✅ 选择运单后等待车牌被自动填充
await selectDropdown({
  page,
  dataPath: 'batch',
  keyword: '运单号123',
  waitForField: 'tr_id', // 等待 tr_id(车牌)被填充
});

// ✅ 现在可以安全地操作车牌字段了
await selectDropdown({
  page,
  dataPath: 'tr_id',
  keyword: '川A12345',
  waitForField: 'dr_id', // 继续等待 dr_id(司机)被填充
});

// ✅ 操作司机字段
await selectDropdown({
  page,
  dataPath: 'dr_id',
  keyword: '张三',
});
```

## 6.4 效果对比

**改进前**:
```typescript
await selectDropdown({ page, dataPath: 'batch', keyword: '运单号123' });
await page.waitForTimeout(1500); // 固定等待,不可靠
await selectDropdown({ page, dataPath: 'tr_id', keyword: '川A12345' });
// 结果:经常失败,需要重试3-5次
```

**改进后**:
```typescript
await selectDropdown({ 
  page, 
  dataPath: 'batch', 
  keyword: '运单号123',
  waitForField: 'tr_id' // 条件等待
});
await selectDropdown({ page, dataPath: 'tr_id', keyword: '川A12345' });
// 结果:第1次就成功,测试时间从 8秒 降到 2秒
```

# 七、React 组件联动时序问题解决

## 7.1 问题根源

React 组件的联动逻辑是异步的:

1. 用户选择选项 → 触发 `onChange` 事件
2. React 更新 state → 触发 `useEffect`
3. `useEffect` 发起 API 请求 → 等待响应
4. API 返回数据 → React 更新关联字段的 state
5. 关联字段重新渲染 → 显示新值

整个过程可能需要 100ms - 2000ms(取决于网络和服务器响应)。

## 7.2 完整解决方案

结合 `waitForFunction` 和重试机制:

```typescript
async function selectDropdown(config: DropdownConfig): Promise<void> {
  const { page, dataPath, keyword, waitForField } = config;

  const input = page.locator(`input[data-path="${dataPath}"]`);
  
  // 打开下拉
  await input.click();
  await page.waitForSelector('.fn-dropdown__menu tbody tr');

  // 输入关键词搜索(带重试机制)
  if (keyword) {
    let hasResult = false;
    
    // 最多重试 3 次(处理组件状态不稳定导致的偶发性失败)
    for (let attempt = 1; attempt <= 3; attempt++) {
      // 填入关键词
      await input.fill(keyword);
      
      // 等待下拉刷新
      await page.waitForTimeout(300); // 这里可以保留短暂等待,用于UI更新
      
      // 检查是否有结果
      const rows = page.locator('.fn-dropdown__menu tbody tr');
      const count = await rows.count();
      const firstText = await rows.first().textContent() || '';
      
      if (count > 0 && !firstText.includes('无相关数据')) {
        hasResult = true;
        break;
      }
      
      if (attempt < 3) {
        console.log(`搜索第 ${attempt} 次无结果,重试...`);
      }
    }
    
    if (!hasResult) {
      throw new Error(`下拉搜索无结果: ${dataPath} = "${keyword}"`);
    }
    
    // 点击匹配选项
    const option = page.locator('.fn-dropdown__menu tbody tr')
      .filter({ hasText: keyword });
    await option.first().click();
  }

  // 等待联动字段被填充
  if (waitForField) {
    await page.waitForFunction(
      ({ targetField }) => {
        const input = document.querySelector(
          `input[data-path="${targetField}"]`
        ) as HTMLInputElement | null;
        return input && input.value.trim() !== '';
      },
      { targetField: waitForField },
      { timeout: 5000 }
    );
  }
  
  // 短暂等待 UI 微任务(确保 React 状态更新完成)
  await page.waitForTimeout(100);
}
```

## 7.3 关键要点

1. **`waitForFunction` 治本**: 等待真实条件,而非固定时间
2. **重试机制兜底**: 处理偶发的组件状态不稳定
3. **保留短暂 `waitForTimeout`**: 仅用于等待 UI 微任务(100ms 以内),不是等待业务状态
4. **失败必须显式**: 超时抛出明确错误,包含字段名、关键词等调试信息

# 八、智能重试与超时配置

## 8.1 自定义超时

```typescript
// ✅ 针对慢接口增加超时
await page.waitForResponse(
  res => res.url().includes('/api/report/generate'),
  { timeout: 60000 } // 报表生成可能需要1分钟
);

// ✅ 针对快速操作减少超时
await page.waitForSelector('.tooltip', { 
  state: 'visible',
  timeout: 2000 // 提示框应该立即出现
});
```

## 8.2 全局超时配置

在 `playwright.config.ts` 中配置:

```typescript
export default defineConfig({
  // 单个测试超时
  timeout: 180_000, // 3分钟
  
  // 单个操作超时
  use: {
    actionTimeout: 30_000, // 30秒
    navigationTimeout: 60_000, // 60秒
  },
  
  // 断言超时
  expect: {
    timeout: 10_000, // 10秒
  },
});
```

## 8.3 优雅的错误处理

```typescript
// ✅ 捕获超时,给出友好提示
try {
  await page.waitForFunction(
    ({ field }) => {
      const input = document.querySelector(`input[data-path="${field}"]`) as HTMLInputElement;
      return input && input.value !== '';
    },
    { field: 'truck_no' },
    { timeout: 5000 }
  );
} catch (error) {
  // 读取当前状态,帮助诊断问题
  const currentValue = await page.locator('input[data-path="truck_no"]')
    .inputValue()
    .catch(() => '(字段不存在)');
  
  throw new Error(
    `等待 truck_no 被填充超时(5秒), 当前值: "${currentValue}"`
  );
}
```

## 8.4 条件重试模式

```typescript
/**
 * 带条件重试的操作
 * 
 * @param action - 要执行的操作
 * @param checkSuccess - 检查操作是否成功
 * @param maxRetries - 最大重试次数
 */
async function retryUntilSuccess<T>(
  action: () => Promise<T>,
  checkSuccess: (result: T) => boolean,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await action();
    
    if (checkSuccess(result)) {
      return result;
    }
    
    if (attempt < maxRetries) {
      console.log(`第 ${attempt} 次尝试未成功,重试...`);
      await new Promise(resolve => setTimeout(resolve, 500)); // 重试间隔
    }
  }
  
  throw new Error(`操作失败,已重试 ${maxRetries} 次`);
}

// 使用示例
await retryUntilSuccess(
  async () => {
    await page.click('.refresh-btn');
    await page.waitForSelector('.data-row');
    return await page.locator('.data-row').count();
  },
  (count) => count > 0, // 成功条件:至少有1行数据
  3 // 最多重试3次
);
```

# 九、完整 Demo 示例

下面是一个完整的表单填写测试用例,演示了所有等待策略的组合使用:

```typescript
import { test, expect, Page } from '@playwright/test';

/**
 * 等待下拉菜单就绪
 */
async function waitForDropdownReady(page: Page): Promise<number> {
  // 等待下拉容器出现
  await page.waitForSelector('.dropdown-menu', { state: 'visible' });
  
  // 等待选项加载
  await page.waitForSelector('.dropdown-menu .option', { state: 'visible' });
  
  // 返回选项数量
  return await page.locator('.dropdown-menu .option').count();
}

/**
 * 选择下拉框(支持联动等待)
 */
async function selectDropdown(config: {
  page: Page;
  fieldName: string;
  keyword: string;
  waitForField?: string;
}): Promise<void> {
  const { page, fieldName, keyword, waitForField } = config;
  
  console.log(`选择 ${fieldName}: ${keyword}`);
  
  // 点击打开下拉
  const input = page.locator(`input[name="${fieldName}"]`);
  await input.click();
  
  // 等待下拉菜单出现
  await waitForDropdownReady(page);
  
  // 输入关键词搜索
  await input.fill(keyword);
  
  // 等待搜索结果
  await page.waitForTimeout(300); // 短暂等待 UI 更新
  
  // 选择匹配的选项
  const option = page.locator('.dropdown-menu .option')
    .filter({ hasText: keyword });
  await option.first().click();
  
  // 等待联动字段被填充
  if (waitForField) {
    console.log(`等待 ${waitForField} 被自动填充...`);
    
    await page.waitForFunction(
      ({ field }) => {
        const input = document.querySelector(`input[name="${field}"]`) as HTMLInputElement;
        return input && input.value.trim() !== '';
      },
      { field: waitForField },
      { timeout: 5000 }
    );
    
    console.log(`${waitForField} 已填充`);
  }
}

test('完整表单提交流程', async ({ page }) => {
  // 第一步:访问页面
  await page.goto('https://example.com/form');
  
  // 第二步:等待表单加载完成
  await page.waitForSelector('form', { state: 'visible' });
  
  // 第三步:填写基础信息
  await page.fill('input[name="name"]', '张三');
  await page.fill('input[name="email"]', 'zhangsan@example.com');
  
  // 第四步:选择客户(会自动填充联系人)
  await selectDropdown({
    page,
    fieldName: 'customer',
    keyword: '某某公司',
    waitForField: 'contact', // 等待联系人字段被填充
  });
  
  // 第五步:验证联系人已被自动填充
  const contactValue = await page.locator('input[name="contact"]').inputValue();
  expect(contactValue).toBeTruthy();
  console.log(`联系人已自动填充: ${contactValue}`);
  
  // 第六步:选择车辆(会自动填充司机)
  await selectDropdown({
    page,
    fieldName: 'vehicle',
    keyword: '川A12345',
    waitForField: 'driver', // 等待司机字段被填充
  });
  
  // 第七步:验证司机已被自动填充
  const driverValue = await page.locator('input[name="driver"]').inputValue();
  expect(driverValue).toBeTruthy();
  console.log(`司机已自动填充: ${driverValue}`);
  
  // 第八步:提交表单并等待 API 响应
  const responsePromise = page.waitForResponse(
    res => res.url().includes('/api/submit') && res.status() === 200
  );
  await page.click('button[type="submit"]');
  
  const response = await responsePromise;
  const result = await response.json();
  
  // 第九步:验证提交成功
  expect(result.code).toBe(0);
  expect(result.data.id).toBeTruthy();
  console.log(`提交成功,ID: ${result.data.id}`);
  
  // 第十步:等待成功提示出现
  await page.waitForSelector('.success-message', { state: 'visible' });
  
  // 第十一步:验证提示文案
  const message = await page.locator('.success-message').textContent();
  expect(message).toContain('提交成功');
  
  // 第十二步:等待页面跳转
  await page.waitForURL('**/success', { timeout: 5000 });
  
  console.log('测试通过');
});
```

# 十、总结

## 10.1 核心原则

1. **优先使用 Playwright 自动等待**: `click`、`fill`、`expect` 等操作已内置智能等待
2. **禁止固定等待**: 避免 `waitForTimeout`,改用条件等待
3. **等待真实条件**: 用 `waitForFunction` 等待业务状态,而非估算时间
4. **组合多种策略**: `waitForSelector` + `waitForFunction` + `waitForResponse` 组合使用
5. **失败必须明确**: 超时时给出清晰的错误信息,包含当前状态

## 10.2 方法选择指南

| 场景 | 推荐方法 | 示例 |
|------|----------|------|
| 等待元素出现/消失 | `waitForSelector` | 等待弹窗出现 |
| 等待字段有值 | `waitForFunction` | 等待联动字段被填充 |
| 等待 API 响应 | `waitForResponse` | 等待保存接口返回 |
| 等待页面跳转 | `waitForURL` | 等待跳转到详情页 |
| 等待状态变更 | `waitForFunction` | 等待按钮变为可用 |
| 等待 UI 微任务 | `waitForTimeout(100)` | React 状态更新后的短暂等待 |

## 10.3 常见陷阱

1. **过度使用 `waitForTimeout`**: 除非等待 UI 微任务(100ms 以内),否则都应该用条件等待
2. **忘记传递参数给 `waitForFunction`**: 回调函数在浏览器上下文执行,需要通过参数传值
3. **超时时间设置不合理**: 快速操作用短超时(2秒),慢接口用长超时(60秒)
4. **不处理超时错误**: 应该捕获超时异常,读取当前状态,给出诊断信息
5. **忽略组件状态不稳定**: React 组件联动时需要重试机制兜底

# 十一、延伸阅读

- [Playwright 官方文档 - Auto-waiting](https://playwright.dev/docs/actionability)
- [Playwright 官方文档 - Assertions](https://playwright.dev/docs/test-assertions)
- [Playwright 官方文档 - Network](https://playwright.dev/docs/network)
- [测试稳定性最佳实践](https://playwright.dev/docs/best-practices)
- [如何调试 Playwright 测试](https://playwright.dev/docs/debug)

# 十二、总结

- **三种核心等待策略**：使用场景: 等待某个元素出现在 DOM 中
- **为什么不用 waitForTimeout**：时间难以控制:网络快时浪费1.5秒,网络慢时仍会失败
- **React 组件联动时序问题解决**：React 组件的联动逻辑是异步的:
- **适合人群**：写过 Playwright 测试但经常遇到时序问题的开发者

<!-- knowledge-lab-merged -->

# 动手实践：03 · 等待策略完全指南：告别 waitForTimeout（配套 Demo）

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

## 参考资料

- [Playwright 文档](https://playwright.dev/docs/intro)
- [Playwright 最佳实践](https://playwright.dev/docs/best-practices)
