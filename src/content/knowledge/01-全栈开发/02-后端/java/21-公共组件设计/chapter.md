# Java（20）- 公共组件 demo-common

> 读完你能：围绕“公共组件 demo-common”理解“为什么需要 demo-common？前端类比先行”与“1 demo-common 的子模块结构”，并结合正文示例完成实践与排障。

> 每个微服务都重复写"统一返回格式""登录态获取""金额计算"太浪费了。demo 把这些抽进一个公共组件库 demo-common，所有服务依赖它即可——这就是后端版的"共享 utils 包 + 全局拦截器"。本课带你拆开它，顺便解开第 4 课埋的 `R.ok()` 伏笔。

---

# 一、为什么需要 demo-common？前端类比先行

你在前端项目里一定干过这事：

```ts
// 前端：把通用逻辑抽成 npm 私有包，各业务仓库 import
import { request, formatMoney, getUserInfo } from '@demo/shared-utils'
```

后端是一模一样的思路。demo 有几十个微服务（demo-basic、demo-billing、demo-order……），它们都需要：

- 统一的接口返回结构（前端才好统一处理）
- 统一的异常类型
- 当前登录人信息
- 一堆工具方法（金额、JSON、日期）

如果每个服务各写一套，前端就要面对五花八门的返回格式。所以 demo 把它们沉淀到 `demo-parent/demo-common` 这个 **公共组件库** 里。

| 前端做法 | demo-common 对应 | 说明 |
|---------|----------------|------|
| 私有 npm 包 `@demo/shared` | Maven 模块 `demo-common` | 都是"发布一次，到处依赖" |
| `package.json` 里 `dependencies` | `pom.xml` 里 `<dependency>` | 见第 1 课 Maven≈npm |
| `import { ... } from '@demo/shared'` | `import com.example.platform.common.core.*` | 包路径即"目录路径" |
| utils.ts / hooks | util 工具类 / 上下文类 | 函数集合 vs 静态方法集合 |

## 1.1 demo-common 的子模块结构

它不是一个单包，而是按职责拆成多个 Maven 子模块（前端 monorepo 里的多 package 同理）：

```
demo-common/
├── demo-common-core/        ← 核心：R 对象、异常、登录上下文、工具类（本课主角）
├── demo-common-web/         ← Web 相关：拦截器、过滤器、RestTemplate 配置
├── demo-common-cat-client/  ← 监控埋点（CAT）
├── demo-num-builder/        ← 单号生成器（运单号等）
├── demo-distributed-lock/   ← 分布式锁
└── demo-sync-es/            ← 数据同步 ES
```

本课聚焦最常用的 `demo-common-core`，它就是后端的"基础设施 utils"。

---

# 二、统一返回对象 R —— 解开第 4 课的伏笔

第 4 课讲 HTTP 生命周期时，你看到 Controller 最后总是 `return R.ok(data)`，当时我们说"先记住它是统一返回壳子，第 20 课展开"。现在展开。

## 2.1 R 长什么样？看匿名化示例代码

文件：`demo-common-core/.../common/core/entity/R.java`

```java
@Builder
@ToString
@Accessors(chain = true)
@AllArgsConstructor
@Slf4j
public class R<T> implements Serializable {

    // code：错误码。0 表示成功，非 0 表示各种失败（见 ResponseEnum）
    @Getter @Setter
    private int code = ResponseEnum.SUCCESS.getErrno();

    // message：错误信息文案，成功时默认 "success"
    @Getter @Setter
    private String message = "success";

    // data：真正的业务数据，泛型 T 表示"任意类型"——这就是第 6 课讲的泛型
    @Getter @Setter
    private T data;

    // globalData：全局字典数据，前端渲染下拉/枚举用，先不展开
    @Getter
    private Map<String, List> globalData;
}
```

注意它是 **泛型类** `R<T>`（见第 6 课）。`T` 是占位，`R<OrganizationOut>` 就表示"data 字段是一个 OrganizationOut"。这跟你 TS 里写的 `interface R<T> { code: number; message: string; data: T }` 是一个味道。

## 2.2 前端拿到的 JSON 长这样

```jsonc
// 成功
{
  "code": 0,           // 0 = 成功，前端判断 code===0 即可
  "message": "success",
  "data": { "id": 1, "organizationName": "上海网点" }  // 真正的数据在 data 里
}

// 失败
{
  "code": 1,
  "message": "公司不存在",
  "data": null
}
```

