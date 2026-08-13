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

## 工程规则

开启 `strict` 并逐步消除断言；公共类型放在真正共享的边界，不为单个页面建立全局模型；生成的 API 类型仍需要运行时校验，因为服务端和客户端版本可能漂移。

## 参考资料

- [TypeScript Handbook Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
