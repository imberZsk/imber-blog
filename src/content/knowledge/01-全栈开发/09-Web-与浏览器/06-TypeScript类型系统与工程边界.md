# Web 与浏览器（06） - TypeScript 类型系统与工程边界

> 读完你能：用联合类型、收窄和泛型表达约束，并在网络、存储等运行时边界校验未知数据。

## 核心知识清单

- unknown、never 与类型收窄
- 联合类型、判别字段与穷尽检查
- TypeScript泛型、约束与推断
- 接口、类型别名与结构类型
- 类型断言的风险与运行时校验
- strict、模块边界与声明文件

## 用类型表达状态

TypeScript 在编译阶段对 JavaScript 程序做静态分析，运行时类型会被擦除。结构类型系统关注对象拥有哪些成员，而不是类名是否相同；控制流分析会根据判别字段、`typeof`、`in` 和用户定义守卫逐步收窄联合类型。类型正确只能证明代码在声明假设下自洽，不能证明网络输入符合声明。

```ts
type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }

function unwrap<T>(state: LoadState<T>): T {
  if (state.status === 'success') return state.data
  throw new Error(`Cannot unwrap ${state.status}`)
}
```

判别联合避免 `data?`、`error?` 同时出现的非法状态。泛型表达调用方传入类型与返回类型的关系，不应只为消除报错而写 `<any>`。API JSON、LocalStorage 和第三方消息进入程序时是 `unknown`，必须经 Schema 校验后才能当领域对象。

## 泛型约束与 API 设计

泛型用于保存输入与输出之间的关系，例如集合元素、键名和返回值。约束应表达实现真正需要的能力，而不是把类型参数固定成某个具体类型。无法从参数推断的泛型会把复杂度转嫁给调用方，应改成普通联合类型或显式配置对象。

```ts
function getProperty<TObject, TKey extends keyof TObject>(
  source: TObject,
  key: TKey,
): TObject[TKey] {
  return source[key]
}

const user = { id: 42, name: 'Ada' }
const userName = getProperty(user, 'name')
```

这里 `TKey extends keyof TObject` 限制键必须真实存在，返回类型则随键变化。若直接返回 `unknown` 或使用 `<any>`，调用方就失去这层关联保证。

## 运行时边界校验

`response.json() as User` 只压制编译器，不会验证字段。外部数据先保留为 `unknown`，通过 Schema、类型守卫或解码器校验成功后再进入领域层。校验失败需要返回字段路径和可诊断原因，不能用默认值悄悄制造半合法对象。

## 工程规则

开启 `strict` 并逐步消除断言；公共类型放在真正共享的边界，不为单个页面建立全局模型；生成的 API 类型仍需要运行时校验，因为服务端和客户端版本可能漂移。

## 失败边界与验收

常见失败包括使用非空断言掩盖初始化顺序、让 `any` 从基础库扩散、把枚举值当开放字符串、声明文件与真实包版本不一致，以及前后端共享类型却没有版本兼容策略。类型断言只能用于已经被运行时证据证明的窄边界，并在代码审查中说明证据来源。

验收时运行 `tsc --noEmit`，为联合类型保留 `never` 穷尽检查，并用正常、缺字段、错误类型和新增字段样例测试边界解码器。发布库时同时验证声明文件、ESM/CJS 导出和最低 TypeScript 版本，避免源码通过而使用方无法编译。

## 参考资料

- [TypeScript Handbook Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