**关键认知**：HTTP 状态码可能永远是 200，业务成败由 `code` 决定。这跟很多前端默认的"看 HTTP status"习惯不同。demo 前端统一拦截 `code`：

```ts
// 前端 axios 响应拦截器（典型写法）
axios.interceptors.response.use((resp) => {
  const { code, message, data } = resp.data
  if (code !== 0) {
    Message.error(message)        // 业务失败弹错误文案
    return Promise.reject(resp.data)
  }
  return data                      // 成功直接把 data 剥出来给业务
})
```

所以后端只要老老实实包成 `R`，前端就能无脑统一处理。这就是"统一返回壳子"的价值。

## 2.3 R.ok / R.error 静态工厂方法

R 不靠 `new` 来创建，而是用一组 **静态工厂方法**（见第 5 课 static）。这跟前端 `Promise.resolve()` / `Promise.reject()` 的设计完全同源——用语义化的静态方法代替构造函数。

| 静态方法 | 作用 | 前端类比 |
|---------|------|---------|
| `R.ok()` | 成功，无数据 | `Promise.resolve()` |
| `R.ok(data)` | 成功，带数据 | `Promise.resolve(data)` |
| `R.ok(data, msg)` | 成功，带数据和自定义文案 | — |
| `R.error(message)` | 失败，带文案 | `Promise.reject(new Error(msg))` |
| `R.error(code, message)` | 失败，带错误码和文案 | — |

匿名化示例代码（节选自 R.java）：

```java
// 成功且无数据：内部委托给 ok(null)
public static R ok() {
    return ok(null);
}

// 成功且带数据：code 取 SUCCESS(0)，message 传 null（由 restResult 决定最终文案）
public static <T> R<T> ok(T data) {
    if (data instanceof BatchReturnOut) {        // 分支：批量操作结果走特殊文案转换链路
        return restResult(ResponseEnum.SUCCESS.getErrno(), null, data, true);
    }
    return restResult(ResponseEnum.SUCCESS.getErrno(), null, data);
}

// 失败：code 取 FAIL(1)，data 置空
public static <T> R<T> error(String message) {
    return restResult(ResponseEnum.FAIL.getErrno(), message, null);
}
```

> `<T>` 写在返回值前面，是"泛型方法"语法。读法：方法自己声明一个类型变量 T，由调用时传入的 `data` 推导。`R.ok(organization)` 传 OrganizationOut，T 就被推成 OrganizationOut，返回 `R<OrganizationOut>`。

最终都汇集到 `restResult(code, message, data)` 这个私有构造逻辑里组装出 R 实例：

```java
public static <T> R<T> restResult(int code, String message, T data) {
    R<T> apiResult = new R();
    apiResult.setErrno(code);              // 设错误码
    apiResult.setErrmsg(message);            // 设文案（匿名化示例代码这里还会过字典翻译，先略）
    apiResult.setRes(data);                 // 设业务数据
    return apiResult;
}
```

## 2.4 code 错误码从哪来？ResponseEnum

code 不是魔法数字，而是集中定义在枚举里。文件：`demo-parent-enums/.../ResponseEnum.java`

```java
public enum ResponseEnum {
    SUCCESS(0, "成功"),
    FAIL(1, "失败"),
    FAIL_401(-1, "请先登录"),       // 未登录
    FAIL_403(403, "无权限"),
    FAIL_404(404, "请求地址无效"),
    FAIL_500(500, "接口出错了，请刷新重试一下！");
    // ... 还有业务专用码

    private Integer code;     // 码值
    private String message;     // 默认文案
}
```

前端类比：这就是你项目里那个 `export const ERROR_CODE = { UNAUTHORIZED: -1, FORBIDDEN: 403 }` 常量表，只不过 Java 用 `enum` 把"码 + 文案"绑成一对（见第 6 课没细讲的 enum，这里补一刀）。

## 2.5 Controller 里实际怎么用（呼应第 4 课）

```java
@GetMapping("/getById")
public R<OrganizationOut> getById(@RequestParam Integer id) {
    OrganizationOut organization = organizationService.getById(id);  // Service 拿数据
    return R.ok(organization);                              // 包成 R 返回，T=OrganizationOut
}
```

