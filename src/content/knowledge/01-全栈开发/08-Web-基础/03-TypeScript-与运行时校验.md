# Web 基础（03） - TypeScript 与运行时校验

> TypeScript 在编译期约束开发者，运行时 Schema 约束网络、存储和用户输入；两者缺一不可。

## 学习目标

- 区分编译期类型与运行时数据校验的边界。
- 使用 `unknown`、联合类型和类型收窄建立安全输入契约。
- 为接口、配置和表单选择可维护的 Schema 校验策略。

## 一、类型只在编译期存在

```typescript
interface User {
  id: string
  role: 'admin' | 'member'
}

/** 从不可信接口读取用户；类型断言不会校验真实数据。 */
async function unsafeLoadUser(): Promise<User> {
  /** 接口返回的未知 JSON。 */
  const payload: unknown = await fetch('/api/me').then((response) => response.json())
  return payload as User
}
```

`as User` 只是告诉编译器“相信我”，JavaScript 运行时不会生成校验代码。如果接口返回 `{id: 7}`，调用方仍会在更远的位置失败。

## 二、把不可信输入保持为 unknown

```typescript
/** 判断未知值是否满足用户契约。 */
function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false
  /** 经过对象边界判断后可安全读取的记录。 */
  const record = value as Record<string, unknown>
  /** 当前角色是否属于业务允许的枚举。 */
  const hasValidRole = record.role === 'admin' || record.role === 'member'
  return typeof record.id === 'string' && hasValidRole
}
```

复杂项目应使用 Zod、Valibot 等 Schema 库，让校验、错误和类型推导共享一个契约。原则是：外部数据先是 `unknown`，通过校验后才进入领域类型。

## 三、常用类型工具的边界

- 联合类型表达有限状态，如 `'idle' | 'loading' | 'success' | 'error'`，比互相矛盾的多个布尔值更可靠。
- 泛型表达输入与输出关系，不应只为“看起来高级”把所有函数泛型化。
- `Partial<T>` 适合更新输入，不代表数据库实体可以缺字段。
- `any` 关闭检查并向外传播；第三方输入优先用 `unknown`。
- `never` 用于穷尽性检查，新增枚举成员时能在编译期暴露遗漏分支。

## 四、严格配置

至少启用 `strict`、`noUncheckedIndexedAccess` 和适合项目的模块解析策略。类型检查、Lint 与构建要进入 CI，不能只依赖编辑器提示。

## 五、验收

- 删除一个联合类型分支时，穷尽性检查能报错。
- 接口返回空值、错类型和多余字段时，运行时校验能在边界处给出可定位错误。
- 类型声明与 OpenAPI/Schema 生成链路只有一个事实来源。

## 参考资料

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript TSConfig strict](https://www.typescriptlang.org/tsconfig/strict.html)