第 4 课你看到的那行 `return R.ok(...)`，现在完全透明了：它把业务对象塞进 `data`，code 自动置 0，前端拦截器剥出 data 拿到 organization。闭环。

---

# 三、BusinessException —— 业务异常专用类

第 7 课讲过异常和自定义 `BusinessException`，这里看 demo 的示例定义并把它和 R 串起来。

文件：`demo-common-core/.../common/core/exception/BusinessException.java`

```java
@NoArgsConstructor
public class BusinessException extends RuntimeException {  // 继承运行时异常，不强制 try-catch

    // code：业务错误码，默认 1（对应 ResponseEnum.FAIL）
    private Integer code = 1;

    // 只带文案的构造：最常用，throw new BusinessException("公司不存在")
    public BusinessException(String message) {
        super(message);
    }

    // 带码 + 文案：需要前端区分错误类型时用
    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }

    public Integer getCode() {
        return code;
    }
}
```

## 3.1 它和 R 怎么联动？关键在全局异常处理器

业务代码里你只管 `throw`，不用自己包 R：

```java
public OrganizationOut getById(Integer id) {
    OrganizationOut organization = organizationMapper.selectById(id);
    if (organization == null) {
        // 业务校验失败：直接抛，不返回 R.error。后端有统一兜底
        throw new BusinessException("公司不存在");
    }
    return organization;
}
```

抛出后，会被一个 **全局异常处理器**（`@RestControllerAdvice`，第 7 课提过思路）捕获，自动转成 `R.error`：

```
Service 抛 BusinessException("公司不存在")
        │
        ▼
@RestControllerAdvice 全局捕获
        │  catch (BusinessException e)
        ▼
return R.error(e.getCode(), e.getMessage())
        │
        ▼
前端收到 { code: 1, message: "公司不存在", data: null }
```

前端类比：这就像你在前端用一个全局 `try/catch` 或 axios 拦截器，把所有抛出的 Error 统一转成 toast——业务代码只负责 `throw new Error('xxx')`，不操心展示。

| 前端 | demo 后端 |
|------|---------|
| `throw new Error('公司不存在')` | `throw new BusinessException("公司不存在")` |
| axios 拦截器统一弹 toast | `@RestControllerAdvice` 统一包成 `R.error` |
| `throw new Error('未登录', { code: 401 })` | `throw new BusinessException(-1, "请先登录")` |

> 为什么继承 `RuntimeException` 而不是 `Exception`？因为 RuntimeException 是"非受检异常"，方法签名不用声明 `throws`，调用方也不被强制 try-catch（见第 7 课）。业务异常希望像 JS 的 throw 一样"想抛就抛"，所以选 RuntimeException。

---

# 四、UserInfoContext —— 当前登录人，随取随用

这是后端最常用的工具之一：在任意一层代码（Service、工具方法）里直接拿到"当前是谁在请求"，不用层层传参。

## 4.1 前端没有这东西？其实有

前端单页应用里，你会把登录用户放在全局 store（Pinia/Redux）里，任何组件 `useUserStore()` 就能拿到：

```ts
// 前端：任意组件随取当前用户
const user = useUserStore()
console.log(user.organizationId)
```

后端的难点是：**每个 HTTP 请求是独立的、并发的**，不能用全局变量（会串号）。Java 的解法是 `ThreadLocal`——"每个线程一份独立存储"。一个请求通常跑在一个线程上，所以 ThreadLocal 天然实现了"请求级全局变量"。

## 4.2 看匿名化示例代码

文件：`demo-common-core/.../common/core/auth/UserInfoContext.java`

```java
public class UserInfoContext {

    // ThreadLocal：每个线程（≈每个请求）独立持有一份 LoginUser，互不干扰
    private static ThreadLocal<LoginUser> USER_INFO = new ThreadLocal<>();

    // 取当前登录人：业务代码最常调这个
    public static LoginUser getUser() {
        return USER_INFO.get();
    }

    // 设登录人：由登录拦截器在请求入口调用，业务代码一般不碰
    public static void setUser(LoginUser user) {
        USER_INFO.set(user);
    }

    // 清除：请求结束时必须调，否则线程复用会导致上一个请求的用户残留（内存泄漏 + 串号）
    public static void remove() {
        USER_INFO.remove();
    }
}
```

## 4.3 数据流：登录态怎么进来，又怎么取出

```
①请求进来  →  ②登录拦截器解析 token/session  →  ③UserInfoContext.setUser(loginUser)
                                                          │
                          ┌───────────────────────────────┘ (整个请求线程内有效)
                          ▼
              ④业务任意层：UserInfoContext.getUser().getOrganizationId()
                          │
                          ▼
              ⑤请求结束：拦截器 finally 里 UserInfoContext.remove()  ← 关键，防串号
```

- **②③ 写入**：在 `demo-common-web` 的登录拦截器里完成（前端 axios 自动带 token，后端拦截器解析后塞进 Context），业务代码完全无感。
- **④ 读取**：这是你天天用的。
- **⑤ 清理**：拦截器在 `finally` 里 remove，因为 Tomcat 线程池会复用线程，不清会把上个用户带给下个请求。

## 4.4 LoginUser 里有什么？

文件：`demo-common-core/.../common/core/entity/LoginUser.java`（`@Data` 见第 8 课 Lombok）

```java
@Data
public class LoginUser extends BaseSerializeDto {
    private Integer userId;       // 用户 id
    private String userName;      // 用户名
    private String name;          // 中文名
    private String telephone;     // 手机号
    private Integer organizationId;    // 网点 id（最常用，做数据隔离）
    private String organizationName;   // 网点名称
    private Integer groupId;      // 集团 id
    // ...
}
```

## 4.5 示例使用片段

demo-billing 里大量这样用——新增数据时自动填充"操作人所属网点/集团"，做数据隔离：

```java
// 摘自 demo-billing BillingRequest.java（略简化）
// 业务场景：用户提交财务单据时，自动带上其所属网点和集团，实现多租户数据隔离
this.setFOrganizationId(UserInfoContext.getUser().getOrganizationId());  // 当前登录人的网点
this.setGroupId(UserInfoContext.getUser().getGroupId());       // 当前登录人的集团
```

看，不用从 Controller 一路把 user 当参数传到这里——这就是 ThreadLocal 上下文的威力。

| 前端 store | UserInfoContext |
|-----------|-----------------|
| `useUserStore().organizationId` | `UserInfoContext.getUser().getOrganizationId()` |
| 全局单例，整个 app 一份 | ThreadLocal，每请求一份 |
| 登录后写入 store | 登录拦截器 setUser |
| 登出清空 store | 请求结束 remove |

> 踩坑提醒：异步线程（`@Async`、线程池、`CompletableFuture`）里 `getUser()` 会返回 `null`！因为换了线程，ThreadLocal 不跨线程。需要的话得在主线程先取出来，再传进异步任务。

---

# 五、工具类 util 包

`demo-common-core/util/` 下是一堆静态工具方法集合，就是后端的 lodash / utils.ts。常见几个：

| 工具类 | 作用 | 前端类比 |
|--------|------|---------|
| `JsonUtil` | 对象 ↔ JSON 字符串互转 | `JSON.parse / JSON.stringify` |
| `DemoBigDecimalUtil` | 金额精确计算（避免浮点误差） | `decimal.js` / `big.js` |
| `SpringContextHolder` | 在非 Spring 管理的类里手动拿 Bean | 手动从 DI 容器取实例 |
| `MapUtils` | Map 判空、取值 | lodash `_.get / _.isEmpty` |

## 5.1 为什么金额要专门搞个 DemoBigDecimalUtil？

跟前端一样的坑：浮点数不精确。

```js
// JS 里
0.1 + 0.2  // => 0.30000000000000004 😱
```

Java 的 `double` 同样会出问题，所以金额必须用 `BigDecimal`（见第 3 课提到的类型）。但裸用 `BigDecimal` 有两个坑：一是 `null` 直接参与计算会抛 NPE，二是不同来源的小数位数（scale）不统一。demo 的 `DemoBigDecimalUtil` 就专门解决这两点——把入参规整成"统一 2 位小数、null 安全"的标准金额：

```java
public class DemoBigDecimalUtil {
    // 金额默认保留 2 位小数
    public static final Integer DEFAULT_SCALE = 2;

    // 安全规整：null 转成 0，并统一设为 2 位小数（四舍五入），避免 NPE 和精度不一致
    public static BigDecimal getBigDecimal(BigDecimal bigDecimal) {
        if (bigDecimal == null) {
            bigDecimal = new BigDecimal(0).setScale(DEFAULT_SCALE);
        }
        return bigDecimal.setScale(DEFAULT_SCALE, RoundingMode.HALF_UP);
    }
}
```

注意：这个工具类本身并不封装 `add / subtract`，加减乘除仍然直接调 `BigDecimal` 自带的 `.add()` / `.subtract()` 等方法（Java 不支持运算符重载，金额不能写 `+`）。`DemoBigDecimalUtil` 的价值是在算之前先把每个值过一遍 `getBigDecimal`，保证"非空 + 同精度"，这样后续 `.add()` 才不会因为 null 或 scale 不一致出问题。

这跟前端引 `big.js` 算钱是同一个动机：**钱的计算不能用原生浮点**。

---

# 六、串起来：一个请求里 demo-common 的全景

```
                     HTTP 请求
                        │
       ┌────────────────▼─────────────────┐
       │  demo-common-web 登录拦截器          │
       │  UserInfoContext.setUser(user)    │ ← ④登录态写入
       └────────────────┬─────────────────┘
                        ▼
              Controller.getById()
                        │
                        ▼
                Service 业务逻辑
          UserInfoContext.getUser()  ← 随取登录人
          DemoBigDecimalUtil.add(...) ← 算金额
          if (bad) throw new BusinessException("xxx") ← 抛业务异常
                        │
            ┌───────────┴───────────┐
         正常返回                  抛异常
            │                        │
      return R.ok(data)    @RestControllerAdvice
            │              → return R.error(msg)
            └───────────┬────────────┘
                        ▼
              统一 R 结构 → 前端拦截器剥 data
                        │
       ┌────────────────▼─────────────────┐
       │  拦截器 finally:                   │
       │  UserInfoContext.remove()         │ ← ⑤清理防串号
       └───────────────────────────────────┘
```

这张图把第 4 课（五站流程）、第 7 课（异常）、本课（R / Context / 工具类）全缝在了一起。

---

# 七、本课小结

- demo-common 是后端的"共享私有包"，按职责拆成多个 Maven 子模块，最核心是 `demo-common-core`。
- **R 对象**是统一返回壳子（解开第 4 课伏笔）：`code`（0=成功）+ `message`（文案）+ `data`（泛型业务数据）。用 `R.ok() / R.error()` 静态工厂创建，类比 `Promise.resolve / reject`。
- **code 由 ResponseEnum 枚举集中管理**，是后端版的错误码常量表；业务成败看 code，不看 HTTP status。
- **BusinessException** 继承 RuntimeException，业务代码只管 `throw`，全局 `@RestControllerAdvice` 统一转成 `R.error`，类比前端 axios 拦截器统一弹 toast。
- **UserInfoContext** 用 ThreadLocal 实现"请求级全局变量"，任意层 `getUser()` 拿登录人（类比前端 store）；登录拦截器 setUser，请求结束必须 remove 防串号；异步线程里取不到。
- **工具类**（JsonUtil / DemoBigDecimalUtil / SpringContextHolder）是后端的 lodash；金额必须用 BigDecimal，原因和前端不敢用浮点算钱一样。

> 下一课预告：**第 21 课 MyBatis-Plus 与数据库操作**——我们要钻进第 4 课的最后一站 Mapper 层，看 demo 如何用 MyBatis-Plus 把 Java 对象映射成 SQL，理解 `@TableName`、`LambdaQueryWrapper`、`selectById` 这些天天见但没拆过的写法。

# 八、总结

- **统一返回对象 R —— 解开第 4 课的伏笔**：第 4 课讲 HTTP 生命周期时，你看到 Controller 最后总是 return R.ok(data)，当时我们说"先记住它是统一返回壳子，第 20 课展开"。
- **BusinessException —— 业务异常专用类**：第 7 课讲过异常和自定义 BusinessException，这里看 demo 的示例定义并把它和 R 串起来。
- **UserInfoContext —— 当前登录人，随取随用**：这是后端最常用的工具之一：在任意一层代码（Service、工具方法）里直接拿到"当前是谁在请求"，不用层层传参。
- **工具类 util 包**：demo-common-core/util/ 下是一堆静态工具方法集合，就是后端的 lodash / utils.ts。
